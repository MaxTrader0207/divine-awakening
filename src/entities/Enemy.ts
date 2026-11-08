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
  /**
   * 仇恨（v1.58，首領用）：最近受到的傷害，依來源累計、隨時間衰減（BossController 每幀衰減）。
   * key = 召喚物 / 夥伴物件；玩家本人記在 threatPlayer。
   */
  threat = new Map<object, number>();
  threatPlayer = 0;
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
  /** 無盡試煉塔（v1.73）：不脫戰、一直追玩家 */
  hunter = false;
  /** 無盡試煉塔詞綴「狂暴」：移動與出手速度倍率 */
  hasteMul = 1;
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
  /** v1.96 飛行模型的根節點（上下飄） */
  private rigRoot: THREE.Object3D | null = null;
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

  /** v1.77 難度倍率（神話難度）：重生 / 脫戰時 resetScaling 會回到這個基準，而不是 1 */
  baseHpMul = 1;
  baseAtkMul = 1;
  /** 擊倒時的經驗、金幣倍率（神話難度） */
  expMul = 1;
  goldMul = 1;
  /** 顯示與結算用的等級（神話難度會高於 def.level） */
  level: number;

  constructor(def: EnemyDef, spawn: SpawnDef) {
    this.def = def;
    this.level = spawn.level ?? def.level;
    this.spawn = spawn;
    this.pos = { x: spawn.x, z: spawn.z };
    this.home = { x: spawn.x, z: spawn.z };
    this.defense = spawn.def ?? def.stats.def;
    this.displayName = spawn.tag ? `${def.name}・${spawn.tag}` : def.boss ? `首領・${def.name}` : `Lv.${this.level} ${def.name}`;
    this.radius = def.radius * def.scale;
    this.maxHp = def.stats.maxHp;
    this.hp = this.maxHp;
    this.facing = Math.random() * Math.PI * 2;

    if (def.boss) this.look = new BossLook(new THREE.Color(def.color).lerp(new THREE.Color(0xffe8d0), 0.45).getHex());
    this.height = this.buildRig() ?? this.buildBody() * def.scale;
    if (!this.rig) this.mergeTree();
    if (!def.boss) this.dropShadows();
    if (!def.boss && !this.rig) this.skinTree();
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
  takeDamage(amount: number, source?: object): boolean {
    if (!this.alive) return false;
    // 脫戰回歸中：只閃白不扣血（防止拉怪後偷打）
    if (this.ai === 'return') {
      this.flash = 0.5;
      return false;
    }
    if (this.scaler) amount = this.scaler.clamp(this, amount);
    this.lastDealt = amount;
    if (this.def.boss) {
      if (source) this.threat.set(source, (this.threat.get(source) ?? 0) + amount);
      else this.threatPlayer += amount;
    }
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
        // 有貼圖的模型：貼圖顏色 × 淡化的怪物色，保留貼圖的明暗與花紋
        else if (role === 'tint') {
          m.map = m.map && neutralTexture(m.map);
          m.color.copy(body).lerp(new THREE.Color(0xffffff), 0.15).multiplyScalar(1.3);
        }
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
    if (anims.hover) {
      this.rigRoot = inst.root;
      inst.root.position.y = anims.hover;
    }
    this.rig = new CharacterRig(inst);
    this.materials.push(...inst.materials);
    this.rig.setLoop(anims.idle, 0);
    return h * this.def.scale;
  }

  /** 前搖中（出手前），身體會變紅並後仰，讓玩家看得出要攻擊了 */
  /** 圓形影子用（v1.84）：離地高度、倒下縮小比例 */
  get blobLift() {
    return Math.max(0, this.airY + this.body.position.y);
  }
  get blobFade() {
    return this.state === 'dying' ? Math.max(0.2, this.body.scale.x / this.def.scale) : 1;
  }

  get winding() {
    return this.windup > 0;
  }

  update(dt: number, camera: THREE.Camera) {
    this.animT += dt;
    this.rig?.update(dt);
    // v1.96 飛行模型（蝙蝠）：上下飄，倒下時落地
    if (this.rigRoot && this.anims.hover) {
      const fly = this.state === 'dying' ? Math.max(0, this.stateTimer - 0.3) / 0.8 : 1;
      this.rigRoot.position.y = (this.anims.hover + Math.sin(this.animT * 3 + this.spawn.x) * 0.12) * Math.min(1, fly);
    }
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
    this.maxHp = this.def.stats.maxHp * this.baseHpMul;
    this.atkMul = this.baseAtkMul;
    this.scaler = null;
    this.threat.clear();
    this.threatPlayer = 0;
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
   * 效能：把零件合併成「頂點顏色」網格，減少 draw call。
   * v1.81：從「只合併身體直屬的零件」擴大到每個關節群組（頭、腳、尾巴的 pivot）——群組裡的零件一起動，
   * 合併後動畫照樣能動。為了不弄壞造型動畫，先實際跑幾種姿勢（走路、蓄力、出手），
   * 動畫會直接改到位置 / 旋轉 / 縮放 / 顯示 / 顏色的網格不合併；有子物件的網格也不合併。
   * 受光零件（Lambert / Phong）合成一個，發光零件（MeshBasic、不透明）另外合成一個。
   */
  /** 造型動畫會切換顯示或改顏色的網格（不能併進 skinTree） */
  private animFixed = new Set<THREE.Object3D>();
  private skeletons: THREE.Skeleton[] = [];

  /**
   * 效能（v1.84）：小怪的程式模型整隻合成 1～2 個「剛體蒙皮」網格（受光一個、發光一個）。
   * 每個零件（含 mergeTree 合併後的網格）當作一根骨頭：頂點只跟著它原本那個零件動，權重 1。
   * 零件物件本身留在原位（造型動畫照樣改它的位置 / 旋轉 / 縮放），只把它的幾何換成空的（不畫）。
   * 會切換顯示、改顏色、半透明、有貼圖的零件不處理，維持原樣。
   */
  private skinTree() {
    this.object.updateMatrixWorld(true);
    const groups: Record<'lit' | 'glow', { parts: THREE.Mesh[] }> = { lit: { parts: [] }, glow: { parts: [] } };
    this.body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material) || this.animFixed.has(m)) return;
      let p: THREE.Object3D | null = m;
      while (p && p !== this.body) {
        if (!p.visible || this.animFixed.has(p)) return;
        p = p.parent;
      }
      const mat = m.material as THREE.Material;
      if (mat.transparent || (mat as THREE.MeshLambertMaterial).map) return;
      if (mat instanceof THREE.MeshLambertMaterial || mat instanceof THREE.MeshPhongMaterial) groups.lit.parts.push(m);
      else if (mat instanceof THREE.MeshBasicMaterial) groups.glow.parts.push(m);
    });
    const total = groups.lit.parts.length + groups.glow.parts.length;
    if (total < 3) return;
    const inv = new THREE.Matrix4().copy(this.body.matrixWorld).invert();
    const local = new THREE.Matrix4();
    const EMPTY = new THREE.BufferGeometry();
    for (const kind of ['lit', 'glow'] as const) {
      const parts = groups[kind].parts;
      if (!parts.length) continue;
      const geos: THREE.BufferGeometry[] = [];
      const boneInverses: THREE.Matrix4[] = [];
      parts.forEach((m, bi) => {
        local.multiplyMatrices(inv, m.matrixWorld);
        const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(local);
        const n = g.attributes.position.count;
        if (local.determinant() < 0) {
          // 鏡像零件：三角形繞向反了，換回來才不會被背面剔除
          for (const name of Object.keys(g.attributes)) {
            const a = g.attributes[name] as THREE.BufferAttribute;
            for (let i = 0; i + 2 < n; i += 3) for (let c = 0; c < a.itemSize; c++) {
              const t = a.getComponent(i + 1, c);
              a.setComponent(i + 1, c, a.getComponent(i + 2, c));
              a.setComponent(i + 2, c, t);
            }
          }
        }
        const mat = m.material as THREE.MeshBasicMaterial;
        const src = g.attributes.color as THREE.BufferAttribute | undefined;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const k = mat.vertexColors && src ? 1 : 0;
          col[i * 3] = (k ? src!.getX(i) : 1) * mat.color.r;
          col[i * 3 + 1] = (k ? src!.getY(i) : 1) * mat.color.g;
          col[i * 3 + 2] = (k ? src!.getZ(i) : 1) * mat.color.b;
        }
        for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
        if (!g.attributes.normal) g.computeVertexNormals();
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(n * 4).fill(0).map((_, j) => (j % 4 === 0 ? bi : 0)), 4));
        g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(n * 4).map((_, j) => (j % 4 === 0 ? 1 : 0)), 4));
        geos.push(g);
        boneInverses.push(local.clone().invert());
      });
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      for (const m of parts) {
        if (!m.geometry.userData.shared) m.geometry.dispose();
        const mat = m.material as THREE.Material;
        const k = this.materials.indexOf(mat as LitMaterial);
        if (k >= 0) this.materials.splice(k, 1);
        mat.dispose();
        m.geometry = EMPTY;
        m.castShadow = false;
      }
      const mat: THREE.Material = kind === 'lit' ? new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : new THREE.MeshBasicMaterial({ vertexColors: true });
      if (kind === 'lit') this.materials.push(mat as LitMaterial);
      const skinned = new THREE.SkinnedMesh(merged, mat);
      skinned.name = 'rigid-skin';
      // 骨頭就是零件物件本身（Skeleton 只用到 matrixWorld）
      const skeleton = new THREE.Skeleton(parts as unknown as THREE.Bone[], boneInverses);
      this.body.add(skinned);
      skinned.bind(skeleton, new THREE.Matrix4());
      // 包圍球：綁定姿勢再放大，涵蓋動畫的擺動（之後不重算）
      merged.computeBoundingSphere();
      skinned.boundingSphere = merged.boundingSphere!.clone();
      skinned.boundingSphere.radius *= 1.5;
      this.skeletons.push(skeleton);
    }
  }

  private mergeTree() {
    const nodes: THREE.Object3D[] = [];
    this.body.traverse((o) => nodes.push(o));
    const moved = new Set<THREE.Object3D>();
    const anim = this.shapeAnim;
    if (anim) {
      const snap = nodes.map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone(), v: o.visible }));
      const matKey = (m: THREE.Mesh) => {
        const mat = m.material as THREE.MeshBasicMaterial;
        return `${mat.color?.getHexString?.() ?? ''}|${mat.opacity}|${mat.visible}`;
      };
      const mats = new Map<THREE.Mesh, string>();
      for (const o of nodes) if ((o as THREE.Mesh).isMesh) mats.set(o as THREE.Mesh, matKey(o as THREE.Mesh));
      const st = this.animState;
      const samples: [number, boolean, boolean, number][] = [[0.37, false, false, 0], [1.93, true, false, 0], [3.31, false, true, 0.5], [5.07, true, true, 1], [7.7, false, false, 0.9]];
      for (const [t, mv, wd, strike] of samples) {
        st.t = t;
        st.dt = 0.016;
        st.moving = mv;
        st.winding = wd;
        st.lean = 0.2;
        st.scale = 1;
        st.strike = strike;
        anim(st);
        for (const x of snap) if (!x.o.position.equals(x.p) || !x.o.quaternion.equals(x.q) || !x.o.scale.equals(x.s) || x.o.visible !== x.v) moved.add(x.o);
        for (const x of snap) if (x.o.visible !== x.v) this.animFixed.add(x.o);
        for (const [m, k] of mats) if (matKey(m) !== k) {
          moved.add(m);
          this.animFixed.add(m);
        }
      }
      for (const x of snap) {
        x.o.position.copy(x.p);
        x.o.quaternion.copy(x.q);
        x.o.scale.copy(x.s);
        x.o.visible = x.v;
      }
    }
    // 每個容器（身體、群組）各自合併直屬的零件
    for (const node of nodes) {
      if ((node as THREE.Mesh).isMesh) continue;
      const lit: THREE.Mesh[] = [];
      const glow: THREE.Mesh[] = [];
      for (const c of node.children) {
        const m = c as THREE.Mesh;
        if (!m.isMesh || moved.has(m) || m.children.length || !m.visible) continue;
        if (m.material instanceof THREE.MeshLambertMaterial || m.material instanceof THREE.MeshPhongMaterial) lit.push(m);
        else if (m.material instanceof THREE.MeshBasicMaterial && !m.material.transparent && !m.material.map) glow.push(m);
      }
      this.mergeParts(node, lit, true);
      this.mergeParts(node, glow, false);
    }
  }

  private mergeParts(parent: THREE.Object3D, parts: THREE.Mesh[], lit: boolean) {
    if (parts.length < 2) return;
    const geos: THREE.BufferGeometry[] = [];
    for (const m of parts) {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      if (!g.attributes.normal) g.computeVertexNormals();
      const col = (m.material as THREE.MeshBasicMaterial).color;
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([col.r, col.g, col.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      geos.push(g);
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    const shadow = parts.some((m) => m.castShadow);
    for (const m of parts) {
      m.geometry.dispose();
      const mat = m.material as THREE.Material;
      const k = this.materials.indexOf(mat as LitMaterial);
      if (k >= 0) this.materials.splice(k, 1);
      mat.dispose();
      m.removeFromParent();
    }
    let mat: THREE.Material;
    if (lit) {
      mat = this.look ? this.look.material({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      this.materials.push(mat as LitMaterial);
    } else mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = lit && shadow;
    parent.add(mesh);
  }

  /**
   * 效能（v1.84）：小怪不畫真正的陰影，改由 EnemyManager 統一畫圓形影子（全部小怪合起來 1 個 draw call）。
   * v1.81 時只留最大的 2 個零件投影，副本裡小怪的陰影仍佔 25～40 個 draw call。首領照舊投影。
   */
  private dropShadows() {
    this.body.traverse((o) => {
      (o as THREE.Mesh).castShadow = false;
    });
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
    for (const sk of this.skeletons) sk.dispose();
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

/** v1.96 有貼圖的怪物模型換色：把貼圖裡飽和的主色（蝙蝠的棕毛）轉成明亮的灰，材質顏色再乘上怪物色（同一張貼圖共用） */
const NEUTRAL_CACHE = new WeakMap<THREE.Texture, THREE.Texture>();
function neutralTexture(src: THREE.Texture): THREE.Texture {
  const hit = NEUTRAL_CACHE.get(src);
  if (hit) return hit;
  const img = src.image as CanvasImageSource & { width: number; height: number };
  const cv = img?.width ? document.createElement('canvas') : null;
  const ctx = cv?.getContext('2d', { willReadFrequently: true });
  if (!cv || !ctx) return src;
  cv.width = img.width;
  cv.height = img.height;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  const c = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < d.length; i += 4) {
    c.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    c.getHSL(hsl);
    if (hsl.s < 0.3) continue;
    const v = Math.min(1, 0.25 + hsl.l * 1.4);
    d[i] = d[i + 1] = d[i + 2] = v * 255;
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.flipY = src.flipY;
  t.colorSpace = src.colorSpace;
  t.wrapS = src.wrapS;
  t.wrapT = src.wrapT;
  t.magFilter = src.magFilter;
  t.minFilter = src.minFilter;
  NEUTRAL_CACHE.set(src, t);
  return t;
}
