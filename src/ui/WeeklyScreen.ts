import { h } from './dom';
import { fmtSecs } from '@/systems/StageClear';
import { WEEKLY_DIFF_MAP, type WeeklyDiff } from '@/systems/WeeklyBoss';

/**
 * 每週首領挑戰結算（v1.78）：打倒 / 失敗、時間、本週最快、第一次獎勵、再挑戰 / 回主城。
 */
export interface WeeklyResult {
  win: boolean;
  reason: 'win' | 'dead' | 'timeout' | 'leave';
  diff: WeeklyDiff;
  bossName: string;
  secs: number;
  best?: number;
  newBest: boolean;
  /** 第一次獎勵拿到的東西（沒有 = 本週已領過或沒打倒） */
  rewards: string[];
}

export interface WeeklyActions {
  retry(diff: WeeklyDiff): void;
  toTown(): void;
}

export class WeeklyScreen {
  private root: HTMLElement;
  private box: HTMLElement;
  visible = false;

  constructor(uiRoot: HTMLElement, private actions: WeeklyActions) {
    this.box = h('div', { class: 'ps-box tw-box' });
    this.root = h('div', { class: 'pause-screen weekly-result', 'aria-hidden': 'true' }, [this.box]);
    uiRoot.appendChild(this.root);
  }

  show(r: WeeklyResult) {
    const d = WEEKLY_DIFF_MAP[r.diff];
    const why = r.reason === 'dead' ? '你在挑戰中倒下了' : r.reason === 'timeout' ? '時間到了' : '';
    this.box.classList.add('split');
    this.box.replaceChildren(
      h('div', { class: 'col-a' }, [
      h('div', { class: 'ps-icon' }, r.win ? '👑' : '⏳'),
      h('h2', {}, r.win ? (r.newBest ? '新紀錄！' : '挑戰成功！') : '挑戰失敗'),
      h('p', { class: 'ps-info' }, `${d.icon} ${d.name}難度・${r.bossName}${why ? `——${why}` : ''}`),
      ]),
      h('div', { class: 'col-b' }, [
      h('div', { class: 'wb-gain' }, [
        h('span', {}, [h('small', {}, r.win ? '這次時間' : '撐了'), h('b', {}, fmtSecs(r.secs))]),
        h('span', {}, [h('small', {}, '本週最快'), h('b', {}, r.best !== undefined ? fmtSecs(r.best) : '—')]),
      ]),
      r.rewards.length ? h('p', { class: 'wb-done' }, `🎁 本週第一次打倒：${r.rewards.join('、')}`) : h('p', { class: 'ps-hint' }, r.win ? '這個難度本週的獎勵已經領過了，可以挑戰更快的時間' : '每週一 00:00 換首領；每個難度本週第一次打倒有鑽石與★神話裝'),
      h('div', { class: 'ps-row' }, [
        h('button', { class: 'ps-btn gold', onclick: () => this.pick(() => this.actions.retry(r.diff)) }, '再挑戰'),
        h('button', { class: 'ps-btn', onclick: () => this.pick(() => this.actions.toTown()) }, '回到主城'),
      ]),
      ]),
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
