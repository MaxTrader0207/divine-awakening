import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';
import { fourLegs } from './beasts';

/**
 * 守護者造型（v1.58，支線地圖的守護者；打倒後有機會收服成夥伴，夥伴也用同一個造型）
 *  pegasus 天馬珀伽索斯（白馬、金蹄、雷光鬃毛、大羽翼；平常翅膀慢拍，出手前高舉前蹄、張翼）
 */
/**
 * 天馬的羽翼：pivot 在肩胛，往外展開；長羽一根根往後扇開（俯視也看得出是羽毛，不是木板）。
 * 回傳 pivot（rotation.z 控制上下拍動）。
 */
function featherWing(b: ShapeBuilder, side: number, x: number, y: number, z: number, color: number, tip: number, size: number): THREE.Group {
  const p = b.group(x, y, z);
  // 翼骨（上緣）
  const arm = b.add(new THREE.CylinderGeometry(0.035 * size, 0.05 * size, 0.85 * size, 6), color, side * 0.4 * size, 0.05, 0, p);
  arm.rotation.z = side * Math.PI / 2;
  // 覆羽：靠近身體的一片
  const cov = b.add(new THREE.SphereGeometry(0.3 * size, 8, 5), color, side * 0.36 * size, 0, -0.14 * size, p);
  cov.scale.set(1.35, 0.18, 0.75);
  // 飛羽：從翼骨往後扇開，越外側越長；末端金色
  const n = 7;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const len = (0.42 + u * 0.45) * size;
    const f = b.group(side * (0.12 + u * 0.72) * size, 0, 0, p);
    f.rotation.y = -side * (0.1 + u * 0.6);
    const quill = b.add(new THREE.BoxGeometry(0.11 * size, 0.025, len), color, 0, -0.01 * i, -len / 2, f);
    quill.rotation.z = side * 0.05;
    const t = b.add(new THREE.ConeGeometry(0.06 * size, 0.18 * size, 4), tip, 0, -0.01 * i, -len - 0.06 * size, f);
    t.rotation.x = -Math.PI / 2;
    t.scale.set(1, 1, 0.35);
  }
  return p;
}

