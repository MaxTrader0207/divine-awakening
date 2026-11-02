import { bus, type MenuTab } from '@/core/EventBus';
import { isZoneUnlocked, type GameState } from '@/core/GameState';
import { DUNGEON_ORDER, WORLD_FIELDS, ZONES } from '@/data/zones';
import { h } from './dom';

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'equip', label: '裝備' },
  { id: 'enhance', label: '強化' },
  { id: 'shop', label: '商城' },
  { id: 'map', label: '地圖' },
  { id: 'settings', label: '設定' },
];

/** 尚未實作的分頁：顯示預計週次，方便追蹤進度 */
const PLANNED: Partial<Record<MenuTab, string>> = {
  equip: '裝備欄（6 格）、背包、稀有度 —— 預計第 6 週實作',
  enhance: '裝備強化（成功率 / 消耗）—— 預計第 7 週實作',
  shop: '金幣商店、藥水補給 —— 預計第 7 週實作',
};

export interface MenuActions {
  onResetSave(): void;
  onUnlockAll(): void;
  onZoomSet(z: number): void;
  onToggleFps(v: boolean): void;
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
    return [h('div', { class: 'placeholder' }, [h('div', { class: 'ph-icon' }, '🛠'), h('p', {}, PLANNED[tab] ?? '')])];
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
    const fps = h('input', { type: 'checkbox' });
    fps.checked = s.showFps;
    fps.addEventListener('change', () => this.actions.onToggleFps(fps.checked));

    return [
      h('div', { class: 'card' }, [h('label', { class: 'set-row' }, [h('span', {}, '鏡頭縮放'), zoomVal]), slider]),
      h('div', { class: 'card' }, [h('label', { class: 'set-row' }, [h('span', {}, '顯示 FPS'), fps])]),
      h('div', { class: 'section-title' }, '開發工具'),
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

  private travel(id: (typeof DUNGEON_ORDER)[number] | 'town' | 'grassland') {
    this.close();
    bus.emit('zone:request', { zoneId: id });
  }
}
