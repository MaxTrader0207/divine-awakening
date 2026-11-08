import { h } from './dom';
import { CLASSES, type HeroClass } from '@/data/classes';
import { CLASS_CLEAR, CLEAR_QUOTES, STAGE_EPILOGUE } from '@/data/stageClear';
import { ZONES, bossOf, floorLabel } from '@/data/zones';
import type { ZoneId } from '@/data/types';
import { fmtSecs, type ClearResult } from '@/systems/StageClear';

/**
 * 破關畫面（擊敗首領後，慢動作＋鏡頭繞到角色正面之後出現）
 * ------------------------------------------------------------
 * 每個「職業 × 關卡」都不一樣：
 *  - 背景：關卡的天空 / 地面色漸層＋職業主題色的旋轉光芒、飄落的花瓣（顏色依職業）
 *  - 職業徽章＋稱號＋這個職業在這一關的勝利台詞（CLEAR_QUOTES）
 *  - 關卡的結局標題、首領徽記、神話尾聲（STAGE_EPILOGUE）
 *  - 評價章（S/A/B/C）、戰鬥時間（新紀錄）、被首領招式打中、用藥、第幾次破關、獎勵、解鎖
 * 開著的時候遊戲世界暫停（角色動畫與鏡頭照常），AUTO 中 8 秒後自動關閉。
 */
export interface ClearInfo {
  result: ClearResult;
  heroClass: HeroClass;
  playerName: string;
  bossName: string;
  exp: number;
  gold: number;
  gems: number;
  /** 首次擊敗解鎖的下一層 */
  unlocked?: ZoneId;
  /** 完成全部副本（第一次擊敗最後一層） */
  allDone: boolean;
  /** 可以前往的下一層（已解鎖） */
  next?: ZoneId;
  /** 首次擊敗這層後開放的支線地圖（v1.58） */
  sideUnlocked?: ZoneId[];
  /** 守護者收服結果（支線地圖，v1.58） */
  capture?: { result: 'captured' | 'failed' | 'owned'; name: string; icon: string; left: number };
  auto: boolean;
  /** v1.77 神話難度第幾層（沒有 = 普通難度） */
  mythic?: number;
}

