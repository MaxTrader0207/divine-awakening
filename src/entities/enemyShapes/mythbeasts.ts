import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';
import { fourLegs, neck, snakeHead } from './beasts';
import { featherWing } from './guardians';

/**
 * 神獸討伐（v1.86）的 10 隻魔王造型：
 *  orthrus      雙頭犬俄耳托斯（暗）：兩顆頭、蛇尾、背上冥火
 *  mare         狄俄墨得斯的食人馬（雷）：黑馬、雷光鬃毛、獠牙、斷掉的鐵鍊
 *  cacus        吐火巨人卡庫斯（火）：駝背巨人、口中火光、熔岩紋、石棒
 *  amphisbaena  雙頭蛇安菲斯拜納（毒）：身體兩端各一顆頭、背上小翼
 *  charybdis    漩渦海怪卡律布狄斯（水）：旋轉的水渦、朝上張開的巨口與一圈利齒
 *  caucasus     高加索巨鷹（風）：黑銅色巨鷹、紅眼、彎鉤巨喙、爪上斷鏈
 *  colchis      科爾基斯不眠巨龍（光）：盤繞的長龍、金鱗、背上掛著金羊毛
 *  antaeus      大地之子安泰俄斯（土）：摔角巨人、岩甲、腳下大地綠光
 *  enceladus    巨人恩刻拉多斯（金）：重甲上身＋兩條蛇尾（巨人族的蛇足）
 *  typhon       萬怪之王堤豐（暗）：肩上長出一圈龍頭、蛇身下半、黑翼、渾身冥火
 * 會動的零件都掛在 b.group() 底下（mergeTree / skinTree 才能合併成少數網格）。
 */

/** 巨人上半身（卡庫斯、安泰俄斯、恩刻拉多斯共用）：回傳頭、手臂 pivot */
function giantTop(
  b: ShapeBuilder,
  o: { skin: number; y: number; w: number; chest: number; belt?: number; armor?: number; headR?: number },
): { head: THREE.Group; arms: THREE.Group[]; chest: THREE.Group } {
  const { skin, y, w } = o;
  const chest = b.group(0, y, 0);
  const torso = b.add(new THREE.SphereGeometry(o.chest, 12, 9), o.armor ?? skin, 0, 0.35, 0, chest);
  torso.scale.set(1.25, 1.1, 0.85);
  b.add(new THREE.SphereGeometry(o.chest * 0.8, 10, 8), skin, 0, -0.15, 0.04, chest).scale.set(1.1, 0.9, 0.85); // 腹
  if (o.belt) b.add(new THREE.CylinderGeometry(o.chest * 0.95, o.chest * 0.9, 0.22, 10), o.belt, 0, -0.42, 0, chest);
  const head = b.group(0, 0.35 + o.chest * 1.15, 0.05, chest);
  const hr = o.headR ?? 0.3;
  b.add(new THREE.SphereGeometry(hr, 10, 8), skin, 0, 0.1, 0, head);
  b.add(new THREE.BoxGeometry(hr * 1.1, hr * 0.35, hr * 0.8), skin, 0, -0.08, 0.12, head); // 下顎
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * w, 0.62, 0, chest);
    b.add(new THREE.SphereGeometry(o.chest * 0.42, 9, 7), o.armor ?? skin, 0, 0, 0, p); // 肩
    b.add(new THREE.CylinderGeometry(0.16, 0.19, 0.62, 8), skin, 0, -0.34, 0, p);
    b.add(new THREE.CylinderGeometry(0.15, 0.16, 0.55, 8), skin, 0, -0.85, 0.05, p);
    b.add(new THREE.SphereGeometry(0.19, 8, 6), skin, 0, -1.16, 0.08, p); // 拳
    arms.push(p);
  }
  return { head, arms, chest };
}

