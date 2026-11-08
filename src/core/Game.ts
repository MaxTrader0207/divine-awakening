import { BossScaler, bossAtkMul, bossInitialHpMul } from '@/systems/BossScaling';
import { CRIT_DMG_MAX, CRIT_RATE_MAX, SLOT_ORDER } from '@/data/items';
import * as THREE from 'three';
import { bus } from './EventBus';
import { isZoneUnlocked, newGameState, type GameState } from './GameState';
import { elementMul } from '@/data/elements';
import { COMPANIONS, companionOfGuardian, pityLeft, tryCapture } from '@/data/companions';
import { LocalSave } from './SaveSystem';
import { skipTitleOnce } from '@/ui/TitleScreen';
import { PauseScreen, type PauseStatus } from '@/ui/PauseScreen';
import { CONSUMABLE_MAP } from '@/data/consumables';
import { MinionManager } from '@/systems/MinionManager';
import type { Minion } from '@/entities/Minion';
import { zoneLabel } from '@/data/zones';
import type { ZoneId } from '@/data/types';
import { ZONES, DUNGEON_ORDER, SIDE_ORDER, BEAST_ORDER, lootTierOf, rollZoneTier, floorLabel } from '@/data/zones';
import { beastBonus, beastsDone } from '@/systems/BeastHunt';
import { Player } from '@/entities/Player';
import { CameraRig } from '@/camera/CameraRig';
import { InputManager } from '@/input/InputManager';
import { ZoneManager } from '@/world/ZoneManager';
import { SHADOW_ONLY_LAYER } from '@/world/Zone';
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
import { openCompanionView, openItemsView } from '@/ui/InventoryTabs';
import { AutoBattle, AUTO_HP_POTION } from '@/systems/AutoBattle';
import { addExp, expForKill, rollGold } from '@/systems/Progression';
import { computeStats } from '@/systems/Inventory';
import { codexEntry, recordKill } from '@/data/codex';
import { newlyDone } from '@/systems/Achievements';
import { COMPANION_SKILLS, DUO, GROWTH, addBond, addCompExp, bondLevel, compCooldown, compDuration, compStatMul, growthOf, skillInterval, skillUnlocked, teamOf } from '@/data/companionGrowth';
import { OFFLINE, canClaimLogin, claimLogin, offlineReward, type OfflineClaim, type OfflineReward } from '@/systems/Welcome';
import { WelcomeScreen } from '@/ui/WelcomeScreen';
import { TowerScreen } from '@/ui/TowerScreen';
import { TOWER, TOWER_AFFIXES, affixBonusGold, ensureWeek, floorPlan, recordFloor, reinforceMobs, startFloors, towerRng, type FloorPlan } from '@/systems/TrialTower';
import { tierForLevel } from '@/data/items';
import { localDate } from '@/systems/DailyQuests';
import { ITEM_BASES, sellPrice } from '@/data/items';
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
import { EndingScreen, type EndingInfo } from '@/ui/EndingScreen';
import { DeathScreen } from '@/ui/DeathScreen';
import { REVIVE, payRevive, reviveCost } from '@/systems/Revive';
import { applyRebirth, rebirthBlocked, rebirthExpMul } from '@/systems/Rebirth';
import { setOrientationPref } from '@/ui/landscape';
import { WeeklyScreen, type WeeklyResult } from '@/ui/WeeklyScreen';
import { WEEKLY, WEEKLY_DIFF_MAP, ensureWeeklyWeek, recordWeeklyWin, weeklyAffixMods, weeklyPick, type WeeklyDiff } from '@/systems/WeeklyBoss';
import { rollMythic } from '@/systems/GemShop';
import { addItem, autoSellPrice, itemName } from '@/systems/Inventory';
import { MAX_TIER } from '@/data/gear';
import type { EnemyDef } from '@/data/types';
import { DIVINITY, addDivExp, divinityOpen } from '@/systems/Divinity';
import { MYTHIC, mythicFirstGems, mythicFloor, mythicLevel, mythicMods, mythicOpen, mythicUnlocked } from '@/systems/Mythic';
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