export const pegasus: ShapeBuild = (b) => {
  const c = b.color; // 白色馬身
  const mane = 0xffe27a; // 雷光金鬃
  const hoof = 0xd8a830;
  // 身體：飽滿的馬身＋胸、臀
  const torso = b.add(new THREE.SphereGeometry(0.46, 12, 9), c, 0, 0.98, -0.05);
  torso.scale.set(0.82, 0.8, 1.55);
  b.add(new THREE.SphereGeometry(0.36, 10, 8), c, 0, 1.04, 0.42).scale.set(0.9, 1, 0.85); // 胸
  b.add(new THREE.SphereGeometry(0.37, 10, 8), c, 0, 1.0, -0.5).scale.set(0.92, 0.95, 0.9); // 臀
  for (const sx of [-1, 1]) {
    b.add(new THREE.SphereGeometry(0.17, 8, 6), c, sx * 0.2, 0.84, 0.42).scale.set(0.8, 1.3, 1); // 前腿肩肌
    b.add(new THREE.SphereGeometry(0.2, 8, 6), c, sx * 0.2, 0.86, -0.55).scale.set(0.8, 1.3, 1.1); // 後腿大腿
  }
  const legs = fourLegs(b, c, hoof, 0.2, 0.44, -0.56, 0.82, 0.8, 0.095);
  // 頸：往前上方斜出（像奔馬昂首）
  const neck = b.group(0, 1.18, 0.55);
  const nk = b.add(new THREE.CylinderGeometry(0.13, 0.21, 0.72, 10), c, 0, 0.27, 0.17, neck);
  nk.rotation.x = 0.58;
  // 鬃毛：沿頸背一排發光的鋸齒
  for (let i = 0; i < 6; i++) {
    const m = b.glow(new THREE.ConeGeometry(0.055, 0.22, 4), mane, 0, 0.12 + i * 0.085, -0.07 + i * 0.06, neck);
    m.rotation.x = -1.2;
  }
  // 頭：朝前下方
  const head = b.group(0, 0.58, 0.42, neck);
  const skull = b.add(new THREE.BoxGeometry(0.22, 0.24, 0.32), c, 0, 0, 0, head);
  skull.rotation.x = 0.35;
  const muzzle = b.add(new THREE.BoxGeometry(0.17, 0.16, 0.26), c, 0, -0.1, 0.22, head);
  muzzle.rotation.x = 0.5;
  b.add(new THREE.BoxGeometry(0.12, 0.05, 0.05), 0x9a8a80, 0, -0.17, 0.33, head); // 鼻孔
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.03, 5, 4), b.boss ? 0x7ad8ff : 0x3a6aa0, sx * 0.11, 0.05, 0.06, head);
    b.add(new THREE.ConeGeometry(0.045, 0.15, 4), c, sx * 0.07, 0.19, -0.08, head).rotation.z = -sx * 0.25; // 耳朵
  }
  // 額上的雷紋
  b.glow(new THREE.OctahedronGeometry(0.05), mane, 0, 0.12, 0.12, head);
  // 大羽翼（白羽、金色翼尖），從肩胛長出
  const wings = [featherWing(b, -1, -0.2, 1.32, 0.22, 0xf4f6ff, 0xffd86a, 1.25), featherWing(b, 1, 0.2, 1.32, 0.22, 0xf4f6ff, 0xffd86a, 1.25)];
  // 尾巴：一束發光的長毛
  const tail = b.group(0, 1.1, -0.82);
  for (let i = 0; i < 3; i++) {
    const s = b.glow(new THREE.ConeGeometry(0.07 - i * 0.012, 0.6, 5), mane, (i - 1) * 0.05, -0.22, -0.14, tail);
    s.rotation.x = -2.6 + i * 0.12;
  }
  return {
    height: 2.1,
    animate: ({ t, moving, winding, lean, strike, body }) => {
      const sw = moving ? Math.sin(t * 10) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 出手前高舉前蹄（人立）
      const rear = winding ? 1 : strike;
      if (rear > 0) {
        legs[0].rotation.x = -1.1 * rear + Math.sin(t * 16) * 0.25 * rear;
        legs[1].rotation.x = -0.9 * rear - Math.sin(t * 16) * 0.25 * rear;
      }
      body.rotation.x = -0.35 * rear + lean * 0.2;
      // 翅膀：平常慢拍、跑動時大幅拍動、出手前完全張開
      const flap = winding ? 1.05 : moving ? 0.45 + Math.sin(t * 9) * 0.45 : 0.3 + Math.sin(t * 2) * 0.12;
      wings[0].rotation.z = -flap; // 左翼往 -x 展開：負值往上抬
      wings[1].rotation.z = flap;
      neck.rotation.x = winding ? -0.35 : Math.sin(t * 1.3) * 0.08;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.8) * 0.2;
      tail.rotation.x = Math.sin(t * 4) * 0.25;
      tail.rotation.y = Math.sin(t * 2.5) * 0.3;
      // 跑動時微微離地（天馬）
      body.position.y = (moving ? Math.abs(Math.sin(t * 10)) * 0.1 : 0) + 0.06 + Math.sin(t * 2) * 0.04;
    },
  };
};

/**
 * aetos 宙斯神鷹埃托斯（風）：巨大金褐色老鷹，懸停在半空；平常大幅拍翼，出手前雙翼高舉、利爪前伸。
 */
