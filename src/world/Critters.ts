import * as THREE from 'three';
import type { CritterDef, CritterKind } from '@/data/types';
import type { CollisionWorld } from './Collision';

/**
 * 城裡的小動物（純裝飾，不影響玩法）：貓、狗、雞、小雞、鴿子、貓頭鷹、蝴蝶。
 * ------------------------------------------------------------
 * 效能：所有動物合成「一個」網格（頂點顏色、平面著色），每幀在 CPU 上把各部位
 * （身體、頭、腳、尾巴、翅膀）的頂點用各自的矩陣換算後寫回 position。
 * 整群動物只佔 1 個 draw call（＋1 個陰影），頂點總數約一萬多，換算成本很低。
 *
 * 行為：
 * - 貓：慢慢閒晃，停下來坐著或趴著，玩家靠近時轉頭看；太近會走開（趴著的有時懶得動）。
 * - 狗：閒晃、坐下搖尾巴；偶爾跑到玩家旁邊坐下、歪頭、尾巴猛搖，一陣子後失去興趣。
 * - 雞：在雞舍裡邊走邊啄地，玩家靠近會拍翅膀跑開；小雞跟在母雞旁邊。
 * - 鴿子：在廣場上啄食，玩家靠近整群飛起來，飛到別處降落。
 * - 貓頭鷹（雅典娜的鳥）：停在神殿屋頂，轉頭張望、眨眼，玩家靠近時盯著看。
 * - 蝴蝶：繞著花圃飛，偶爾停下來慢慢拍翅膀。
 */

interface Part {
  local: Float32Array;
  pivot: THREE.Vector3;
  /** 動畫用的位移（加在 pivot 上） */
  off: THREE.Vector3;
  rot: THREE.Euler;
  scale: THREE.Vector3;
}

type State = 'idle' | 'walk' | 'flee' | 'fly' | 'follow';

/* ---------- 建模工具 ---------- */
class Shape {
  parts: Record<string, Part> = {};
  colors: number[] = [];
  private cur: { pos: number[] } | null = null;
  private pending: { name: string; pivot: THREE.Vector3; pos: number[] }[] = [];

  part(name: string, px = 0, py = 0, pz = 0) {
    const p = { name, pivot: new THREE.Vector3(px, py, pz), pos: [] as number[] };
    this.pending.push(p);
    this.cur = p;
    return this;
  }