/* ---------------- 1. 雙頭犬俄耳托斯 ---------------- */
export const orthrus: ShapeBuild = (b) => {
  const c = b.color;
  const torso = b.add(new THREE.SphereGeometry(0.45, 12, 9), c, 0, 0.8, -0.05);
  torso.scale.set(0.9, 0.82, 1.6);
  b.add(new THREE.SphereGeometry(0.4, 10, 8), c, 0, 0.95, 0.42).scale.set(1.05, 1, 0.9); // 寬胸
  // 項圈尖刺
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.05, 0.18, 4), 0x8a8a92, Math.cos(a) * 0.36, 1.12, 0.56 + Math.sin(a) * 0.12).rotation.z = -Math.cos(a) * 1.3;
  }
  const heads: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const h = b.group(sx * 0.26, 1.15, 0.66);
    h.rotation.y = sx * 0.35;
    b.add(new THREE.CylinderGeometry(0.14, 0.19, 0.34, 8), c, 0, -0.05, -0.06, h).rotation.x = 0.6;
    b.add(new THREE.SphereGeometry(0.23, 10, 8), c, 0, 0.1, 0.08, h).scale.set(1, 0.9, 1.15);
    b.add(new THREE.BoxGeometry(0.19, 0.15, 0.3), b.dark, 0, 0.03, 0.32, h); // 口鼻
    b.add(new THREE.BoxGeometry(0.07, 0.05, 0.05), 0x111111, 0, 0.1, 0.48, h);
    const jaw = b.group(0, -0.05, 0.22, h);
    b.add(new THREE.BoxGeometry(0.16, 0.06, 0.24), b.dark, 0, 0, 0.08, jaw);
    for (const ex of [-1, 1]) {
      b.add(new THREE.ConeGeometry(0.08, 0.24, 4), b.dark, ex * 0.13, 0.32, 0.02, h).rotation.z = -ex * 0.35;
      b.glow(new THREE.SphereGeometry(0.04, 6, 4), 0xb48cff, ex * 0.1, 0.16, 0.26, h);
      b.add(new THREE.ConeGeometry(0.025, 0.09, 4), 0xf4f1e8, ex * 0.05, -0.04, 0.44, h).rotation.x = Math.PI;
    }
    heads.push(h, jaw);
  }
  const legs = fourLegs(b, b.dark, 0x1b1a1d, 0.22, 0.44, -0.52, 0.6, 0.6, 0.1);
  // 蛇尾
  const tail = b.group(0, 0.9, -0.75);
  let seg: THREE.Object3D = tail;
  for (let i = 0; i < 4; i++) {
    b.add(new THREE.CylinderGeometry(0.06 - i * 0.008, 0.075 - i * 0.008, 0.26, 7), 0x3a5a3a, 0, 0.12, 0, seg);
    const nx = b.group(0, 0.24, 0, seg);
    nx.rotation.x = -0.35;
    seg = nx;
  }
  b.add(new THREE.SphereGeometry(0.08, 7, 5), 0x3a5a3a, 0, 0.04, 0.02, seg).scale.set(1, 0.8, 1.4);
  b.glow(new THREE.SphereGeometry(0.02, 4, 3), 0xd8ff6a, 0, 0.07, 0.08, seg);
  // 背上冥火
  for (let i = 0; i < 5; i++) b.glow(new THREE.ConeGeometry(0.1 - i * 0.01, 0.38, 5), i % 2 ? 0x8a4aff : 0xd8c0ff, 0, 1.2, 0.25 - i * 0.2);
  return {
    height: 1.6,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 12) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 兩顆頭：平常輪流張望，出手前一起低頭、張嘴
      heads[0].rotation.x = winding ? -0.4 : Math.sin(t * 2.1) * 0.15;
      heads[2].rotation.x = winding ? -0.4 : Math.sin(t * 2.1 + 2) * 0.15;
      heads[1].rotation.x = winding ? 0.5 : 0.08 + Math.max(0, Math.sin(t * 3)) * 0.1;
      heads[3].rotation.x = winding ? 0.5 : 0.08 + Math.max(0, Math.sin(t * 3 + 1.5)) * 0.1;
      tail.rotation.z = Math.sin(t * (moving ? 10 : 4)) * 0.45;
      tail.rotation.x = -0.3 + Math.sin(t * 2) * 0.15;
      body.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.06 : 0;
      body.rotation.x = lean * 0.4;
    },
  };
};

/* ---------------- 2. 狄俄墨得斯的食人馬 ---------------- */
export const mare: ShapeBuild = (b) => {
  const c = b.color; // 黑馬
  const mane = 0xffe27a;
  const torso = b.add(new THREE.SphereGeometry(0.48, 12, 9), c, 0, 1.0, -0.05);
  torso.scale.set(0.85, 0.82, 1.6);
  b.add(new THREE.SphereGeometry(0.38, 10, 8), c, 0, 1.06, 0.45).scale.set(0.92, 1, 0.85);
  b.add(new THREE.SphereGeometry(0.38, 10, 8), c, 0, 1.02, -0.52).scale.set(0.95, 0.95, 0.9);
  for (const sx of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.2, 8, 6), c, sx * 0.21, 0.86, -0.56).scale.set(0.8, 1.3, 1.1);
    // 斷掉的鐵鍊（掛在胸前兩側）
    for (let i = 0; i < 3; i++) b.add(new THREE.TorusGeometry(0.06, 0.018, 4, 8), 0x7a7a82, sx * 0.3, 0.98 - i * 0.1, 0.55).rotation.y = i % 2 ? Math.PI / 2 : 0;
  }
  const legs = fourLegs(b, b.dark, 0x2a2a30, 0.21, 0.46, -0.58, 0.84, 0.82, 0.1);
  const neckG = b.group(0, 1.2, 0.58);
  b.add(new THREE.CylinderGeometry(0.14, 0.22, 0.74, 10), c, 0, 0.27, 0.17, neckG).rotation.x = 0.58;
  for (let i = 0; i < 7; i++) b.glow(new THREE.ConeGeometry(0.06, 0.26, 4), mane, 0, 0.1 + i * 0.08, -0.08 + i * 0.055, neckG).rotation.x = -1.2;
  const head = b.group(0, 0.6, 0.42, neckG);
  b.add(new THREE.BoxGeometry(0.24, 0.25, 0.34), c, 0, 0, 0, head).rotation.x = 0.35;
  b.add(new THREE.BoxGeometry(0.19, 0.12, 0.28), c, 0, -0.06, 0.24, head).rotation.x = 0.45;
  const jaw = b.group(0, -0.15, 0.12, head);
  b.add(new THREE.BoxGeometry(0.17, 0.06, 0.26), b.dark, 0, 0, 0.12, jaw).rotation.x = 0.4;
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.035, 5, 4), 0xff3a2a, sx * 0.12, 0.06, 0.06, head);
    b.add(new THREE.ConeGeometry(0.045, 0.15, 4), c, sx * 0.08, 0.2, -0.08, head).rotation.z = -sx * 0.25;
    // 食人的獠牙
    b.add(new THREE.ConeGeometry(0.022, 0.1, 4), 0xf4f1e8, sx * 0.05, -0.15, 0.32, head).rotation.x = Math.PI;
  }
  const tail = b.group(0, 1.12, -0.86);
  for (let i = 0; i < 3; i++) b.glow(new THREE.ConeGeometry(0.075 - i * 0.012, 0.66, 5), mane, (i - 1) * 0.05, -0.24, -0.14, tail).rotation.x = -2.6 + i * 0.12;
  // 蹄下雷光
  for (const l of legs) b.glow(new THREE.OctahedronGeometry(0.07), 0xfff4b0, 0, -0.8, 0.08, l);
  return {
    height: 2.1,
    animate: ({ t, moving, winding, lean, strike, body }) => {
      const sw = moving ? Math.sin(t * 11) * 0.65 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      const rear = winding ? 1 : strike;
      if (rear > 0) {
        legs[0].rotation.x = -1.15 * rear + Math.sin(t * 18) * 0.3 * rear;
        legs[1].rotation.x = -0.95 * rear - Math.sin(t * 18) * 0.3 * rear;
      }
      body.rotation.x = -0.35 * rear + lean * 0.2;
      neckG.rotation.x = winding ? -0.4 : Math.sin(t * 1.6) * 0.1;
      jaw.rotation.x = winding ? 0.5 : Math.max(0, Math.sin(t * 2.4)) * 0.15;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.25;
      tail.rotation.x = Math.sin(t * 5) * 0.3;
      tail.rotation.y = Math.sin(t * 3) * 0.35;
      body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.09 : 0;
    },
  };
};

