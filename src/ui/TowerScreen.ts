import { h } from './dom';
import { towerLevel } from '@/systems/TrialTower';

/**
 * 無盡試煉塔結算畫面（v1.70）：到達的層數、紀錄、鑽石，以及「再挑戰 / 回主城」。
 */
export interface TowerResult {
  /** 這次打過的最高層（0 = 第一層就失敗） */
  cleared: number;
  startFloor: number;
  reason: 'dead' | 'timeout' | 'leave';
  best: number;
  weekBest: number;
  newBest: boolean;
  gems: number;
  kills: number;
  /** 可以選的起始層 */
  starts: number[];
}

export interface TowerActions {
  retry(floor: number): void;
  toTown(): void;
}

export class TowerScreen {
  private root: HTMLElement;
  private box: HTMLElement;
  visible = false;

  constructor(uiRoot: HTMLElement, private actions: TowerActions) {
    this.box = h('div', { class: 'ps-box tw-box' });
    this.root = h('div', { class: 'pause-screen tower-result', 'aria-hidden': 'true' }, [this.box]);
    uiRoot.appendChild(this.root);
  }

  show(r: TowerResult) {
    const why = r.reason === 'dead' ? '你在試煉中倒下了' : r.reason === 'timeout' ? '時間到了' : '離開了試煉塔';
    this.box.replaceChildren(
      h('div', { class: 'ps-icon' }, '🗼'),
      h('h2', {}, r.newBest ? '新紀錄！' : '試煉結束'),
      h('p', { class: 'ps-info' }, `${why}。`),
      h('div', { class: 'tw-floor' }, [h('small', {}, '這次打到'), h('b', {}, r.cleared ? `第 ${r.cleared} 層` : '—'), h('small', {}, `從第 ${r.startFloor} 層開始・打倒 ${r.kills} 隻`)]),
      h('div', { class: 'wb-gain' }, [
        h('span', {}, [h('small', {}, '本週最高'), h('b', {}, `${r.weekBest} 層`)]),
        h('span', {}, [h('small', {}, '歷史最高'), h('b', {}, `${r.best} 層`)]),
      ]),
      r.gems ? h('p', { class: 'wb-done' }, `💎 本週新打過的首領層：獲得 ${r.gems} 鑽石`) : h('p', { class: 'ps-hint' }, '本週第一次打過首領層（每 5 層）會得到鑽石'),
      h('div', { class: 'ps-row' }, r.starts.map((f) => h('button', { class: 'ps-btn gold', onclick: () => this.pick(() => this.actions.retry(f)) }, f === 1 ? '再挑戰・第 1 層' : `第 ${f} 層・Lv.${towerLevel(f)}`))),
      h('button', { class: 'ps-btn', onclick: () => this.pick(() => this.actions.toTown()) }, '回到主城'),
    );
    this.visible = true;
    this.root.classList.add('show');
    this.root.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.visible = false;
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
  }

  private pick(fn: () => void) {
    this.hide();
    fn();
  }
}
