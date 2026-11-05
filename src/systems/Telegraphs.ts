import * as THREE from 'three';

/**
 * 紅色範圍預警（首領技能）
 * 地上先出現半透明紅色範圍，內層從中心長到滿；長滿的瞬間結算傷害。
 * 玩家只要在結算時離開範圍就不會受傷 —— 這是首領戰的核心互動。
 *
 * 形狀：circle（圓）、cone（扇形）、rect（從起點往前的長方形）
 */
export type TeleShape =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'cone'; x: number; z: number; dir: number; angle: number; r: number }
  | { kind: 'rect'; x: number; z: number; dir: number; length: number; width: number };

interface Tele {
  shape: TeleShape;
  t: number;
  duration: number;
  group: THREE.Group;
  fill: THREE.Mesh;
  autoNoticed: boolean;
  onResolve: (inside: (x: number, z: number, pad?: number) => boolean) => void;
}

/** AUTO 能「察覺」並閃避的預警比例：手動玩家可以全閃，AUTO 不會完美 */
export const AUTO_DODGE_CHANCE = 0.65;

const OUTER_COLOR = 0xff3a2a;
const FILL_COLOR = 0xff6a3a;

export class Telegraphs {
  private list: Tele[] = [];
  heightAt: (x: number, z: number) => number = () => 0;

  constructor(private scene: THREE.Scene) {}

  get active() {
    return this.list.length;
  }

