import * as THREE from 'three';
import type { ShapeBuild } from './types';

/**
 * 簡單造型：木樁、軟泥、蘑菇、青蛙（模型沒載入時）、蝙蝠鳥、骷髏（模型沒載入時）、魔像。
 */

export const dummy: ShapeBuild = (b) => {
  b.add(new THREE.CylinderGeometry(0.12, 0.16, 1.9, 6), 0x7a5232, 0, 0.95);
  b.add(new THREE.BoxGeometry(1.3, 0.14, 0.14), 0x7a5232, 0, 1.35);
  b.add(new THREE.CylinderGeometry(0.42, 0.36, 0.9, 7), b.color, 0, 1.15);
  b.add(new THREE.IcosahedronGeometry(0.3, 0), 0xe0c27a, 0, 1.85);
  b.add(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 12), 0xd84a3a, 0, 1.2, 0.38).rotation.x = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), 0xf4f1e8, 0, 1.2, 0.4).rotation.x = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.5, 0.6, 0.15, 8), 0x8a6a4a, 0, 0.07);
  return { height: 2.1 };
};

/** 跳躍前進＋擠壓伸展（軟泥、程式青蛙共用） */
const hop: NonNullable<ReturnType<ShapeBuild>['animate']> = ({ t, moving, lean, scale, body }) => {
  const h = moving ? Math.abs(Math.sin(t * 7)) : Math.abs(Math.sin(t * 2.5)) * 0.25;
  body.position.y = h * 0.35;
  const squash = 1 + (moving ? Math.sin(t * 14) * 0.08 : Math.sin(t * 5) * 0.04);
  body.scale.set(scale / squash, scale * squash, scale / squash);
  body.rotation.x = lean;
};

export const slime: ShapeBuild = (b) => {
  const blob = b.add(new THREE.IcosahedronGeometry(0.6, 1), b.color, 0, 0.45);
  blob.scale.y = 0.78;
  const shine = b.add(new THREE.SphereGeometry(0.12, 6, 4), 0xffffff, -0.22, 0.75, 0.3);
  shine.scale.set(1, 0.6, 1);
  b.eyes(0.55, 0.48, 0.18, 0.06);
  return { height: 1, animate: hop };
};

export const mushroom: ShapeBuild = (b) => {
  b.add(new THREE.CylinderGeometry(0.28, 0.36, 0.6, 8), 0xf1e6cf, 0, 0.3);
  const cap = b.add(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), b.color, 0, 0.55);
  cap.scale.y = 0.75;
  for (const [x, z] of [[0.25, 0.3], [-0.3, 0.15], [0.05, -0.35], [-0.1, 0.45]]) b.add(new THREE.SphereGeometry(0.08, 6, 4), 0xffffff, x, 0.9, z);
  b.eyes(0.38, 0.3, 0.12, 0.05);
  return { height: 1.1 };
};

/** 程式青蛙（Quaternius 模型載入失敗時的備案） */
export const frog: ShapeBuild = (b) => {
  const c = b.color;
  const body = b.add(new THREE.SphereGeometry(0.55, 8, 6), c, 0, 0.4);
  body.scale.set(1.1, 0.75, 1);
  b.add(new THREE.SphereGeometry(0.4, 8, 5), new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.45).getHex(), 0, 0.32, 0.25).scale.set(1, 0.6, 0.8);
  for (const sx of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.17, 6, 5), c, sx * 0.25, 0.75, 0.25);
    b.add(new THREE.SphereGeometry(0.1, 6, 4), 0x1b2433, sx * 0.27, 0.8, 0.38);
    b.add(new THREE.SphereGeometry(0.2, 6, 4), b.dark, sx * 0.5, 0.15, -0.1).scale.set(1, 0.5, 1.4);
  }
  return { height: 1, animate: hop };
};

export const bat: ShapeBuild = (b) => {
  const body = b.add(new THREE.SphereGeometry(0.35, 8, 6), b.color, 0, 0);
  body.scale.set(1, 1.1, 0.9);
  const wings: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pivot = b.group(sx * 0.25, 0.05, 0);
    const wing = b.add(new THREE.ConeGeometry(0.35, 0.9, 3), b.dark, sx * 0.45, 0, 0, pivot);
    wing.rotation.z = (sx * Math.PI) / 2;
    wing.scale.z = 0.2;
    wings.push(pivot);
    b.add(new THREE.ConeGeometry(0.08, 0.2, 4), b.color, sx * 0.15, 0.38, 0);
  }
  b.add(new THREE.SphereGeometry(0.06, 6, 4), 0xff4a4a, -0.12, 0.08, 0.3);
  b.add(new THREE.SphereGeometry(0.06, 6, 4), 0xff4a4a, 0.12, 0.08, 0.3);
  return {
    height: 1.6,
    animate: ({ t, lean, body: root }) => {
      root.position.y = 0.9 + Math.sin(t * 3) * 0.2;
      const flap = Math.sin(t * 18) * 0.7;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      root.rotation.x = lean;
    },
  };
};

/** 程式骷髏（KayKit 模型沒載入時的備案） */
export const skeleton: ShapeBuild = (b) => {
  b.add(new THREE.BoxGeometry(0.5, 0.7, 0.3), 0xe8e2d0, 0, 1.15);
  b.add(new THREE.IcosahedronGeometry(0.3, 1), 0xf1ecdf, 0, 1.75);
  b.add(new THREE.BoxGeometry(0.14, 0.8, 0.14), 0xe8e2d0, -0.15, 0.4);
  b.add(new THREE.BoxGeometry(0.14, 0.8, 0.14), 0xe8e2d0, 0.15, 0.4);
  b.add(new THREE.SphereGeometry(0.06, 6, 4), 0x1b2433, -0.1, 1.78, 0.26);
  b.add(new THREE.SphereGeometry(0.06, 6, 4), 0x1b2433, 0.1, 1.78, 0.26);
  return { height: 2.1 };
};

export const golem: ShapeBuild = (b) => {
  const c = b.color;
  b.add(new THREE.BoxGeometry(1, 0.9, 0.7), c, 0, 1.05);
  b.add(new THREE.BoxGeometry(0.6, 0.5, 0.55), b.dark, 0, 1.75);
  b.add(new THREE.BoxGeometry(0.35, 0.6, 0.4), b.dark, -0.3, 0.3);
  b.add(new THREE.BoxGeometry(0.35, 0.6, 0.4), b.dark, 0.3, 0.3);
  b.add(new THREE.BoxGeometry(0.35, 0.9, 0.35), c, -0.72, 1.0);
  b.add(new THREE.BoxGeometry(0.35, 0.9, 0.35), c, 0.72, 1.0);
  // 發光核心與眼睛
  b.glow(new THREE.OctahedronGeometry(0.18, 0), 0x8fe8ff, 0, 1.1, 0.36);
  b.glow(new THREE.BoxGeometry(0.4, 0.08, 0.05), 0x8fe8ff, 0, 1.8, 0.28);
  return { height: 2.1 };
};
