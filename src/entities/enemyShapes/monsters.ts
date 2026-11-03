import * as THREE from 'three';
import type { ShapeBuild, ShapeBuilder } from './types';
import { fourLegs } from './beasts';

/**
 * 冥府之路的怪物造型（v1.32 第十～十二層）：
 *  sphinx  斯芬克斯（獅身、人面、鷹翼；出手前展翼）
 *  dragon  巨龍拉冬（長身四足、背刺、長頸龍頭，出手前抬頭張嘴）
 *  chimera 奇美拉（獅身、背上的山羊頭、蛇頭尾巴，三顆頭都會動，嘴裡有火光）
 */

/** 翅膀：pivot 在肩膀，羽毛沿 ±x 展開 */
export function wing(b: ShapeBuilder, side: number, x: number, y: number, z: number, color: number, tip: number, size = 1): THREE.Group {
  const p = b.group(x, y, z);
  // 一片大翼膜＋三排羽毛
  const base = b.add(new THREE.BoxGeometry(0.8 * size, 0.05, 0.55 * size), color, side * 0.42 * size, 0.08, -0.2 * size, p);
  base.rotation.z = side * 0.2;
  for (let i = 0; i < 4; i++) {
    const f = b.add(new THREE.BoxGeometry(0.95 * size - i * 0.15, 0.04, 0.22 * size), i % 2 ? tip : color, side * (0.55 * size + i * 0.06), 0.2 + i * 0.06 * size, -0.05 - i * 0.16 * size, p);
    f.rotation.z = side * (0.3 + i * 0.1);
  }
  return p;
}

export const sphinx: ShapeBuild = (b) => {
  const c = b.color; // 獅身
  const skin = 0xe8c8a0;
  const torso = b.add(new THREE.SphereGeometry(0.46, 10, 7), c, 0, 0.78, -0.1);
  torso.scale.set(0.8, 0.8, 1.55);
  b.add(new THREE.SphereGeometry(0.38, 9, 7), c, 0, 0.92, 0.38).scale.set(0.95, 1, 0.9);
  // 人面＋埃及風頭巾（藍金條紋）
  const head = b.group(0, 1.28, 0.6);
  b.add(new THREE.SphereGeometry(0.22, 9, 7), skin, 0, 0.02, 0.04, head);
  for (let i = 0; i < 3; i++) b.add(new THREE.BoxGeometry(0.5 - i * 0.04, 0.09, 0.32), i % 2 ? 0x2a4a9a : 0xf0c040, 0, 0.18 - i * 0.12, -0.08, head);
  for (const sx of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.1, 0.36, 0.14), 0xf0c040, sx * 0.24, -0.12, -0.04, head);
    b.glow(new THREE.SphereGeometry(0.035, 5, 4), b.boss ? 0x7ad8ff : 0x9ae0ff, sx * 0.08, 0.04, 0.22, head);
  }
  b.add(new THREE.BoxGeometry(0.1, 0.03, 0.03), 0x7a3a2a, 0, -0.1, 0.23, head);
  const legs = fourLegs(b, c, b.dark, 0.24, 0.42, -0.55, 0.6, 0.6, 0.11);
  const wings = [wing(b, -1, -0.28, 1.08, 0.05, 0xd8b878, 0xf0e0b0), wing(b, 1, 0.28, 1.08, 0.05, 0xd8b878, 0xf0e0b0)];
  const tail = b.group(0, 0.92, -0.78);
  b.add(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 4), c, 0, -0.3, -0.1, tail).rotation.x = 0.4;
  return {
    height: 1.7,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 9) * 0.55 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      // 平常翅膀收在背上微微拍動；出手前張開
      const open = winding ? 1.1 : moving ? 0.35 + Math.sin(t * 8) * 0.25 : 0.15 + Math.sin(t * 1.5) * 0.05;
      wings[0].rotation.z = open;
      wings[1].rotation.z = -open;
      head.rotation.x = winding ? -0.2 : Math.sin(t * 1.2) * 0.05;
      tail.rotation.z = Math.sin(t * 3) * 0.5;
      body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};

