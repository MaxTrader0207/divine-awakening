import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import type { ZoneDef } from '@/data/types';
import { expToNext } from '@/data/player';
import type { Player } from '@/entities/Player';
import type { InputManager, ActionKey } from '@/input/InputManager';
import type { SkillSlot } from '@/data/types';
import type { SkillSystem } from '@/systems/SkillSystem';
import { Minimap } from './Minimap';
import { RARITY } from '@/data/items';
import { claimableCount } from '@/systems/DailyQuests';
import { h } from './dom';
import { currentStep, progressText, targetFor } from '@/systems/Tutorial';
import { TUTORIAL_STEPS } from '@/data/tutorial';
import { SKILL_HELP } from '@/data/manual';
import { CLASSES } from '@/data/classes';

/** 職業頭像底色 */
const CLASS_TINT: Record<string, [string, string]> = {
  mage: ['#8f7aff', '#3a2a8a'],
  archer: ['#6fd36a', '#1f6a3a'],
  knight: ['#a9c4e8', '#3a5276'],
  berserker: ['#ff8a5a', '#8a2a1a'],
  summoner: ['#c38bff', '#4a1f6a'],
};

/**
 * HUD（v1.24 重新排版）
 * ------------------------------------------------------------
 *  左上欄（由上往下自然排列，不寫死高度）：狀態框（HP/MP 雙色球＋等級、HP/MP 條、經驗條＋百分比）
 *                                          → 增益圖示列（有才顯示）→ 新手指引（一行；首領戰時收起）
 *  右上：［暫停／選單］直排 ＋ 小地圖（底部顯示地區名）＋ 金幣寶石
 *  上方中央插槽：首領血條 或 提示（戰鬥中、首領戰時不輪播提示）—— 兩者不會同時出現
 *  通知：一般訊息在上方中央排隊（最多 2 則、不互相覆蓋、相同訊息合併 ×2）；
 *        獎勵訊息（撿寶、指引完成、任務完成、購買）在左側清單由下往上滑入。
 *  左下：藥水；搖桿是浮動式（InputManager / VirtualJoystick）
 *  右下：AUTO、技能 Q/W/E/R、普攻（長按顯示技能說明）
 *  左手模式：搖桿與技能左右對調。介面大小：各區塊依角落縮放。
 */
interface Note {
  el: HTMLElement;
  text: string;
  count: number;
  life: number;
}

export interface BuffInfo {
  icon: string;
  label: string;
  /** 剩餘秒數；undefined = 不顯示秒數（例如召喚物數量） */
  t?: number;
  kind?: 'good' | 'bad';
}

