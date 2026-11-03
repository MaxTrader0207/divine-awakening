import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';
import { fourLegs } from './beasts';
import { wing } from './monsters';

/**
 * 終盤的巨人與萬怪之母（v1.39 第十七～二十二層）：
 *  argus   百眼巨人阿爾戈斯（瘦高巨人、全身發光的眼睛會眨、牧杖；出手前高舉牧杖）
 *  geryon  三身巨人革律翁（一個腰上三個身體、三顆戴羽盔的頭、六條手臂拿矛）
 *  echidna 萬怪之母厄喀德那（女身、兩條巨大的蛇尾盤在地上、尾端是蛇頭、頭上有角）
 *  kampe   塔爾塔洛斯獄龍坎佩（龍身四足、腰間一圈獸首、蠍尾、黑翼；最終首領）
 */

/** 兩條巨人腿：回傳 [左, 右] pivot */
function giantLegs(b: ShapeBuilder, color: number, boot: number, hipY: number, gap: number, r: number): THREE.Group[] {
  const out: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * gap, hipY, 0);
    b.add(new THREE.CylinderGeometry(r * 0.85, r, hipY * 0.55, 7), color, 0, -hipY * 0.27, 0, p);
    b.add(new THREE.CylinderGeometry(r * 0.7, r * 0.8, hipY * 0.42, 7), color, 0, -hipY * 0.75, 0, p);
    b.add(new THREE.BoxGeometry(r * 1.6, 0.1, r * 2.2), boot, 0, -hipY + 0.05, r * 0.3, p);
    out.push(p);
  }
  return out;
}

export const argus: ShapeBuild = (b) => {
  const c = b.color; // 皮膚
  const boss = b.boss;
  const eye = boss ? 0x7affd0 : 0x9ad8ff;
  const legs = giantLegs(b, c, 0x5a3a22, 1.1, 0.24, 0.15);
  b.add(new THREE.CylinderGeometry(0.4, 0.34, 0.3, 8), 0x7a5a8a, 0, 1.12, 0); // 腰布
  const torso = b.add(new THREE.CylinderGeometry(0.42, 0.34, 0.9, 9), c, 0, 1.68, 0);
  torso.scale.set(1, 1, 0.8);
  // 身上的眼睛（會眨：整組縮放）
  const eyes: THREE.Mesh[] = [];
  const spots: [number, number, number][] = [[0, 1.85, 0.32], [-0.2, 1.62, 0.3], [0.2, 1.62, 0.3], [-0.12, 1.4, 0.3], [0.12, 1.4, 0.3], [-0.3, 1.9, 0.18], [0.3, 1.9, 0.18], [0, 1.55, -0.3], [-0.22, 1.8, -0.26], [0.22, 1.8, -0.26]];
  for (const [x, y, z] of spots) {
    b.add(new THREE.SphereGeometry(0.06, 6, 4), 0xffffff, x, y, z * 1.02).scale.set(1, 0.8, 0.5);
    eyes.push(b.glow(new THREE.SphereGeometry(0.035, 5, 4), eye, x, y, z * 1.08));
  }
  const head = b.group(0, 2.3, 0.02);
  b.add(new THREE.SphereGeometry(0.27, 10, 8), c, 0, 0.05, 0, head);
  b.add(new THREE.SphereGeometry(0.29, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), 0x3a2a1a, 0, 0.08, -0.02, head);
  for (const [x, y] of [[-0.1, 0.06], [0.1, 0.06], [0, 0.18], [-0.17, 0.16], [0.17, 0.16]]) {
    b.add(new THREE.SphereGeometry(0.05, 6, 4), 0xffffff, x, y, 0.23, head).scale.set(1, 0.8, 0.5);
    eyes.push(b.glow(new THREE.SphereGeometry(0.03, 5, 4), eye, x, y, 0.26, head));
  }
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.5, 2.0, 0);
    b.add(new THREE.SphereGeometry(0.15, 7, 5), c, 0, 0, 0, p);
    b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.65, 7), c, 0, -0.34, 0, p);
    b.add(new THREE.CylinderGeometry(0.09, 0.1, 0.55, 7), c, 0, -0.85, 0.04, p);
    b.add(new THREE.SphereGeometry(0.06, 6, 4), 0xffffff, 0, -0.5, 0.11, p).scale.set(1, 0.8, 0.5);
    eyes.push(b.glow(new THREE.SphereGeometry(0.03, 5, 4), eye, 0, -0.5, 0.13, p));
    arms.push(p);
  }
  // 牧杖（右手）
  const staff = b.group(0, -1.1, 0.05, arms[1]);
  b.add(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), 0x6b4a2a, 0, 0.6, 0, staff);
  b.add(new THREE.TorusGeometry(0.16, 0.04, 5, 10, Math.PI * 1.4), 0x6b4a2a, 0.12, 1.75, 0, staff);
  if (boss) b.glow(new THREE.SphereGeometry(0.08, 6, 4), 0x7affd0, 0, 1.72, 0, staff);
  staff.rotation.x = 0.2;
  return {
    height: 2.7,
    animate: ({ t, moving, winding, body }) => {
      const sw = moving ? Math.sin(t * 6) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.5;
      arms[1].rotation.x = winding ? -2.6 : sw * 0.4 - 0.1;
      // 眼睛輪流眨（百眼不會同時閉上）
      eyes.forEach((m, i) => {
        const blink = Math.sin(t * 1.7 + i * 2.3) > 0.94 ? 0.15 : 1;
        m.scale.y = winding ? 1.4 : blink;
      });
      head.rotation.y = Math.sin(t * 0.6) * 0.3;
      body.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.06 : 0;
    },
  };
};

