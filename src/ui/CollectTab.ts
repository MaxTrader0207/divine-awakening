import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { ACHIEVEMENTS, ACH_CATS, type AchievementCat } from '@/data/achievements';
import { CODEX_BONUS_MAX, CODEX_ENTRIES, CODEX_GROUPS, CODEX_MAX_POINTS, CODEX_TIERS, codexBonus, codexFound, codexNext, codexPoints, codexStars } from '@/data/codex';
import { claimAchievement, claimAllAchievements, claimableAchievements, isDone } from '@/systems/Achievements';
import { h } from './dom';

/**
 * 選單「收藏」分頁（v1.64）：成就 / 怪物圖鑑
 */
export interface CollectContext {
  state: GameState;
  /** 重畫這一頁（保留捲動位置） */
  rerender(): void;
  /** 鑽石等變動後：刷新 HUD、存檔 */
  onChanged(): void;
}

let view: 'ach' | 'codex' = 'ach';
/** 圖鑑展開中的地圖（重畫時保持展開） */
const openGroups = new Set<string>();

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function renderCollect(ctx: CollectContext): HTMLElement[] {
  const s = ctx.state;
  const claimable = claimableAchievements(s);
  const seg = h('div', { class: 'seg two' }, [
    h('button', { class: `seg-btn${view === 'ach' ? ' on' : ''}`, onclick: () => ((view = 'ach'), ctx.rerender()) }, `🏆 成就${claimable ? `（${claimable}）` : ''}`),
    h('button', { class: `seg-btn${view === 'codex' ? ' on' : ''}`, onclick: () => ((view = 'codex'), ctx.rerender()) }, `📖 圖鑑 ${codexFound(s.codex)}/${CODEX_ENTRIES.length}`),
  ]);
  return [seg, ...(view === 'ach' ? renderAchievements(ctx) : renderCodex(ctx))];
}

function renderAchievements(ctx: CollectContext): HTMLElement[] {
  const s = ctx.state;
  const claimed = new Set(s.achievements.claimed);
  const doneN = ACHIEVEMENTS.filter((a) => isDone(s, a)).length;
  const claimable = claimableAchievements(s);
  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [
      h('h4', {}, `🏆 成就 ${doneN} / ${ACHIEVEMENTS.length}`),
      h('p', {}, '達成後在這裡領取鑽石。進度從你的冒險紀錄自動計算，舊存檔已經做到的也算。'),
      claimable
        ? h('button', {
            class: 'go small',
            onclick: () => {
              const [n, gems] = claimAllAchievements(s);
              bus.emit('toast', { text: `🏆 領取 ${n} 個成就：共 ${gems}💎`, kind: 'reward' });
              ctx.onChanged();
              ctx.rerender();
            },
          }, `全部領取（${claimable}）`)
        : h('span', {}, ''),
    ]),
  ];
  // 依分類；可領的排前面，已領的排最後
  for (const cat of Object.keys(ACH_CATS) as AchievementCat[]) {
    const list = ACHIEVEMENTS.filter((a) => a.cat === cat);
    const rank = (id: string, done: boolean) => (claimed.has(id) ? 2 : done ? 0 : 1);
    list.sort((a, b) => rank(a.id, isDone(s, a)) - rank(b.id, isDone(s, b)));
    out.push(h('h5', { class: 'collect-cat' }, `${ACH_CATS[cat]}　${list.filter((a) => claimed.has(a.id)).length}/${list.length}`));
    for (const a of list) {
      const [cur, target] = a.progress(s);
      const done = cur >= target;
      const got = claimed.has(a.id);
      const btn = got
        ? h('span', { class: 'pill' }, '已領取')
        : done
          ? h('button', {
              class: 'go small',
              onclick: () => {
                const g = claimAchievement(s, a.id);
                if (!g) return;
                bus.emit('toast', { text: `🏆 ${a.name}：獲得 ${g}💎`, kind: 'reward' });
                ctx.onChanged();
                ctx.rerender();
              },
            }, `領取 ${a.gems}💎`)
          : h('span', { class: 'pill locked' }, `${a.gems}💎`);
      out.push(
        h('div', { class: `card quest ach${got ? ' done' : done ? ' ready' : ''}` }, [
          h('div', { class: 'quest-head' }, [h('b', {}, `${a.icon} ${a.name}`), h('small', {}, a.desc)]),
          target > 1 ? h('div', { class: 'quest-bar' }, [h('i', { style: `width:${Math.min(100, (cur / target) * 100)}%` })]) : h('span', {}, ''),
          h('div', { class: 'quest-row' }, [h('span', {}, target > 1 ? `${cur.toLocaleString()} / ${target.toLocaleString()}` : done ? '已達成' : '未達成'), btn]),
        ]),
      );
    }
  }
  return out;
}

