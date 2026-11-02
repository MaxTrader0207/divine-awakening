import * as THREE from 'three';

/**
 * 地面特效池：擴散光圈、範圍圓盤、光柱。
 * 技能（冰霜新星、烈焰爆發、閃現）、升級、撿寶都共用這個池子。
 */
type FxKind = 'ring' | 'disc' | 'pillar';

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

const RING_POOL = 24;
const DISC_POOL = 12;
const PILLAR_POOL = 8;

export class Effects {
  private fx: Fx[] = [];

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

  clear() {
    for (const f of this.fx) {
      f.active = false;
      f.mesh.visible = false;
    }
  }

  private spawn(kind: FxKind, x: number, y: number, z: number, from: number, to: number, color: number, life: number, opacity: number) {
    const f = this.fx.find((q) => q.kind === kind && !q.active);
    if (!f) return;
    f.active = true;
    f.t = 0;
    f.life = life;
    f.from = from;
    f.to = to;
    f.opacity = opacity;
    f.mesh.position.set(x, y, z);
    (f.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    f.mesh.visible = true;
    this.apply(f, 0);
  }

  update(dt: number) {
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
