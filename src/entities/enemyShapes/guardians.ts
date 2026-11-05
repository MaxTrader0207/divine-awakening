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
