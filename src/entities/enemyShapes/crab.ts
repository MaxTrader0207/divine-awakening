import * as THREE from 'three';
import type { ShapeBuild } from './types';

/**
 * 程式螃蟹（沒有可用的 CC0 螃蟹模型）：
 * 扁圓甲殼＋可動的 6 隻腳（走路交替擺動）＋兩隻大鉗（下顎會開合、出手前高舉）＋眼柄。
 * 卡基諾斯幼蟹背螺旋殼；首領「巨蟹卡基諾斯」改成尖刺甲殼、特大右鉗、小皇冠。
 */
export const crab: ShapeBuild = (b) => {
  const c = b.color;
  const dark = b.dark;
  const boss = b.boss;
  const light = new THREE.Color(c).lerp(new THREE.Color(0xffe8d0), 0.45).getHex();
  const legs: { pivot: THREE.Object3D; side: number; phase: number }[] = [];
  const claws: { pivot: THREE.Object3D; jaw: THREE.Object3D; side: number }[] = [];
  // 甲殼：上蓋＋下腹
  const top = b.add(new THREE.SphereGeometry(0.52, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.38);
  top.scale.set(1.25, 0.62, 1);
  const belly = b.add(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), light, 0, 0.39);
  belly.scale.set(1.2, 0.35, 0.95);
  // 甲殼斑點
  for (const [x, z, r] of [[0.22, 0.15, 0.09], [-0.25, 0.05, 0.07], [0.02, -0.2, 0.08], [-0.1, 0.25, 0.06]]) b.add(new THREE.SphereGeometry(r, 6, 4), light, x, 0.66, z).scale.y = 0.4;
  if (boss) {
    // 蟹王：尖刺＋小皇冠
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI - Math.PI;
      b.add(new THREE.ConeGeometry(0.07, 0.22, 5), dark, Math.cos(a) * 0.55, 0.52, Math.sin(a) * 0.38 + 0.05).rotation.z = -Math.cos(a) * 0.9;
    }
    for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(0.05, 0.16, 4), 0xf4c64e, -0.16 + i * 0.08, 0.78, 0.05);
    b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 10), 0xf4c64e, 0, 0.7, 0.05);
  } else {
    // 卡基諾斯幼蟹：背上的螺旋殼（一圈圈縮小的環＋尖端）
    const shell = b.group(0, 0.7, -0.18);
    shell.rotation.x = -0.55;
    const shellCol = [0xf1e3c8, 0xe6b8a0, 0xf1e3c8, 0xe6b8a0];
    for (let i = 0; i < 4; i++) {
      const r = 0.34 - i * 0.07;
      b.add(new THREE.TorusGeometry(r, 0.11 - i * 0.015, 6, 12), shellCol[i], 0, i * 0.13, 0, shell).rotation.x = Math.PI / 2;
    }
    b.add(new THREE.ConeGeometry(0.1, 0.25, 8), 0xf1e3c8, 0, 0.6, 0, shell);
  }
  // 眼柄
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 5), dark, sx * 0.14, 0.72, 0.36);
    b.add(new THREE.SphereGeometry(0.075, 8, 6), 0xffffff, sx * 0.14, 0.9, 0.38);
    b.add(new THREE.SphereGeometry(0.045, 6, 4), 0x1b2433, sx * 0.14, 0.91, 0.44);
  }
  // 腳：每邊 3 隻，pivot 在甲殼側邊
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const pivot = b.group(sx * 0.5, 0.36, 0.12 - i * 0.22);
      pivot.rotation.y = sx * (0.15 - i * 0.25);
      const upper = b.add(new THREE.CylinderGeometry(0.045, 0.055, 0.34, 5), dark, sx * 0.15, 0.06, 0, pivot);
      upper.rotation.z = sx * 1.15;
      const lower = b.add(new THREE.CylinderGeometry(0.025, 0.045, 0.34, 5), dark, sx * 0.33, -0.12, 0, pivot);
      lower.rotation.z = -sx * 0.35;
      legs.push({ pivot, side: sx, phase: i * 2.1 + (sx > 0 ? Math.PI : 0) });
    }
  }
  // 大鉗：手臂 pivot＋可開合的下顎
  for (const sx of [-1, 1]) {
    const big = boss && sx > 0 ? 1.35 : 1;
    const pivot = b.group(sx * 0.42, 0.42, 0.32);
    pivot.rotation.y = sx * 0.35;
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 6), dark, sx * 0.08, 0, 0.12, pivot).rotation.x = Math.PI / 2;
    const hand = b.group(sx * 0.1, 0.02, 0.32, pivot);
    hand.scale.setScalar(big);
    const palm = b.add(new THREE.SphereGeometry(0.17, 8, 6), c, 0, 0, 0.05, hand);
    palm.scale.set(0.9, 0.75, 1.15);
    // 上鉗（固定）
    const upper = b.add(new THREE.ConeGeometry(0.09, 0.32, 6), c, 0, 0.06, 0.26, hand);
    upper.rotation.x = Math.PI / 2;
    upper.scale.set(1, 1, 0.7);
    // 下鉗（會動）
    const jaw = b.group(0, -0.04, 0.12, hand);
    const lowerJaw = b.add(new THREE.ConeGeometry(0.07, 0.26, 6), light, 0, -0.02, 0.12, jaw);
    lowerJaw.rotation.x = Math.PI / 2;
    claws.push({ pivot, jaw, side: sx });
  }

  return {
    height: boss ? 1.05 : 1.15,
    /** 走路時腳交替擺動、身體左右晃；平常大鉗慢慢開合；前搖時雙鉗高舉張開 */
    animate: ({ t, moving, winding, lean, body }) => {
      for (const l of legs) {
        const w = moving ? Math.sin(t * 16 + l.phase) : Math.sin(t * 2 + l.phase) * 0.15;
        l.pivot.rotation.x = w * 0.35;
        l.pivot.rotation.z = l.side * Math.max(0, w) * 0.25;
      }
      body.position.y = moving ? Math.abs(Math.sin(t * 16)) * 0.04 : 0;
      body.rotation.z = moving ? Math.sin(t * 8) * 0.06 : 0;
      for (const cl of claws) {
        const snap = winding ? 0.5 : 0.12 + Math.max(0, Math.sin(t * 3 + cl.side)) * 0.25;
        cl.jaw.rotation.x = snap;
        cl.pivot.rotation.x = winding ? -0.75 : -0.05 + Math.sin(t * 1.5 + cl.side) * 0.05;
      }
      body.rotation.x = lean * 0.4;
    },
  };
};
