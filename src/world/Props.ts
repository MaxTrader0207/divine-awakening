import * as THREE from 'three';
import type { PropDef } from '@/data/types';
import { makeLabelSprite } from './Label';

/**
 * 低多邊形「灰盒」物件工廠。
 * 第 8 週換正式美術時，只要把這裡每個 kind 的工廠換成載入 glTF 模型即可，
 * 碰撞尺寸（PROP_DEFAULTS）保持不變。
 */
export const PROP_DEFAULTS: Record<PropDef['kind'], { w: number; d: number; h: number; solid: boolean; round: boolean }> = {
  house: { w: 8, d: 8, h: 5, solid: true, round: false },
  tree: { w: 2.4, d: 2.4, h: 4.5, solid: true, round: true },
  palm: { w: 1, d: 1, h: 5, solid: true, round: true },
  rock: { w: 2.2, d: 2.2, h: 1.4, solid: true, round: true },
  bush: { w: 1.8, d: 1.8, h: 1.1, solid: false, round: true },
  lamp: { w: 0.5, d: 0.5, h: 3.2, solid: true, round: true },
  fence: { w: 4, d: 0.3, h: 1, solid: true, round: false },
  wall: { w: 4, d: 1, h: 3, solid: true, round: false },
  fountain: { w: 7, d: 7, h: 1.4, solid: true, round: true },
  stairs: { w: 6, d: 4, h: 1.2, solid: false, round: false },
  pillar: { w: 1.4, d: 1.4, h: 3, solid: true, round: true },
};

const matCache = new Map<number, THREE.MeshLambertMaterial>();
export function mat(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    m.userData.shared = true; // 共用材質：切換區域時不 dispose
    matCache.set(color, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildProp(p: PropDef): THREE.Object3D {
  const def = PROP_DEFAULTS[p.kind];
  const w = p.w ?? def.w;
  const d = p.d ?? def.d;
  const h = p.h ?? def.h;
  const g = new THREE.Group();

  switch (p.kind) {
    case 'house': {
      const wallH = h * 0.55;
      g.add(mesh(new THREE.BoxGeometry(w, wallH, d), 0xf1e6cf, wallH / 2));
      // 斜屋頂：四角錐壓扁
      const roof = mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.56, h * 0.6, 4), p.color ?? 0x3d6fb6, wallH + h * 0.3);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
      g.add(roof);
      // 門
      g.add(mesh(new THREE.BoxGeometry(1.4, 2, 0.2), 0x7a5232, 1).translateZ(d / 2 + 0.05));
      if (p.sign) {
        const board = mesh(new THREE.BoxGeometry(Math.min(w * 0.7, 5), 0.9, 0.2), 0x2f4f8a, wallH - 0.4);
        board.position.z = d / 2 + 0.12;
        g.add(board);
        const label = makeLabelSprite(p.sign, { fontSize: 44, color: '#ffffff', bg: 'rgba(0,0,0,0)', scale: 1.3 });
        label.position.set(0, wallH - 0.4, d / 2 + 0.3);
        g.add(label);
      }
      break;
    }
    case 'tree': {
      g.add(mesh(new THREE.CylinderGeometry(0.25, 0.35, h * 0.4, 6), 0x7a5232, h * 0.2));
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.6, 0), p.color ?? 0x3f9a4a, h * 0.55));
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.42, 0), p.color ?? 0x4fae55, h * 0.82));
      break;
    }
    case 'palm': {
      const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.3, h, 6), 0x9a7448, h / 2);
      trunk.rotation.z = 0.12;
      g.add(trunk);
      for (let i = 0; i < 6; i++) {
        const leaf = mesh(new THREE.ConeGeometry(0.5, 3, 4), 0x3fa45a, h);
        leaf.rotation.set(Math.PI / 2.3, (i / 6) * Math.PI * 2, 0, 'YXZ');
        leaf.translateY(1.3);
        g.add(leaf);
      }
      break;
    }
    case 'rock':
      g.add(mesh(new THREE.DodecahedronGeometry(w * 0.5, 0), p.color ?? 0xcfc3a6, h * 0.35).rotateY(p.x));
      break;
    case 'bush':
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.5, 0), p.color ?? 0x4f9a3a, h * 0.4));
      break;
    case 'lamp': {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, h, 6), 0x3a3a44, h / 2));
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
      bulb.position.y = h;
      g.add(bulb);
      break;
    }
    case 'fence': {
      g.add(mesh(new THREE.BoxGeometry(w, 0.15, 0.12), 0x9a6a3a, h * 0.75));
      g.add(mesh(new THREE.BoxGeometry(w, 0.15, 0.12), 0x9a6a3a, h * 0.4));
      for (let i = 0; i <= 2; i++) g.add(mesh(new THREE.BoxGeometry(0.2, h, 0.2), 0x8a5a2a, h / 2).translateX(-w / 2 + (i * w) / 2));
      break;
    }
    case 'wall':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), p.color ?? 0xb7a58a, h / 2));
      break;
    case 'fountain': {
      g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.2, h * 0.6, 12), 0xe8e2d4, h * 0.3));
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 - 0.4, w / 2 - 0.4, 0.1, 12),
        new THREE.MeshLambertMaterial({ color: 0x5cc7f0, transparent: true, opacity: 0.9 }),
      );
      water.position.y = h * 0.62;
      g.add(water);
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, h * 1.6, 8), 0xe8e2d4, h * 0.8));
      g.add(mesh(new THREE.CylinderGeometry(1.2, 0.6, 0.3, 10), 0xe8e2d4, h * 1.6));
      break;
    }
    case 'stairs': {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        g.add(mesh(new THREE.BoxGeometry(w, (h / steps) * (i + 1), d / steps), 0xe9e2d0, ((h / steps) * (i + 1)) / 2).translateZ(d / 2 - (d / steps) * (i + 0.5)));
      }
      break;
    }
    case 'pillar':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), p.color ?? 0xd8d2c2, h / 2));
      break;
  }

  g.position.set(p.x, 0, p.z);
  if (p.rot) g.rotation.y = p.rot;
  return g;
}