/* ---------------- 3. 吐火巨人卡庫斯 ---------------- */
export const cacus: ShapeBuild = (b) => {
  const skin = b.color; // 暗紅皮膚
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.32, 1.0, 0);
    b.add(new THREE.CylinderGeometry(0.2, 0.23, 0.58, 8), skin, 0, -0.28, 0, p);
    b.add(new THREE.CylinderGeometry(0.16, 0.19, 0.42, 8), skin, 0, -0.74, 0, p);
    b.add(new THREE.BoxGeometry(0.28, 0.12, 0.38), 0x3a2418, 0, -0.95, 0.06, p);
    legs.push(p);
  }
  b.add(new THREE.CylinderGeometry(0.5, 0.44, 0.34, 10), 0x4a3424, 0, 1.06, 0); // 獸皮腰布
  const g = giantTop(b, { skin, y: 1.25, w: 0.72, chest: 0.55, headR: 0.32 });
  g.chest.rotation.x = 0.25; // 駝背
  // 熔岩紋（發光裂縫）
  for (let i = 0; i < 6; i++) b.glow(new THREE.BoxGeometry(0.05, 0.3, 0.02), 0xff7a2a, -0.3 + i * 0.12, 0.2 + (i % 2) * 0.15, 0.48, g.chest).rotation.z = (i % 2 ? 0.5 : -0.4);
  // 臉：粗眉、獨角、口中火光
  b.add(new THREE.BoxGeometry(0.36, 0.06, 0.1), b.dark, 0, 0.24, 0.27, g.head);
  b.add(new THREE.ConeGeometry(0.07, 0.3, 5), 0x2a1a14, 0, 0.45, 0.02, g.head);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.05, 6, 4), 0xffb04a, sx * 0.12, 0.14, 0.27, g.head);
  const mouth = b.group(0, -0.04, 0.3, g.head);
  b.glow(new THREE.SphereGeometry(0.09, 7, 5), 0xff5a1a, 0, 0, 0, mouth).scale.set(1.3, 0.6, 0.6);
  // 口中噴出的火（出手前變大）
  const flame = b.group(0, -0.04, 0.4, g.head);
  for (let i = 0; i < 3; i++) b.glow(new THREE.ConeGeometry(0.1 - i * 0.025, 0.5 - i * 0.1, 6), i === 0 ? 0xff5a1a : i === 1 ? 0xffa83a : 0xffe08a, 0, 0, 0.2, flame).rotation.x = Math.PI / 2;
  // 石棒（右手）
  const club = b.group(0, -1.15, 0.1, g.arms[1]);
  b.add(new THREE.CylinderGeometry(0.2, 0.08, 1.4, 7), 0x5a4a3a, 0, 0.5, 0, club);
  b.add(new THREE.DodecahedronGeometry(0.3, 0), 0x6a5a4a, 0, 1.2, 0, club);
  club.rotation.x = 1.25;
  return {
    height: 2.9,
    animate: ({ t, moving, winding, strike, body }) => {
      const sw = moving ? Math.sin(t * 5.5) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      g.arms[0].rotation.x = winding ? -1.2 : -sw * 0.5;
      g.arms[1].rotation.x = winding ? -2.6 : -0.15 + sw * 0.4 - strike * 0.6;
      g.head.rotation.x = winding ? -0.35 : Math.sin(t * 0.8) * 0.06;
      const f = winding ? 1.6 + Math.sin(t * 30) * 0.2 : 0.35 + Math.sin(t * 9) * 0.1;
      flame.scale.set(f, f, f);
      body.position.y = moving ? Math.abs(Math.sin(t * 5.5)) * 0.07 : 0;
      body.rotation.z = moving ? Math.sin(t * 5.5) * 0.04 : 0;
    },
  };
};

