import * as THREE from 'three';
import type { MinionDef, MinionId } from '@/data/minions';
import type { Stats } from '@/data/types';
import { buildBoneSkeleton, poseBones, type BonePose, type BoneRig, type BoneStyle } from './BoneSkeleton';
import type { Enemy } from './Enemy';

/**
 * 召喚物（召喚師的骷髏）：外觀、HP、動畫。AI 在 systems/MinionManager.ts。
 *
 * 外觀細節（和敵人的骷髏區分）：
 * - 程式骷髏（entities/BoneSkeleton.ts）：細長手腳骨、肋骨、有眼窩與牙齒的頭骨，關節會動。
 *   （KayKit 骷髏是Q版大頭，在斜俯視鏡頭下看起來像一根柱子，所以不用）
 *   斯巴達亡靈：劍；提瑞西阿斯亡靈：紫色尖帽＋法杖＋杖頂光球；埃阿斯亡靈：有角鐵盔、肩甲、斧＋大盾。
 * - 眼窩裡的紫色靈魂之火、身邊往上飄的靈魂火焰。
 * - 腳下旋轉的召喚法陣：存在時間越少，法陣越小越淡（看得出還能留多久）。
 * - 出場：法陣先亮起，骷髏從地底爬出來；倒下：沉入地面、冒紫煙、碎骨四散。
 */

/** 各召喚物的裝備與特效設定 */
const GEAR: Record<MinionId, { style: BoneStyle; eye: number; wisps: number; rune: number }> = {
  skeleton_minion: { style: 'soldier', eye: 0xc77dff, wisps: 1, rune: 1 },
  skeleton_mage: { style: 'mage', eye: 0x8fd8ff, wisps: 2, rune: 1.1 },
  skeleton_warrior: { style: 'guard', eye: 0xff6ad5, wisps: 3, rune: 1.45 },
};

const SPAWN_TIME = 0.7;
const DEATH_TIME = 1.2;

/* ---------- 共用貼圖（第一次用到時用 Canvas 畫） ---------- */
let glowTex: THREE.Texture | null = null;
let runeTex: THREE.Texture | null = null;
let smokeTex: THREE.Texture | null = null;

function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 柔和光點（眼睛、靈魂火焰、杖頂光球） */
function getGlow() {
  return (glowTex ??= canvasTex(64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  }));
}

/** 召喚法陣：雙圓環＋六芒星＋一圈符文刻痕 */
function getRune() {
  return (runeTex ??= canvasTex(256, (c, s) => {
    const m = s / 2;
    c.translate(m, m);
    c.strokeStyle = '#ffffff';
    c.shadowColor = '#ffffff';
    c.shadowBlur = 6;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 0, m * 0.92, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(0, 0, m * 0.74, 0, Math.PI * 2);
    c.stroke();
    // 六芒星
    c.lineWidth = 3;
    for (const off of [0, Math.PI / 3]) {
      c.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = off + (i * Math.PI * 2) / 3 - Math.PI / 2;
        const x = Math.cos(a) * m * 0.72;
        const y = Math.sin(a) * m * 0.72;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
    // 外環符文刻痕
    c.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r0 = m * 0.77;
      const r1 = m * (i % 3 === 0 ? 0.9 : 0.84);
      c.beginPath();
      c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      c.lineTo(Math.cos(a + (i % 2 ? 0.08 : -0.08)) * r1, Math.sin(a + (i % 2 ? 0.08 : -0.08)) * r1);
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 0, m * 0.18, 0, Math.PI * 2);
    c.stroke();
  }));
}

/** 煙霧（倒下時） */
function getSmoke() {
  return (smokeTex ??= canvasTex(64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  }));
}

