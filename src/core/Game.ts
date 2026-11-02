import * as THREE from 'three';
import { bus } from './EventBus';
import { newGameState, type GameState } from './GameState';
import { LocalSave, type SaveBackend } from './SaveSystem';
import type { ZoneId } from '@/data/types';
import { ZONES, DUNGEON_ORDER } from '@/data/zones';
import { Player } from '@/entities/Player';
import { CameraRig } from '@/camera/CameraRig';
import { InputManager, type ActionKey } from '@/input/InputManager';
import { ZoneManager } from '@/world/ZoneManager';
import { Hud } from '@/ui/Hud';
import { Menu } from '@/ui/Menu';

const AUTOSAVE_INTERVAL = 10; // 秒

/**
 * Game：組裝所有系統並跑主迴圈。
 * 規範：Game 只做「組裝與調度」，具體邏輯放在各自的 system 類別。
 * 每幀順序：Input → 遊戲邏輯（Player/Zone/之後的 Combat、AI）→ Camera → HUD → Render
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
  state: GameState;

  private save: SaveBackend = new LocalSave();
  private sun: THREE.DirectionalLight;
  private timer = new THREE.Timer();
  private saveTimer = 0;
  private transitioning = false;
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
    this.scene.add(this.player.object);

    this.player.setLevel(this.state.level);
    this.player.hp = this.state.hp < 0 ? this.player.stats.maxHp : this.state.hp;
    this.player.mp = this.state.mp < 0 ? this.player.stats.maxMp : this.state.mp;

    this.hud = new Hud(uiRoot, this.state, this.player, this.input);
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
    });

    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    uiRoot.appendChild(this.fadeEl);

    // ---- Events ----
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
    const dt = Math.min(0.05, this.timer.getDelta());
    this.input.update();

    if (this.input.consume('menu')) this.menu.toggle();
    const canAct = !this.menu.isOpen && !this.transitioning;

    if (canAct) {
      this.handleActions();
      this.player.update(dt, this.input.move, this.zones.current!.collision);
      this.zones.checkPortals(this.player.pos.x, this.player.pos.z);
    } else {
      this.player.update(dt, { x: 0, z: 0 }, this.zones.current!.collision);
    }

    this.zones.update(dt);
    this.rig.update(dt, this.player.pos.x, this.player.pos.z);
    this.followSun();
    this.hud.update(dt);
    this.renderer.render(this.scene, this.rig.camera);
    this.input.endFrame();

    this.saveTimer += dt;
    if (this.saveTimer > AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.persist();
    }
  }

  /** 技能與道具按鈕。戰鬥系統完成前先給提示，介面先能點 */
  private handleActions() {
    const planned: [ActionKey, string][] = [
      ['basic', '普攻將於第 2 週實作'],
      ['Q', '技能 Q 將於第 3 週實作'],
      ['W', '技能 W 將於第 3 週實作'],
      ['E', '技能 E 將於第 3 週實作'],
      ['R', '技能 R 將於第 3 週實作'],
      ['auto', 'AUTO 自動戰鬥將於第 5 週實作'],
    ];
    for (const [k, msg] of planned) if (this.input.consume(k)) bus.emit('toast', { text: msg });

    if (this.input.consume('potionHp')) this.usePotion('hp');
    if (this.input.consume('potionMp')) this.usePotion('mp');
  }

  private usePotion(kind: 'hp' | 'mp') {
    const p = this.player;
    const max = kind === 'hp' ? p.stats.maxHp : p.stats.maxMp;
    const cur = kind === 'hp' ? p.hp : p.mp;
    if (this.state.potions[kind] <= 0) return bus.emit('toast', { text: '藥水用完了' });
    if (cur >= max) return bus.emit('toast', { text: kind === 'hp' ? 'HP 已滿' : 'MP 已滿' });
    const heal = Math.round(max * 0.35);
    if (kind === 'hp') p.hp = Math.min(max, p.hp + heal);
    else p.mp = Math.min(max, p.mp + heal);
    this.state.potions[kind]--;
    this.hud.refresh();
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
  private async changeZone(id: ZoneId, arrive?: { x: number; z: number }) {
    if (this.transitioning) return;
    if (id === this.state.zoneId && !arrive) return;
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
    const zone = this.zones.load(id);
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