export interface ClearActions {
  close(): void;
  goNext(id: ZoneId): void;
  goTown(): void;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class StageClearScreen {
  private root: HTMLElement;
  private timer = 0;
  open = false;

  constructor(uiRoot: HTMLElement, private actions: ClearActions) {
    this.root = h('div', { class: 'clear-screen', 'aria-hidden': 'true' });
    uiRoot.appendChild(this.root);
  }

  show(info: ClearInfo) {
    const { result: r, heroClass: cls } = info;
    const zone = ZONES[r.zoneId];
    const epi = STAGE_EPILOGUE[r.zoneId] ?? { title: '首領倒下', myth: '', emblem: '⚔️' };
    const cc = CLASS_CLEAR[cls];
    const quote = CLEAR_QUOTES[cls][r.zoneId] ?? '勝利屬於我們！';
    const place = zone.dungeon ? `${floorLabel(zone.dungeon.floor)}・${zone.name}` : zone.subtitle.split('・')[0];
    const sky = hex(zone.skyColor ?? 0x223044);
    const ground = hex(zone.groundColor ?? 0x334);
    this.root.style.setProperty('--cs-sky', sky);
    this.root.style.setProperty('--cs-ground', ground);
    this.root.style.setProperty('--cs-cls', cc.color);
    this.root.style.setProperty('--cs-glow', cc.glow);

    const petals = Array.from({ length: 18 }, (_, i) =>
      h('i', { class: 'cs-petal', style: `left:${(i * 53) % 100}%;animation-delay:${((i * 0.37) % 3).toFixed(2)}s;animation-duration:${(4 + ((i * 0.71) % 3)).toFixed(2)}s` }),
    );
    const stat = (label: string, value: string, tag?: string) =>
      h('div', { class: 'cs-stat' }, [h('small', {}, label), h('b', {}, value), tag ? h('em', {}, tag) : null]);
    const timeTag = r.newRecord ? '新紀錄！' : r.prevBest ? `最佳 ${fmtSecs(r.prevBest)}` : r.first ? '首次' : undefined;

    const btns: HTMLElement[] = [];
    if (info.next) btns.push(h('button', { class: 'cs-btn main', onclick: () => this.pick(() => this.actions.goNext(info.next!)) }, `前往 ${ZONES[info.next].name} ➜`));
    btns.push(
      h('div', { class: 'cs-row' }, [
        h('button', { class: 'cs-btn', onclick: () => this.pick(() => this.actions.goTown()) }, '🏛 回到雅典城'),
        h('button', { class: `cs-btn${info.next ? '' : ' main'}`, onclick: () => this.pick(() => this.actions.close()) }, '留在這裡'),
      ]),
    );
    const autoEl = info.auto ? h('p', { class: 'cs-auto' }, 'AUTO 中，8 秒後自動繼續') : null;

    this.root.className = `clear-screen cls-${cls} rank-${r.rank}`;
    this.root.replaceChildren(
      h('div', { class: 'cs-bg' }, [h('div', { class: 'cs-rays' }), ...petals]),
      h('div', { class: 'cs-card split' }, [
        // 兩欄容器（v1.79）：直式 display: contents 不影響排版，橫式左右兩欄
        h('div', { class: 'col-a' }, [
        h('div', { class: 'cs-place' }, info.mythic ? `🔥 神話・${place}` : place),
        h('h2', { class: 'cs-title' }, info.mythic ? '神話破關！' : info.allDone ? '全副本制霸！' : '破關！'),
        h('div', { class: 'cs-epi' }, [h('span', {}, epi.emblem), ` ${epi.title}`]),
        h('div', { class: 'cs-hero' }, [
          h('div', { class: 'cs-medal' }, [h('span', {}, CLASSES[cls].icon)]),
          h('div', { class: 'cs-who' }, [h('small', {}, cc.title), h('b', {}, info.playerName), h('span', {}, `擊敗 ${info.bossName}`)]),
          h('div', { class: 'cs-rank' }, [h('small', {}, '評價'), h('b', {}, r.rank)]),
        ]),
        h('blockquote', { class: 'cs-quote' }, `「${quote}」`),
        epi.myth ? h('p', { class: 'cs-myth' }, epi.myth) : null,
        ]),
        h('div', { class: 'col-b' }, [
        h('div', { class: 'cs-stats' }, [
          stat('時間', fmtSecs(r.secs), timeTag),
          stat('被招式打中', `${r.skillHits} 次`),
          stat('用藥', `${r.itemsUsed} 個`),
          stat('破關', `第 ${r.count} 次`),
        ]),
        h('div', { class: 'cs-rewards' }, [
          h('span', {}, `✨ ${info.exp.toLocaleString()} EXP`),
          h('span', {}, `🪙 ${info.gold.toLocaleString()}`),
          info.gems ? h('span', {}, `💎 ${info.gems}`) : null,
        ]),
        h('p', { class: 'cs-loot' }, '首領的寶物掉在地上，記得撿起來'),
        info.unlocked ? h('div', { class: 'cs-unlock' }, `🔓 ${info.mythic ? '開放神話' : '解鎖'} ${floorLabel(ZONES[info.unlocked].dungeon!.floor)}・${ZONES[info.unlocked].name}`) : null,
        info.allDone ? h('div', { class: 'cs-unlock' }, '🏆 你完成了赫拉斯大陸的全部副本') : null,
        ...(info.sideUnlocked ?? []).map((id) => h('div', { class: 'cs-unlock side' }, `🗺 開放支線・${ZONES[id].name}（守護者：${bossOf(id)?.name ?? '？'}）`)),
        info.capture ? captureLine(info.capture) : null,
        ...btns,
        autoEl,
        ]),
      ]),
    );
    this.open = true;
    this.root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('clear-open'); // 藏起 HUD，讓上方的 3D 特寫乾淨
    // 下一幀再加 show，讓進場動畫播放
    requestAnimationFrame(() => this.root.classList.add('show'));
    clearTimeout(this.timer);
    if (info.auto) this.timer = window.setTimeout(() => this.pick(() => this.actions.close()), 8000);
  }

  private pick(fn: () => void) {
    if (!this.open) return;
    this.hide();
    fn();
  }

  hide() {
    clearTimeout(this.timer);
    this.open = false;
    document.documentElement.classList.remove('clear-open');
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
  }
}

/** 守護者收服結果 */
function captureLine(c: NonNullable<ClearInfo['capture']>): HTMLElement {
  if (c.result === 'captured') return h('div', { class: 'cs-capture ok' }, [h('span', {}, c.icon), h('b', {}, `收服了 ${c.name}！`), h('small', {}, '在「裝備 → 夥伴」帶上牠，戰鬥中按「夥伴」召喚')]);
  if (c.result === 'owned') return h('div', { class: 'cs-capture' }, [h('span', {}, c.icon), h('b', {}, `${c.name} 已經是你的夥伴`)]);
  return h('div', { class: 'cs-capture' }, [h('span', {}, c.icon), h('b', {}, `${c.name} 還不願意跟隨你`), h('small', {}, c.left <= 1 ? '下次打倒牠一定收服' : `再打倒牠 ${c.left} 次內一定收服`)]);
}