/* ---------------- 4. 雙頭蛇安菲斯拜納 ---------------- */
export const amphisbaena: ShapeBuild = (b) => {
  const c = b.color;
  const belly = 0xd8e08a;
  // 身體：一段弧形，兩端各一顆頭（前、後）
  const segs: THREE.Group[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5; // -0.5 ~ 0.5
    const p = b.group(Math.sin(u * Math.PI) * 0.6, 0.32, u * 2.6);
    const r = 0.26 - Math.abs(u) * 0.12;
    b.add(new THREE.SphereGeometry(r, 9, 7), c, 0, 0, 0, p).scale.set(1, 0.85, 1.25);
    b.add(new THREE.SphereGeometry(r * 0.75, 8, 6), belly, 0, -r * 0.35, 0, p).scale.set(1, 0.6, 1.2);
    if (i % 2 === 0) b.add(new THREE.ConeGeometry(0.05, 0.16, 4), b.dark, 0, r * 0.95, 0, p); // 背刺
    segs.push(p);
  }
  // 兩顆頭：前面朝 +z、後面朝 -z
  const front = b.group(0, 0.5, 1.45);
  const back = b.group(0, 0.5, -1.45);
  back.rotation.y = Math.PI;
  const necks = [front, back].map((g) => {
    const nk = b.group(0, -0.15, -0.15, g);
    nk.rotation.x = -0.6;
    const top = neck(b, nk, 2, 0.45, 0.18, 0.14, c);
    const head = b.group(0, 0.05, 0, top);
    head.rotation.x = 0.7;
    const jaw = snakeHead(b, head, 1.25, c, belly, 0xd8ff4a);
    return { nk, head, jaw };
  });
  // 背上一對小蝠翼
  const wings: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const w = b.group(sx * 0.2, 0.55, 0.1);
    const mem = b.add(new THREE.ConeGeometry(0.35, 0.7, 3), 0x6a8a3a, sx * 0.4, 0, -0.1, w);
    mem.rotation.z = sx * Math.PI / 2;
    mem.scale.set(1, 1, 0.12);
    wings.push(w);
  }
  return {
    height: 1.2,
    animate: ({ t, moving, winding, body }) => {
      // 身體像波浪一樣扭動
      segs.forEach((s, i) => {
        s.position.x = Math.sin((i / (n - 1) - 0.5) * Math.PI) * 0.6 + Math.sin(t * (moving ? 7 : 2.5) + i * 0.8) * 0.12;
        s.position.y = 0.32 + Math.max(0, Math.sin(t * 3 + i)) * 0.03;
      });
      necks.forEach((nk, i) => {
        nk.nk.rotation.x = winding ? -0.95 : -0.6 + Math.sin(t * 1.7 + i * 2) * 0.12;
        nk.head.rotation.y = winding ? 0 : Math.sin(t * 1.3 + i * 1.7) * 0.4;
        nk.jaw.rotation.x = winding ? 0.55 : Math.max(0, Math.sin(t * 2.2 + i)) * 0.18;
      });
      const flap = winding ? 0.9 : 0.25 + Math.sin(t * 6) * 0.25;
      wings[0].rotation.z = flap;
      wings[1].rotation.z = -flap;
      body.position.y = 0;
    },
  };
};

