import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EnemyDef, SpawnDef } from '@/data/types';
import { makeLabelSprite } from '@/world/Label';
import { Assets } from '@/assets/Assets';
import { CharacterRig } from './CharacterRig';

/** KayKit 骷髏的動畫名稱 */
/** 有骨架動畫的敵人模型：動畫名稱與目標身高（公尺，未乘 scale） */
interface RigAnims {
  idle: string;
  walk: string;
  attack: string;
  cast?: string;
  hit?: string;
  death: string;
  height: number;
  /** 走路動畫速度基準（移動速度 / 這個值 = timeScale） */
  walkRef: number;
}
const SKEL: RigAnims = { idle: 'Idle', walk: 'Walking_D_Skeletons', attack: '1H_Melee_Attack_Chop', cast: 'Spellcast_Shoot', hit: 'Hit_A', death: 'Death_C_Skeletons', height: 2.3, walkRef: 2.4 };
const RIG_ANIMS: Record<string, RigAnims> = {
  skeleton_minion: SKEL,
  skeleton_rogue: SKEL,
  skeleton_warrior: SKEL,
  skeleton_mage: SKEL,
  // Quaternius Frog（CC0）
  frog: { idle: 'Frog_Idle', walk: 'Frog_Jump', attack: 'Frog_Attack', death: 'Frog_Death', height: 1.05, walkRef: 3 },
};

export type EnemyState = 'alive' | 'dying' | 'dead';
/** AI 狀態（見 systems/EnemyAI.ts） */
export type AiState = 'idle' | 'wander' | 'chase' | 'attack' | 'return' | 'boss';

const DYING_TIME = 0.45;

/**
 * 敵人實體：外觀、HP、受擊表現、死亡 / 重生。
 * 行為（移動、攻擊）由 systems/EnemyAI.ts 讀寫這裡的欄位；首領技能由 BossController 控制。
 * 每隻敵人有自己的材質副本，才能單獨閃白 / 變色。
 */
export class Enemy {
  readonly object = new THREE.Group();
  readonly def: EnemyDef;
  readonly spawn: SpawnDef;
  readonly pos: { x: number; z: number };
  /** 出生點（AI 巡邏與脫戰回歸的中心） */
  readonly home: { x: number; z: number };
  readonly defense: number;
  readonly displayName: string;
  readonly radius: number;
  /** 頭頂高度（傷害數字、血條位置） */
  readonly height: number;
  hp: number;
  state: EnemyState = 'alive';
  facing = 0;
  /** 地面高度（高台） */
  groundY = 0;

  /* ---- AI 欄位 ---- */
  ai: AiState = 'idle';
  aiTimer = Math.random() * 2;
  attackCd = 0;
  windup = 0;
  /** 被打過：被動怪會反擊，主動怪會追更久 */
  provoked = false;
  wanderTarget: { x: number; z: number } | null = null;
  /** 本幀移動量（動畫用） */
  moving = 0;

  /** 緩速剩餘秒數與倍率（冰霜新星） */
  /** 暈眩剩餘秒數（盾擊）：期間不移動、不攻擊，前搖被打斷 */
  stunTimer = 0;
  /** 被召喚物嘲諷：改打這隻骷髏（死掉後自動回頭打玩家） */
  aggroMinion: import('./Minion').Minion | null = null;
  slowTimer = 0;
  slowMul = 1;

  private body = new THREE.Group();
  private materials: THREE.MeshLambertMaterial[] = [];
  private flash = 0;
  private tinted = false;
  private shake = 0;
  private stateTimer = 0;
  private hpBar: THREE.Group;
  private hpFill: THREE.Mesh;
  private hpBarTimer = 0;
  private animT = Math.random() * 10;
  private wing: THREE.Object3D[] = [];
  /** 骨架動畫（骷髏） */
  rig: CharacterRig | null = null;
  private wasWinding = false;
  private anims: RigAnims = SKEL;
  /** 程式螃蟹的可動零件 */
  private legs: { pivot: THREE.Object3D; side: number; phase: number }[] = [];
  private claws: { pivot: THREE.Object3D; jaw: THREE.Object3D; side: number }[] = [];