export const aetos: ShapeBuild = (b) => {
  const c = b.color; // 金褐羽
  const pale = 0xf2e6c8; // 白頭
  const beak = 0xffc23a;
  const wind = 0x9ff0c8;
  const hover = b.group(0, 0, 0);
  const torso = b.add(new THREE.SphereGeometry(0.42, 12, 9), c, 0, 1.55, -0.05, hover);
  torso.scale.set(0.85, 0.9, 1.35);
  b.add(new THREE.SphereGeometry(0.33, 10, 8), pale, 0, 1.6, 0.32, hover).scale.set(0.95, 1, 0.8); // 胸前白羽
  // 頭＋勾嘴
  const head = b.group(0, 1.98, 0.42, hover);
  b.add(new THREE.SphereGeometry(0.24, 10, 8), pale, 0, 0, 0, head).scale.set(0.9, 0.95, 1.1);
  const bk = b.add(new THREE.ConeGeometry(0.09, 0.3, 6), beak, 0, -0.04, 0.3, head);
  bk.rotation.x = Math.PI / 2 + 0.45;
  b.add(new THREE.SphereGeometry(0.05, 6, 5), beak, 0, -0.12, 0.38, head); // 勾尖
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.035, 6, 5), b.boss ? 0x7affc8 : 0x2a6a4a, sx * 0.13, 0.05, 0.16, head);
    b.add(new THREE.BoxGeometry(0.12, 0.03, 0.06), c, sx * 0.12, 0.11, 0.14, head).rotation.z = sx * 0.3; // 眉羽
  }
  // 大翅膀
  const wings = [featherWing(b, -1, -0.26, 1.72, 0.08, c, pale, 1.75), featherWing(b, 1, 0.26, 1.72, 0.08, c, pale, 1.75)];
  for (const w of wings) hover.add(w);
  // 扇形尾羽
  const tail = b.group(0, 1.45, -0.55, hover);
  for (let i = 0; i < 5; i++) {
    const f = b.add(new THREE.BoxGeometry(0.12, 0.03, 0.62), i % 2 ? c : pale, (i - 2) * 0.09, 0, -0.28, tail);
    f.rotation.y = (i - 2) * 0.22;
  }
  // 利爪（兩隻腳）
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = b.group(sx * 0.16, 1.25, 0.05, hover);
    b.add(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 6), beak, 0, -0.2, 0, leg);
    for (let k = -1; k <= 1; k++) {
      const t = b.add(new THREE.ConeGeometry(0.035, 0.16, 4), 0x3a3020, k * 0.06, -0.44, 0.06, leg);
      t.rotation.x = 1.2;
    }
    legs.push(leg);
  }
  // 身邊的旋風環（發光）
  const gust = b.glow(new THREE.TorusGeometry(0.85, 0.025, 4, 24), wind, 0, 0.35, 0);
  gust.rotation.x = Math.PI / 2;
  return {
    height: 2.4,
    animate: ({ t, moving, winding, strike, body }) => {
      const flap = winding ? 1.15 + Math.sin(t * 6) * 0.1 : moving ? Math.sin(t * 7) * 0.7 + 0.2 : Math.sin(t * 3.2) * 0.55 + 0.15;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
      hover.position.y = Math.sin(t * 3.2 + 0.6) * 0.12 + (winding ? 0.25 : 0);
      hover.rotation.x = (moving ? 0.25 : 0.05) - strike * 0.5 + (winding ? -0.2 : 0);
      for (const l of legs) l.rotation.x = winding ? -0.9 : strike > 0 ? -1.2 * strike : 0.3;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.35;
      tail.rotation.x = Math.sin(t * 2.4) * 0.12;
      gust.rotation.z = t * 4;
      gust.scale.setScalar(1 + Math.sin(t * 5) * 0.08 + (winding ? 0.3 : 0));
      body.position.y = 0;
    },
  };
};

/**
 * chrysomallos 金羊克律索瑪羅斯（光）：金色羊毛的神羊，捲角、背上一對小金翼（載佛里克索斯飛越大海的那隻）。
 * 出手前低頭蓄力、羊毛發光。
 */
