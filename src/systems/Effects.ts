import * as THREE from 'three';

/**
 * 地面特效池：擴散光圈、範圍圓盤、光柱。
 * 技能（冰霜新星、烈焰爆發、閃現）、升級、撿寶都共用這個池子。
 * v1.91：飛彈 lob()——發光球沿拋物線從 A 飛到 B，可延遲出發，讓「預警結束」與「東西真的飛到」同時發生
 * （遠程小怪的攻擊、首領落雨招的落石都用它）。
 */
type FxKind = 'ring' | 'disc' | 'pillar' | 'arc';

interface Fx {
  mesh: THREE.Mesh;
  kind: FxKind;
  active: boolean;
  t: number;
  life: number;
  from: number;
  to: number;
  opacity: number;
}

const RING_POOL = 32;
const DISC_POOL = 20;
const PILLAR_POOL = 16;
const ARC_POOL = 12;
const LOB_POOL = 24;

interface Lob {
  mesh: THREE.Mesh;
  active: boolean;
  /** 已過時間（負數 = 還沒出發） */
  t: number;
  dur: number;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  arc: number;
  size: number;
}
/** 刀光扇形的角度（弧度） */
export const ARC_ANGLE = 2.1;

export class Effects {
  private fx: Fx[] = [];
  private lobs: Lob[] = [];
  /** 地面高度（高台上的技能特效要墊高） */
  heightAt: (x: number, z: number) => number = () => 0;

  constructor(scene: THREE.Scene) {
    const ringGeo = new THREE.RingGeometry(0.86, 1, 48);
    const discGeo = new THREE.CircleGeometry(1, 40);
    const pillarGeo = new THREE.CylinderGeometry(1, 1, 6, 20, 1, true);
    const mk = (geo: THREE.BufferGeometry, kind: FxKind, n: number) => {
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
        );
        if (kind !== 'pillar') mesh.rotation.x = -Math.PI / 2;
        mesh.visible = false;
        mesh.renderOrder = 5;
        scene.add(mesh);
        this.fx.push({ mesh, kind, active: false, t: 0, life: 1, from: 1, to: 1, opacity: 1 });
      }
    };
    mk(ringGeo, 'ring', RING_POOL);
    mk(discGeo, 'disc', DISC_POOL);
    mk(pillarGeo, 'pillar', PILLAR_POOL);
    // 刀光：以 +x 為中心、張開 ARC_ANGLE 的扇環（spawn 時旋轉到面向）
    mk(new THREE.RingGeometry(0.3, 1, 28, 1, -ARC_ANGLE / 2, ARC_ANGLE), 'arc', ARC_POOL);
    const lobGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < LOB_POOL; i++) {
      const mesh = new THREE.Mesh(lobGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
      mesh.visible = false;
      mesh.renderOrder = 6;
      scene.add(mesh);
      this.lobs.push({ mesh, active: false, t: 0, dur: 1, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, arc: 0, size: 0.3 });
    }
  }

  /**
   * 飛彈：delay 秒後從 (x0, y0, z0) 出發，dur 秒沿拋物線（最高多 arc 公尺）飛到地面 (x1, z1)。
   * 落地時間 = delay + dur，呼叫端讓它等於預警結束的時間。y0 是離地高度。
   */
  lob(x0: number, y0: number, z0: number, x1: number, z1: number, delay: number, dur: number, color: number, size = 0.3, arc = 2) {
    const f = this.lobs.find((q) => !q.active);
    if (!f) return;
    f.active = true;
    f.t = -delay;
    f.dur = Math.max(0.05, dur);
    f.x0 = x0;
    f.z0 = z0;
    f.y0 = y0 + this.heightAt(x0, z0);
    f.x1 = x1;
    f.z1 = z1;
    f.y1 = 0.3 + this.heightAt(x1, z1);
    f.arc = arc;
    f.size = size;
    (f.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    f.mesh.visible = false;
  }

  /** 擴散光圈：半徑 from → to */
  ring(x: number, z: number, from: number, to: number, color: number, life = 0.45, y = 0.08) {
    this.spawn('ring', x, y, z, from, to, color, life, 1);
  }

  /** 實心圓盤（範圍技能落地） */
  disc(x: number, z: number, radius: number, color: number, life = 0.5, opacity = 0.6) {
    this.spawn('disc', x, 0.06, z, radius * 0.6, radius, color, life, opacity);
  }

  /** 光柱（升級、閃現、撿到稀有裝備） */
  pillar(x: number, z: number, radius: number, color: number, life = 0.8) {
    this.spawn('pillar', x, 3, z, radius, radius * 0.4, color, life, 0.55);
  }

  /** 近戰刀光：面向 facing（0 = +z）的扇環，半徑 from → to */
  arc(x: number, z: number, facing: number, from: number, to: number, color: number, life = 0.22, y = 0.9) {
    const f = this.spawn('arc', x, y, z, from, to, color, life, 0.85);
    // 平面先繞 x 轉 -90°，本地角度 θ 對應世界方向 (cosθ, -sinθ)；要對準 (sin a, cos a) → θ = a - π/2
    if (f) f.mesh.rotation.z = facing - Math.PI / 2;
  }

  clear() {
    for (const f of this.fx) {
      f.active = false;
      f.mesh.visible = false;
    }
    for (const l of this.lobs) {
      l.active = false;
      l.mesh.visible = false;
    }
  }

  private spawn(kind: FxKind, x: number, y: number, z: number, from: number, to: number, color: number, life: number, opacity: number): Fx | null {
    const f = this.fx.find((q) => q.kind === kind && !q.active);
    if (!f) return null;
    f.active = true;
    f.t = 0;
    f.life = life;
    f.from = from;
    f.to = to;
    f.opacity = opacity;
    f.mesh.position.set(x, y + this.heightAt(x, z), z);
    (f.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    f.mesh.visible = true;
    this.apply(f, 0);
    return f;
  }

  update(dt: number) {
    for (const l of this.lobs) {
      if (!l.active) continue;
      l.t += dt;
      if (l.t < 0) continue;
      const u = l.t / l.dur;
      if (u >= 1) {
        l.active = false;
        l.mesh.visible = false;
        continue;
      }
      l.mesh.visible = true;
      l.mesh.position.set(l.x0 + (l.x1 - l.x0) * u, l.y0 + (l.y1 - l.y0) * u + 4 * l.arc * u * (1 - u), l.z0 + (l.z1 - l.z0) * u);
      // 飛行中微微脈動
      l.mesh.scale.setScalar(l.size * (1 + 0.15 * Math.sin(l.t * 30)));
    }
    for (const f of this.fx) {
      if (!f.active) continue;
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) {
        f.active = false;
        f.mesh.visible = false;
        continue;
      }
      this.apply(f, k);
    }
  }

  private apply(f: Fx, k: number) {
    const e = 1 - (1 - k) * (1 - k);
    const r = f.from + (f.to - f.from) * e;
    if (f.kind === 'pillar') f.mesh.scale.set(r, 1 - k * 0.3, r);
    else f.mesh.scale.set(r, r, 1);
    (f.mesh.material as THREE.MeshBasicMaterial).opacity = f.opacity * (1 - k);
  }
}
