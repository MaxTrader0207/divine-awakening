import * as THREE from 'three';
import type { PropDef } from '@/data/types';
import { mat } from './Props';

/**
 * 古希臘風格的場景物件（雅典城用）：神殿、石柱、雕像、橄欖樹、柏樹、花圃、長椅、市集攤位、陶罐、樹籬。
 * 全部是程式產生的低多邊形，只用 mat() 共用材質 → Zone.mergeStatic() 會依顏色合併，
 * 整座城多出來的 draw call 只跟「用了幾種顏色」有關，跟物件數量無關。
 * 正面朝 +z（鏡頭方向）；要轉向用 PropDef.rot。
 */

/** 色票（顏色越少，合併後的 draw call 越少） */
export const GREEK = {
  marble: 0xf1ece0,
  marbleShade: 0xd6cdb8,
  terracotta: 0xc8693a,
  black: 0x2b2622,
  wood: 0x9a6a3a,
  trunk: 0x7a5232,
  olive: 0x8fa66a,
  oliveDark: 0x748c55,
  cypress: 0x3f6b3a,
  leaf: 0x4f9a3a,
  soil: 0x6b4a2f,
  blue: 0x3d6fb6,
  white: 0xf7f4ec,
  orange: 0xf29b38,
  red: 0xe2574c,
  yellow: 0xf2c94c,
  purple: 0xb36ad6,
};

const FLOWER_COLORS = [GREEK.red, GREEK.yellow, GREEK.purple, GREEK.white];