  /** 新增預警；duration 秒後呼叫 onResolve(inside) 讓呼叫端判定與造成傷害 */
  add(shape: TeleShape, duration: number, onResolve: Tele['onResolve']) {
    const group = new THREE.Group();
    const y = this.heightAt(shape.x, shape.z) + 0.07;
    group.position.set(shape.x, y, shape.z);
    const outerMat = new THREE.MeshBasicMaterial({ color: OUTER_COLOR, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    const edgeMat = new THREE.MeshBasicMaterial({ color: OUTER_COLOR, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const fillMat = new THREE.MeshBasicMaterial({ color: FILL_COLOR, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    let outer: THREE.BufferGeometry;
    let edge: THREE.BufferGeometry;
    let fillGeo: THREE.BufferGeometry;
    if (shape.kind === 'circle') {
      outer = new THREE.CircleGeometry(shape.r, 40);
      edge = new THREE.RingGeometry(shape.r - 0.12, shape.r, 48);
      fillGeo = new THREE.CircleGeometry(shape.r, 40);
    } else if (shape.kind === 'cone') {
      // CircleGeometry 的 theta 從 +x 開始；轉成「以 +z 為 0」的面向
      const start = Math.PI / 2 - shape.angle / 2;
      outer = new THREE.CircleGeometry(shape.r, 32, start, shape.angle);
      edge = new THREE.RingGeometry(shape.r - 0.12, shape.r, 32, 1, start, shape.angle);
      fillGeo = new THREE.CircleGeometry(shape.r, 32, start, shape.angle);
    } else {
      outer = new THREE.PlaneGeometry(shape.width, shape.length).translate(0, shape.length / 2, 0);
      edge = new THREE.EdgesGeometry(outer);
      fillGeo = new THREE.PlaneGeometry(shape.width, shape.length).translate(0, shape.length / 2, 0);
    }
    const rot = new THREE.Group();
    rot.rotation.x = -Math.PI / 2;
    // 幾何以 +y 為「前方」；rotation.x = -90° 後 +y 變成世界 -z。
    // 世界方向 dir（0 = +z，π/2 = +x）對應的 rotation.z = dir − π。
    if (shape.kind !== 'circle') rot.rotation.z = shape.dir - Math.PI;
    group.add(rot);
    rot.add(new THREE.Mesh(outer, outerMat));
    const edgeObj = shape.kind === 'rect' ? new THREE.LineSegments(edge, edgeMat) : new THREE.Mesh(edge, edgeMat);
    rot.add(edgeObj);
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.z = 0.01;
    fill.scale.setScalar(0.001);
    rot.add(fill);
    group.renderOrder = 4;
    this.scene.add(group);
    this.list.push({ shape, t: 0, duration, group, fill, onResolve, autoNoticed: Math.random() < AUTO_DODGE_CHANCE });
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const te = this.list[i];
      te.t += dt;
      const k = Math.min(1, te.t / te.duration);
      if (te.shape.kind === 'rect') te.fill.scale.set(1, Math.max(0.001, k), 1);
      else te.fill.scale.setScalar(Math.max(0.001, k));
      if (te.t >= te.duration) {
        const shape = te.shape;
        te.onResolve((x, z, pad = 0) => contains(shape, x, z, pad));
        this.dispose(te);
        this.list.splice(i, 1);
      }
    }
  }

  /** 玩家在任何預警範圍內時，回傳逃離方向（AUTO 用） */
  escape(x: number, z: number, pad = 0.6, prefer?: { x: number; z: number }): { x: number; z: number } | null {
    for (const te of this.list) {
      const s = te.shape;
      if (!te.autoNoticed || !contains(s, x, z, pad)) continue;
      return escapeDir(s, x, z, prefer);
    }
    return null;
  }

  clear() {
    for (const te of this.list) this.dispose(te);
    this.list = [];
  }

  private dispose(te: Tele) {
    te.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = (m as { material?: THREE.Material }).material;
      mat?.dispose();
    });
    te.group.removeFromParent();
  }
}

/**
 * 從預警範圍裡逃出去的方向（單位向量）。
 * prefer（v1.61，首領戰時 = 首領出生點）：AUTO 閃招時盡量往場地中央閃，不會越閃越遠、把首領拖出場地。
 *  - 圓形：從圓心往外，最多往 prefer 偏 45°（仍然往外，一樣逃得出去）
 *  - 扇形 / 長方形：往側邊；玩家離中線不到 1.2 公尺時，選 prefer 那一側
 */
export function escapeDir(s: TeleShape, x: number, z: number, prefer?: { x: number; z: number }): { x: number; z: number } {
  const toPrefer = prefer ? { x: prefer.x - x, z: prefer.z - z } : null;
  if (s.kind === 'circle') {
    let dx = x - s.x;
    let dz = z - s.z;
    let l = Math.hypot(dx, dz);
    if (l < 0.01) {
      dx = 1;
      dz = 0;
      l = 1;
    }
    let a = Math.atan2(dz, dx);
    if (toPrefer && Math.hypot(toPrefer.x, toPrefer.z) > 1) {
      const pa = Math.atan2(toPrefer.z, toPrefer.x);
      let diff = pa - a;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a += Math.max(-Math.PI / 4, Math.min(Math.PI / 4, diff));
    }
    return { x: Math.cos(a), z: Math.sin(a) };
  }
  // 扇形、長方形：垂直於朝向往側邊
  const nx = Math.cos(s.dir);
  const nz = -Math.sin(s.dir);
  const lateral = s.kind === 'cone' ? (x - s.x) * Math.cos(s.dir) - (z - s.z) * Math.sin(s.dir) : (x - s.x) * nx + (z - s.z) * nz;
  let side = Math.sign(lateral) || 1;
  if (toPrefer && Math.abs(lateral) < 1.2) side = Math.sign(toPrefer.x * nx + toPrefer.z * nz) || side;
  return { x: nx * side, z: nz * side };
}

/** 點是否在形狀內（pad = 角色半徑） */
export function contains(s: TeleShape, x: number, z: number, pad = 0): boolean {
  const dx = x - s.x;
  const dz = z - s.z;
  if (s.kind === 'circle') return Math.hypot(dx, dz) <= s.r + pad;
  if (s.kind === 'cone') {
    const d = Math.hypot(dx, dz);
    if (d > s.r + pad) return false;
    if (d < pad + 0.5) return true;
    let a = Math.atan2(dx, dz) - s.dir;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a) <= s.angle / 2 + Math.asin(Math.min(1, pad / d));
  }
  // rect：轉到局部座標（前方 = dir）
  const fx = Math.sin(s.dir);
  const fz = Math.cos(s.dir);
  const along = dx * fx + dz * fz;
  const side = dx * fz - dz * fx;
  return along >= -pad && along <= s.length + pad && Math.abs(side) <= s.width / 2 + pad;
}
