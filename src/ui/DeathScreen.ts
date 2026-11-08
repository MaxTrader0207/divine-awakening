import { h } from './dom';

/**
 * 倒下後的復活選擇（v1.82）：原地復活 / 入口復活 / 回主城。
 * AUTO 開著時倒數幾秒自動選「入口復活」，讓掛機可以繼續打。
 */
export interface DeathInfo {
  place: string;
  /** 原地復活要的鑽石（0 = 今天的免費次數） */
  cost: number;
  gems: number;
  /** 入口 / 回主城會損失的金幣 */
  goldLoss: number;
  /** 這張地圖有入口可以復活（主城、安全區沒有） */
  entrance: boolean;
  /** 首領戰中倒下（提示：原地復活首領保留血量） */
  bossPct?: number;
  /** AUTO 自動選擇的倒數秒數（沒有 = 不自動） */
  autoSecs?: number;
}

export interface DeathActions {
  here(): void;
  entrance(): void;
  town(): void;
}

export class DeathScreen {
  private root: HTMLElement;
  private box: HTMLElement;
  private countEl: HTMLElement | null = null;
  private left = 0;
  visible = false;

  constructor(uiRoot: HTMLElement, private actions: DeathActions) {
    this.box = h('div', { class: 'ps-box death-box' });
    this.root = h('div', { class: 'pause-screen death-screen', 'aria-hidden': 'true' }, [this.box]);
    uiRoot.appendChild(this.root);
  }

  show(d: DeathInfo) {
    const canHere = d.cost === 0 || d.gems >= d.cost;
    this.left = d.autoSecs ?? 0;
    this.countEl = this.left > 0 ? h('p', { class: 'ps-hint death-auto' }) : null;
    const parts: (HTMLElement | null)[] = [
      h('div', { class: 'ps-icon' }, '💫'),
      h('h2', {}, '你倒下了'),
      h('p', { class: 'ps-info' }, d.bossPct !== undefined ? `${d.place}・首領還剩 ${d.bossPct}%` : d.place),
      h('button', { class: 'ps-btn main death-here', disabled: !canHere, onclick: () => this.pick(() => this.actions.here()) }, [
        h('b', {}, '✨ 原地復活'),
        h('small', {}, d.cost === 0 ? '今天第一次免費・不扣金幣・3 秒無敵' : `💎 ${d.cost}${canHere ? '' : `（只有 ${d.gems}）`}・不扣金幣・3 秒無敵`),
      ]),
      d.entrance
        ? h('button', { class: 'ps-btn death-opt', onclick: () => this.pick(() => this.actions.entrance()) }, [h('b', {}, '🚪 在入口復活'), h('small', {}, `回到這張地圖的入口・${d.goldLoss ? `損失 ${d.goldLoss} 金幣` : '不扣金幣'}`)])
        : null,
      h('button', { class: 'ps-btn ghost death-opt', onclick: () => this.pick(() => this.actions.town()) }, [h('b', {}, '🏛 回到主城'), h('small', {}, d.goldLoss ? `損失 ${d.goldLoss} 金幣` : '不扣金幣')]),
      this.countEl,
    ];
    this.box.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    this.tickCount(0);
    this.visible = true;
    this.root.classList.add('show');
    this.root.setAttribute('aria-hidden', 'false');
  }

  /** Game 每幀呼叫（真實時間）；AUTO 倒數到 0 自動選入口（沒有入口就回主城） */
  update(dt: number, hasEntrance: boolean) {
    if (!this.visible || this.left <= 0) return;
    this.tickCount(dt);
    if (this.left <= 0) this.pick(() => (hasEntrance ? this.actions.entrance() : this.actions.town()));
  }

  private tickCount(dt: number) {
    if (!this.countEl) return;
    this.left = Math.max(0, this.left - dt);
    this.countEl.textContent = `AUTO 中：${Math.ceil(this.left)} 秒後自動在入口復活`;
  }

  hide() {
    this.visible = false;
    this.left = 0;
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
  }

  private pick(fn: () => void) {
    this.hide();
    fn();
  }
}