  constructor(def: EnemyDef, spawn: SpawnDef) {
    this.def = def;
    this.spawn = spawn;
    this.pos = { x: spawn.x, z: spawn.z };
    this.home = { x: spawn.x, z: spawn.z };
    this.defense = spawn.def ?? def.stats.def;
    this.displayName = spawn.tag ? `${def.name}・${spawn.tag}` : def.boss ? `首領・${def.name}` : `Lv.${def.level} ${def.name}`;
    this.radius = def.radius * def.scale;
    this.hp = def.stats.maxHp;
    this.facing = Math.random() * Math.PI * 2;

    this.height = this.buildRig() ?? this.buildBody() * def.scale;
    if (!this.rig) this.mergeBody();
    this.body.scale.setScalar(def.scale);
    this.object.add(this.body);

    const label = makeLabelSprite(this.displayName, {
      fontSize: 40,
      color: def.boss ? '#ffd36b' : def.aggro === 'aggressive' ? '#ffb4a0' : '#ffe9c2',
      bg: 'rgba(27,34,50,0.55)',
      scale: def.boss ? 1.1 : 0.8,
    });
    label.position.y = this.height + (def.boss ? 1.1 : 0.75);
    this.object.add(label);

    // 血條（永遠面向鏡頭）
    this.hpBar = new THREE.Group();
    const w = def.boss ? 3 : 1.5;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.16), new THREE.MeshBasicMaterial({ color: 0x1b2433, depthTest: false, transparent: true, opacity: 0.85 }));
    this.hpFill = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, 0.11), new THREE.MeshBasicMaterial({ color: 0xe5533d, depthTest: false }));
    this.hpFill.geometry.translate((w - 0.06) / 2, 0, 0); // 錨點移到左邊，scale.x 即可表示比例
    this.hpFill.position.set(-(w - 0.06) / 2, 0, 0.001);
    bg.renderOrder = 20;
    this.hpFill.renderOrder = 21;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.position.y = this.height + 0.35;
    this.hpBar.visible = false;
    this.object.add(this.hpBar);

    this.object.position.set(this.pos.x, 0, this.pos.z);
  }

  get alive() {
    return this.state === 'alive';
  }

  /** 是否在戰鬥中（HUD 首領血條用） */
  get engaged() {
    return this.alive && (this.ai === 'chase' || this.ai === 'attack' || this.ai === 'boss');
  }

  /** 傷害數字與投射物瞄準點 */
  get aimY() {
    return this.groundY + this.height * 0.6;
  }

  /** 暈眩；首領免疫，回傳是否生效 */
  applyStun(duration: number): boolean {
    if (!this.alive || this.def.boss) return false;
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.windup = 0;
    return true;
  }

  applySlow(duration: number, mul: number) {
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowMul = Math.min(this.slowMul === 1 ? mul : this.slowMul, mul);
  }

  /** 回傳是否因此死亡 */
  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    // 脫戰回歸中：只閃白不扣血（防止拉怪後偷打）
    if (this.ai === 'return') {
      this.flash = 0.5;
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    this.shake = this.def.boss ? 0.4 : 1;
    this.hpBarTimer = 5;
    if (this.def.aggro !== 'none') this.provoked = true;
    if (this.hp <= 0) {
      this.state = 'dying';
      this.stateTimer = this.rig ? 1.1 : DYING_TIME;
      this.rig?.die(this.anims.death);
      return true;
    }
    if (this.rig && !this.rig.busy && this.anims.hit) this.rig.playOnce(this.anims.hit, { priority: false, timeScale: 1.4 });
    return false;
  }

  /** 骨架模型（骷髏、青蛙）：回傳模型高度；沒有模型回傳 null（改用程式模型） */
  private buildRig(): number | null {
    const id = this.def.model;
    const anims = id ? RIG_ANIMS[id] : undefined;
    if (!id || !anims) return null;
    const inst = Assets.cloneRig(id);
    if (!inst) return null;
    this.anims = anims;
    const h = anims.height;
    inst.root.scale.setScalar(h / Assets.height(id));
    // 青蛙：身體顏色換成這種怪的顏色（寧芙潮蛙藍綠、奇美拉火蛙紅…），肚子用淡一點的同色系
    if (id === 'frog') {
      const body = new THREE.Color(this.def.color);
      for (const m of inst.materials) {
        if (m.name === 'Green') m.color.copy(body);
        else if (m.name === 'Yellow') m.color.copy(body).lerp(new THREE.Color(0xfff2c4), 0.55);
      }
    }
    this.body.add(inst.root);
    this.rig = new CharacterRig(inst);
    this.materials.push(...inst.materials);
    this.rig.setLoop(anims.idle, 0);
    return h * this.def.scale;
  }

  /** 前搖中（出手前），身體會變紅並後仰，讓玩家看得出要攻擊了 */
  get winding() {
    return this.windup > 0;
  }

  update(dt: number, camera: THREE.Camera) {
    this.animT += dt;
    this.rig?.update(dt);
    if (this.state === 'dying') {
      this.stateTimer -= dt;
      if (this.rig) {
        // 骷髏：播完散架動畫，最後 0.25 秒沉入地面
        if (this.stateTimer < 0.25) this.body.position.y = -(0.25 - this.stateTimer) * 4;
      } else {
        const t = Math.max(0, this.stateTimer / DYING_TIME);
        this.body.scale.setScalar(this.def.scale * (0.2 + 0.8 * t));
        this.body.position.y = (1 - t) * 0.6;
      }
      if (this.stateTimer <= 0) {
        this.state = 'dead';
        this.object.visible = false;
        this.stateTimer = this.spawn.respawn ?? this.def.respawn;
      }
    } else if (this.state === 'dead') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.respawn();
      return;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowMul = 1;
    }
    if (this.stunTimer > 0) this.stunTimer = Math.max(0, this.stunTimer - dt);
    // 受擊閃白、緩速偏藍、前搖偏紅、暈眩偏黃（閃爍）
    const wind = this.windup > 0 ? 0.45 : 0;
    const stun = this.stunTimer > 0 ? 0.25 + Math.abs(Math.sin(this.stunTimer * 12)) * 0.2 : 0;
    if (this.flash > 0 || this.slowTimer > 0 || wind > 0 || stun > 0 || this.tinted) {
      this.flash = Math.max(0, this.flash - dt * 6);
      const f = this.flash * 0.8;
      const slow = this.slowTimer > 0 ? 0.35 : 0;
      for (const m of this.materials) m.emissive.setRGB(f + wind + stun, f + slow * 0.4 + stun * 0.85, f + slow);
      this.tinted = this.flash > 0 || slow > 0 || wind > 0 || stun > 0;
    }
    if (this.shake > 0 && !this.rig) {
      this.shake = Math.max(0, this.shake - dt * 5);
      this.body.rotation.z = Math.sin(this.shake * 30) * 0.15 * this.shake;
    }
    if (this.hpBarTimer > 0 || (this.def.boss && this.engaged)) {
      this.hpBarTimer -= dt;
      this.hpBar.visible = this.state === 'alive';
      this.hpFill.scale.x = Math.max(0.001, this.hp / this.def.stats.maxHp);
      this.hpBar.quaternion.copy(camera.quaternion);
    } else this.hpBar.visible = false;

    if (this.state === 'alive') this.animate(dt);
    this.object.position.set(this.pos.x, this.groundY, this.pos.z);
  }

  /** 依造型的待機 / 移動 / 前搖動畫 */
  private animate(dt: number) {
    const t = this.animT;
    const s = this.def.scale;
    this.object.rotation.y = this.facing;
    const lean = this.windup > 0 ? -0.25 : 0;
    if (this.rig) {
      // 骷髏：前搖開始時播攻擊（遠程播施法），其餘依移動切換走路 / 待機
      const a = this.anims;
      if (this.windup > 0 && !this.wasWinding) this.rig.playOnce(this.def.ranged && a.cast ? a.cast : a.attack, { timeScale: 1.2 });
      this.wasWinding = this.windup > 0;
      if (this.moving > 0.05) this.rig.setLoop(a.walk, 0.15, this.def.stats.moveSpeed / a.walkRef);
      else this.rig.setLoop(a.idle, 0.2);
      this.moving = Math.max(0, this.moving - dt * 4);
      return;
    }
    switch (this.def.shape) {
      case 'crab':
        this.animateCrab(t);
        this.body.rotation.x = lean * 0.4;
        break;
      case 'slime':
      case 'frog': {
        // 跳躍前進
        const hop = this.moving > 0.05 ? Math.abs(Math.sin(t * 7)) : Math.abs(Math.sin(t * 2.5)) * 0.25;
        this.body.position.y = hop * 0.35;
        const squash = 1 + (this.moving > 0.05 ? Math.sin(t * 14) * 0.08 : Math.sin(t * 5) * 0.04);
        this.body.scale.set(s / squash, s * squash, s / squash);
        this.body.rotation.x = lean;
        break;
      }
      case 'bat': {
        this.body.position.y = 0.9 + Math.sin(t * 3) * 0.2;
        const flap = Math.sin(t * 18) * 0.7;
        if (this.wing[0]) this.wing[0].rotation.z = flap;
        if (this.wing[1]) this.wing[1].rotation.z = -flap;
        this.body.rotation.x = lean;
        break;
      }
      default: {
        this.body.position.y = this.moving > 0.05 ? Math.abs(Math.sin(t * 9)) * 0.08 : 0;
        this.body.rotation.x = lean;
      }
    }
    this.moving = Math.max(0, this.moving - dt * 4);
  }

  private respawn() {
    this.state = 'alive';
    this.hp = this.def.stats.maxHp;
    const r = (this.spawn.spread ?? 0) * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    this.pos.x = this.spawn.x + Math.cos(a) * r;
    this.pos.z = this.spawn.z + Math.sin(a) * r;
    this.home.x = this.pos.x;
    this.home.z = this.pos.z;
    this.body.scale.setScalar(this.def.scale);
    this.body.position.y = 0;
    this.object.visible = true;
    this.hpBarTimer = 0;
    this.rig?.revive(this.anims.idle);
    this.slowTimer = 0;
    this.slowMul = 1;
    this.stunTimer = 0;
    this.aggroMinion = null;
    this.ai = 'idle';
    this.provoked = false;
    this.windup = 0;
    this.attackCd = 0;
  }

  /** 脫戰回到出生點：回滿血 */
  resetToHome() {
    this.aggroMinion = null;
    this.hp = this.def.stats.maxHp;
    this.provoked = false;
    this.windup = 0;
  }

  private m(color: number): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
    this.materials.push(mat);
    return mat;
  }

  private add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, parent: THREE.Object3D = this.body): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, this.m(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private eyes(y: number, z: number, gap = 0.2, size = 0.08) {
    this.add(new THREE.SphereGeometry(size * 1.5, 6, 4), 0xffffff, -gap, y, z);
    this.add(new THREE.SphereGeometry(size * 1.5, 6, 4), 0xffffff, gap, y, z);
    this.add(new THREE.SphereGeometry(size, 6, 4), 0x1b2433, -gap, y, z + size);
    this.add(new THREE.SphereGeometry(size, 6, 4), 0x1b2433, gap, y, z + size);
  }

  /**
   * 效能：把身體上直接掛著的零件合併成一個「頂點顏色」網格（一隻敵人 1 個 draw call）。
   * 會動的零件（蝙蝠翅膀掛在 pivot 下）與發光零件（MeshBasicMaterial）保持獨立。
   */
  private mergeBody() {
    const parts: THREE.Mesh[] = [];
    for (const c of this.body.children) {
      const m = c as THREE.Mesh;
      if (m.isMesh && m.material instanceof THREE.MeshLambertMaterial) parts.push(m);
    }
    if (parts.length < 2) return;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of parts) {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      const col = (m.material as THREE.MeshLambertMaterial).color;
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    for (const m of parts) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      this.materials.splice(this.materials.indexOf(m.material as THREE.MeshLambertMaterial), 1);
      m.removeFromParent();
    }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.materials.push(mat);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    this.body.add(mesh);
  }

  /**
   * 程式螃蟹（沒有可用的 CC0 螃蟹模型）：
   * 扁圓甲殼＋可動的 6 隻腳（走路交替擺動）＋兩隻大鉗（下顎會開合、出手前高舉）＋眼柄。
   * 卡基諾斯幼蟹背螺旋殼；首領「巨蟹卡基諾斯」改成尖刺甲殼、特大右鉗、小皇冠。
   * 會動的零件掛在 pivot 群組下，不會被 mergeBody 合併。
   */
  private buildCrab(c: number, dark: number): number {
    const boss = !!this.def.boss;
    const light = new THREE.Color(c).lerp(new THREE.Color(0xffe8d0), 0.45).getHex();
    // 甲殼：上蓋＋下腹
    const top = this.add(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.38);
    top.scale.set(1.25, 0.62, 1);
    const belly = this.add(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), light, 0, 0.39);
    belly.scale.set(1.2, 0.35, 0.95);
    // 甲殼斑點
    for (const [x, z, r] of [[0.22, 0.15, 0.09], [-0.25, 0.05, 0.07], [0.02, -0.2, 0.08], [-0.1, 0.25, 0.06]]) this.add(new THREE.SphereGeometry(r, 6, 4), light, x, 0.66, z).scale.y = 0.4;
    if (boss) {
      // 蟹王：尖刺＋小皇冠
      for (let i = 0; i < 7; i++) {
        const a = (i / 6) * Math.PI - Math.PI;
        this.add(new THREE.ConeGeometry(0.07, 0.22, 5), dark, Math.cos(a) * 0.55, 0.52, Math.sin(a) * 0.38 + 0.05).rotation.z = -Math.cos(a) * 0.9;
      }
      for (let i = 0; i < 5; i++) this.add(new THREE.ConeGeometry(0.05, 0.16, 4), 0xf4c64e, -0.16 + i * 0.08, 0.78, 0.05);
      this.add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), 0xf4c64e, 0, 0.7, 0.05);
    } else {
      // 卡基諾斯幼蟹：背上的螺旋殼（一圈圈縮小的環＋尖端）
      const shell = new THREE.Group();
      shell.position.set(0, 0.7, -0.18);
      shell.rotation.x = -0.55;
      this.body.add(shell);
      const shellCol = [0xf1e3c8, 0xe6b8a0, 0xf1e3c8, 0xe6b8a0];
      for (let i = 0; i < 4; i++) {
        const r = 0.34 - i * 0.07;
        this.add(new THREE.TorusGeometry(r, 0.11 - i * 0.015, 6, 12), shellCol[i], 0, i * 0.13, 0, shell).rotation.x = Math.PI / 2;
      }
      this.add(new THREE.ConeGeometry(0.1, 0.25, 8), 0xf1e3c8, 0, 0.6, 0, shell);
    }
    // 眼柄
    for (const sx of [-1, 1]) {
      this.add(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 5), dark, sx * 0.14, 0.72, 0.36);
      this.add(new THREE.SphereGeometry(0.075, 8, 6), 0xffffff, sx * 0.14, 0.9, 0.38);
      this.add(new THREE.SphereGeometry(0.045, 6, 4), 0x1b2433, sx * 0.14, 0.91, 0.44);
    }
    // 腳：每邊 3 隻，pivot 在甲殼側邊
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * 0.5, 0.36, 0.12 - i * 0.22);
        pivot.rotation.y = sx * (0.15 - i * 0.25);
        this.body.add(pivot);
        const upper = this.add(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 5), dark, sx * 0.15, 0.06, 0, pivot);
        upper.rotation.z = sx * 1.15;
        const lower = this.add(new THREE.CylinderGeometry(0.025, 0.045, 0.34, 5), dark, sx * 0.33, -0.12, 0, pivot);
        lower.rotation.z = -sx * 0.35;
        this.legs.push({ pivot, side: sx, phase: i * 2.1 + (sx > 0 ? Math.PI : 0) });
      }
    }
    // 大鉗：手臂 pivot＋可開合的下顎
    for (const sx of [-1, 1]) {
      const big = boss && sx > 0 ? 1.35 : 1;
      const pivot = new THREE.Group();
      pivot.position.set(sx * 0.42, 0.42, 0.32);
      pivot.rotation.y = sx * 0.35;
      this.body.add(pivot);
      this.add(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 6), dark, sx * 0.08, 0, 0.12, pivot).rotation.x = Math.PI / 2;
      const hand = new THREE.Group();
      hand.position.set(sx * 0.1, 0.02, 0.32);
      hand.scale.setScalar(big);
      pivot.add(hand);
      const palm = this.add(new THREE.SphereGeometry(0.17, 8, 6), c, 0, 0, 0.05, hand);
      palm.scale.set(0.9, 0.75, 1.15);
      // 上鉗（固定）
      const upper = this.add(new THREE.ConeGeometry(0.09, 0.32, 6), c, 0, 0.06, 0.26, hand);
      upper.rotation.x = Math.PI / 2;
      upper.scale.set(1, 1, 0.7);
      // 下鉗（會動）
      const jaw = new THREE.Group();
      jaw.position.set(0, -0.04, 0.12);
      hand.add(jaw);
      const lowerJaw = this.add(new THREE.ConeGeometry(0.07, 0.26, 6), light, 0, -0.02, 0.12, jaw);
      lowerJaw.rotation.x = Math.PI / 2;
      this.claws.push({ pivot, jaw, side: sx });
    }
    return boss ? 1.05 : 1.15;
  }

  /** 程式螃蟹動畫：走路時腳交替擺動、身體左右晃；平常大鉗慢慢開合；前搖時雙鉗高舉張開 */
  private animateCrab(t: number) {
    const walking = this.moving > 0.05;
    for (const l of this.legs) {
      const w = walking ? Math.sin(t * 16 + l.phase) : Math.sin(t * 2 + l.phase) * 0.15;
      l.pivot.rotation.x = w * 0.35;
      l.pivot.rotation.z = l.side * Math.max(0, w) * 0.25;
    }
    this.body.position.y = walking ? Math.abs(Math.sin(t * 16)) * 0.04 : 0;
    this.body.rotation.z = walking ? Math.sin(t * 8) * 0.06 : 0;
    const winding = this.windup > 0;
    for (const c of this.claws) {
      const snap = winding ? 0.5 : 0.12 + Math.max(0, Math.sin(t * 3 + c.side)) * 0.25;
      c.jaw.rotation.x = snap;
      c.pivot.rotation.x = winding ? -0.75 : -0.05 + Math.sin(t * 1.5 + c.side) * 0.05;
    }
  }

  /** 依 shape 建模型（面向 +z），回傳模型高度（未縮放） */
  private buildBody(): number {
    const c = this.def.color;
    const dark = new THREE.Color(c).multiplyScalar(0.65).getHex();
    switch (this.def.shape) {
      case 'dummy': {
        this.add(new THREE.CylinderGeometry(0.12, 0.16, 1.9, 6), 0x7a5232, 0, 0.95);
        this.add(new THREE.BoxGeometry(1.3, 0.14, 0.14), 0x7a5232, 0, 1.35);
        this.add(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 7), c, 0, 1.15);
        this.add(new THREE.IcosahedronGeometry(0.3, 0), 0xe0c27a, 0, 1.85);
        this.add(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), 0xd84a3a, 0, 1.2, 0.38).rotation.x = Math.PI / 2;
        this.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), 0xf4f1e8, 0, 1.2, 0.4).rotation.x = Math.PI / 2;
        this.add(new THREE.CylinderGeometry(0.5, 0.6, 0.15, 8), 0x8a6a4a, 0, 0.07);
        return 2.1;
      }
      case 'slime': {
        const blob = this.add(new THREE.IcosahedronGeometry(0.6, 1), c, 0, 0.45);
        blob.scale.y = 0.78;
        const shine = this.add(new THREE.SphereGeometry(0.12, 6, 4), 0xffffff, -0.22, 0.75, 0.3);
        shine.scale.set(1, 0.6, 1);
        this.eyes(0.55, 0.48, 0.18, 0.06);
        return 1;
      }
      case 'mushroom': {
        this.add(new THREE.CylinderGeometry(0.28, 0.36, 0.6, 8), 0xf1e6cf, 0, 0.3);
        const cap = this.add(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.55);
        cap.scale.y = 0.75;
        for (const [x, z] of [[0.25, 0.3], [-0.3, 0.15], [0.05, -0.35], [-0.1, 0.45]]) this.add(new THREE.SphereGeometry(0.08, 6, 4), 0xffffff, x, 0.9, z);
        this.eyes(0.38, 0.3, 0.12, 0.05);
        return 1.1;
      }
      case 'crab':
        return this.buildCrab(c, dark);
      case 'frog': {
        const b = this.add(new THREE.SphereGeometry(0.55, 8, 6), c, 0, 0.4);
        b.scale.set(1.1, 0.75, 1);
        this.add(new THREE.SphereGeometry(0.4, 8, 5), new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.45).getHex(), 0, 0.32, 0.25).scale.set(1, 0.6, 0.8);
        for (const sx of [-1, 1]) {
          this.add(new THREE.SphereGeometry(0.17, 6, 5), c, sx * 0.25, 0.75, 0.25);
          this.add(new THREE.SphereGeometry(0.1, 6, 4), 0x1b2433, sx * 0.27, 0.8, 0.38);
          this.add(new THREE.SphereGeometry(0.2, 6, 4), dark, sx * 0.5, 0.15, -0.1).scale.set(1, 0.5, 1.4);
        }
        return 1;
      }
      case 'bat': {
        const b = this.add(new THREE.SphereGeometry(0.35, 8, 6), c, 0, 0);
        b.scale.set(1, 1.1, 0.9);
        for (const sx of [-1, 1]) {
          const pivot = new THREE.Group();
          pivot.position.set(sx * 0.25, 0.05, 0);
          this.body.add(pivot);
          const wing = this.add(new THREE.ConeGeometry(0.35, 0.9, 3), dark, sx * 0.45, 0, 0, pivot);
          wing.rotation.z = sx * Math.PI / 2;
          wing.scale.z = 0.2;
          this.wing.push(pivot);
          this.add(new THREE.ConeGeometry(0.08, 0.2, 4), c, sx * 0.15, 0.38, 0);
        }
        this.add(new THREE.SphereGeometry(0.06, 6, 4), 0xff4a4a, -0.12, 0.08, 0.3);
        this.add(new THREE.SphereGeometry(0.06, 6, 4), 0xff4a4a, 0.12, 0.08, 0.3);
        return 1.6;
      }
      case 'skeleton': {
        // 模型沒載入時的程式版骷髏
        this.add(new THREE.BoxGeometry(0.5, 0.7, 0.3), 0xe8e2d0, 0, 1.15);
        this.add(new THREE.IcosahedronGeometry(0.3, 1), 0xf1ecdf, 0, 1.75);
        this.add(new THREE.BoxGeometry(0.14, 0.8, 0.14), 0xe8e2d0, -0.15, 0.4);
        this.add(new THREE.BoxGeometry(0.14, 0.8, 0.14), 0xe8e2d0, 0.15, 0.4);
        this.add(new THREE.SphereGeometry(0.06, 6, 4), 0x1b2433, -0.1, 1.78, 0.26);
        this.add(new THREE.SphereGeometry(0.06, 6, 4), 0x1b2433, 0.1, 1.78, 0.26);
        return 2.1;
      }
      case 'golem': {
        this.add(new THREE.BoxGeometry(1, 0.9, 0.7), c, 0, 1.05);
        this.add(new THREE.BoxGeometry(0.6, 0.5, 0.55), dark, 0, 1.75);
        this.add(new THREE.BoxGeometry(0.35, 0.6, 0.4), dark, -0.3, 0.3);
        this.add(new THREE.BoxGeometry(0.35, 0.6, 0.4), dark, 0.3, 0.3);
        this.add(new THREE.BoxGeometry(0.35, 0.9, 0.35), c, -0.72, 1.0);
        this.add(new THREE.BoxGeometry(0.35, 0.9, 0.35), c, 0.72, 1.0);
        // 發光核心與眼睛
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshBasicMaterial({ color: 0x8fe8ff }));
        core.position.set(0, 1.1, 0.36);
        this.body.add(core);
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0x8fe8ff }));
        eye.position.set(0, 1.8, 0.28);
        this.body.add(eye);
        return 2.1;
      }
    }
  }

  dispose() {
    this.rig?.dispose();
    this.object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose(); // 模型庫的幾何共用
      const mat = (mesh as { material?: THREE.Material }).material;
      if (mat && !mat.userData.shared) {
        if ((mat as THREE.SpriteMaterial).isSpriteMaterial) (mat as THREE.SpriteMaterial).map?.dispose(); // 模型貼圖共用，不能釋放
        mat.dispose();
      }
    });
    this.object.removeFromParent();
  }
}
