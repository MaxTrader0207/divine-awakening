import type { MenuTab } from '@/core/EventBus';
import { h } from './dom';

/**
 * 暫停畫面：半透明遮罩＋狀態＋「繼續遊戲 / 存檔 / 設定 / 回到開頭畫面」。
 * 暫停期間 Game 完全不推進邏輯（敵人、冷卻、計時、AUTO 都停住），只繼續渲染。
 * 從這裡開選單時遮罩先隱藏，選單關掉後回到暫停畫面。
 *
 * v1.54：
 * - 兩種模式：一般暫停（pause）與登入時的「準備出發」（ready，讀檔進到野外 / 副本時自動顯示）。
 * - 顯示 HP / MP、附近敵人數量，血少時提醒；可直接在這裡喝紅 / 藍藥水、用快捷欄道具。
 */
export interface PauseStatus {
  place: string;
  level: number;
  className: string;
  playTime: number;
  kills: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** 資源名稱（MP / 怒氣） */
  mpLabel: string;
  /** 附近（14 公尺內）的敵人 */
  nearby: number;
  /** 附近有首領 */
  bossNear: boolean;
  safe: boolean;
  potions: { hp: number; mp: number };
  /** 快捷欄（圖示、名稱、數量；空格 = null） */
  quick: ({ icon: string; name: string; count: number } | null)[];
  /** 藥水冷卻中 */
  potionCd: boolean;
}

export interface PauseActions {
  resume(): void;
  openMenu(tab: MenuTab): void;
  toTitle(): void;
  status(): PauseStatus;
  usePotion(kind: 'hp' | 'mp'): void;
  useQuick(i: number): void;
}

export type PauseMode = 'pause' | 'ready';

export class PauseScreen {
  private root: HTMLElement;
  private iconEl: HTMLElement;
  private titleEl: HTMLElement;
  private infoEl: HTMLElement;
  private statusEl: HTMLElement;
  private itemsEl: HTMLElement;
  private mainBtn: HTMLElement;
  private titleBtn: HTMLElement;
  private hintEl: HTMLElement;
  private armed = false;
  visible = false;
  mode: PauseMode = 'pause';

