import * as THREE from 'three';
import { bus } from './EventBus';
import { newGameState, type GameState } from './GameState';
import { LocalSave, type SaveBackend } from './SaveSystem';
import type { ZoneId } from '@/data/types';
import { ZONES, DUNGEON_ORDER } from '@/data/zones';
import { Player } from '@/entities/Player';
import { CameraRig } from '@/camera/CameraRig';
import { InputManager } from '@/input/InputManager';
import { ZoneManager } from '@/world/ZoneManager';
import { Hud } from '@/ui/Hud';
import { Menu } from '@/ui/Menu';
import { DamageNumbers } from '@/ui/DamageNumbers';
import { EnemyManager } from '@/systems/EnemyManager';
import { ProjectileSystem } from '@/systems/ProjectileSystem';
import { TargetSelector } from '@/systems/TargetSelector';
import { SkillSystem } from '@/systems/SkillSystem';
import { Effects } from '@/systems/Effects';
import { calcDamage } from '@/systems/Combat';
import type { AiContext } from '@/systems/EnemyAI';
import type { Enemy } from '@/entities/Enemy';

/** 被攻擊後自動反擊的持續秒數 */
const COUNTER_TIME = 3;
/** 死亡後損失的金幣比例 */
const DEATH_GOLD_PENALTY = 0.1;

