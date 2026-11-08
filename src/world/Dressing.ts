import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PatchDef, ZoneDef } from '@/data/types';
import type { MapTheme, ParticleKind, ScatterDef, ScatterKind } from '@/data/mapThemes';
import type { CollisionWorld } from './Collision';
import { mat } from './Props';
import { reachMap } from './zoneCollision';

/**
 * 地圖景觀（v1.92）：依 data/mapThemes.ts 的主題替關卡加上地面、邊界、散佈裝飾、飄落粒子、寶箱位置。
 * 全部由 ZoneDef 決定（種子＝關卡 id），同一張圖每次進來長得一樣。
 *
 * 效能：地面 1 個 draw call（道路色塊畫進地面頂點色，比以前每個色塊一個網格還少）；
 * 邊界用共用材質，由 Zone.mergeStatic 依顏色合併；散佈裝飾每種 1～2 個 InstancedMesh；粒子 1 個 Points。
 */

/* ---------------- 小工具 ---------------- */

export function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(i: number, j: number, s: number): number {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 平滑的值雜訊（0~1） */
function vnoise(x: number, z: number, s: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j, s);
  const b = hash2(i + 1, j, s);
  const c = hash2(i, j + 1, s);
  const d = hash2(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, z: number, s: number): number {
  return vnoise(x, z, s) * 0.6 + vnoise(x * 2.1, z * 2.1, s + 7) * 0.28 + vnoise(x * 4.3, z * 4.3, s + 13) * 0.12;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 點到矩形色塊的有號距離（裡面為負） */
function rectSd(p: PatchDef, x: number, z: number): number {
  const dx = Math.abs(x - p.x) - p.w / 2;
  const dz = Math.abs(z - p.z) - p.d / 2;
  const ox = Math.max(dx, 0);
  const oz = Math.max(dz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(dx, dz), 0);
}

/* ---------------- 地面 ---------------- */

const GROUND_PAD = 30;
const GROUND_STEP = 1.0;
/** 散佈裝飾整體放大（鏡頭很高，原尺寸幾乎看不到） */
const SCATTER_SCALE = 1.7;

export class Dressing {
  /** 粒子、寶箱等會動的東西（不參與 mergeStatic） */
  readonly dynamic = new THREE.Group();
  /** 自動挑的寶箱位置 */
  treasureSpots: { x: number; z: number }[] = [];
  private seed: number;
  private particles: THREE.Points | null = null;
  private pvel: Float32Array | null = null;
  private pphase: Float32Array | null = null;
  private pkind: ParticleKind | null = null;
  private t = 0;

  constructor(
    private def: ZoneDef,
    readonly theme: MapTheme,
    private col: CollisionWorld,
    private heightAt: (x: number, z: number) => number,
  ) {
    let h = 0;
    for (let i = 0; i < def.id.length; i++) h = (h * 31 + def.id.charCodeAt(i)) | 0;
    this.seed = Math.abs(h) % 9973;
  }

  /** 外圍緩坡高度（可走範圍內是 0） */
  outerHeight(x: number, z: number): number {
    const { w, d } = this.def.size;
    const dx = Math.max(0, Math.abs(x) - w / 2);
    const dzN = Math.max(0, -z - d / 2);
    const dzS = Math.max(0, z - d / 2);
    const dist = Math.max(dx, dzN, dzS * 1.0);
    if (dist <= 0) return 0;
    // 南邊（鏡頭那側）坡度減半，免得擋住角色
    const south = dzS > Math.max(dx, dzN) ? 0.4 : 1;
    const n = 0.55 + 0.45 * fbm(x * 0.08, z * 0.08, this.seed + 3);
    return this.theme.ground.hills * south * smooth(1.5, 16, dist) * n;
  }

  buildGround(): THREE.Mesh {
    const { def, theme } = this;
    const { w, d } = def.size;
    const W = w + GROUND_PAD * 2;
    const D = d + GROUND_PAD * 2;
    const geo = new THREE.PlaneGeometry(W, D, Math.ceil(W / GROUND_STEP), Math.ceil(D / GROUND_STEP));
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(def.groundColor);
    const outer = base.clone().multiplyScalar(0.86);
    const blotch = new THREE.Color(theme.ground.blotch ?? def.groundColor);
    const shore = new THREE.Color(theme.ground.shore ?? def.groundColor);
    const hillTop = new THREE.Color(theme.border.colors[0]);
    const land = def.patches.filter((p) => !p.water);
    const water = def.patches.filter((p) => p.water);
    const pcol = land.map((p) => new THREE.Color(p.color));
    const c = new THREE.Color();
    const tmp = new THREE.Color();
    const e = theme.ground.edge;
    const s = this.seed;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const outDist = Math.max(Math.abs(x) - w / 2, Math.abs(z) - d / 2);
      // 地圖邊緣往外 4 公尺慢慢變暗，不再有一條硬邊
      c.copy(base).lerp(outer, smooth(-1, 4, outDist));
      // 大塊斑紋
      const bn = fbm(x * 0.07, z * 0.07, s + 21);
      c.lerp(blotch, smooth(0.5, 0.75, bn) * (theme.ground.blotchAmt ?? 0));
      // 道路 / 色塊：柔和、不規則的邊緣
      const jit = (vnoise(x * 0.6, z * 0.6, s + 5) - 0.5) * e * 1.2;
      for (let k = 0; k < land.length; k++) {
        const sd = rectSd(land[k], x, z) + jit;
        const t = 1 - smooth(-e / 2, e / 2, sd);
        if (t > 0) c.lerp(tmp.copy(pcol[k]).multiplyScalar(0.94 + 0.12 * vnoise(x * 0.9, z * 0.9, s + 9 + k)), t);
      }
      // 水邊濕沙
      for (const p of water) {
        const sd = rectSd(p, x, z);
        if (sd > -0.2 && sd < 1.8) c.lerp(shore, (1 - smooth(0, 1.8, sd)) * 0.75);
      }
      // 亮度雜訊（細）
      const n = fbm(x * 0.35, z * 0.35, s) - 0.5;
      c.multiplyScalar(1 + n * theme.ground.noise * 2);
      // 外圍緩坡：越高越接近邊界岩石 / 樹林的顏色
      const h = this.outerHeight(x, z);
      if (h > 0) {
        pos.setY(i, h - 0.02);
        c.lerp(hillTop, smooth(0.5, 5, h) * 0.45);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.receiveShadow = true;
    m.name = 'ground';
    return m;
  }

  /* ---------------- 邊界 ---------------- */

  /** 可走範圍外一圈懸崖 / 樹林…（共用材質，之後由 mergeStatic 合併） */
  buildBorder(parent: THREE.Object3D) {
    const { w, d } = this.def.size;
    const b = this.theme.border;
    const rng = seededRng(this.def.id + ':border');
    const sides: { len: number; at: (u: number, out: number) => [number, number]; south: boolean }[] = [
      { len: w + 16, at: (u, o) => [u - (w + 16) / 2, -d / 2 - o], south: false },
      { len: d + 16, at: (u, o) => [-w / 2 - o, u - (d + 16) / 2], south: false },
      { len: d + 16, at: (u, o) => [w / 2 + o, u - (d + 16) / 2], south: false },
      { len: w + 16, at: (u, o) => [u - (w + 16) / 2, d / 2 + o], south: true },
    ];
    for (const side of sides) {
      const n = Math.round(side.len * b.density * (side.south ? 0.5 : 1));
      for (let k = 0; k < n; k++) {
        // 兩排：靠近邊界的矮一點、外面的高一點
        const row = rng() < 0.55 ? 0 : 1;
        const out = (row === 0 ? 1.6 : 4.5) + rng() * 3;
        const [x, z] = side.at((k + rng()) * (side.len / n), out);
        const hRange = b.height[1] - b.height[0];
        let h = b.height[0] + rng() * hRange * (row === 0 ? 0.6 : 1);
        if (side.south) h *= 0.45;
        const color = b.colors[Math.floor(rng() * b.colors.length)];
        const y = this.outerHeight(x, z) - 0.1;
        const obj = borderPiece(b.kind, h, color, rng);
        obj.position.set(x, y, z);
        obj.rotation.y = rng() * Math.PI * 2;
        parent.add(obj);
      }
    }
  }

  /* ---------------- 散佈裝飾 ---------------- */

  buildScatter(parent: THREE.Object3D) {
    const { def, theme, col } = this;
    const { w, d } = def.size;
    const rng = seededRng(def.id + ':scatter');
    const land = def.patches.filter((p) => !p.water);
    const water = def.patches.filter((p) => p.water);
    const blocked = (x: number, z: number, onPath: boolean) => {
      if (Math.abs(x) > w / 2 - 0.4 || Math.abs(z) > d / 2 - 0.4) return true;
      for (const p of water) if (rectSd(p, x, z) < 0.5) return true;
      if (!onPath) for (const p of land) if (rectSd(p, x, z) < 0.4) return true;
      for (const p of def.portals) if (Math.hypot(x - p.x, z - p.z) < p.radius + 1.2) return true;
      for (const t of def.triggers ?? []) if (Math.hypot(x - t.x, z - t.z) < t.radius + 0.8) return true;
      for (const c of col.colliders) {
        if (c.type === 'circle') {
          if (Math.hypot(x - c.x, z - c.z) < c.r + 0.25) return true;
        } else if (x > c.minX - 0.25 && x < c.maxX + 0.25 && z > c.minZ - 0.25 && z < c.maxZ + 0.25) return true;
      }
      // 石階斜坡上不放
      const y = this.heightAt(x, z);
      if (y > 0.01 && Math.abs(y - Math.round(y * 10) / 10) > 0.01) return true;
      return false;
    };
    for (const sd of theme.scatter) {
      const area = w * d;
      const total = Math.round((sd.density * area) / 100);
      const clustered = sd.kind === 'grass' || sd.kind === 'flower' || sd.kind === 'reed';
      const pts: { x: number; z: number; s: number; r: number; c: number }[] = [];
      let guard = total * 6;
      while (pts.length < total && guard-- > 0) {
        const cx = (rng() - 0.5) * w;
        const cz = (rng() - 0.5) * d;
        const n = clustered ? 2 + Math.floor(rng() * 4) : 1;
        for (let k = 0; k < n && pts.length < total; k++) {
          const x = cx + (clustered ? (rng() - 0.5) * 1.6 : 0);
          const z = cz + (clustered ? (rng() - 0.5) * 1.6 : 0);
          if (blocked(x, z, !!sd.onPath)) continue;
          pts.push({ x, z, s: (0.7 + rng() * 0.6) * (sd.scale ?? 1) * SCATTER_SCALE, r: rng() * Math.PI * 2, c: Math.floor(rng() * sd.colors.length) });
        }
      }
      if (pts.length) this.addInstances(parent, sd, pts);
    }
  }

  private addInstances(parent: THREE.Object3D, sd: ScatterDef, pts: { x: number; z: number; s: number; r: number; c: number }[]) {
    const parts = scatterParts(sd.kind);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    for (const part of parts) {
      const glow = sd.kind === 'ember';
      const material = glow
        ? new THREE.MeshBasicMaterial({ color: 0xffffff })
        : new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: sd.kind === 'shard' ? new THREE.Color(sd.colors[0]).multiplyScalar(0.35) : 0x000000 });
      const im = new THREE.InstancedMesh(part.geo, material, pts.length);
      pts.forEach((p, i) => {
        q.setFromAxisAngle(up, p.r);
        v.set(p.x, this.heightAt(p.x, p.z), p.z);
        sc.setScalar(p.s);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
        im.setColorAt(i, col.setHex(part.color ?? sd.colors[p.c]));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.receiveShadow = !glow;
      im.frustumCulled = false;
      im.name = `scatter:${sd.kind}`;
      parent.add(im);
    }
  }

  /* ---------------- 寶箱位置 ---------------- */

  pickTreasures(): { x: number; z: number }[] {
    const { def, theme, col } = this;
    if (def.treasures) return (this.treasureSpots = def.treasures.slice());
    const want = def.safe ? 0 : theme.treasures;
    if (!want) return (this.treasureSpots = []);
    const { w, d } = def.size;
    const can = reachMap(col, def.spawn, 0.9, 1);
    const land = def.patches.filter((p) => !p.water);
    const boss = def.spawns?.find((s) => /boss/.test(s.enemy)) ?? null;
    const cands: { x: number; z: number; score: number }[] = [];
    for (let x = -w / 2 + 3; x <= w / 2 - 3; x += 1.5) {
      for (let z = -d / 2 + 3; z <= d / 2 - 3; z += 1.5) {
        if (!can(x, z) || this.heightAt(x, z) > 0.01) continue;
        // 周圍要有空間（寶箱半徑 1）
        const q = { x, z };
        col.resolve(q, 1.1);
        if (Math.hypot(q.x - x, q.z - z) > 0.01) continue;
        let pathD = 99;
        for (const p of land) pathD = Math.min(pathD, rectSd(p, x, z));
        if (pathD < 1.5) continue;
        if (def.portals.some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 5)) continue;
        const spawnD = Math.hypot(x - def.spawn.x, z - def.spawn.z);
        if (spawnD < 9) continue;
        // 離道路遠、離出生點遠、靠近牆角（附近有障礙物）分數高
        let near = 0;
        for (const c of col.colliders) {
          const cx = c.type === 'circle' ? c.x : (c.minX + c.maxX) / 2;
          const cz = c.type === 'circle' ? c.z : (c.minZ + c.maxZ) / 2;
          if (Math.hypot(cx - x, cz - z) < 4) near++;
        }
        const edge = Math.min(w / 2 - Math.abs(x), d / 2 - Math.abs(z));
        cands.push({ x, z, score: Math.min(pathD, 8) + spawnD * 0.15 + Math.min(near, 3) * 1.5 - edge * 0.15 + (boss ? 0 : 0) });
      }
    }
    cands.sort((a, b) => b.score - a.score);
    const out: { x: number; z: number }[] = [];
    for (const c of cands) {
      if (out.length >= want) break;
      if (out.some((o) => Math.hypot(o.x - c.x, o.z - c.z) < 14)) continue;
      out.push({ x: c.x, z: c.z });
    }
    return (this.treasureSpots = out);
  }

  /* ---------------- 粒子 ---------------- */

  buildParticles() {
    const pd = this.theme.particles;
    if (!pd || pd.count <= 0) return;
    const n = pd.count;
    const rng = seededRng(this.def.id + ':particles');
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    this.pvel = new Float32Array(n * 3);
    this.pphase = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rng() - 0.5) * PBOX.x * 2;
      pos[i * 3 + 1] = rng() * PBOX.y;
      pos[i * 3 + 2] = (rng() - 0.5) * PBOX.z * 2;
      c.setHex(pd.colors[Math.floor(rng() * pd.colors.length)]);
      col.set([c.r, c.g, c.b], i * 3);
      const [vx, vy, vz] = PVEL[pd.kind](rng);
      this.pvel.set([vx, vy, vz], i * 3);
      this.pphase[i] = rng() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const additive = pd.kind === 'ember' || pd.kind === 'mote' || pd.kind === 'spore';
    const material = new THREE.PointsMaterial({
      size: PSIZE[pd.kind],
      map: dotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      opacity: additive ? 0.9 : 0.85,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.particles = new THREE.Points(geo, material);
    this.particles.frustumCulled = false;
    this.particles.renderOrder = 7;
    this.pkind = pd.kind;
    this.dynamic.add(this.particles);
  }

  /** 粒子跟著玩家：在玩家周圍的盒子裡飄，超出盒子就從另一邊繞回來 */
  update(dt: number, px: number, pz: number) {
    this.t += dt;
    const pts = this.particles;
    if (!pts || !this.pvel || !this.pphase) return;
    pts.position.set(px, 0, pz);
    const a = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const p = a.array as Float32Array;
    const v = this.pvel;
    const sway = this.pkind === 'leaf' || this.pkind === 'snow' ? 1 : this.pkind === 'mote' || this.pkind === 'spore' ? 0.6 : 0.3;
    // 玩家移動時粒子留在世界裡（反向補償），不會跟著角色平移
    const mx = this.lastPx === null ? 0 : px - this.lastPx;
    const mz = this.lastPz === null ? 0 : pz - this.lastPz;
    this.lastPx = px;
    this.lastPz = pz;
    for (let i = 0; i < this.pphase.length; i++) {
      const k = i * 3;
      const ph = this.pphase[i];
      p[k] += (v[k] + Math.sin(this.t * 1.3 + ph) * sway) * dt - mx;
      p[k + 1] += v[k + 1] * dt;
      p[k + 2] += (v[k + 2] + Math.cos(this.t * 1.1 + ph) * sway * 0.6) * dt - mz;
      if (p[k] > PBOX.x) p[k] -= PBOX.x * 2;
      else if (p[k] < -PBOX.x) p[k] += PBOX.x * 2;
      if (p[k + 2] > PBOX.z) p[k + 2] -= PBOX.z * 2;
      else if (p[k + 2] < -PBOX.z) p[k + 2] += PBOX.z * 2;
      if (p[k + 1] < 0) p[k + 1] += PBOX.y;
      else if (p[k + 1] > PBOX.y) p[k + 1] -= PBOX.y;
    }
    a.needsUpdate = true;
  }
  private lastPx: number | null = null;
  private lastPz: number | null = null;
}

const PBOX = { x: 16, y: 9, z: 18 };
const PSIZE: Record<ParticleKind, number> = { leaf: 0.5, snow: 0.42, ember: 0.34, mote: 0.45, ash: 0.3, spray: 0.36, spore: 0.34 };
const PVEL: Record<ParticleKind, (r: () => number) => [number, number, number]> = {
  leaf: (r) => [0.6 + r() * 0.6, -0.5 - r() * 0.5, 0.2 * (r() - 0.5)],
  snow: (r) => [0.3 * (r() - 0.3), -0.8 - r() * 0.6, 0.2 * (r() - 0.5)],
  ember: (r) => [0.3 * (r() - 0.5), 0.7 + r() * 0.9, 0.3 * (r() - 0.5)],
  mote: (r) => [0.2 * (r() - 0.5), 0.15 * (r() - 0.3), 0.2 * (r() - 0.5)],
  ash: (r) => [1.2 + r() * 0.8, -0.2 - r() * 0.3, 0.2 * (r() - 0.5)],
  spray: (r) => [0.8 + r() * 0.5, 0.1 * (r() - 0.5), 0.3 * (r() - 0.5)],
  spore: (r) => [0.15 * (r() - 0.5), 0.25 + r() * 0.3, 0.15 * (r() - 0.5)],
};

let DOT: THREE.Texture | null = null;
function dotTexture(): THREE.Texture {
  if (DOT) return DOT;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  DOT = new THREE.CanvasTexture(c);
  DOT.userData.shared = true;
  return DOT;
}

/* ---------------- 邊界零件 ---------------- */

function borderPiece(kind: MapTheme['border']['kind'], h: number, color: number, rng: () => number): THREE.Object3D {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, c: number, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const dark = new THREE.Color(color).multiplyScalar(0.78).getHex();
  switch (kind) {
    case 'trees': {
      // 低多邊形松樹：兩層錐形樹冠＋樹幹
      const r = h * 0.28;
      add(new THREE.CylinderGeometry(0.18, 0.26, h * 0.35, 5), 0x6a4a2e, 0, h * 0.17);
      add(new THREE.ConeGeometry(r, h * 0.55, 6), color, 0, h * 0.5);
      add(new THREE.ConeGeometry(r * 0.72, h * 0.45, 6), dark, 0, h * 0.8);
      break;
    }
    case 'cliff':
    case 'lava':
    case 'ruins': {
      // 柱狀岩塊：一大兩小
      const wdt = 1.2 + rng() * 1.4;
      const main = add(new THREE.DodecahedronGeometry(1, 0), color, 0, h * 0.45);
      main.scale.set(wdt, h * 0.55, wdt * (0.8 + rng() * 0.4));
      const side = add(new THREE.DodecahedronGeometry(1, 0), dark, wdt * 0.9, h * 0.2, rng() - 0.5);
      side.scale.set(wdt * 0.6, h * 0.3, wdt * 0.6);
      if (kind === 'ruins' && rng() < 0.5) {
        // 斷柱
        const col = add(new THREE.CylinderGeometry(0.45, 0.5, h * 0.8, 8), 0x8a8498, -wdt, h * 0.4, 0.5);
        col.rotation.z = (rng() - 0.5) * 0.3;
      }
      if (kind === 'lava' && rng() < 0.45) {
        // 岩縫裡的熔岩光（MeshBasic，不受光）
        const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), LAVA_GLOW);
        glow.position.set(wdt * 0.5, 0.25, wdt * 0.5);
        g.add(glow);
      }
      break;
    }
    case 'ice': {
      const main = add(new THREE.OctahedronGeometry(1, 0), color, 0, h * 0.45);
      main.scale.set(0.9 + rng(), h * 0.5, 0.9 + rng());
      const s = add(new THREE.OctahedronGeometry(1, 0), dark, 1.1, h * 0.25, 0.3);
      s.scale.set(0.6, h * 0.3, 0.6);
      s.rotation.z = 0.3;
      break;
    }
    case 'dunes': {
      const m = add(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 0);
      m.scale.set(3 + rng() * 3, h * 0.7, 2.5 + rng() * 2);
      if (rng() < 0.4) {
        const r = add(new THREE.DodecahedronGeometry(0.8, 0), 0x9a7a50, 2, 0.4, 1);
        r.scale.y = 0.7;
      }
      break;
    }
    case 'reef': {
      const m = add(new THREE.DodecahedronGeometry(1, 0), color, 0, h * 0.3);
      m.scale.set(1.4 + rng(), h * 0.4, 1.2 + rng());
      if (rng() < 0.5) add(new THREE.ConeGeometry(0.25, 1.2, 5), 0xe08a7a, 1, 0.5, 0.4);
      break;
    }
  }
  return g;
}

const LAVA_GLOW = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
LAVA_GLOW.userData.shared = true;

/* ---------------- 散佈裝飾的幾何 ---------------- */

function scatterParts(kind: ScatterKind): { geo: THREE.BufferGeometry; color?: number }[] {
  const m = (geos: THREE.BufferGeometry[]) => {
    const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    for (const g of list) if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const out = mergeGeometries(list, false)!;
    out.computeVertexNormals();
    return out;
  };
  const at = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    g.scale(sx, sy, sz);
    g.rotateX(rx);
    g.rotateZ(rz);
    g.translate(x, y, z);
    return g;
  };
  switch (kind) {
    case 'grass':
      return [{ geo: m([0, 1, 2, 3].map((i) => at(new THREE.ConeGeometry(0.05, 0.45 + (i % 2) * 0.15, 3, 1, true), Math.cos(i * 1.7) * 0.1, 0.22, Math.sin(i * 1.7) * 0.1, Math.cos(i) * 0.25, Math.sin(i * 2) * 0.25))) }];
    case 'reed':
      return [
        { geo: m([0, 1, 2].map((i) => at(new THREE.CylinderGeometry(0.02, 0.03, 0.9, 4), (i - 1) * 0.1, 0.45, (i % 2) * 0.08, 0, (i - 1) * 0.12))) },
        { geo: m([0, 1, 2].map((i) => at(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 5), (i - 1) * 0.1 + (i - 1) * 0.1, 0.92, (i % 2) * 0.08, 0, (i - 1) * 0.12))), color: 0x6a4a2a },
      ];
    case 'pebble':
      return [{ geo: m([at(new THREE.DodecahedronGeometry(0.16, 0), 0, 0.05, 0, 0, 0, 1, 0.55, 0.8), at(new THREE.DodecahedronGeometry(0.09, 0), 0.22, 0.03, 0.1, 0, 0, 1, 0.6, 1)]) }];
    case 'flower':
      return [
        { geo: m([at(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4), 0, 0.15, 0), at(new THREE.CylinderGeometry(0.015, 0.02, 0.24, 4), 0.12, 0.12, 0.05)]), color: 0x4a8a34 },
        { geo: m([at(new THREE.IcosahedronGeometry(0.075, 0), 0, 0.31, 0), at(new THREE.IcosahedronGeometry(0.065, 0), 0.12, 0.25, 0.05)]) },
      ];
    case 'bone':
      return [{ geo: m([at(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 5), 0, 0.05, 0, 0, Math.PI / 2), at(new THREE.SphereGeometry(0.06, 5, 4), 0.28, 0.05, 0), at(new THREE.SphereGeometry(0.06, 5, 4), -0.28, 0.05, 0), at(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), 0.05, 0.05, 0.15, 0, Math.PI / 2 + 0.6)]) }];
    case 'skull':
      return [{ geo: m([at(new THREE.SphereGeometry(0.2, 7, 5), 0, 0.17, 0, 0, 0, 1, 0.9, 1.1), at(new THREE.BoxGeometry(0.22, 0.08, 0.14), 0, 0.04, 0.13)]) }];
    case 'shell':
      return [{ geo: m([at(new THREE.ConeGeometry(0.13, 0.1, 7), 0, 0.04, 0, 0, 0, 1, 1, 1.3), at(new THREE.ConeGeometry(0.07, 0.14, 5), 0.2, 0.06, 0.1, Math.PI / 2)]) }];
    case 'mushroom':
      return [
        { geo: m([at(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 5), 0, 0.11, 0), at(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 5), 0.16, 0.07, 0.06)]), color: 0xeee2c8 },
        { geo: m([at(new THREE.SphereGeometry(0.13, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.2, 0), at(new THREE.SphereGeometry(0.09, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0.16, 0.13, 0.06)]) },
      ];
    case 'shard':
      return [{ geo: m([at(new THREE.OctahedronGeometry(0.12, 0), 0, 0.22, 0, 0, 0.3, 1, 2.6, 1), at(new THREE.OctahedronGeometry(0.08, 0), 0.14, 0.12, 0.05, 0, -0.5, 1, 2.2, 1)]) }];
    case 'ember':
      return [{ geo: m([at(new THREE.OctahedronGeometry(0.07, 0), 0, 0.04, 0, 0, 0, 1, 0.5, 1), at(new THREE.OctahedronGeometry(0.05, 0), 0.15, 0.03, 0.08, 0, 0, 1, 0.5, 1)]) }];
    case 'twig':
      return [{ geo: m([at(new THREE.CylinderGeometry(0.02, 0.025, 0.6, 4), 0, 0.03, 0, 0, Math.PI / 2), at(new THREE.CylinderGeometry(0.015, 0.02, 0.25, 4), 0.1, 0.03, 0.08, 0, Math.PI / 2 + 0.7)]) }];
    case 'snowclump':
      return [{ geo: m([at(new THREE.IcosahedronGeometry(0.3, 0), 0, 0.06, 0, 0, 0, 1, 0.35, 0.8), at(new THREE.IcosahedronGeometry(0.18, 0), 0.3, 0.04, 0.1, 0, 0, 1, 0.35, 1)]) }];
  }
}
