import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';

/**
 * 神話野獸造型（v1.30 新關卡）：
 *  serpent  勒拿水蛇（盤起的身體、會左右擺動的頸與頭）
 *  hydra    九頭蛇許德拉（首領：粗壯身體＋7 條會各自擺動的長頸）
 *  harpy    鷹身女妖（鳥身人頭，懸浮、拍翅）
 *  bull     克里特狂牛（四足，走路交替擺腳，出手前低頭）
 *  minotaur 米諾陶洛斯（首領：牛頭人身，手持克里特雙刃斧，出手前高舉）
 *  hound    冥界獵犬；首領版是三頭犬刻耳柏洛斯（三顆頭＋背上冥火）
 */

/** 一顆蛇頭（掛在 parent 下，嘴朝 +z）：回傳下顎 pivot */
export function snakeHead(b: ShapeBuilder, parent: THREE.Object3D, size: number, color: number, belly: number, eye: number): THREE.Group {
  const head = b.add(new THREE.SphereGeometry(0.22 * size, 8, 6), color, 0, 0, 0.08 * size, parent);
  head.scale.set(1, 0.75, 1.5);
  b.add(new THREE.ConeGeometry(0.12 * size, 0.22 * size, 6), color, 0, 0.02 * size, 0.38 * size, parent).rotation.x = Math.PI / 2;
  const jaw = b.group(0, -0.06 * size, 0.1 * size, parent);
  b.add(new THREE.ConeGeometry(0.1 * size, 0.32 * size, 6), belly, 0, 0, 0.16 * size, jaw).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.05 * size, 6, 4), eye, sx * 0.13 * size, 0.1 * size, 0.2 * size, parent);
    b.add(new THREE.ConeGeometry(0.025 * size, 0.1 * size, 4), 0xf4f1e8, sx * 0.06 * size, -0.07 * size, 0.33 * size, parent).rotation.x = Math.PI;
    // 頭冠鰭
    const fin = b.add(new THREE.ConeGeometry(0.07 * size, 0.28 * size, 3), belly, sx * 0.14 * size, 0.12 * size, -0.05 * size, parent);
    fin.rotation.set(-0.9, 0, sx * 0.6);
  }
  return jaw;
}

/** 一條由數段圓柱組成的長頸（沿 pivot 的 +y 往上），頂端回傳頭的掛點 */
export function neck(b: ShapeBuilder, parent: THREE.Object3D, segs: number, len: number, r0: number, r1: number, color: number): THREE.Group {
  let cur: THREE.Object3D = parent;
  const segLen = len / segs;
  for (let i = 0; i < segs; i++) {
    const rA = r0 + ((r1 - r0) * i) / segs;
    const rB = r0 + ((r1 - r0) * (i + 1)) / segs;
    b.add(new THREE.CylinderGeometry(rB, rA, segLen, 7), color, 0, segLen / 2, 0, cur);
    const next = b.group(0, segLen, 0, cur);
    next.rotation.x = 0.18; // 每節往前彎一點，整條頸成弧形
    cur = next;
  }
  return cur as THREE.Group;
}

