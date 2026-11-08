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
export function featherWing(b: ShapeBuilder, side: number, x: number, y: number, z: number, color: number, tip: number, size: number): THREE.Group {
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

/* ======================= 人形守護者（戰神、巨人）共用 ======================= */

interface WarriorOpts {
  skin: number;
  armor: number;
  cloth: number;
  /** 身高倍率（1 = 約 2.1） */
  size?: number;
  /** 手臂對數（百臂巨人 3 對） */
  armPairs?: number;
  beard?: number;
  /** 頭盔（含冠羽顏色） */
  helm?: { color: number; crest: number };
  cape?: number;
  wings?: { color: number; tip: number; size: number };
  weapon?: 'spear' | 'scythe' | 'none';
  weaponColor?: number;
  shield?: number;
  /** 發光（眼睛、武器刃、光環） */
  glow: number;
  /** 懸浮（風神） */
  float?: boolean;
}

/** 人形：骨盆 pivot＋兩腿、軀幹、頭、手臂（右手第一隻拿武器、左手第一隻拿盾），回傳動畫 */
function warrior(b: ShapeBuilder, o: WarriorOpts) {
  const k = o.size ?? 1;
  const root = b.group(0, 0, 0);
  const hips = b.group(0, 0.95 * k, 0, root);
  // 腿
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = b.group(sx * 0.15 * k, 0, 0, hips);
    b.add(new THREE.CylinderGeometry(0.14 * k, 0.11 * k, 0.5 * k, 8), o.cloth, 0, -0.25 * k, 0, leg);
    b.add(new THREE.CylinderGeometry(0.12 * k, 0.095 * k, 0.45 * k, 8), o.armor, 0, -0.68 * k, 0, leg); // 脛甲
    b.add(new THREE.BoxGeometry(0.16 * k, 0.08 * k, 0.26 * k), o.armor, 0, -0.92 * k, 0.05 * k, leg);
    legs.push(leg);
  }
  // 軀幹（胸甲＋裙甲）
  const chest = b.group(0, 0.1 * k, 0, hips);
  b.add(new THREE.CylinderGeometry(0.3 * k, 0.24 * k, 0.32 * k, 10), o.cloth, 0, 0.02 * k, 0, hips); // 裙
  const torso = b.add(new THREE.CylinderGeometry(0.38 * k, 0.29 * k, 0.62 * k, 10), o.armor, 0, 0.38 * k, 0, chest);
  torso.scale.z = 0.75;
  b.add(new THREE.SphereGeometry(0.18 * k, 8, 6), o.armor, 0, 0.5 * k, 0.12 * k, chest).scale.set(1.6, 0.8, 0.5); // 胸肌板
  // 頭
  const head = b.group(0, 0.82 * k, 0, chest);
  b.add(new THREE.SphereGeometry(0.19 * k, 10, 8), o.skin, 0, 0.08 * k, 0, head);
  if (o.beard !== undefined) b.add(new THREE.ConeGeometry(0.13 * k, 0.24 * k, 7), o.beard, 0, -0.06 * k, 0.08 * k, head).rotation.x = Math.PI;
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.025 * k, 5, 4), o.glow, sx * 0.065 * k, 0.1 * k, 0.15 * k, head);
  if (o.helm) {
    b.add(new THREE.SphereGeometry(0.21 * k, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), o.helm.color, 0, 0.1 * k, 0, head);
    for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.05 * k, 0.16 * k, 0.12 * k), o.helm.color, sx * 0.15 * k, 0.02 * k, 0.06 * k, head); // 頰甲
    const crest = b.add(new THREE.BoxGeometry(0.06 * k, 0.16 * k, 0.42 * k), o.helm.crest, 0, 0.3 * k, -0.04 * k, head);
    crest.scale.y = 1.2;
  }
  // 手臂
  const arms: THREE.Group[] = [];
  const pairs = o.armPairs ?? 1;
  for (let p = 0; p < pairs; p++) {
    for (const sx of [1, -1]) {
      const arm = b.group(sx * 0.47 * k, (0.62 - p * 0.17) * k, -p * 0.05 * k, chest);
      b.add(new THREE.SphereGeometry(0.15 * k, 8, 6), o.armor, 0, 0, 0, arm); // 肩甲
      b.add(new THREE.CylinderGeometry(0.105 * k, 0.09 * k, 0.4 * k, 7), o.skin, 0, -0.24 * k, 0, arm);
      b.add(new THREE.CylinderGeometry(0.1 * k, 0.085 * k, 0.32 * k, 7), o.armor, 0, -0.56 * k, 0, arm); // 護臂
      b.add(new THREE.SphereGeometry(0.09 * k, 6, 5), o.skin, 0, -0.75 * k, 0, arm);
      arm.rotation.z = sx * (0.18 + p * 0.35);
      arms.push(arm);
    }
  }
  // 武器（右手）
  const hand = b.group(0, -0.75 * k, 0, arms[0]);
  if (o.weapon === 'spear') {
    b.add(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 2.2 * k, 6), o.weaponColor ?? 0x7a5a3a, 0, 0, 0.1 * k, hand).rotation.x = Math.PI / 2;
    const tip = b.glow(new THREE.ConeGeometry(0.07 * k, 0.32 * k, 4), o.glow, 0, 0, 1.3 * k, hand);
    tip.rotation.x = Math.PI / 2;
  } else if (o.weapon === 'scythe') {
    b.add(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, 1.9 * k, 6), o.weaponColor ?? 0x2a2030, 0, 0.5 * k, 0, hand);
    const blade = b.glow(new THREE.TorusGeometry(0.42 * k, 0.04 * k, 4, 14, Math.PI * 0.75), o.glow, 0.05 * k, 1.35 * k, 0.32 * k, hand);
    blade.rotation.y = Math.PI / 2;
    blade.rotation.z = 0.2;
  }
  // 盾（左手）
  if (o.shield !== undefined && arms[1]) {
    const sh = b.add(new THREE.CylinderGeometry(0.36 * k, 0.36 * k, 0.06 * k, 14), o.shield, -0.08 * k, -0.5 * k, 0.12 * k, arms[1]);
    sh.rotation.z = Math.PI / 2;
    sh.rotation.y = 0.2;
    b.glow(new THREE.SphereGeometry(0.07 * k, 6, 5), o.glow, -0.13 * k, -0.5 * k, 0.12 * k, arms[1]);
  }
  // 披風
  let cape: THREE.Mesh | null = null;
  if (o.cape !== undefined) {
    cape = b.add(new THREE.BoxGeometry(0.62 * k, 0.95 * k, 0.04 * k), o.cape, 0, 0.2 * k, -0.24 * k, chest);
    cape.geometry.translate(0, -0.3 * k, 0);
  }
  // 翅膀
  const wings = o.wings ? [featherWing(b, -1, -0.18 * k, 0.6 * k, -0.2 * k, o.wings.color, o.wings.tip, o.wings.size), featherWing(b, 1, 0.18 * k, 0.6 * k, -0.2 * k, o.wings.color, o.wings.tip, o.wings.size)] : [];
  for (const w of wings) chest.add(w);

  const animate = ({ t, moving, winding, strike }: { t: number; moving: boolean; winding: boolean; strike: number }) => {
    const sw = moving ? Math.sin(t * 8) * 0.6 : 0;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    hips.position.y = 0.95 * k + (moving ? Math.abs(Math.cos(t * 8)) * 0.05 : Math.sin(t * 1.6) * 0.015) + (o.float ? 0.25 + Math.sin(t * 2) * 0.1 : 0);
    if (o.float) {
      legs[0].rotation.x = 0.3 + sw * 0.3;
      legs[1].rotation.x = 0.15 - sw * 0.3;
    }
    chest.rotation.y = winding ? -0.45 : strike * 0.5;
    chest.rotation.x = winding ? -0.12 : strike * 0.18;
    // 武器手：前搖高舉、出手揮下
    arms[0].rotation.x = winding ? -2.4 : strike > 0 ? -2.4 + 3.2 * (1 - strike) : -sw * 0.6 - 0.15;
    if (arms[1]) arms[1].rotation.x = o.shield !== undefined ? -0.7 : sw * 0.6 - 0.15;
    for (let i = 2; i < arms.length; i++) arms[i].rotation.x = winding ? -1.6 - Math.sin(t * 12 + i) * 0.4 : strike > 0 ? -1.4 * strike : Math.sin(t * 3 + i * 1.3) * 0.35;
    head.rotation.y = winding ? 0.3 : Math.sin(t * 0.7) * 0.15;
    if (cape) cape.rotation.x = 0.15 + (moving ? 0.35 : 0) + Math.sin(t * 3) * 0.05;
    const flap = winding ? 0.9 : moving ? 0.4 + Math.sin(t * 6) * 0.35 : 0.25 + Math.sin(t * 2) * 0.12;
    if (wings.length) {
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
    }
  };
  return { root, chest, head, arms, animate, height: 2.15 * k };
}

