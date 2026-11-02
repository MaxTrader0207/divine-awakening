import { bus, type MenuTab } from '@/core/EventBus';
import { isZoneUnlocked, type GameState } from '@/core/GameState';
import { DUNGEON_ORDER, WORLD_FIELDS, ZONES } from '@/data/zones';
import { h } from './dom';
import { renderEnhance, renderEquip, renderShop, type InvContext } from './InventoryTabs';

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'equip', label: '裝備' },
  { id: 'enhance', label: '強化' },
  { id: 'shop', label: '商城' },
  { id: 'map', label: '地圖' },
  { id: 'settings', label: '設定' },
];


export interface MenuActions {
  onResetSave(): void;
  onUnlockAll(): void;
  onZoomSet(z: number): void;
  onToggleFps(v: boolean): void;
  /** 開發用：直接設定穿透，驗證防禦公式 */
  onSetPen(pen: number): void;
  getStatsText(): string;
  /** 背包 / 金錢變動 */
  onInventoryChanged(): void;
  onCelebrate(): void;
  onVolume(kind: 'music' | 'sfx', v: number): void;
}

export class Menu {
  private root: HTMLElement;
  private body: HTMLElement;
  private tabEls = new Map<MenuTab, HTMLElement>();
  private tab: MenuTab = 'map';
  isOpen = false;