function part(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 固定的偽亂數（同一個位置每次產生的花、葉子一樣） */
function rng(seed: number) {
  let s = Math.abs(Math.floor(seed * 9301 + 49297)) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** 多立克石柱：柱礎、10 面柱身（平面著色看起來像有凹槽）、柱頭 */
function column(g: THREE.Object3D, x: number, z: number, h: number, r = 0.32, y0 = 0) {
  g.add(part(new THREE.BoxGeometry(r * 2.6, 0.22, r * 2.6), GREEK.marbleShade, x, y0 + 0.11, z));
  g.add(part(new THREE.CylinderGeometry(r * 0.9, r, h - 0.5, 10), GREEK.marble, x, y0 + 0.22 + (h - 0.5) / 2, z));
  g.add(part(new THREE.CylinderGeometry(r * 1.35, r * 0.9, 0.14, 10), GREEK.marble, x, y0 + h - 0.21, z));
  g.add(part(new THREE.BoxGeometry(r * 2.8, 0.16, r * 2.8), GREEK.marbleShade, x, y0 + h - 0.08, z));
}

/** 雙耳陶罐（雅典黑繪陶的配色：赤陶底、黑色腰帶） */
function amphora(g: THREE.Object3D, x: number, z: number, h: number, y0 = 0, rot = 0) {
  const pts = [
    [0.0, 0],
    [0.16, 0.02],
    [0.2, 0.1],
    [0.34, 0.38],
    [0.36, 0.52],
    [0.28, 0.72],
    [0.14, 0.84],
    [0.13, 0.93],
    [0.19, 1.0],
  ].map(([r, y]) => new THREE.Vector2(r * h, y * h));
  const body = part(new THREE.LatheGeometry(pts, 8), GREEK.terracotta, x, y0, z);
  body.rotation.y = rot;
  g.add(body);
  g.add(part(new THREE.CylinderGeometry(0.365 * h, 0.35 * h, 0.12 * h, 8), GREEK.black, x, y0 + 0.5 * h, z));
  // 把手
  for (const s of [-1, 1]) {
    const handle = part(new THREE.TorusGeometry(0.11 * h, 0.025 * h, 4, 8, Math.PI), GREEK.terracotta, x + Math.cos(rot) * s * 0.2 * h, y0 + 0.8 * h, z - Math.sin(rot) * s * 0.2 * h);
    handle.rotation.set(0, rot + Math.PI / 2, s > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.add(handle);
  }
}

/** 一株花：莖＋花苞 */
function flower(g: THREE.Object3D, x: number, y: number, z: number, color: number, s = 1) {
  g.add(part(new THREE.CylinderGeometry(0.03 * s, 0.03 * s, 0.3 * s, 4), GREEK.leaf, x, y + 0.15 * s, z));
  g.add(part(new THREE.IcosahedronGeometry(0.13 * s, 0), color, x, y + 0.33 * s, z));
}

/** 回傳 true 表示已處理這個 kind */
export function buildGreekProp(p: PropDef, g: THREE.Group, w: number, d: number, h: number): boolean {
  const rand = rng(p.x * 31 + p.z * 17);
  switch (p.kind) {
    case 'column':
      column(g, 0, 0, h, Math.max(w, d) * 0.23);
      return true;

    case 'temple': {
      // 三層台基
      const steps = 3;
      const stepH = 0.3;
      for (let i = 0; i < steps; i++) {
        const inset = i * 0.45;
        g.add(part(new THREE.BoxGeometry(w - inset * 2, stepH, d - inset * 2), i === steps - 1 ? GREEK.marble : GREEK.marbleShade, 0, stepH * (i + 0.5), 0));
      }
      const base = stepH * steps;
      const top = h * 0.62; // 柱高
      const cw = w - 1.6;
      const cd = d - 1.6;
      // 內殿（深色，讓柱子在前面跳出來）
      g.add(part(new THREE.BoxGeometry(cw - 1.6, top, cd - 1.8), GREEK.marbleShade, 0, base + top / 2, 0));
      g.add(part(new THREE.BoxGeometry(1.4, top * 0.62, 0.1), GREEK.trunk, 0, base + (top * 0.62) / 2, (cd - 1.8) / 2 + 0.05));
      // 柱廊：前後各 6 根，左右各補 2 根
      const nFront = 6;
      for (let i = 0; i < nFront; i++) {
        const x = -cw / 2 + (cw / (nFront - 1)) * i;
        column(g, x, cd / 2, top, 0.34, base);
        column(g, x, -cd / 2, top, 0.34, base);
      }
      for (let i = 1; i <= 2; i++) {
        const z = -cd / 2 + (cd / 3) * i;
        column(g, -cw / 2, z, top, 0.34, base);
        column(g, cw / 2, z, top, 0.34, base);
      }
      // 楣樑＋三角山牆＋屋頂
      const eY = base + top;
      g.add(part(new THREE.BoxGeometry(cw + 1, 0.5, cd + 1), GREEK.marble, 0, eY + 0.25, 0));
      g.add(part(new THREE.BoxGeometry(cw + 1.1, 0.16, cd + 1.1), GREEK.blue, 0, eY + 0.58, 0)); // 楣樑上的藍色飾帶
      const roofH = h - eY - 0.66;
      for (const s of [-1, 1]) {
        // 3 面的圓柱 = 三角柱；轉 -90° 後尖端朝上，三角形底邊在重心下方 1/3 高度
        const ped = part(new THREE.CylinderGeometry(1, 1, 0.4, 3), GREEK.marble, 0, eY + 0.66 + roofH / 3, s * (cd / 2 + 0.35));
        ped.rotation.x = -Math.PI / 2;
        ped.scale.set((cw + 1) / 1.73, 1, roofH / 1.5);
        g.add(ped);
      }
      // 屋頂：兩片斜板（赤陶瓦）
      const slope = Math.atan2(roofH, (cw + 1) / 2);
      const len = Math.hypot(roofH, (cw + 1) / 2) + 0.2;
      for (const s of [-1, 1]) {
        const r = part(new THREE.BoxGeometry(len, 0.18, cd + 1.3), GREEK.terracotta, s * (cw + 1) / 4, eY + 0.66 + roofH / 2, 0);
        r.rotation.z = -s * slope;
        g.add(r);
      }
      return true;
    }

    case 'statue': {
      // 雅典娜像：台座、長袍、頭盔羽冠、盾、長矛（全白大理石）
      const ph = h * 0.32;
      g.add(part(new THREE.BoxGeometry(w * 0.9, ph, d * 0.9), GREEK.marbleShade, 0, ph / 2, 0));
      g.add(part(new THREE.BoxGeometry(w, 0.16, d), GREEK.marble, 0, ph + 0.08, 0));
      const bh = h - ph - 0.16;
      const y0 = ph + 0.16;
      g.add(part(new THREE.CylinderGeometry(w * 0.16, w * 0.3, bh * 0.62, 8), GREEK.marble, 0, y0 + bh * 0.31, 0)); // 長袍
      g.add(part(new THREE.CylinderGeometry(w * 0.2, w * 0.16, bh * 0.16, 8), GREEK.marble, 0, y0 + bh * 0.7, 0)); // 胸
      g.add(part(new THREE.IcosahedronGeometry(w * 0.12, 1), GREEK.marble, 0, y0 + bh * 0.86, 0)); // 頭
      g.add(part(new THREE.BoxGeometry(w * 0.05, w * 0.12, w * 0.3), GREEK.marble, 0, y0 + bh * 0.97, -0.02)); // 羽冠
      const shield = part(new THREE.CylinderGeometry(w * 0.2, w * 0.2, 0.06, 10), GREEK.marble, -w * 0.25, y0 + bh * 0.42, 0.05);
      shield.rotation.z = Math.PI / 2;
      shield.rotation.y = 0.35;
      g.add(shield);
      g.add(part(new THREE.CylinderGeometry(0.035, 0.035, bh * 1.05, 4), GREEK.marble, w * 0.24, y0 + bh * 0.52, 0.05)); // 長矛
      g.add(part(new THREE.ConeGeometry(0.07, 0.22, 4), GREEK.marble, w * 0.24, y0 + bh * 1.08, 0.05));
      return true;
    }

    case 'olive': {
      // 歪斜的雙幹＋銀綠色樹冠
      const lean = (rand() - 0.5) * 0.5;
      const t1 = part(new THREE.CylinderGeometry(0.16, 0.3, h * 0.5, 6), GREEK.trunk, -0.15, h * 0.24, 0);
      t1.rotation.z = 0.25 + lean;
      g.add(t1);
      const t2 = part(new THREE.CylinderGeometry(0.12, 0.22, h * 0.45, 6), GREEK.trunk, 0.2, h * 0.24, 0.05);
      t2.rotation.z = -0.3 + lean;
      g.add(t2);
      for (let i = 0; i < 4; i++) {
        const a = rand() * Math.PI * 2;
        const r = w * (0.18 + rand() * 0.15);
        const s = w * (0.3 + rand() * 0.12);
        const blob = part(new THREE.DodecahedronGeometry(s, 0), i % 2 ? GREEK.olive : GREEK.oliveDark, Math.cos(a) * r, h * (0.62 + rand() * 0.2), Math.sin(a) * r);
        blob.scale.y = 0.7;
        g.add(blob);
      }
      return true;
    }

    case 'cypress': {
      g.add(part(new THREE.CylinderGeometry(0.12, 0.16, h * 0.2, 5), GREEK.trunk, 0, h * 0.1, 0));
      g.add(part(new THREE.CylinderGeometry(w * 0.05, w * 0.42, h * 0.6, 7), GREEK.cypress, 0, h * 0.45, 0));
      g.add(part(new THREE.ConeGeometry(w * 0.32, h * 0.42, 7), GREEK.cypress, 0, h * 0.78, 0));
      return true;
    }

    case 'flowers': {
      // 大理石花台＋泥土＋各色小花
      const ph = 0.45;
      g.add(part(new THREE.BoxGeometry(w, ph, d), GREEK.marbleShade, 0, ph / 2, 0));
      g.add(part(new THREE.BoxGeometry(w - 0.2, 0.05, d - 0.2), GREEK.soil, 0, ph + 0.01, 0));
      const nx = Math.max(2, Math.round(w / 0.45));
      const nz = Math.max(1, Math.round(d / 0.45));
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          const x = -w / 2 + 0.25 + ((w - 0.5) / Math.max(1, nx - 1)) * i + (rand() - 0.5) * 0.12;
          const z = nz === 1 ? 0 : -d / 2 + 0.25 + ((d - 0.5) / (nz - 1)) * j;
          flower(g, x, ph, z, FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)], 0.8 + rand() * 0.4);
        }
      return true;
    }

    case 'bench': {
      g.add(part(new THREE.BoxGeometry(w, 0.14, d), GREEK.marble, 0, 0.5, 0));
      for (const s of [-1, 1]) g.add(part(new THREE.BoxGeometry(0.28, 0.43, d * 0.8), GREEK.marbleShade, s * (w / 2 - 0.3), 0.215, 0));
      return true;
    }

    case 'stall': {
      // 市集攤位：木頭櫃台、四根柱子、藍白條紋遮棚、陶罐與水果
      const ch = 0.95;
      g.add(part(new THREE.BoxGeometry(w, ch, d * 0.45), GREEK.wood, 0, ch / 2, d * 0.2));
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) g.add(part(new THREE.BoxGeometry(0.12, h, 0.12), GREEK.trunk, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)));
      const stripes = 5;
      const tilt = 0.28;
      for (let i = 0; i < stripes; i++) {
        const sw = w / stripes;
        const c = part(new THREE.BoxGeometry(sw + 0.01, 0.06, d + 0.5), i % 2 ? GREEK.white : GREEK.blue, -w / 2 + sw * (i + 0.5), h + 0.05, 0.1);
        c.rotation.x = tilt;
        g.add(c);
      }
      // 遮棚前緣的垂邊
      for (let i = 0; i < stripes; i++) {
        const sw = w / stripes;
        g.add(part(new THREE.BoxGeometry(sw + 0.01, 0.28, 0.05), i % 2 ? GREEK.blue : GREEK.white, -w / 2 + sw * (i + 0.5), h - 0.11, d / 2 + 0.33));
      }
      // 商品
      const goods = Math.max(2, Math.floor(w / 0.8));
      for (let i = 0; i < goods; i++) {
        const x = -w / 2 + 0.45 + ((w - 0.9) / Math.max(1, goods - 1)) * i;
        if (i % 2 === 0) amphora(g, x, d * 0.2, 0.55, ch, rand() * 3);
        else {
          for (let k = 0; k < 3; k++)
            g.add(part(new THREE.IcosahedronGeometry(0.1, 0), k === 1 ? GREEK.yellow : GREEK.orange, x + (k - 1) * 0.16, ch + 0.1 + (k === 1 ? 0.12 : 0), d * 0.2 + (rand() - 0.5) * 0.1));
        }
      }
      return true;
    }

    case 'amphora':
      amphora(g, 0, 0, h, 0, rand() * Math.PI * 2);
      return true;

    case 'hedge': {
      const hh = part(new THREE.BoxGeometry(w, h, d), GREEK.cypress, 0, h / 2, 0);
      g.add(hh);
      // 頂部幾顆圓球，看起來不是方塊
      const n = Math.max(1, Math.round(Math.max(w, d) / 1.2));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n - 0.5;
        g.add(part(new THREE.DodecahedronGeometry(Math.min(w, d) * 0.55, 0), GREEK.leaf, w >= d ? t * w : 0, h, w >= d ? 0 : t * d));
      }
      return true;
    }
  }
  return false;
}
