import * as THREE from 'three';
import type { ShapeBuild } from './types';
import { fourLegs } from './beasts';
import { wing } from './monsters';

/**
 * 英雄遠征的怪物造型（v1.39 第十三～二十層）：
 *  scylla   斯庫拉（海妖上半身、腰間六隻犬頭、底下一圈觸手；出手前犬頭全部抬起張嘴）
 *  griffin  獅鷲（獅身鷹首、金爪、大翅膀；出手前展翼）
 *  hind     刻律涅金角鹿（細長四足、金色分岔鹿角、銅蹄；出手前低頭頂角）
 *  cetus    海怪刻托斯（沒有腳的長身海獸、巨顎、背鰭、尾鰭；出手前抬頭張嘴）
 *  centaur  半人馬（馬身＋人上身、長弓；出手前拉弓）
 */

export const scylla: ShapeBuild = (b) => {
  const c = b.color; // 鱗色（海藍）
  const skin = new THREE.Color(c).lerp(new THREE.Color(0xd8f0e8), 0.6).getHex();
  // 觸手：一圈
  const tentacles: THREE.Group[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = b.group(Math.sin(a) * 0.3, 0.35, Math.cos(a) * 0.3);
    p.rotation.y = a;
    const seg = b.add(new THREE.CylinderGeometry(0.05, 0.12, 0.8, 6), b.dark, 0, -0.1, 0.35, p);
    seg.rotation.x = 1.15;
    b.add(new THREE.ConeGeometry(0.05, 0.3, 5), b.dark, 0, -0.28, 0.82, p).rotation.x = 1.5;
    tentacles.push(p);
  }
  b.add(new THREE.SphereGeometry(0.42, 10, 7), c, 0, 0.6, 0).scale.set(1, 0.75, 1);
  // 腰間的六隻犬頭
  const dogs: { neck: THREE.Group; jaw: THREE.Group }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const neck = b.group(Math.sin(a) * 0.38, 0.82, Math.cos(a) * 0.38);
    neck.rotation.y = a;
    b.add(new THREE.CylinderGeometry(0.07, 0.1, 0.45, 6), c, 0, 0.12, 0.15, neck).rotation.x = 0.9;
    const head = b.group(0, 0.28, 0.38, neck);
    b.add(new THREE.BoxGeometry(0.2, 0.18, 0.24), 0x3a4a5a, 0, 0, 0, head);
    b.add(new THREE.BoxGeometry(0.14, 0.1, 0.16), 0x3a4a5a, 0, -0.02, 0.18, head);
    for (const sx of [-1, 1]) {
      b.glow(new THREE.SphereGeometry(0.025, 4, 3), b.boss ? 0xffe25a : 0x9ae0ff, sx * 0.06, 0.05, 0.12, head);
      b.add(new THREE.ConeGeometry(0.04, 0.1, 4), 0x2a3440, sx * 0.07, 0.12, -0.04, head);
    }
    const jaw = b.group(0, -0.08, 0.1, head);
    b.add(new THREE.BoxGeometry(0.12, 0.04, 0.16), 0xc86a6a, 0, -0.02, 0.08, jaw);
    dogs.push({ neck, jaw });
  }
  // 上半身（海妖）
  b.add(new THREE.CylinderGeometry(0.2, 0.28, 0.6, 8), skin, 0, 1.15, 0);
  b.add(new THREE.CylinderGeometry(0.22, 0.21, 0.14, 8), 0x2a8ab8, 0, 1.3, 0); // 貝殼胸飾
  const head = b.group(0, 1.62, 0);
  b.add(new THREE.SphereGeometry(0.19, 9, 7), skin, 0, 0.04, 0, head);
  b.add(new THREE.SphereGeometry(0.21, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.6), 0x1a3a4a, 0, 0.06, -0.02, head);
  b.add(new THREE.ConeGeometry(0.17, 0.6, 6), 0x1a3a4a, 0, -0.2, -0.14, head).rotation.x = 0.25;
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.035, 5, 4), b.boss ? 0x7affff : 0x9ae0ff, sx * 0.07, 0.06, 0.16, head);
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.26, 1.38, 0);
    b.add(new THREE.CylinderGeometry(0.05, 0.065, 0.55, 6), skin, 0, -0.26, 0, p);
    b.add(new THREE.ConeGeometry(0.06, 0.16, 4), b.dark, 0, -0.58, 0.02, p).rotation.x = Math.PI; // 爪
    arms.push(p);
  }
  return {
    height: 2.0,
    animate: ({ t, moving, winding, body }) => {
      tentacles.forEach((p, i) => {
        p.rotation.x = Math.sin(t * (moving ? 7 : 2.5) + i) * 0.25;
      });
      dogs.forEach(({ neck, jaw }, i) => {
        neck.rotation.x = winding ? -0.5 : Math.sin(t * 2.2 + i * 1.1) * 0.18;
        jaw.rotation.x = winding ? 0.7 : Math.max(0, Math.sin(t * 3 + i * 1.7)) * 0.4;
      });
      arms[0].rotation.z = winding ? -1.2 : -0.2 + Math.sin(t * 1.8) * 0.06;
      arms[1].rotation.z = winding ? 1.2 : 0.2 - Math.sin(t * 1.8) * 0.06;
      head.rotation.x = winding ? -0.2 : Math.sin(t * 1.3) * 0.05;
      body.position.y = Math.sin(t * 2) * 0.04;
      body.rotation.y = moving ? Math.sin(t * 5) * 0.1 : 0;
    },
  };
};

