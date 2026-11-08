import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';
import { fourLegs } from './beasts';
import { featherWing } from './guardians';
import { giantTop } from './mythbeasts';

/**
 * 第 23～30 層（v1.97）的 8 隻首領造型：
 *  lamia        蛇身女王拉彌亞（毒）：盤繞的蛇尾、女王上身、金冠、長髮、利爪
 *  khalkotauros 科爾基斯青銅火牛（火）：青銅牛身、胸口熔爐、鼻孔噴火、鉚釘甲片
 *  vulpes       透墨索斯天狐（風）：細長狐身、大耳、三條風之尾
 *  empusa       銅足夜魔恩普莎（暗）：火焰長髮、一隻銅腿一隻驢腿、破爛長袍、浮在半空
 *  ophiotaurus  牛蛇俄菲奧陶洛斯（水）：前半公牛、後半長長的蛇尾、身上發光的冥河紋
 *  stymphalian  斯廷法利斯銅羽鳥王（金）：青銅巨鳥、刀刃般的銅羽、長頸彎喙
 *  aloadae      阿洛伊代雙子巨人（土）：兩個巨人上身連在一起，各扛一座山岩
 *  kronos       泰坦之王克洛諾斯（冰）：長鬍子的泰坦、王冠、巨大鐮刀、背後旋轉的時之輪
 * 會動的零件都掛在 b.group() 底下（mergeTree / skinTree 才能合併成少數網格）。
 */

/** 一條往後垂的分節長尾（蛇尾）：回傳每節 pivot，動畫時逐節擺動 */
function segTail(b: ShapeBuilder, parent: THREE.Object3D, n: number, r0: number, len: number, color: number, bend: number): THREE.Group[] {
  const segs: THREE.Group[] = [];
  let cur: THREE.Object3D = parent;
  for (let i = 0; i < n; i++) {
    const r = r0 * (1 - (i / n) * 0.75);
    const g = b.group(0, 0, 0, cur);
    b.add(new THREE.SphereGeometry(r, 9, 7), color, 0, 0, -len / 2, g).scale.set(1, 0.85, 1.5);
    const nx = b.group(0, 0, -len, g);
    nx.rotation.x = bend;
    segs.push(g);
    cur = nx;
  }
  return segs;
}

/* ---------------- 23. 蛇身女王拉彌亞 ---------------- */
export const lamia: ShapeBuild = (b) => {
  const scale = b.color; // 蛇鱗
  const skin = 0xd8b8a0;
  const gold = 0xf4c64e;
  // 盤起來的蛇身（兩圈）＋往後拖的尾巴
  b.add(new THREE.TorusGeometry(0.55, 0.24, 8, 18), scale, 0, 0.24, -0.1).rotation.x = Math.PI / 2;
  b.add(new THREE.TorusGeometry(0.38, 0.2, 8, 14), scale, 0, 0.55, -0.05).rotation.x = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.2, 0.28, 0.6, 10), scale, 0, 0.9, 0); // 腰
  const tailRoot = b.group(0.1, 0.22, -0.6);
  const tail = segTail(b, tailRoot, 6, 0.2, 0.3, scale, 0.06);
  b.add(new THREE.ConeGeometry(0.04, 0.3, 5), b.dark, 0, 0, -0.15, tail[5]).rotation.x = -Math.PI / 2;
  // 女王上身
  const top = b.group(0, 1.15, 0);
  b.add(new THREE.SphereGeometry(0.28, 12, 9), skin, 0, 0.18, 0, top).scale.set(1.15, 1.1, 0.8);
  b.add(new THREE.SphereGeometry(0.3, 12, 9), 0x5a2a4a, 0, 0.12, 0.02, top).scale.set(1.12, 0.55, 0.85); // 胸甲布
  b.add(new THREE.TorusGeometry(0.2, 0.03, 5, 14), gold, 0, 0.45, 0.02, top).rotation.x = Math.PI / 2.4; // 項鍊
  const head = b.group(0, 0.62, 0.02, top);
  b.add(new THREE.SphereGeometry(0.2, 12, 9), skin, 0, 0.05, 0, head).scale.set(0.95, 1.08, 1);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.035, 6, 4), 0xb8ff4a, sx * 0.075, 0.07, 0.17, head);
  // 金冠
  b.add(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 10), gold, 0, 0.21, 0, head);
  for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(0.03, 0.12, 4), gold, (i - 2) * 0.07, 0.3, 0.1 - Math.abs(i - 2) * 0.03, head);
  // 長髮（往後垂）
  const hair = b.group(0, 0.15, -0.08, head);
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 3) * 0.9;
    b.add(new THREE.ConeGeometry(0.06, 0.6, 5), 0x1a1214, Math.sin(a) * 0.15, -0.3, -Math.cos(a) * 0.08, hair).rotation.x = Math.PI + 0.25;
  }
  // 手臂（利爪）
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.33, 0.36, 0, top);
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 8), skin, 0, -0.2, 0, p);
    b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.38, 8), skin, 0, -0.55, 0.06, p);
    b.add(new THREE.TorusGeometry(0.07, 0.02, 4, 10), gold, 0, -0.42, 0.04, p).rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.018, 0.14, 4), 0x2a1a1a, (k - 1) * 0.035, -0.8, 0.1, p).rotation.x = Math.PI - 0.4;
    arms.push(p);
  }
  return {
    height: 2.1,
    animate: ({ t, moving, winding, strike, body }) => {
      tail.forEach((s, i) => (s.rotation.y = Math.sin(t * (moving ? 6 : 2.2) - i * 0.7) * 0.3));
      const up = winding ? 1 : strike;
      arms[0].rotation.set(-0.3 - up * 1.6, 0, -0.35 - Math.sin(t * 2) * 0.1);
      arms[1].rotation.set(-0.3 - up * 1.6, 0, 0.35 + Math.sin(t * 2) * 0.1);
      top.rotation.x = winding ? -0.25 : Math.sin(t * 1.6) * 0.05;
      top.rotation.z = Math.sin(t * 1.3) * 0.08;
      hair.rotation.x = Math.sin(t * 1.8) * 0.08;
      body.position.y = Math.sin(t * 2) * 0.03;
    },
  };
};

