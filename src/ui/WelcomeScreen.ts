import { h } from './dom';
import { LOGIN_DAYS, OFFLINE, formatAway, loginRewardDef, type OfflineReward } from '@/systems/Welcome';

/**
 * 「歡迎回來」畫面（v1.65）：離線收益＋每日簽到。
 * 進遊戲時有其中一樣就顯示；關掉時還沒領的離線收益自動用一般倍率領取（不會不見），
 * 簽到沒領的話之後也可以在選單「任務」領。
 */
export interface WelcomeActions {
  /** 領離線收益；double = 花鑽石領 2 倍。回傳是否成功 */
  claimOffline(double: boolean): boolean;
  /** 簽到；回傳獲得的東西 */
  claimLogin(): string[] | null;
  gems(): number;
  level(): number;
  onClose(): void;
}

export class WelcomeScreen {
  private root: HTMLElement;
  private box: HTMLElement;
  private offline: OfflineReward | null = null;
  private offlineDone = false;
  private login: { day: number; total: number } | null = null;
  private loginGot: string[] | null = null;
  visible = false;

  constructor(uiRoot: HTMLElement, private actions: WelcomeActions) {
    this.box = h('div', { class: 'ps-box wb-box' });
    this.root = h('div', { class: 'pause-screen welcome', 'aria-hidden': 'true' }, [this.box]);
    uiRoot.appendChild(this.root);
  }

  /** offline / login 其中一個有就顯示 */
  show(offline: OfflineReward | null, login: { day: number; total: number } | null) {
    this.offline = offline;
    this.offlineDone = false;
    this.login = login;
    this.loginGot = null;
    if (!offline && !login) return;
    this.render();
    this.visible = true;
    this.root.classList.add('show');
    this.root.setAttribute('aria-hidden', 'false');
  }

  close() {
    if (!this.visible) return;
    if (this.offline && !this.offlineDone) this.actions.claimOffline(false);
    this.visible = false;
    this.root.classList.remove('show');
    this.root.setAttribute('aria-hidden', 'true');
    this.actions.onClose();
  }

  private render() {
    const parts: HTMLElement[] = [h('div', { class: 'ps-icon' }, '🏛'), h('h2', {}, '歡迎回來')];
    const o = this.offline;
    if (o) {
      const capped = o.away > o.minutes;
      parts.push(
        h('div', { class: 'wb-sec' }, [
          h('b', { class: 'wb-title' }, '⏳ 離線收益'),
          h('p', { class: 'wb-text' }, `你離開了 ${formatAway(o.away)}，赫拉斯的英靈替你打倒了 ${o.kills} 隻怪物${capped ? `（最多計算 ${OFFLINE.capHours} 小時）` : ''}。`),
          h('div', { class: 'wb-gain' }, [
            h('span', {}, [h('small', {}, '經驗'), h('b', {}, `+${o.exp.toLocaleString()}`)]),
            h('span', {}, [h('small', {}, '金幣'), h('b', {}, `+${o.gold.toLocaleString()}`)]),
          ]),
          this.offlineDone
            ? h('p', { class: 'wb-done' }, '✓ 已領取')
            : h('div', { class: 'ps-row' }, [
                h('button', { class: 'ps-btn', onclick: () => this.takeOffline(false) }, '領取'),
                h('button', {
                  class: 'ps-btn gold',
                  disabled: this.actions.gems() < OFFLINE.doubleCost,
                  onclick: () => this.takeOffline(true),
                }, `${OFFLINE.doubleCost}💎 領 2 倍`),
              ]),
        ]),
      );
    }
    const lg = this.login;
    if (lg) {
      const lv = this.actions.level();
      const days = Array.from({ length: LOGIN_DAYS }, (_, i) => {
        const r = loginRewardDef(i, lv);
        const state = i < lg.day || (i === lg.day && this.loginGot) ? 'got' : i === lg.day ? 'today' : '';
        return h('div', { class: `wb-day ${state}${i === LOGIN_DAYS - 1 ? ' big' : ''}` }, [
          h('small', {}, `第 ${i + 1} 天`),
          h('span', {}, state === 'got' ? '✓' : r.icon),
          h('em', {}, r.label),
        ]);
      });
      parts.push(
        h('div', { class: 'wb-sec' }, [
          h('b', { class: 'wb-title' }, `📅 每日簽到・累計 ${lg.total + (this.loginGot ? 1 : 0)} 天`),
          h('div', { class: 'wb-days' }, days),
          this.loginGot
            ? h('p', { class: 'wb-done' }, `✓ 獲得 ${this.loginGot.join('、')}`)
            : h('button', { class: 'ps-btn gold', onclick: () => this.takeLogin() }, `簽到領取：${loginRewardDef(lg.day, lv).label}`),
          h('p', { class: 'ps-hint' }, '7 天一輪，漏掉的天數不會重來；第 7 天必得★神話裝'),
        ]),
      );
    }
    parts.push(h('button', { class: 'ps-btn main', onclick: () => this.close() }, '出發冒險'));
    this.box.replaceChildren(...parts);
  }

  private takeOffline(double: boolean) {
    if (this.offlineDone) return;
    if (!this.actions.claimOffline(double)) return;
    this.offlineDone = true;
    if (double && this.offline) this.offline = { ...this.offline, exp: this.offline.exp * 2, gold: this.offline.gold * 2 };
    this.render();
  }

  private takeLogin() {
    if (this.loginGot) return;
    this.loginGot = this.actions.claimLogin() ?? [];
    this.render();
  }
}