  constructor(uiRoot: HTMLElement, private actions: PauseActions) {
    this.iconEl = h('div', { class: 'ps-icon' }, '⏸');
    this.titleEl = h('h2', {}, '暫停中');
    this.infoEl = h('div', { class: 'ps-info' });
    this.statusEl = h('div', { class: 'ps-status' });
    this.itemsEl = h('div', { class: 'ps-items' });
    this.mainBtn = h('button', { class: 'ps-btn main', onclick: () => actions.resume() }, '▶ 繼續遊戲');
    this.titleBtn = h('button', { class: 'ps-btn ghost', onclick: () => this.confirmTitle() }, '回到開頭畫面');
    this.hintEl = h('p', { class: 'ps-hint' }, '電腦：按 Esc 暫停 / 繼續');
    this.root = h('div', { class: 'pause-screen', 'aria-hidden': 'true' }, [
      h('div', { class: 'ps-box' }, [
        this.iconEl,
        this.titleEl,
        this.infoEl,
        this.statusEl,
        this.itemsEl,
        this.mainBtn,
        h('div', { class: 'ps-row' }, [
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('equip') }, '🎒 裝備・道具'),
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('map') }, '🗺 地圖・回城'),
        ]),
        h('div', { class: 'ps-row' }, [
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('shop') }, '🛒 商城'),
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('settings') }, '⚙ 設定'),
        ]),
        h('div', { class: 'ps-row' }, [
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('saves') }, '💾 存檔'),
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('guide') }, '📜 遊戲指引'),
        ]),
        this.titleBtn,
        this.hintEl,
      ]),
    ]);
    uiRoot.appendChild(this.root);
  }

  /** 回到開頭畫面要按兩次（會先自動存檔） */
  private confirmTitle() {
    if (!this.armed) {
      this.armed = true;
      this.titleBtn.textContent = '再按一次：存檔並回到開頭畫面';
      setTimeout(() => {
        this.armed = false;
        this.titleBtn.textContent = '回到開頭畫面';
      }, 3000);
      return;
    }
    this.actions.toTitle();
  }

  setMode(mode: PauseMode) {
    this.mode = mode;
    const ready = mode === 'ready';
    this.root.classList.toggle('ready', ready);
    this.iconEl.textContent = ready ? '⚔' : '⏸';
    this.titleEl.textContent = ready ? '準備出發' : '暫停中';
    this.mainBtn.textContent = ready ? '▶ 開始冒險' : '▶ 繼續遊戲';
    if (this.visible) this.refresh();
  }

  /** 重畫狀態（喝藥、換裝後呼叫） */
  refresh() {
    const s = this.actions.status();
    const m = Math.floor(s.playTime / 60);
    const ready = this.mode === 'ready';
    this.infoEl.replaceChildren(
      h('b', {}, `${s.className} Lv.${s.level}・${s.place}`),
      ready ? h('span', {}, '遊戲已暫停：先看看狀態、補血或換裝備，準備好再出發') : h('span', {}, `遊戲 ${Math.floor(m / 60)} 小時 ${m % 60} 分・擊倒 ${s.kills}`),
    );
    const hpR = s.hp / s.maxHp;
    const bar = (cls: string, label: string, v: number, max: number) =>
      h('div', { class: `ps-bar ${cls}` }, [h('i', { style: `width:${Math.max(0, Math.min(1, v / max)) * 100}%` }), h('span', {}, `${label} ${Math.round(v)} / ${max}`)]);
    const warn: string[] = [];
    if (!s.safe) {
      if (s.bossNear) warn.push('⚠ 首領就在附近');
      else if (s.nearby > 0) warn.push(`⚠ 附近有 ${s.nearby} 隻敵人`);
      else warn.push('附近沒有敵人');
    }
    if (hpR < 0.5) warn.push(s.potions.hp > 0 ? '❤ HP 偏低，建議先喝紅藥水' : '❤ HP 偏低，紅藥水用完了：可回城或用道具補血');
    if (ready && !s.safe) warn.push('開始後 3 秒內無敵');
    this.statusEl.replaceChildren(
      bar('hp', 'HP', s.hp, s.maxHp),
      bar('mp', s.mpLabel, s.mp, s.maxMp),
      ...(warn.length ? [h('div', { class: `ps-warn${hpR < 0.5 || s.bossNear ? ' bad' : ''}` }, warn.map((w) => h('span', {}, w)))] : []),
    );
    // 在暫停畫面直接用藥水 / 快捷欄道具
    const btn = (icon: string, label: string, count: number, onclick: () => void, extra = '') =>
      h('button', { class: `ps-item${count <= 0 ? ' out' : ''}${extra}`, disabled: count <= 0 || s.potionCd && extra.includes('cd'), onclick: () => { onclick(); this.refresh(); } }, [
        h('span', {}, icon),
        h('small', {}, label),
        h('em', {}, String(count)),
      ]);
    const items: HTMLElement[] = [
      btn('❤', '紅藥水', s.potions.hp, () => this.actions.usePotion('hp'), ' red cd'),
      btn('💧', '藍藥水', s.potions.mp, () => this.actions.usePotion('mp'), ' blue cd'),
    ];
    s.quick.forEach((q, i) => {
      if (q) items.push(btn(q.icon, q.name, q.count, () => this.actions.useQuick(i)));
    });
    this.itemsEl.replaceChildren(...items);
    if (s.potionCd) this.itemsEl.appendChild(h('small', { class: 'ps-cd' }, '藥水冷卻中（遊戲繼續 2 秒後可再喝）'));
  }

  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    if (v) this.refresh();
    this.root.classList.toggle('show', v);
    this.root.setAttribute('aria-hidden', v ? 'false' : 'true');
  }
}