/* ---------------- 24. 科爾基斯青銅火牛 ---------------- */
export const khalkotauros: ShapeBuild = (b) => {
  const bronze = b.color;
  const fire = 0xff7a1a;
  const torso = b.add(new THREE.BoxGeometry(0.85, 0.7, 1.45), bronze, 0, 0.95, 0);
  torso.scale.set(1, 1, 1);
  b.add(new THREE.SphereGeometry(0.5, 10, 8), bronze, 0, 1.12, 0.45).scale.set(1, 0.9, 0.8); // 肩峰
  // 胸口熔爐（格柵＋火光）
  b.glow(new THREE.CircleGeometry(0.24, 14), fire, 0, 0.82, 0.88);
  for (let i = 0; i < 4; i++) b.add(new THREE.BoxGeometry(0.05, 0.46, 0.05), b.dark, (i - 1.5) * 0.11, 0.82, 0.9);
  b.add(new THREE.TorusGeometry(0.25, 0.04, 5, 16), b.dark, 0, 0.82, 0.89);
  // 鉚釘甲片
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) b.add(new THREE.SphereGeometry(0.04, 5, 4), 0xe8c070, sx * 0.44, 1.12, 0.45 - i * 0.32);
  for (let i = 0; i < 5; i++) b.add(new THREE.BoxGeometry(0.9, 0.04, 0.06), b.dark, 0, 1.31, 0.5 - i * 0.28);
  const legs = fourLegs(b, bronze, 0x2a2420, 0.28, 0.5, -0.5, 0.65, 0.65, 0.13);
  const head = b.group(0, 1.1, 0.78);
  b.add(new THREE.BoxGeometry(0.46, 0.44, 0.5), bronze, 0, -0.05, 0.25, head);
  b.add(new THREE.BoxGeometry(0.38, 0.26, 0.2), b.dark, 0, -0.18, 0.54, head);
  const flames: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.08, 0.6, 6), 0xd8c8a0, sx * 0.38, 0.22, 0.15, head);
    horn.rotation.set(0.3, 0, sx * -1.15);
    b.glow(new THREE.SphereGeometry(0.05, 6, 4), 0xffd84a, sx * 0.14, 0.06, 0.5, head);
    // 鼻孔噴火
    const f = b.glow(new THREE.ConeGeometry(0.06, 0.35, 6), fire, sx * 0.08, -0.22, 0.78, head);
    f.rotation.x = Math.PI / 2;
    flames.push(f);
  }
  // 背上的排煙管
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.35, 8), b.dark, sx * 0.22, 1.45, -0.35);
    b.glow(new THREE.SphereGeometry(0.06, 6, 4), fire, sx * 0.22, 1.64, -0.35);
  }
  const tail = b.group(0, 1.15, -0.75);
  b.add(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 5), bronze, 0, -0.3, 0, tail);
  b.glow(new THREE.ConeGeometry(0.07, 0.18, 5), fire, 0, -0.62, 0, tail).rotation.x = Math.PI;
  return {
    height: 1.8,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 10) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      head.rotation.x = winding ? 0.45 : Math.sin(t * 1.5) * 0.06;
      const f = winding ? 1.8 : 0.8 + Math.sin(t * 20) * 0.15;
      for (const m of flames) m.scale.set(1, f, 1);
      tail.rotation.z = Math.sin(t * 3) * 0.4;
      body.rotation.x = lean * 0.4;
      body.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
    },
  };
};