  constructor(uiRoot: HTMLElement, private state: GameState, private actions: MenuActions) {
    this.body = h('div', { class: 'menu-body' });
    const tabs = h('div', { class: 'menu-tabs' });
    for (const t of TABS) {
      const el = h('button', { class: 'menu-tab', onclick: () => this.show(t.id) }, t.label);
      this.tabEls.set(t.id, el);
      tabs.appendChild(el);
    }
    tabs.appendChild(h('button', { class: 'menu-close', onclick: () => this.close(), 'aria-label': '關閉' }, '✕'));
    this.root = h('div', { class: 'menu-overlay' }, [h('div', { class: 'menu-panel' }, [tabs, this.body])]);
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.root) this.close();
    });
    uiRoot.appendChild(this.root);

    bus.on('menu:open', ({ tab }) => this.open(tab));
  }

  open(tab?: MenuTab) {
    this.isOpen = true;
    this.root.classList.add('open');
    this.show(tab ?? this.tab);
  }

  close() {
    this.isOpen = false;
    this.root.classList.remove('open');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  private show(tab: MenuTab) {
    this.tab = tab;
    this.tabEls.forEach((el, id) => el.classList.toggle('active', id === tab));
    this.body.replaceChildren(...this.render(tab));
  }

  private render(tab: MenuTab): HTMLElement[] {
    if (tab === 'map') return this.renderMap();
    if (tab === 'settings') return this.renderSettings();
    const ctx: InvContext = {
      state: this.state,
      changed: () => this.actions.onInventoryChanged(),
      toast: (text) => bus.emit('toast', { text }),
      rerender: () => {
        const top = this.body.scrollTop;
        this.show(this.tab);
        this.body.scrollTop = top;
      },
      goTab: (t) => this.show(t),
      celebrate: () => this.actions.onCelebrate(),
    };
    if (tab === 'equip') return renderEquip(ctx);
    if (tab === 'enhance') return renderEnhance(ctx);
    return renderShop(ctx);
  }

  /** 選單開著時資料變了（撿到東西）就重畫 */
  refreshIfOpen() {
    if (this.isOpen && this.tab !== 'settings') this.show(this.tab);
  }

  private renderMap(): HTMLElement[] {
    const s = this.state;
    const here = s.zoneId;
    const fieldList = WORLD_FIELDS.map((f) => `${f.name}${f.range ? ' ' + f.range : ''}`).join('、');
    const out: HTMLElement[] = [
      h('div', { class: 'card' }, [
        h('h3', {}, '艾爾芙大陸・主城與野外'),
        h('p', {}, fieldList),
        h('div', { class: 'card-row' }, [
          here === 'town' ? h('span', { class: 'pill' }, '目前位置') : h('button', { class: 'go', onclick: () => this.travel('town') }, '回到主城'),
          here === 'grassland' ? h('span', { class: 'pill' }, '目前位置') : h('button', { class: 'go ghost', onclick: () => this.travel('grassland') }, '新手草原'),
        ]),
      ]),
      h('div', { class: 'section-title' }, '副本（原本的地區）'),
    ];
    for (const id of DUNGEON_ORDER) {
      const z = ZONES[id];
      const dg = z.dungeon!;
      const unlocked = isZoneUnlocked(s, id);
      const cleared = s.bossesDefeated.includes(id);
      let action: HTMLElement;
      if (here === id) action = h('span', { class: 'pill' }, '目前位置');
      else if (!unlocked) action = h('span', { class: 'pill locked' }, '🔒 未解鎖');
      else action = h('button', { class: 'go', onclick: () => this.travel(id) }, '前往');
      out.push(
        h('div', { class: `card dungeon${unlocked ? '' : ' locked'}` }, [
          h('div', { class: 'card-main' }, [
            h('h4', {}, `第${'一二三四五'[dg.floor - 1]}層・${z.name}`),
            h('p', {}, `建議等級 Lv.${z.levelRange?.[0] ?? 1}　首領：${dg.bossName}${cleared ? '（已擊敗）' : ''}`),
            h('p', {}, `裝備掉落第 ${dg.floor} 階　敵人防禦 ${dg.enemyDefense}`),
          ]),
          action,
        ]),
      );
    }
    return out;
  }

  private renderSettings(): HTMLElement[] {
    const s = this.state.settings;
    const zoomVal = h('b', {}, `${Math.round(s.zoom * 100)}%`);
    const slider = h('input', { type: 'range', min: 80, max: 150, step: 10, value: Math.round(s.zoom * 100) });
    slider.addEventListener('input', () => {
      this.actions.onZoomSet(Number(slider.value) / 100);
      zoomVal.textContent = `${slider.value}%`;
    });
    const vol = (kind: 'music' | 'sfx', label: string, value: number) => {
      const out = h('b', {}, `${Math.round(value * 100)}%`);
      const sl = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(value * 100), id: `vol-${kind}` });
      sl.addEventListener('input', () => {
        this.actions.onVolume(kind, Number(sl.value) / 100);
        out.textContent = `${sl.value}%`;
      });
      return h('div', { class: 'card' }, [h('label', { class: 'set-row', for: `vol-${kind}` }, [h('span', {}, label), out]), sl]);
    };
    const fps = h('input', { type: 'checkbox' });
    fps.checked = s.showFps;
    fps.addEventListener('change', () => this.actions.onToggleFps(fps.checked));

    return [
      h('div', { class: 'card' }, [h('label', { class: 'set-row' }, [h('span', {}, '鏡頭縮放'), zoomVal]), slider]),
      vol('music', '音樂音量', s.musicVolume),
      vol('sfx', '音效音量', s.sfxVolume),
      h('div', { class: 'card' }, [h('label', { class: 'set-row' }, [h('span', {}, '顯示 FPS'), fps])]),
      h('div', { class: 'section-title' }, '開發工具'),
      this.renderPenTester(),
      h('div', { class: 'card' }, [
        h('p', {}, '這些按鈕方便測試，正式版會移除。'),
        h('div', { class: 'card-row' }, [
          h('button', { class: 'go ghost', onclick: () => { this.actions.onUnlockAll(); this.show('map'); } }, '解鎖全部副本'),
          h('button', { class: 'go danger', onclick: () => this.actions.onResetSave() }, '重置存檔'),
        ]),
      ]),
      h('p', { class: 'version' }, `小法師 v${__APP_VERSION__}・Wei Studio`),
    ];
  }

  /** 穿透測試：切換後到新手草原打三根不同防禦的木樁比較傷害 */
  private renderPenTester(): HTMLElement {
    const stats = h('p', {}, this.actions.getStatsText());
    const row = h('div', { class: 'card-row' });
    for (const pct of [0, 30, 60, 100]) {
      row.appendChild(
        h('button', {
          class: 'go ghost',
          onclick: () => {
            this.actions.onSetPen(pct / 100);
            stats.textContent = this.actions.getStatsText();
          },
        }, `穿透 ${pct}%`),
      );
    }
    return h('div', { class: 'card' }, [h('h4', {}, '傷害測試'), stats, row]);
  }

  private travel(id: (typeof DUNGEON_ORDER)[number] | 'town' | 'grassland') {
    this.close();
    bus.emit('zone:request', { zoneId: id });
  }
}