export const geryon: ShapeBuild = (b) => {
  const c = b.color; // 皮膚
  const armor = 0xb8863a;
  const legs = giantLegs(b, c, 0x3a2a1a, 1.0, 0.3, 0.17);
  b.add(new THREE.CylinderGeometry(0.62, 0.5, 0.35, 10), 0x8a1a1a, 0, 1.05, 0); // 紅色戰裙
  const bodies: { head: THREE.Group; arms: THREE.Group[] }[] = [];
  for (const [i, x] of [-0.55, 0, 0.55].entries()) {
    const tilt = (i - 1) * 0.22;
    const torso = b.group(x * 0.78, 1.2, 0);
    torso.rotation.z = -tilt;
    b.add(new THREE.CylinderGeometry(0.26, 0.22, 0.7, 8), armor, 0, 0.35, 0, torso);
    b.add(new THREE.BoxGeometry(0.42, 0.1, 0.26), armor, 0, 0.66, 0, torso); // 肩甲
    const head = b.group(0, 0.92, 0.02, torso);
    b.add(new THREE.SphereGeometry(0.17, 8, 6), c, 0, 0, 0, head);
    b.add(new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), armor, 0, 0.03, 0, head);
    b.add(new THREE.BoxGeometry(0.05, 0.22, 0.4), 0xc82a2a, 0, 0.22, -0.02, head); // 羽冠
    for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.025, 4, 3), b.boss ? 0xff6a3a : 0xffd04a, sx * 0.06, 0.0, 0.16, head);
    const arms: THREE.Group[] = [];
    for (const sx of [-1, 1]) {
      const p = b.group(sx * 0.3, 0.6, 0, torso);
      b.add(new THREE.CylinderGeometry(0.06, 0.075, 0.6, 6), c, 0, -0.28, 0, p);
      arms.push(p);
    }
    if (i !== 1) {
      // 外側的身體拿長矛，中間拿圓盾
      const spear = b.group(0, -0.55, 0.05, arms[i === 0 ? 0 : 1]);
      b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 5), 0x6b4a2a, 0, 0.4, 0, spear);
      b.add(new THREE.ConeGeometry(0.06, 0.22, 4), 0xd8d8e0, 0, 1.4, 0, spear);
      spear.rotation.x = 0.3;
    } else {
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), armor, 0, -0.5, 0.15, arms[0]).rotation.x = Math.PI / 2;
    }
    bodies.push({ head, arms });
  }
  return {
    height: 2.3,
    animate: ({ t, moving, winding, body }) => {
      const sw = moving ? Math.sin(t * 6) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      bodies.forEach(({ head, arms }, i) => {
        head.rotation.y = Math.sin(t * 0.9 + i * 2) * 0.35;
        arms[0].rotation.x = winding ? -2.2 : Math.sin(t * 2 + i) * 0.1 - sw * 0.3;
        arms[1].rotation.x = winding ? -2.2 : Math.sin(t * 2 + i + 1) * 0.1 + sw * 0.3;
      });
      body.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.06 : 0;
      body.rotation.z = moving ? Math.sin(t * 6) * 0.03 : 0;
    },
  };
};