/* ---------------- 5. 漩渦海怪卡律布狄斯 ---------------- */
export const charybdis: ShapeBuild = (b) => {
  const water = 0x3a8ac8;
  const foam = 0xbfe8ff;
  // 水渦：幾圈往上收的環，各自旋轉
  const rings: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const g = b.group(0, 0.15 + i * 0.32, 0);
    const r = 1.55 - i * 0.28;
    const ring = b.add(new THREE.TorusGeometry(r, 0.16 - i * 0.02, 6, 18), i % 2 ? water : 0x2a6aa8, 0, 0, 0, g);
    ring.rotation.x = Math.PI / 2;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      b.add(new THREE.ConeGeometry(0.08, 0.3, 4), foam, Math.cos(a) * r, 0.12, Math.sin(a) * r, g).rotation.z = Math.PI / 2;
    }
    rings.push(g);
  }
  // 本體：從水渦中央升起的巨口（略朝前）
  const maw = b.group(0, 1.15, 0.15);
  maw.rotation.x = -0.5;
  b.add(new THREE.CylinderGeometry(0.75, 0.95, 0.9, 14, 1, true), 0x5a3a4a, 0, 0, 0, maw);
  b.add(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 14), 0x2a0a1a, 0, 0.42, 0, maw); // 喉嚨深處
  b.glow(new THREE.SphereGeometry(0.22, 8, 6), 0x7ad8ff, 0, 0.3, 0, maw).scale.set(1, 0.3, 1); // 深處的光
  const teeth = b.group(0, 0.46, 0, maw);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const tooth = b.add(new THREE.ConeGeometry(0.07, 0.3, 4), 0xf4f1e8, Math.cos(a) * 0.68, 0.08, Math.sin(a) * 0.68, teeth);
    tooth.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
  }
  // 外圈第二排牙
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3;
    const tooth = b.add(new THREE.ConeGeometry(0.06, 0.24, 4), 0xe0d8c0, Math.cos(a) * 0.5, 0.0, Math.sin(a) * 0.5, teeth);
    tooth.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
  }
  // 觸鬚：從水裡伸出幾條
  const arms: THREE.Group[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const p = b.group(Math.cos(a) * 1.0, 0.3, Math.sin(a) * 1.0);
    p.rotation.y = -a;
    let cur: THREE.Object3D = p;
    for (let i = 0; i < 4; i++) {
      b.add(new THREE.CylinderGeometry(0.07 - i * 0.012, 0.1 - i * 0.012, 0.32, 6), 0x5a3a4a, 0, 0.15, 0, cur);
      const nx = b.group(0, 0.3, 0, cur);
      nx.rotation.z = 0.3;
      cur = nx;
    }
    arms.push(p);
  }
  // 眼睛：巨口邊緣一圈小眼
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.45;
    b.glow(new THREE.SphereGeometry(0.06, 6, 4), 0xffe27a, Math.cos(a) * 0.95, 0.2, Math.sin(a) * 0.95 + 0.1, maw);
  }
  return {
    height: 2.0,
    animate: ({ t, winding, strike, body }) => {
      rings.forEach((r, i) => (r.rotation.y = t * (1.2 + i * 0.5) * (winding ? 2.2 : 1)));
      teeth.rotation.y = -t * 0.6;
      const open = winding ? 1.25 : 1 + Math.sin(t * 2) * 0.06;
      teeth.scale.set(open, 1, open);
      maw.rotation.x = winding ? -0.15 : -0.5 + Math.sin(t * 1.1) * 0.08 + strike * 0.3;
      maw.position.y = 1.15 + Math.sin(t * 1.4) * 0.08 + (winding ? 0.25 : 0);
      arms.forEach((a, i) => {
        a.rotation.z = Math.sin(t * 2.4 + i * 1.6) * 0.4 + (winding ? -0.5 : 0);
      });
      body.position.y = 0;
    },
  };
};

/* ---------------- 6. 高加索巨鷹 ---------------- */
export const caucasus: ShapeBuild = (b) => {
  const c = b.color; // 黑銅色
  const torso = b.add(new THREE.SphereGeometry(0.42, 12, 9), c, 0, 1.25, 0);
  torso.scale.set(0.85, 1, 1.35);
  b.add(new THREE.SphereGeometry(0.33, 10, 8), 0x8a6a4a, 0, 1.18, 0.3).scale.set(0.9, 1.05, 0.8); // 胸羽
  const head = b.group(0, 1.62, 0.42);
  b.add(new THREE.SphereGeometry(0.23, 10, 8), 0xd8d0c0, 0, 0, 0, head); // 淺色頭
  b.add(new THREE.ConeGeometry(0.1, 0.32, 6), 0xd8a830, 0, -0.05, 0.27, head).rotation.x = Math.PI / 2 + 0.5; // 彎鉤喙
  b.add(new THREE.ConeGeometry(0.05, 0.14, 5), 0xb8882a, 0, -0.16, 0.36, head).rotation.x = Math.PI;
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.045, 6, 4), 0xff2a1a, sx * 0.13, 0.06, 0.15, head);
    b.add(new THREE.BoxGeometry(0.14, 0.04, 0.08), 0x5a4a3a, sx * 0.11, 0.13, 0.13, head).rotation.z = sx * 0.4; // 怒眉
  }
  const wings = [featherWing(b, -1, -0.22, 1.42, 0.05, c, 0x2a2018, 1.55), featherWing(b, 1, 0.22, 1.42, 0.05, c, 0x2a2018, 1.55)];
  // 尾羽
  const tail = b.group(0, 1.15, -0.5);
  for (let i = 0; i < 5; i++) {
    const f = b.add(new THREE.BoxGeometry(0.12, 0.03, 0.6), c, (i - 2) * 0.09, 0, -0.3, tail);
    f.rotation.y = (i - 2) * 0.18;
  }
  // 腳爪＋斷鏈（普羅米修斯的鎖鏈）
  const talons: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.18, 0.95, 0.1);
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.45, 6), 0xd8a830, 0, -0.22, 0, p);
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.035, 0.2, 4), 0x1a1a1a, (k - 1) * 0.06, -0.5, 0.08, p).rotation.x = 1.9;
    for (let k = 0; k < 3; k++) b.add(new THREE.TorusGeometry(0.06, 0.018, 4, 8), 0x8a8a92, 0, -0.55 - k * 0.1, -0.05, p).rotation.y = k % 2 ? Math.PI / 2 : 0;
    talons.push(p);
  }
  return {
    height: 2.2,
    animate: ({ t, moving, winding, strike, body }) => {
      const flap = winding ? 1.25 : moving ? 0.5 + Math.sin(t * 7) * 0.55 : 0.35 + Math.sin(t * 3) * 0.35;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.35;
      head.rotation.x = winding ? 0.35 : 0;
      for (const p of talons) p.rotation.x = winding ? -0.9 : -0.2 + strike * -0.6;
      tail.rotation.x = Math.sin(t * 2) * 0.12;
      body.position.y = 0.5 + Math.sin(t * (moving ? 7 : 3)) * 0.12;
      body.rotation.x = winding ? -0.25 : moving ? 0.2 : 0;
    },
  };
};