/* ---------------- 25. 透墨索斯天狐 ---------------- */
export const vulpes: ShapeBuild = (b) => {
  const fur = b.color;
  const pale = 0xfff2e0;
  const wind = 0x9af0ff;
  const torso = b.add(new THREE.SphereGeometry(0.42, 12, 9), fur, 0, 0.74, -0.05);
  torso.scale.set(0.8, 0.75, 1.65);
  b.add(new THREE.SphereGeometry(0.3, 10, 8), pale, 0, 0.72, 0.42).scale.set(0.85, 0.95, 0.8); // 胸毛
  const legs = fourLegs(b, fur, 0x2a1a14, 0.18, 0.42, -0.5, 0.56, 0.56, 0.09);
  const head = b.group(0, 0.98, 0.6);
  b.add(new THREE.SphereGeometry(0.22, 10, 8), fur, 0, 0.02, 0, head).scale.set(1, 0.9, 1.05);
  b.add(new THREE.ConeGeometry(0.13, 0.36, 8), fur, 0, -0.04, 0.27, head).rotation.x = Math.PI / 2; // 尖吻
  b.add(new THREE.ConeGeometry(0.1, 0.2, 8), pale, 0, -0.09, 0.24, head).rotation.x = Math.PI / 2;
  b.add(new THREE.SphereGeometry(0.03, 6, 4), 0x111111, 0, -0.03, 0.45, head);
  for (const sx of [-1, 1]) {
    const ear = b.add(new THREE.ConeGeometry(0.09, 0.3, 4), fur, sx * 0.12, 0.25, -0.02, head);
    ear.rotation.z = -sx * 0.25;
    b.add(new THREE.ConeGeometry(0.05, 0.18, 4), pale, sx * 0.12, 0.23, 0.02, head).rotation.z = -sx * 0.25;
    b.glow(new THREE.SphereGeometry(0.035, 6, 4), wind, sx * 0.09, 0.07, 0.16, head);
  }
  // 三條風之尾（尾巴末端發光）
  const tails: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const p = b.group((i - 1) * 0.12, 0.85, -0.6);
    p.rotation.set(-0.6, (i - 1) * 0.45, 0);
    b.add(new THREE.SphereGeometry(0.17, 9, 7), fur, 0, 0, -0.35, p).scale.set(1, 1, 2.2);
    b.add(new THREE.SphereGeometry(0.13, 8, 6), pale, 0, 0, -0.72, p).scale.set(1, 1, 1.4);
    b.glow(new THREE.ConeGeometry(0.08, 0.3, 6), wind, 0, 0, -0.9, p).rotation.x = -Math.PI / 2;
    tails.push(p);
  }
  // 身上的風紋
  for (let i = 0; i < 3; i++) b.glow(new THREE.TorusGeometry(0.44 - i * 0.04, 0.012, 4, 20, Math.PI), wind, 0, 0.74, 0.2 - i * 0.3).rotation.y = Math.PI / 2;
  return {
    height: 1.5,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 14) * 0.7 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      tails.forEach((p, i) => {
        p.rotation.y = (i - 1) * 0.45 + Math.sin(t * (moving ? 9 : 3) + i) * 0.3;
        p.rotation.x = -0.6 + (winding ? 0.5 : Math.sin(t * 2 + i) * 0.1);
      });
      head.rotation.x = winding ? 0.3 : Math.sin(t * 1.7) * 0.08;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.25;
      body.rotation.x = lean * 0.5;
      body.position.y = moving ? Math.abs(Math.sin(t * 14)) * 0.07 : 0;
    },
  };
};