/** 繼續遊戲後的無敵時間（秒）：登入的「準備出發」/ 一般暫停 */
const RESUME_GRACE = { ready: 3, pause: 1 };
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
  private welcome!: WelcomeScreen;
  private towerScreen!: TowerScreen;
  /** 進行中的試煉塔（null = 沒在挑戰） */
  private towerRun: { floor: number; start: number; level: number; boss: boolean; timer: number; between: number; best: number; gems: number; kills: number; prevBest: number; plan?: FloorPlan; regen: number; reinforce: number; affixText: string; wave: { id: string; elite: boolean }[]; waveT: number; haste: number; notes: string[]; notesT: number } | null = null;
  private towerResultPending: import('@/ui/TowerScreen').TowerResult | null = null;
  /** v1.78 每週首領挑戰 */
  private weeklyRun: { diff: WeeklyDiff; boss: Enemy; name: string; timer: number; regen: number; affixText: string } | null = null;
  private weeklyScreen!: WeeklyScreen;
  private weeklyResultPending: WeeklyResult | null = null;
  private offlinePending: OfflineReward | null = null;
  private lastDay = localDate();
  /** 破關畫面（v1.34）：首領戰紀錄 → 慢動作特寫 → 結算畫面 */
  private clearScreen!: StageClearScreen;
  private endingScreen!: EndingScreen;
  /** v1.82 倒下後的復活選擇 */
  private deathScreen!: DeathScreen;
  /** 這次進地圖後付費原地復活了幾次（越用越貴） */
  private revivesHere = 0;
  /** v1.76 破關畫面關掉後要播結局 */
  private endingPending = false;
  /** v1.77 目前地圖是神話第幾層（0 = 不是神話難度） */
  private mythicFloorNow = 0;
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
    // 離線收益：一定要在第一次存檔（會改 updatedAt）之前算
    this.offlinePending = offlineReward(this.state.level, Date.now() - (this.state.updatedAt || Date.now()), { cls: this.state.heroClass, rebirth: this.state.rebirth?.count ?? 0 });
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
    // v1.84：陰影相機也看第 1 層（場景的「只投影」合併網格放在第 1 層，主鏡頭看不到）
    sc.layers.enable(SHADOW_ONLY_LAYER);
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
      minions: () => this.minions?.list ?? [],
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
      () => (this.towerRun ? tierForLevel(this.towerRun.level) : this.mythicFloorNow || this.weeklyRun ? MAX_TIER : this.zones.current ? rollZoneTier(this.zones.current.def.id) : 1),
      () => this.onInventoryChanged(),
      (x, z) => this.zones.current?.heightAt(x, z) ?? 0,
      () => (this.mythicFloorNow ? MYTHIC.bossExtraDrops : 0),
    );
    this.auto = new AutoBattle({
      minions: this.minions,
      player: this.player,
      enemies: this.enemies,
      targets: this.targets,
      skills: this.skills,
      nearestLoot: () => this.loot.nearest(),
      dangerEscape: () => {
        // 首領戰：閃招時盡量往首領出生點（場地中央）閃，不會把戰鬥拖出場地（v1.61）
        const b = this.enemies.engagedBoss();
        return this.telegraphs.escape(this.player.pos.x, this.player.pos.z, this.player.radius + 0.4, b ? b.home : undefined);
      },
      collision: () => this.zones.current!.collision,
      level: () => this.state.level,
    });
    this.hud = new Hud(uiRoot, this.state, this.player, this.input, this.skills);
    this.watchNetwork(uiRoot);
    // v1.79 設定「畫面方向」（HUD 建好之後套用，切換時 HUD 會跟著搬元件）
    setOrientationPref(this.state.settings.orientation ?? 'auto');
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
      onRebirth: (cls) => {
        if (rebirthBlocked(this.state)) return;
        if (this.towerRun) this.endTower('leave');
        if (this.weeklyRun) this.endWeekly('leave');
        applyRebirth(this.state, cls);
        this.state.updatedAt = Date.now();
        this.resetting = true; // 不要讓離開頁面時把舊位置存回去
        this.save.save(this.state);
        skipTitleOnce();
        location.reload();
      },
      onLogin: () => void this.doLogin(),
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
      status: () => this.pauseStatus(),
      usePotion: (kind) => this.skills.usePotion(kind),
      useQuick: (i) => this.useQuickSlot(i),
    });
    bus.on('pause:toggle', () => this.setPaused(!this.paused));

    this.towerScreen = new TowerScreen(uiRoot, {
      retry: (f) => void this.startTower(f),
      toTown: () => void this.changeZone('town'),
    });
    bus.on('tower:start', ({ floor }) => void this.startTower(floor));
    this.weeklyScreen = new WeeklyScreen(uiRoot, {
      retry: (d) => void this.startWeekly(d),
      toTown: () => void this.changeZone('town'),
    });
    bus.on('weekly:start', ({ diff }) => void this.startWeekly(diff));
    this.welcome = new WelcomeScreen(uiRoot, {
      claimOffline: (double) => this.claimOffline(double),
      companions: () => teamOf(this.state.companions).map((id) => COMPANIONS[id]?.icon ?? '').join(''),
      claimLogin: () => this.doLogin(),
      gems: () => this.state.gems,
      level: () => this.state.level,
      onClose: () => this.persist(),
    });

    this.clearScreen = new StageClearScreen(uiRoot, {
      close: () => this.endClearScreen(),
      goNext: (id) => this.endClearScreen(() => void this.changeZone(id)),
      goTown: () => this.endClearScreen(() => void this.changeZone('town')),
    });
    this.endingScreen = new EndingScreen(uiRoot);
    this.deathScreen = new DeathScreen(uiRoot, {
      here: () => this.reviveHere(),
      entrance: () => this.reviveAtEntrance(),
      town: () => this.respawnAfterDeath(),
    });
    bus.on('ending:replay', () => {
      this.menu.close();
      this.endingScreen.show(this.endingInfo());
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
    bus.on('boss:roar', () => {
      this.audio.play('roar');
      this.rig.shake(0.6);
      this.haptic([60, 40, 60]);
    });
    bus.on('camera:shake', ({ power }) => {
      this.rig.shake(power);
      if (power >= 0.5) this.haptic(40);
    });
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

    // ---- 圖鑑與成就（v1.64） ----
    bus.on('enemy:killed', (k) => {
      this.onCodexKill(k.enemyId, k.boss);
      this.onCompanionKill(k.boss);
    });
    bus.on('enhance:done', ({ success }) => success && this.state.stats.enhanceOk++);
    bus.on('loot:picked', ({ base }) => base && ITEM_BASES[base]?.named && this.state.stats.mythics++);

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
    // 讀檔進到野外 / 副本：先暫停在「準備出發」畫面，讓玩家補血、換裝、看清楚周圍再開始
    // （不會一進遊戲還沒動作就被旁邊的怪打倒）；主城是安全區，直接開始
    if (!firstTime && !this.zones.current?.def.safe) {
      this.pauseScreen.setMode('ready');
      this.setPaused(true);
    }
    if (firstTime) {
      setTimeout(() => bus.emit('banner', { text: '歡迎來到赫拉斯大陸' }), 600);
      setTimeout(() => bus.emit('toast', { text: '左上角的「新手指引」會一步步帶你玩，點它可以看詳細說明', duration: 4.5 }), 3000);
    }
    this.tutorial(null); // 輪到的步驟如果已經達成（例如已在草原），直接完成
    this.guideLast = { ...this.player.pos };
    // 歡迎回來：離線收益＋每日簽到（新玩家第一次進遊戲不跳，簽到可以在「任務」領）
    if (!firstTime) this.welcome.show(this.offlinePending, canClaimLogin(this.state) ? { day: this.state.login.next, total: this.state.login.total } : null);
    else this.offlinePending = null;
  }

  /** 領離線收益（歡迎回來畫面）；double = 花鑽石領 2 倍。回傳實際拿到的東西（給畫面顯示），失敗 null */
  private claimOffline(double: boolean): OfflineClaim | null {
    const o = this.offlinePending;
    if (!o) return null;
    const s = this.state;
    if (double) {
      if (s.gems < OFFLINE.doubleCost) return null;
      s.gems -= OFFLINE.doubleCost;
    }
    const k = double ? 2 : 1;
    this.offlinePending = null;
    const got: OfflineClaim = { exp: o.exp * k, gold: o.gold * k, potions: o.potions * k, compExp: o.compExp * k, kept: [], soldCount: 0, soldGold: 0, divine: divinityOpen(s.level) };
    s.gold += got.gold;
    // 裝備：會自動賣的直接換金幣；背包滿了也換成金幣（離線收益不會不見）
    for (const d of double ? [...o.drops, ...o.bonusDrops] : o.drops) {
      const auto = autoSellPrice(s, d.base, d.rarity, s.settings.autoSell ?? 'off');
      const it = auto > 0 ? null : addItem(s, d.base, d.rarity);
      if (it) got.kept.push({ base: d.base, rarity: d.rarity });
      else {
        const price = auto || sellPrice(ITEM_BASES[d.base]?.tier ?? 1, d.rarity, 0);
        got.soldCount++;
        got.soldGold += price;
        s.gold += price;
      }
    }
    s.potions.hp += got.potions;
    s.potions.mp += got.potions;
    const c = s.companions;
    for (const id of teamOf(c)) addCompExp(growthOf(c, id), got.compExp);
    this.gainExp(got.exp);
    const bits = [`+${got.exp.toLocaleString()} ${got.divine ? '神格經驗' : '經驗'}`, `+${(got.gold + got.soldGold).toLocaleString()} 金幣`];
    if (got.kept.length) bits.push(`${got.kept.length} 件裝備`);
    if (got.potions) bits.push(`紅藍藥水各 ${got.potions}`);
    bus.emit('toast', { text: `⏳ 離線收益：${bits.join('、')}`, kind: 'reward' });
    bus.emit('player:changed');
    this.onInventoryChanged();
    this.persist();
    return got;
  }

  /** 每日簽到（歡迎回來畫面、選單「任務」） */
  doLogin(): string[] | null {
    const got = claimLogin(this.state);
    if (!got) return null;
    bus.emit('toast', { text: `📅 簽到獎勵：${got.join('、')}`, duration: 3, kind: 'reward' });
    this.onInventoryChanged();
    bus.emit('quests:changed');
    return got;
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
        this.enemies.setBlobsVisible(false);
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
    } else if (this.clearScreen.open || this.endingScreen.visible) {
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
    else {
      this.menu.close();
      // 繼續時給一點反應時間：登入的「準備出發」3 秒、一般暫停 1 秒無敵
      const ready = this.pauseScreen.mode === 'ready';
      if (!this.zones.current?.def.safe) {
        this.player.invulnerable = Math.max(this.player.invulnerable, ready ? RESUME_GRACE.ready : RESUME_GRACE.pause);
        if (ready) bus.emit('toast', { text: '出發！3 秒內無敵' });
      }
      if (ready) this.pauseScreen.setMode('pause');
    }
    this.pauseScreen.setVisible(v && !this.menu.isOpen);
  }

  private absorbNoted = false;
  /** 夥伴召喚冷卻（秒，不存檔） */
  private companionCd = 0;
  /**
   * 首領開戰：依玩家實力調整（v1.55，`systems/BossScaling.ts`）
   * - 攻擊力：和「該層標準配備（掉落階級精良 +2、首領等級）」比，玩家血多防高就提高，最多 ×3
   * - 生命：建立 BossScaler，戰鬥中依實際輸出調整到約 180 秒
   */
  /** 神話難度：一隻敵人的換算（生成時呼叫；重生、脫戰會回到 baseHpMul / baseAtkMul） */
  private mythicSpawn(ed: EnemyDef, floor: number) {
    const m = mythicMods(ed, floor);
    return {
      level: m.level,
      defense: m.defense,
      apply: (e: Enemy) => {
        e.baseHpMul = m.hpMul;
        e.baseAtkMul = m.atkMul;
        e.expMul = m.expMul;
        e.goldMul = m.goldMul;
        e.resetScaling();
        e.hp = e.maxHp;
      },
    };
  }

  private scaleBoss(e: Enemy) {
    const s = this.state;
    const tier = lootTierOf(s.zoneId);
    const equipment: GameState['equipment'] = {};
    for (const slot of SLOT_ORDER) equipment[slot] = { uid: -1, base: `${slot}_t${tier}`, rarity: 'fine', plus: 2 };
    const ref = computeStats({ level: Math.max(1, e.def.level), heroClass: s.heroClass, equipment, inventory: [], nextUid: 0 } as never);
    e.atkMul = bossAtkMul(e.def.stats.atk, this.player.stats, ref);
    e.scaler = new BossScaler(e.def.stats.maxHp);
    // 開戰先依「每下期望傷害」預估生命（血條百分比不變），之後每秒依實際輸出微調
    const mul = bossInitialHpMul(this.player.stats, ref, e.defense);
    const frac = e.hp / e.maxHp;
    e.maxHp = e.def.stats.maxHp * mul;
    e.hp = e.maxHp * frac;
    this.absorbNoted = false;
  }

  /** 暫停 / 準備出發畫面上的狀態 */
  private pauseStatus(): PauseStatus {
    const p = this.player;
    const s = this.state;
    let nearby = 0;
    let bossNear = false;
    for (const e of this.enemies.enemies) {
      if (!e.alive || Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > 14) continue;
      nearby++;
      if (e.def.boss) bossNear = true;
    }
    return {
      place: this.mythicFloorNow ? `🔥神話・${zoneLabel(s.zoneId)}` : zoneLabel(s.zoneId),
      level: s.level,
      className: CLASSES[s.heroClass]?.name ?? '法師',
      playTime: s.stats.playTime,
      kills: s.stats.kills,
      hp: p.hp,
      maxHp: p.stats.maxHp,
      mp: p.mp,
      maxMp: p.stats.maxMp,
      mpLabel: this.usesRage ? '怒氣' : 'MP',
      nearby,
      bossNear,
      safe: !!this.zones.current?.def.safe,
      potions: { ...s.potions },
      quick: s.quickSlots.map((id) => {
        const d = id ? CONSUMABLE_MAP[id] : undefined;
        return d ? { icon: d.icon, name: d.name, count: s.consumables[id!] ?? 0 } : null;
      }),
      potionCd: this.skills.potionCd > 0,
    };
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

  private endClearScreen(after?: () => void) {
    this.clearScreen.hide();
    // v1.76 第一次打倒最終首領：破關畫面之後播結局（特寫鏡頭留著當背景）
    if (this.endingPending) {
      this.endingPending = false;
      this.state.endingSeen = true;
      this.persist();
      this.endingScreen.show(this.endingInfo(), () => {
        this.restoreShowcase();
        after?.();
      });
      return;
    }
    this.restoreShowcase();
    after?.();
  }

  /** 結局畫面要的冒險紀錄 */
  private endingInfo(): EndingInfo {
    const s = this.state;
    return {
      heroClass: s.heroClass,
      playerName: s.playerName,
      level: s.level,
      playTime: s.stats.playTime,
      kills: s.stats.kills,
      deaths: s.stats.deaths,
      bossKills: s.stats.bossKills,
      companions: s.companions.owned.length,
      mythics: s.stats.mythics,
      towerBest: s.tower.best,
    };
  }

  /** 關掉破關特寫：鏡頭回來、名牌與敵人顯示 */
  private restoreShowcase() {
    this.rig.setCinematic(false);
    for (const o of this.hiddenSprites) o.visible = true;
    this.hiddenSprites = [];
    this.enemies.setBlobsVisible(true);
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
    // v1.54：選單開著（換裝、用道具、看地圖）時世界停住，敵人不會趁機攻擊
    if (this.menu.isOpen) {
      this.input.clearPressed();
      this.input.endFrame();
      return;
    }
    const canAct = !this.transitioning && this.player.alive;

    const collision = this.zones.current!.collision;
    const pushOut = (pos: { x: number; z: number }, r: number) => this.enemies.pushOut(pos, r);
    this.skills.update(dt * (1 + (this.cbuff.cdr?.v ?? 0))); // 道具「冷卻快 30%」
    this.counterTimer = Math.max(0, this.counterTimer - dt);
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.afterDeath();
    }
    this.deathScreen.update(dt, !this.zones.current?.def.safe);
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
    // v1.82 倒下後等玩家選復活方式：怪物的 AI 先停住（首領不脫戰、不回血），原地復活時戰場跟倒下時一樣
    this.enemies.update(dt, this.rig.camera, this.player.alive ? this.aiCtx : undefined);
    // 首領戰紀錄：開戰時開始計時；首領脫戰回家就作廢（擊敗時在 onBossDefeated 結算）
    const eb = this.enemies.engagedBoss();
    if (eb && !this.bossFight && !this.towerRun && !this.weeklyRun) {
      this.bossFight = { zoneId: this.state.zoneId, start: this.state.stats.playTime, skillHits: 0, hits: 0, itemsAtStart: this.itemCount() };
      // 神話難度的首領不自動調整強度（跟試煉塔一樣）
      if (!this.mythicFloorNow) this.scaleBoss(eb);
    } else if (!eb && this.bossFight && !this.clearSeq) this.bossFight = null;
    // 首領強度自動調整：每秒依實際輸出調整生命（目標 180 秒、最快 150 秒）
    if (eb?.scaler) {
      eb.scaler.update(dt, eb);
      if (eb.scaler.absorbed > 0 && !this.absorbNoted) {
        this.absorbNoted = true;
        bus.emit('toast', { text: '首領的神力擋下了過強的攻擊（首領戰最快約 150 秒）', duration: 3 });
      }
    }
    this.minions.update(dt, this.rig.camera);
    this.companionCd = Math.max(0, this.companionCd - dt);
    this.updateCompanionSkills(dt);
    this.updateTower(dt);
    this.updateWeekly(dt);
    if (this.player.alive) this.bosses.update(dt, this.enemies.enemies);
    this.telegraphs.update(dt);
    this.effects.update(dt);
    this.loot.update(dt);
    this.state.stats.playTime += dt;
    this.achCheck -= dt;
    if (this.achCheck <= 0) {
      this.achCheck = 1;
      this.checkAchievements();
    }
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
      this.audio.setBossIntensity(boss.hp < boss.maxHp * 0.5 ? 1 : 0);
    } else this.audio.setMusic(zoneNow.def.music ?? ({ town: 'town', field: 'grassland', dungeon: 'dungeon' } as const)[zoneNow.def.kind]);
    if (this.state.settings.showFps) this.hud.debugInfo = `${this.renderer.info.render.calls} DC・畫質${this.quality.label}`;
    this.hud.setBuffs(this.buffList());
    this.refreshCompanionHud();
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
    if (this.input.consume('item1')) this.useQuickSlot(0);
    if (this.input.consume('item2')) this.useQuickSlot(1);
    if (this.input.consume('companion')) this.summonCompanion();
    // AUTO：首領戰中夥伴冷卻好就自動召喚
    else if (this.auto.on && this.companionCd <= 0 && teamOf(this.state.companions).length && this.enemies.engagedBoss()) this.summonCompanion(true);
    this.autoPotion();
  }

  /** 夥伴（主力或支援）是否有任何一隻在場上 */
  private companionLive(): boolean {
    return teamOf(this.state.companions).some((id) => this.minions.count(COMPANIONS[id].minion) > 0);
  }

  private refreshCompanionHud() {
    const c = this.state.companions;
    const team = teamOf(c);
    const def = team[0] ? COMPANIONS[team[0]] : undefined;
    const sub = team[1] ? COMPANIONS[team[1]] : undefined;
    const g = def ? c.growth?.[def.id] : undefined;
    this.hud.setCompanion(def?.icon ?? null, def ? `${def.name}${sub ? `＋${sub.name}` : ''}` : '', this.companionCd, compCooldown(g), this.companionLive(), sub?.icon ?? null);
  }

  /** 召喚夥伴（夥伴按鈕 / G 鍵 / AUTO 首領戰）：主力＋支援一起出場，冷卻跟著主力 */
  private summonCompanion(quiet = false) {
    const c = this.state.companions;
    const team = teamOf(c);
    const def = team[0] ? COMPANIONS[team[0]] : undefined;
    if (!def) {
      if (quiet) return;
      openCompanionView();
      bus.emit('menu:open', { tab: 'equip' });
      bus.emit('toast', { text: c.owned.length ? '先在「裝備 → 夥伴」選一隻夥伴帶著' : '還沒有夥伴：到支線地圖打倒守護者就有機會收服' });
      return;
    }
    if (this.zones.current?.def.safe) {
      if (!quiet) bus.emit('toast', { text: '主城裡很安全，不需要召喚夥伴' });
      return;
    }
    if (this.companionCd > 0) {
      if (!quiet) bus.emit('toast', { text: this.companionLive() ? `${def.name} 正在戰鬥` : `${def.name} 休息中（${Math.ceil(this.companionCd)} 秒）` });
      return;
    }
    const names: string[] = [];
    team.forEach((id, i) => {
      const d = COMPANIONS[id];
      const g = growthOf(c, id);
      this.minions.summon(d.minion, 1, { mul: compStatMul(g) * (i > 0 ? DUO.supportMul : 1), life: compDuration(g) });
      this.compSkillT.set(id, skillUnlocked(g) ? skillInterval(id, g) * (i > 0 ? 0.7 : 0.4) : 0); // 出場不久就放第一次（兩隻錯開）
      this.compRebirthUsed.delete(id);
      names.push(`${d.icon} ${d.name}（Lv.${g.lv}）`);
      if (addBond(g, GROWTH.bondSummon)) this.onBondUp(id);
    });
    this.companionCd = compCooldown(growthOf(c, def.id));
    bus.emit('toast', { text: `${names.join('、')} 前來助陣！`, duration: 2 });
    bus.emit('camera:shake', { power: 0.15 });
  }

  /** 每隻夥伴的專屬技能計時、浴火重生是否已用 */
  private compSkillT = new Map<string, number>();
  private compRebirthUsed = new Set<string>();

  /** 某隻夥伴在場上的召喚物（沒有回傳 undefined） */
  private liveCompanion(id: string) {
    const def = COMPANIONS[id];
    return def ? this.minions.list.find((m) => m.alive && m.def.id === def.minion) : undefined;
  }

  /** 夥伴養成：帶著的夥伴（主力、支援）從擊殺拿經驗；在場時打倒首領加好感 */
  private onCompanionKill(boss: boolean) {
    const c = this.state.companions;
    for (const id of teamOf(c)) {
      const def = COMPANIONS[id];
      const g = growthOf(c, id);
      const live = this.minions.count(def.minion) > 0;
      const ups = addCompExp(g, (boss ? GROWTH.bossExp : GROWTH.killExp) * (live ? GROWTH.liveMul : 1));
      if (ups) bus.emit('toast', { text: `${def.icon} ${def.name} 升到 Lv.${g.lv}！`, duration: 2.5, kind: 'reward' });
      if (boss && live && addBond(g, GROWTH.bondBoss)) this.onBondUp(id);
    }
  }

  /** 好感度升階提示 */
  private onBondUp(id: string) {
    const def = COMPANIONS[id];
    const g = growthOf(this.state.companions, id);
    const b = bondLevel(g.bond);
    const perk = b === 3 ? `，學會專屬技能「${COMPANION_SKILLS[id].name}」` : '';
    bus.emit('toast', { text: `${def.icon} ${def.name} 好感度 ${'♥'.repeat(b)}${perk}`, duration: 3, kind: 'reward' });
    if (b === 3) bus.emit('banner', { text: `${def.icon} 學會「${COMPANION_SKILLS[id].name}」` });
  }

  /** 夥伴專屬技能（♥3 解鎖；在場的夥伴各自施放） */
  private updateCompanionSkills(dt: number) {
    for (const id of teamOf(this.state.companions)) this.updateCompanionSkill(id, dt);
  }

  private updateCompanionSkill(id: string, dt: number) {
    const c = this.state.companions;
    const g = c.growth?.[id];
    if (!skillUnlocked(g)) return;
    const m = this.liveCompanion(id);
    if (!m) return;
    const sk = COMPANION_SKILLS[id];
    const p = this.player;
    const color = m.def.color;
    const label = (text: string) => bus.emit('float:text', { x: m.pos.x, y: 2.8, z: m.pos.z, text, kind: 'info' });
    if (sk.skill.kind === 'rebirth') {
      if (this.compRebirthUsed.has(id) || !p.alive || p.hp >= p.stats.maxHp * sk.skill.at) return;
      this.compRebirthUsed.add(id);
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * sk.skill.ratio);
      this.effects.pillar(p.pos.x, p.pos.z, 1.2, color, 1);
      this.effects.ring(p.pos.x, p.pos.z, 0.5, 3, color, 0.7);
      label(`🔥 ${sk.name}`);
      bus.emit('player:changed');
      return;
    }
    const t = (this.compSkillT.get(id) ?? 0) - dt;
    this.compSkillT.set(id, t);
    if (t > 0) return;
    const sx = sk.skill;
    const radius = 'radius' in sx ? sx.radius ?? 0 : 0;
    // 傷害技：附近沒有敵人就等一下再放
    if (sx.kind === 'nova' && !this.enemies.enemies.some((e) => e.alive && Math.hypot(e.pos.x - m.pos.x, e.pos.z - m.pos.z) <= radius + e.radius)) {
      this.compSkillT.set(id, 0.5);
      return;
    }
    this.compSkillT.set(id, skillInterval(id, g!));
    label(sk.name);
    switch (sx.kind) {
      case 'nova':
        damageArea(this.enemies.enemies, m.pos.x, m.pos.z, sx.radius, m.stats, sx.power, undefined, m);
        this.effects.ring(m.pos.x, m.pos.z, 0.4, sx.radius, color, 0.5);
        this.effects.pillar(m.pos.x, m.pos.z, 0.8, color, 0.5);
        bus.emit('camera:shake', { power: 0.12 });
        break;
      case 'heal':
        p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * sx.ratio);
        this.effects.ring(p.pos.x, p.pos.z, 0.4, 1.8, color, 0.6);
        if (sx.radius && sx.power) {
          damageArea(this.enemies.enemies, m.pos.x, m.pos.z, sx.radius, m.stats, sx.power, undefined, m);
          this.effects.ring(m.pos.x, m.pos.z, 0.4, sx.radius, color, 0.5);
        }
        bus.emit('player:changed');
        break;
      case 'shield':
        this.shield = { hp: Math.max(this.shield.hp, Math.round(p.stats.maxHp * sx.ratio)), t: sx.duration };
        this.effects.ring(p.pos.x, p.pos.z, 0.5, 1.6, color, 0.7);
        bus.emit('player:changed');
        break;
      case 'buff':
        this.cbuff[sx.stat] = { t: sx.duration, v: Math.max(sx.value, this.cbuff[sx.stat]?.v ?? 0) };
        this.recalcStats();
        this.effects.pillar(p.pos.x, p.pos.z, 0.8, color, 0.6);
        break;
    }
  }

  /* ======================= 無盡試煉塔（v1.70） ======================= */

  /** 開始挑戰（地圖頁、結算畫面）：進塔、從第 floor 層開始 */
  /** 每週首領挑戰（v1.78）：到試煉塔競技場單挑本週首領 */
  async startWeekly(diff: WeeklyDiff) {
    const s = this.state;
    if (!mythicOpen(s.bossesDefeated)) {
      bus.emit('toast', { text: '打倒最終首領後開放每週首領挑戰' });
      return;
    }
    ensureWeeklyWeek(s.weekly);
    this.weeklyScreen.hide();
    this.towerScreen.hide();
    this.menu.close();
    if (this.towerRun) this.endTower('leave');
    this.weeklyRun = null;
    await this.changeZone('trial_tower', ZONES.trial_tower.spawn, true);
    if (s.zoneId !== 'trial_tower') return;
    const pick = weeklyPick(s.weekly.week);
    const d = WEEKLY_DIFF_MAP[diff];
    const m = mythicMods(pick.boss, d.floor);
    const am = weeklyAffixMods(pick.affixes);
    this.enemies.clear();
    const e = this.enemies.spawnOne(pick.boss.id, 0, -6, { hpMul: m.hpMul * am.hp * d.hp, atkMul: m.atkMul * am.atk, def: Math.round(m.defense * am.def), tag: `${d.icon}${d.name}・Lv.${m.level}` });
    if (!e) return;
    e.level = m.level;
    e.baseHpMul = m.hpMul * am.hp * d.hp;
    e.baseAtkMul = m.atkMul * am.atk;
    e.expMul = m.expMul;
    e.goldMul = m.goldMul;
    e.hasteMul = am.haste;
    e.hunter = true;
    e.provoked = true;
    const affixes = pick.affixes.map((a) => TOWER_AFFIXES[a]);
    this.weeklyRun = { diff, boss: e, name: pick.boss.name, timer: WEEKLY.time, regen: am.regen, affixText: affixes.map((a) => `${a.icon}${a.name}`).join(' ') };
    this.player.hp = this.player.stats.maxHp;
    if (!this.usesRage) this.player.mp = this.player.stats.maxMp;
    bus.emit('banner', { text: `👑 每週首領・${pick.boss.name}` });
    bus.emit('toast', { text: `${d.icon} ${d.name}難度 Lv.${m.level}：${affixes.map((a) => `${a.icon}${a.name}`).join('、')}，限時 ${Math.round(WEEKLY.time / 60)} 分鐘`, duration: 3.5 });
  }

  private updateWeekly(dt: number) {
    const run = this.weeklyRun;
    if (!run) return;
    if (!run.boss.alive) {
      this.weeklyScreen.show(this.endWeekly('win'));
      return;
    }
    run.timer -= dt;
    if (run.regen > 0) run.boss.hp = Math.min(run.boss.maxHp, run.boss.hp + run.boss.maxHp * run.regen * dt);
    const t = Math.max(0, run.timer);
    const d = WEEKLY_DIFF_MAP[run.diff];
    this.hud.setTower(`👑 ${d.name}・${run.name}　⏱ ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}　${run.affixText}`, t < 30);
    if (run.timer <= 0) this.weeklyScreen.show(this.endWeekly('timeout'));
  }

  /** 結束每週挑戰：打倒的話記錄時間、發本週第一次獎勵 */
  private endWeekly(reason: WeeklyResult['reason']): WeeklyResult {
    const run = this.weeklyRun!;
    this.weeklyRun = null;
    this.hud.setTower(null);
    const s = this.state;
    const secs = Math.max(1, Math.round(WEEKLY.time - Math.max(0, run.timer)));
    const win = reason === 'win';
    let newBest = false;
    const rewards: string[] = [];
    if (win) {
      const r = recordWeeklyWin(s.weekly, run.diff, secs);
      newBest = r.newBest;
      if (r.first) {
        const d = WEEKLY_DIFF_MAP[run.diff];
        s.gems += d.gems;
        rewards.push(`💎 ${d.gems}`);
        for (let i = 0; i < d.gear; i++) {
          const id = rollMythic(s, Math.random);
          const it = id ? addItem(s, id, d.rarity) : null;
          if (it) rewards.push(`★${itemName(it)}`);
          else {
            s.gems += 15;
            rewards.push('💎 15（背包滿了，改給鑽石）');
          }
        }
        this.onInventoryChanged();
      }
      bus.emit('banner', { text: `打倒每週首領・${run.name}！` });
      this.quest({ type: 'weekly' });
    } else {
      // 沒打倒：首領移除（失敗不給獎勵；倒下、離開的話換地圖也會清掉）
      this.enemies.clear();
    }
    this.persist();
    return { win, reason, diff: run.diff, bossName: run.name, secs, best: s.weekly.best[run.diff], newBest, rewards };
  }

  async startTower(floor: number) {
    const s = this.state;
    if (!s.bossesDefeated.includes(TOWER.unlockAfter)) {
      bus.emit('toast', { text: '擊敗第三層首領後開放無盡試煉塔' });
      return;
    }
    ensureWeek(s.tower);
    if (!startFloors(s.tower.best).includes(floor)) floor = 1;
    this.towerScreen.hide();
    this.weeklyScreen.hide();
    this.menu.close();
    if (this.weeklyRun) this.endWeekly('leave');
    this.towerRun = null;
    await this.changeZone('trial_tower', ZONES.trial_tower.spawn, true);
    if (this.state.zoneId !== 'trial_tower') return;
    s.tower.runs++;
    this.towerRun = { floor, start: floor, level: 0, boss: false, timer: 0, between: 0, best: floor - 1, gems: 0, kills: 0, prevBest: s.tower.best, regen: 0, reinforce: 0, affixText: '', wave: [], waveT: 0, haste: 1, notes: [], notesT: 0 };
    this.player.hp = this.player.stats.maxHp;
    if (!this.usesRage) this.player.mp = this.player.stats.maxMp;
    this.spawnTowerFloor();
  }

  private spawnTowerFloor() {
    const run = this.towerRun!;
    ensureWeek(this.state.tower);
    // 每週固定：同一週同一層，大家的怪和詞綴都一樣
    const plan = floorPlan(run.floor, towerRng(this.state.tower.week, run.floor));
    run.plan = plan;
    run.level = plan.level;
    run.boss = plan.boss;
    run.timer = plan.timeLimit;
    run.between = 0;
    run.reinforce = 0;
    const affixes = plan.affixes.map((a) => TOWER_AFFIXES[a]);
    run.regen = affixes.reduce((r, a) => r + (a.regen ?? 0), 0);
    const haste = affixes.reduce((m, a) => m * (a.haste ?? 1), 1);
    run.affixText = affixes.map((a) => `${a.icon}${a.name}`).join(' ');
    this.enemies.clear();
    run.haste = haste;
    // 出場名單（詞綴「菁英」：第一隻變成菁英）；一般層分兩波，第一波 60%
    const list: { id: string; elite: boolean }[] = [];
    for (const g of plan.groups) for (let k = 0; k < g.count; k++) list.push({ id: g.id, elite: list.length === 0 && !plan.boss && affixes.some((a) => a.elite) });
    const first = plan.boss ? list.length : Math.max(3, Math.ceil(list.length * TOWER.firstWave));
    run.wave = list.slice(first);
    run.waveT = TOWER.secondWaveAt;
    this.spawnTowerMobs(list.slice(0, first), plan.boss ? 'boss' : 'front');
    // 詞綴「神眷」：你這層攻擊提高
    const bless = affixes.reduce((v, a) => Math.max(v, a.blessAtk ?? 0), 0);
    if (bless) {
      this.cbuff.atk = { t: plan.timeLimit, v: Math.max(bless, this.cbuff.atk?.v ?? 0) };
      this.recalcStats();
    }
    const title = plan.boss ? `🗼 第 ${run.floor} 層・首領戰` : `🗼 第 ${run.floor} 層`;
    bus.emit('banner', { text: run.affixText ? `${title}　${run.affixText}` : title });
    // 詞綴說明等開場橫幅消失後再提示，避免和橫幅疊在一起
    run.notes = affixes.map((a) => `${a.icon} ${a.name}：${a.desc}`);
    run.notesT = 1.8;
    if (plan.boss) bus.emit('camera:shake', { power: 0.2 });
  }

  /** 生出一批塔裡的敵人：首領在北邊中央；第一波排成半圓；第二波從場地兩側進場 */
  private spawnTowerMobs(list: { id: string; elite: boolean }[], where: 'boss' | 'front' | 'flank') {
    const run = this.towerRun!;
    const plan = run.plan!;
    list.forEach((m, i) => {
      const n = list.length;
      let x = 0;
      let z = -6;
      if (where === 'front') {
        const a = Math.PI + (n > 1 ? (i / (n - 1) - 0.5) * 2.4 : 0);
        const r = 8 + (i % 2) * 2;
        x = Math.sin(a) * r;
        z = Math.cos(a) * r;
      } else if (where === 'flank') {
        x = (i % 2 ? 1 : -1) * 11;
        z = -4 + Math.floor(i / 2) * 3;
      }
      const e = this.enemies.spawnOne(m.id, x, z, {
        hpMul: plan.hpMul * (m.elite ? 3 : 1),
        atkMul: plan.atkMul * (m.elite ? 1.4 : 1),
        def: plan.defense,
        tag: where === 'boss' ? `第 ${run.floor} 層首領` : m.elite ? `👑菁英・Lv.${plan.level}` : `Lv.${plan.level}`,
      });
      if (!e) return;
      if (m.elite) e.object.scale.multiplyScalar(1.3);
      e.provoked = true; // 一出場就衝過來
      e.hunter = true; // 不會脫戰回家（以前跑太遠會回家回滿血，清場很慢）
      e.hasteMul = run.haste;
    });
  }

  /** 試煉塔詞綴：再生、首領援軍（每幀） */
  private towerAffixTick(dt: number) {
    const run = this.towerRun!;
    const plan = run.plan;
    if (!plan) return;
    if (run.notes.length && (run.notesT -= dt) <= 0) {
      for (const text of run.notes) bus.emit('toast', { text, duration: 3 });
      run.notes = [];
    }
    if (run.wave.length) {
      run.waveT -= dt;
      const alive = this.enemies.enemies.filter((e) => e.alive).length;
      if (run.waveT <= 0 || alive <= 2) {
        this.spawnTowerMobs(run.wave, 'flank');
        run.wave = [];
        bus.emit('toast', { text: '第二波敵人從兩側進場！', duration: 1.6 });
      }
    }
    if (run.regen > 0) {
      // 首領只回 1/4（模擬：鐵壁＋再生的首領回血比大部分職業的輸出還快）
      for (const e of this.enemies.enemies) if (e.alive) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * run.regen * (e.def.boss ? 0.25 : 1) * dt);
    }
    if (plan.boss && plan.affixes.includes('reinforce') && run.reinforce < 2) {
      const boss = this.enemies.enemies.find((e) => e.alive && e.def.boss);
      const frac = boss ? boss.hp / boss.maxHp : 1;
      if (boss && frac <= (run.reinforce === 0 ? 0.6 : 0.3)) {
        run.reinforce++;
        const ids = reinforceMobs(plan.level, towerRng(`${this.state.tower.week}+${run.reinforce}`, run.floor));
        ids.forEach((id, i) => {
          const a = (i / ids.length) * Math.PI * 2;
          const m = this.enemies.spawnOne(id, boss.pos.x + Math.cos(a) * 3, boss.pos.z + Math.sin(a) * 3, { hpMul: TOWER.mobHp, atkMul: 1, def: plan.defense, tag: `援軍・Lv.${plan.level}` });
          if (m) {
            m.provoked = true;
            m.hunter = true;
          }
        });
        bus.emit('toast', { text: '📯 首領叫來了援軍！', duration: 2 });
        bus.emit('camera:shake', { power: 0.15 });
      }
    }
  }

  private updateTower(dt: number) {
    const run = this.towerRun;
    if (!run) {
      this.hud.setTower(null);
      return;
    }
    const alive = this.enemies.enemies.filter((e) => e.alive).length;
    if (run.between > 0) {
      run.between -= dt;
      this.hud.setTower(`🗼 第 ${run.floor} 層・準備中…`);
      if (run.between <= 0) {
        run.floor++;
        this.spawnTowerFloor();
      }
      return;
    }
    if (!this.player.alive) return;
    run.timer -= dt;
    this.towerAffixTick(dt);
    const left = alive + run.wave.length;
    this.hud.setTower(`🗼 第 ${run.floor} 層${run.boss ? '・首領' : ''}${run.affixText ? ` ${run.affixText}` : ''}　⏱ ${Math.max(0, Math.ceil(run.timer))} 秒　剩 ${left} 隻`, run.timer < 10);
    if (left === 0) {
      // 過關：記錄、回一點血，準備上樓
      const s = this.state;
      const gems = recordFloor(s.tower, run.floor);
      run.best = run.floor;
      if (gems) {
        s.gems += gems;
        run.gems += gems;
        bus.emit('toast', { text: `💎 本週首次打過第 ${run.floor} 層：+${gems} 鑽石`, kind: 'reward' });
      }
      const bonus = run.plan ? affixBonusGold(run.plan) : 0;
      if (bonus) {
        s.gold += bonus;
        bus.emit('toast', { text: `🗼 詞綴層通過：+${bonus.toLocaleString()} 金幣`, kind: 'reward' });
      }
      const p = this.player;
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * TOWER.healOnClear);
      run.between = TOWER.between;
      this.quest({ type: 'tower' });
      bus.emit('player:changed');
      bus.emit('toast', { text: `第 ${run.floor} 層通過！`, duration: 1.6 });
      return;
    }
    if (run.timer <= 0) this.towerScreen.show(this.endTower('timeout'));
  }

  /** 結束挑戰：寫紀錄、清場，回傳結算資料 */
  private endTower(reason: 'dead' | 'timeout' | 'leave'): import('@/ui/TowerScreen').TowerResult {
    const run = this.towerRun!;
    const t = this.state.tower;
    this.towerRun = null;
    this.hud.setTower(null);
    if (reason !== 'leave') {
      for (const e of this.enemies.enemies) e.dispose();
      this.enemies.enemies = [];
    }
    this.persist();
    // 登入雲端的話順便更新排行（本週試煉塔層數），失敗不影響遊戲
    if (this.cloud.loggedIn && run.best >= run.start) void this.cloud.submitScore(this.state).catch(() => {
      this.cloudPending = true; // 離線：連上網路時補傳
    });
    return {
      cleared: run.best >= run.start ? run.best : 0,
      startFloor: run.start,
      reason,
      best: t.best,
      weekBest: t.weekBest,
      newBest: t.best > run.prevBest,
      gems: run.gems,
      kills: run.kills,
      starts: startFloors(t.best),
    };
  }

  /** 快捷道具欄（左下第 3、4 格；電腦 3、4）：空格或用完 → 打開「裝備 → 道具」去設定 / 購買 */
  private useQuickSlot(i: number) {
    const id = this.state.quickSlots[i];
    if (!id) {
      openItemsView();
      bus.emit('menu:open', { tab: 'equip' });
      bus.emit('toast', { text: '在道具清單按「③」「④」把道具放進快捷欄' });
      return;
    }
    if (this.useConsumable(id)) bus.emit('player:changed');
  }

  private potionOutWarned = false;
  /** 自動補血：HP 低於設定比例（預設 70%）就喝紅藥水；主城不喝 */
  private autoPotion() {
    const p = this.player;
    if (!p.alive || this.zones.current?.def.safe) return;
    const at = this.state.settings.autoPotionAt || (this.auto.on ? AUTO_HP_POTION : 0);
    if (at <= 0 || p.hp >= p.stats.maxHp * at) return;
    if (this.state.potions.hp <= 0) {
      if (!this.potionOutWarned) {
        this.potionOutWarned = true;
        bus.emit('toast', { text: '紅藥水用完了，無法自動補血（可到主城道具店購買）' });
      }
      return;
    }
    this.potionOutWarned = false;
    this.skills.usePotion('hp', true);
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
    if (cb.crit) p.stats.critRate = Math.min(CRIT_RATE_MAX, p.stats.critRate + cb.crit.v);
    if (cb.pen) p.stats.pen = Math.min(0.9, p.stats.pen + cb.pen.v);
    if (cb.critDmg) p.stats.critDmg = Math.min(CRIT_DMG_MAX, p.stats.critDmg + cb.critDmg.v);
    p.hp = Math.min(p.stats.maxHp, Math.round(p.stats.maxHp * hpR));
    p.mp = Math.min(p.stats.maxMp, Math.round(p.stats.maxMp * mpR));
    bus.emit('player:changed');
  }

  private devPen: number | null = null;
  /** 離線期間該上傳但沒上傳（連上網路時補傳） */
  private cloudPending = false;

  /** v1.85 離線遊玩：畫面上方的「離線中」標籤、斷線 / 連線提示、連線後補傳雲端存檔與成績 */
  private watchNetwork(uiRoot: HTMLElement) {
    // 標籤掛在金幣 / 鑽石那一列最後面（直式、橫式都跟著走，不會蓋到其他元件）
    const chip = document.createElement('span');
    chip.className = 'net-off';
    chip.textContent = '📴 離線';
    chip.title = '沒有網路：進度存在這台裝置，連上網路後自動同步雲端';
    chip.hidden = navigator.onLine !== false;
    (uiRoot.querySelector('.wallet') ?? uiRoot).appendChild(chip);
    window.addEventListener('offline', () => {
      chip.hidden = false;
      bus.emit('toast', { text: '📴 沒有網路：可以繼續玩，進度存在這台裝置；連上後會自動同步雲端', duration: 3.5 });
    });
    window.addEventListener('online', () => {
      chip.hidden = true;
      const pending = this.cloudPending;
      bus.emit('toast', { text: pending ? '📶 已連上網路，正在同步雲端存檔' : '📶 已連上網路', duration: 2.5 });
      if (pending) this.cloudAutoUpload();
    });
  }

  /** 自動上傳（已登入且開啟自動）；失敗靜默，衝突時提示到設定頁處理 */
  private cloudAutoUpload() {
    const acc = this.cloud.account;
    if (!acc || acc.auto === false) return;
    this.persist();
    // v1.85 離線：先記著，連上網路時（online 事件）再上傳
    if (navigator.onLine === false) {
      this.cloudPending = true;
      return;
    }
    this.cloudPending = false;
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
    s.stats.itemsUsed++;
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
      case 'roar':
        this.skills.wildRoar(e.duration);
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
    this.tutorial({ type: 'item' });
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
    if (p.wildRoarT > 0) out.push({ icon: '🦁', label: '野性咆哮', t: p.wildRoarT });
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

  private achCheck = 2;

  /** 圖鑑記一筆；升星時提示，並重算屬性（圖鑑加成） */
  private onCodexKill(id: string, boss: boolean) {
    const s = this.state;
    if (boss) s.stats.bossKills++;
    const stars = recordKill(s.codex, id);
    if (!stars) return;
    const e = codexEntry(id)!;
    bus.emit('toast', { text: stars === 1 ? `📖 圖鑑新發現：${e.name}` : `📖 圖鑑 ${e.name} 升到 ${'★'.repeat(stars)}`, duration: 2.2, kind: 'reward' });
    this.recalcStats();
  }

  /** 每秒檢查一次有沒有新達成的成就 */
  private checkAchievements() {
    const today = localDate();
    if (today !== this.lastDay) {
      this.lastDay = today;
      ensureToday(this.state);
      bus.emit('quests:changed'); // 過了午夜：新的每日任務與簽到
    }
    const done = newlyDone(this.state);
    if (!done.length) return;
    const text = done.length === 1 ? `🏆 成就達成：${done[0].name}（選單「收藏」領取 ${done[0].gems}💎）` : `🏆 達成 ${done.length} 個成就！到選單「收藏」領取獎勵`;
    bus.emit('toast', { text, duration: 3.5, kind: 'reward' });
    if (done.length === 1) bus.emit('banner', { text: `🏆 ${done[0].name}` });
    bus.emit('quests:changed');
  }

  /** 推進每日任務 */
  quest(ev: QuestEvent) {
    if (!this.state.daily) return;
    const done = progressQuests(this.state.daily, ev);
    this.state.stats.questsDone += done.length;
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
    // v1.83 轉生：打怪經驗加成
    const exp = Math.round(expForKill(k.exp, s.level, k.level) * (s.boosts.exp > 0 ? 1.3 : 1) * rebirthExpMul(s.rebirth?.count ?? 0));
    const gold = Math.round(rollGold(k.gold) * (s.boosts.gold > 0 ? 1.5 : 1));
    const tower = !!this.towerRun;
    // 試煉塔的首領：不跳破關畫面、不給首領鑽石（塔有自己的每週鑽石）
    const gems = tower ? 0 : k.gems;
    if (tower) this.towerRun!.kills++;
    if (k.boss && !tower && !this.weeklyRun) this.onBossDefeated(k.name, exp, gold, k.gems);
    if (exp <= 0 && gold <= 0) return;
    s.gold += gold;
    s.stats.goldEarned += gold;
    s.gems += gems;
    if (gold > 0) this.quest({ type: 'gold', amount: gold });
    if (gold > 0) bus.emit('float:text', { x: k.x, y: 1.4, z: k.z, text: `+${gold} 金幣`, kind: 'gold' });
    if (exp > 0) bus.emit('float:text', { x: this.player.pos.x, y: 2.6, z: this.player.pos.z, text: `+${exp} EXP`, kind: 'exp' });
    if (gems > 0) bus.emit('toast', { text: `💎 獲得 ${gems} 鑽石`, kind: 'reward' });
    this.gainExp(exp);
  }

  /** 加經驗，處理升級（回滿血、特效、升級事件） */
  private gainExp(exp: number) {
    const s = this.state;
    // v1.76 滿級後：經驗改累積神格等級
    if (divinityOpen(s.level)) {
      this.gainDivinity(exp);
      return;
    }
    const r = addExp(s.level, s.exp, exp);
    s.exp = r.exp;
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

  /** 神格經驗（v1.76）：升級給點數與鑽石 */
  private gainDivinity(exp: number) {
    const s = this.state;
    const ups = addDivExp(s.divinity, exp);
    if (ups > 0) {
      s.gems += ups * DIVINITY.gems;
      const { x, z } = this.player.pos;
      this.effects.pillar(x, z, 1.3, 0xb48cff, 1.3);
      this.effects.ring(x, z, 0.5, 3.8, 0xe2d2ff, 0.8);
      bus.emit('banner', { text: `神格提升！ 神格 Lv.${s.divinity.lv}` });
      bus.emit('toast', { text: `✨ 神格點數 +${ups}、💎 +${ups * DIVINITY.gems}（選單「裝備」分配）`, duration: 3, kind: 'reward' });
      this.player.cheer();
      bus.emit('player:levelup', { level: s.level });
      this.persist();
    }
    bus.emit('player:changed');
  }

  /** 擊敗首領：記錄、解鎖下一層，進入破關特寫與破關畫面 */
  private onBossDefeated(name: string, exp: number, gold: number, gems: number) {
    const s = this.state;
    const zoneId = s.zoneId;
    const mythic = this.mythicFloorNow;
    // v1.77 神話難度：紀錄另外存、第一次打倒有鑽石、開放下一層神話
    const mythicFirst = mythic > 0 && !(s.mythic.clears[zoneId]?.count ?? 0);
    const first = !mythic && !s.bossesDefeated.includes(zoneId);
    if (!s.bossesDefeated.includes(zoneId)) s.bossesDefeated.push(zoneId);
    const idx = DUNGEON_ORDER.indexOf(zoneId);
    const next = idx >= 0 ? DUNGEON_ORDER[idx + 1] : undefined;
    const allDone = first && idx === DUNGEON_ORDER.length - 1;
    // 結局：最終首領、還沒看過（舊存檔打倒過也沒看過，再打一次就會播）
    if (!mythic && idx === DUNGEON_ORDER.length - 1 && !s.endingSeen) this.endingPending = true;
    if (mythic) this.quest({ type: 'mythic' });
    if (mythicFirst) {
      const g = mythicFirstGems(mythic);
      s.gems += g;
      bus.emit('toast', { text: `🔥 第一次打倒神話第 ${mythic} 層首領：+${g}💎${next ? '，開放下一層神話' : '——神話難度全部制霸！'}`, duration: 3.5, kind: 'reward' });
    }
    // 支線：打倒守護者擲收服（v1.58）；主線：第一次擊敗時開放對應的支線地圖
    const guardian = ZONES[zoneId]?.side?.guardian;
    const comp = guardian ? companionOfGuardian(guardian) : undefined;
    let capture: ClearInfo['capture'];
    if (comp) {
      const result = tryCapture(s.companions, comp.id);
      capture = { result, name: comp.name, icon: comp.icon, left: pityLeft(s.companions, comp.id) };
      if (result === 'captured') bus.emit('toast', { text: `${comp.icon} 收服了 ${comp.name}！`, kind: 'reward' });
      if (result === 'owned') {
        // 再次打倒已收服的守護者：那隻夥伴拿經驗與好感（不用帶著也算）
        const g = growthOf(s.companions, comp.id);
        const ups = addCompExp(g, GROWTH.repeatExp);
        const bondUp = addBond(g, GROWTH.repeatBond);
        bus.emit('toast', { text: `${comp.icon} ${comp.name} 認出了你：經驗 +${GROWTH.repeatExp}、好感 +${GROWTH.repeatBond}${ups ? `（Lv.${g.lv}）` : ''}`, duration: 3, kind: 'reward' });
        if (bondUp) this.onBondUp(comp.id);
      }
    }
    const sideUnlocked = first ? [...SIDE_ORDER.filter((id) => ZONES[id].side!.unlockAfter === zoneId), ...BEAST_ORDER.filter((id) => ZONES[id].beast!.unlockAfter === zoneId)] : [];
    // v1.86 神獸討伐：第一次打倒額外鑽石
    const beastGems = first ? beastBonus(zoneId) : 0;
    if (beastGems) {
      s.gems += beastGems;
      bus.emit('toast', { text: `⚔ 第一次討伐${name}：+${beastGems}💎（神獸討伐 ${beastsDone(s.bossesDefeated)} / ${BEAST_ORDER.length}）`, duration: 3.5, kind: 'reward' });
    }
    bus.emit('banner', { text: `擊敗${name}！` });
    bus.emit('boss:defeated', { zoneId, first });
    // 結算（沒有開戰紀錄時——例如一擊必殺——當作 1 秒）
    const now = s.stats.playTime;
    const fight = this.bossFight?.zoneId === zoneId ? this.bossFight : { zoneId, start: now - 1, skillHits: 0, hits: 0, itemsAtStart: this.itemCount() };
    this.bossFight = null;
    const result = finishClear(mythic ? s.mythic.clears : s.clears, fight, now, this.itemCount());
    this.clearSeq = {
      t: 1.5,
      info: {
        result,
        heroClass: s.heroClass,
        playerName: s.playerName,
        bossName: name,
        exp,
        gold,
        gems: gems + beastGems,
        unlocked: first || mythicFirst ? next : undefined,
        mythic: mythic || undefined,
        allDone,
        next: next && isZoneUnlocked(s, next) && (!mythic || mythicUnlocked(s.mythic, mythic + 1)) ? next : undefined,
        sideUnlocked,
        capture,
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
    const res = calcDamage({ atk: e.def.stats.atk * e.atkMul, pen: 0, critRate: 0.05, critDmg: 1.5 }, power, m.stats.def);
    // 守護者夥伴：首領打牠也算屬性相剋
    m.takeDamage(Math.max(1, Math.round(res.amount * elementMul(e.def.element, m.element))));
  }

  private hitPlayer(e: Enemy, power: number) {
    const p = this.player;
    if (this.clearSeq) return; // 破關慢動作中不受傷
    if (this.bossFight && e.def.boss && p.invulnerable <= 0) {
      this.bossFight.hits++;
      if (power !== 1) this.bossFight.skillHits++;
    }
    const res = calcDamage({ atk: e.def.stats.atk * e.atkMul, pen: 0, critRate: 0.05, critDmg: 1.5 }, power, p.stats.def);
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
    this.deathGoldLost = this.towerRun || this.weeklyRun ? 0 : Math.floor(this.state.gold * DEATH_GOLD_PENALTY);
    if (this.towerRun) this.towerResultPending = this.endTower('dead');
    if (this.weeklyRun) this.weeklyResultPending = this.endWeekly('dead');
    // 金幣等選了復活方式才扣（原地復活不扣）
    bus.emit('banner', { text: '你被擊敗了…' });
  }

  /** 倒地動畫結束：試煉塔 / 每週挑戰 / 安全區直接回主城結算，其他地方讓玩家選復活方式 */
  private afterDeath() {
    if (this.towerResultPending || this.weeklyResultPending || this.zones.current?.def.safe) {
      this.respawnAfterDeath();
      return;
    }
    const s = this.state;
    const boss = this.enemies.engagedBoss() ?? (this.bossFight ? this.enemies.enemies.find((e) => e.def.boss && e.alive) : undefined);
    this.deathScreen.show({
      place: this.mythicFloorNow ? `🔥神話・${zoneLabel(s.zoneId)}` : zoneLabel(s.zoneId),
      cost: reviveCost(s.revive, this.revivesHere),
      gems: s.gems,
      goldLoss: this.deathGoldLost,
      entrance: true,
      bossPct: boss ? Math.max(1, Math.round((boss.hp / boss.maxHp) * 100)) : undefined,
      autoSecs: this.auto.on ? REVIVE.autoSecs : undefined,
    });
  }

  /** 原地復活：不扣金幣，花鑽石（每天第一次免費），幾秒無敵 */
  private reviveHere() {
    const s = this.state;
    const cost = reviveCost(s.revive, this.revivesHere);
    if (!payRevive(s.revive, s, this.revivesHere)) {
      bus.emit('toast', { text: `鑽石不夠（需要 ${cost}💎）` });
      this.afterDeath();
      return;
    }
    if (cost > 0) this.revivesHere++; // 免費那次不算，付費的第一次是基本價
    this.deathGoldLost = 0;
    this.player.revive();
    this.player.invulnerable = REVIVE.invuln;
    this.skills.reset();
    const { x, z } = this.player.pos;
    this.effects.pillar(x, z, 1.2, 0xffe9a0, 1.2);
    this.effects.ring(x, z, 0.5, 4, 0xfff4c0, 0.8);
    bus.emit('toast', { text: cost ? `✨ 原地復活（-${cost}💎），${REVIVE.invuln} 秒無敵` : `✨ 原地復活（今天的免費次數），${REVIVE.invuln} 秒無敵`, duration: 2.6 });
    this.persist();
    bus.emit('player:changed');
  }

  /** 在這張地圖的入口復活：扣金幣（跟回主城一樣），怪物維持原狀 */
  private reviveAtEntrance() {
    const lost = this.deathGoldLost;
    this.state.gold -= lost;
    this.deathGoldLost = 0;
    const zone = this.zones.current!;
    const at = zone.def.spawn;
    this.player.revive();
    this.skills.reset();
    this.player.groundY = zone.heightAt(at.x, at.z);
    this.player.teleport(at.x, at.z);
    this.rig.snapTo(at.x, at.z);
    bus.emit('toast', { text: lost > 0 ? `在入口復活，損失 ${lost} 金幣` : '在入口復活', duration: 2.6 });
    this.persist();
    bus.emit('player:changed');
  }

  private respawnAfterDeath() {
    this.deathScreen.hide();
    const lost = this.deathGoldLost;
    this.state.gold -= lost;
    this.deathGoldLost = 0;
    this.enterZone('town', ZONES.town.spawn);
    this.player.revive();
    this.skills.reset();
    this.persist();
    bus.emit('toast', { text: lost > 0 ? `在主城復活，損失 ${lost} 金幣` : '在主城復活', duration: 2.6 });
    if (this.weeklyResultPending) {
      this.weeklyScreen.show(this.weeklyResultPending);
      this.weeklyResultPending = null;
    }
    if (this.towerResultPending) {
      this.towerScreen.show(this.towerResultPending);
      this.towerResultPending = null;
    }
    bus.emit('player:changed');
  }

  /** 測試用：以固定 1/60 秒步進快轉遊戲時間（不渲染） */
  debugAdvance(seconds: number, step = 1 / 60) {
    const steps = Math.round(seconds / step);
    for (let i = 0; i < steps; i++) this.tick(step);
  }


  /**
   * 太陽跟著畫面走。v1.81：陰影範圍不再固定 60×60 公尺，改成「畫面在地面上看得到的範圍」外加一點邊，
   * 畫面外的東西不畫陰影（省 draw call），陰影也比較細。
   */
  private shadowHalf = 30;
  private followSun() {
    const cam = this.rig.camera;
    cam.updateMatrixWorld();
    let cx = 0, cz = 0;
    const pts: [number, number][] = [];
    for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) {
      this.tmpV.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
      // 射線打到地面（y = 0）；接近水平（看到天邊）就取 60 公尺
      const t = this.tmpV.y < -0.05 ? Math.min(60, -cam.position.y / this.tmpV.y) : 60;
      const px = cam.position.x + this.tmpV.x * t, pz = cam.position.z + this.tmpV.z * t;
      pts.push([px, pz]);
      cx += px;
      cz += pz;
    }
    cx /= pts.length;
    cz /= pts.length;
    let r = 0;
    for (const [px, pz] of pts) r = Math.max(r, Math.hypot(px - cx, pz - cz));
    const half = Math.min(40, Math.max(14, r + 4));
    this.sun.position.set(cx + 14, 30, cz + 10);
    this.sun.target.position.set(cx, 0, cz);
    if (Math.abs(half - this.shadowHalf) > 0.5) {
      this.shadowHalf = half;
      const sc = this.sun.shadow.camera;
      sc.left = sc.bottom = -half;
      sc.right = sc.top = half;
      sc.updateProjectionMatrix();
    }
  }
  private tmpV = new THREE.Vector3();

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
    this.revivesHere = 0;
    this.deathScreen?.hide();
    this.bossFight = null;
    if (this.weeklyRun) this.endWeekly('leave');
    if (this.towerRun && id !== 'trial_tower') {
      const r = this.endTower('leave');
      if (r.cleared) bus.emit('toast', { text: `🗼 試煉塔結算：打到第 ${r.cleared} 層${r.gems ? `，獲得 ${r.gems} 鑽石` : ''}`, duration: 3, kind: 'reward' });
    }
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
    // v1.77 神話難度：開著、是主線副本、這層已開放 → 敵人換算到 Lv.110＋層數
    const mf = mythicFloor(id);
    this.mythicFloorNow = this.state.mythic.on && mythicOpen(this.state.bossesDefeated) && mf > 0 && mythicUnlocked(this.state.mythic, mf) ? mf : 0;
    this.enemies.spawnForZone(zone.def, this.mythicFloorNow ? (ed) => this.mythicSpawn(ed, this.mythicFloorNow) : undefined);
    if (zone.def.safe && this.auto?.on) this.setAuto(false);
    this.state.zoneId = id;
    this.player.groundY = zone.heightAt(at.x, at.z);
    this.player.teleport(at.x, at.z);
    this.player.update(0, { x: 0, z: 0 }, zone.collision); // 確保出生點不在障礙物內
    this.rig.snapTo(this.player.pos.x, this.player.pos.z);
    this.hud.currentZone = zone.def;
    this.hud.mythic = this.mythicFloorNow;
    if (this.mythicFloorNow) bus.emit('toast', { text: `🔥 神話難度・第 ${this.mythicFloorNow} 層：敵人 Lv.${mythicLevel(this.mythicFloorNow)}，首領不會自動調整強度`, duration: 3.5 });
    this.labelDodger.setRoot(zone.group);
    this.hud.setZone(zone.def);
    const def = zone.def;
    const range = this.mythicFloorNow ? `（🔥神話 Lv.${mythicLevel(this.mythicFloorNow)}）` : def.levelRange ? `（Lv.${def.levelRange[0]}-${def.levelRange[1]}）` : '';
    const name = def.dungeon ? `${floorLabel(def.dungeon!.floor)}・${def.name}` : def.subtitle.split('・')[0];
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