/** 蛇尾：從 (x, z) 往外伸出的一串節，尾端是蛇頭；回傳每一節的 pivot */
function serpentTail(b: ShapeBuilder, color: number, x: number, z: number, yaw: number, n: number, r: number, eye: number): THREE.Group[] {
  const out: THREE.Group[] = [];
  let parent: THREE.Object3D = b.body;
  for (let i = 0; i < n; i++) {
    const p = b.group(i === 0 ? x : 0, i === 0 ? r : 0, i === 0 ? z : r * 1.6, parent);
    if (i === 0) p.rotation.y = yaw;
    const rr = r * (1 - i * 0.12);
    b.add(new THREE.SphereGeometry(rr, 8, 6), color, 0, 0, 0, p).scale.set(1, 0.85, 1.25);
    out.push(p);
    parent = p;
  }
  const head = b.group(0, 0.05, r * 1.4, parent);
  b.add(new THREE.BoxGeometry(r * 1.3, r * 0.8, r * 1.6), color, 0, 0, 0, head);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(r * 0.18, 4, 3), eye, sx * r * 0.45, r * 0.25, r * 0.6, head);
  out.push(head);
  return out;
}

export const echidna: ShapeBuild = (b) => {
  const c = b.color; // 鱗色（紫綠）
  const skin = new THREE.Color(c).lerp(new THREE.Color(0xe8d8c8), 0.65).getHex();
  const eye = b.boss ? 0xc86aff : 0x8aff6a;
  // 盤在地上的蛇身
  const coil = b.add(new THREE.TorusGeometry(0.62, 0.26, 7, 16), c, 0, 0.26, -0.1);
  coil.rotation.x = Math.PI / 2;
  b.add(new THREE.TorusGeometry(0.42, 0.22, 7, 14), b.dark, 0, 0.6, -0.05).rotation.x = Math.PI / 2;
  // 兩條蛇尾往後左右伸出
  const tails = [serpentTail(b, c, -0.55, -0.55, Math.PI + 0.6, 4, 0.16, eye), serpentTail(b, c, 0.55, -0.55, Math.PI - 0.6, 4, 0.16, eye)];
  b.add(new THREE.CylinderGeometry(0.24, 0.34, 0.55, 8), c, 0, 0.9, 0.05);
  // 女身
  b.add(new THREE.CylinderGeometry(0.21, 0.25, 0.55, 8), skin, 0, 1.38, 0.05);
  b.add(new THREE.CylinderGeometry(0.23, 0.22, 0.16, 8), 0x5a2a7a, 0, 1.52, 0.05);
  const head = b.group(0, 1.85, 0.05);
  b.add(new THREE.SphereGeometry(0.2, 9, 7), skin, 0, 0.04, 0, head);
  b.add(new THREE.SphereGeometry(0.22, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), 0x1a1a24, 0, 0.06, -0.02, head);
  b.add(new THREE.ConeGeometry(0.2, 0.75, 6), 0x1a1a24, 0, -0.25, -0.15, head).rotation.x = 0.25; // 長髮
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.035, 5, 4), eye, sx * 0.07, 0.07, 0.17, head);
    const horn = b.add(new THREE.ConeGeometry(0.04, 0.32, 5), 0x2a1a2a, sx * 0.13, 0.24, -0.02, head);
    horn.rotation.z = -sx * 0.5;
    horn.rotation.x = -0.3;
  }
  if (b.boss) b.glow(new THREE.TorusGeometry(0.23, 0.02, 4, 12), 0xc86aff, 0, 0.18, 0, head).rotation.x = Math.PI / 2;
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.28, 1.6, 0.05);
    b.add(new THREE.CylinderGeometry(0.055, 0.065, 0.58, 6), skin, 0, -0.27, 0, p);
    b.add(new THREE.ConeGeometry(0.05, 0.14, 4), b.dark, 0, -0.6, 0.02, p).rotation.x = Math.PI;
    arms.push(p);
  }
  return {
    height: 2.1,
    animate: ({ t, moving, winding, body }) => {
      tails.forEach((segs, k) => {
        segs.forEach((s, i) => {
          if (i > 0 && i < segs.length - 1) s.rotation.y = Math.sin(t * (moving ? 6 : 2) - i * 0.9 + k * 2) * 0.35;
        });
        const head = segs[segs.length - 1];
        head.rotation.x = winding ? -0.6 : Math.sin(t * 2.5 + k) * 0.2;
      });
      arms[0].rotation.z = winding ? -1.4 : -0.2 + Math.sin(t * 2) * 0.06;
      arms[1].rotation.z = winding ? 1.4 : 0.2 - Math.sin(t * 2) * 0.06;
      arms[0].rotation.x = winding ? -0.7 : 0;
      arms[1].rotation.x = winding ? -0.7 : 0;
      head.rotation.x = winding ? -0.2 : Math.sin(t * 1.2) * 0.05;
      body.rotation.y = moving ? Math.sin(t * 6) * 0.1 : 0;
      body.position.y = Math.sin(t * 1.8) * 0.03;
    },
  };
};