function renderCodex(ctx: CollectContext): HTMLElement[] {
  const s = ctx.state;
  const pts = codexPoints(s.codex);
  const b = codexBonus(s.codex);
  const out: HTMLElement[] = [
    h('div', { class: 'card' }, [
      h('h4', {}, `📖 怪物圖鑑・★ ${pts} / ${CODEX_MAX_POINTS}`),
      h('div', { class: 'quest-bar' }, [h('i', { style: `width:${(pts / CODEX_MAX_POINTS) * 100}%` })]),
      h('p', {}, `目前加成：攻擊 +${pct(b.atk)}、生命 +${pct(b.maxHp)}、防禦 +${pct(b.def)}（全滿：攻擊 +${CODEX_BONUS_MAX.atk * 100}%、生命 +${CODEX_BONUS_MAX.maxHp * 100}%、防禦 +${CODEX_BONUS_MAX.def * 100}%）`),
      h('p', {}, `打倒敵人就會記錄。小怪打倒 ${CODEX_TIERS.mob.join(' / ')} 隻、首領（含菁英、守護者）打倒 ${CODEX_TIERS.boss.join(' / ')} 次各得一顆星，每顆星都會提高加成。`),
    ]),
  ];
  for (const g of CODEX_GROUPS) {
    const found = g.entries.filter((e) => (s.codex[e.id] ?? 0) > 0).length;
    const stars = g.entries.reduce((n, e) => n + codexStars(e.kind, s.codex[e.id] ?? 0), 0);
    const max = g.entries.reduce((n, e) => n + CODEX_TIERS[e.kind].length, 0);
    const rows = g.entries.map((e) => {
      const kills = s.codex[e.id] ?? 0;
      const st = codexStars(e.kind, kills);
      const next = codexNext(e.kind, kills);
      const known = kills > 0;
      return h('div', { class: `dex-row${known ? '' : ' unknown'}${e.kind === 'boss' ? ' boss' : ''}` }, [
        h('span', { class: 'dex-name' }, `${e.kind === 'boss' ? '👑 ' : ''}${known ? e.name : '？？？'}`),
        h('small', {}, `Lv.${e.level}`),
        h('span', { class: 'dex-stars' }, '★'.repeat(st) + '☆'.repeat(CODEX_TIERS[e.kind].length - st)),
        h('small', { class: 'dex-kills' }, next ? `${kills} / ${next}` : `${kills} ✓`),
      ]);
    });
    const det = h('details', { class: `card dex-group${found === g.entries.length && stars === max ? ' full' : ''}` }, [
      h('summary', {}, [h('b', {}, g.label), h('small', {}, `發現 ${found}/${g.entries.length}・★ ${stars}/${max}`)]),
      ...rows,
    ]);
    det.open = openGroups.has(g.zoneId);
    det.addEventListener('toggle', () => (det.open ? openGroups.add(g.zoneId) : openGroups.delete(g.zoneId)));
    out.push(det);
  }
  return out;
}