/** boreas 北風神波瑞阿斯（冰）：白鬍子、冰藍羽翼、懸浮，冰霜長矛 */
export const boreas: ShapeBuild = (b) => {
  const w = warrior(b, {
    skin: 0xe8d8cc, armor: 0x9fc8e8, cloth: 0x4a7ab8, beard: 0xf4f8ff, cape: 0xd8ecff,
    wings: { color: 0xeaf6ff, tip: 0x8fd8ff, size: 1.3 }, weapon: 'spear', weaponColor: 0xcfe8f8, glow: 0x9fe6ff, float: true,
  });
  const frost = b.glow(new THREE.TorusGeometry(0.7, 0.03, 4, 22), 0xbff0ff, 0, 0.12, 0);
  frost.rotation.x = Math.PI / 2;
  return { height: w.height + 0.3, animate: (s) => { w.animate(s); frost.rotation.z = s.t * 2; frost.scale.setScalar(1 + Math.sin(s.t * 3) * 0.1); } };
};

/** briareos 百臂巨人布里阿瑞俄斯（土）：岩石皮膚、六條手臂、沒有武器，用拳頭砸 */
export const briareos: ShapeBuild = (b) => {
  const w = warrior(b, { skin: 0x9a8268, armor: 0x6a5a48, cloth: 0x4a3a2a, size: 1.15, armPairs: 3, beard: 0x3a2a1a, weapon: 'none', glow: 0xffb35a });
  // 背上的岩塊
  for (const [x, y, z, r] of [[0.2, 1.75, -0.25, 0.16], [-0.18, 1.62, -0.28, 0.13], [0, 1.95, -0.2, 0.12]] as const) {
    const rock = b.add(new THREE.DodecahedronGeometry(r), 0x7a6a58, x, y, z);
    rock.rotation.set(x * 3, y, z);
  }
  return { height: w.height, animate: w.animate };
};

