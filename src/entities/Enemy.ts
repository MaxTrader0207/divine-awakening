import type { BossScaler } from '@/systems/BossScaling';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EnemyDef, SpawnDef } from '@/data/types';
import { makeLabelSprite } from '@/world/Label';
import { Assets } from '@/assets/Assets';
import { CharacterRig } from './CharacterRig';
import { DEFAULT_RIG, ENEMY_SHAPES, RIG_ANIMS, type RigAnims, type ShapeAnimState, type ShapeBuilder } from './enemyShapes';
import { PoseSmoother, refineGeometry } from './enemyShapes/refine';
import { BossLook, smoothNormals } from './enemyShapes/bossLook';

type LitMaterial = THREE.MeshLambertMaterial | THREE.MeshPhongMaterial;

export type EnemyState = 'alive' | 'dying' | 'dead';
/** AI 狀態（見 systems/EnemyAI.ts） */
export type AiState = 'idle' | 'wander' | 'chase' | 'attack' | 'return' | 'boss';

const DYING_TIME = 0.45;
/** 出手動作長度（秒） */
const STRIKE_TIME = 0.42;
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

/**
 * 敵人實體：外觀、HP、受擊表現、死亡 / 重生。
 * 行為（移動、攻擊）由 systems/EnemyAI.ts 讀寫這裡的欄位；首領技能由 BossController 控制。
 * 每隻敵人有自己的材質副本，才能單獨閃白 / 變色。
 */
export class Enemy {
  readonly object = new THREE.Group();
  readonly def: EnemyDef;
  /** 目前的最大生命（首領會依玩家實力自動調整，v1.55；其他敵人 = def.stats.maxHp） */
  maxHp: number;
  /** 首領攻擊力倍率（開戰時依玩家實力決定，v1.55） */
  atkMul = 1;
  /** 首領強度調整（開戰時由 Game 建立，脫戰清掉） */
  scaler: BossScaler | null = null;
  /** 最近一次實際扣掉的血（被首領神力擋下時比原傷害少） */
  lastDealt = 0;
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
  /** 出手動作剩餘秒數（前搖結束那一下：往前撲、身體前傾，之後收回） */
  strikeT = 0;
  /** 出手動作的強度（1 = 普攻；首領招式的重擊可以更大） */
  strikePower = 1;
  /** 跳躍高度（首領飛撲；BossController 設定） */
  airY = 0;
  /** 首領：上次出手後受到的傷害（被狂打時會提早反擊） */
  hurtSince = 0;
  /** 首領：反擊冷卻 */
  counterCd = 0;
  /** 首領：兩次攻擊之間繞著玩家走的方向（±1）與換方向倒數 */
  strafeDir = 1;
  strafeT = 0;

  /** 出手 / 飛撲的整體姿勢（前傾、前撲）；body 是造型本身（造型動畫自己改 body） */
  private pose = new THREE.Group();
  private body = new THREE.Group();
  private materials: LitMaterial[] = [];
  private flash = 0;
  private tinted = false;
  private shake = 0;
  private stateTimer = 0;
  private hpBar: THREE.Group;
  private hpFill: THREE.Mesh;
  private hpBarTimer = 0;
  private animT = Math.random() * 10;
  /** 骨架動畫（骷髏） */
  rig: CharacterRig | null = null;
  private wasWinding = false;
  private wasStriking = false;
  private anims: RigAnims = DEFAULT_RIG;
  /** 程式模型的動畫（enemyShapes 提供；沒有就用預設的走路晃動） */
  private shapeAnim: ((st: ShapeAnimState) => void) | null = null;
  private animState: ShapeAnimState = { t: 0, dt: 0, moving: false, winding: false, lean: 0, scale: 1, strike: 0, body: this.body };
  /** 首領：動作平滑（程式模型）與轉身平滑 */
  private smoother: PoseSmoother | null = null;
  private yaw = 0;
  /** 首領材質（高光、地面遮蔽、邊緣光） */
  private look: BossLook | null = null;

