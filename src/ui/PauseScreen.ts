import type { MenuTab } from '@/core/EventBus';
import { h } from './dom';

/**
 * 暫停畫面：半透明遮罩＋「繼續遊戲 / 存檔 / 設定 / 回到開頭畫面」。
 * 暫停期間 Game 完全不推進邏輯（敵人、冷卻、計時、AUTO 都停住），只繼續渲染。
 * 從這裡開選單時遮罩先隱藏，選單關掉後回到暫停畫面。
 */
export interface PauseActions {
  resume(): void;
  openMenu(tab: MenuTab): void;
  toTitle(): void;
  /** 顯示在暫停畫面的目前狀態 */
  info(): { place: string; level: number; className: string; playTime: number; kills: number };
}

export class PauseScreen {
  private root: HTMLElement;
  private infoEl: HTMLElement;
  private titleBtn: HTMLElement;
  private armed = false;
  visible = false;

  constructor(uiRoot: HTMLElement, private actions: PauseActions) {
    this.infoEl = h('div', { class: 'ps-info' });
    this.titleBtn = h('button', { class: 'ps-btn ghost', onclick: () => this.confirmTitle() }, '回到開頭畫面');
    this.root = h('div', { class: 'pause-screen', 'aria-hidden': 'true' }, [
      h('div', { class: 'ps-box' }, [
        h('div', { class: 'ps-icon' }, '⏸'),
        h('h2', {}, '暫停中'),
        this.infoEl,
        h('button', { class: 'ps-btn main', onclick: () => actions.resume() }, '▶ 繼續遊戲'),
        h('div', { class: 'ps-row' }, [
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('saves') }, '💾 存檔'),
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('settings') }, '⚙ 設定'),
        ]),
        h('div', { class: 'ps-row' }, [
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('equip') }, '🎒 裝備'),
          h('button', { class: 'ps-btn', onclick: () => actions.openMenu('map') }, '🗺 地圖'),
        ]),
        this.titleBtn,
        h('p', { class: 'ps-hint' }, '電腦：按 Esc 暫停 / 繼續'),
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

  setVisible(v: boolean) {
    if (v === this.visible) return;
    this.visible = v;
    if (v) {
      const i = this.actions.info();
      const m = Math.floor(i.playTime / 60);
      this.infoEl.replaceChildren(h('b', {}, `${i.className} Lv.${i.level}・${i.place}`), h('span', {}, `遊戲 ${Math.floor(m / 60)} 小時 ${m % 60} 分・擊倒 ${i.kills}`));
    }
    this.root.classList.toggle('show', v);
    this.root.setAttribute('aria-hidden', v ? 'false' : 'true');
  }
}
