import { h } from './dom';
import { LOGIN_DAYS, OFFLINE, formatAway, loginRewardDef, type OfflineClaim, type OfflineReward } from '@/systems/Welcome';
import { ITEM_BASES, RARITY } from '@/data/items';
import { divinityOpen } from '@/systems/Divinity';

/**
 * 「歡迎回來」畫面（v1.65）：離線收益＋每日簽到。
 * 進遊戲時有其中一樣就顯示；關掉時還沒領的離線收益自動用一般倍率領取（不會不見），
 * 簽到沒領的話之後也可以在選單「任務」領。
 */
export interface WelcomeActions {
  /** 領離線收益；double = 花鑽石領 2 倍。回傳實際拿到的東西，失敗 null */
  claimOffline(double: boolean): OfflineClaim | null;
  /** 帶著的夥伴圖示（沒有就空字串） */
  companions(): string;
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
  private claimed: OfflineClaim | null = null;
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
    this.claimed = null;
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
      const c = this.claimed;
      const divine = divinityOpen(this.actions.level());
      const pct = Math.min(100, (o.minutes / (OFFLINE.capHours * 60)) * 100);
      const comps = this.actions.companions();
      const drops = c ? c.kept : o.drops;
      const gains = [
        h('span', {}, [h('small', {}, divine ? '神格經驗' : '經驗'), h('b', {}, `+${(c?.exp ?? o.exp).toLocaleString()}`)]),
        h('span', {}, [h('small', {}, '金幣'), h('b', {}, `+${(c ? c.gold + c.soldGold : o.gold).toLocaleString()}`)]),
      ];
      if (o.potions) gains.push(h('span', {}, [h('small', {}, '紅藍藥水'), h('b', {}, `各 +${c?.potions ?? o.potions}`)]));
      if (comps) gains.push(h('span', {}, [h('small', {}, `夥伴 ${comps}`), h('b', {}, `+${c?.compExp ?? o.compExp} 經驗`)]));
      parts.push(
        h('div', { class: 'wb-sec' }, [
          h('b', { class: 'wb-title' }, '⏳ 離線收益'),
          h('p', { class: 'wb-text' }, `你離開了 ${formatAway(o.away)}，赫拉斯的英靈替你打倒了 ${o.kills} 隻怪物${capped ? `（最多計算 ${OFFLINE.capHours} 小時）` : ''}。`),
          h('div', { class: 'wb-cap' }, [h('i', { style: `width:${pct.toFixed(1)}%` }), h('small', {}, `已累積 ${formatAway(o.minutes)} / ${OFFLINE.capHours} 小時`)]),
          h('div', { class: 'wb-gain' }, gains),
          drops.length || c?.soldCount
            ? h('div', { class: 'wb-drops' }, [
                ...drops.map((d) => {
                  const b = ITEM_BASES[d.base];
                  return h('span', { class: 'wb-drop', style: `--rc:${RARITY[d.rarity].color}`, title: `${RARITY[d.rarity].name}・${b?.name ?? d.base}` }, [
                    h('i', {}, b?.icon ?? '🎁'),
                    b?.named ? h('em', {}, '★') : null,
                  ].filter((x): x is HTMLElement => !!x));
                }),
                c?.soldCount ? h('small', { class: 'wb-sold' }, `另 ${c.soldCount} 件換成 ${c.soldGold.toLocaleString()} 金幣`) : null,
              ].filter((x): x is HTMLElement => !!x))
            : null,
          !c && o.drops.length ? h('p', { class: 'ps-hint' }, `撿到 ${o.drops.length} 件裝備（領 2 倍再多 ${o.bonusDrops.length} 件）；比身上差的低稀有度裝備會照「自動賣出」設定換成金幣`) : null,
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
        ].filter((x): x is HTMLElement => !!x)),
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
    const got = this.actions.claimOffline(double);
    if (!got) return;
    this.offlineDone = true;
    this.claimed = got;
    this.render();
  }

  private takeLogin() {
    if (this.loginGot) return;
    this.loginGot = this.actions.claimLogin() ?? [];
    this.render();
  }
}