/* ---------------- 26. 銅足夜魔恩普莎 ---------------- */
export const empusa: ShapeBuild = (b) => {
  const robe = b.color;
  const skin = 0xb8a8b8;
  const flame = 0xff5ad8;
  const bronze = 0xc89a4a;
  const float = b.group(0, 0, 0);
  // 腿：一隻青銅腿、一隻驢腿
  const legs: THREE.Group[] = [];
  {
    const p = b.group(-0.18, 0.95, 0, float);
    b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 8), bronze, 0, -0.22, 0, p);
    b.add(new THREE.CylinderGeometry(0.06, 0.08, 0.42, 8), bronze, 0, -0.62, 0, p);
    b.add(new THREE.BoxGeometry(0.15, 0.08, 0.26), bronze, 0, -0.85, 0.06, p);
    b.add(new THREE.SphereGeometry(0.07, 6, 5), 0xe8c070, 0, -0.42, 0.05, p); // 銅膝
    legs.push(p);
  }
  {
    const p = b.group(0.18, 0.95, 0, float);
    b.add(new THREE.CylinderGeometry(0.07, 0.11, 0.45, 8), 0x5a4a44, 0, -0.22, 0, p);
    b.add(new THREE.CylinderGeometry(0.05, 0.06, 0.45, 8), 0x5a4a44, 0, -0.64, -0.06, p);
    b.add(new THREE.CylinderGeometry(0.07, 0.06, 0.08, 8), 0x1a1414, 0, -0.88, -0.05, p); // 蹄
    legs.push(p);
  }
  // 破爛長袍（下擺一圈尖角）
  b.add(new THREE.CylinderGeometry(0.28, 0.45, 0.75, 12, 1, true), robe, 0, 0.92, 0, float);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.08, 0.3, 4), robe, Math.cos(a) * 0.42, 0.45, Math.sin(a) * 0.42, float).rotation.x = Math.PI;
  }
  const top = b.group(0, 1.3, 0, float);
  b.add(new THREE.SphereGeometry(0.25, 12, 9), robe, 0, 0.1, 0, top).scale.set(1.15, 1.05, 0.8);
  b.add(new THREE.SphereGeometry(0.09, 8, 6), skin, 0, 0.36, 0.02, top); // 脖子
  const head = b.group(0, 0.55, 0.02, top);
  b.add(new THREE.SphereGeometry(0.18, 12, 9), skin, 0, 0, 0, head).scale.set(0.9, 1.1, 0.95);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.035, 6, 4), 0xff3a8a, sx * 0.065, 0.03, 0.15, head);
  b.add(new THREE.BoxGeometry(0.1, 0.02, 0.02), 0x3a0a1a, 0, -0.08, 0.16, head); // 嘴
  // 火焰長髮
  const hair = b.group(0, 0.1, -0.03, head);
  for (let i = 0; i < 9; i++) {
    const a = ((i - 4) / 4) * 1.3;
    const c = b.glow(new THREE.ConeGeometry(0.06, 0.45 + (i % 3) * 0.1, 5), i % 2 ? flame : 0xffb0f0, Math.sin(a) * 0.15, 0.18, -Math.cos(a) * 0.1, hair);
    c.rotation.set(-0.5 - Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.5);
  }
  // 手（長爪）
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.3, 0.28, 0, top);
    b.add(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 8), robe, 0, -0.25, 0, p); // 袖
    b.add(new THREE.CylinderGeometry(0.035, 0.045, 0.32, 6), skin, 0, -0.6, 0.04, p);
    for (let k = 0; k < 4; k++) b.add(new THREE.ConeGeometry(0.015, 0.2, 4), 0x1a0a14, (k - 1.5) * 0.03, -0.85, 0.06, p).rotation.x = Math.PI - 0.3;
    arms.push(p);
  }
  // 黑卡蒂的冥火（手邊）
  const orb = b.group(0, 0, 0, arms[1]);
  b.glow(new THREE.SphereGeometry(0.1, 8, 6), flame, 0, -0.95, 0.12, orb);
  return {
    height: 2.0,
    animate: ({ t, moving, winding, strike, body }) => {
      float.position.y = 0.25 + Math.sin(t * 2.2) * 0.1;
      legs[0].rotation.x = moving ? Math.sin(t * 7) * 0.4 : 0.15;
      legs[1].rotation.x = moving ? -Math.sin(t * 7) * 0.4 : -0.1;
      const up = winding ? 1 : strike;
      arms[0].rotation.set(-0.5 - up * 1.8, 0, -0.45 - Math.sin(t * 2.5) * 0.15);
      arms[1].rotation.set(-0.5 - up * 1.8, 0, 0.45 + Math.sin(t * 2.5) * 0.15);
      hair.rotation.x = Math.sin(t * 6) * 0.08;
      hair.scale.y = 1 + Math.sin(t * 9) * 0.08 + (winding ? 0.25 : 0);
      top.rotation.x = winding ? -0.2 : Math.sin(t * 1.4) * 0.06;
      head.rotation.y = Math.sin(t * 0.8) * 0.3;
      body.rotation.z = Math.sin(t * 1.1) * 0.04;
    },
  };
};