  constructor(def: EnemyDef, spawn: SpawnDef) {
    this.def = def;
    this.spawn = spawn;
    this.pos = { x: spawn.x, z: spawn.z };
    this.home = { x: spawn.x, z: spawn.z };
    this.defense = spawn.def ?? def.stats.def;
    this.displayName = spawn.tag ? `${def.name}・${spawn.tag}` : def.boss ? `首領・${def.name}` : `Lv.${def.level} ${def.name}`;
    this.radius = def.radius * def.scale;
    this.maxHp = def.stats.maxHp;
    this.hp = this.maxHp;
    this.facing = Math.random() * Math.PI * 2;

    if (def.boss) this.look = new BossLook(new THREE.Color(def.color).lerp(new THREE.Color(0xffe8d0), 0.45).getHex());
    this.height = this.buildRig() ?? this.buildBody() * def.scale;
    if (!this.rig) this.mergeBody();
    if (def.boss && !this.rig) {
      this.smoother = new PoseSmoother(this.body);
      this.smoother.collect();
    }
    this.yaw = this.facing;
    this.body.scale.setScalar(def.scale);
    this.pose.add(this.body);
    this.object.add(this.pose);

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
    if (this.scaler) amount = this.scaler.clamp(this, amount);
    this.lastDealt = amount;
    this.hp = Math.max(0, this.hp - amount);
    this.flash = 1;
    // 首領被打只輕晃（出手中不晃，才不會像被打到僵直）
    this.shake = this.def.boss ? (this.windup > 0 || this.strikeT > 0 ? 0 : 0.25) : 1;
    if (this.def.boss) this.hurtSince += amount;
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
    // 依怪物顏色改模型材質（例如青蛙：寧芙潮蛙藍綠、奇美拉火蛙紅，肚子用淡一點的同色系）
    if (anims.recolor) {
      const body = new THREE.Color(this.def.color);
      for (const m of inst.materials) {
        const role = anims.recolor[m.name];
        if (role === 'body') m.color.copy(body);
        else if (role === 'belly') m.color.copy(body).lerp(new THREE.Color(0xfff2c4), 0.55);
      }
    }
    // 首領（堤豐巨蛙）：平面著色的模型重算平滑法線，並套用首領材質
    if (this.look) {
      inst.root.traverse((o) => {
        const sm = o as THREE.SkinnedMesh;
        if (sm.isSkinnedMesh) sm.geometry = smoothNormals(sm.geometry);
      });
      for (const m of inst.materials) {
        m.flatShading = false;
        this.look.apply(m);
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
      this.hpFill.scale.x = Math.max(0.001, this.hp / this.maxHp);
      this.hpBar.quaternion.copy(camera.quaternion);
    } else this.hpBar.visible = false;

    if (this.state === 'alive') this.animate(dt);
    this.object.position.set(this.pos.x, this.groundY + this.airY, this.pos.z);
    this.look?.update(this.groundY + this.body.position.y, this.height);
  }

  /** 依造型的待機 / 移動 / 前搖動畫 */
  private animate(dt: number) {
    const t = this.animT;
    const s = this.def.scale;
    if (this.def.boss) {
      // 首領轉身用追的（招式瞬間改朝向時不會「瞬間轉頭」）
      const d = Math.atan2(Math.sin(this.facing - this.yaw), Math.cos(this.facing - this.yaw));
      this.yaw += d * (1 - Math.exp(-dt * 12));
      this.object.rotation.y = this.yaw;
    } else this.object.rotation.y = this.facing;
    const lean = this.windup > 0 ? -0.25 : 0;
    this.strikePose(dt);
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
    if (this.shapeAnim) {
      const st = this.animState;
      st.t = t;
      st.dt = dt;
      st.moving = this.moving > 0.05;
      st.winding = this.windup > 0;
      st.lean = lean;
      st.scale = s;
      st.strike = this.strikeT > 0 ? this.strikeT / STRIKE_TIME : 0;
      this.shapeAnim(st);
    } else {
      // 預設：走路時上下晃、前搖後仰
      this.body.position.y = this.moving > 0.05 ? Math.abs(Math.sin(t * 9)) * 0.08 : 0;
      this.body.rotation.x = lean;
    }
    this.smoother?.apply(dt);
    this.moving = Math.max(0, this.moving - dt * 4);
  }

  /**
   * 出手動作（所有程式模型與骨架敵人共用）：
   * 前搖中身體往後收（蓄力），前搖一結束就往前撲＋前傾（0.08 秒衝出、之後緩緩收回），讓「打下去的那一下」看得到。
   */
  private strikePose(dt: number) {
    const winding = this.windup > 0;
    if (this.wasStriking && !winding && this.state === 'alive') this.strike(1);
    this.wasStriking = winding;
    const boss = this.def.boss;
    const reach = (boss ? 0.55 : 0.3) * this.strikePower;
    let z = 0;
    let pitch = 0;
    if (this.strikeT > 0) {
      this.strikeT = Math.max(0, this.strikeT - dt);
      const u = 1 - this.strikeT / STRIKE_TIME; // 0 → 1
      const k = u < 0.22 ? easeOut(u / 0.22) : 1 - easeInOut((u - 0.22) / 0.78);
      z = k * reach;
      pitch = k * (boss ? 0.2 : 0.28) * Math.min(1.4, this.strikePower);
    } else if (winding) {
      // 蓄力：微微往後收
      z = -reach * 0.25;
      pitch = -0.06;
    }
    // 姿勢本身也平滑（蓄力 → 撲出 不會一格跳過去）
    const a = 1 - Math.exp(-dt * (this.strikeT > 0 ? 40 : 14));
    this.pose.position.z += (z - this.pose.position.z) * a;
    this.pose.rotation.x += (pitch - this.pose.rotation.x) * a;
  }

  /** 播出手動作（首領招式結算時由 BossController 呼叫，power 越大撲得越猛） */
  strike(power = 1) {
    this.wasStriking = false;
    this.strikeT = STRIKE_TIME;
    this.strikePower = power;
  }

  /** 首領強度回到原本（脫戰、重生） */
  resetScaling() {
    this.maxHp = this.def.stats.maxHp;
    this.atkMul = 1;
    this.scaler = null;
  }

  private respawn() {
    this.state = 'alive';
    this.resetScaling();
    this.hp = this.maxHp;
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
    this.smoother?.reset();
    this.yaw = this.facing;
    this.strikeT = 0;
    this.airY = 0;
    this.hurtSince = 0;
    this.pose.position.set(0, 0, 0);
    this.pose.rotation.set(0, 0, 0);
    this.ai = 'idle';
    this.provoked = false;
    this.windup = 0;
    this.attackCd = 0;
  }

  /** 脫戰回到出生點：回滿血 */
  resetToHome() {
    this.aggroMinion = null;
    this.airY = 0;
    this.hurtSince = 0;
    this.resetScaling();
    this.hp = this.maxHp;
    this.provoked = false;
    this.windup = 0;
  }

  private m(color: number): LitMaterial {
    // 首領：平滑著色＋高光＋地面遮蔽＋邊緣光（配合 refineGeometry 的高分段）；小怪維持低多邊形的平面著色
    const mat = this.look ? this.look.material({ color }) : new THREE.MeshLambertMaterial({ color, flatShading: true });
    this.materials.push(mat);
    return mat;
  }

  private add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, parent: THREE.Object3D = this.body): THREE.Mesh {
    const mesh = new THREE.Mesh(this.def.boss ? refineGeometry(geo) : geo, this.m(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /**
   * 效能：把身體上直接掛著的零件合併成一個「頂點顏色」網格（一隻敵人 1 個 draw call）。
   * 會動的零件（蝙蝠翅膀掛在 pivot 下）與發光零件（MeshBasicMaterial）保持獨立。
   */
  private mergeBody() {
    const parts: THREE.Mesh[] = [];
    for (const c of this.body.children) {
      const m = c as THREE.Mesh;
      if (m.isMesh && (m.material instanceof THREE.MeshLambertMaterial || m.material instanceof THREE.MeshPhongMaterial)) parts.push(m);
    }
    if (parts.length < 2) return;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of parts) {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      const col = (m.material as LitMaterial).color;
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
      this.materials.splice(this.materials.indexOf(m.material as LitMaterial), 1);
      m.removeFromParent();
    }
    const mat = this.look ? this.look.material({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.materials.push(mat);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    this.body.add(mesh);
  }

  /** 程式模型：依 shape 從 enemyShapes 登記表建造（面向 +z），回傳模型高度（未縮放） */
  private buildBody(): number {
    const c = this.def.color;
    const self = this;
    const builder: ShapeBuilder = {
      def: this.def,
      boss: !!this.def.boss,
      body: this.body,
      color: c,
      dark: new THREE.Color(c).multiplyScalar(0.65).getHex(),
      light: new THREE.Color(c).lerp(new THREE.Color(0xffe8d0), 0.45).getHex(),
      add: (geo, color, x = 0, y = 0, z = 0, parent = this.body) => self.add(geo, color, x, y, z, parent),
      glow: (geo, color, x = 0, y = 0, z = 0, parent = this.body) => {
        const mesh = new THREE.Mesh(this.def.boss ? refineGeometry(geo) : geo, new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
      },
      group: (x = 0, y = 0, z = 0, parent = this.body) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        return g;
      },
      eyes: (y, z, gap = 0.2, size = 0.08) => {
        self.add(new THREE.SphereGeometry(size * 1.5, 6, 4), 0xffffff, -gap, y, z);
        self.add(new THREE.SphereGeometry(size * 1.5, 6, 4), 0xffffff, gap, y, z);
        self.add(new THREE.SphereGeometry(size, 6, 4), 0x1b2433, -gap, y, z + size);
        self.add(new THREE.SphereGeometry(size, 6, 4), 0x1b2433, gap, y, z + size);
        // 首領：瞳孔上的反光點，眼神比較有精神
        if (self.def.boss) for (const sx of [-1, 1]) builder.glow(new THREE.SphereGeometry(size * 0.32, 6, 4), 0xffffff, sx * gap + size * 0.3, y + size * 0.35, z + size * 1.85);
      },
    };
    const build = ENEMY_SHAPES[this.def.shape] ?? ENEMY_SHAPES.slime;
    const r = build(builder);
    this.shapeAnim = r.animate ?? null;
    return r.height;
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