export const chrysomallos: ShapeBuild = (b) => {
  const wool = b.color; // 金羊毛
  const face = 0xf6e7c0;
  const horn = 0xc8963a;
  const hoof = 0x6a4a20;
  // 羊毛身體：一團團的球
  const fleece: [number, number, number, number][] = [
    [0, 1.0, 0.1, 0.5], [0, 1.05, -0.35, 0.48], [0.22, 0.95, -0.1, 0.36], [-0.22, 0.95, -0.1, 0.36],
    [0.18, 1.18, 0.25, 0.3], [-0.18, 1.18, 0.25, 0.3], [0, 1.25, -0.15, 0.34], [0, 0.95, -0.62, 0.32],
  ];
  for (const [x, y, z, r] of fleece) b.add(new THREE.SphereGeometry(r, 9, 7), wool, x, y, z);
  const legs = fourLegs(b, face, hoof, 0.22, 0.32, -0.5, 0.66, 0.62, 0.11);
  // 頭（白臉、捲角）
  const head = b.group(0, 1.2, 0.58);
  b.add(new THREE.BoxGeometry(0.26, 0.3, 0.38), face, 0, 0, 0.08, head).rotation.x = 0.35;
  b.add(new THREE.SphereGeometry(0.2, 8, 6), wool, 0, 0.14, -0.04, head); // 頭頂羊毛
  for (const sx of [-1, 1]) {
    const h = b.add(new THREE.TorusGeometry(0.15, 0.055, 6, 12, Math.PI * 1.6), horn, sx * 0.19, 0.06, -0.02, head);
    h.rotation.y = sx * Math.PI / 2;
    h.rotation.z = -0.6;
    b.glow(new THREE.SphereGeometry(0.03, 5, 4), b.boss ? 0xfff6a0 : 0x6a5a20, sx * 0.1, 0.02, 0.24, head);
  }
  // 小金翼
  const wings = [featherWing(b, -1, -0.24, 1.42, 0.0, 0xfff2b0, wool, 0.85), featherWing(b, 1, 0.24, 1.42, 0.0, 0xfff2b0, wool, 0.85)];
  // 光環（頭上方）
  const halo = b.glow(new THREE.TorusGeometry(0.32, 0.03, 4, 20), 0xfff0a8, 0, 1.75, 0.15);
  halo.rotation.x = Math.PI / 2;
  const tail = b.add(new THREE.SphereGeometry(0.14, 6, 5), wool, 0, 1.05, -0.85);
  return {
    height: 1.8,
    animate: ({ t, moving, winding, strike, body }) => {
      const sw = moving ? Math.sin(t * 9) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 低頭蓄力 → 頂角
      head.rotation.x = winding ? 0.55 : strike > 0 ? -0.3 * strike : Math.sin(t * 1.2) * 0.06;
      body.rotation.x = winding ? 0.08 : -strike * 0.12;
      const flap = winding ? 0.9 : moving ? 0.35 + Math.sin(t * 9) * 0.35 : 0.2 + Math.sin(t * 2) * 0.1;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
      halo.rotation.z = t * 1.5;
      halo.scale.setScalar(winding ? 1.25 : 1 + Math.sin(t * 3) * 0.05);
      tail.rotation.y = Math.sin(t * 6);
      body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
    },
  };
};

/**
 * hippocampus 海馬希波坎普斯（水）：前半是青藍色的馬（前腿是鰭），後半是捲曲擺動的魚尾；
 * 懸浮在水氣中，出手前人立、魚尾高舉。
 */