  add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    const a = g.getAttribute('position');
    const c = new THREE.Color(color);
    for (let i = 0; i < a.count; i++) {
      this.cur!.pos.push(a.getX(i), a.getY(i), a.getZ(i));
      this.colors.push(c.r, c.g, c.b);
    }
    geo.dispose();
    if (g !== geo) g.dispose();
    return this;
  }

  finish(): Record<string, Part> {
    for (const p of this.pending)
      this.parts[p.name] = { local: new Float32Array(p.pos), pivot: p.pivot, off: new THREE.Vector3(), rot: new THREE.Euler(), scale: new THREE.Vector3(1, 1, 1) };
    return this.parts;
  }
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const ball = (r: number, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
const cyl = (rt: number, rb: number, h: number, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 4) => new THREE.ConeGeometry(r, h, seg);

const PI = Math.PI;

/* ---------- 各種動物的外觀（正面朝 +z，腳底在 y=0） ---------- */
const CAT_COLORS = [
  { main: 0xe8964a, light: 0xf7e2c4, dark: 0xb9652a }, // 橘貓
  { main: 0x2d2a2e, light: 0xf2efe8, dark: 0x1c1a1d }, // 賓士貓
  { main: 0x9a9aa2, light: 0xe6e3dc, dark: 0x6c6c75 }, // 灰貓
];

function buildCat(s: Shape, v: number) {
  const c = CAT_COLORS[v % CAT_COLORS.length];
  s.part('body')
    .add(box(0.4, 0.34, 0.78), c.main, 0, 0.46, 0)
    .add(box(0.3, 0.22, 0.06), c.light, 0, 0.42, 0.39);
  if (v % 3 !== 1) for (const z of [-0.22, 0, 0.22]) s.add(box(0.42, 0.04, 0.08), c.dark, 0, 0.63, z);
  s.part('head', 0, 0.62, 0.36)
    .add(box(0.42, 0.34, 0.34), c.main, 0, 0.08, 0.1)
    .add(cone(0.09, 0.18), c.main, -0.13, 0.31, 0.06)
    .add(cone(0.09, 0.18), c.main, 0.13, 0.31, 0.06)
    .add(cone(0.05, 0.1), 0xf0a6b4, -0.13, 0.29, 0.1)
    .add(cone(0.05, 0.1), 0xf0a6b4, 0.13, 0.29, 0.1)
    .add(box(0.22, 0.12, 0.06), c.light, 0, 0.0, 0.28)
    .add(box(0.06, 0.04, 0.03), 0xf29bb0, 0, 0.05, 0.31)
    .add(box(0.07, 0.08, 0.02), 0x8fcf4a, -0.1, 0.13, 0.275)
    .add(box(0.07, 0.08, 0.02), 0x8fcf4a, 0.1, 0.13, 0.275)
    .add(box(0.025, 0.07, 0.025), 0x111111, -0.1, 0.13, 0.285)
    .add(box(0.025, 0.07, 0.025), 0x111111, 0.1, 0.13, 0.285);
  s.part('tail', 0, 0.58, -0.38).add(cyl(0.04, 0.055, 0.6, 5), c.main, 0, 0.3, 0).add(cyl(0.045, 0.045, 0.12, 5), c.dark, 0, 0.56, 0);
  for (const [n, x, z] of [['fl', -0.12, 0.26], ['fr', 0.12, 0.26], ['bl', -0.12, -0.26], ['br', 0.12, -0.26]] as const)
    s.part(n, x, 0.32, z).add(box(0.11, 0.32, 0.11), c.main, 0, -0.16, 0).add(box(0.12, 0.05, 0.14), c.light, 0, -0.3, 0.02);
}

const DOG_COLORS = [
  { main: 0xd2a05a, light: 0xf2dcb4, ear: 0xa8743a }, // 金黃
  { main: 0xf0ebe2, light: 0xffffff, ear: 0x7a5232 }, // 白底棕耳
];

function buildDog(s: Shape, v: number) {
  const c = DOG_COLORS[v % DOG_COLORS.length];
  s.part('body')
    .add(box(0.46, 0.42, 0.95), c.main, 0, 0.62, 0)
    .add(box(0.36, 0.3, 0.08), c.light, 0, 0.58, 0.47);
  if (v % 2 === 1) s.add(box(0.47, 0.25, 0.3), c.ear, 0, 0.72, -0.15);
  s.part('head', 0, 0.85, 0.45)
    .add(box(0.4, 0.36, 0.4), c.main, 0, 0.12, 0.12)
    .add(box(0.24, 0.18, 0.26), c.light, 0, 0.02, 0.4)
    .add(box(0.1, 0.07, 0.05), 0x1c1a1d, 0, 0.1, 0.54)
    .add(box(0.1, 0.26, 0.14), c.ear, -0.24, 0.08, 0.08)
    .add(box(0.1, 0.26, 0.14), c.ear, 0.24, 0.08, 0.08)
    .add(box(0.06, 0.07, 0.02), 0x1c1a1d, -0.1, 0.2, 0.325)
    .add(box(0.06, 0.07, 0.02), 0x1c1a1d, 0.1, 0.2, 0.325)
    .add(box(0.1, 0.03, 0.12), 0xe57a8a, 0, -0.08, 0.46)
    .add(box(0.44, 0.08, 0.44), 0x3d6fb6, 0, -0.08, 0.04); // 項圈
  s.part('tail', 0, 0.78, -0.47).add(cyl(0.045, 0.065, 0.45, 5), c.main, 0, 0.22, 0);
  for (const [n, x, z] of [['fl', -0.14, 0.32], ['fr', 0.14, 0.32], ['bl', -0.14, -0.32], ['br', 0.14, -0.32]] as const)
    s.part(n, x, 0.44, z).add(box(0.13, 0.44, 0.13), c.main, 0, -0.22, 0).add(box(0.14, 0.06, 0.16), c.light, 0, -0.41, 0.02);
}

function buildChicken(s: Shape, v: number, chick: boolean) {
  const main = chick ? 0xf6d34a : v % 2 ? 0xb8743a : 0xf4f1ea;
  const wing = chick ? 0xe9c03a : v % 2 ? 0x9a5a2a : 0xe2ddd2;
  s.part('body').add(ball(0.25), main, 0, 0.42, 0, 0, 0, 0, 0.9, 0.85, 1.15);
  if (!chick) s.add(cone(0.14, 0.32), main, 0, 0.6, -0.24, -0.7);
  s.part('head', 0, 0.56, 0.18).add(ball(0.13), main, 0, 0.12, 0.04);
  if (!chick)
    s.add(box(0.04, 0.1, 0.18), 0xe23b3b, 0, 0.27, 0.04)
      .add(box(0.04, 0.08, 0.04), 0xe23b3b, 0, 0.03, 0.15);
  s.add(cone(0.04, 0.1), 0xf0a23a, 0, 0.1, 0.19, PI / 2)
    .add(box(0.035, 0.04, 0.035), 0x111111, -0.1, 0.15, 0.11)
    .add(box(0.035, 0.04, 0.035), 0x111111, 0.1, 0.15, 0.11);
  s.part('wl', -0.2, 0.5, 0).add(box(0.06, 0.2, 0.32), wing, 0, -0.08, 0);
  s.part('wr', 0.2, 0.5, 0).add(box(0.06, 0.2, 0.32), wing, 0, -0.08, 0);
  for (const [n, x] of [['ll', -0.08], ['lr', 0.08]] as const)
    s.part(n, x, 0.24, 0).add(box(0.04, 0.24, 0.04), 0xe8a33a, 0, -0.12, 0).add(box(0.1, 0.02, 0.13), 0xe8a33a, 0, -0.235, 0.03);
}

function buildPigeon(s: Shape, v: number) {
  const body = v % 3 === 2 ? 0xe9e6df : 0x8d95a8;
  const wing = v % 3 === 2 ? 0xd6d2c8 : 0x9aa2b5;
  s.part('body')
    .add(ball(0.17), body, 0, 0.24, 0, 0, 0, 0, 0.85, 0.8, 1.3)
    .add(ball(0.09, 0), v % 3 === 2 ? 0xd9d4ca : 0x6a8f84, 0, 0.33, 0.1)
    .add(box(0.14, 0.04, 0.2), 0x6c7386, 0, 0.27, -0.25, 0.3)
    .add(box(0.03, 0.12, 0.03), 0xd9798a, -0.05, 0.06, 0.02)
    .add(box(0.03, 0.12, 0.03), 0xd9798a, 0.05, 0.06, 0.02);
  s.part('head', 0, 0.38, 0.14)
    .add(ball(0.09), body, 0, 0.06, 0.03)
    .add(cone(0.025, 0.08), 0xd9c9a0, 0, 0.05, 0.13, PI / 2)
    .add(box(0.03, 0.03, 0.03), 0xf08a2a, -0.07, 0.08, 0.07)
    .add(box(0.03, 0.03, 0.03), 0xf08a2a, 0.07, 0.08, 0.07);
  s.part('wl', -0.11, 0.32, -0.03).add(box(0.34, 0.03, 0.22), wing, -0.17, 0, 0);
  s.part('wr', 0.11, 0.32, -0.03).add(box(0.34, 0.03, 0.22), wing, 0.17, 0, 0);
}

function buildOwl(s: Shape) {
  const brown = 0x8a6a48;
  s.part('body')
    .add(ball(0.26), brown, 0, 0.3, 0, 0, 0, 0, 1, 1.25, 0.9)
    .add(ball(0.2), 0xd9c7a3, 0, 0.27, 0.11, 0, 0, 0, 0.9, 1.1, 0.5)
    .add(box(0.16, 0.05, 0.2), 0x6e5238, 0, 0.06, -0.2, -0.5)
    .add(box(0.06, 0.05, 0.1), 0xe8a33a, -0.08, 0.02, 0.12)
    .add(box(0.06, 0.05, 0.1), 0xe8a33a, 0.08, 0.02, 0.12);
  s.part('head', 0, 0.58, 0)
    .add(ball(0.24), brown, 0, 0.12, 0, 0, 0, 0, 1.1, 0.9, 0.95)
    .add(cyl(0.12, 0.12, 0.04, 10), 0xe8d8b8, -0.09, 0.12, 0.19, PI / 2)
    .add(cyl(0.12, 0.12, 0.04, 10), 0xe8d8b8, 0.09, 0.12, 0.19, PI / 2)
    .add(cyl(0.07, 0.07, 0.03, 8), 0xf2c230, -0.09, 0.12, 0.215, PI / 2)
    .add(cyl(0.07, 0.07, 0.03, 8), 0xf2c230, 0.09, 0.12, 0.215, PI / 2)
    .add(cyl(0.035, 0.035, 0.02, 6), 0x111111, -0.09, 0.12, 0.233, PI / 2)
    .add(cyl(0.035, 0.035, 0.02, 6), 0x111111, 0.09, 0.12, 0.233, PI / 2)
    .add(cone(0.06, 0.18), brown, -0.16, 0.31, 0, 0, 0, 0.4)
    .add(cone(0.06, 0.18), brown, 0.16, 0.31, 0, 0, 0, -0.4)
    .add(cone(0.03, 0.09), 0xb88a2a, 0, 0.05, 0.22, 2.6);
  // 眼皮：眨眼時 scale.y 從 0 變 1
  s.part('lids', 0, 0.58, 0)
    .add(cyl(0.075, 0.075, 0.02, 8), brown, -0.09, 0.12, 0.245, PI / 2)
    .add(cyl(0.075, 0.075, 0.02, 8), brown, 0.09, 0.12, 0.245, PI / 2);
  s.part('wl', -0.24, 0.48, -0.02).add(box(0.08, 0.38, 0.3), 0x6e5238, 0, -0.18, 0);
  s.part('wr', 0.24, 0.48, -0.02).add(box(0.08, 0.38, 0.3), 0x6e5238, 0, -0.18, 0);
}

const BUTTERFLY_COLORS = [0xffc93a, 0x7fc8ff, 0xff8fb0, 0xffffff];

function buildButterfly(s: Shape, v: number) {
  const c = BUTTERFLY_COLORS[v % BUTTERFLY_COLORS.length];
  s.part('body').add(cyl(0.022, 0.018, 0.18, 4), 0x2b2622, 0, 0, 0, PI / 2);
  s.part('wl').add(box(0.26, 0.01, 0.2), c, -0.13, 0, 0.02).add(box(0.18, 0.012, 0.12), c, -0.1, 0, -0.12);
  s.part('wr').add(box(0.26, 0.01, 0.2), c, 0.13, 0, 0.02).add(box(0.18, 0.012, 0.12), c, 0.1, 0, -0.12);
}

const SPEC: Record<CritterKind, { radius: number; walk: number; run: number; scale: number }> = {
  cat: { radius: 0.4, walk: 1.1, run: 3.2, scale: 1 },
  dog: { radius: 0.5, walk: 1.6, run: 4.6, scale: 1 },
  chicken: { radius: 0.3, walk: 0.8, run: 3.2, scale: 1 },
  chick: { radius: 0.18, walk: 0.9, run: 2.6, scale: 0.5 },
  pigeon: { radius: 0.2, walk: 0.7, run: 6, scale: 1 },
  owl: { radius: 0.3, walk: 0, run: 0, scale: 1.1 },
  butterfly: { radius: 0.1, walk: 1.2, run: 1.2, scale: 1 },
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function wrapAngle(a: number) {
  while (a > PI) a -= PI * 2;
  while (a < -PI) a += PI * 2;
  return a;
}
const approach = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * Math.min(1, rate * dt);

interface Env {
  collision: CollisionWorld;
  heightAt(x: number, z: number): number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

class Critter {
  readonly kind: CritterKind;
  readonly parts: Part[];
  readonly p: Record<string, Part>;
  x: number;
  z: number;
  /** 離地高度（飛行、停在高處） */
  y = 0;
  heading: number;
  pitch = 0;
  roll = 0;
  bob = 0;
  state: State = 'idle';
  stateT = rnd(0, 3);
  tx = 0;
  tz = 0;
  speed = 0;
  gait = Math.random() * 10;
  /** 閒置姿勢：0 站、1 坐、2 趴 */
  pose = 0;
  poseK = 0;
  peckT = 0;
  stuckT = 0;
  lastD = 0;
  cooldown = rnd(4, 12);
  /** 飛行用 */
  fx0 = 0;
  fz0 = 0;
  flyT = 0;
  flyDur = 1;
  headYaw = 0;
  blinkT = rnd(1, 4);
  t = Math.random() * 100;
  mother: Critter | null = null;
  private area: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(
    readonly def: CritterDef,
    parts: Record<string, Part>,
    private env: Env,
  ) {
    this.kind = def.kind;
    this.p = parts;
    this.parts = Object.values(parts);
    this.x = def.x;
    this.z = def.z;
    this.heading = def.rot ?? Math.random() * PI * 2;
    const b = env.bounds;
    this.area = def.area
      ? { minX: def.area.x - def.area.w / 2, maxX: def.area.x + def.area.w / 2, minZ: def.area.z - def.area.d / 2, maxZ: def.area.z + def.area.d / 2 }
      : { minX: b.minX + 3, maxX: b.maxX - 3, minZ: b.minZ + 3, maxZ: b.maxZ - 3 };
    if (this.kind === 'pigeon') this.pose = 0;
    if (this.kind === 'owl') this.y = def.perchY ?? 0;
  }

  get spec() {
    return SPEC[this.kind];
  }

  /* ---------- 移動目標 ---------- */
  private free(x: number, z: number): boolean {
    const probe = { x, z };
    this.env.collision.resolve(probe, this.spec.radius + 0.25);
    return Math.abs(probe.x - x) + Math.abs(probe.z - z) < 0.01;
  }

  private pickTarget(cx?: number, cz?: number, r?: number): boolean {
    const a = this.area;
    for (let i = 0; i < 10; i++) {
      let x: number;
      let z: number;
      if (cx !== undefined && cz !== undefined && r !== undefined) {
        const ang = Math.random() * PI * 2;
        const d = Math.random() * r;
        x = cx + Math.cos(ang) * d;
        z = cz + Math.sin(ang) * d;
      } else {
        // 大多走附近（3~8m），看起來比較自然
        const ang = Math.random() * PI * 2;
        const d = rnd(2, 8);
        x = this.x + Math.cos(ang) * d;
        z = this.z + Math.sin(ang) * d;
      }
      x = Math.max(a.minX, Math.min(a.maxX, x));
      z = Math.max(a.minZ, Math.min(a.maxZ, z));
      if (this.free(x, z)) {
        this.tx = x;
        this.tz = z;
        this.lastD = Math.hypot(x - this.x, z - this.z);
        this.stuckT = 0;
        return true;
      }
    }
    return false;
  }

  private setState(s: State, t: number) {
    this.state = s;
    this.stateT = t;
  }

  private goIdle(min: number, max: number) {
    this.setState('idle', rnd(min, max));
    const r = Math.random();
    if (this.kind === 'cat') this.pose = r < 0.45 ? 1 : r < 0.8 ? 2 : 0;
    else if (this.kind === 'dog') this.pose = r < 0.6 ? 1 : 0;
    else this.pose = 0;
  }

  /** 朝目標移動；抵達回傳 true */
  private moveTo(dt: number, speed: number): boolean {
    const dx = this.tx - this.x;
    const dz = this.tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) return true;
    const want = Math.atan2(dx, dz);
    this.heading += wrapAngle(want - this.heading) * Math.min(1, dt * 7);
    // 先轉向再走（轉很大的角度時放慢）
    const facing = Math.cos(wrapAngle(want - this.heading));
    const v = speed * Math.max(0.15, facing);
    this.x += Math.sin(this.heading) * v * dt;
    this.z += Math.cos(this.heading) * v * dt;
    const pos = { x: this.x, z: this.z };
    this.env.collision.resolve(pos, this.spec.radius);
    this.x = pos.x;
    this.z = pos.z;
    this.speed = v;
    // 卡住偵測：1.2 秒內沒有更接近目標就放棄
    this.stuckT += dt;
    if (this.stuckT > 1.2) {
      if (this.lastD - d < 0.3) return true;
      this.lastD = d;
      this.stuckT = 0;
    }
    return false;
  }

  /* ---------- 每幀 ---------- */
  update(dt: number, px: number, pz: number, all: Critter[]) {
    this.t += dt;
    this.stateT -= dt;
    this.cooldown -= dt;
    this.speed = 0;
    const dP = Math.hypot(px - this.x, pz - this.z);
    switch (this.kind) {
      case 'owl':
        this.updateOwl(dt, px, pz, dP);
        return;
      case 'butterfly':
        this.updateButterfly(dt);
        return;
      case 'pigeon':
        if (this.updatePigeon(dt, px, pz, dP, all)) return;
        break;
      default:
        this.react(px, pz, dP);
    }

    if (this.state === 'idle') {
      if (this.stateT <= 0) {
        if (this.kind === 'chick' && this.mother) this.pickTarget(this.mother.x, this.mother.z, 1.2) && this.setState('walk', 6);
        else if (this.pickTarget()) this.setState('walk', 10);
        else this.goIdle(1, 3);
      }
    } else if (this.state === 'walk' || this.state === 'flee') {
      const run = this.state === 'flee';
      if (this.moveTo(dt, run ? this.spec.run : this.spec.walk) || this.stateT <= 0) this.goIdle(...this.idleRange());
    } else if (this.state === 'follow') {
      // 狗：跑到玩家旁邊（1.8m）坐下
      if (dP > 2.2) {
        const ang = Math.atan2(this.x - px, this.z - pz);
        this.tx = px + Math.sin(ang) * 1.8;
        this.tz = pz + Math.cos(ang) * 1.8;
        this.moveTo(dt, dP > 5 ? this.spec.run : this.spec.walk * 1.6);
        this.pose = 0;
        this.stuckT = 0;
      } else {
        this.heading += wrapAngle(Math.atan2(px - this.x, pz - this.z) - this.heading) * Math.min(1, dt * 5);
        this.pose = 1;
      }
      if (this.stateT <= 0 || dP > 14) {
        this.cooldown = rnd(15, 30);
        this.goIdle(2, 5);
      }
    }

    // 別跟玩家重疊
    if (dP < this.spec.radius + 0.6 && dP > 1e-3) {
      const push = (this.spec.radius + 0.6 - dP) / dP;
      this.x -= (px - this.x) * push;
      this.z -= (pz - this.z) * push;
    }
    // 有指定活動範圍的（雞舍）一定留在範圍裡
    if (this.def.area) {
      const a = this.area;
      this.x = Math.max(a.minX, Math.min(a.maxX, this.x));
      this.z = Math.max(a.minZ, Math.min(a.maxZ, this.z));
    }
    this.animateWalker(dt, px, pz, dP);
  }

  private idleRange(): [number, number] {
    switch (this.kind) {
      case 'cat':
        return [4, 11];
      case 'dog':
        return [3, 7];
      case 'chick':
        return [0.5, 2];
      default:
        return [1.2, 4];
    }
  }

  /** 對玩家的反應（貓、狗、雞、小雞） */
  private react(px: number, pz: number, dP: number) {
    const fleeFrom = (dist: number) => {
      const ang = Math.atan2(this.x - px, this.z - pz) + rnd(-0.6, 0.6);
      const x = this.x + Math.sin(ang) * dist;
      const z = this.z + Math.cos(ang) * dist;
      const a = this.area;
      this.tx = Math.max(a.minX, Math.min(a.maxX, x));
      this.tz = Math.max(a.minZ, Math.min(a.maxZ, z));
      this.lastD = Math.hypot(this.tx - this.x, this.tz - this.z);
      this.stuckT = 0;
      this.setState('flee', 2.5);
      this.pose = 0;
    };
    if (this.kind === 'chicken' || this.kind === 'chick') {
      if (dP < 2.4 && this.state !== 'flee') fleeFrom(3.5);
    } else if (this.kind === 'cat') {
      // 太近：站著或坐著的會走開；趴著的一半機率懶得理你
      if (dP < 1.6 && this.state === 'idle' && this.stateT > 0) {
        if (this.pose === 2 && Math.random() < 0.5) this.stateT = rnd(4, 8);
        else {
          fleeFrom(4);
          this.state = 'walk';
        }
      }
    } else if (this.kind === 'dog') {
      if (this.state === 'idle' && this.cooldown <= 0 && dP < 9 && Math.random() < 0.01) this.setState('follow', rnd(8, 14));
    }
  }

  private animateWalker(dt: number, px: number, pz: number, dP: number) {
    const p = this.p;
    const moving = this.speed > 0.05;
    const running = this.state === 'flee' || this.speed > this.spec.walk * 1.5;
    this.gait += dt * (moving ? 3 + this.speed * (this.kind === 'chicken' || this.kind === 'chick' ? 9 : 5) : 0);
    const sw = Math.sin(this.gait);
    const targetPose = moving ? 0 : this.pose;
    this.poseK = approach(this.poseK, targetPose, 6, dt);

    // 閒置時看玩家（貓狗）
    let lookYaw = 0;
    if (!moving && dP < 5 && (this.kind === 'cat' || this.kind === 'dog')) lookYaw = Math.max(-1, Math.min(1, wrapAngle(Math.atan2(px - this.x, pz - this.z) - this.heading)));
    this.headYaw = approach(this.headYaw, lookYaw, 4, dt);

    if (this.kind === 'cat' || this.kind === 'dog') {
      const sit = Math.max(0, 1 - Math.abs(this.poseK - 1)); // pose 1 的權重
      const lie = Math.max(0, this.poseK - 1); // pose 2 的權重
      const amp = running ? 0.9 : 0.55;
      const legSwing = moving ? sw * amp : 0;
      p.fl.rot.x = legSwing + sit * 0.42;
      p.br.rot.x = legSwing - sit * 1.3;
      p.fr.rot.x = -legSwing + sit * 0.42;
      p.bl.rot.x = -legSwing - sit * 1.3;
      const legS = 1 - lie * 0.8;
      for (const n of ['fl', 'fr', 'bl', 'br']) p[n].scale.y = legS;
      this.pitch = -sit * 0.42;
      this.bob = (moving ? Math.abs(sw) * 0.04 : 0) + sit * 0.04 - lie * (this.kind === 'cat' ? 0.25 : 0.33);
      p.head.rot.set(sit * 0.38 + (moving ? Math.sin(this.gait * 2) * 0.05 : 0), this.headYaw, 0);
      if (this.kind === 'cat') {
        p.tail.rot.x = moving ? -0.5 : -0.9 - lie * 0.6;
        p.tail.rot.z = Math.sin(this.t * (moving ? 3 : 1.4)) * (moving ? 0.15 : 0.35);
      } else {
        const happy = this.state === 'follow' ? 1 : 0;
        p.tail.rot.x = -0.6 - lie * 0.5;
        p.tail.rot.z = Math.sin(this.t * (happy ? 22 : moving ? 10 : 5)) * (happy ? 0.7 : 0.35);
        p.head.rot.z = happy && !moving ? Math.sin(this.t * 0.8) * 0.25 : 0; // 歪頭
      }
    } else if (this.kind === 'chicken' || this.kind === 'chick') {
      p.ll.rot.x = moving ? sw * 0.7 : 0;
      p.lr.rot.x = moving ? -sw * 0.7 : 0;
      this.bob = moving ? Math.abs(sw) * 0.03 : 0;
      this.roll = moving ? sw * 0.06 : 0;
      // 走路時頭前後點；停下來啄地
      let peck = 0;
      if (!moving) {
        this.peckT -= dt;
        if (this.peckT < -0.35) this.peckT = Math.random() < 0.6 ? rnd(0.2, 1.4) : rnd(1.5, 3);
        if (this.peckT < 0) peck = Math.sin((-this.peckT / 0.35) * PI);
      }
      p.head.off.z = moving ? Math.sin(this.gait) * 0.04 : 0;
      p.head.rot.x = peck * 1.1;
      p.head.off.y = -peck * 0.12;
      this.pitch = peck * 0.25;
      const flap = this.state === 'flee' ? Math.sin(this.t * 30) * 0.7 + 0.6 : 0;
      p.wl.rot.z = -flap;
      p.wr.rot.z = flap;
    }
  }

  /* ---------- 鴿子 ---------- */
  private updatePigeon(dt: number, px: number, pz: number, dP: number, all: Critter[]): boolean {
    const p = this.p;
    if (this.state === 'fly') {
      this.flyT += dt;
      const k = Math.max(0, Math.min(1, this.flyT / this.flyDur)); // flyT < 0：同伴慢一拍才起飛
      const e = k * k * (3 - 2 * k);
      const nx = this.fx0 + (this.tx - this.fx0) * e;
      const nz = this.fz0 + (this.tz - this.fz0) * e;
      if (Math.hypot(nx - this.x, nz - this.z) > 1e-4) this.heading += wrapAngle(Math.atan2(nx - this.x, nz - this.z) - this.heading) * Math.min(1, dt * 8);
      this.x = nx;
      this.z = nz;
      this.y = Math.sin(k * PI) * 3.6 + (k < 0.15 ? k * 4 : 0);
      const flapSpeed = k > 0.8 ? 16 : 26;
      const flap = Math.sin(this.t * flapSpeed) * 0.9;
      p.wl.scale.x = p.wr.scale.x = 1;
      p.wl.rot.z = flap;
      p.wr.rot.z = -flap;
      this.pitch = k < 0.3 ? -0.3 : k > 0.8 ? -0.5 : 0.05;
      p.head.off.z = 0;
      p.head.rot.x = 0;
      if (k >= 1) {
        this.y = 0;
        this.pitch = 0;
        this.goIdle(1, 3);
      }
      return true;
    }
    // 收起翅膀：縮短、往下貼在身體兩側
    p.wl.rot.z = 1.35;
    p.wr.rot.z = -1.35;
    p.wl.scale.x = p.wr.scale.x = 0.45;
    this.y = 0;
    // 玩家靠近：起飛（附近的同伴也跟著飛）
    if (dP < 3) {
      this.takeOff(px, pz);
      for (const o of all) if (o !== this && o.kind === 'pigeon' && o.state !== 'fly' && Math.hypot(o.x - this.x, o.z - this.z) < 4) o.takeOff(px, pz, rnd(0, 0.25));
      return true;
    }
    if (this.state === 'idle' && this.stateT <= 0 && Math.random() < 0.004) {
      this.takeOff(this.x + rnd(-10, 10), this.z + rnd(-10, 10));
      return true;
    }
    // 走路：頭大幅前後點
    const moving = this.state === 'walk';
    p.head.off.z = moving ? Math.sin(this.gait * 2) * 0.05 : 0;
    this.roll = moving ? Math.sin(this.gait) * 0.08 : 0;
    this.gait += dt * (moving ? 12 : 0);
    let peck = 0;
    if (!moving) {
      this.peckT -= dt;
      if (this.peckT < -0.3) this.peckT = rnd(0.3, 2.2);
      if (this.peckT < 0) peck = Math.sin((-this.peckT / 0.3) * PI);
    }
    p.head.rot.x = peck * 1.2;
    p.head.off.y = -peck * 0.08;
    this.pitch = peck * 0.3;
    return false;
  }

  private takeOff(fromX: number, fromZ: number, delay = 0) {
    // 降落點：離威脅 8~14m 的空地
    const a = this.area;
    let ok = false;
    for (let i = 0; i < 12 && !ok; i++) {
      const ang = Math.atan2(this.x - fromX, this.z - fromZ) + rnd(-1.1, 1.1);
      const d = rnd(8, 14);
      const x = Math.max(a.minX, Math.min(a.maxX, this.x + Math.sin(ang) * d));
      const z = Math.max(a.minZ, Math.min(a.maxZ, this.z + Math.cos(ang) * d));
      if (Math.hypot(x - fromX, z - fromZ) > 6 && this.free(x, z)) {
        this.tx = x;
        this.tz = z;
        ok = true;
      }
    }
    if (!ok) {
      this.tx = this.def.x + rnd(-2, 2);
      this.tz = this.def.z + rnd(-2, 2);
    }
    this.fx0 = this.x;
    this.fz0 = this.z;
    this.flyT = -delay;
    this.flyDur = Math.max(1.4, Math.hypot(this.tx - this.x, this.tz - this.z) / 5.5);
    this.setState('fly', 99);
  }

  /* ---------- 貓頭鷹 ---------- */
  private updateOwl(dt: number, px: number, pz: number, dP: number) {
    const p = this.p;
    if (this.stateT <= 0) {
      this.stateT = rnd(1.5, 4);
      this.tx = Math.random() < 0.3 ? rnd(-2.4, 2.4) : rnd(-0.8, 0.8); // 偶爾把頭轉到後面
    }
    const target = dP < 12 ? Math.max(-2.6, Math.min(2.6, wrapAngle(Math.atan2(px - this.x, pz - this.z) - this.heading))) : this.tx;
    this.headYaw = approach(this.headYaw, target, 5, dt);
    p.head.rot.y = this.headYaw;
    p.head.rot.z = Math.sin(this.t * 0.7) * 0.08;
    // 眨眼
    this.blinkT -= dt;
    if (this.blinkT < -0.14) this.blinkT = rnd(1.5, 5);
    p.lids.rot.copy(p.head.rot);
    p.lids.scale.set(1, this.blinkT < 0 ? 1 : 0, 1);
    // 偶爾伸展翅膀
    const stretch = Math.max(0, Math.sin(this.t * 0.25) - 0.92) * 12;
    p.wl.rot.z = -stretch * 0.6;
    p.wr.rot.z = stretch * 0.6;
    this.bob = Math.sin(this.t * 1.3) * 0.01;
  }

  /* ---------- 蝴蝶 ---------- */
  private updateButterfly(dt: number) {
    const p = this.p;
    const resting = this.stateT > 0 && this.state === 'idle';
    if (this.stateT <= 0) {
      if (this.state === 'idle') this.setState('walk', rnd(5, 12));
      else this.setState('idle', rnd(1.5, 3.5));
    }
    if (!resting) {
      this.gait += dt;
      const g = this.gait;
      const nx = this.def.x + Math.sin(g * 0.7) * 2.2 + Math.sin(g * 1.9) * 0.6;
      const nz = this.def.z + Math.sin(g * 0.45 + 1) * 1.6 + Math.cos(g * 1.3) * 0.5;
      if (Math.hypot(nx - this.x, nz - this.z) > 1e-4) this.heading = Math.atan2(nx - this.x, nz - this.z);
      this.x = nx;
      this.z = nz;
      this.y = approach(this.y, 1.1 + Math.sin(g * 2.3) * 0.35, 4, dt);
    } else this.y = approach(this.y, 0.85, 3, dt);
    const flap = resting ? Math.sin(this.t * 3) * 0.5 + 0.6 : Math.sin(this.t * 22) * 1.1;
    p.wl.rot.z = -flap;
    p.wr.rot.z = flap;
    this.pitch = resting ? 0 : -0.25;
  }
}

/* ---------- 整群動物：一個網格 ---------- */
export class Critters {
  readonly mesh: THREE.Mesh;
  private list: Critter[] = [];
  private posAttr: THREE.BufferAttribute;
  private m = new THREE.Matrix4();
  private root = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(defs: CritterDef[], env: Env) {
    const colors: number[] = [];
    for (const def of defs) {
      const shape = new Shape();
      const v = def.variant ?? 0;
      switch (def.kind) {
        case 'cat':
          buildCat(shape, v);
          break;
        case 'dog':
          buildDog(shape, v);
          break;
        case 'chicken':
          buildChicken(shape, v, false);
          break;
        case 'chick':
          buildChicken(shape, v, true);
          break;
        case 'pigeon':
          buildPigeon(shape, v);
          break;
        case 'owl':
          buildOwl(shape);
          break;
        case 'butterfly':
          buildButterfly(shape, v);
          break;
      }
      const parts = shape.finish();
      colors.push(...shape.colors);
      this.list.push(new Critter(def, parts, env));
    }
    // 小雞認媽媽：最近的母雞
    for (const c of this.list) {
      if (c.kind !== 'chick') continue;
      let best: Critter | null = null;
      let bd = Infinity;
      for (const o of this.list)
        if (o.kind === 'chicken') {
          const d = Math.hypot(o.x - c.x, o.z - c.z);
          if (d < bd) (bd = d), (best = o);
        }
      c.mother = best;
    }
    const n = colors.length / 3;
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); // 平面著色用不到，只是讓著色器有這個屬性
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    this.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // 頂點每幀在變，包圍球不準
    this.write(env);
  }

  get count() {
    return this.list.length;
  }

  /** 每幀：行為 → 把各部位頂點寫回網格 */
  update(dt: number, px: number, pz: number, env: Env) {
    for (const c of this.list) c.update(dt, px, pz, this.list);
    this.write(env);
  }

  private write(env: Env) {
    const out = this.posAttr.array as Float32Array;
    let o = 0;
    for (const c of this.list) {
      const sc = SPEC[c.kind].scale;
      const gy = c.kind === 'owl' ? 0 : env.heightAt(c.x, c.z);
      this.e.set(c.pitch, c.heading, c.roll, 'YXZ');
      this.q.setFromEuler(this.e);
      this.root.compose(this.v.set(c.x, gy + c.y + c.bob, c.z), this.q, this.s.set(sc, sc, sc));
      for (const part of c.parts) {
        this.q.setFromEuler(part.rot);
        this.m.compose(this.v.copy(part.pivot).add(part.off), this.q, part.scale).premultiply(this.root);
        const me = this.m.elements;
        const L = part.local;
        for (let i = 0; i < L.length; i += 3) {
          const x = L[i];
          const y = L[i + 1];
          const z = L[i + 2];
          out[o++] = me[0] * x + me[4] * y + me[8] * z + me[12];
          out[o++] = me[1] * x + me[5] * y + me[9] * z + me[13];
          out[o++] = me[2] * x + me[6] * y + me[10] * z + me[14];
        }
      }
    }
    this.posAttr.needsUpdate = true;
  }

  /** 除錯用：目前各動物狀態 */
  debug() {
    return this.list.map((c) => ({ kind: c.kind, x: +c.x.toFixed(1), z: +c.z.toFixed(1), y: +c.y.toFixed(1), state: c.state }));
  }
}