export class Hud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  readonly minimap: Minimap;
  private tips: string[] = [];
  private tipIndex = 0;
  private tipTimer = 0;
  private bannerTimer = 0;
  private fpsAcc = { frames: 0, time: 0 };
  private skillBtns = new Map<SkillSlot, { btn: HTMLElement; cd: HTMLElement; num: HTMLElement; wasCd: boolean }>();
  private potionCds: HTMLElement[] = [];
  private hudTimer = 0;
  private notes: Note[] = [];
  private noteQueue: { text: string; duration: number }[] = [];
  /** 戰鬥中（剛受傷或剛攻擊）：不輪播提示 */
  private combatT = 99;
  private bossOn = false;

  constructor(uiRoot: HTMLElement, private state: GameState, private player: Player, private input: InputManager, private skills: SkillSystem) {
    // 怒氣職業：MP 條與頭像右半改成橘紅色
    this.root = h('div', { class: `hud${skills.usesRage ? ' rage' : ''}` });
    uiRoot.appendChild(this.root);

    // ---- 左上欄 ----
    // 狀態框：職業頭像（外圈＝經驗值進度）＋名字・職業＋HP（含受傷殘影）＋MP / 怒氣。點一下開「裝備」
    const cls = CLASSES[state.heroClass];
    const [c1, c2] = CLASS_TINT[state.heroClass] ?? ['#8f7aff', '#3a2a8a'];
    const status = h('button', { class: 'status-card', 'aria-label': '角色與裝備', onclick: () => bus.emit('menu:open', { tab: 'equip' }) }, [
      (this.els.avatar = h('div', { class: 'avatar', style: `--c1:${c1};--c2:${c2}` }, [
        h('div', { class: 'avatar-face' }, cls.icon),
        (this.els.lv = h('div', { class: 'avatar-lv' })),
      ])),
      h('div', { class: 'status-body' }, [
        h('div', { class: 'status-head' }, [
          (this.els.title = h('b', { class: 'status-title' })),
          (this.els.expText = h('span', { class: 'exp-pct' })),
        ]),
        h('div', { class: 'bar hp' }, [h('em', { class: 'bar-tag' }, 'HP'), (this.els.hpTrail = h('u')), (this.els.hpFill = h('i')), (this.els.hpText = h('span'))]),
        h('div', { class: 'bar mp' }, [h('em', { class: 'bar-tag' }, skills.usesRage ? '怒' : 'MP'), (this.els.mpFill = h('i')), (this.els.mpText = h('span'))]),
      ]),
    ]);
    this.els.buffs = h('div', { class: 'buffs' });
    this.els.guide = h('button', { class: 'guide-card', onclick: () => bus.emit('menu:open', { tab: 'guide' }) }, [
      h('span', { class: 'guide-ico' }, '📜'),
      (this.els.guideNo = h('b', { class: 'guide-no' })),
      (this.els.guideText = h('span', { class: 'guide-text' })),
    ]);
    this.root.appendChild(h('div', { class: 'top-left' }, [status, this.els.buffs, this.els.guide]));

    // ---- 右上 ----
    const mapBox = h('div', { class: 'minimap-box', onclick: () => bus.emit('menu:open', { tab: 'map' }) });
    this.minimap = new Minimap(mapBox);
    mapBox.appendChild((this.els.zoneName = h('div', { class: 'map-caption' })));
    const topRight = h('div', { class: 'top-right' }, [
      h('div', { class: 'tr-row' }, [
        h('div', { class: 'tr-btns' }, [
          h('button', { class: 'icon-btn pause-btn', 'aria-label': '暫停', onclick: () => bus.emit('pause:toggle') }, [h('span', {}, '⏸'), h('small', {}, '暫停')]),
          h('button', { class: 'icon-btn', 'aria-label': '選單', onclick: () => bus.emit('menu:open', claimableCount(this.state.daily) ? { tab: 'quests' } : {}) }, [
            h('span', {}, '☰'),
            h('small', {}, '選單'),
            (this.els.badge = h('i', { class: 'badge' })),
          ]),
        ]),
        mapBox,
      ]),
      h('div', { class: 'wallet' }, [h('span', { class: 'coin' }), (this.els.gold = h('b')), h('span', { class: 'gem' }), (this.els.gems = h('b'))]),
    ]);
    this.root.appendChild(topRight);

    // ---- 上方中央插槽：首領血條 / 提示；下面是通知佇列 ----
    this.root.appendChild(
      (this.els.boss = h('div', { class: 'boss-bar' }, [
        (this.els.bossName = h('b')),
        h('div', { class: 'boss-track' }, [(this.els.bossFill = h('i')), h('em', { class: 'boss-mark' }), (this.els.bossHp = h('span'))]),
      ])),
    );
    this.root.appendChild((this.els.tip = h('div', { class: 'tip' })));
    this.root.appendChild((this.els.notes = h('div', { class: 'notes' })));
    this.root.appendChild((this.els.banner = h('div', { class: 'zone-banner' })));
    this.root.appendChild((this.els.fps = h('div', { class: 'fps' })));
    this.root.appendChild((this.els.hurt = h('div', { class: 'hurt-vignette' })));
    this.root.appendChild(h('div', { class: 'lowhp-vignette' }));
    this.root.appendChild((this.els.feed = h('div', { class: 'loot-feed' })));

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
    skillArea.appendChild(
      (this.els.auto = h('button', { class: 'auto-btn', onclick: () => this.input.trigger('auto') }, [h('i', { class: 'auto-ring' }), h('b', {}, 'AUTO'), h('small', {}, '自動戰鬥')])),
    );
    for (const sk of this.skills.list) {
      const btn = this.actionButton(`skill slot-${sk.slot}`, sk.slot as ActionKey, sk.slot === 'basic' ? '' : sk.slot);
      btn.querySelector('.ico')!.textContent = sk.icon;
      if (sk.slot === 'basic') btn.appendChild(h('small', { class: 'basic-label' }, '普攻'));
      btn.title = sk.name;
      btn.style.setProperty('--sc', `#${sk.color.toString(16).padStart(6, '0')}`); // 外框與底色帶一點技能顏色
      const cd = h('div', { class: 'cd' });
      const num = h('b', { class: 'cd-num' });
      btn.append(cd, num);
      this.skillBtns.set(sk.slot, { btn, cd, num, wasCd: false });
      skillArea.appendChild(btn);
      this.bindLongPress(btn, sk.slot);
    }
    skillArea.appendChild((this.els.skillTip = h('div', { class: 'skill-tip' })));
    this.root.appendChild(skillArea);

    bus.on('toast', ({ text, duration, kind }) => (kind === 'reward' ? this.feed(text, '#f4c64e') : this.toast(text, duration)));
    bus.on('banner', ({ text }) => this.banner(text));
    bus.on('player:changed', () => this.refresh());
    bus.on('quests:changed', () => this.refreshBadge());
    bus.on('loot:picked', ({ name, rarity }) => this.feed(name, RARITY[rarity as keyof typeof RARITY].color, '獲得 '));
    bus.on('combat:hit', (e) => {
      this.combatT = 0;
      if (!e.targetIsPlayer) return;
      const v = this.els.hurt;
      v.classList.remove('on');
      void v.offsetWidth;
      v.classList.add('on');
    });
    bus.on('skill:cast', () => (this.combatT = 0));
    bus.on('wallet:changed', () => this.refresh());
    bus.on('tutorial:changed', () => this.refreshGuide());
    bus.on('settings:changed', () => this.applyLayout());
    bus.on('player:levelup', () => {
      const a = this.els.avatar;
      a.classList.remove('lvup');
      void a.offsetWidth;
      a.classList.add('lvup');
    });
    this.applyLayout();
    this.refreshGuide();
  }

  /** 左手模式、介面大小 */
  applyLayout() {
    const s = this.state.settings;
    this.root.classList.toggle('lefty', !!s.leftHanded);
    document.documentElement.classList.toggle('lefty', !!s.leftHanded);
    document.documentElement.style.setProperty('--ui', String(s.uiScale || 1));
  }

  private guideStep = -1;
  /** 新手指引：一行（步驟編號＋目標＋進度）；完成、隱藏或首領戰時不顯示；換步驟時閃一下 */
  refreshGuide() {
    const t = this.state.tutorial;
    const step = currentStep(t);
    const el = this.els.guide;
    el.classList.toggle('hide', !step || t.hidden || this.bossOn);
    if (!step) return;
    const prog = progressText(t);
    this.els.guideNo.textContent = `${t.step + 1}/${TUTORIAL_STEPS.length}`;
    // 進度包成不斷行的一段，避免「（0 / 10 公尺）」從中間被折成兩行
    this.els.guideText.replaceChildren(step.text, ...(prog ? [h('span', { class: 'nowrap' }, `（${prog}）`)] : []));
    if (this.guideStep !== t.step) {
      this.guideStep = t.step;
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    }
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

  /** 長按技能 0.45 秒：顯示名稱、說明、消耗與冷卻（放開就收起；技能照常施放） */
  private bindLongPress(btn: HTMLElement, slot: SkillSlot) {
    let timer = 0;
    const tip = () => this.els.skillTip;
    btn.addEventListener('pointerdown', () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const d = this.skills.def(slot);
        const res = this.skills.usesRage ? '怒氣' : 'MP';
        tip().replaceChildren(
          h('b', {}, `${slot === 'basic' ? '普攻' : slot}・${d.name}`),
          h('span', {}, SKILL_HELP[d.id] ?? ''),
          h('small', {}, `${d.mpCost ? `${res} ${d.mpCost}・` : ''}冷卻 ${d.cooldown} 秒`),
        );
        tip().classList.add('show');
      }, 450);
    });
    const hide = () => {
      clearTimeout(timer);
      tip().classList.remove('show');
    };
    btn.addEventListener('pointerup', hide);
    btn.addEventListener('pointercancel', hide);
    btn.addEventListener('lostpointercapture', hide);
  }

  private bossShown: unknown = null;

  /** 戰鬥中的首領血條（上方中央插槽；出現時收起提示與新手指引） */
  setBoss(e: { def: { name: string; stats: { maxHp: number } }; hp: number } | null) {
    if (!e) {
      if (this.bossShown) {
        this.els.boss.classList.remove('show');
        this.bossShown = null;
        this.bossOn = false;
        this.root.classList.remove('boss-on');
        this.refreshGuide();
        this.showTip();
      }
      return;
    }
    if (this.bossShown !== e) {
      this.bossShown = e;
      this.bossOn = true;
      this.root.classList.add('boss-on');
      this.els.bossName.textContent = e.def.name;
      this.els.boss.classList.add('show');
      this.els.tip.classList.remove('show');
      this.refreshGuide();
    }
    const r = e.hp / e.def.stats.maxHp;
    this.els.bossFill.style.width = `${r * 100}%`;
    this.els.bossHp.textContent = `${Math.ceil(e.hp)} / ${e.def.stats.maxHp}`;
    this.els.boss.classList.toggle('enraged', r < 0.5);
  }

  setAuto(on: boolean) {
    this.els.auto.classList.toggle('on', on);
    this.els.auto.querySelector('small')!.textContent = on ? '戰鬥中' : '自動戰鬥';
  }

  /** 增益狀態列（Game 每 0.1 秒更新） */
  setBuffs(list: BuffInfo[]) {
    const key = list.map((b) => `${b.icon}${b.t === undefined ? b.label : Math.ceil(b.t)}`).join('|');
    if (key === this.els.buffs.dataset.key) return;
    this.els.buffs.dataset.key = key;
    this.els.buffs.replaceChildren(
      ...list.map((b) =>
        h('div', { class: `buff ${b.kind ?? 'good'}`, title: b.label }, [h('span', {}, b.icon), h('b', {}, b.t === undefined ? b.label : `${Math.ceil(b.t)}`)]),
      ),
    );
  }

  setZone(def: ZoneDef) {
    this.minimap.setZone(def);
    this.tips = def.tips;
    this.tipIndex = 0;
    this.tipTimer = 0;
    this.showTip();
    this.refresh();
  }

  /** 提示只在「沒有首領、沒在打」時出現 */
  private showTip() {
    const can = this.tips.length && !this.bossOn && this.combatT > 4;
    if (!can) {
      this.els.tip.classList.remove('show');
      return;
    }
    this.els.tip.textContent = this.tips[this.tipIndex % this.tips.length];
    this.els.tip.classList.add('show');
  }

  /** 一般訊息：排隊顯示，最多同時 2 則；相同訊息合併成 ×2 */
  toast(text: string, duration = 1.8) {
    const same = this.notes.find((n) => n.text === text);
    if (same) {
      same.count++;
      same.life = Math.max(same.life, duration);
      same.el.textContent = `${text} ×${same.count}`;
      return;
    }
    if (this.notes.length >= 2) {
      if (!this.noteQueue.some((q) => q.text === text)) this.noteQueue.push({ text, duration });
      if (this.noteQueue.length > 4) this.noteQueue.shift();
      // 最舊的一則提早收掉，讓排隊的訊息快點出來
      this.notes[0].life = Math.min(this.notes[0].life, 0.6);
      return;
    }
    const el = h('div', { class: 'note' }, text);
    this.els.notes.appendChild(el);
    this.notes.push({ el, text, count: 1, life: duration });
  }

  private updateNotes(dt: number) {
    for (const n of this.notes) {
      n.life -= dt;
      if (n.life <= 0 && !n.el.classList.contains('out')) {
        n.el.classList.add('out');
        setTimeout(() => n.el.remove(), 300);
      }
    }
    this.notes = this.notes.filter((n) => n.life > 0);
    while (this.notes.length < 2 && this.noteQueue.length) {
      const q = this.noteQueue.shift()!;
      this.toast(q.text, q.duration);
    }
  }

  /** 獎勵訊息：左側清單（最多 4 行，3.2 秒後淡出） */
  private feed(text: string, color: string, prefix = '') {
    const line = h('div', { class: 'feed-line', style: `--rc:${color}` }, prefix ? [h('span', {}, prefix), h('b', {}, text)] : [h('b', {}, text)]);
    this.els.feed.prepend(line);
    while (this.els.feed.children.length > 4) this.els.feed.lastElementChild!.remove();
    setTimeout(() => line.classList.add('out'), 3200);
    setTimeout(() => line.remove(), 3700);
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
      // 冷卻剛轉好：亮一圈
      const onCd = rem > 0.05;
      if (ui.wasCd && !onCd && slot !== 'basic') {
        ui.btn.classList.remove('ready');
        void ui.btn.offsetWidth;
        ui.btn.classList.add('ready');
      }
      ui.wasCd = onCd;
    }
    const pr = this.skills.potionCd / 2;
    for (const cd of this.potionCds) {
      cd.style.setProperty('--p', String(pr));
      cd.style.opacity = pr > 0 ? '1' : '0';
    }
  }

  private refreshBars() {
    const p = this.player;
    const hpR = p.hp / p.stats.maxHp;
    this.els.hpFill.style.width = `${hpR * 100}%`;
    this.els.hpTrail.style.width = `${hpR * 100}%`; // 殘影用 CSS 延遲跟上，被打時看得出掉了多少
    this.els.hpText.textContent = `${Math.round(p.hp)}/${p.stats.maxHp}`;
    this.els.mpFill.style.width = `${(p.mp / p.stats.maxMp) * 100}%`;
    this.els.mpText.textContent = `${Math.round(p.mp)}/${p.stats.maxMp}`;
    // 低血量：畫面邊緣紅色脈動＋血條閃爍
    this.root.classList.toggle('low-hp', p.alive && hpR < 0.3);
  }

  refreshBadge() {
    const n = claimableCount(this.state.daily);
    this.els.badge.textContent = n ? String(n) : '';
    this.els.badge.style.display = n ? 'flex' : 'none';
  }

  /** 數值變動時呼叫（不必每幀） */
  refresh() {
    const s = this.state;
    const zone = this.currentZone;
    this.els.lv.textContent = `Lv.${s.level}`;
    this.els.title.textContent = s.playerName;
    this.els.zoneName.textContent = zone ? (zone.kind === 'dungeon' ? zone.name : zone.subtitle.split('・')[0]) : '';
    this.refreshBars();
    const expR = Math.min(1, s.exp / expToNext(s.level));
    this.els.avatar.style.setProperty('--exp', String(expR));
    this.els.expText.textContent = `EXP ${Math.floor(expR * 100)}%`;
    this.root.classList.toggle('near-level', expR >= 0.9);
    this.els.gold.textContent = String(s.gold);
    this.els.gems.textContent = String(s.gems);
    this.els.potHp.textContent = String(s.potions.hp);
    this.els.potMp.textContent = String(s.potions.mp);
    this.els.fps.style.display = s.settings.showFps ? 'block' : 'none';
    this.refreshBadge();
  }

  currentZone: ZoneDef | null = null;
  /** FPS 旁的除錯資訊（draw calls） */
  debugInfo = '';

  update(dt: number) {
    this.minimap.target = this.currentZone ? targetFor(this.state.tutorial, this.currentZone.id) : null;
    this.minimap.draw(this.player.pos.x, this.player.pos.z, this.player.facing);
    this.updateCooldowns();
    this.updateNotes(dt);
    // HP/MP 條每 0.1 秒刷新一次（回魔、受傷是連續變化）
    this.hudTimer += dt;
    if (this.hudTimer > 0.1) {
      this.hudTimer = 0;
      this.refreshBars();
    }

    // 提示：戰鬥結束 4 秒後才出現、每 6 秒換一則；開打就收起
    const wasCombat = this.combatT <= 4;
    this.combatT += dt;
    if (wasCombat && this.combatT > 4) this.showTip();
    else if (this.combatT <= 4 && this.els.tip.classList.contains('show')) this.els.tip.classList.remove('show');
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
        this.els.fps.textContent = `${Math.round(this.fpsAcc.frames / this.fpsAcc.time)} FPS・${this.debugInfo}`;
        this.fpsAcc = { frames: 0, time: 0 };
      }
    }
  }
}