function glowSprite(color: number, size: number, opacity = 1): THREE.Sprite {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlow(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.setScalar(size);
  return sp;
}

interface Wisp {
  sprite: THREE.Sprite;
  t: number;
  speed: number;
  ox: number;
  oz: number;
}

interface Bit {
  obj: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  smoke: boolean;
}

export class Minion {
  readonly object = new THREE.Group();
  readonly pos = { x: 0, z: 0 };
  facing = 0;
  hp: number;
  maxHp: number;
  /** 依召喚師當下屬性計算（召喚時固定） */
  stats: Stats;
  life: number;
  target: Enemy | null = null;
  attackCd = 0;
  windup = 0;
  groundY = 0;
  moving = 0;
  /** 死亡後倒地淡出的計時（> 0 表示正在消失） */
  dying = 0;
  /** 召喚順序（跟隨站位用） */
  slot = 0;
  private bones: BoneRig;
  private pose: BonePose = { t: 0, walk: 0, moving: 0, swingT: 0, swingTotal: 1, windupFrac: 0.6, hitT: 0, cast: false };
  /** 會動的身體（骨架＋武器＋眼睛），出場時從地底升起 */
  private body = new THREE.Group();
  private materials: THREE.MeshLambertMaterial[] = [];
  private hpBar = new THREE.Group();
  private hpFill: THREE.Mesh;
  private flash = 0;
  private spawnT = SPAWN_TIME;
  private rune: THREE.Mesh;
  private runeMat: THREE.MeshBasicMaterial;
  private eyes: THREE.Sprite[] = [];
  private orb: THREE.Sprite | null = null;
  private wisps: Wisp[] = [];
  private bits: Bit[] = [];
  /** 自己建立、要釋放的資源（共用的模型幾何、貼圖不在這裡） */
  private owned: { dispose(): void }[] = [];
  private t = Math.random() * 10;

  constructor(readonly def: MinionDef, owner: Stats, x: number, z: number) {
    this.pos.x = x;
    this.pos.z = z;
    this.maxHp = Math.round(owner.maxHp * def.hpMul);
    this.hp = this.maxHp;
    this.life = def.life;
    this.stats = { ...owner, atk: owner.atk * def.atkMul, def: owner.def * def.defMul, maxHp: this.maxHp };
    const gear = GEAR[def.id];
    this.object.add(this.body);

    // 程式骷髏（關節會動）
    this.bones = buildBoneSkeleton(gear.style, def.height, def.glow);
    this.body.add(this.bones.root);
    this.materials.push(...this.bones.materials);
    this.owned.push(...this.bones.owned);
    this.pose.cast = !!def.ranged;
    // 眼窩裡的靈魂之火
    for (const ep of this.bones.eyePos) {
      const sp = glowSprite(gear.eye, def.height * 0.16);
      this.owned.push(sp.material);
      sp.position.copy(ep);
      this.bones.head.add(sp);
      this.eyes.push(sp);
    }
    // 提瑞西阿斯亡靈：杖頂光球
    if (this.bones.staffTip && this.bones.weapon) {
      this.orb = glowSprite(0xb48cff, 0.55);
      this.owned.push(this.orb.material);
      // 光球掛在手臂上（跟著揮動），位置換算成手臂座標
      this.bones.root.updateMatrixWorld(true);
      const tip = this.bones.weapon.localToWorld(this.bones.staffTip.clone());
      this.bones.armR.worldToLocal(tip);
      this.orb.position.copy(tip);
      this.bones.armR.add(this.orb);
    }

    // 召喚法陣（貼地、旋轉）
    const rg = new THREE.PlaneGeometry(1, 1);
    this.runeMat = new THREE.MeshBasicMaterial({ map: getRune(), color: gear.eye, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.owned.push(rg, this.runeMat);
    this.rune = new THREE.Mesh(rg, this.runeMat);
    this.rune.rotation.x = -Math.PI / 2;
    this.rune.position.y = 0.05;
    this.rune.renderOrder = 4;
    this.object.add(this.rune);

    // 靈魂火焰
    for (let i = 0; i < gear.wisps; i++) {
      const sp = glowSprite(gear.eye, 0.22, 0);
      this.owned.push(sp.material);
      this.object.add(sp);
      this.wisps.push({ sprite: sp, t: i / gear.wisps, speed: 0.55 + Math.random() * 0.3, ox: 0, oz: 0 });
    }

    // 血條（受傷時才顯示）
    const w = 1.1;
    const bgGeo = new THREE.PlaneGeometry(w, 0.12);
    const fillGeo = new THREE.PlaneGeometry(w - 0.05, 0.08);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x1b2433, depthTest: false, transparent: true, opacity: 0.85 });
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x8ce06a, depthTest: false });
    this.owned.push(bgGeo, fillGeo, bgMat, fillMat);
    const bg = new THREE.Mesh(bgGeo, bgMat);
    this.hpFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpFill.geometry.translate((w - 0.05) / 2, 0, 0);
    this.hpFill.position.set(-(w - 0.05) / 2, 0, 0.001);
    bg.renderOrder = 20;
    this.hpFill.renderOrder = 21;
    this.hpBar.add(bg, this.hpFill);
    this.hpBar.position.y = def.height + 0.3;
    this.hpBar.visible = false;
    this.object.add(this.hpBar);

    this.object.position.set(x, 0, z);
    this.body.position.y = -def.height; // 從地底開始
  }

  get alive() {
    return this.hp > 0 && this.life > 0 && this.dying <= 0;
  }

  get radius() {
    return this.def.radius;
  }

  /** 受到傷害，回傳實際扣血量 */
  takeDamage(amount: number): number {
    if (!this.alive) return 0;
    const dealt = Math.min(this.hp, amount);
    this.hp -= dealt;
    this.flash = 0.4;
    if (this.hp <= 0) this.die();
    else if (this.windup <= 0) this.pose.hitT = 0.25;
    return dealt;
  }

  /** 倒下（時間到、被打死、冥府骨爆）：沉入地面、冒紫煙、碎骨四散 */
  die() {
    if (this.dying > 0) return;
    this.dying = DEATH_TIME;
    this.hp = 0;
    this.target = null;
    this.windup = 0;
    this.hpBar.visible = false;
    const color = GEAR[this.def.id].eye;
    const h = this.def.height;
    for (let i = 0; i < 7; i++) {
      const mat = new THREE.SpriteMaterial({ map: getSmoke(), color: i % 2 ? color : 0x6a5a8a, transparent: true, opacity: 0.6, depthWrite: false });
      this.owned.push(mat);
      const sp = new THREE.Sprite(mat);
      const a = (i / 7) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 0.3, h * (0.2 + Math.random() * 0.4), Math.sin(a) * 0.3);
      sp.scale.setScalar(0.5);
      this.object.add(sp);
      this.bits.push({ obj: sp, vx: Math.cos(a) * 0.6, vy: 0.8 + Math.random() * 0.6, vz: Math.sin(a) * 0.6, spin: 0, smoke: true });
    }
    // 碎骨
    const geo = new THREE.BoxGeometry(0.07, 0.07, 0.28);
    const mat = new THREE.MeshLambertMaterial({ color: 0xe8e0ff, emissive: new THREE.Color(color).multiplyScalar(0.25) });
    this.owned.push(geo, mat);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2;
      m.position.set(0, h * 0.5, 0);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.object.add(m);
      this.bits.push({ obj: m, vx: Math.cos(a) * (1.5 + Math.random()), vy: 3 + Math.random() * 2, vz: Math.sin(a) * (1.5 + Math.random()), spin: 8 + Math.random() * 8, smoke: false });
    }
    // 靈魂火焰往上散去
    for (const w of this.wisps) w.speed *= 2.5;
  }

  /** 出手動畫 */
  swing() {
    this.pose.swingTotal = this.def.windup + 0.3;
    this.pose.swingT = this.pose.swingTotal;
    this.pose.windupFrac = this.def.windup / this.pose.swingTotal;
    if (this.orb) this.orb.scale.multiplyScalar(1.6);
  }

  /** 每幀：動畫、外觀（AI 由 MinionManager 處理） */
  update(dt: number, camera: THREE.Camera) {
    this.t += dt;
    const h = this.def.height;
    const gear = GEAR[this.def.id];
    this.object.position.set(this.pos.x, this.groundY, this.pos.z);
    this.body.rotation.y = this.facing;

    // ---- 出場：法陣亮起 → 骷髏從地底爬出 ----
    let runeScale = gear.rune * this.def.radius * 3.4;
    let runeOpacity = 0.55;
    if (this.spawnT > 0) {
      this.spawnT = Math.max(0, this.spawnT - dt);
      const k = 1 - this.spawnT / SPAWN_TIME; // 0 → 1
      const rise = Math.min(1, Math.max(0, (k - 0.25) / 0.75));
      this.body.position.y = -h * (1 - rise) * (1 - rise);
      runeScale *= 0.4 + Math.min(1, k * 2) * 0.9;
      runeOpacity = 0.95 - k * 0.4;
    } else if (this.dying > 0) {
      // ---- 倒下：沉入地面 ----
      this.dying -= dt;
      const k = 1 - this.dying / DEATH_TIME;
      this.body.position.y = -Math.max(0, k - 0.35) * h * 1.2;
      runeOpacity = 0.55 * (1 - k);
      runeScale *= 1 + k * 0.4;
    } else {
      this.body.position.y = 0;
      // 存在時間越少，法陣越小越淡
      const lifeK = Math.min(1, this.life / this.def.life);
      runeScale *= 0.55 + 0.45 * lifeK;
      runeOpacity = 0.2 + 0.4 * lifeK;
    }
    this.rune.scale.setScalar(runeScale);
    this.rune.rotation.z += dt * (this.spawnT > 0 ? 4 : 0.8);
    this.runeMat.opacity = runeOpacity;

    // 骨架動作（走路、攻擊、施法、受擊）；倒下時往後倒、頭掉下來滾開
    if (this.dying > 0) {
      const k = 1 - this.dying / DEATH_TIME;
      const b = this.bones;
      b.root.rotation.x = -Math.min(1, k * 3) * 1.45;
      b.root.position.y = -Math.min(1, k * 3) * h * 0.32;
      b.armL.rotation.x = b.armR.rotation.x = -1.2 * Math.min(1, k * 3);
      b.head.position.z = 0.02 * h + Math.min(1, k * 2.5) * h * 0.35;
      b.head.rotation.z = k * 4;
    } else {
      this.pose.t = this.t;
      this.pose.moving = this.moving;
      poseBones(this.bones, this.pose, dt, GEAR[this.def.id].style);
    }
    this.moving = Math.max(0, this.moving - dt * 4);

    // ---- 眼睛閃爍、杖頂光球呼吸 ----
    const flick = 0.75 + Math.sin(this.t * 9) * 0.12 + Math.sin(this.t * 23) * 0.08;
    for (const e of this.eyes) (e.material as THREE.SpriteMaterial).opacity = this.dying > 0 ? Math.max(0, this.dying / DEATH_TIME - 0.3) : flick;
    if (this.orb) {
      const base = this.orb.userData.base ?? (this.orb.userData.base = this.orb.scale.x);
      const target = base * (1 + Math.sin(this.t * 4) * 0.12);
      this.orb.scale.setScalar(this.orb.scale.x + (target - this.orb.scale.x) * Math.min(1, dt * 8));
      (this.orb.material as THREE.SpriteMaterial).opacity = this.dying > 0 ? 0 : 0.9;
    }

    // ---- 靈魂火焰：從身體周圍往上飄 ----
    for (const w of this.wisps) {
      w.t += dt * w.speed;
      if (w.t >= 1) {
        w.t -= 1;
        const a = Math.random() * Math.PI * 2;
        const r = this.def.radius * (0.6 + Math.random() * 0.6);
        w.ox = Math.cos(a) * r;
        w.oz = Math.sin(a) * r;
      }
      const k = w.t;
      w.sprite.position.set(w.ox + Math.sin(this.t * 3 + k * 6) * 0.08, h * (0.25 + k * 0.95) + this.body.position.y * 0.5, w.oz);
      w.sprite.scale.setScalar((0.24 - k * 0.14) * (this.def.id === 'skeleton_warrior' ? 1.3 : 1));
      (w.sprite.material as THREE.SpriteMaterial).opacity = this.spawnT > 0 ? 0 : Math.sin(k * Math.PI) * (this.dying > 0 ? 0.5 : 0.75);
    }

    // ---- 倒下的煙霧與碎骨 ----
    for (const b of this.bits) {
      if (b.smoke) {
        b.obj.position.x += b.vx * dt;
        b.obj.position.y += b.vy * dt;
        b.obj.position.z += b.vz * dt;
        b.obj.scale.multiplyScalar(1 + dt * 1.6);
        const m = (b.obj as THREE.Sprite).material as THREE.SpriteMaterial;
        m.opacity = Math.max(0, m.opacity - dt * 0.55);
      } else {
        b.vy -= 12 * dt;
        b.obj.position.x += b.vx * dt;
        b.obj.position.y = Math.max(0.04, b.obj.position.y + b.vy * dt);
        b.obj.position.z += b.vz * dt;
        if (b.obj.position.y <= 0.04) {
          b.vx *= 0.6;
          b.vz *= 0.6;
          b.vy = Math.abs(b.vy) * 0.25;
          b.spin *= 0.5;
        }
        b.obj.rotation.x += b.spin * dt;
        b.obj.rotation.y += b.spin * 0.6 * dt;
      }
    }

    // ---- 受擊閃白；快消失時閃爍 ----
    if (this.flash > 0 || this.life < 3) {
      this.flash = Math.max(0, this.flash - dt * 5);
      const blink = this.life < 3 && this.alive ? (Math.sin(this.life * 14) > 0 ? 0.25 : 0) : 0;
      const g = this.def.glow;
      for (const m of this.materials) m.emissive.setRGB(g * 0.7 + this.flash + blink, g * 0.2 + this.flash + blink, g + this.flash + blink);
    }
    this.hpFill.scale.x = Math.max(0.001, this.hp / this.maxHp);
    // 滿血時不顯示血條（召喚物多時畫面比較乾淨）
    this.hpBar.visible = this.alive && this.hp < this.maxHp;
    this.hpBar.quaternion.copy(camera.quaternion);
  }

  dispose() {
    this.object.removeFromParent();
    for (const o of this.owned) o.dispose();
    this.owned = [];
  }
}