/* ---------------- 7. 科爾基斯不眠巨龍 ---------------- */
export const colchis: ShapeBuild = (b) => {
  const c = b.color; // 墨綠
  const gold = 0xffd36b;
  // 盤起來的身體（兩圈），尾巴往後
  const coil = b.group(0, 0, -0.2);
  for (let i = 0; i < 18; i++) {
    const u = i / 17;
    const a = u * Math.PI * 3.2;
    const r = 1.15 - u * 0.45;
    const s = b.add(new THREE.SphereGeometry(0.34 - u * 0.1, 9, 7), c, Math.cos(a) * r, 0.3 + u * 0.65, Math.sin(a) * r * 0.8, coil);
    s.scale.set(1.15, 0.85, 1.15);
    if (i % 2 === 0) b.add(new THREE.ConeGeometry(0.06, 0.2, 4), gold, Math.cos(a) * r, 0.62 + u * 0.6, Math.sin(a) * r * 0.8, coil);
  }
  // 抬起的頸與頭
  const nk = b.group(0, 1.1, 0.35);
  nk.rotation.x = 0.35;
  const top = neck(b, nk, 4, 1.15, 0.28, 0.18, c);
  for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(0.06, 0.22, 4), gold, 0, 0.3 + i * 0.28, -0.22, nk).rotation.x = -0.6;
  const head = b.group(0, 0.05, 0, top);
  head.rotation.x = 0.85;
  const skull = b.add(new THREE.BoxGeometry(0.38, 0.3, 0.5), c, 0, 0, 0.15, head);
  skull.rotation.x = 0.1;
  b.add(new THREE.BoxGeometry(0.3, 0.16, 0.36), c, 0, -0.04, 0.5, head);
  const jaw = b.group(0, -0.14, 0.25, head);
  b.add(new THREE.BoxGeometry(0.28, 0.08, 0.5), b.dark, 0, 0, 0.18, jaw);
  for (const sx of [-1, 1]) {
    // 永不閉上的金色眼睛
    b.glow(new THREE.SphereGeometry(0.06, 7, 5), 0xfff0a8, sx * 0.17, 0.08, 0.28, head);
    const horn = b.add(new THREE.ConeGeometry(0.06, 0.45, 5), gold, sx * 0.13, 0.22, -0.08, head);
    horn.rotation.set(-1.0, 0, -sx * 0.25);
    const frill = b.add(new THREE.ConeGeometry(0.16, 0.42, 3), 0x3a8a6a, sx * 0.24, 0.02, -0.02, head);
    frill.rotation.set(-1.2, 0, sx * 1.1);
    frill.scale.set(1, 1, 0.2);
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.025, 0.1, 4), 0xf4f1e8, sx * 0.09, -0.11, 0.42 + k * 0.08, head).rotation.x = Math.PI;
  }
  // 背上的金羊毛
  const fleece = b.group(0, 1.15, -0.55);
  for (let k = 0; k < 6; k++) b.add(new THREE.SphereGeometry(0.17, 7, 5), gold, Math.cos(k) * 0.2, Math.sin(k * 1.7) * 0.08, Math.sin(k) * 0.16, fleece);
  b.glow(new THREE.OctahedronGeometry(0.09), 0xfff6c8, 0, 0.22, 0, fleece);
  const tail = b.group(0.6, 0.25, -1.05);
  let seg: THREE.Object3D = tail;
  for (let i = 0; i < 4; i++) {
    b.add(new THREE.CylinderGeometry(0.1 - i * 0.02, 0.13 - i * 0.02, 0.4, 7), c, 0, 0, 0.2, seg).rotation.x = Math.PI / 2;
    const nx = b.group(0, 0, 0.38, seg);
    nx.rotation.y = 0.35;
    seg = nx;
  }
  tail.rotation.y = Math.PI * 0.75;
  return {
    height: 2.6,
    animate: ({ t, moving, winding, body }) => {
      nk.rotation.x = winding ? 0.05 : 0.35 + Math.sin(t * 1.2) * 0.08;
      nk.rotation.y = winding ? 0 : Math.sin(t * 0.7) * 0.25;
      jaw.rotation.x = winding ? 0.6 : Math.max(0, Math.sin(t * 1.8)) * 0.12;
      coil.rotation.y = Math.sin(t * (moving ? 3 : 0.8)) * 0.08;
      tail.rotation.z = Math.sin(t * 2.2) * 0.25;
      fleece.rotation.y = t * 0.6;
      body.position.y = 0;
    },
  };
};