export const kampe: ShapeBuild = (b) => {
  const c = b.color; // 龍鱗（黑紅）
  const skin = 0xb8a8a0;
  const ember = 0xff6a2a;
  // 龍身四足
  const torso = b.add(new THREE.SphereGeometry(0.55, 10, 7), c, 0, 0.85, -0.25);
  torso.scale.set(0.9, 0.8, 1.5);
  b.add(new THREE.BoxGeometry(0.55, 0.12, 1.2), b.light, 0, 0.5, -0.25);
  const legs = fourLegs(b, b.dark, 0x1a1414, 0.38, 0.25, -0.75, 0.6, 0.6, 0.13);
  for (const lg of legs) for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.03, 0.12, 4), 0xe8e0d0, (k - 1) * 0.06, -0.58, 0.1, lg).rotation.x = 1.4;
  // 腰間一圈獸首（獅、狼、熊、野豬…用顏色區分）
  const beastCols = [0xc89a4a, 0x6a6a72, 0x5a3a22, 0x8a6a5a, 0xa87a3a, 0x4a4a52, 0x7a4a2a, 0x9a8a6a];
  const beasts: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = b.group(Math.sin(a) * 0.5, 1.15, 0.25 + Math.cos(a) * 0.4);
    p.rotation.y = a;
    b.add(new THREE.BoxGeometry(0.17, 0.15, 0.2), beastCols[i], 0, 0, 0.1, p);
    b.add(new THREE.BoxGeometry(0.1, 0.08, 0.12), beastCols[i], 0, -0.03, 0.24, p);
    b.glow(new THREE.SphereGeometry(0.022, 4, 3), ember, 0.05, 0.04, 0.2, p);
    b.glow(new THREE.SphereGeometry(0.022, 4, 3), ember, -0.05, 0.04, 0.2, p);
    beasts.push(p);
  }
  // 人身（從龍身前方升起）
  const upper = b.group(0, 1.15, 0.25);
  b.add(new THREE.CylinderGeometry(0.24, 0.3, 0.7, 8), skin, 0, 0.35, 0, upper);
  b.add(new THREE.CylinderGeometry(0.26, 0.25, 0.14, 8), 0x2a1a1a, 0, 0.6, 0, upper);
  const head = b.group(0, 0.95, 0.02, upper);
  b.add(new THREE.SphereGeometry(0.21, 9, 7), skin, 0, 0.03, 0, head);
  // 蛇髮（毒蛇是她的頭髮）
  const hairs: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const p = b.group(Math.cos(a) * 0.15, 0.14, Math.sin(a) * 0.15 - 0.03, head);
    p.rotation.set(Math.sin(a) * -0.9, 0, Math.cos(a) * -0.9);
    b.add(new THREE.CylinderGeometry(0.022, 0.035, 0.32, 5), 0x2a3a2a, 0, 0.16, 0, p);
    b.add(new THREE.SphereGeometry(0.045, 5, 4), 0x2a3a2a, 0, 0.33, 0.02, p).scale.set(1, 0.8, 1.4);
    hairs.push(p);
  }
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.04, 5, 4), b.boss ? 0xff3a1a : ember, sx * 0.08, 0.06, 0.18, head);
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.32, 0.6, 0, upper);
    b.add(new THREE.CylinderGeometry(0.06, 0.075, 0.6, 6), skin, 0, -0.28, 0, p);
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.02, 0.12, 4), 0x2a1a1a, (k - 1) * 0.04, -0.62, 0.02, p).rotation.x = Math.PI;
    arms.push(p);
  }
  // 黑翼
  const wings = [wing(b, -1, -0.35, 1.25, -0.4, 0x2a1a24, 0x5a1a1a, 1.4), wing(b, 1, 0.35, 1.25, -0.4, 0x2a1a24, 0x5a1a1a, 1.4)];
  // 蠍尾：從背後往上彎到頭頂
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = b.body;
  for (let i = 0; i < 6; i++) {
    const p = b.group(0, i === 0 ? 0.9 : 0.26, i === 0 ? -1.0 : 0, parent);
    p.rotation.x = i === 0 ? -0.9 : -0.42;
    b.add(new THREE.SphereGeometry(0.17 - i * 0.015, 7, 5), c, 0, 0.13, 0, p).scale.set(1, 1.3, 1);
    tail.push(p);
    parent = p;
  }
  const sting = b.group(0, 0.28, 0, parent);
  b.add(new THREE.SphereGeometry(0.14, 7, 5), c, 0, 0.05, 0, sting);
  b.glow(new THREE.ConeGeometry(0.06, 0.32, 5), 0xb8ff4a, 0, 0.0, 0.2, sting).rotation.x = Math.PI / 2;
  if (b.boss) for (let i = 0; i < 5; i++) b.glow(new THREE.ConeGeometry(0.07, 0.24, 4), i % 2 ? 0xff9a3c : 0xff3a1a, 0, 1.18, -0.05 - i * 0.2);
  return {
    height: 2.6,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 8) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      beasts.forEach((p, i) => {
        p.rotation.x = winding ? -0.4 : Math.sin(t * 3 + i * 1.3) * 0.2;
      });
      hairs.forEach((h, i) => {
        h.rotation.y = Math.sin(t * 4 + i * 1.3) * 0.5;
      });
      const open = winding ? 1.2 : 0.3 + Math.sin(t * 1.6) * 0.1;
      wings[0].rotation.z = open;
      wings[1].rotation.z = -open;
      tail.forEach((p, i) => {
        if (i > 0) p.rotation.x = -0.42 + (winding ? -0.12 : Math.sin(t * 2 + i * 0.6) * 0.05);
      });
      sting.rotation.x = winding ? -0.8 : 0;
      arms[0].rotation.z = winding ? -1.3 : -0.2;
      arms[1].rotation.z = winding ? 1.3 : 0.2;
      arms[0].rotation.x = winding ? -0.8 : Math.sin(t * 2) * 0.1;
      arms[1].rotation.x = winding ? -0.8 : -Math.sin(t * 2) * 0.1;
      upper.rotation.x = winding ? -0.15 : 0;
      body.position.y = moving ? Math.abs(Math.sin(t * 8)) * 0.05 : 0;
      body.rotation.x = lean * 0.25;
    },
  };
};