export const dragon: ShapeBuild = (b) => {
  const c = b.color;
  const belly = b.light;
  // 身體：前後兩段
  const front = b.add(new THREE.SphereGeometry(0.5, 10, 7), c, 0, 0.85, 0.25);
  front.scale.set(0.85, 0.8, 1.2);
  const back = b.add(new THREE.SphereGeometry(0.45, 10, 7), c, 0, 0.8, -0.45);
  back.scale.set(0.8, 0.75, 1.2);
  b.add(new THREE.BoxGeometry(0.5, 0.12, 1.3), belly, 0, 0.5, -0.05);
  // 背刺（金色）
  for (let i = 0; i < 7; i++) b.add(new THREE.ConeGeometry(0.08, 0.32 - Math.abs(i - 3) * 0.03, 4), 0xf0c040, 0, 1.25 - Math.abs(i - 2) * 0.03, 0.65 - i * 0.22);
  const legs = fourLegs(b, b.dark, 0x2a2420, 0.36, 0.45, -0.6, 0.6, 0.6, 0.13);
  // 長頸＋龍頭
  const neckP = b.group(0, 1.0, 0.65);
  b.add(new THREE.CylinderGeometry(0.17, 0.25, 0.8, 8), c, 0, 0.35, 0.1, neckP).rotation.x = 0.4;
  const head = b.group(0, 0.75, 0.32, neckP);
  b.add(new THREE.BoxGeometry(0.36, 0.3, 0.42), c, 0, 0, 0, head);
  b.add(new THREE.BoxGeometry(0.28, 0.16, 0.36), c, 0, 0.0, 0.36, head);
  const jaw = b.group(0, -0.12, 0.15, head);
  b.add(new THREE.BoxGeometry(0.26, 0.08, 0.42), belly, 0, -0.03, 0.2, jaw);
  b.glow(new THREE.SphereGeometry(0.08, 6, 4), 0xffb030, 0, 0.0, 0.4, jaw); // 喉中火光
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.ConeGeometry(0.05, 0.42, 5), 0xf1ead8, sx * 0.12, 0.2, -0.22, head);
    horn.rotation.x = -1.0;
    b.glow(new THREE.SphereGeometry(0.04, 5, 4), 0xffd040, sx * 0.13, 0.08, 0.12, head);
    for (let k = 0; k < 2; k++) b.add(new THREE.ConeGeometry(0.02, 0.07, 4), 0xf4f1e8, sx * 0.09, -0.1, 0.42 + k * 0.08, head).rotation.x = Math.PI;
  }
  // 尾巴：兩節
  const tail1 = b.group(0, 0.78, -0.95);
  b.add(new THREE.ConeGeometry(0.22, 0.8, 7), c, 0, 0, -0.35, tail1).rotation.x = -Math.PI / 2;
  const tail2 = b.group(0, 0, -0.7, tail1);
  b.add(new THREE.ConeGeometry(0.11, 0.7, 6), c, 0, 0, -0.3, tail2).rotation.x = -Math.PI / 2;
  b.add(new THREE.ConeGeometry(0.1, 0.22, 4), 0xf0c040, 0, 0.06, -0.62, tail2).rotation.x = -Math.PI / 2;
  return {
    height: 2.1,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 8) * 0.5 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      neckP.rotation.x = winding ? -0.45 : Math.sin(t * 1.3) * 0.08;
      neckP.rotation.y = winding ? 0 : Math.sin(t * 0.9) * 0.25;
      jaw.rotation.x = winding ? 0.6 : Math.max(0, Math.sin(t * 1.7)) * 0.12;
      tail1.rotation.y = Math.sin(t * (moving ? 8 : 2)) * 0.35;
      tail2.rotation.y = Math.sin(t * (moving ? 8 : 2) - 0.8) * 0.45;
      body.position.y = moving ? Math.abs(Math.sin(t * 8)) * 0.05 : 0;
      body.rotation.x = lean * 0.25;
    },
  };
};