/* ---------------- 27. 牛蛇俄菲奧陶洛斯 ---------------- */
export const ophiotaurus: ShapeBuild = (b) => {
  const c = b.color;
  const rune = 0x6ae0ff;
  // 前半：公牛胸腹與兩隻前腳
  const torso = b.add(new THREE.SphereGeometry(0.5, 12, 9), c, 0, 1.0, 0.3);
  torso.scale.set(0.95, 0.9, 1.15);
  b.add(new THREE.SphereGeometry(0.45, 10, 8), c, 0, 1.25, 0.45).scale.set(1, 0.8, 0.8); // 肩峰
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.3, 0.85, 0.55);
    b.add(new THREE.CylinderGeometry(0.11, 0.14, 0.5, 8), c, 0, -0.25, 0, p);
    b.add(new THREE.CylinderGeometry(0.09, 0.11, 0.35, 8), c, 0, -0.62, 0.02, p);
    b.add(new THREE.CylinderGeometry(0.11, 0.1, 0.1, 8), 0x1a2228, 0, -0.82, 0.02, p);
    legs.push(p);
  }
  // 後半：從腰部開始的長蛇尾（貼地往後蜿蜒）
  const root = b.group(0, 0.7, -0.15);
  root.rotation.x = -0.2;
  const tail = segTail(b, root, 8, 0.36, 0.42, c, 0.03);
  b.add(new THREE.ConeGeometry(0.08, 0.35, 6), b.dark, 0, 0, -0.2, tail[7]).rotation.x = -Math.PI / 2;
  // 冥河紋（沿蛇尾發光）
  tail.forEach((s, i) => {
    if (i % 2 === 0) b.glow(new THREE.TorusGeometry(0.3 - i * 0.02, 0.015, 4, 14), rune, 0, 0, -0.21, s);
  });
  // 鰭（蛇背）
  tail.forEach((s, i) => {
    if (i < 6) b.add(new THREE.ConeGeometry(0.06, 0.24, 3), b.light, 0, 0.26 - i * 0.025, -0.2, s).rotation.x = -0.4;
  });
  // 牛頭
  const head = b.group(0, 1.25, 0.9);
  b.add(new THREE.BoxGeometry(0.44, 0.42, 0.48), c, 0, -0.05, 0.22, head);
  b.add(new THREE.BoxGeometry(0.36, 0.26, 0.2), b.dark, 0, -0.18, 0.5, head);
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.07, 0.6, 6), 0xe8f4f4, sx * 0.36, 0.2, 0.12, head);
    horn.rotation.set(0.5, 0, sx * -1.0);
    b.glow(new THREE.SphereGeometry(0.05, 6, 4), rune, sx * 0.14, 0.05, 0.47, head);
  }
  b.glow(new THREE.TorusGeometry(0.07, 0.016, 4, 10), rune, 0, -0.28, 0.6, head); // 鼻環
  return {
    height: 1.9,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 9) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      tail.forEach((s, i) => (s.rotation.y = Math.sin(t * (moving ? 7 : 2.5) - i * 0.65) * 0.28));
      head.rotation.x = winding ? 0.45 : Math.sin(t * 1.4) * 0.06;
      body.rotation.x = lean * 0.4;
      body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : 0;
    },
  };
};

