import { h } from './dom';
import { CLASSES, type HeroClass } from '@/data/classes';
import { CLASS_CLEAR, CLEAR_QUOTES, STAGE_EPILOGUE } from '@/data/stageClear';
import { ZONES, floorLabel } from '@/data/zones';
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
  auto: boolean;
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
      h('div', { class: 'cs-card' }, [
        h('div', { class: 'cs-place' }, place),
        h('h2', { class: 'cs-title' }, info.allDone ? '全副本制霸！' : '破關！'),
        h('div', { class: 'cs-epi' }, [h('span', {}, epi.emblem), ` ${epi.title}`]),
        h('div', { class: 'cs-hero' }, [
          h('div', { class: 'cs-medal' }, [h('span', {}, CLASSES[cls].icon)]),
          h('div', { class: 'cs-who' }, [h('small', {}, cc.title), h('b', {}, info.playerName), h('span', {}, `擊敗 ${info.bossName}`)]),
          h('div', { class: 'cs-rank' }, [h('small', {}, '評價'), h('b', {}, r.rank)]),
        ]),
        h('blockquote', { class: 'cs-quote' }, `「${quote}」`),
        epi.myth ? h('p', { class: 'cs-myth' }, epi.myth) : null,
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
        info.unlocked ? h('div', { class: 'cs-unlock' }, `🔓 解鎖 ${floorLabel(ZONES[info.unlocked].dungeon!.floor)}・${ZONES[info.unlocked].name}`) : null,
        info.allDone ? h('div', { class: 'cs-unlock' }, '🏆 你完成了赫拉斯大陸的全部副本') : null,
        ...btns,
        autoEl,
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