export const chimera: ShapeBuild = (b) => {
  const c = b.color; // 獅身
  const mane = new THREE.Color(c).lerp(new THREE.Color(0x6a1a0a), 0.5).getHex();
  const torso = b.add(new THREE.SphereGeometry(0.5, 10, 7), c, 0, 0.82, -0.1);
  torso.scale.set(0.85, 0.82, 1.6);
  b.add(new THREE.SphereGeometry(0.42, 9, 7), c, 0, 0.95, 0.38).scale.set(0.95, 0.95, 0.9);
  // 獅頭
  const lion = b.group(0, 1.1, 0.7);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(new THREE.ConeGeometry(0.13, 0.4, 5), mane, Math.cos(a) * 0.25, Math.sin(a) * 0.25, -0.1, lion).rotation.set(Math.PI / 2 - 0.5, 0, 0);
  }
  b.add(new THREE.SphereGeometry(0.32, 9, 7), mane, 0, 0, -0.1, lion);
  b.add(new THREE.SphereGeometry(0.24, 9, 7), c, 0, 0.03, 0.12, lion);
  const lionJaw = b.group(0, -0.12, 0.24, lion);
  b.add(new THREE.BoxGeometry(0.17, 0.06, 0.16), b.light, 0, -0.02, 0.06, lionJaw);
  b.glow(new THREE.SphereGeometry(0.07, 6, 4), 0xff7a1a, 0, 0.02, 0.1, lionJaw);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.04, 5, 4), 0xffb030, sx * 0.1, 0.1, 0.3, lion);
  // 背上的山羊頭
  const goat = b.group(0, 1.25, -0.15);
  b.add(new THREE.CylinderGeometry(0.1, 0.14, 0.4, 6), 0xd8d0c0, 0, 0.18, 0, goat);
  b.add(new THREE.BoxGeometry(0.2, 0.22, 0.32), 0xd8d0c0, 0, 0.42, 0.08, goat);
  b.add(new THREE.ConeGeometry(0.05, 0.14, 4), 0xd8d0c0, 0, 0.26, 0.2, goat).rotation.x = Math.PI; // 鬍子
  for (const sx of [-1, 1]) {
    const horn = b.add(new THREE.TorusGeometry(0.12, 0.035, 4, 8, Math.PI * 1.3), 0x5a4a3a, sx * 0.1, 0.55, -0.02, goat);
    horn.rotation.set(0, Math.PI / 2, 0);
    b.glow(new THREE.SphereGeometry(0.03, 5, 4), 0xc8ff4a, sx * 0.09, 0.47, 0.2, goat);
  }
  // 蛇尾
  const tail = b.group(0, 0.95, -0.8);
  b.add(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6), 0x3a6a3a, 0, 0.3, -0.12, tail).rotation.x = -0.5;
  const snake = b.group(0, 0.62, -0.32, tail);
  b.add(new THREE.SphereGeometry(0.11, 7, 5), 0x3a6a3a, 0, 0, 0.05, snake).scale.set(1, 0.8, 1.4);
  for (const sx of [-1, 1]) b.glow(new THREE.SphereGeometry(0.025, 4, 3), 0xffe25a, sx * 0.06, 0.05, 0.14, snake);
  const legs = fourLegs(b, c, b.dark, 0.26, 0.45, -0.55, 0.62, 0.62, 0.12);
  if (b.boss) for (let i = 0; i < 4; i++) b.glow(new THREE.ConeGeometry(0.09, 0.3, 5), i % 2 ? 0xff9a3c : 0xff4a1a, 0.18 * (i % 2 ? 1 : -1), 1.15, 0.45 - i * 0.18);
  return {
    height: 1.8,
    animate: ({ t, moving, winding, lean, body }) => {
      const sw = moving ? Math.sin(t * 10) * 0.6 : 0;
      legs[0].rotation.x = sw;
      legs[3].rotation.x = sw;
      legs[1].rotation.x = -sw;
      legs[2].rotation.x = -sw;
      lionJaw.rotation.x = winding ? 0.7 : Math.max(0, Math.sin(t * 1.4)) * 0.12;
      lion.rotation.x = winding ? -0.2 : 0;
      goat.rotation.y = Math.sin(t * 1.1) * 0.5;
      goat.rotation.x = winding ? 0.4 : 0;
      tail.rotation.z = Math.sin(t * 2.5) * 0.35;
      snake.rotation.y = Math.sin(t * 3.3) * 0.6;
      snake.rotation.x = winding ? 0.8 : 0.2;
      body.position.y = winding ? -0.08 : moving ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
      body.rotation.x = lean * 0.3;
    },
  };
};