export const griffin: ShapeBuild = (b) => {
  const c = b.color; // 獅身
  const feather = 0xf4f0e4;
  const torso = b.add(new THREE.SphereGeometry(0.46, 10, 7), c, 0, 0.8, -0.15);
  torso.scale.set(0.8, 0.8, 1.5);
  b.add(new THREE.SphereGeometry(0.4, 9, 7), feather, 0, 0.98, 0.32).scale.set(0.95, 1, 0.9); // 羽毛胸
  // 鷹首
  const head = b.group(0, 1.35, 0.55);
  b.add(new THREE.SphereGeometry(0.22, 9, 7), feather, 0, 0.02, 0, head).scale.set(0.9, 1, 1.1);
  const beak = b.add(new THREE.ConeGeometry(0.08, 0.3, 5), 0xf0b020, 0, -0.04, 0.3, head);
  beak.rotation.x = Math.PI / 2 + 0.35;
  b.add(new THREE.ConeGeometry(0.1, 0.22, 4), feather, 0, 0.2, -0.18, head).rotation.x = -0.9; // 冠羽
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.035, 5, 4), b.boss ? 0xff9a2a : 0xffd04a, sx * 0.1, 0.06, 0.15, head);
    b.add(new THREE.ConeGeometry(0.04, 0.16, 4), feather, sx * 0.12, 0.18, -0.06, head).rotation.z = -sx * 0.6; // 耳羽
  }
  // 前腳是鷹爪（金色），後腳是獅腳
  const legs = fourLegs(b, c, b.dark, 0.24, 0.42, -0.6, 0.6, 0.6, 0.11);
  for (const i of [0, 1]) for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.025, 0.1, 4), 0xf0b020, (k - 1) * 0.05, -0.58, 0.08, legs[i]).rotation.x = 1.4;
  const wings = [wing(b, -1, -0.26, 1.1, 0.0, c, feather, b.boss ? 1.35 : 1.1), wing(b, 1, 0.26, 1.1, 0.0, c, feather, b.boss ? 1.35 : 1.1)];
  const tail = b.group(0, 0.92, -0.85);
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 4), c, 0, -0.3, -0.1, tail).rotation.x = 0.4;
  b.add(new THREE.SphereGeometry(0.07, 5, 4), b.dark, 0, -0.62, -0.22, tail);
  if (b.boss) for (let i = 0; i < 3; i++) b.glow(new THREE.BoxGeometry(0.05, 0.03, 0.2), 0xffe08a, 0, 1.18, 0.1 - i * 0.28);
  return {
    height: 1.8,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 9) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      const open = winding ? 1.25 : moving ? 0.45 + Math.sin(t * 9) * 0.35 : 0.2 + Math.sin(t * 1.6) * 0.06;
      wings[0].rotation.z = open;
      wings[1].rotation.z = -open;
      head.rotation.x = winding ? -0.3 : Math.sin(t * 1.4) * 0.06;
      head.rotation.y = winding ? 0 : Math.sin(t * 0.8) * 0.3;
      tail.rotation.z = Math.sin(t * 3) * 0.5;
      body.position.y = winding ? 0.12 : moving ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const hind: ShapeBuild = (b) => {
  const c = b.color; // 毛色（金棕）
  const gold = 0xffd040;
  const torso = b.add(new THREE.SphereGeometry(0.38, 9, 7), c, 0, 1.0, -0.05);
  torso.scale.set(0.75, 0.75, 1.55);
  b.add(new THREE.SphereGeometry(0.22, 8, 6), 0xf4ead8, 0, 0.82, 0.2).scale.set(0.9, 0.7, 1.3); // 白肚
  const legs = fourLegs(b, c, b.boss ? 0xc87a3a : 0x6a4a2a, 0.18, 0.38, -0.48, 0.85, 0.85, 0.07); // 銅蹄
  // 長頸＋頭
  const neck = b.group(0, 1.15, 0.45);
  b.add(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 7), c, 0, 0.25, 0.08, neck).rotation.x = 0.35;
  const head = b.group(0, 0.55, 0.2, neck);
  b.add(new THREE.BoxGeometry(0.2, 0.2, 0.26), c, 0, 0, 0, head);
  b.add(new THREE.BoxGeometry(0.13, 0.12, 0.2), c, 0, -0.04, 0.2, head);
  b.add(new THREE.BoxGeometry(0.06, 0.04, 0.03), 0x2a1a14, 0, 0.0, 0.31, head);
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.025, 4, 3), b.boss ? 0xfff0a0 : 0x3a2a1a, sx * 0.09, 0.05, 0.1, head);
    b.add(new THREE.ConeGeometry(0.04, 0.14, 4), c, sx * 0.12, 0.1, -0.06, head).rotation.z = -sx * 1.0; // 耳朵
    // 金角：主幹＋三根分岔
    const antler = b.group(sx * 0.07, 0.12, -0.04, head);
    antler.rotation.z = -sx * 0.35;
    const mk = b.boss ? b.glow.bind(b) : b.add.bind(b);
    mk(new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4), gold, 0, 0.25, -0.05, antler);
    for (let k = 0; k < 3; k++) {
      const tine = mk(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 4), gold, sx * 0.05, 0.18 + k * 0.12, 0.02 - k * 0.03, antler);
      tine.rotation.z = -sx * 0.8;
      tine.rotation.x = 0.3;
    }
  }
  const tail = b.group(0, 1.08, -0.6);
  b.add(new THREE.ConeGeometry(0.06, 0.16, 5), 0xf4ead8, 0, 0, -0.04, tail).rotation.x = -2.2;
  return {
    height: 1.9,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 12) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      if (winding) legs[0].rotation.x = Math.sin(t * 18) * 0.5; // 刨地
      neck.rotation.x = winding ? 0.9 : Math.sin(t * 1.1) * 0.06; // 出手前低頭頂角
      head.rotation.y = winding ? 0 : Math.sin(t * 0.7) * 0.25;
      tail.rotation.x = Math.sin(t * 6) * 0.3;
      body.position.y = moving ? Math.abs(Math.sin(t * 12)) * 0.08 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const cetus: ShapeBuild = (b) => {
  const c = b.color; // 深海藍
  const belly = b.light;
  // 身體：前大後小的幾節
  const segs: THREE.Group[] = [];
  let parent: THREE.Object3D = b.body;
  let z = -0.2;
  for (let i = 0; i < 5; i++) {
    const r = 0.5 - i * 0.07;
    const p = b.group(0, i === 0 ? 0.5 : 0, i === 0 ? z : -0.55 + i * 0.02, parent);
    const s = b.add(new THREE.SphereGeometry(r, 9, 7), c, 0, 0, 0, p);
    s.scale.set(1, 0.8, 1.3);
    b.add(new THREE.BoxGeometry(r * 1.3, 0.08, r * 1.6), belly, 0, -r * 0.62, 0, p);
    b.add(new THREE.ConeGeometry(0.07, 0.35 - i * 0.04, 4), 0x2a6a8a, 0, r * 0.85, 0, p).rotation.x = -0.4; // 背鰭
    segs.push(p);
    parent = p;
    z = 0;
  }
  // 尾鰭
  const fluke = b.group(0, 0, -0.45, parent);
  for (const sx of [-1, 1]) b.add(new THREE.BoxGeometry(0.5, 0.05, 0.25), 0x2a6a8a, sx * 0.25, 0, -0.05, fluke).rotation.y = sx * 0.5;
  // 前鰭
  const fins: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.45, 0.3, 0.1);
    b.add(new THREE.BoxGeometry(0.55, 0.06, 0.3), 0x2a6a8a, sx * 0.25, 0, 0, p).rotation.y = sx * 0.4;
    fins.push(p);
  }
  // 頭與巨顎
  const head = b.group(0, 0.62, 0.45);
  b.add(new THREE.BoxGeometry(0.62, 0.42, 0.7), c, 0, 0.05, 0.3, head);
  b.add(new THREE.BoxGeometry(0.5, 0.18, 0.4), c, 0, 0.12, 0.72, head);
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.06, 6, 4), b.boss ? 0xff4a3a : 0xffd04a, sx * 0.24, 0.2, 0.55, head);
    b.add(new THREE.ConeGeometry(0.06, 0.4, 5), 0xd8e8f0, sx * 0.25, 0.32, 0.2, head).rotation.x = -1.0; // 角
    for (let k = 0; k < 4; k++) b.add(new THREE.ConeGeometry(0.03, 0.1, 4), 0xf4f1e8, sx * 0.18, -0.06, 0.55 + k * 0.1, head).rotation.x = Math.PI;
  }
  const jaw = b.group(0, -0.14, 0.15, head);
  b.add(new THREE.BoxGeometry(0.52, 0.12, 0.75), belly, 0, -0.04, 0.35, jaw);
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) b.add(new THREE.ConeGeometry(0.03, 0.1, 4), 0xf4f1e8, sx * 0.18, 0.06, 0.4 + k * 0.1, jaw);
  b.glow(new THREE.SphereGeometry(0.1, 6, 4), 0x8fe3ff, 0, 0.0, 0.4, jaw);
  return {
    height: 1.4,
    animate: ({ t, moving, winding, body }) => {
      const f = moving ? 6 : 1.8;
      segs.forEach((s, i) => {
        if (i > 0) s.rotation.y = Math.sin(t * f - i * 0.8) * 0.18;
      });
      fluke.rotation.y = Math.sin(t * f - 4) * 0.4;
      fins[0].rotation.z = Math.sin(t * f) * 0.3;
      fins[1].rotation.z = -Math.sin(t * f) * 0.3;
      head.rotation.x = winding ? -0.45 : Math.sin(t * 1.2) * 0.06;
      jaw.rotation.x = winding ? 0.8 : Math.max(0, Math.sin(t * 1.5)) * 0.15;
      body.position.y = Math.sin(t * 2) * 0.04;
    },
  };
};