export const hippocampus: ShapeBuild = (b) => {
  const c = b.color; // 青藍鱗
  const belly = 0xcff4ee;
  const fin = 0x5fe0d0;
  const float = b.group(0, 0, 0);
  const chest = b.add(new THREE.SphereGeometry(0.42, 11, 9), c, 0, 1.15, 0.2, float);
  chest.scale.set(0.85, 0.95, 1.2);
  b.add(new THREE.SphereGeometry(0.3, 9, 7), belly, 0, 1.0, 0.36, float).scale.set(0.9, 0.8, 0.9);
  // 頸與頭
  const neck = b.group(0, 1.35, 0.5, float);
  b.add(new THREE.CylinderGeometry(0.13, 0.2, 0.62, 9), c, 0, 0.24, 0.14, neck).rotation.x = 0.5;
  const head = b.group(0, 0.52, 0.36, neck);
  b.add(new THREE.BoxGeometry(0.21, 0.23, 0.3), c, 0, 0, 0, head).rotation.x = 0.35;
  b.add(new THREE.BoxGeometry(0.16, 0.15, 0.24), c, 0, -0.1, 0.21, head).rotation.x = 0.5;
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.03, 5, 4), b.boss ? 0xbffcff : 0x1a5a6a, sx * 0.11, 0.04, 0.06, head);
    const ear = b.add(new THREE.ConeGeometry(0.06, 0.18, 3), fin, sx * 0.09, 0.16, -0.08, head); // 鰭狀耳
    ear.rotation.z = -sx * 0.5;
  }
  // 鬃毛：一排鰭
  for (let i = 0; i < 5; i++) {
    const m = b.add(new THREE.ConeGeometry(0.07, 0.24, 3), fin, 0, 0.12 + i * 0.09, -0.06 + i * 0.05, neck);
    m.rotation.x = -1.2;
  }
  // 前腿（末端是鰭）
  const fl: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = b.group(sx * 0.2, 0.95, 0.38, float);
    b.add(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 7), c, 0, -0.22, 0, leg);
    const f = b.add(new THREE.ConeGeometry(0.14, 0.3, 3), fin, 0, -0.5, 0.06, leg);
    f.scale.set(1, 1, 0.3);
    fl.push(leg);
  }
  // 魚尾：一節節往後捲，每節一個 pivot（擺動）
  const segs: THREE.Group[] = [];
  let parent: THREE.Object3D = b.group(0, 1.1, -0.15, float);
  segs.push(parent as THREE.Group);
  for (let i = 0; i < 6; i++) {
    const r = 0.34 - i * 0.045;
    b.add(new THREE.SphereGeometry(r, 9, 7), i % 2 ? c : 0x3aa8b8, 0, 0, -r * 0.9, parent).scale.set(1, 0.9, 1.3);
    if (i < 5) {
      const g = b.group(0, 0, -r * 1.7, parent);
      segs.push(g);
      parent = g;
    }
  }
  const fluke = b.group(0, 0, -0.2, parent);
  for (const sx of [-1, 1]) {
    const f = b.add(new THREE.ConeGeometry(0.2, 0.55, 3), fin, sx * 0.2, 0, -0.15, fluke);
    f.rotation.z = sx * 1.9;
    f.scale.set(1, 1, 0.25);
  }
  // 腳下水氣
  const mist = b.glow(new THREE.TorusGeometry(0.75, 0.04, 4, 22), 0x9fe8ff, 0, 0.2, -0.3);
  mist.rotation.x = Math.PI / 2;
  return {
    height: 2.1,
    animate: ({ t, moving, winding, strike, body }) => {
      const rear = winding ? 1 : strike;
      float.position.y = 0.15 + Math.sin(t * 2) * 0.08;
      float.rotation.x = -0.35 * rear;
      const sp = moving ? 6 : 2.2;
      for (let i = 0; i < segs.length; i++) {
        segs[i].rotation.x = (i < 3 ? -0.2 : 0.32) + Math.sin(t * sp - i * 0.7) * 0.1 - rear * 0.08; // 先往下垂、尾端往上捲
        segs[i].rotation.y = Math.sin(t * sp * 0.8 - i * 0.6) * (moving ? 0.22 : 0.1);
      }
      fluke.rotation.x = Math.sin(t * sp - 4) * 0.4;
      for (let i = 0; i < 2; i++) fl[i].rotation.x = rear > 0 ? -1.0 * rear + Math.sin(t * 14 + i * 3) * 0.3 * rear : Math.sin(t * sp + i * Math.PI) * (moving ? 0.6 : 0.15);
      neck.rotation.x = winding ? -0.3 : Math.sin(t * 1.4) * 0.08;
      mist.rotation.z = t;
      mist.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
      body.position.y = 0;
    },
  };
};