/** phobos 恐懼之神福波斯（暗）：戰神之子，黑甲、紫焰眼、巨鐮、破披風 */
export const phobos: ShapeBuild = (b) => {
  const w = warrior(b, {
    skin: 0x6a5a7a, armor: 0x2a2236, cloth: 0x3a2a4a, helm: { color: 0x1e1828, crest: 0x8a4aff }, cape: 0x2a1a3a,
    weapon: 'scythe', weaponColor: 0x1a1420, glow: 0xb48cff,
  });
  const aura: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) aura.push(b.glow(new THREE.ConeGeometry(0.08, 0.4, 4), 0x8a4aff, Math.cos(i * 1.57) * 0.55, 0.3, Math.sin(i * 1.57) * 0.55));
  return {
    height: w.height,
    animate: (s) => {
      w.animate(s);
      aura.forEach((a, i) => {
        a.position.y = 0.3 + ((s.t * 0.6 + i * 0.25) % 1) * 1.6;
        a.scale.setScalar(1 - ((s.t * 0.6 + i * 0.25) % 1) * 0.7);
      });
    },
  };
};

/** ares 戰神阿瑞斯（金）：青銅全甲、紅冠羽頭盔、圓盾、長槍、紅披風 */
export const ares: ShapeBuild = (b) => {
  const w = warrior(b, {
    skin: 0xd8a888, armor: 0xc8963a, cloth: 0x8a2a20, helm: { color: 0xc8963a, crest: 0xd83a2a }, cape: 0xb02a20,
    weapon: 'spear', weaponColor: 0x5a3a20, shield: 0xb88a30, glow: 0xffd86a, size: 1.05,
  });
  return { height: w.height, animate: w.animate };
};

