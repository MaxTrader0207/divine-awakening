import * as THREE from 'three';
import type { ShapeBuild } from './types';
import { fourLegs } from './beasts';

/**
 * 英雄試煉的怪物造型（v1.31 第七～九層）：
 *  boar    厄律曼托斯野豬（四足、獠牙、背鬃，出手前低頭刨地）
 *  lion    涅墨亞獅（首領：金色鬃毛、刀槍不入的獅皮，出手前伏低張嘴）
 *  gorgon  戈爾貢（蛇尾人身、蛇髮會蠕動、雙眼發光；首領版梅杜莎更大、蛇髮更多、拿弓）
 *  cyclops 獨眼巨人（獨眼、粗棒；首領版波呂斐摩斯有羊皮披肩、出手前高舉巨棒）
 */

export const boar: ShapeBuild = (b) => {
  const c = b.color;
  const torso = b.add(new THREE.SphereGeometry(0.5, 9, 7), c, 0, 0.72, -0.05);
  torso.scale.set(0.85, 0.85, 1.45);
  // 背鬃
  for (let i = 0; i < 6; i++) b.add(new THREE.ConeGeometry(0.06, 0.28, 4), b.dark, 0, 1.15 - Math.abs(i - 2) * 0.03, 0.45 - i * 0.18).rotation.x = -0.4;
  const head = b.group(0, 0.75, 0.62);
  b.add(new THREE.BoxGeometry(0.42, 0.4, 0.42), c, 0, 0, 0.12, head);
  b.add(new THREE.CylinderGeometry(0.14, 0.17, 0.22, 7), b.light, 0, -0.06, 0.42, head).rotation.x = Math.PI / 2; // 豬鼻
  b.add(new THREE.CircleGeometry(0.12, 7), 0x3a2a2a, 0, -0.06, 0.535, head);
  for (const sx of [-1, 1]) {
    const tusk = b.add(new THREE.ConeGeometry(0.045, 0.32, 5), 0xf4f1e0, sx * 0.17, -0.06, 0.42, head);
    tusk.rotation.set(-0.6, 0, sx * -0.5);
    b.glow(new THREE.SphereGeometry(0.035, 5, 4), 0xff4a2a, sx * 0.14, 0.1, 0.33, head);
    b.add(new THREE.ConeGeometry(0.07, 0.16, 4), b.dark, sx * 0.17, 0.25, 0.02, head).rotation.z = -sx * 0.4;
  }
  const legs = fourLegs(b, b.dark, 0x1e1a18, 0.24, 0.4, -0.45, 0.45, 0.45, 0.09);
  const tail = b.group(0, 0.8, -0.72);
  b.add(new THREE.TorusGeometry(0.06, 0.02, 4, 8, Math.PI * 1.5), b.dark, 0, 0, -0.04, tail);
  return {
    height: 1.25,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 14) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      if (winding) legs[0].rotation.x = Math.sin(t * 20) * 0.6; // 刨地
      head.rotation.x = winding ? 0.45 : Math.sin(t * 2.5) * 0.06;
      tail.rotation.z = Math.sin(t * 9) * 0.4;
      body.position.y = moving ? Math.abs(Math.sin(t * 14)) * 0.05 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const lion: ShapeBuild = (b) => {
  const c = b.color; // 毛色
  const mane = new THREE.Color(c).lerp(new THREE.Color(0x7a3a12), 0.45).getHex();
  const torso = b.add(new THREE.SphereGeometry(0.48, 10, 7), c, 0, 0.8, -0.1);
  torso.scale.set(0.82, 0.8, 1.6);
  b.add(new THREE.SphereGeometry(0.42, 9, 7), c, 0, 0.92, 0.35).scale.set(0.95, 0.95, 0.9);
  const head = b.group(0, 1.08, 0.68);
  // 鬃毛：一圈錐形
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const m = b.add(new THREE.ConeGeometry(0.13, 0.42, 5), mane, Math.cos(a) * 0.26, Math.sin(a) * 0.26 + 0.02, -0.08, head);
    m.rotation.set(Math.PI / 2 - 0.5, 0, a - Math.PI / 2);
    m.rotation.order = 'ZXY';
  }
  b.add(new THREE.SphereGeometry(0.33, 9, 7), mane, 0, 0.02, -0.1, head);
  b.add(new THREE.SphereGeometry(0.24, 9, 7), c, 0, 0.04, 0.12, head).scale.set(1, 0.95, 1.05);
  b.add(new THREE.BoxGeometry(0.2, 0.14, 0.18), b.light, 0, -0.06, 0.3, head); // 口鼻
  b.add(new THREE.BoxGeometry(0.08, 0.05, 0.05), 0x2a1a14, 0, 0.02, 0.4, head);
  const jaw = b.group(0, -0.13, 0.22, head);
  b.add(new THREE.BoxGeometry(0.16, 0.06, 0.16), b.light, 0, -0.02, 0.06, jaw);
  for (const sx of [-1, 1]) {
    b.glow(new THREE.SphereGeometry(0.04, 5, 4), b.boss ? 0xffd34a : 0xffa03a, sx * 0.1, 0.12, 0.28, head);
    b.add(new THREE.ConeGeometry(0.03, 0.1, 4), 0xf4f1e8, sx * 0.06, -0.12, 0.36, head).rotation.x = Math.PI;
    b.add(new THREE.SphereGeometry(0.07, 6, 4), mane, sx * 0.2, 0.26, 0.02, head);
  }
  const legs = fourLegs(b, c, b.dark, 0.24, 0.45, -0.55, 0.6, 0.6, 0.11);
  const tail = b.group(0, 0.95, -0.8);
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.75, 4), c, 0, -0.35, -0.1, tail).rotation.x = 0.4;
  b.add(new THREE.SphereGeometry(0.08, 5, 4), mane, 0, -0.7, -0.24, tail);
  if (b.boss) {
    // 刀槍不入的金色獅皮：背上一道金光紋
    for (let i = 0; i < 4; i++) b.glow(new THREE.BoxGeometry(0.06, 0.03, 0.22), 0xffe08a, 0, 1.2, 0.3 - i * 0.3);
  }
  return {
    height: 1.55,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 10) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 出手前伏低、張大嘴
      body.position.y = winding ? -0.12 : moving ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
      jaw.rotation.x = winding ? 0.7 : Math.max(0, Math.sin(t * 1.3)) * 0.1;
      head.rotation.x = winding ? -0.15 : Math.sin(t * 1.6) * 0.05;
      tail.rotation.z = Math.sin(t * 3) * 0.5;
      tail.rotation.x = winding ? -0.6 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const gorgon: ShapeBuild = (b) => {
  const c = b.color; // 鱗片
  const skin = new THREE.Color(c).lerp(new THREE.Color(0xbfe0b0), 0.55).getHex();
  const boss = b.boss;
  // 蛇尾：盤在地上
  const coil = b.add(new THREE.TorusGeometry(0.5, 0.2, 7, 16), c, 0, 0.2, -0.15);
  coil.rotation.x = Math.PI / 2;
  b.add(new THREE.ConeGeometry(0.14, 0.7, 6), b.dark, -0.62, 0.15, -0.55).rotation.set(0, 0.6, 1.45);
  b.add(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 8), c, 0, 0.55, 0.1);
  // 上半身（米白長袍＋金色胸甲）
  b.add(new THREE.CylinderGeometry(0.2, 0.25, 0.55, 8), 0xe8e0c8, 0, 1.05, 0.1);
  b.add(new THREE.CylinderGeometry(0.22, 0.2, 0.2, 8), 0xd8a83a, 0, 1.25, 0.1);
  const head = b.group(0, 1.48, 0.1);
  b.add(new THREE.SphereGeometry(0.19, 9, 7), skin, 0, 0.05, 0, head);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.04, 6, 4), boss ? 0xfff27a : 0xc8ff6a, sx * 0.07, 0.07, 0.16, head);
  // 蛇髮：每條一個 pivot 會蠕動
  const hairs: THREE.Group[] = [];
  const n = boss ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = b.group(Math.cos(a) * 0.14, 0.14, Math.sin(a) * 0.14 - 0.03, head);
    p.rotation.set(Math.sin(a) * -0.9, 0, Math.cos(a) * -0.9);
    b.add(new THREE.CylinderGeometry(0.025, 0.04, 0.3, 5), c, 0, 0.15, 0, p);
    b.add(new THREE.SphereGeometry(0.05, 5, 4), b.dark, 0, 0.32, 0.02, p).scale.set(1, 0.8, 1.4);
    hairs.push(p);
  }
  // 手臂
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.27, 1.25, 0.1);
    b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 6), skin, 0, -0.26, 0, p);
    b.add(new THREE.SphereGeometry(0.07, 5, 4), skin, 0, -0.55, 0, p);
    arms.push(p);
  }
  if (boss) {
    // 青銅弓
    const bow = b.add(new THREE.TorusGeometry(0.45, 0.025, 4, 12, Math.PI), 0xb8863a, 0, -0.55, 0.12, arms[0]);
    bow.rotation.set(0, Math.PI / 2, Math.PI / 2);
  }
  return {
    height: boss ? 1.9 : 1.75,
    animate: ({ t, moving, winding, body }) => {
      hairs.forEach((h, i) => {
        h.rotation.y = Math.sin(t * 4 + i * 1.3) * 0.5;
      });
      // 出手前：雙手張開、頭往前（石化凝視）
      arms[0].rotation.z = winding ? -1.3 : -0.15 + Math.sin(t * 2) * 0.05;
      arms[1].rotation.z = winding ? 1.3 : 0.15 - Math.sin(t * 2) * 0.05;
      arms[0].rotation.x = winding ? -0.8 : 0;
      arms[1].rotation.x = winding ? -0.8 : 0;
      head.rotation.x = winding ? 0.25 : Math.sin(t * 1.4) * 0.05;
      body.rotation.y = moving ? Math.sin(t * 7) * 0.12 : 0;
      body.position.y = Math.sin(t * 2) * 0.03;
    },
  };
};