export const centaur: ShapeBuild = (b) => {
  const c = b.color; // 馬身
  const skin = 0xd8a880;
  const torso = b.add(new THREE.SphereGeometry(0.42, 9, 7), c, 0, 0.95, -0.2);
  torso.scale.set(0.8, 0.8, 1.55);
  const legs = fourLegs(b, c, 0x2a2420, 0.22, 0.3, -0.7, 0.8, 0.8, 0.09);
  const tail = b.group(0, 1.05, -0.85);
  b.add(new THREE.ConeGeometry(0.1, 0.6, 5), b.dark, 0, -0.25, -0.1, tail).rotation.x = 2.7;
  // 人上身
  const upper = b.group(0, 1.15, 0.38);
  b.add(new THREE.CylinderGeometry(0.2, 0.26, 0.6, 8), skin, 0, 0.3, 0, upper);
  b.add(new THREE.BoxGeometry(0.5, 0.06, 0.3), 0x8a4a2a, 0, 0.45, 0, upper).rotation.z = 0.6; // 箭袋背帶
  const head = b.group(0, 0.78, 0.02, upper);
  b.add(new THREE.SphereGeometry(0.17, 9, 7), skin, 0, 0, 0, head);
  b.add(new THREE.SphereGeometry(0.19, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.55), b.dark, 0, 0.03, -0.02, head);
  b.add(new THREE.ConeGeometry(0.1, 0.25, 5), b.dark, 0, -0.18, 0.12, head).rotation.x = Math.PI; // 鬍子
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.028, 4, 3), b.boss ? 0xff6a4a : 0xffd04a, sx * 0.06, 0.03, 0.15, head);
  if (b.boss) b.add(new THREE.TorusGeometry(0.17, 0.025, 4, 10), 0x5a8a3a, 0, 0.1, 0, head).rotation.x = Math.PI / 2; // 月桂冠
  // 箭袋
  b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 6), 0x6a3a1a, -0.12, 0.45, -0.2, upper).rotation.z = 0.4;
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.27, 0.55, 0, upper);
    b.add(new THREE.CylinderGeometry(0.055, 0.065, 0.5, 6), skin, 0, -0.24, 0, p);
    arms.push(p);
  }
  const bow = b.group(0, -0.5, 0.05, arms[0]);
  b.add(new THREE.TorusGeometry(0.42, 0.022, 4, 12, Math.PI), 0x6a3a1a, 0, 0, 0, bow).rotation.set(0, Math.PI / 2, Math.PI / 2);
  return {
    height: 2.0,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 11) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 出手前：左手持弓伸直、右手拉弦
      arms[0].rotation.x = winding ? -1.5 : -sw * 0.3;
      arms[1].rotation.x = winding ? -1.4 : sw * 0.3;
      arms[1].rotation.z = winding ? 0.5 : 0.1;
      upper.rotation.x = winding ? -0.1 : 0;
      upper.rotation.y = winding ? -0.4 : 0;
      head.rotation.y = Math.sin(t * 0.8) * 0.2;
      tail.rotation.z = Math.sin(t * 4) * 0.3;
      body.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.07 : 0;
      body.rotation.x = lean * 0.25;
    },
  };
};
