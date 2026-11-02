import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ZoneDef } from '@/data/types';
import { MAGE_SKILLS, expToNext } from '@/data/player';
import type { Player } from '@/entities/Player';
import type { InputManager, ActionKey } from '@/input/InputManager';
import type { SkillSlot } from '@/data/types';
import type { SkillSystem } from '@/systems/SkillSystem';
import { Minimap } from './Minimap';
import { RARITY } from '@/data/items';
import { h } from './dom';

/**
 * HUD：對應影片的版面
 *  左上：頭像（HP/MP 雙色球 + 等級）、名稱・區域、HP/MP/EXP 條、副標
 *  右上：縮放 ± 、小地圖、金幣/鑽石、裝備/選單按鈕
 *  中上：提示橫幅（輪播 tips）；中央：進入區域大字
 *  左下：藥水 1/2；搖桿（InputManager 建立）
 *  右下：AUTO、技能 Q/W/E/R、普攻
 */
export class Hud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  readonly minimap: Minimap;
  private tips: string[] = [];
  private tipIndex = 0;
  private tipTimer = 0;
  private bannerTimer = 0;
  private fpsAcc = { frames: 0, time: 0 };
  private skillBtns = new Map<SkillSlot, { btn: HTMLElement; cd: HTMLElement; num: HTMLElement }>();
  private potionCds: HTMLElement[] = [];
  private hudTimer = 0;

  constructor(uiRoot: HTMLElement, private state: GameState, private player: Player, private input: InputManager, private skills: SkillSystem) {
    this.root = h('div', { class: 'hud' });
    uiRoot.appendChild(this.root);

    // ---- 左上狀態框 ----
    const status = h('div', { class: 'status-card' }, [
      h('div', { class: 'orb' }, [h('div', { class: 'orb-hp' }), h('div', { class: 'orb-mp' }), (this.els.lv = h('div', { class: 'orb-lv' }))]),
      h('div', { class: 'status-body' }, [
        (this.els.title = h('div', { class: 'status-title' })),
        h('div', { class: 'bar hp' }, [(this.els.hpFill = h('i')), (this.els.hpText = h('span'))]),
        h('div', { class: 'bar mp' }, [(this.els.mpFill = h('i')), (this.els.mpText = h('span'))]),
        h('div', { class: 'bar exp' }, [(this.els.expFill = h('i'))]),
        (this.els.subtitle = h('div', { class: 'status-sub' })),
      ]),
    ]);
    this.root.appendChild(status);

    // ---- 右上：縮放 + 小地圖 + 貨幣 + 按鈕 ----
    const zoomCol = h('div', { class: 'zoom-col' }, [
      h('button', { class: 'zoom-btn', onclick: () => bus.emit('camera:zoom', { delta: 0.1 }) }, '+'),
      (this.els.zoomText = h('div', { class: 'zoom-text' })),
      h('button', { class: 'zoom-btn', onclick: () => bus.emit('camera:zoom', { delta: -0.1 }) }, '−'),
    ]);
    const mapBox = h('div', { class: 'minimap-box', onclick: () => bus.emit('menu:open', { tab: 'map' }) });
    this.minimap = new Minimap(mapBox);
    const topRight = h('div', { class: 'top-right' }, [
      h('div', { class: 'tr-row' }, [zoomCol, mapBox]),
      h('div', { class: 'wallet' }, [h('span', { class: 'coin' }), (this.els.gold = h('b')), h('span', { class: 'gem' }), (this.els.gems = h('b'))]),
      h('div', { class: 'tr-btns' }, [
        h('button', { class: 'icon-btn', onclick: () => bus.emit('menu:open', { tab: 'equip' }) }, [h('span', {}, '🎒'), h('small', {}, '裝備')]),
        h('button', { class: 'icon-btn', onclick: () => bus.emit('menu:open', {}) }, [h('span', {}, '☰'), h('small', {}, '選單')]),
      ]),
    ]);
    this.root.appendChild(topRight);

    // ---- 提示與橫幅 ----
    this.root.appendChild((this.els.tip = h('div', { class: 'tip' })));
    this.root.appendChild((this.els.banner = h('div', { class: 'zone-banner' })));
    this.root.appendChild((this.els.toast = h('div', { class: 'toast' })));
    this.root.appendChild((this.els.fps = h('div', { class: 'fps' })));
    this.root.appendChild((this.els.hurt = h('div', { class: 'hurt-vignette' })));
    this.root.appendChild((this.els.feed = h('div', { class: 'loot-feed' })));
    this.root.appendChild(
      (this.els.boss = h('div', { class: 'boss-bar' }, [
        (this.els.bossName = h('b')),
        h('div', { class: 'boss-track' }, [(this.els.bossFill = h('i')), (this.els.bossHp = h('span'))]),
      ])),
    );

    // ---- 左下藥水 ----
    const potions = h('div', { class: 'potions' }, [
      this.actionButton('potion red', 'potionHp', '1', (this.els.potHp = h('em'))),
      this.actionButton('potion blue', 'potionMp', '2', (this.els.potMp = h('em'))),
    ]);
    potions.querySelectorAll('.act').forEach((b) => {
      const cd = h('div', { class: 'cd' });
      b.appendChild(cd);
      this.potionCds.push(cd);
    });
    this.root.appendChild(potions);

    // ---- 右下技能 ----
    const skillArea = h('div', { class: 'skills' });
    skillArea.appendChild((this.els.auto = h('button', { class: 'auto-btn', onclick: () => this.input.trigger('auto') }, [h('b', {}, 'AUTO'), h('small', {}, '自動戰鬥')])));
    for (const sk of MAGE_SKILLS) {
      const btn = this.actionButton(`skill slot-${sk.slot}`, sk.slot as ActionKey, sk.slot === 'basic' ? '' : sk.slot);
      btn.querySelector('.ico')!.textContent = sk.icon;
      if (sk.slot === 'basic') btn.appendChild(h('small', { class: 'basic-label' }, '普攻'));
      btn.title = sk.name;
      const cd = h('div', { class: 'cd' });
      const num = h('b', { class: 'cd-num' });
      btn.append(cd, num);
      this.skillBtns.set(sk.slot, { btn, cd, num });
      skillArea.appendChild(btn);
    }
    this.root.appendChild(skillArea);

    bus.on('toast', ({ text, duration }) => this.toast(text, duration));
    bus.on('banner', ({ text }) => this.banner(text));
    bus.on('player:changed', () => this.refresh());
    bus.on('loot:picked', ({ name, rarity }) => {
      const line = h('div', { class: 'feed-line', style: `--rc:${RARITY[rarity as keyof typeof RARITY].color}` }, [h('span', {}, '獲得 '), h('b', {}, name)]);
      this.els.feed.prepend(line);
      while (this.els.feed.children.length > 3) this.els.feed.lastElementChild!.remove();
      setTimeout(() => line.classList.add('out'), 3200);
      setTimeout(() => line.remove(), 3700);
    });
    bus.on('combat:hit', (e) => {
      if (!e.targetIsPlayer) return;
      const v = this.els.hurt;
      v.classList.remove('on');
      void v.offsetWidth;
      v.classList.add('on');
    });
    bus.on('wallet:changed', () => this.refresh());
  }

  private actionButton(cls: string, action: ActionKey, key: string, extra?: HTMLElement): HTMLElement {
    const btn = h('button', { class: `act ${cls}` }, [h('span', { class: 'ico' }), key ? h('i', { class: 'key' }, key) : null, extra ?? null]);
    // pointerdown 比 click 反應快，手機上手感較好
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      this.input.setHeld(action, true);
      btn.classList.add('pressed');
    });
    const release = () => {
      this.input.setHeld(action, false);
      btn.classList.remove('pressed');
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    return btn;
  }

  private bossShown: unknown = null;

  /** 戰鬥中的首領血條（畫面上方） */
  setBoss(e: { def: { name: string; stats: { maxHp: number } }; hp: number; hpRatioEnraged?: boolean } | null) {
    if (!e) {
      if (this.bossShown) {
        this.els.boss.classList.remove('show');
        this.bossShown = null;
      }
      return;
    }
    if (this.bossShown !== e) {
      this.bossShown = e;
      this.els.bossName.textContent = e.def.name;
      this.els.boss.classList.add('show');
    }
    const r = e.hp / e.def.stats.maxHp;
    this.els.bossFill.style.width = `${r * 100}%`;
    this.els.bossHp.textContent = `${Math.ceil(e.hp)} / ${e.def.stats.maxHp}`;
    this.els.boss.classList.toggle('enraged', r < 0.5);
  }

  setAuto(on: boolean) {
    this.els.auto.classList.toggle('on', on);
    this.els.auto.querySelector('small')!.textContent = on ? '戰鬥中…' : '自動戰鬥';
  }

  setZone(def: ZoneDef) {
    this.minimap.setZone(def);
    this.tips = def.tips;
    this.tipIndex = 0;
    this.tipTimer = 0;
    this.showTip();
    this.refresh();
  }

  private showTip() {
    if (!this.tips.length) {
      this.els.tip.classList.remove('show');
      return;
    }
    this.els.tip.textContent = this.tips[this.tipIndex % this.tips.length];
    this.els.tip.classList.add('show');
  }

  toast(text: string, duration = 1.8) {
    const t = this.els.toast;
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    t.style.animationDuration = `${duration}s`;
  }

  banner(text: string) {
    this.els.banner.textContent = text;
    this.els.banner.classList.add('show');
    this.bannerTimer = 2.4;
  }

  private updateCooldowns() {
    for (const [slot, ui] of this.skillBtns) {
      const r = this.skills.cooldownRatio(slot);
      const rem = this.skills.remaining(slot);
      ui.cd.style.setProperty('--p', String(r));
      ui.cd.style.opacity = r > 0 ? '1' : '0';
      ui.num.textContent = rem > 0.05 && slot !== 'basic' ? (rem >= 1 ? String(Math.ceil(rem)) : rem.toFixed(1)) : '';
      ui.btn.classList.toggle('no-mp', this.player.mp < this.skills.def(slot).mpCost);
    }
    const pr = this.skills.potionCd / 2;
    for (const cd of this.potionCds) {
      cd.style.setProperty('--p', String(pr));
      cd.style.opacity = pr > 0 ? '1' : '0';
    }
  }

  private refreshBars() {
    const p = this.player;
    this.els.hpFill.style.width = `${(p.hp / p.stats.maxHp) * 100}%`;
    this.els.hpText.textContent = `${Math.round(p.hp)}/${p.stats.maxHp}`;
    this.els.mpFill.style.width = `${(p.mp / p.stats.maxMp) * 100}%`;
    this.els.mpText.textContent = `${Math.round(p.mp)}/${p.stats.maxMp}`;
  }

  /** 數值變動時呼叫（不必每幀） */
  refresh() {
    const s = this.state;
    const p = this.player;
    const zone = this.currentZone;
    this.els.lv.textContent = `Lv.${s.level}`;
    this.els.title.textContent = `${s.playerName}・${zone?.region ?? ''}`;
    this.els.subtitle.textContent = zone?.subtitle ?? '';
    this.els.hpFill.style.width = `${(p.hp / p.stats.maxHp) * 100}%`;
    this.els.hpText.textContent = `${Math.round(p.hp)}/${p.stats.maxHp}`;
    this.els.mpFill.style.width = `${(p.mp / p.stats.maxMp) * 100}%`;
    this.els.mpText.textContent = `${Math.round(p.mp)}/${p.stats.maxMp}`;
    this.els.expFill.style.width = `${(s.exp / expToNext(s.level)) * 100}%`;
    this.els.gold.textContent = String(s.gold);
    this.els.gems.textContent = String(s.gems);
    this.els.potHp.textContent = String(s.potions.hp);
    this.els.potMp.textContent = String(s.potions.mp);
    this.els.zoomText.textContent = `${Math.round(s.settings.zoom * 100)}%`;
    this.els.fps.style.display = s.settings.showFps ? 'block' : 'none';
  }

  currentZone: ZoneDef | null = null;

  update(dt: number) {
    this.minimap.draw(this.player.pos.x, this.player.pos.z, this.player.facing);
    this.updateCooldowns();
    // HP/MP 條每 0.1 秒刷新一次（回魔、受傷是連續變化）
    this.hudTimer += dt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.refreshBars();
    }

    this.tipTimer += dt;
    if (this.tipTimer > 6 && this.tips.length > 1) {
      this.tipTimer = 0;
      this.tipIndex++;
      this.showTip();
    }
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.els.banner.classList.remove('show');
    }
    if (this.state.settings.showFps) {
      this.fpsAcc.frames++;
      this.fpsAcc.time += dt;
      if (this.fpsAcc.time >= 0.5) {
        this.els.fps.textContent = `${Math.round(this.fpsAcc.frames / this.fpsAcc.time)} FPS`;
        this.fpsAcc = { frames: 0, time: 0 };
      }
    }
  }
}