/* ---------------- 8. 大地之子安泰俄斯 ---------------- */
export const antaeus: ShapeBuild = (b) => {
  const skin = b.color;
  const rock = 0x7a6a58;
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.34, 1.0, 0);
    b.add(new THREE.CylinderGeometry(0.22, 0.25, 0.58, 8), skin, 0, -0.28, 0, p);
    b.add(new THREE.CylinderGeometry(0.18, 0.21, 0.42, 8), skin, 0, -0.74, 0, p);
    b.add(new THREE.DodecahedronGeometry(0.22, 0), rock, 0, -0.9, 0.04, p).scale.set(1.2, 0.6, 1.4); // 岩靴
    b.glow(new THREE.TorusGeometry(0.22, 0.03, 4, 12), 0x8aff6a, 0, -0.98, 0.04, p).rotation.x = Math.PI / 2; // 大地之力
    legs.push(p);
  }
  b.add(new THREE.CylinderGeometry(0.48, 0.42, 0.3, 10), 0x5a7a3a, 0, 1.05, 0); // 草葉腰帶
  const g = giantTop(b, { skin, y: 1.25, w: 0.8, chest: 0.6, belt: 0x6a4a2a, headR: 0.3 });
  // 岩甲（肩、胸）
  for (const sx of [-1, 1]) b.add(new THREE.DodecahedronGeometry(0.28, 0), rock, sx * 0.55, 0.85, 0, g.chest).scale.set(1.2, 0.8, 1.1);
  b.add(new THREE.DodecahedronGeometry(0.22, 0), rock, -0.2, 0.55, 0.45, g.chest);
  // 臉：鬍子、髮帶
  b.add(new THREE.SphereGeometry(0.2, 8, 6), 0x3a2a1a, 0, -0.08, 0.17, g.head).scale.set(1.1, 1, 0.6);
  b.add(new THREE.TorusGeometry(0.3, 0.04, 4, 14), 0xb8a060, 0, 0.18, 0, g.head).rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.04, 6, 4), 0x8aff6a, sx * 0.11, 0.12, 0.27, g.head);
  // 雙手的岩拳
  for (const a of g.arms) b.add(new THREE.DodecahedronGeometry(0.24, 0), rock, 0, -1.16, 0.08, a);
  return {
    height: 3.0,
    animate: ({ t, moving, winding, strike, body }) => {
      const sw = moving ? Math.sin(t * 5.5) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      // 摔角架式：雙手張開，出手前高舉
      const up = winding ? 1 : strike;
      g.arms[0].rotation.set(-0.4 - up * 2.0 - sw * 0.3, 0, 0.35 - up * 0.2);
      g.arms[1].rotation.set(-0.4 - up * 2.0 + sw * 0.3, 0, -0.35 + up * 0.2);
      g.chest.rotation.x = 0.15 + (winding ? -0.15 : 0);
      g.head.rotation.y = Math.sin(t * 0.8) * 0.2;
      body.position.y = moving ? Math.abs(Math.sin(t * 5.5)) * 0.08 : Math.sin(t * 2) * 0.02;
    },
  };
};

/* ---------------- 9. 巨人恩刻拉多斯 ---------------- */
export const enceladus: ShapeBuild = (b) => {
  const skin = 0xc8a080;
  const armor = b.color; // 青銅甲
  // 兩條蛇尾當腳
  const tails: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.3, 1.0, 0);
    let cur: THREE.Object3D = p;
    for (let i = 0; i < 5; i++) {
      b.add(new THREE.SphereGeometry(0.22 - i * 0.025, 9, 7), 0x4a6a4a, 0, -0.18, 0, cur).scale.set(1, 1.3, 1);
      const nx = b.group(0, -0.24, 0, cur);
      nx.rotation.x = i < 2 ? 0.1 : -0.45;
      nx.rotation.z = sx * 0.25;
      cur = nx;
    }
    const jaw = snakeHead(b, cur, 0.9, 0x4a6a4a, 0xc8d88a, 0xff5a2a);
    void jaw;
    tails.push(p);
  }
  b.add(new THREE.CylinderGeometry(0.5, 0.45, 0.3, 10), 0x6a3a2a, 0, 1.05, 0); // 戰裙
  const g = giantTop(b, { skin, y: 1.25, w: 0.78, chest: 0.58, armor, headR: 0.3 });
  // 頭盔（科林斯式）＋羽冠
  b.add(new THREE.SphereGeometry(0.34, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), armor, 0, 0.12, 0, g.head);
  b.add(new THREE.BoxGeometry(0.06, 0.24, 0.12), armor, 0, 0.0, 0.3, g.head); // 護鼻
  const crest = b.group(0, 0.42, -0.05, g.head);
  for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(0.06, 0.2, 0.12), 0xc83a2a, 0, 0.05 - Math.abs(i - 2.5) * 0.03, 0.25 - i * 0.1, crest);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.035, 6, 4), 0xffd84a, sx * 0.1, 0.1, 0.28, g.head);
  // 右手巨石、左手盾
  const boulder = b.group(0, -1.25, 0.12, g.arms[1]);
  b.add(new THREE.DodecahedronGeometry(0.42, 0), 0x8a7a6a, 0, 0, 0, boulder);
  b.glow(new THREE.BoxGeometry(0.04, 0.4, 0.02), 0xff7a2a, 0.2, 0, 0.32, boulder).rotation.z = 0.5; // 埃特納的火紋
  const shield = b.group(0, -0.8, 0.25, g.arms[0]);
  b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 14), armor, 0, 0, 0, shield).rotation.x = Math.PI / 2;
  b.add(new THREE.CylinderGeometry(0.18, 0.18, 0.09, 10), 0xffd36b, 0, 0, 0.02, shield).rotation.x = Math.PI / 2;
  return {
    height: 3.1,
    animate: ({ t, moving, winding, strike, body }) => {
      tails.forEach((p, i) => {
        p.rotation.x = Math.sin(t * (moving ? 6 : 1.6) + i * Math.PI) * (moving ? 0.35 : 0.08);
        p.rotation.z = (i ? -1 : 1) * (0.05 + Math.sin(t * 2 + i) * 0.04);
      });
      g.arms[1].rotation.x = winding ? -2.8 : -0.25 - strike * 0.8;
      g.arms[0].rotation.x = winding ? -1.1 : -0.6;
      boulder.rotation.y = t * 0.4;
      crest.rotation.z = Math.sin(t * 2) * 0.05;
      g.head.rotation.y = Math.sin(t * 0.7) * 0.18;
      body.position.y = Math.sin(t * 1.6) * 0.05;
    },
  };
};