const AUTOSAVE_INTERVAL = 10; // 秒

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
  readonly player = new Player();
  readonly zones: ZoneManager;
  readonly hud: Hud;
  readonly menu: Menu;
  readonly enemies: EnemyManager;
  readonly projectiles: ProjectileSystem;
  readonly targets: TargetSelector;
  readonly damageNumbers: DamageNumbers;
  readonly effects: Effects;
  readonly skills: SkillSystem;
  state: GameState;

  private save: SaveBackend = new LocalSave();
  private sun: THREE.DirectionalLight;
  private timer = new THREE.Timer();
  private saveTimer = 0;
  private transitioning = false;
  private counterTarget: Enemy | null = null;
  private deathTimer = 0;
  private deathGoldLost = 0;
  private counterTimer = 0;
  private aiCtx!: AiContext;
  private fadeEl: HTMLElement;

  constructor(private canvas: HTMLCanvasElement, private container: HTMLElement, uiRoot: HTMLElement) {
    this.state = this.save.load() ?? newGameState();

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

    // ---- Systems ----
    this.rig = new CameraRig(1);
    this.rig.setZoom(this.state.settings.zoom);
    this.input = new InputManager(uiRoot);
    this.zones = new ZoneManager(this.scene);
    this.enemies = new EnemyManager(this.scene);
    this.projectiles = new ProjectileSystem(this.scene, this.enemies);
    this.targets = new TargetSelector(this.scene, this.enemies);
    this.damageNumbers = new DamageNumbers(uiRoot, container);
    this.effects = new Effects(this.scene);
    this.scene.add(this.player.object);

    this.player.setLevel(this.state.level);
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
    });
    this.hud = new Hud(uiRoot, this.state, this.player, this.input, this.skills);
    this.menu = new Menu(uiRoot, this.state, {
      onResetSave: () => {
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
        this.player.stats.pen = pen;
        bus.emit('toast', { text: `穿透設為 ${Math.round(pen * 100)}%（測試用，重新整理後還原）` });
      },
      getStatsText: () => {
        const s = this.player.stats;
        return `攻擊 ${s.atk}　穿透 ${Math.round(s.pen * 100)}%　爆擊 ${Math.round(s.critRate * 100)}% ×${s.critDmg}`;
      },
    });

    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    uiRoot.appendChild(this.fadeEl);

    this.aiCtx = {
      player: this.player,
      collision: this.zones.current?.collision as never,
      hitPlayer: (e, power) => this.hitPlayer(e, power),
    };

    // ---- Events ----
    bus.on('player:hurt', ({ source }) => {
      this.counterTarget = source as Enemy;
      this.counterTimer = COUNTER_TIME;
    });
    bus.on('player:died', () => this.onPlayerDied());
    bus.on('zone:request', ({ zoneId, arrive }) => this.changeZone(zoneId, arrive));
    bus.on('camera:zoom', ({ delta }) => this.setZoom(this.state.settings.zoom + delta));
    bus.on('save:request', () => this.persist());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.persist();
    });
    window.addEventListener('pagehide', () => this.persist());
    window.addEventListener('resize', () => this.resize());

    // ---- 首次進入 ----
    this.enterZone(this.state.zoneId, this.state.pos);
    this.resize();
  }

  start() {
    this.timer.connect(document); // 分頁隱藏時暫停計時
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /* ------------------------------------------------------------ */

  private frame() {
    // dt 上限 0.05：切到背景再回來時避免角色瞬移穿牆
    this.timer.update();
    this.tick(Math.min(0.05, this.timer.getDelta()));
    this.renderer.render(this.scene, this.rig.camera);
  }

  /**
   * 推進一步遊戲邏輯（不渲染）。
   * 與 render 分開，讓自動化測試可以用 debugAdvance() 快轉，不受裝置 FPS 影響。
   */
  private tick(dt: number) {
    this.input.update();

    if (this.input.consume('menu')) this.menu.toggle();
    const canAct = !this.menu.isOpen && !this.transitioning && this.player.alive;

    const collision = this.zones.current!.collision;
    const pushOut = (pos: { x: number; z: number }, r: number) => this.enemies.pushOut(pos, r);
    this.skills.update(dt);
    this.counterTimer = Math.max(0, this.counterTimer - dt);
    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawnAfterDeath();
    }
    this.regen(dt);

    if (canAct) {
      this.handleActions();
      this.player.update(dt, this.input.move, collision, pushOut);
      this.zones.checkPortals(this.player.pos.x, this.player.pos.z);
    } else {
      this.player.update(dt, { x: 0, z: 0 }, collision, pushOut);
    }

    this.aiCtx.collision = collision;
    this.enemies.update(dt, this.rig.camera, this.aiCtx);
    this.effects.update(dt);
    this.projectiles.update(dt, this.rig.camera);
    this.targets.update(dt);
    this.zones.update(dt);
    this.rig.update(dt, this.player.pos.x, this.player.pos.z);
    this.followSun();
    this.damageNumbers.update(dt, this.rig.camera);
    this.hud.update(dt);
    this.input.endFrame();

    this.saveTimer += dt;
    if (this.saveTimer > AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
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
    if (this.input.consume('auto')) bus.emit('toast', { text: 'AUTO 自動戰鬥將於第 5 週實作' });

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
    if (p.mp < p.stats.maxMp) p.mp = Math.min(p.stats.maxMp, p.mp + (2 + p.stats.maxMp * 0.01) * dt);
    const safe = this.zones.current?.def.safe;
    if (p.hp < p.stats.maxHp && (safe || p.sinceHurt > 5)) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * (safe ? 0.1 : 0.02) * dt);
  }

  /** 敵人攻擊命中玩家 */
  private hitPlayer(e: Enemy, power: number) {
    const p = this.player;
    const res = calcDamage({ atk: e.def.stats.atk, pen: 0, critRate: 0.05, critDmg: 1.5 }, power, p.stats.def);
    const dealt = p.takeDamage(res.amount);
    if (dealt <= 0) return;
    bus.emit('combat:hit', { x: p.pos.x, y: 2.2, z: p.pos.z, amount: dealt, crit: res.crit, targetIsPlayer: true });
    bus.emit('player:hurt', { amount: dealt, source: e });
    if (!p.alive) bus.emit('player:died');
  }

  /** 玩家死亡：倒地 1.6 秒（遊戲時間）→ 損失 10% 金幣 → 主城復活 */
  private onPlayerDied() {
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
  debugAdvance(seconds: number) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) this.tick(1 / 60);
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
    this.projectiles.clear();
    this.effects.clear();
    this.damageNumbers.clear();
    this.targets.clear();
    this.counterTimer = 0;
    this.counterTarget = null;
    const zone = this.zones.load(id);
    this.enemies.spawnForZone(zone.def);
    this.state.zoneId = id;
    this.player.teleport(at.x, at.z);
    this.player.update(0, { x: 0, z: 0 }, zone.collision); // 確保出生點不在障礙物內
    this.rig.snapTo(this.player.pos.x, this.player.pos.z);
    this.hud.currentZone = zone.def;
    this.hud.setZone(zone.def);
    const def = zone.def;
    const range = def.levelRange ? `（Lv.${def.levelRange[0]}-${def.levelRange[1]}）` : '';
    const name = def.kind === 'dungeon' ? `第${'一二三四五'[def.dungeon!.floor - 1]}層・${def.name}` : def.subtitle.split('・')[0];
    bus.emit('banner', { text: def.kind === 'town' ? `回到${name}` : `進入 ${name}${range}` });
    bus.emit('zone:enter', { zoneId: id });
  }

  private persist() {
    const s = this.state;
    s.pos = { x: round2(this.player.pos.x), z: round2(this.player.pos.z) };
    s.hp = Math.round(this.player.hp);
    s.mp = Math.round(this.player.mp);
    if (this.save.save(s)) bus.emit('save:written');
  }

  private resize() {
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