/* ---------------- 28. 斯廷法利斯銅羽鳥王 ---------------- */
export const stymphalian: ShapeBuild = (b) => {
  const bronze = b.color;
  const blade = 0xf0d890;
  const body0 = b.group(0, 0, 0);
  const torso = b.add(new THREE.SphereGeometry(0.45, 12, 9), bronze, 0, 1.25, 0, body0);
  torso.scale.set(0.95, 0.9, 1.35);
  // 胸前的刀羽
  for (let i = 0; i < 6; i++) b.add(new THREE.ConeGeometry(0.06, 0.32, 3), blade, (i % 3 - 1) * 0.16, 1.05 - Math.floor(i / 3) * 0.16, 0.45, body0).rotation.x = 2.6;
  // 長頸與頭
  const neckG = b.group(0, 1.45, 0.45, body0);
  b.add(new THREE.CylinderGeometry(0.09, 0.15, 0.55, 8), bronze, 0, 0.22, 0.08, neckG).rotation.x = 0.4;
  const head = b.group(0, 0.5, 0.18, neckG);
  b.add(new THREE.SphereGeometry(0.15, 10, 8), bronze, 0, 0, 0, head).scale.set(0.9, 0.9, 1.2);
  const beak = b.add(new THREE.ConeGeometry(0.07, 0.42, 6), 0x3a2a1a, 0, -0.04, 0.3, head);
  beak.rotation.x = Math.PI / 2 + 0.25;
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.03, 6, 4), 0xff3a2a, sx * 0.09, 0.04, 0.1, head);
  for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(0.03, 0.22, 3), blade, 0, 0.12, -0.05 - i * 0.06, head).rotation.x = -0.9 - i * 0.12; // 冠羽
  // 銅羽翅膀
  const wings = [featherWing(b, -1, -0.32, 1.38, 0, bronze, blade, 1.5), featherWing(b, 1, 0.32, 1.38, 0, bronze, blade, 1.5)];
  for (const w of wings) body0.add(w);
  // 尾羽
  const tail = b.group(0, 1.2, -0.55, body0);
  for (let i = 0; i < 5; i++) {
    const f = b.add(new THREE.BoxGeometry(0.1, 0.03, 0.75), bronze, (i - 2) * 0.09, 0, -0.35, tail);
    f.rotation.y = (i - 2) * 0.18;
    b.add(new THREE.ConeGeometry(0.05, 0.15, 3), blade, (i - 2) * 0.16, 0, -0.75, tail).rotation.x = -Math.PI / 2;
  }
  // 腳爪
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.2, 0.95, 0.05, body0);
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), 0x3a2a1a, 0, -0.3, 0, p);
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.025, 0.18, 4), 0x3a2a1a, (k - 1) * 0.06, -0.62, 0.08, p).rotation.x = Math.PI / 2;
    legs.push(p);
  }
  return {
    height: 2.1,
    animate: ({ t, moving, winding, strike, body }) => {
      const flap = Math.sin(t * (moving ? 9 : 4.5)) * 0.55;
      const spread = winding ? -0.9 : 0;
      wings[0].rotation.z = flap + spread;
      wings[1].rotation.z = -flap - spread;
      body0.position.y = 0.35 + Math.sin(t * (moving ? 9 : 4.5) + 1.2) * 0.1;
      neckG.rotation.x = winding ? -0.5 : strike * 0.8 + Math.sin(t * 1.8) * 0.08;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.4;
      tail.rotation.x = Math.sin(t * 2.2) * 0.12;
      legs[0].rotation.x = 0.5;
      legs[1].rotation.x = 0.5;
      body.rotation.x = 0;
    },
  };
};

