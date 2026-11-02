import * as THREE from 'three';
import type { PortalDef, ZoneDef } from '@/data/types';
import { CollisionWorld } from './Collision';
import { buildProp, PROP_DEFAULTS, mat } from './Props';
import { makeLabelSprite } from './Label';

/**
 * Zone：一個已載入的區域（場景物件 + 碰撞 + 傳送點）。
 * 由 ZoneManager 建立與銷毀；切換區域時整個 group 會被 dispose。
 */
export class Zone {
  readonly def: ZoneDef;
  readonly group = new THREE.Group();
  readonly collision = new CollisionWorld();
  private animated: { obj: THREE.Object3D; kind: 'spin' | 'pulse'; phase: number }[] = [];
  private t = 0;

  constructor(def: ZoneDef) {
    this.def = def;
    this.build();
  }

  private build() {
    const { def } = this;
    const { w, d } = def.size;
    this.collision.bounds = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };

    // 地面：比可走範圍大一圈，避免鏡頭看到邊界外的虛空
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w + 60, d + 60), mat(darken(def.groundColor, 0.88)));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    const playable = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(def.groundColor));
    playable.rotation.x = -Math.PI / 2;
    playable.receiveShadow = true;
    this.group.add(playable);

    // 色塊：道路、沙地、水
    def.patches.forEach((p, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(p.w, p.d),
        p.water ? new THREE.MeshLambertMaterial({ color: p.color, transparent: true, opacity: 0.92 }) : mat(p.color),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.01 + i * 0.004, p.z);
      m.receiveShadow = true;
      this.group.add(m);
      if (p.water) {
        this.collision.addBox(p.x, p.z, p.w, p.d);
        this.animated.push({ obj: m, kind: 'pulse', phase: i });
      }
    });

    // 靜態物件與碰撞
    for (const p of def.props) {
      this.group.add(buildProp(p));
      const pd = PROP_DEFAULTS[p.kind];
      if (!(p.solid ?? pd.solid)) continue;
      const pw = p.w ?? pd.w;
      const pdd = p.d ?? pd.d;
      if (pd.round) this.collision.addCircle(p.x, p.z, Math.max(pw, pdd) * 0.45);
      else if (p.rot && Math.abs(Math.sin(p.rot)) > 0.7) this.collision.addBox(p.x, p.z, pdd, pw);
      else this.collision.addBox(p.x, p.z, pw, pdd);
    }

    for (const portal of def.portals) this.group.add(this.buildPortal(portal));
    for (const t of def.triggers ?? []) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(t.radius - 0.18, t.radius, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.85, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x, 0.04, t.z);
      this.group.add(ring);
      this.animated.push({ obj: ring, kind: 'pulse', phase: 2 });
    }
  }

  private buildPortal(p: PortalDef): THREE.Object3D {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    if (p.style === 'stone') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius + 0.2, 0.3, 8), mat(0xc9c2b4));
      base.position.y = 0.15;
      base.receiveShadow = true;
      g.add(base);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshLambertMaterial({ color: 0x6fe3ff, emissive: 0x2a9fd0, flatShading: true }),
      );
      crystal.position.y = 1.8;
      crystal.scale.y = 1.6;
      crystal.castShadow = true;
      g.add(crystal);
      this.animated.push({ obj: crystal, kind: 'spin', phase: 0 });
    } else {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(p.radius, p.radius, 3.2, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.position.y = 1.6;
      g.add(beam);
      this.animated.push({ obj: beam, kind: 'pulse', phase: 1 });
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.radius - 0.25, p.radius, 32),
      new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.32;
    g.add(ring);

    const label = makeLabelSprite(p.label, { fontSize: 40, color: '#fff7d6', bg: 'rgba(30,36,52,0.72)', scale: 1.1 });
    label.position.y = p.style === 'stone' ? 3.6 : 3.8;
    g.add(label);
    return g;
  }

  update(dt: number) {
    this.t += dt;
    for (const a of this.animated) {
      if (a.kind === 'spin') {
        a.obj.rotation.y += dt * 1.2;
        a.obj.position.y = 1.8 + Math.sin(this.t * 2) * 0.15;
      } else {
        const m = (a.obj as THREE.Mesh).material as THREE.Material & { opacity: number };
        m.opacity = (a.phase === 1 ? 0.22 : 0.85) + Math.sin(this.t * 2 + a.phase) * 0.06;
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      // 共用材質（mat()）不 dispose；Sprite / 個別材質才 dispose
      const material = (m as { material?: THREE.Material | THREE.Material[] }).material;
      if (material && !Array.isArray(material) && !material.userData.shared) {
        const map = (material as THREE.SpriteMaterial).map;
        map?.dispose();
        material.dispose();
      }
    });
    this.group.removeFromParent();
  }
}

function darken(hex: number, f: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}
