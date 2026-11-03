import { bus, type MenuTab } from '@/core/EventBus';
import { isZoneUnlocked, type GameState } from '@/core/GameState';
import { DUNGEON_ORDER, FIELD_ORDER, WORLD_FIELDS, ZONES, bossOf, lootTierOf, zoneLabel, zoneName } from '@/data/zones';
import type { ZoneId } from '@/data/types';
import { h } from './dom';
import { renderEnhance, renderEquip, renderShop, type InvContext } from './InventoryTabs';
import { BONUS_GEMS, canClaim, ensureToday, questText } from '@/systems/DailyQuests';
import { rollDrop } from '@/systems/LootTable';
import { addItem, itemName } from '@/systems/Inventory';
import { renderCloudCard, renderLeaderboard, type CloudContext } from './CloudTabs';
import type { Cloud } from '@/net/Cloud';
import type { SlotInfo } from '@/core/SaveSystem';
import { CLASSES } from '@/data/classes';
import { renderGuide } from './GuideTab';
import { restartTutorial } from '@/systems/Tutorial';

/** 開發模式或網址帶 ?debug 才顯示開發工具 */
const DEV = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

const TABS: { id: MenuTab; label: string }[] = [
  { id: 'equip', label: '裝備' },
  { id: 'enhance', label: '強化' },
  { id: 'shop', label: '商城' },
  { id: 'quests', label: '任務' },
  { id: 'guide', label: '指引' },
  { id: 'rank', label: '排行' },
  { id: 'map', label: '地圖' },
  { id: 'saves', label: '存檔' },
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
  onUseConsumable(id: string): void;
  onVolume(kind: 'music' | 'sfx', v: number): void;
  /** 回傳目前實際畫質（高 / 中 / 低） */
  onQuality(q: 'auto' | 'high' | 'medium' | 'low'): string;
  getQualityLabel(): string;
  /** 目前播放的背景音樂名稱 */
  getNowPlaying(): string;
  cloud: Cloud;
  applyCloudSave(data: GameState): void;
  /** 多存檔欄位 */
  saves: {
    active(): number;
    list(): SlotInfo[];
    /** 存到第 n 格（目前欄位 = 立即存檔；其他欄位 = 複製一份過去） */
    saveTo(n: number): boolean;
    /** 切換到第 n 格（重新載入頁面） */
    load(n: number): void;
    /** 在空的第 n 格開新遊戲（重新載入、選職業） */
    newGame(n: number): void;
    remove(n: number): void;
    /** 存檔後回到開頭畫面 */
    toTitle(): void;
  };
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
    bus.on('tutorial:changed', () => this.isOpen && this.tab === 'guide' && this.show('guide'));
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
    if (tab === 'saves') return this.renderSaves();
    if (tab === 'guide')
      return renderGuide({
        state: this.state,
        setHidden: (v) => {
          this.state.tutorial.hidden = v;
          bus.emit('tutorial:changed');
          bus.emit('save:request');
        },
        restart: () => {
          restartTutorial(this.state.tutorial);
          bus.emit('tutorial:changed');
          bus.emit('save:request');
          bus.emit('toast', { text: '新手指引重新開始（已領過的獎勵不會重複發放）' });
        },
        rerender: () => {
          const top = this.body.scrollTop;
          this.show('guide');
          this.body.scrollTop = top;
        },
      });
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
      useConsumable: (id) => this.actions.onUseConsumable(id),
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
        h('h3', {}, '赫拉斯大陸・雅典與野外'),
        h('p', {}, fieldList),
        // 城鎮與野外：由關卡登記表產生；有進入等級的未達到時鎖住
        h(
          'div',
          { class: 'card-row' },
          FIELD_ORDER.map((id) => {
            const z = ZONES[id];
            if (here === id) return h('span', { class: 'pill' }, '目前位置');
            if (z.minLevel && s.level < z.minLevel) return h('span', { class: 'pill locked' }, `🔒 ${zoneName(id)} Lv.${z.minLevel}`);
            return h('button', { class: id === 'town' ? 'go' : 'go ghost', onclick: () => this.travel(id) }, id === 'town' ? '回到主城' : zoneName(id));
          }),
        ),
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
            h('h4', {}, zoneLabel(id)),
            h('p', {}, `建議等級 Lv.${z.levelRange?.[0] ?? 1}　首領：${bossOf(id)?.name ?? '—'}${cleared ? '（已擊敗）' : ''}`),
            h('p', {}, `裝備掉落第 ${lootTierOf(id)} 階　敵人防禦 ${dg.enemyDefense}`),
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
    // 介面：左手模式、介面大小
    const lefty = h('input', { type: 'checkbox' });
    lefty.checked = !!s.leftHanded;
    lefty.addEventListener('change', () => {
      s.leftHanded = lefty.checked;
      bus.emit('settings:changed');
      bus.emit('save:request');
    });
    const vib = h('input', { type: 'checkbox' });
    vib.checked = s.vibration !== false;
    vib.addEventListener('change', () => {
      s.vibration = vib.checked;
      if (vib.checked) navigator.vibrate?.(30);
      bus.emit('save:request');
    });
    const scales = [0.9, 1, 1.1, 1.2];
    const scaleRow = h(
      'div',
      { class: 'seg' },
      scales.map((v) =>
        h('button', {
          class: `seg-btn${Math.abs((s.uiScale || 1) - v) < 0.01 ? ' on' : ''}`,
          onclick: () => {
            s.uiScale = v;
            bus.emit('settings:changed');
            bus.emit('save:request');
            this.show('settings');
          },
        }, `${Math.round(v * 100)}%`),
      ),
    );
    const fps = h('input', { type: 'checkbox' });
    fps.checked = s.showFps;
    fps.addEventListener('change', () => this.actions.onToggleFps(fps.checked));

    return [
      h('div', { class: 'card' }, [
        h('label', { class: 'set-row' }, [h('span', {}, '鏡頭縮放'), zoomVal]),
        slider,
        h('p', {}, '遊戲中也可以用兩根手指開合（電腦：滑鼠滾輪）調整遠近。'),
      ]),
      h('div', { class: 'card' }, [
        h('label', { class: 'set-row' }, [h('span', {}, '左手模式'), lefty]),
        h('p', {}, '搖桿換到右邊、技能換到左邊。'),
        h('div', { class: 'set-row' }, [h('span', {}, '介面大小')]),
        scaleRow,
        h('label', { class: 'set-row' }, [h('span', {}, '震動回饋'), vib]),
        h('p', {}, '被重擊、首領放大招、升級時手機會輕震（iPhone 的瀏覽器不支援）。'),
      ]),
      renderCloudCard(this.cloudCtx()),
      this.renderQuality(),
      vol('music', '音樂音量', s.musicVolume),
      h('p', { class: 'version now-playing' }, `♪ 正在播放：${this.actions.getNowPlaying()}`),
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
      h('p', { class: 'version' }, `戰鬥法師 v${__APP_VERSION__}・Wei Studio`),
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
                    const drop = rollDrop(tier, true, Math.random, s.heroClass);
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

  /* ======================= 存檔 ======================= */

  private renderSaves(): HTMLElement[] {
    const sv = this.actions.saves;
    const active = sv.active();
    const rerender = () => {
      const top = this.body.scrollTop;
      this.show('saves');
      this.body.scrollTop = top;
    };
    const toast = (text: string) => bus.emit('toast', { text });
    const out: HTMLElement[] = [
      h('div', { class: 'card' }, [
        h('h4', {}, '💾 存檔'),
        h('p', {}, `共 ${sv.list().length} 格。遊戲每 10 秒、換地圖、撿裝備時自動存到「使用中」的那一格；也可以把目前進度另存到其他格當備份，或在空格開一個新角色。`),
      ]),
    ];
    for (const info of sv.list()) {
      const n = info.slot;
      const isActive = n === active;
      const title = h('div', { class: 'slot-head' }, [
        h('b', {}, `存檔 ${n}`),
        isActive ? h('span', { class: 'pill on' }, '使用中') : info.empty ? h('span', { class: 'pill locked' }, '空') : h('span', {}, ''),
      ]);
      const body: HTMLElement[] = [title];
      if (info.corrupt) body.push(h('p', { class: 'cloud-status bad' }, '這格存檔已損壞，無法讀取。'));
      else if (!info.empty) {
        const cls = CLASSES[info.heroClass ?? 'mage'];
        const mins = Math.floor((info.playTime ?? 0) / 60);
        body.push(
          h('div', { class: 'slot-main' }, [
            h('span', { class: 'slot-ico' }, cls.icon),
            h('div', {}, [
              h('div', { class: 'slot-name' }, `${info.playerName ?? cls.name}・${cls.name} Lv.${info.level}`),
              h('p', {}, `${zoneLabel(info.zoneId)}・首領 ${info.bosses ?? 0}/${DUNGEON_ORDER.length}・遊戲 ${Math.floor(mins / 60)} 小時 ${mins % 60} 分`),
              h('p', {}, info.updatedAt ? `最後存檔 ${new Date(info.updatedAt).toLocaleString('zh-TW', { hour12: false })}` : ''),
            ]),
          ]),
        );
      }
      const row = h('div', { class: 'card-row' });
      if (isActive) {
        row.append(h('button', { class: 'go small', onclick: () => { sv.saveTo(n); toast(`已存到存檔 ${n}`); rerender(); } }, '立即存檔'));
      } else if (info.empty) {
        row.append(
          h('button', { class: 'go ghost small', onclick: () => { if (sv.saveTo(n)) toast(`目前進度已另存到存檔 ${n}`); else toast('存檔失敗（瀏覽器可能封鎖了儲存空間）'); rerender(); } }, '把目前進度存到這格'),
          h('button', { class: 'go ghost small', onclick: () => sv.newGame(n) }, '在這格開新遊戲'),
        );
      } else {
        row.append(
          info.corrupt ? h('span', {}, '') : this.confirmBtn('讀取', '再按一次切換到這格', 'go small', () => sv.load(n)),
          this.confirmBtn('覆蓋存到這格', '再按一次覆蓋', 'go ghost small', () => { if (sv.saveTo(n)) toast(`目前進度已覆蓋存檔 ${n}`); rerender(); }),
          this.confirmBtn('刪除', '再按一次刪除', 'go danger small', () => { sv.remove(n); toast(`已刪除存檔 ${n}`); rerender(); }),
        );
      }
      body.push(row);
      out.push(h('div', { class: `card slot${isActive ? ' active' : ''}`, 'data-slot': n }, body));
    }
    out.push(h('div', { class: 'card-row' }, [h('button', { class: 'go ghost', onclick: () => sv.toTitle() }, '存檔並回到開頭畫面')]));
    out.push(h('p', { class: 'version' }, '存檔存在這台裝置的瀏覽器裡。換裝置請用「設定 → 雲端存檔」（上傳的是使用中的那一格）。'));
    return out;
  }

  /** 需要按兩次的按鈕（artifact 環境不能用 confirm()） */
  private confirmBtn(label: string, armedLabel: string, cls: string, run: () => void): HTMLElement {
    const btn = h('button', { class: cls }, label);
    let armed = false;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = armedLabel;
        setTimeout(() => {
          armed = false;
          btn.textContent = label;
        }, 3000);
        return;
      }
      run();
    });
    return btn;
  }

  /** 重置存檔：按兩次確認（artifact 環境不能用 confirm()） */
  private renderReset(): HTMLElement {
    const btn = h('button', { class: 'go danger' }, `重置存檔 ${this.actions.saves.active()}`);
    let armed = false;
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = '再按一次確認刪除進度';
        setTimeout(() => {
          armed = false;
          btn.textContent = `重置存檔 ${this.actions.saves.active()}`;
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

  /** 穿透測試：切換後到阿卡迪亞草原打三根不同防禦的木樁比較傷害 */
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

  private travel(id: ZoneId) {
    this.close();
    bus.emit('zone:request', { zoneId: id });
  }
}
