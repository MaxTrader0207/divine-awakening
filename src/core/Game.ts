import * as THREE from 'three';
import { bus } from './EventBus';
import { isZoneUnlocked, newGameState, type GameState } from './GameState';
import { LocalSave } from './SaveSystem';
import { skipTitleOnce } from '@/ui/TitleScreen';
import { PauseScreen } from '@/ui/PauseScreen';
import { MinionManager } from '@/systems/MinionManager';
import type { Minion } from '@/entities/Minion';
import { zoneLabel } from '@/data/zones';
import type { ZoneId } from '@/data/types';
import { ZONES, DUNGEON_ORDER, lootTierOf, floorLabel } from '@/data/zones';
import { Player } from '@/entities/Player';
import { CameraRig } from '@/camera/CameraRig';
import { InputManager } from '@/input/InputManager';
import { ZoneManager } from '@/world/ZoneManager';
import { Hud, type BuffInfo } from '@/ui/Hud';
import { Menu } from '@/ui/Menu';
import { DamageNumbers } from '@/ui/DamageNumbers';
import { EnemyManager } from '@/systems/EnemyManager';
import { ProjectileSystem } from '@/systems/ProjectileSystem';
import { TargetSelector } from '@/systems/TargetSelector';
import { BERSERK, BLOODLUST_LEECH, GUARD_REDUCTION, SkillSystem } from '@/systems/SkillSystem';
import { Effects } from '@/systems/Effects';
import { calcDamage } from '@/systems/Combat';
import type { AiContext } from '@/systems/EnemyAI';
import type { Enemy } from '@/entities/Enemy';
import { AutoBattle } from '@/systems/AutoBattle';
import { addExp, expForKill, rollGold } from '@/systems/Progression';
import { computeStats } from '@/systems/Inventory';
import { LootSystem } from '@/systems/LootSystem';
import { Telegraphs } from '@/systems/Telegraphs';
import { BossController } from '@/systems/BossController';
import { AudioSystem } from '@/audio/Audio';
import { Quality, type QualitySetting } from '@/systems/Quality';
import { ensureToday, progressQuests, questText, type QuestEvent } from '@/systems/DailyQuests';
import { Cloud } from '@/net/Cloud';
import { CLASSES, RAGE, type HeroClass } from '@/data/classes';
import { applyClassGear } from '@/data/items';
import { currentStep, targetFor, tutorialEvent, type TutorialEvent } from '@/systems/Tutorial';
import { rewardText } from '@/data/tutorial';
import { StageClearScreen, type ClearInfo } from '@/ui/StageClearScreen';
import { finishClear, type BossFight } from '@/systems/StageClear';
import { CLASS_CLEAR } from '@/data/stageClear';
import { GuideArrow } from '@/world/GuideArrow';
import { consume, cannotUse } from '@/systems/Consumables';
import type { BuffStat } from '@/data/consumables';
import { damageArea } from '@/systems/Damage';
import { POTION_COOLDOWN } from '@/systems/SkillSystem';
import { LabelDodger } from '@/world/LabelDodger';

/** 被攻擊後自動反擊的持續秒數 */
const COUNTER_TIME = 3;
/** 死亡後損失的金幣比例 */
const DEATH_GOLD_PENALTY = 0.1;

const AUTOSAVE_INTERVAL = 10; // 秒
const CLOUD_INTERVAL = 300; // 自動上傳雲端（秒）