/* ---------------- 10. 萬怪之王堤豐 ---------------- */
export const typhon: ShapeBuild = (b) => {
  const skin = b.color; // 暗紫灰
  const scale = 0x3a2a4a;
  // 下半身：兩大圈蛇身
  const coils = b.group(0, 0, 0);
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const a = u * Math.PI * 2.4;
    const r = 1.2 - u * 0.4;
    b.add(new THREE.SphereGeometry(0.4 - u * 0.12, 10, 8), scale, Math.cos(a) * r, 0.35 + u * 0.45, Math.sin(a) * r * 0.85, coils).scale.set(1.15, 0.85, 1.15);
  }
  const g = giantTop(b, { skin, y: 1.45, w: 0.85, chest: 0.62, belt: 0x2a1a2a, headR: 0.34 });
  // 頭：角、燃燒的眼睛、火焰鬃髮
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.08, 0.5, 5), 0x2a1a14, sx * 0.2, 0.36, -0.02, g.head);
    horn.rotation.set(-0.5, 0, -sx * 0.5);
    b.glow(new THREE.SphereGeometry(0.06, 6, 4), 0xff4a1a, sx * 0.12, 0.13, 0.28, g.head);
  }
  for (let i = 0; i < 5; i++) b.glow(new THREE.ConeGeometry(0.08, 0.35, 5), i % 2 ? 0xb48cff : 0xff6a2a, (i - 2) * 0.11, 0.42, -0.15, g.head).rotation.x = -0.5;
  // 肩上一圈龍頭（神話裡是一百顆）
  const heads: { p: THREE.Group; jaw: THREE.Group }[] = [];
  const angs = [-1.25, -0.75, -0.25, 0.25, 0.75, 1.25];
  for (let i = 0; i < angs.length; i++) {
    const a = angs[i];
    const p = b.group(Math.sin(a) * 0.62, 0.9, -0.1 + Math.cos(a) * 0.1, g.chest);
    p.rotation.set(-0.3, 0, -Math.sin(a) * 0.9);
    const top = neck(b, p, 2, 0.55, 0.13, 0.1, i % 2 ? 0x4a3a5a : 0x5a2a3a);
    const hd = b.group(0, 0.04, 0, top);
    hd.rotation.x = 0.9;
    const jaw = snakeHead(b, hd, 0.9, i % 2 ? 0x4a3a5a : 0x5a2a3a, 0xc8a8ff, i % 2 ? 0xb48cff : 0xff7a2a);
    heads.push({ p, jaw });
  }
  // 黑翼
  const wings: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const w = b.group(sx * 0.35, 0.75, -0.35, g.chest);
    for (let k = 0; k < 4; k++) {
      const bone = b.add(new THREE.CylinderGeometry(0.03, 0.05, 1.3 - k * 0.15, 5), 0x1a1a22, sx * (0.45 + k * 0.1), 0.2 - k * 0.12, -k * 0.12, w);
      bone.rotation.z = sx * (1.2 - k * 0.25);
    }
    const mem = b.add(new THREE.ConeGeometry(0.7, 1.4, 3), 0x2a1a3a, sx * 0.75, -0.05, -0.18, w);
    mem.rotation.z = sx * Math.PI / 2;
    mem.scale.set(1, 1, 0.08);
    wings.push(w);
  }
  // 胸口的冥火核心
  b.glow(new THREE.OctahedronGeometry(0.16), 0xff4a1a, 0, 0.4, 0.55, g.chest);
  return {
    height: 3.6,
    animate: ({ t, moving, winding, strike, body }) => {
      coils.rotation.y = Math.sin(t * (moving ? 3 : 0.7)) * 0.1;
      const up = winding ? 1 : strike;
      g.arms[0].rotation.x = -0.3 - up * 2.2;
      g.arms[1].rotation.x = -0.3 - up * 2.2;
      g.arms[0].rotation.z = 0.25 + up * 0.3;
      g.arms[1].rotation.z = -0.25 - up * 0.3;
      heads.forEach((h, i) => {
        h.p.rotation.x = -0.3 + (winding ? -0.5 : Math.sin(t * 1.9 + i * 1.3) * 0.25);
        h.jaw.rotation.x = winding ? 0.6 : Math.max(0, Math.sin(t * 2.6 + i)) * 0.25;
      });
      const flap = winding ? 0.7 : 0.2 + Math.sin(t * 2.2) * 0.2;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
      g.head.rotation.y = Math.sin(t * 0.6) * 0.2;
      body.position.y = Math.sin(t * 1.3) * 0.05;
    },
  };
};