/* ---------------- 29. 阿洛伊代雙子巨人 ---------------- */
export const aloadae: ShapeBuild = (b) => {
  const skin = 0xc89a78;
  const armor = b.color;
  const rock = 0x7a7064;
  // 兩雙腿（左邊俄托斯、右邊厄菲阿爾忒斯）
  const legs: THREE.Group[] = [];
  for (const x of [-0.95, -0.45, 0.45, 0.95]) {
    const p = b.group(x, 1.0, 0);
    b.add(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 8), skin, 0, -0.27, 0, p);
    b.add(new THREE.CylinderGeometry(0.14, 0.17, 0.42, 8), armor, 0, -0.72, 0, p); // 脛甲
    b.add(new THREE.BoxGeometry(0.24, 0.1, 0.34), 0x4a3a2a, 0, -0.95, 0.05, p);
    legs.push(p);
  }
  // 腰間連在一起的大戰裙（雙子同心）
  b.add(new THREE.BoxGeometry(2.1, 0.32, 0.6), 0x6a4a2a, 0, 1.05, 0);
  const twins: ReturnType<typeof giantTop>[] = [];
  for (const sx of [-1, 1]) {
    const g = giantTop(b, { skin, y: 1.25, w: 0.55, chest: 0.42, armor, belt: 0x4a3a2a, headR: 0.24 });
    g.chest.position.x = sx * 0.7;
    g.chest.rotation.y = -sx * 0.18;
    b.add(new THREE.SphereGeometry(0.17, 8, 6), 0x3a2a1a, 0, -0.08, 0.13, g.head).scale.set(1.1, 1, 0.6); // 鬍子
    b.add(new THREE.ConeGeometry(0.26, 0.24, 8), armor, 0, 0.3, 0, g.head); // 尖盔
    for (const ex of [-1, 1]) b.glow(new THREE.SphereGeometry(0.03, 6, 4), 0xffd36b, ex * 0.09, 0.1, 0.22, g.head);
    twins.push(g);
  }
  // 外側的手各扛一塊山岩、內側的手各拿長矛
  b.add(new THREE.DodecahedronGeometry(0.45, 0), rock, 0, -1.25, 0.1, twins[0].arms[0]).scale.set(1.2, 0.9, 1);
  b.add(new THREE.DodecahedronGeometry(0.45, 0), rock, 0, -1.25, 0.1, twins[1].arms[1]).scale.set(1, 0.9, 1.2);
  for (const [g, a] of [[twins[0], 1], [twins[1], 0]] as const) {
    const sp = b.add(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), 0x5a4030, 0, -1.1, 0.1, g.arms[a]);
    sp.rotation.x = Math.PI / 2;
    b.add(new THREE.ConeGeometry(0.08, 0.32, 5), 0xd8d8e0, 0, -1.1, 1.35, g.arms[a]).rotation.x = Math.PI / 2;
  }
  return {
    height: 3.0,
    animate: ({ t, moving, winding, strike, body }) => {
      const sw = moving ? Math.sin(t * 5) * 0.45 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      legs[3].rotation.x = sw;
      const up = winding ? 1 : strike;
      // 扛岩的手往上舉、長矛往前刺
      const lift = winding ? -3.0 : -2.75 + strike * 1.3;
      twins[0].arms[0].rotation.set(lift, 0, -0.35);
      twins[1].arms[1].rotation.set(lift, 0, 0.35);
      twins[0].arms[1].rotation.set(-1.2 - up * 0.3 + sw * 0.2, 0, 0);
      twins[1].arms[0].rotation.set(-1.2 - up * 0.3 - sw * 0.2, 0, 0);
      twins[0].head.rotation.y = 0.25 + Math.sin(t * 0.9) * 0.15;
      twins[1].head.rotation.y = -0.25 - Math.sin(t * 0.9 + 1) * 0.15;
      twins[0].chest.rotation.x = winding ? -0.15 : 0.1;
      twins[1].chest.rotation.x = winding ? -0.15 : 0.1;
      body.position.y = moving ? Math.abs(Math.sin(t * 5)) * 0.08 : Math.sin(t * 2) * 0.02;
    },
  };
};