export const cyclops: ShapeBuild = (b) => {
  const c = b.color; // 皮膚
  const boss = b.boss;
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.28, 0.95, 0);
    b.add(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 7), c, 0, -0.27, 0, p);
    b.add(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 7), c, 0, -0.72, 0, p);
    b.add(new THREE.BoxGeometry(0.24, 0.1, 0.34), 0x5a3a22, 0, -0.92, 0.06, p);
    legs.push(p);
  }
  // 腰布、大肚子
  b.add(new THREE.CylinderGeometry(0.46, 0.4, 0.32, 8), 0x7a5a3a, 0, 1.0, 0);
  const belly = b.add(new THREE.SphereGeometry(0.58, 10, 8), c, 0, 1.5, 0.02);
  belly.scale.set(1.1, 1, 0.85);
  if (boss) {
    // 羊皮披肩
    b.add(new THREE.SphereGeometry(0.5, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xf1ead8, 0, 1.75, -0.08).scale.set(1.25, 0.7, 1);
  }
  const head = b.group(0, 2.0, 0.05);
  b.add(new THREE.SphereGeometry(0.33, 10, 8), c, 0, 0.1, 0, head);
  b.add(new THREE.SphereGeometry(0.13, 8, 6), 0xffffff, 0, 0.18, 0.27, head);
  b.glow(new THREE.SphereGeometry(0.07, 6, 5), boss ? 0xff5a2a : 0x3a8aff, 0, 0.18, 0.37, head);
  b.add(new THREE.BoxGeometry(0.3, 0.05, 0.08), b.dark, 0, 0.33, 0.25, head).rotation.z = 0; // 粗眉
  b.add(new THREE.BoxGeometry(0.22, 0.05, 0.05), 0x2a1a14, 0, -0.08, 0.3, head); // 嘴
  for (const sx of [-1, 1]) b.add(new THREE.ConeGeometry(0.03, 0.08, 4), 0xf4f1e8, sx * 0.07, -0.05, 0.31, head);
  if (boss) b.add(new THREE.ConeGeometry(0.06, 0.25, 5), 0xd8c8a8, 0, 0.45, 0.05, head); // 頭上的角
  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const p = b.group(sx * 0.66, 1.85, 0);
    b.add(new THREE.SphereGeometry(0.22, 7, 5), c, 0, 0, 0, p);
    b.add(new THREE.CylinderGeometry(0.14, 0.16, 0.6, 7), c, 0, -0.32, 0, p);
    b.add(new THREE.CylinderGeometry(0.13, 0.14, 0.5, 7), c, 0, -0.8, 0.05, p);
    b.add(new THREE.SphereGeometry(0.15, 6, 5), c, 0, -1.08, 0.08, p);
    arms.push(p);
  }
  // 巨棒（右手）
  const club = b.group(0, -1.1, 0.1, arms[1]);
  b.add(new THREE.CylinderGeometry(0.16, 0.07, 1.5, 7), 0x6b4a2a, 0, 0.55, 0, club);
  for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(0.05, 0.14, 4), 0x4a3220, Math.cos(i * 1.6) * 0.15, 1.0 + i * 0.07, Math.sin(i * 1.6) * 0.15, club).rotation.z = Math.cos(i * 1.6) * -1.4;
  club.rotation.x = 1.3;
  return {
    height: 2.5,
    animate: ({ t, moving, winding, body }) => {
      const sw = moving ? Math.sin(t * 6) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.5;
      arms[1].rotation.x = winding ? -2.7 : sw * 0.4 - 0.15;
      head.rotation.y = Math.sin(t * 0.7) * 0.2;
      body.position.y = moving ? Math.abs(Math.sin(t * 6)) * 0.07 : 0;
      body.rotation.z = moving ? Math.sin(t * 6) * 0.04 : 0;
    },
  };
};