export const serpent: ShapeBuild = (b) => {
  const c = b.color;
  const belly = b.light;
  // 盤起來的身體（兩圈）
  const coil1 = b.add(new THREE.TorusGeometry(0.42, 0.17, 6, 14), c, 0, 0.17, -0.1);
  coil1.rotation.x = Math.PI / 2;
  const coil2 = b.add(new THREE.TorusGeometry(0.28, 0.14, 6, 12), c, 0.05, 0.4, -0.05);
  coil2.rotation.x = Math.PI / 2;
  b.add(new THREE.ConeGeometry(0.1, 0.5, 5), b.dark, -0.5, 0.12, -0.35).rotation.set(0, 0, 1.4);
  // 背上的斑紋
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.07, 5, 4), b.dark, Math.cos(a) * 0.42, 0.3, Math.sin(a) * 0.42 - 0.1);
  }
  // 頸＋頭：會擺動
  const base = b.group(0.05, 0.45, 0.15);
  const top = neck(b, base, 3, 0.75, 0.15, 0.1, c);
  const jaw = snakeHead(b, top, 1, c, belly, 0xffe25a);
  return {
    height: 1.5,
    animate: ({ t, moving, winding, body }) => {
      base.rotation.z = Math.sin(t * (moving ? 6 : 2)) * 0.25;
      base.rotation.x = winding ? -0.55 : 0.1 + Math.sin(t * 1.7) * 0.08;
      jaw.rotation.x = winding ? 0.6 : 0.1 + Math.max(0, Math.sin(t * 2.3)) * 0.2;
      body.position.y = 0;
      body.rotation.y = moving ? Math.sin(t * 8) * 0.12 : 0;
    },
  };
};

export const hydra: ShapeBuild = (b) => {
  const c = b.color;
  const belly = b.light;
  // 粗壯的身體、四條短腳、尾巴
  const torso = b.add(new THREE.SphereGeometry(0.75, 10, 8), c, 0, 0.75, -0.1);
  torso.scale.set(1.15, 0.8, 1.3);
  b.add(new THREE.SphereGeometry(0.6, 10, 6), belly, 0, 0.55, 0.05).scale.set(1, 0.6, 1.2);
  for (const [x, z] of [[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.6], [0.6, -0.6]]) {
    b.add(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 7), b.dark, x, 0.25, z);
    for (const cx of [-0.08, 0, 0.08]) b.add(new THREE.ConeGeometry(0.05, 0.16, 4), 0xf4f1e8, x + cx, 0.04, z + 0.2).rotation.x = Math.PI / 2;
  }
  b.add(new THREE.ConeGeometry(0.28, 1.4, 7), c, 0, 0.6, -1.4).rotation.x = -Math.PI / 2 + 0.15;
  // 背脊尖刺
  for (let i = 0; i < 6; i++) b.add(new THREE.ConeGeometry(0.09, 0.3, 4), b.dark, 0, 1.3 - i * 0.03, 0.35 - i * 0.25);
  // 7 條長頸（中間最高），各自擺動
  const heads: { base: THREE.Group; jaw: THREE.Group; phase: number; spread: number }[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5; // -0.5 ~ 0.5
    const base = b.group(k * 1.1, 1.05, 0.55 - Math.abs(k) * 0.4);
    const spread = k * 1.3;
    base.rotation.z = -spread;
    const top = neck(b, base, 4, 1.3 - Math.abs(k) * 0.5, 0.17, 0.11, c);
    const jaw = snakeHead(b, top, 1.15, c, belly, i === 3 ? 0xff5a3a : 0xffe25a); // 中間那顆是「不死之頭」，紅眼
    heads.push({ base, jaw, phase: i * 1.3, spread });
  }
  return {
    height: 2.6,
    animate: ({ t, moving, winding, lean, body }) => {
      for (const h of heads) {
        h.base.rotation.z = -h.spread + Math.sin(t * 1.6 + h.phase) * 0.12;
        h.base.rotation.x = winding ? -0.5 + Math.sin(t * 20 + h.phase) * 0.05 : 0.05 + Math.sin(t * 1.3 + h.phase) * 0.1;
        h.jaw.rotation.x = winding ? 0.7 : 0.1 + Math.max(0, Math.sin(t * 2 + h.phase)) * 0.3;
      }
      body.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.05 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const harpy: ShapeBuild = (b) => {
  const c = b.color; // 羽毛
  const skin = 0xe8c4a0;
  const torso = b.add(new THREE.SphereGeometry(0.32, 8, 6), c, 0, 0, 0);
  torso.scale.set(0.9, 1.15, 0.85);
  b.add(new THREE.SphereGeometry(0.22, 8, 6), skin, 0, 0.12, 0.1).scale.set(0.9, 1, 0.7); // 胸口（人身）
  b.add(new THREE.SphereGeometry(0.2, 8, 6), skin, 0, 0.5, 0.05); // 頭
  const hair = b.add(new THREE.SphereGeometry(0.23, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), 0x2b2236, 0, 0.53, 0.0);
  hair.scale.set(1, 1, 1.05);
  b.add(new THREE.ConeGeometry(0.16, 0.45, 5), 0x2b2236, 0, 0.35, -0.15).rotation.x = 0.3; // 長髮
  b.glow(new THREE.SphereGeometry(0.035, 5, 4), 0xffd34a, -0.07, 0.52, 0.2);
  b.glow(new THREE.SphereGeometry(0.035, 5, 4), 0xffd34a, 0.07, 0.52, 0.2);
  b.add(new THREE.ConeGeometry(0.15, 0.4, 5), b.dark, 0, -0.35, -0.15).rotation.x = -2.6; // 尾羽
  for (const sx of [-1, 1]) {
    // 鳥爪
    b.add(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 4), 0xd8a24a, sx * 0.1, -0.42, 0.05);
    for (const cz of [-0.05, 0.05]) b.add(new THREE.ConeGeometry(0.025, 0.12, 4), 0x3a2a1a, sx * 0.1 + cz, -0.6, 0.1).rotation.x = Math.PI * 0.7;
  }
  const wings: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pivot = b.group(sx * 0.22, 0.15, -0.05);
    // 兩層羽毛
    const w1 = b.add(new THREE.BoxGeometry(0.9, 0.05, 0.42), c, sx * 0.48, 0, 0, pivot);
    w1.rotation.y = sx * 0.1;
    const w2 = b.add(new THREE.BoxGeometry(0.6, 0.05, 0.3), b.dark, sx * 0.85, -0.02, -0.12, pivot);
    w2.rotation.y = sx * 0.3;
    wings.push(pivot);
  }
  return {
    height: 1.8,
    animate: ({ t, lean, body }) => {
      body.position.y = 1.0 + Math.sin(t * 3) * 0.2;
      const flap = Math.sin(t * 12) * 0.6;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      body.rotation.x = lean;
    },
  };
};

