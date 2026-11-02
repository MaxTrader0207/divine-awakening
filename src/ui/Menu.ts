import { bus, type MenuTab } from '@/core/EventBus';
import { isZoneUnlocked, type GameState } from '@/core/GameState';
import { DUNGEON_ORDER, WORLD_FIELDS, ZONES } from '@/data/zones';
import { h } from './dom';
import { renderEnhance, renderEquip, renderShop, type InvContext } from './InventoryTabs';
import { BONUS_GEMS, canClaim, ensureToday, questText } from '@/systems/DailyQuests';
import { rollDrop } from '@/systems/LootTable';
import { addItem, itemName } from '@/systems/Inventory';
import { renderCloudCard, renderLeaderboard, type CloudContext } from './CloudTabs';
import type { Cloud } from '@/net/Cloud';

/** 開發模式或網址帶 ?debug 才顯示開發工具 */
const DEV = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'equip', label: '裝備' },
  { id: 'enhance', label: '強化' },
  { id: 'shop', label: '商城' },
  { id: 'quests', label: '任務' },
  { id: 'rank', label: '排行' },
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
  /** 回傳目前實際畫質（高 / 中 / 低） */
  onQuality(q: 'auto' | 'high' | 'medium' | 'low'): string;
  getQualityLabel(): string;
  cloud: Cloud;
  applyCloudSave(data: GameState): void;
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
    if (tab === 'quests') return this.renderQuests();
    if (tab === 'rank') return renderLeaderboard(this.cloudCtx());
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
    if (this.isOpen && this.tab !== 'settings' && this.tab !== 'map') this.show(this.tab);
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
          here === 'mistwood'
            ? h('span', { class: 'pill' }, '目前位置')
            : s.level < (ZONES.mistwood.minLevel ?? 0)
              ? h('span', { class: 'pill locked' }, `🔒 迷霧森林 Lv.${ZONES.mistwood.minLevel}`)
              : h('button', { class: 'go ghost', onclick: () => this.travel('mistwood') }, '迷霧森林'),
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
      renderCloudCard(this.cloudCtx()),
      this.renderQuality(),
      vol('music', '音樂音量', s.musicVolume),
      vol('sfx', '音效音量', s.sfxVolume),
      h('div', { class: 'card' }, [h('label', { class: 'set-row' }, [h('span', {}, '顯示 FPS'), fps])]),
      ...(DEV
        ? [
            h('div', { class: 'section-title' }, '開發工具（?debug）'),
            this.renderPenTester(),
            h('div', { class: 'card' }, [
              h('div', { class: 'card-row' }, [h('button', { class: 'go ghost', onclick: () => { this.actions.onUnlockAll(); this.show('map'); } }, '解鎖全部副本')]),
            ]),
          ]
        : []),
      this.renderReset(),
      h('p', { class: 'version' }, `小法師 v${__APP_VERSION__}・Wei Studio`),
    ];
  }

  private cloudCtx(): CloudContext {
    return {
      cloud: this.actions.cloud,
      state: this.state,
      applyCloudSave: (d) => this.actions.applyCloudSave(d),
      rerender: () => {
        const top = this.body.scrollTop;
        this.show(this.tab);
        this.body.scrollTop = top;
      },
    };
  }

  private renderQuality(): HTMLElement {
    const opts: ['auto' | 'high' | 'medium' | 'low', string][] = [['auto', '自動'], ['high', '高'], ['medium', '中'], ['low', '低']];
    const now = h('b', {}, `目前：${this.actions.getQualityLabel()}`);
    const row = h('div', { class: 'seg' });
    const draw = () => {
      row.replaceChildren(
        ...opts.map(([v, label]) =>
          h('button', {
            class: `seg-btn${this.state.settings.quality === v ? ' on' : ''}`,
            onclick: () => {
              now.textContent = `目前：${this.actions.onQuality(v)}`;
              draw();
            },
          }, label),
        ),
      );
    };
    draw();
    return h('div', { class: 'card' }, [
      h('div', { class: 'set-row' }, [h('span', {}, '畫質'), now]),
      row,
      h('p', {}, '自動：畫面不順時自動降低解析度與陰影。手機發燙或耗電時可選「低」。'),
    ]);
  }

  private renderQuests(): HTMLElement[] {
    const s = this.state;
    ensureToday(s);
    const d = s.daily!;
    const out: HTMLElement[] = [h('div', { class: 'card' }, [h('h4', {}, `每日任務・${d.date}`), h('p', {}, '每天 00:00（你的時區）重置。完成後在這裡領獎，三個都領完還有獎勵寶箱。')])];
    d.quests.forEach((q) => {
      const pct = Math.min(100, (q.progress / q.target) * 100);
      const btn = q.claimed
        ? h('span', { class: 'pill' }, '已領取')
        : canClaim(q)
          ? h('button', {
              class: 'go small',
              onclick: () => {
                q.claimed = true;
                s.gold += q.reward.gold;
                s.gems += q.reward.gems;
                bus.emit('toast', { text: `領取 ${q.reward.gold} 金幣、${q.reward.gems} 鑽石` });
                this.actions.onInventoryChanged();
                bus.emit('quests:changed');
                this.show('quests');
              },
            }, '領取')
          : h('span', { class: 'pill locked' }, '進行中');
      out.push(
        h('div', { class: `card quest${q.claimed ? ' done' : ''}` }, [
          h('div', { class: 'quest-head' }, [h('b', {}, questText(q)), h('small', {}, `${q.reward.gold} 金・${q.reward.gems}💎`)]),
          h('div', { class: 'quest-bar' }, [h('i', { style: `width:${pct}%` })]),
          h('div', { class: 'quest-row' }, [h('span', {}, `${Math.floor(q.progress)} / ${q.target}`), btn]),
        ]),
      );
    });
    const allClaimed = d.quests.every((q) => q.claimed);
    out.push(
      h('div', { class: `card quest${d.bonusClaimed ? ' done' : ''}` }, [
        h('div', { class: 'quest-head' }, [h('b', {}, '🎁 每日獎勵寶箱'), h('small', {}, `${BONUS_GEMS}💎 + 精良以上裝備`)]),
        h('div', { class: 'quest-row' }, [
          h('span', {}, allClaimed ? '三個任務都完成了！' : '領完三個任務的獎勵後開啟'),
          d.bonusClaimed
            ? h('span', { class: 'pill' }, '已領取')
            : allClaimed
              ? h('button', {
                  class: 'go small',
                  onclick: () => {
                    const tier = Math.max(1, Math.min(4, Math.ceil(s.level / 6)));
                    const drop = rollDrop(tier, true);
                    const it = drop ? addItem(s, drop.base, drop.rarity) : null;
                    if (!it && drop) return bus.emit('toast', { text: '背包已滿，先清出空間再領取' });
                    d.bonusClaimed = true;
                    s.gems += BONUS_GEMS;
                    bus.emit('toast', { text: it ? `獲得 ${BONUS_GEMS} 鑽石與 ${itemName(it)}` : `獲得 ${BONUS_GEMS} 鑽石` });
                    this.actions.onInventoryChanged();
                    bus.emit('quests:changed');
                    this.show('quests');
                  },
                }, '開啟')
              : h('span', { class: 'pill locked' }, '未完成'),
        ]),
      ]),
    );
    return out;
  }

  /** 重置存檔：按兩次確認（artifact 環境不能用 confirm()） */
  private renderReset(): HTMLElement {
    const btn = h('button', { class: 'go danger' }, '重置存檔');
    let armed = false;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = '再按一次確認刪除進度';
        setTimeout(() => {
          armed = false;
          btn.textContent = '重置存檔';
        }, 3000);
        return;
      }
      this.actions.onResetSave();
    });
    const st = this.state.stats;
    const mins = Math.floor(st.playTime / 60);
    return h('div', { class: 'card' }, [
      h('p', {}, `遊戲時間 ${Math.floor(mins / 60)} 小時 ${mins % 60} 分・擊倒 ${st.kills}・倒下 ${st.deaths}`),
      h('div', { class: 'card-row' }, [btn]),
    ]);
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

  private travel(id: (typeof DUNGEON_ORDER)[number] | 'town' | 'grassland' | 'mistwood') {
    this.close();
    bus.emit('zone:request', { zoneId: id });
  }
}
