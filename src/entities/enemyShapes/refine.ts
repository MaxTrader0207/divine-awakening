import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * 首領模型精緻化：把程式模型的球、圓柱、圓錐、圓環換成分段更多的版本（配合平滑著色，看起來圓潤不顆粒）。
 * - 分段 < 5 的零件（四角錐的牙、角、火焰、菱形）是刻意做成有稜角的，不改。
 * - 方塊改成圓角方塊（邊角倒圓，小零件只倒一段）；很薄的片狀零件（羽毛、鱗片）不改。
 * - 二十面體、八面體不改（岩石、寶石本來就是硬邊造型）。
 * - 很小的零件（眼睛、鱗片）只加一點，避免頂點暴增。
 * 只給首領用（同一時間只有一隻），一般小怪維持低多邊形。
 */
export function refineGeometry(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = (geo as THREE.BufferGeometry & { parameters?: Record<string, number & boolean> }).parameters;
  if (!p) return geo;
  const up = (n: number, size: number, lo: number, hi: number) => {
    if (n < 5) return n;
    const cap = size < 0.06 ? 10 : size < 0.12 ? 14 : hi;
    return Math.max(n, Math.min(cap, Math.max(lo, n * 2)));
  };
  let out: THREE.BufferGeometry | null = null;
  switch (geo.type) {
    case 'BoxGeometry': {
      const m = Math.min(p.width, p.height, p.depth);
      if (m < 0.06) return geo;
      out = new RoundedBoxGeometry(p.width, p.height, p.depth, m > 0.18 ? 3 : m > 0.1 ? 2 : 1, Math.min(0.12, m * 0.24));
      break;
    }
    case 'SphereGeometry': {
      if (p.widthSegments < 5) return geo;
      const w = up(p.widthSegments, p.radius, 20, 36);
      const h = Math.max(p.heightSegments, Math.round(w * 0.7));
      out = new THREE.SphereGeometry(p.radius, w, h, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
      break;
    }
    case 'CylinderGeometry': {
      if (p.radialSegments < 5) return geo;
      const r = Math.max(p.radiusTop, p.radiusBottom);
      out = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, up(p.radialSegments, r, 16, 32), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
      break;
    }
    case 'ConeGeometry': {
      if (p.radialSegments < 5) return geo;
      out = new THREE.ConeGeometry(p.radius, p.height, up(p.radialSegments, p.radius, 16, 32), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
      break;
    }
    case 'TorusGeometry': {
      if (p.radialSegments < 5) return geo;
      out = new THREE.TorusGeometry(p.radius, p.tube, up(p.radialSegments, p.tube, 10, 16), Math.min(64, Math.max(p.tubularSegments, p.tubularSegments * 2)), p.arc);
      break;
    }
  }
  if (!out) return geo;
  geo.dispose();
  return out;
}

/** 首領動作平滑：每幀把造型動畫算出的姿勢「追」過去，消除切換瞬間的跳動（前搖、停步、走路彈跳的尖角） */
export class PoseSmoother {
  private nodes: THREE.Object3D[] = [];
  private prev: Float32Array = new Float32Array(0);
  private ready = false;

  constructor(
    private readonly root: THREE.Object3D,
    /** 追上速度（每秒）：越大越跟手、越小越柔 */
    private readonly rate = 16,
  ) {}

  /** 模型建好後呼叫：收集 root 底下會動的節點 */
  collect() {
    this.nodes = [];
    this.root.traverse((o) => {
      if (o !== this.root) this.nodes.push(o);
    });
    this.prev = new Float32Array(2 + this.nodes.length * 9);
    this.ready = false;
  }

  /** 重生 / 瞬移後呼叫：下一幀直接採用當下姿勢 */
  reset() {
    this.ready = false;
  }

  /** 在造型動畫寫完姿勢之後呼叫 */
  apply(dt: number) {
    const v = this.prev;
    const r = this.root;
    if (!this.ready) {
      this.ready = true;
      v[0] = r.position.y;
      v[1] = r.rotation.x;
      let i = 2;
      for (const o of this.nodes) {
        v[i++] = o.position.x; v[i++] = o.position.y; v[i++] = o.position.z;
        v[i++] = o.rotation.x; v[i++] = o.rotation.y; v[i++] = o.rotation.z;
        v[i++] = o.scale.x; v[i++] = o.scale.y; v[i++] = o.scale.z;
      }
      return;
    }
    const k = 1 - Math.exp(-dt * this.rate);
    const f = (idx: number, cur: number) => (v[idx] += (cur - v[idx]) * k);
    // 根節點只平滑上下彈跳與前後仰（左右搖晃是受擊抖動，縮放是死亡 / 重生，保持原樣）
    r.position.y = f(0, r.position.y);
    r.rotation.x = f(1, r.rotation.x);
    let i = 2;
    for (const o of this.nodes) {
      o.position.set(f(i, o.position.x), f(i + 1, o.position.y), f(i + 2, o.position.z));
      o.rotation.set(f(i + 3, o.rotation.x), f(i + 4, o.rotation.y), f(i + 5, o.rotation.z));
      o.scale.set(f(i + 6, o.scale.x), f(i + 7, o.scale.y), f(i + 8, o.scale.z));
      i += 9;
    }
  }
}