/** 四足動物的腳：回傳 4 個 pivot（前左、前右、後左、後右） */
export function fourLegs(b: ShapeBuilder, color: number, hoof: number, w: number, front: number, back: number, hipY: number, len: number, r: number): THREE.Group[] {
  const out: THREE.Group[] = [];
  for (const [x, z] of [[-w, front], [w, front], [-w, back], [w, back]]) {
    const p = b.group(x, hipY, z);
    b.add(new THREE.CylinderGeometry(r * 0.8, r, len, 6), color, 0, -len / 2, 0, p);
    b.add(new THREE.CylinderGeometry(r * 0.9, r * 0.9, len * 0.15, 6), hoof, 0, -len + len * 0.07, 0, p);
    out.push(p);
  }
  return out;
}

export const bull: ShapeBuild = (b) => {
  const c = b.color;
  const torso = b.add(new THREE.BoxGeometry(0.75, 0.62, 1.3), c, 0, 0.85, 0);
  torso.scale.set(1, 1, 1);
  b.add(new THREE.SphereGeometry(0.42, 8, 6), c, 0, 1.0, 0.45).scale.set(1, 0.9, 0.8); // 肩峰
  const head = b.group(0, 1.0, 0.7);
  b.add(new THREE.BoxGeometry(0.42, 0.42, 0.5), c, 0, -0.05, 0.25, head);
  b.add(new THREE.BoxGeometry(0.36, 0.26, 0.2), b.light, 0, -0.17, 0.52, head); // 口鼻
  b.add(new THREE.TorusGeometry(0.07, 0.018, 4, 10), 0xf4c64e, 0, -0.27, 0.6, head); // 鼻環
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.07, 0.5, 6), 0xf1ead8, sx * 0.34, 0.2, 0.15, head);
    horn.rotation.set(0.3, 0, sx * -1.1);
    b.glow(new THREE.SphereGeometry(0.04, 5, 4), 0xff4a3a, sx * 0.16, 0.04, 0.5, head);
  }
  const legs = fourLegs(b, b.dark, 0x2b2622, 0.26, 0.45, -0.45, 0.6, 0.6, 0.11);
  const tail = b.group(0, 1.0, -0.65);
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 4), b.dark, 0, -0.27, 0, tail);
  return {
    height: 1.4,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 11) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      head.rotation.x = winding ? 0.55 : Math.sin(t * 2) * 0.05; // 出手前低頭準備衝撞
      tail.rotation.z = Math.sin(t * 4) * 0.3;
      body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.05 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const minotaur: ShapeBuild = (b) => {
  const c = b.color; // 皮毛
  const skin = new THREE.Color(c).lerp(new THREE.Color(0xc98a5a), 0.4).getHex();
  // 腿（pivot 在髖部）
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.24, 1.0, 0);
    b.add(new THREE.CylinderGeometry(0.15, 0.18, 0.62, 7), c, 0, -0.3, 0, p);
    b.add(new THREE.CylinderGeometry(0.12, 0.14, 0.42, 7), b.dark, 0, -0.78, 0.02, p);
    b.add(new THREE.BoxGeometry(0.22, 0.12, 0.3), 0x2b2622, 0, -0.98, 0.06, p); // 蹄
    legs.push(p);
  }
  // 腰布、身體
  b.add(new THREE.CylinderGeometry(0.42, 0.36, 0.3, 8), 0x8a2a2a, 0, 1.05, 0);
  b.add(new THREE.BoxGeometry(0.62, 0.1, 0.42), 0xf4c64e, 0, 1.18, 0);
  const chest = b.add(new THREE.SphereGeometry(0.5, 10, 8), skin, 0, 1.55, 0);
  chest.scale.set(1.15, 0.95, 0.75);
  b.add(new THREE.SphereGeometry(0.28, 8, 6), c, -0.42, 1.8, 0); // 肩
  b.add(new THREE.SphereGeometry(0.28, 8, 6), c, 0.42, 1.8, 0);
  // 牛頭
  const head = b.group(0, 2.0, 0.05);
  b.add(new THREE.BoxGeometry(0.4, 0.42, 0.45), c, 0, 0.12, 0.08, head);
  b.add(new THREE.BoxGeometry(0.34, 0.24, 0.22), b.light, 0, 0.0, 0.36, head);
  b.add(new THREE.TorusGeometry(0.07, 0.02, 4, 10), 0xf4c64e, 0, -0.1, 0.46, head);
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.08, 0.6, 6), 0xf1ead8, sx * 0.38, 0.35, 0.05, head);
    horn.rotation.set(0.2, 0, sx * -1.15);
    b.glow(new THREE.SphereGeometry(0.045, 5, 4), 0xff3a2a, sx * 0.13, 0.18, 0.32, head);
  }
  // 手臂（右手拿克里特雙刃斧）
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.55, 1.8, 0);
    b.add(new THREE.CylinderGeometry(0.12, 0.14, 0.55, 7), skin, 0, -0.27, 0, p);
    b.add(new THREE.CylinderGeometry(0.11, 0.12, 0.45, 7), skin, 0, -0.72, 0.05, p);
    b.add(new THREE.SphereGeometry(0.12, 6, 5), skin, 0, -0.98, 0.08, p);
    arms.push(p);
  }
  const axe = b.group(0, -1.0, 0.1, arms[1]);
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), 0x6b4a2a, 0, 0.2, 0, axe);
  for (const sx of [-1, 1]) {
    const blade = b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 3, 1, false, 0, Math.PI), 0xc9ccd4, sx * 0.05, 0.85, 0, axe);
    blade.rotation.set(Math.PI / 2, 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  axe.rotation.x = 1.2;
  return {
    height: 2.5,
    animate: ({ t, moving, winding, body }) => {
      const sw = moving ? Math.sin(t * 7) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.6;
      // 右手：出手前把斧頭高舉過頭
      arms[1].rotation.x = winding ? -2.6 : sw * 0.4 - 0.2;
      head.rotation.y = Math.sin(t * 0.8) * 0.15;
      head.rotation.x = winding ? -0.2 : 0;
      body.position.y = moving ? Math.abs(Math.sin(t * 7)) * 0.06 : 0;
    },
  };
};