/** phoenix 不死鳥菲尼克斯（火）：火紅大鳥，金色冠羽、燃燒的長尾羽，懸停；出手前全身火焰變大 */
export const phoenix: ShapeBuild = (b) => {
  const c = b.color;
  const gold = 0xffc23a;
  const flame = 0xff7a2a;
  const hover = b.group(0, 0, 0);
  const torso = b.add(new THREE.SphereGeometry(0.36, 11, 9), c, 0, 1.6, 0, hover);
  torso.scale.set(0.85, 0.95, 1.3);
  b.add(new THREE.SphereGeometry(0.26, 9, 7), gold, 0, 1.62, 0.26, hover).scale.set(0.9, 1, 0.75);
  const head = b.group(0, 2.02, 0.32, hover);
  b.add(new THREE.SphereGeometry(0.19, 9, 7), c, 0, 0, 0, head);
  const bk = b.add(new THREE.ConeGeometry(0.07, 0.24, 6), gold, 0, -0.02, 0.24, head);
  bk.rotation.x = Math.PI / 2 + 0.3;
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.03, 5, 4), 0xfff4a0, sx * 0.1, 0.05, 0.12, head);
  // 冠羽
  for (let i = 0; i < 4; i++) {
    const f = b.glow(new THREE.ConeGeometry(0.035, 0.3 - i * 0.04, 4), i % 2 ? gold : flame, 0, 0.18, -0.04 - i * 0.06, head);
    f.rotation.x = -0.5 - i * 0.18;
  }
  const wings = [featherWing(b, -1, -0.22, 1.74, 0.05, c, gold, 1.55), featherWing(b, 1, 0.22, 1.74, 0.05, c, gold, 1.55)];
  for (const w of wings) hover.add(w);
  // 長尾羽（發光火焰）
  const tail = b.group(0, 1.48, -0.42, hover);
  const plumes: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const p = b.glow(new THREE.ConeGeometry(0.07, 1.0 + (i % 2) * 0.35, 5), i % 2 ? gold : flame, (i - 2) * 0.1, -0.1, -0.5, tail);
    p.rotation.x = -Math.PI / 2 - 0.35;
    p.rotation.z = (i - 2) * 0.12;
    plumes.push(p);
  }
  const ember = b.glow(new THREE.SphereGeometry(0.5, 10, 8), 0xff9a3a, 0, 1.6, 0, hover);
  (ember.material as THREE.MeshBasicMaterial).transparent = true;
  (ember.material as THREE.MeshBasicMaterial).opacity = 0.18;
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const l = b.group(sx * 0.12, 1.3, 0.02, hover);
    b.add(new THREE.CylinderGeometry(0.04, 0.035, 0.36, 5), gold, 0, -0.18, 0, l);
    legs.push(l);
  }
  return {
    height: 2.4,
    animate: ({ t, moving, winding, strike }) => {
      const flap = winding ? 1.1 : moving ? Math.sin(t * 7) * 0.65 + 0.2 : Math.sin(t * 3) * 0.5 + 0.2;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
      hover.position.y = Math.sin(t * 3 + 0.5) * 0.12 + (winding ? 0.2 : 0);
      hover.rotation.x = (moving ? 0.2 : 0.04) - strike * 0.4;
      tail.rotation.x = Math.sin(t * 2.5) * 0.15;
      plumes.forEach((p, i) => p.scale.setScalar(1 + Math.sin(t * 9 + i * 1.7) * 0.12 + (winding ? 0.3 : 0)));
      ember.scale.setScalar(1 + Math.sin(t * 6) * 0.08 + (winding ? 0.6 : 0));
      for (const l of legs) l.rotation.x = winding ? -0.7 : 0.4;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.3;
    },
  };
};

