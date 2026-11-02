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
  onResolve: (inside: (x: number, z: number, pad?: number) => boolean) => void;
}

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
    this.list.push({ shape, t: 0, duration, group, fill, onResolve });
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
  escape(x: number, z: number, pad = 0.6): { x: number; z: number } | null {
    for (const te of this.list) {
      const s = te.shape;
      if (!contains(s, x, z, pad)) continue;
      if (s.kind === 'circle' || s.kind === 'cone') {
        let dx = x - s.x;
        let dz = z - s.z;
        const l = Math.hypot(dx, dz);
        if (l < 0.01) {
          dx = 1;
          dz = 0;
        }
        if (s.kind === 'cone') {
          // 扇形：往側邊閃最快（垂直於朝向，選玩家所在那一側）
          const side = Math.sign(dx * Math.cos(s.dir) - dz * Math.sin(s.dir)) || 1;
          return { x: Math.cos(s.dir) * side, z: -Math.sin(s.dir) * side };
        }
        return { x: dx / (l || 1), z: dz / (l || 1) };
      }
      // 長方形：往垂直方向
      const nx = Math.cos(s.dir);
      const nz = -Math.sin(s.dir);
      const side = Math.sign((x - s.x) * nx + (z - s.z) * nz) || 1;
      return { x: nx * side, z: nz * side };
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