/* ---------------- 30. 泰坦之王克洛諾斯 ---------------- */
export const kronos: ShapeBuild = (b) => {
  const robe = b.color;
  const skin = 0xb8b0b8;
  const gold = 0xe8c86a;
  const ice = 0x9ae8ff;
  // 下半身：長袍（不用腳，像漂在地上滑行）
  b.add(new THREE.CylinderGeometry(0.55, 0.85, 1.15, 14), robe, 0, 0.58, 0);
  b.add(new THREE.TorusGeometry(0.84, 0.05, 5, 20), gold, 0, 0.05, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.05, 1.0, 0.03), b.dark, Math.cos(a) * 0.72, 0.55, Math.sin(a) * 0.72).rotation.set(0, -a, Math.cos(a) * 0.18);
  }
  const g = giantTop(b, { skin, y: 1.3, w: 0.78, chest: 0.55, armor: robe, belt: gold, headR: 0.3 });
  // 長鬍子、王冠、冰藍的眼睛
  for (let i = 0; i < 5; i++) b.add(new THREE.ConeGeometry(0.07, 0.55, 5), 0xe8e8f0, (i - 2) * 0.06, -0.32, 0.22 - Math.abs(i - 2) * 0.03, g.head).rotation.x = Math.PI - 0.15;
  b.add(new THREE.SphereGeometry(0.31, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), 0xd8d8e0, 0, 0.12, -0.03, g.head); // 白髮
  b.add(new THREE.CylinderGeometry(0.28, 0.31, 0.14, 12), gold, 0, 0.32, 0, g.head);
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 3) * 1.2;
    b.add(new THREE.ConeGeometry(0.04, 0.2, 4), gold, Math.sin(a) * 0.29, 0.46, Math.cos(a) * 0.29, g.head);
  }
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.045, 6, 4), ice, sx * 0.11, 0.12, 0.27, g.head);
  // 肩甲
  for (const sx of [-1, 1]) b.add(new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, sx * 0.78, 0.66, 0, g.chest).scale.set(1, 0.7, 1);
  // 右手：巨大的鐮刀（哈耳珀）
  const harpe = b.group(0, -1.15, 0.1, g.arms[1]);
  b.add(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 7), 0x3a2a24, 0, 0.3, 0, harpe);
  const bladeG = b.group(0, 1.55, 0, harpe);
  b.add(new THREE.TorusGeometry(0.75, 0.07, 4, 16, Math.PI * 0.9), 0xc8d8e8, -0.72, 0, 0, bladeG).scale.set(1, 1, 0.4);
  b.glow(new THREE.TorusGeometry(0.75, 0.02, 4, 16, Math.PI * 0.9), ice, -0.72, 0, 0.03, bladeG);
  // 左手：沙漏
  const glass = b.group(0, -1.25, 0.15, g.arms[0]);
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), gold, 0, 0.22, 0, glass);
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), gold, 0, -0.22, 0, glass);
  b.glow(new THREE.ConeGeometry(0.13, 0.2, 8), ice, 0, 0.1, 0, glass).rotation.x = Math.PI;
  b.glow(new THREE.ConeGeometry(0.13, 0.2, 8), ice, 0, -0.1, 0, glass);
  // 背後旋轉的時之輪：外圈＋12 個刻度＋兩根指針
  const wheel = b.group(0, 2.3, -0.55);
  b.glow(new THREE.TorusGeometry(1.15, 0.04, 6, 40), ice, 0, 0, 0, wheel);
  b.add(new THREE.TorusGeometry(1.0, 0.035, 5, 36), gold, 0, 0, 0, wheel);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(0.06, i % 3 ? 0.14 : 0.26, 0.04), gold, Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0, wheel).rotation.z = a + Math.PI / 2;
  }
  const hands = b.group(0, 0, 0.02, wheel);
  b.glow(new THREE.BoxGeometry(0.05, 0.85, 0.02), ice, 0, 0.42, 0, hands);
  const hands2 = b.group(0, 0, 0.03, wheel);
  b.glow(new THREE.BoxGeometry(0.06, 0.6, 0.02), ice, 0, 0.3, 0, hands2);
  return {
    height: 3.2,
    animate: ({ t, moving, winding, strike, body }) => {
      wheel.rotation.z = -t * 0.15;
      hands.rotation.z = -t * (winding ? 6 : 1.2);
      hands2.rotation.z = -t * 0.1;
      const up = winding ? 1 : strike;
      // 鐮刀：平常斜握，出手前高舉
      g.arms[1].rotation.set(-0.6 - up * 1.9, 0, -0.25 + up * 0.15);
      bladeG.rotation.z = Math.PI / 2;
      g.arms[0].rotation.set(-0.9 + Math.sin(t * 1.2) * 0.1, 0, 0.3);
      glass.rotation.z = Math.sin(t * 0.7) * 0.2;
      g.chest.rotation.x = winding ? -0.15 : 0.05;
      g.head.rotation.y = Math.sin(t * 0.6) * 0.2;
      body.position.y = Math.sin(t * 1.6) * 0.04 + (moving ? 0.05 : 0);
      body.rotation.z = moving ? Math.sin(t * 4) * 0.03 : 0;
    },
  };
};