/** scorpius 天蠍斯科爾皮俄斯（毒）：蓋亞派去刺殺獵戶俄里翁的巨蠍；八腳、雙鉗、分節的毒尾高舉，出手前尾刺發光往前刺 */
export const scorpius: ShapeBuild = (b) => {
  const c = b.color; // 暗紫黑甲殼
  const sting = 0xb6ff4a;
  const body = b.group(0, 0.55, 0);
  for (let i = 0; i < 4; i++) {
    const seg = b.add(new THREE.SphereGeometry(0.42 - i * 0.04, 10, 7), i % 2 ? c : b.dark, 0, 0, 0.35 - i * 0.32, body);
    seg.scale.set(1.15, 0.5, 0.75);
  }
  b.add(new THREE.SphereGeometry(0.3, 9, 7), c, 0, 0.05, 0.65, body).scale.set(1.1, 0.55, 0.8); // 頭胸
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.035, 5, 4), sting, sx * (0.06 + i * 0.05), 0.2, 0.82 - i * 0.02, body);
  // 八隻腳
  const legs: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    for (const sx of [-1, 1]) {
      const l = b.group(sx * 0.4, 0, 0.35 - i * 0.28, body);
      const up = b.add(new THREE.CylinderGeometry(0.05, 0.045, 0.5, 5), c, sx * 0.22, 0.12, 0, l);
      up.rotation.z = sx * -1.1;
      const lo = b.add(new THREE.CylinderGeometry(0.045, 0.02, 0.6, 5), b.dark, sx * 0.48, -0.15, 0, l);
      lo.rotation.z = sx * 0.4;
      l.rotation.y = sx * (i - 1.5) * -0.25;
      legs.push(l);
    }
  }
  // 雙鉗
  const claws: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const arm = b.group(sx * 0.28, 0.05, 0.85, body);
    const a1 = b.add(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 6), c, sx * 0.1, 0, 0.22, arm);
    a1.rotation.x = Math.PI / 2;
    a1.rotation.z = sx * 0.4;
    b.add(new THREE.SphereGeometry(0.17, 8, 6), c, sx * 0.2, 0, 0.55, arm).scale.set(0.9, 0.6, 1.3);
    for (const up of [1, -1]) {
      const pin = b.add(new THREE.ConeGeometry(0.06, 0.32, 5), b.dark, sx * 0.2 + up * 0.04, up * 0.05, 0.8, arm);
      pin.rotation.x = Math.PI / 2;
    }
    claws.push(arm);
  }
  // 毒尾：6 節往上往前捲
  const tailSegs: THREE.Group[] = [];
  let parent: THREE.Object3D = b.group(0, 0.05, -0.75, body);
  tailSegs.push(parent as THREE.Group);
  for (let i = 0; i < 6; i++) {
    b.add(new THREE.SphereGeometry(0.17 - i * 0.012, 8, 6), i % 2 ? c : b.dark, 0, 0.14, 0, parent).scale.set(1, 1.4, 1);
    const g = b.group(0, 0.27, 0, parent);
    tailSegs.push(g);
    parent = g;
  }
  b.add(new THREE.SphereGeometry(0.15, 8, 6), 0x5a3a6a, 0, 0.08, 0.05, parent).scale.set(0.9, 1.1, 1.3);
  const stinger = b.glow(new THREE.ConeGeometry(0.06, 0.32, 5), sting, 0, 0.1, 0.27, parent);
  stinger.rotation.x = Math.PI / 2 + 0.4;
  return {
    height: 1.9,
    animate: ({ t, moving, winding, strike }) => {
      legs.forEach((l, i) => (l.rotation.x = moving ? Math.sin(t * 14 + i * 1.3) * 0.35 : Math.sin(t * 2 + i) * 0.04));
      const curl = winding ? 0.55 : strike > 0 ? 0.3 - strike * 0.5 : 0.36 + Math.sin(t * 1.8) * 0.05;
      tailSegs.forEach((s, i) => (s.rotation.x = i === 0 ? -0.5 : curl));
      claws.forEach((cl, i) => {
        cl.rotation.y = (i ? 1 : -1) * (winding ? 0.5 : 0.15 + Math.sin(t * 2 + i) * 0.1);
        cl.rotation.x = strike * -0.3;
      });
      stinger.scale.setScalar(winding ? 1.5 + Math.sin(t * 20) * 0.2 : 1);
      body.position.y = 0.55 + (moving ? Math.sin(t * 14) * 0.02 : 0);
    },
  };
};