/**
 * Game：組裝所有系統並跑主迴圈。
 * 規範：Game 只做「組裝與調度」，具體邏輯放在各自的 system 類別。
 * 每幀順序見 docs/ARCHITECTURE.md「每幀更新順序」
 */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly input: InputManager;
  readonly player: Player;
  readonly zones: ZoneManager;
  readonly hud: Hud;
  readonly menu: Menu;
  /** 新手指引：腳邊箭頭與目標光柱 */
  private guideArrow = new GuideArrow();
  private guideLast = { x: 0, z: 0 };
  /** 道具的暫時增益（剩餘秒數）與持續回復 */
  private cbuff: Partial<Record<BuffStat, { t: number; v: number }>> = {};
  /** 護盾（埃阿斯塔盾護符）：剩餘吸收量與時間 */
  private shield = { hp: 0, t: 0 };
  private hot = { t: 0, rate: 0 };
  private hotMp = { t: 0, rate: 0 };
  /** 地點標籤避開 HUD */
  private labelDodger!: LabelDodger;
  readonly enemies: EnemyManager;
  readonly projectiles: ProjectileSystem;
  /** 召喚物（召喚師的骷髏） */
  readonly minions: MinionManager;
  readonly targets: TargetSelector;
  readonly damageNumbers: DamageNumbers;
  readonly effects: Effects;
  readonly skills: SkillSystem;
  readonly auto: AutoBattle;
  readonly loot: LootSystem;
  readonly telegraphs: Telegraphs;
  readonly bosses: BossController;
  readonly audio: AudioSystem;
  readonly quality: Quality;
  readonly cloud = new Cloud();
  state: GameState;

  private save = new LocalSave();
  private sun: THREE.DirectionalLight;
  private timer = new THREE.Timer();
  private saveTimer = 0;
  private transitioning = false;
  private counterTarget: Enemy | null = null;
  private deathTimer = 0;
  private resetting = false;
  private cloudTimer = 0;
  private deathGoldLost = 0;
  private counterTimer = 0;
  private aiCtx!: AiContext;
  private fadeEl: HTMLElement;
  private pauseScreen!: PauseScreen;
  /** 破關畫面（v1.34）：首領戰紀錄 → 慢動作特寫 → 結算畫面 */
  private clearScreen!: StageClearScreen;
  private bossFight: BossFight | null = null;
  private clearSeq: { t: number; info: ClearInfo } | null = null;
  /** 特寫時暫時藏起來的名牌、地名（Sprite）與敵人 */
  private hiddenSprites: THREE.Object3D[] = [];
  private cheerT = 0;
  /** 怒氣職業：距離上次戰鬥（打人 / 被打）的秒數 */
  private rageIdle = 0;
  private get usesRage() {
    return CLASSES[this.state.heroClass]?.resource === 'rage';
  }
  /** 暫停中：不推進任何遊戲邏輯，只渲染 */
  paused = false;

  constructor(private canvas: HTMLCanvasElement, private container: HTMLElement, uiRoot: HTMLElement, initialClass: HeroClass = 'mage') {
    this.state = this.save.load() ?? newGameState(initialClass);
    const cls = CLASSES[this.state.heroClass] ?? CLASSES.mage;
    applyClassGear(CLASSES[this.state.heroClass] ? this.state.heroClass : 'mage'); // 裝備名稱、圖示、欄位名稱依職業改寫
    this.player = new Player(cls.anims);

    // ---- Renderer ----
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ---- Lights ----
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 1.6));
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -30;
    sc.right = sc.top = 30;
    sc.near = 1;
    sc.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);
    this.quality = new Quality(this.renderer, this.sun, this.state.settings, () => this.resize());

    // ---- Systems ----
    this.rig = new CameraRig(1);
    this.rig.setZoom(this.state.settings.zoom);
    this.input = new InputManager(uiRoot);
    this.zones = new ZoneManager(this.scene);
    this.enemies = new EnemyManager(this.scene);
    this.projectiles = new ProjectileSystem(this.scene, this.enemies);
    this.targets = new TargetSelector(this.scene, this.enemies);
    this.damageNumbers = new DamageNumbers(uiRoot, container);
    this.labelDodger = new LabelDodger(container);
    this.effects = new Effects(this.scene);
    this.telegraphs = new Telegraphs(this.scene);
    this.audio = new AudioSystem(this.state.settings);
    this.bosses = new BossController({
      player: this.player,
      telegraphs: this.telegraphs,
      effects: this.effects,
      collision: () => this.zones.current!.collision,
      hitPlayer: (e, power) => this.hitPlayer(e, power),
      hitMinionsInside: (e, power, inside) => {
        for (const m of this.minions.list) if (m.alive && inside(m.pos.x, m.pos.z, m.radius)) this.hitMinion(e, m, power);
      },
    });
    this.minions = new MinionManager(this.scene, {
      player: this.player,
      enemies: this.enemies,
      targets: this.targets,
      projectiles: this.projectiles,
      effects: this.effects,
      collision: () => this.zones.current!.collision,
      heightAt: (x, z) => this.zones.current?.heightAt(x, z) ?? 0,
    });
    this.scene.add(this.player.object);

    this.player.stats = computeStats(this.state);
    this.player.hp = this.state.hp < 0 ? this.player.stats.maxHp : this.state.hp;
    this.player.mp = this.state.mp < 0 ? this.player.stats.maxMp : this.state.mp;

    this.skills = new SkillSystem({
      player: this.player,
      state: this.state,
      enemies: this.enemies,
      targets: this.targets,
      projectiles: this.projectiles,
      effects: this.effects,
      collision: () => this.zones.current!.collision,
      moveInput: () => this.input.move,
      minions: this.minions,
    }, this.state.heroClass);
    this.loot = new LootSystem(
      this.scene,
      this.state,
      this.player,
      this.effects,
      () => (this.zones.current ? lootTierOf(this.zones.current.def.id) : 1),
      () => this.onInventoryChanged(),
      (x, z) => this.zones.current?.heightAt(x, z) ?? 0,
    );
    this.auto = new AutoBattle({
      minions: this.minions,
      player: this.player,
      enemies: this.enemies,
      targets: this.targets,
      skills: this.skills,
      nearestLoot: () => this.loot.nearest(),
      dangerEscape: () => this.telegraphs.escape(this.player.pos.x, this.player.pos.z, this.player.radius + 0.4),
      collision: () => this.zones.current!.collision,
      level: () => this.state.level,
    });
    this.hud = new Hud(uiRoot, this.state, this.player, this.input, this.skills);
    this.menu = new Menu(uiRoot, this.state, {
      onResetSave: () => {
        this.resetting = true; // 避免 pagehide 時又把舊進度存回去
        this.save.clear();
        location.reload();
      },
      onUnlockAll: () => {
        this.state.bossesDefeated = [...DUNGEON_ORDER];
        bus.emit('toast', { text: '已解鎖全部副本（測試用）' });
        this.persist();
      },
      onZoomSet: (z) => this.setZoom(z),
      onToggleFps: (v) => {
        this.state.settings.showFps = v;
        this.hud.refresh();
        this.persist();
      },
      onSetPen: (pen) => {
        this.devPen = pen;
        this.player.stats.pen = pen;
        bus.emit('toast', { text: `穿透設為 ${Math.round(pen * 100)}%（測試用，重新整理後還原）` });
      },
      onInventoryChanged: () => this.onInventoryChanged(),
      onUseConsumable: (id) => this.useConsumable(id),
      onCelebrate: () => {
        this.audio.play('enhance');
        const { x, z } = this.player.pos;
        this.effects.pillar(x, z, 1, 0xffd36b, 0.9);
        this.effects.ring(x, z, 0.4, 2.6, 0xffe9a0, 0.6);
      },
      onQuality: (q: QualitySetting) => {
        this.quality.set(q);
        this.persist();
        return this.quality.label;
      },
      getQualityLabel: () => this.quality.label,
      getNowPlaying: () => this.audio.nowPlaying,
      cloud: this.cloud,
      saves: {
        active: () => this.save.slot,
        list: () => this.save.slots.list(),
        saveTo: (n) => {
          this.persist();
          if (n === this.save.slot) return true;
          return this.save.slots.write(n, JSON.parse(JSON.stringify(this.state)) as GameState);
        },
        load: (n) => {
          if (n === this.save.slot || this.save.slots.info(n).empty) return;
          this.persist();
          this.resetting = true; // 重新載入前不要再把目前進度寫到新欄位
          this.save.slots.setActive(n);
          skipTitleOnce();
          location.reload();
        },
        newGame: (n) => {
          if (!this.save.slots.info(n).empty) return;
          this.persist();
          this.resetting = true;
          this.save.slots.setActive(n);
          skipTitleOnce();
          location.reload(); // 空欄位 → 進入選職業畫面
        },
        toTitle: () => {
          this.persist();
          this.resetting = true;
          location.reload();
        },
        remove: (n) => {
          if (n !== this.save.slot) this.save.slots.delete(n);
        },
      },
      applyCloudSave: (data) => {
        this.resetting = true; // 不要讓離開頁面時把舊進度存回去
        this.save.save({ ...data, updatedAt: Date.now() });
        location.reload();
      },
      onVolume: (kind, v) => {
        if (kind === 'music') this.state.settings.musicVolume = v;
        else this.state.settings.sfxVolume = v;
        bus.emit('settings:changed');
      },
      getStatsText: () => {
        const s = this.player.stats;
        return `攻擊 ${s.atk}　穿透 ${Math.round(s.pen * 100)}%　爆擊 ${Math.round(s.critRate * 100)}% ×${s.critDmg}`;
      },
    });

    this.pauseScreen = new PauseScreen(uiRoot, {
      resume: () => this.setPaused(false),
      openMenu: (tab) => this.menu.open(tab),
      toTitle: () => {
        this.persist();
        this.resetting = true;
        location.reload();
      },
      info: () => ({
        place: zoneLabel(this.state.zoneId),
        level: this.state.level,
        className: CLASSES[this.state.heroClass]?.name ?? '法師',
        playTime: this.state.stats.playTime,
        kills: this.state.stats.kills,
      }),
    });
    bus.on('pause:toggle', () => this.setPaused(!this.paused));

    this.clearScreen = new StageClearScreen(uiRoot, {
      close: () => this.endClearScreen(),
      goNext: (id) => {
        this.endClearScreen();
        void this.changeZone(id);
      },
      goTown: () => {
        this.endClearScreen();
        void this.changeZone('town');
      },
    });

    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    uiRoot.appendChild(this.fadeEl);

    this.aiCtx = {
      player: this.player,
      collision: this.zones.current?.collision as never,
      hitPlayer: (e, power) => this.hitPlayer(e, power),
      rangedAttack: (e, windup, x, z) => {
        this.telegraphs.add({ kind: 'circle', x, z, r: 1.6 }, windup, (inside) => {
          this.effects.pillar(x, z, 0.7, 0xb48cff, 0.45);
          this.effects.disc(x, z, 1.6, 0x8a5aff, 0.35, 0.6);
          if (inside(this.player.pos.x, this.player.pos.z, this.player.radius)) this.hitPlayer(e, 1.2);
          for (const m of this.minions.list) if (m.alive && inside(m.pos.x, m.pos.z, m.radius)) this.hitMinion(e, m, 1.2);
        });
      },
      hitMinion: (e, m, power) => this.hitMinion(e, m, power),
    };

    // ---- 震動回饋（手機；設定可關閉）----
    bus.on('player:hurt', ({ amount }) => amount >= this.player.stats.maxHp * 0.08 && this.haptic(25));
    bus.on('boss:cast', () => this.haptic([30, 50, 30]));
    bus.on('player:levelup', () => this.haptic([40, 60, 40]));
    bus.on('player:died', () => this.haptic(150));

    // ---- 新手指引 ----
    const tut = (ev: TutorialEvent) => this.tutorial(ev);
    bus.on('enemy:killed', () => tut({ type: 'kill' }));
    bus.on('skill:cast', ({ slot }) => tut({ type: 'skill', slot }));
    bus.on('auto:changed', ({ on }) => tut({ type: 'auto', on }));
    bus.on('player:levelup', ({ level }) => tut({ type: 'level', level }));
    bus.on('item:equipped', () => tut({ type: 'equip' }));
    bus.on('shop:bought', () => tut({ type: 'buy' }));
    bus.on('enhance:done', () => tut({ type: 'enhance' }));
    bus.on('zone:enter', ({ zoneId }) => tut({ type: 'zone', zone: zoneId }));
    bus.on('boss:defeated', ({ zoneId }) => tut({ type: 'boss', zone: zoneId }));
    this.scene.add(this.guideArrow.group);

    // ---- 每日任務 ----
    ensureToday(this.state);
    const quest = (ev: QuestEvent) => this.quest(ev);
    bus.on('enemy:killed', (k) => {
      quest({ type: 'kill', zone: this.state.zoneId });
      if (k.boss) quest({ type: 'boss' });
    });
    bus.on('loot:picked', ({ rarity }) => quest({ type: 'loot', rarity: rarity as 'rare' }));
    bus.on('skill:cast', ({ slot }) => slot === 'potion' && quest({ type: 'potion' }));
    bus.on('enhance:done', () => quest({ type: 'enhance' }));

    // ---- 怒氣（狂戰士）與嗜血 ----
    bus.on('combat:hit', (hit) => {
      const p = this.player;
      if (!hit.targetIsPlayer && p.bloodlustT > 0 && p.alive) {
        p.hp = Math.min(p.stats.maxHp, p.hp + hit.amount * BLOODLUST_LEECH);
      }
      if (!hit.targetIsPlayer && this.cbuff.leech && p.alive) p.hp = Math.min(p.stats.maxHp, p.hp + hit.amount * this.cbuff.leech.v);
      if (!this.usesRage) return;
      this.rageIdle = 0;
      const gain = (hit.targetIsPlayer ? RAGE.perHurt : RAGE.perHit) * (p.berserkT > 0 ? BERSERK.rage : 1);
      p.mp = Math.min(p.stats.maxMp, p.mp + gain);
    });

    // ---- Events ----
    bus.on('player:hurt', ({ source }) => {
      this.counterTarget = source as Enemy;
      this.counterTimer = COUNTER_TIME;
    });
    bus.on('player:died', () => this.onPlayerDied());
    bus.on('enemy:killed', (k) => this.onEnemyKilled(k));
    bus.on('zone:request', ({ zoneId, arrive }) => this.changeZone(zoneId, arrive));
    bus.on('camera:zoom', ({ delta }) => this.setZoom(this.state.settings.zoom + delta));
    bus.on('save:request', () => this.persist());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'hidden') return;
      this.persist();
      // 切到別的 App / 分頁：自動暫停，回來時不會被怪打
      if (!this.transitioning && this.player.alive) this.setPaused(true);
    });
    window.addEventListener('pagehide', () => this.persist());
    window.addEventListener('resize', () => this.resize());

    // ---- 首次進入 ----
    const firstTime = this.state.stats.playTime < 1;
    this.enterZone(this.state.zoneId, this.state.pos);
    this.resize();
    if (firstTime) {
      setTimeout(() => bus.emit('banner', { text: '歡迎來到赫拉斯大陸' }), 600);
      setTimeout(() => bus.emit('toast', { text: '左上角的「新手指引」會一步步帶你玩，點它可以看詳細說明', duration: 4.5 }), 3000);
    }
    this.tutorial(null); // 輪到的步驟如果已經達成（例如已在草原），直接完成
    this.guideLast = { ...this.player.pos };
  }

  start() {
    this.timer.connect(document); // 分頁隱藏時暫停計時
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /* ------------------------------------------------------------ */

  private frame() {
    // dt 上限 0.05：切到背景再回來時避免角色瞬移穿牆
    this.timer.update();
    const realDt = this.timer.getDelta();
    if (this.paused) {
      this.pausedFrame();
    } else if (this.clearSeq) {
      // 擊敗首領：1.5 秒慢動作，鏡頭轉到角色正面，接著出現破關畫面
      this.clearSeq.t -= realDt;
      this.tick(Math.min(0.05, realDt) * 0.3);
      if (this.clearSeq.t <= 0) {
        const info = { ...this.clearSeq.info, auto: this.auto.on };
        this.clearSeq = null;
        this.clearScreen.show(info);
        // 特寫畫面不要有名牌、地名標籤、首領屍體、小怪擋在鏡頭前（關閉時還原）
        this.hiddenSprites = [];
        for (const e of this.enemies.enemies) {
          if (e.object.visible) {
            e.object.visible = false;
            if (e.alive) this.hiddenSprites.push(e.object);
          }
        }
        this.scene.traverse((o) => {
          if ((o as THREE.Sprite).isSprite && o.visible) {
            o.visible = false;
            this.hiddenSprites.push(o);
          }
        });
      }
    } else if (this.clearScreen.open) {
      this.showcaseFrame(Math.min(0.05, realDt));
    } else {
      this.quality.sample(realDt);
      this.tick(Math.min(0.05, realDt));
    }
    this.renderer.render(this.scene, this.rig.camera);
  }

  /** 暫停 / 繼續。暫停時遊戲世界完全停住（敵人、冷卻、AUTO、計時、存檔計時） */
  setPaused(v: boolean) {
    if (v === this.paused) return;
    if (v && (this.transitioning || !this.player.alive)) return; // 換地圖、倒地時不暫停
    this.paused = v;
    this.input.clearPressed();
    this.audio.setPaused(v);
    if (v) this.persist();
    else this.menu.close();
    this.pauseScreen.setVisible(v && !this.menu.isOpen);
  }

  /** 破關畫面開著：世界暫停，只讓角色動畫、特效、鏡頭繼續（角色擺勝利姿勢、鏡頭慢慢繞） */
  private showcaseFrame(dt: number) {
    this.input.update();
    this.input.clearPressed();
    // 每 3 秒再歡呼一次
    this.cheerT -= dt;
    if (this.cheerT <= 0) {
      this.cheerT = 3;
      this.player.cheer();
    }
    this.player.update(dt, { x: 0, z: 0 }, this.zones.current!.collision);
    this.effects.update(dt);
    this.rig.update(dt, this.player.pos.x, this.player.pos.z, this.player.groundY);
  }

  private endClearScreen() {
    this.clearScreen.hide();
    this.rig.setCinematic(false);
    for (const o of this.hiddenSprites) o.visible = true;
    this.hiddenSprites = [];
    this.player.invulnerable = Math.max(this.player.invulnerable, 1.5);
  }

  /** 藥水＋道具總數（首領戰用了幾個） */
  private itemCount(): number {
    const s = this.state;
    return s.potions.hp + s.potions.mp + Object.values(s.consumables).reduce((a, b) => a + b, 0);
  }

  /** 暫停中的每一幀：只處理「繼續」按鍵，選單開著時隱藏暫停畫面 */
  private pausedFrame() {
    this.input.update();
    if (this.input.consume('pause')) {
      if (this.menu.isOpen) this.menu.close();
      else this.setPaused(false);
    }
    if (this.input.consume('menu')) this.menu.toggle();
    this.input.clearPressed();
    this.pauseScreen.setVisible(!this.menu.isOpen);
  }

  /**
   * 推進一步遊戲邏輯（不渲染）。
   * 與 render 分開，讓自動化測試可以用 debugAdvance() 快轉，不受裝置 FPS 影響。
   */
  private tick(dt: number) {
    this.input.update();

    if (this.input.consume('menu')) this.menu.toggle();
    if (this.input.consume('pause')) {
      if (this.menu.isOpen) this.menu.close();
      else this.setPaused(true);
      if (this.paused) return;
    }
    const canAct = !this.menu.isOpen && !this.transitioning && this.player.alive;

    const collision = this.zones.current!.collision;
    const pushOut = (pos: { x: number; z: number }, r: number) => this.enemies.pushOut(pos, r);
    this.skills.update(dt * (1 + (this.cbuff.cdr?.v ?? 0))); // 道具「冷卻快 30%」
    this.counterTimer = Math.max(0, this.counterTimer - dt);
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawnAfterDeath();
    }
    this.regen(dt);

    if (canAct) {
      this.handleActions();
      this.auto.update(dt);
      // 手動推搖桿優先；沒推時採用 AUTO 的移動
      const manual = Math.hypot(this.input.move.x, this.input.move.z) > 0.05;
      const move = this.auto.on && !manual ? this.auto.move : this.input.move;
      this.player.update(dt, move, collision, pushOut);
      this.zones.checkPortals(this.player.pos.x, this.player.pos.z);
      this.zones.checkTriggers(this.player.pos.x, this.player.pos.z);
    } else {
      this.player.update(dt, { x: 0, z: 0 }, collision, pushOut);
    }

    this.aiCtx.collision = collision;
    const zoneNow = this.zones.current!;
    this.player.groundY += (zoneNow.heightAt(this.player.pos.x, this.player.pos.z) - this.player.groundY) * Math.min(1, dt * 14);
    this.enemies.update(dt, this.rig.camera, this.aiCtx);
    // 首領戰紀錄：開戰時開始計時；首領脫戰回家就作廢（擊敗時在 onBossDefeated 結算）
    const eb = this.enemies.engagedBoss();
    if (eb && !this.bossFight) this.bossFight = { zoneId: this.state.zoneId, start: this.state.stats.playTime, skillHits: 0, hits: 0, itemsAtStart: this.itemCount() };
    else if (!eb && this.bossFight && !this.clearSeq) this.bossFight = null;
    this.minions.update(dt, this.rig.camera);
    this.bosses.update(dt, this.enemies.enemies);
    this.telegraphs.update(dt);
    this.effects.update(dt);
    this.loot.update(dt);
    this.state.stats.playTime += dt;
    this.projectiles.update(dt, this.rig.camera);
    this.targets.update(dt);
    this.zones.update(dt, this.player.pos.x, this.player.pos.z);
    this.rig.update(dt, this.player.pos.x, this.player.pos.z, this.player.groundY);
    this.updateGuide(dt);
    this.labelDodger.update(dt, this.rig.camera);
    this.followSun();
    this.damageNumbers.update(dt, this.rig.camera);
    const boss = this.enemies.engagedBoss();
    this.hud.setBoss(boss);
    if (boss) {
      this.audio.setMusic(zoneNow.def.bossMusic ?? 'boss');
      this.audio.setBossIntensity(boss.hp < boss.def.stats.maxHp * 0.5 ? 1 : 0);
    } else this.audio.setMusic(zoneNow.def.music ?? ({ town: 'town', field: 'grassland', dungeon: 'dungeon' } as const)[zoneNow.def.kind]);
    if (this.state.settings.showFps) this.hud.debugInfo = `${this.renderer.info.render.calls} DC・畫質${this.quality.label}`;
    this.hud.setBuffs(this.buffList());
    this.hud.update(dt);
    this.input.endFrame();

    this.saveTimer += dt;
    if (this.saveTimer > AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      // 跨日：重新產生每日任務
      this.cloudTimer += AUTOSAVE_INTERVAL;
      if (this.cloudTimer >= CLOUD_INTERVAL) {
        this.cloudTimer = 0;
        this.cloudAutoUpload();
      }
      if (ensureToday(this.state)) {
        bus.emit('toast', { text: '新的一天！每日任務已更新' });
        bus.emit('quests:changed');
      }
      this.persist();
    }
  }

  /** 技能與道具按鈕 */
  private handleActions() {
    // 普攻：按住可連續攻擊（不提示冷卻）
    this.input.consume('basic');
    if (this.input.held('basic')) this.skills.cast('basic', true);
    // 技能：點一下施放；按住則冷卻好就自動再放
    for (const slot of ['Q', 'W', 'E', 'R'] as const) {
      const pressed = this.input.consume(slot);
      if (pressed) this.skills.cast(slot);
      else if (this.input.held(slot)) this.skills.cast(slot, true);
    }
    if (this.input.consume('auto')) this.setAuto(!this.auto.on);

    // 被攻擊時自動反擊：沒有移動、沒有按攻擊時，對攻擊者放普攻
    const idle = Math.hypot(this.input.move.x, this.input.move.z) < 0.05 && !this.input.held('basic');
    if (this.counterTimer > 0 && idle && this.counterTarget?.alive) {
      this.targets.current = this.counterTarget;
      this.skills.cast('basic', true);
    }
    if (this.input.consume('potionHp')) this.skills.usePotion('hp');
    if (this.input.consume('potionMp')) this.skills.usePotion('mp');
  }

  /**
   * 自然回復
   * - MP：每秒 2 點 + 最大值 1%
   * - HP：脫戰 5 秒後每秒 2%；安全區每秒 10%
   */
  private regen(dt: number) {
    const p = this.player;
    if (!p.alive) return;
    if (this.usesRage) {
      // 怒氣：不會自然回復，脫戰一段時間後消退
      this.rageIdle += dt;
      if (this.rageIdle > RAGE.idleDelay && p.mp > 0) p.mp = Math.max(0, p.mp - RAGE.decay * dt);
    } else if (p.mp < p.stats.maxMp) p.mp = Math.min(p.stats.maxMp, p.mp + (2 + p.stats.maxMp * 0.01) * dt);
    // 道具：持續回復、增益倒數、長時間加成（遊戲時間）
    if (this.hot.t > 0) {
      this.hot.t -= dt;
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * this.hot.rate * dt);
    }
    if (this.hotMp.t > 0) {
      this.hotMp.t -= dt;
      p.mp = Math.min(p.stats.maxMp, p.mp + p.stats.maxMp * this.hotMp.rate * dt);
    }
    let expired = false;
    for (const [k, b] of Object.entries(this.cbuff) as [BuffStat, { t: number; v: number }][]) {
      b.t -= dt;
      if (b.t > 0) continue;
      delete this.cbuff[k];
      // 會改到屬性面板的增益結束時要重算
      if (k === 'atk' || k === 'speed' || k === 'crit' || k === 'pen' || k === 'critDmg') expired = true;
    }
    if (expired) this.recalcStats();
    if (this.shield.t > 0) {
      this.shield.t -= dt;
      if (this.shield.t <= 0) this.shield.hp = 0;
    }
    const b = this.state.boosts;
    if (b.exp > 0) b.exp = Math.max(0, b.exp - dt);
    if (b.gold > 0) b.gold = Math.max(0, b.gold - dt);
    const safe = this.zones.current?.def.safe;
    if (p.hp < p.stats.maxHp && (safe || p.sinceHurt > 5)) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * (safe ? 0.1 : 0.02) * dt);
  }

  setAuto(on: boolean) {
    if (on && this.zones.current?.def.safe) {
      bus.emit('toast', { text: '安全區無法自動戰鬥' });
      on = false;
    }
    if (this.auto.on === on) return this.hud.setAuto(on);
    this.auto.on = on;
    this.hud.setAuto(on);
    bus.emit('auto:changed', { on });
    if (on) bus.emit('toast', { text: 'AUTO 自動戰鬥：開啟' });
    else bus.emit('toast', { text: 'AUTO 自動戰鬥：關閉' });
  }

  /** 依等級（與之後的裝備）重算屬性；hp / mp 依比例保留 */
  recalcStats() {
    const p = this.player;
    const hpR = p.stats.maxHp > 0 ? p.hp / p.stats.maxHp : 1;
    const mpR = p.stats.maxMp > 0 ? p.mp / p.stats.maxMp : 1;
    p.stats = computeStats(this.state);
    if (this.devPen !== null) p.stats.pen = this.devPen;
    // 道具增益：阿瑞斯戰血（攻擊）、赫密士疾行藥（移速）
    const cb = this.cbuff;
    if (cb.atk) p.stats.atk = Math.round(p.stats.atk * (1 + cb.atk.v));
    if (cb.speed) p.stats.moveSpeed *= 1 + cb.speed.v;
    if (cb.crit) p.stats.critRate = Math.min(0.75, p.stats.critRate + cb.crit.v);
    if (cb.pen) p.stats.pen = Math.min(0.9, p.stats.pen + cb.pen.v);
    if (cb.critDmg) p.stats.critDmg += cb.critDmg.v;
    p.hp = Math.min(p.stats.maxHp, Math.round(p.stats.maxHp * hpR));
    p.mp = Math.min(p.stats.maxMp, Math.round(p.stats.maxMp * mpR));
    bus.emit('player:changed');
  }

  private devPen: number | null = null;

  /** 自動上傳（已登入且開啟自動）；失敗靜默，衝突時提示到設定頁處理 */
  private cloudAutoUpload() {
    const acc = this.cloud.account;
    if (!acc || acc.auto === false) return;
    this.persist();
    this.cloud
      .upload(this.state)
      .then(() => this.cloud.submitScore(this.state))
      .catch((e: { status?: number }) => {
        if (e.status === 409) bus.emit('toast', { text: '雲端有較新的存檔，請到「設定 → 雲端存檔」選擇要保留哪一份', duration: 3.5 });
      });
  }

  /** 使用道具（選單「裝備 → 道具」、商城旁） */
  useConsumable(id: string): boolean {
    const p = this.player;
    const s = this.state;
    const ctx = {
      safe: !!this.zones.current?.def.safe,
      bossFight: !!this.enemies.engagedBoss(),
      hpFull: p.hp >= p.stats.maxHp,
      mpFull: p.mp >= p.stats.maxMp,
      potionCd: this.skills.potionCd > 0,
      alive: p.alive,
    };
    const why = cannotUse(s, id, ctx);
    if (why) {
      bus.emit('toast', { text: why });
      return false;
    }
    const def = consume(s, id, ctx)!;
    const e = def.effect;
    switch (e.type) {
      case 'heal':
        if (e.hp) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * e.hp);
        if (this.usesRage && e.rage) p.mp = Math.min(p.stats.maxMp, p.mp + e.rage);
        else if (e.mp) p.mp = Math.min(p.stats.maxMp, p.mp + p.stats.maxMp * e.mp);
        this.skills.potionCd = POTION_COOLDOWN;
        this.effects.ring(p.pos.x, p.pos.z, 0.4, 1.8, 0xffd36b, 0.6);
        bus.emit('skill:cast', { slot: 'potion' }); // 每日任務「使用藥水」也算
        break;
      case 'regen':
        if (e.mp) this.hotMp = { t: e.duration, rate: e.total / e.duration };
        else this.hot = { t: e.duration, rate: e.total / e.duration };
        this.effects.ring(p.pos.x, p.pos.z, 0.4, 1.6, e.mp ? 0x5cb2ff : 0xff9a5a, 0.6);
        break;
      case 'buff':
        // 同一種增益再用一次：取效果較強的、時間重新計算
        this.cbuff[e.stat] = { t: e.duration, v: Math.max(e.value, this.cbuff[e.stat]?.v ?? 0) };
        this.recalcStats();
        this.effects.pillar(p.pos.x, p.pos.z, 0.8, e.stat === 'atk' ? 0xff5a3c : e.stat === 'def' ? 0x9fd36a : 0x8fe3ff, 0.6);
        break;
      case 'cdReset':
        this.skills.reset();
        this.effects.ring(p.pos.x, p.pos.z, 0.5, 2.6, 0xfff2a0, 0.5);
        break;
      case 'invuln':
        p.invulnerable = Math.max(p.invulnerable, e.duration);
        this.effects.pillar(p.pos.x, p.pos.z, 1, 0xfff6c4, 0.8);
        break;
      case 'nova': {
        const r = e.radius;
        this.effects.disc(p.pos.x, p.pos.z, r, e.color, 0.45, 0.6);
        this.effects.ring(p.pos.x, p.pos.z, 0.5, r, e.color, 0.5);
        damageArea(this.enemies.enemies, p.pos.x, p.pos.z, r, p.stats, e.power, (en) => {
          if (e.stun) en.applyStun(e.stun);
          if (e.slow) en.applySlow(e.slow, 0.5);
        });
        this.haptic(30);
        break;
      }
      case 'summon':
        this.minions.summon(e.minion, e.count);
        break;
      case 'shield':
        this.shield = { hp: Math.round(p.stats.maxHp * e.ratio), t: e.duration };
        this.effects.ring(p.pos.x, p.pos.z, 0.6, 1.6, 0x8fd4ff, 0.6);
        break;
      case 'town':
        this.setAuto(false);
        this.changeZone('town', ZONES.town.spawn);
        break;
      case 'boost':
        s.boosts[e.stat] += e.duration;
        break;
    }
    if (e.type !== 'heal') this.audio.play('potion'); // 回復類已由 skill:cast 播過
    bus.emit('toast', { text: `${def.icon} 使用 ${def.name}：${def.desc}`, duration: 2.4 });
    bus.emit('player:changed');
    this.menu.refreshIfOpen();
    this.persist();
    return true;
  }

  /** 震動（不支援的瀏覽器，例如 iPhone Safari，會直接忽略） */
  private haptic(pattern: number | number[]) {
    if (!this.state.settings.vibration) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* 忽略 */
    }
  }

  /** HUD 增益列：守護、嗜血、狂暴、召喚物數量、無敵 */
  private buffList(): BuffInfo[] {
    const p = this.player;
    const out: BuffInfo[] = [];
    if (p.guardT > 0) out.push({ icon: '🛡', label: '守護', t: p.guardT });
    if (p.bloodlustT > 0) out.push({ icon: '🩸', label: '嗜血', t: p.bloodlustT });
    if (p.berserkT > 0) out.push({ icon: '🔥', label: '狂暴', t: p.berserkT });
    if (p.swordIntentT > 0) out.push({ icon: '☯', label: '人劍合一', t: p.swordIntentT });
    if (p.invulnerable > 0.4) out.push({ icon: '✨', label: '無敵', t: p.invulnerable });
    const BUFF_ICON: Record<BuffStat, [string, string]> = {
      atk: ['⚔️', '攻擊'], def: ['🫒', '減傷'], speed: ['💨', '移速'], crit: ['🎯', '爆擊'],
      pen: ['🔱', '穿透'], critDmg: ['💥', '爆傷'], cdr: ['⏳', '冷卻'], leech: ['🍇', '吸血'],
    };
    for (const [k, b] of Object.entries(this.cbuff) as [BuffStat, { t: number; v: number }][]) out.push({ icon: BUFF_ICON[k][0], label: BUFF_ICON[k][1], t: b.t });
    if (this.shield.hp > 0) out.push({ icon: '🛡️', label: `${this.shield.hp}` });
    if (this.hot.t > 0) out.push({ icon: '🍞', label: '回復', t: this.hot.t });
    if (this.hotMp.t > 0) out.push({ icon: '💧', label: '回魔', t: this.hotMp.t });
    const b = this.state.boosts;
    if (b.exp > 0) out.push({ icon: '🐝', label: `${Math.ceil(b.exp / 60)}分` });
    if (b.gold > 0) out.push({ icon: '🪙', label: `${Math.ceil(b.gold / 60)}分` });
    const n = this.minions?.count() ?? 0;
    if (n > 0) out.push({ icon: '💀', label: `×${n}` });
    return out;
  }

  /** 推進新手指引；完成的步驟發獎勵、顯示訊息 */
  tutorial(ev: TutorialEvent | null) {
    const s = this.state;
    const t = s.tutorial;
    if (t.done) return;
    const before = `${t.step}|${Math.floor(t.progress)}|${t.skills.length}`;
    const done = tutorialEvent(t, ev, { zoneId: s.zoneId, level: s.level, bossesDefeated: s.bossesDefeated });
    for (const c of done) {
      const r = c.step.reward;
      if (c.rewarded) {
        s.gold += r.gold ?? 0;
        s.gems += r.gems ?? 0;
        s.potions.hp += r.hp ?? 0;
        s.potions.mp += r.mp ?? 0;
      }
      if (!t.hidden) bus.emit('toast', { text: `✔ 指引完成：${c.step.title}${c.rewarded ? `　${rewardText(r)}` : ''}`, duration: 3, kind: 'reward' });
    }
    if (done.length) {
      this.audio.play(t.done ? 'levelup' : 'coin');
      if (t.done && !t.hidden) {
        bus.emit('banner', { text: '新手指引完成！' });
        setTimeout(() => bus.emit('toast', { text: '接下來挑戰更深的副本和每日任務吧！說明隨時在「選單 → 指引」', duration: 4 }), 2400);
      }
      bus.emit('wallet:changed');
      this.persist();
    }
    if (`${t.step}|${Math.floor(t.progress)}|${t.skills.length}` !== before) bus.emit('tutorial:changed');
  }

  /** 每幀：「走動」步驟累計距離、更新指引箭頭 */
  private updateGuide(dt: number) {
    const t = this.state.tutorial;
    const p = this.player.pos;
    if (!t.done && currentStep(t)?.goal.type === 'move') {
      const d = Math.hypot(p.x - this.guideLast.x, p.z - this.guideLast.z);
      if (d > 0.001 && d < 1) this.tutorial({ type: 'move', meters: d }); // 大於 1m 是傳送 / 換地圖，不算
    }
    this.guideLast.x = p.x;
    this.guideLast.z = p.z;
    const zone = this.zones.current;
    this.guideArrow.update(dt, p.x, p.z, zone ? targetFor(t, zone.def.id) : null, (x, z) => zone?.heightAt(x, z) ?? 0);
  }

  /** 推進每日任務 */
  quest(ev: QuestEvent) {
    if (!this.state.daily) return;
    const done = progressQuests(this.state.daily, ev);
    for (const q of done) bus.emit('toast', { text: `📋 每日任務完成：${questText(q)}`, duration: 3, kind: 'reward' });
    bus.emit('quests:changed');
  }

  /** 背包、裝備、金錢變動後：重算屬性、刷新、存檔 */
  onInventoryChanged() {
    this.recalcStats();
    this.menu.refreshIfOpen();
    this.persist();
  }

  /** 擊殺獎勵：經驗、金幣、鑽石、升級 */
  private onEnemyKilled(k: { x: number; z: number; level: number; exp: number; gold: [number, number]; gems: number; boss: boolean; name: string }) {
    const s = this.state;
    s.stats.kills++;
    // 道具加成：謬思蜂蜜（經驗）、堤喀幸運金幣（金幣）
    const exp = Math.round(expForKill(k.exp, s.level, k.level) * (s.boosts.exp > 0 ? 1.3 : 1));
    const gold = Math.round(rollGold(k.gold) * (s.boosts.gold > 0 ? 1.5 : 1));
    if (k.boss) this.onBossDefeated(k.name, exp, gold, k.gems);
    if (exp <= 0 && gold <= 0) return;
    s.gold += gold;
    s.gems += k.gems;
    if (gold > 0) this.quest({ type: 'gold', amount: gold });
    const r = addExp(s.level, s.exp, exp);
    s.exp = r.exp;
    if (gold > 0) bus.emit('float:text', { x: k.x, y: 1.4, z: k.z, text: `+${gold} 金幣`, kind: 'gold' });
    if (exp > 0) bus.emit('float:text', { x: this.player.pos.x, y: 2.6, z: this.player.pos.z, text: `+${exp} EXP`, kind: 'exp' });
    if (k.gems > 0) bus.emit('toast', { text: `💎 獲得 ${k.gems} 寶石`, kind: 'reward' });
    if (r.levelsGained > 0) {
      s.level = r.level;
      this.recalcStats();
      this.player.hp = this.player.stats.maxHp;
      this.player.mp = this.player.stats.maxMp;
      const { x, z } = this.player.pos;
      this.effects.pillar(x, z, 1.2, 0xffd36b, 1.2);
      this.effects.ring(x, z, 0.5, 3.5, 0xffe9a0, 0.8);
      bus.emit('banner', { text: `升級！ Lv.${s.level}` });
      this.player.cheer();
      bus.emit('player:levelup', { level: s.level });
    }
    bus.emit('player:changed');
  }

  /** 擊敗首領：記錄、解鎖下一層，進入破關特寫與破關畫面 */
  private onBossDefeated(name: string, exp: number, gold: number, gems: number) {
    const s = this.state;
    const zoneId = s.zoneId;
    const first = !s.bossesDefeated.includes(zoneId);
    if (first) s.bossesDefeated.push(zoneId);
    const idx = DUNGEON_ORDER.indexOf(zoneId);
    const next = idx >= 0 ? DUNGEON_ORDER[idx + 1] : undefined;
    const allDone = first && idx === DUNGEON_ORDER.length - 1;
    bus.emit('banner', { text: `擊敗${name}！` });
    bus.emit('boss:defeated', { zoneId, first });
    // 結算（沒有開戰紀錄時——例如一擊必殺——當作 1 秒）
    const now = s.stats.playTime;
    const fight = this.bossFight?.zoneId === zoneId ? this.bossFight : { zoneId, start: now - 1, skillHits: 0, hits: 0, itemsAtStart: this.itemCount() };
    this.bossFight = null;
    const result = finishClear(s.clears, fight, now, this.itemCount());
    this.clearSeq = {
      t: 1.5,
      info: {
        result,
        heroClass: s.heroClass,
        playerName: s.playerName,
        bossName: name,
        exp,
        gold,
        gems,
        unlocked: first ? next : undefined,
        allDone,
        next: next && isZoneUnlocked(s, next) ? next : undefined,
        auto: this.auto.on,
      },
    };
    // 慢動作特寫：鏡頭繞到角色正面、角色歡呼、職業顏色的光柱與光環
    this.rig.setCinematic(true, this.player.facing);
    this.player.cheer();
    const { x, z } = this.player.pos;
    const col = parseInt(CLASS_CLEAR[s.heroClass].color.slice(1), 16);
    this.effects.pillar(x, z, 1.4, col, 1.6);
    this.effects.ring(x, z, 0.5, 5, 0xffe9a0, 1);
    this.effects.ring(x, z, 0.5, 3.2, col, 0.8);
    this.player.invulnerable = 0; // 不要閃爍（特寫期間 hitPlayer 直接忽略傷害）
    this.persist();
    this.cloudAutoUpload();
  }

  /** 敵人攻擊命中玩家 */
  /** 敵人打召喚物（不顯示傷害數字，只閃白） */
  private hitMinion(e: Enemy, m: Minion, power: number) {
    const res = calcDamage({ atk: e.def.stats.atk, pen: 0, critRate: 0.05, critDmg: 1.5 }, power, m.stats.def);
    m.takeDamage(res.amount);
  }

  private hitPlayer(e: Enemy, power: number) {
    const p = this.player;
    if (this.clearSeq) return; // 破關慢動作中不受傷
    if (this.bossFight && e.def.boss && p.invulnerable <= 0) {
      this.bossFight.hits++;
      if (power !== 1) this.bossFight.skillHits++;
    }
    const res = calcDamage({ atk: e.def.stats.atk, pen: 0, critRate: 0.05, critDmg: 1.5 }, power, p.stats.def);
    // 道具「雅典娜橄欖油」：減傷 25%
    if (this.cbuff.def) res.amount = Math.max(1, Math.round(res.amount * (1 - this.cbuff.def.v)));
    // 道具護盾先吸收
    if (this.shield.hp > 0) {
      const absorbed = Math.min(this.shield.hp, res.amount - 1);
      this.shield.hp -= absorbed;
      res.amount -= absorbed;
      this.effects.ring(p.pos.x, p.pos.z, 0.6, 1.2, 0x8fd4ff, 0.2);
    }
    // 騎士「守護」：減傷
    if (p.guardT > 0) {
      res.amount = Math.max(1, Math.round(res.amount * (1 - GUARD_REDUCTION)));
      this.effects.ring(p.pos.x, p.pos.z, 0.6, 1.3, 0x8fd4ff, 0.25);
    }
    const dealt = p.takeDamage(res.amount);
    if (dealt <= 0) return;
    bus.emit('combat:hit', { x: p.pos.x, y: 2.2, z: p.pos.z, amount: dealt, crit: res.crit, targetIsPlayer: true });
    bus.emit('player:hurt', { amount: dealt, source: e });
    if (!p.alive) bus.emit('player:died');
  }

  /** 玩家死亡：倒地 1.6 秒（遊戲時間）→ 損失 10% 金幣 → 主城復活 */
  private onPlayerDied() {
    this.state.stats.deaths++;
    this.cbuff = {};
    this.hot = { t: 0, rate: 0 };
    this.hotMp = { t: 0, rate: 0 };
    this.shield = { hp: 0, t: 0 };
    this.counterTimer = 0;
    this.targets.clear();
    this.deathTimer = 1.6;
    this.deathGoldLost = Math.floor(this.state.gold * DEATH_GOLD_PENALTY);
    this.state.gold -= this.deathGoldLost;
    bus.emit('banner', { text: '你被擊敗了…' });
  }

  private respawnAfterDeath() {
    const lost = this.deathGoldLost;
    this.enterZone('town', ZONES.town.spawn);
    this.player.revive();
    this.skills.reset();
    this.persist();
    bus.emit('toast', { text: lost > 0 ? `在主城復活，損失 ${lost} 金幣` : '在主城復活', duration: 2.6 });
    bus.emit('player:changed');
  }

  /** 測試用：以固定 1/60 秒步進快轉遊戲時間（不渲染） */
  debugAdvance(seconds: number, step = 1 / 60) {
    const steps = Math.round(seconds / step);
    for (let i = 0; i < steps; i++) this.tick(step);
  }


  private followSun() {
    const { x, z } = this.player.pos;
    this.sun.position.set(x + 14, 30, z + 10);
    this.sun.target.position.set(x, 0, z);
  }

  private setZoom(z: number) {
    this.rig.setZoom(z);
    this.state.settings.zoom = this.rig.zoom;
    this.hud.refresh();
  }

  /** 有淡入淡出的區域切換 */
  private async changeZone(id: ZoneId, arrive?: { x: number; z: number }, force = false) {
    if (this.transitioning) return;
    const need = ZONES[id].minLevel ?? 0;
    if (!force && this.state.level < need) {
      bus.emit('toast', { text: `${ZONES[id].name}需要 Lv.${need}（目前 Lv.${this.state.level}）` });
      return;
    }
    if (id === this.state.zoneId && !arrive && !force) return;
    if (!this.player.alive && !force) return;
    this.transitioning = true;
    this.fadeEl.classList.add('on');
    await wait(260);
    this.enterZone(id, arrive ?? ZONES[id].spawn);
    this.persist();
    await wait(60);
    this.fadeEl.classList.remove('on');
    this.transitioning = false;
  }

  private enterZone(id: ZoneId, at: { x: number; z: number }) {
    this.bossFight = null;
    this.projectiles.clear();
    this.effects.clear();
    this.telegraphs?.clear();
    this.loot?.clear();
    this.damageNumbers.clear();
    this.targets.clear();
    this.counterTimer = 0;
    this.counterTarget = null;
    const zone = this.zones.load(id);
    const h = (x: number, z: number) => zone.heightAt(x, z);
    this.enemies.heightAt = h;
    this.effects.heightAt = h;
    this.telegraphs.heightAt = h;
    this.minions.clear();
    this.enemies.spawnForZone(zone.def);
    if (zone.def.safe && this.auto?.on) this.setAuto(false);
    this.state.zoneId = id;
    this.player.groundY = zone.heightAt(at.x, at.z);
    this.player.teleport(at.x, at.z);
    this.player.update(0, { x: 0, z: 0 }, zone.collision); // 確保出生點不在障礙物內
    this.rig.snapTo(this.player.pos.x, this.player.pos.z);
    this.hud.currentZone = zone.def;
    this.labelDodger.setRoot(zone.group);
    this.hud.setZone(zone.def);
    const def = zone.def;
    const range = def.levelRange ? `（Lv.${def.levelRange[0]}-${def.levelRange[1]}）` : '';
    const name = def.kind === 'dungeon' ? `${floorLabel(def.dungeon!.floor)}・${def.name}` : def.subtitle.split('・')[0];
    bus.emit('banner', { text: def.kind === 'town' ? `回到${name}` : `進入 ${name}${range}` });
    bus.emit('zone:enter', { zoneId: id });
  }

  private persist() {
    if (this.resetting) return;
    const s = this.state;
    s.pos = { x: round2(this.player.pos.x), z: round2(this.player.pos.z) };
    s.hp = Math.round(this.player.hp);
    s.mp = Math.round(this.player.mp);
    if (this.save.save(s)) bus.emit('save:written');
  }

  private resize() {
    if (!this.rig) return; // Quality 在建構途中呼叫時，攝影機還沒建立
    const w = this.container.clientWidth;
    const hgt = this.container.clientHeight;
    this.renderer.setSize(w, hgt, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${hgt}px`;
    this.rig.resize(w / hgt);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number) => Math.round(n * 100) / 100;