export const hound: ShapeBuild = (b) => {
  const c = b.color;
  const boss = b.boss;
  const torso = b.add(new THREE.SphereGeometry(0.42, 8, 6), c, 0, 0.75, -0.05);
  torso.scale.set(0.85, 0.8, 1.55);
  b.add(new THREE.SphereGeometry(0.36, 8, 6), c, 0, 0.88, 0.4).scale.set(0.95, 0.95, 0.9); // 胸
  // 頭：普通 1 顆；三頭犬 3 顆
  const heads: THREE.Group[] = [];
  const offsets = boss ? [-0.42, 0, 0.42] : [0];
  for (const ox of offsets) {
    const h = b.group(ox, 1.05, 0.6);
    h.rotation.y = ox * 0.7;
    b.add(new THREE.CylinderGeometry(0.13, 0.17, 0.3, 6), c, 0, -0.05, -0.05, h).rotation.x = 0.6; // 頸
    b.add(new THREE.SphereGeometry(0.21, 8, 6), c, 0, 0.08, 0.08, h).scale.set(1, 0.9, 1.1);
    b.add(new THREE.BoxGeometry(0.17, 0.14, 0.28), b.dark, 0, 0.02, 0.3, h); // 口鼻
    b.add(new THREE.BoxGeometry(0.06, 0.05, 0.05), 0x111111, 0, 0.08, 0.45, h);
    for (const sx of [-1, 1]) {
      b.add(new THREE.ConeGeometry(0.07, 0.2, 4), b.dark, sx * 0.12, 0.28, 0.02, h).rotation.z = -sx * 0.3;
      b.glow(new THREE.SphereGeometry(0.035, 5, 4), boss ? 0xff7a2a : 0xff3a2a, sx * 0.09, 0.14, 0.24, h);
      b.add(new THREE.ConeGeometry(0.02, 0.07, 4), 0xf4f1e8, sx * 0.05, -0.06, 0.4, h).rotation.x = Math.PI;
    }
    heads.push(h);
  }
  const legs = fourLegs(b, b.dark, 0x1b1a1d, 0.2, 0.42, -0.5, 0.55, 0.55, 0.08);
  const tail = b.group(0, 0.85, -0.7);
  b.add(new THREE.ConeGeometry(0.07, 0.6, 5), c, 0, 0.25, -0.1, tail).rotation.x = -0.9;
  if (boss) {
    // 背上冥火、蛇尾（神話裡刻耳柏洛斯的尾巴是一條蛇）
    for (let i = 0; i < 5; i++) b.glow(new THREE.ConeGeometry(0.1 - i * 0.008, 0.35, 5), i % 2 ? 0xff9a3c : 0xb48cff, 0, 1.15, 0.3 - i * 0.2);
    b.add(new THREE.SphereGeometry(0.08, 6, 4), 0x3a6a3a, 0, 0.6, -0.65, tail);
  }
  return {
    height: boss ? 1.5 : 1.3,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 13) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      heads.forEach((h, i) => {
        h.rotation.x = winding ? -0.35 : Math.sin(t * 2.2 + i * 1.7) * 0.12;
      });
      tail.rotation.z = Math.sin(t * (moving ? 12 : 5)) * 0.4;
      body.position.y = moving ? Math.abs(Math.sin(t * 13)) * 0.06 : 0;
      body.rotation.x = lean * 0.4;
    },
  };
};

