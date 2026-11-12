import { patchCloud } from './Atmosphere';
import * as THREE from 'three';
import type { PropDef } from '@/data/types';
import { makeLabelSprite } from './Label';
import { Assets } from '@/assets/Assets';
import { buildGreekProp } from './GreekProps';

/**
 * 場景物件工廠
 * - 有對應的 KayKit 模型（p.model 或下面的預設對應）就用模型，依碰撞尺寸自動縮放；
 * - 沒有模型或載入失敗就用程式產生的低多邊形。
 * 碰撞尺寸（PROP_DEFAULTS / p.w / p.d）與外觀無關，換美術不影響玩法。
 */
export const PROP_DEFAULTS: Record<PropDef['kind'], { w: number; d: number; h: number; solid: boolean; round: boolean }> = {
  house: { w: 8, d: 8, h: 5, solid: true, round: false },
  tree: { w: 2.4, d: 2.4, h: 4.5, solid: true, round: true },
  palm: { w: 1, d: 1, h: 5, solid: true, round: true },
  rock: { w: 2.2, d: 2.2, h: 1.4, solid: true, round: true },
  bush: { w: 1.8, d: 1.8, h: 1.1, solid: false, round: true },
  lamp: { w: 0.5, d: 0.5, h: 3.2, solid: true, round: true },
  fence: { w: 4, d: 0.3, h: 1, solid: true, round: false },
  wall: { w: 4, d: 1, h: 3, solid: true, round: false },
  fountain: { w: 7, d: 7, h: 1.4, solid: true, round: true },
  stairs: { w: 6, d: 4, h: 1.2, solid: false, round: false },
  pillar: { w: 1.4, d: 1.4, h: 3, solid: true, round: true },
  stonering: { w: 9, d: 9, h: 0.1, solid: false, round: true },
  crystal: { w: 1.2, d: 1.2, h: 2.2, solid: true, round: true },
  decor: { w: 1, d: 1, h: 1, solid: true, round: true },
  column: { w: 1.4, d: 1.4, h: 3.6, solid: true, round: true },
  temple: { w: 13, d: 8, h: 7, solid: true, round: false },
  statue: { w: 1.6, d: 1.6, h: 3.6, solid: true, round: false },
  olive: { w: 3, d: 3, h: 3.4, solid: true, round: true },
  cypress: { w: 1.4, d: 1.4, h: 5.5, solid: true, round: true },
  flowers: { w: 3, d: 1.2, h: 0.8, solid: true, round: false },
  bench: { w: 2.2, d: 0.7, h: 0.6, solid: true, round: false },
  stall: { w: 3.2, d: 2, h: 2.3, solid: true, round: false },
  amphora: { w: 0.7, d: 0.7, h: 1.1, solid: true, round: true },
  hedge: { w: 4, d: 0.9, h: 1, solid: true, round: false },
};

/** kind → 預設模型（多個時依座標固定挑一個，看起來不會全部一樣） */
const DEFAULT_MODELS: Partial<Record<PropDef['kind'], string[]>> = {
  tree: ['tree_A', 'tree_B', 'trees_medium'],
  rock: ['rock_A', 'rock_C'],
  fence: ['fence_wood'],
};

/** 模型縮放方式：依高度或依寬度對齊碰撞尺寸 */
const FIT: Partial<Record<PropDef['kind'], 'height' | 'width'>> = { tree: 'height', house: 'width', rock: 'width', fence: 'width', decor: 'height' };

function pickModel(p: PropDef): string | null {
  if (p.model) return Assets.has(p.model) ? p.model : null;
  if (p.color !== undefined && p.kind === 'rock') return null; // 指定顏色的石頭（珊瑚、熔岩）保留程式模型
  const list = DEFAULT_MODELS[p.kind];
  if (!list) return null;
  const id = list[Math.abs(Math.floor(p.x * 7 + p.z * 13)) % list.length];
  return Assets.has(id) ? id : null;
}

function buildModelProp(p: PropDef, id: string, w: number, d: number, h: number): THREE.Object3D | null {
  const obj = Assets.cloneStatic(id);
  if (!obj) return null;
  let size = Assets.size(id);
  // 柵欄 / 牆：模型長邊在 z 軸時轉 90°，讓長邊對齊 x（與碰撞盒一致）
  if ((p.kind === 'fence' || p.kind === 'wall') && size.z > size.x) {
    const inner = new THREE.Group();
    inner.add(obj);
    obj.rotation.y = Math.PI / 2;
    size = new THREE.Vector3(size.z, size.y, size.x);
    return finishModel(p, inner, size, w, d, h);
  }
  return finishModel(p, obj, size, w, d, h);
}

function finishModel(p: PropDef, obj: THREE.Object3D, size: THREE.Vector3, w: number, d: number, h: number): THREE.Object3D {
  const fit = FIT[p.kind] ?? 'height';
  const s = fit === 'height' ? h / Math.max(0.01, size.y) : Math.max(w, d) / Math.max(0.01, Math.max(size.x, size.z));
  obj.scale.setScalar(s);
  const g = new THREE.Group();
  g.add(obj);
  if (p.sign) {
    const label = makeLabelSprite(p.sign, { fontSize: 44, color: '#fff7d6', bg: 'rgba(30,36,52,0.75)', scale: 1.2 });
    label.userData.dodge = true;
    label.position.set(0, size.y * s + 0.6, d / 2);
    g.add(label);
  }
  return g;
}

const matCache = new Map<number, THREE.MeshLambertMaterial>();
export function mat(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    patchCloud(m); // v1.107 雲影也飄過建築與地面色塊
    m.userData.shared = true; // 共用材質：切換區域時不 dispose
    matCache.set(color, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildProp(p: PropDef): THREE.Object3D {
  const def = PROP_DEFAULTS[p.kind];
  const w = p.w ?? def.w;
  const d = p.d ?? def.d;
  const h = p.h ?? def.h;
  const modelId = pickModel(p);
  if (modelId) {
    const mg = buildModelProp(p, modelId, w, d, h);
    if (mg) {
      mg.position.set(p.x, 0, p.z);
      if (p.rot) mg.rotation.y = p.rot;
      return mg;
    }
  }
  const g = new THREE.Group();

  if (buildGreekProp(p, g, w, d, h)) {
    g.position.set(p.x, 0, p.z);
    if (p.rot) g.rotation.y = p.rot;
    return g;
  }

  switch (p.kind) {
    case 'decor':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), p.color ?? 0x9a6a3a, h / 2));
      break;
    case 'house': {
      const wallH = h * 0.55;
      g.add(mesh(new THREE.BoxGeometry(w, wallH, d), 0xf1e6cf, wallH / 2));
      // 斜屋頂：四角錐壓扁
      const roof = mesh(new THREE.ConeGeometry(Math.hypot(w, d) * 0.56, h * 0.6, 4), p.color ?? 0x3d6fb6, wallH + h * 0.3);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
      g.add(roof);
      // 門
      g.add(mesh(new THREE.BoxGeometry(1.4, 2, 0.2), 0x7a5232, 1).translateZ(d / 2 + 0.05));
      if (p.sign) {
        const board = mesh(new THREE.BoxGeometry(Math.min(w * 0.7, 5), 0.9, 0.2), 0x2f4f8a, wallH - 0.4);
        board.position.z = d / 2 + 0.12;
        g.add(board);
        const label = makeLabelSprite(p.sign, { fontSize: 44, color: '#ffffff', bg: 'rgba(0,0,0,0)', scale: 1.3 });
        label.userData.dodge = true;
        label.position.set(0, wallH - 0.4, d / 2 + 0.3);
        g.add(label);
      }
      break;
    }
    case 'tree': {
      g.add(mesh(new THREE.CylinderGeometry(0.25, 0.35, h * 0.4, 6), 0x7a5232, h * 0.2));
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.6, 0), p.color ?? 0x3f9a4a, h * 0.55));
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.42, 0), p.color ?? 0x4fae55, h * 0.82));
      break;
    }
    case 'palm': {
      const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.3, h, 6), 0x9a7448, h / 2);
      trunk.rotation.z = 0.12;
      g.add(trunk);
      for (let i = 0; i < 6; i++) {
        const leaf = mesh(new THREE.ConeGeometry(0.5, 3, 4), 0x3fa45a, h);
        leaf.rotation.set(Math.PI / 2.3, (i / 6) * Math.PI * 2, 0, 'YXZ');
        leaf.translateY(1.3);
        g.add(leaf);
      }
      break;
    }
    case 'rock':
      g.add(mesh(new THREE.DodecahedronGeometry(w * 0.5, 0), p.color ?? 0xcfc3a6, h * 0.35).rotateY(p.x));
      break;
    case 'bush':
      g.add(mesh(new THREE.IcosahedronGeometry(w * 0.5, 0), p.color ?? 0x4f9a3a, h * 0.4));
      break;
    case 'lamp': {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, h, 6), 0x3a3a44, h / 2));
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
      bulb.position.y = h;
      g.add(bulb);
      break;
    }
    case 'fence': {
      g.add(mesh(new THREE.BoxGeometry(w, 0.15, 0.12), 0x9a6a3a, h * 0.75));
      g.add(mesh(new THREE.BoxGeometry(w, 0.15, 0.12), 0x9a6a3a, h * 0.4));
      for (let i = 0; i <= 2; i++) g.add(mesh(new THREE.BoxGeometry(0.2, h, 0.2), 0x8a5a2a, h / 2).translateX(-w / 2 + (i * w) / 2));
      break;
    }
    case 'wall':
      g.add(mesh(new THREE.BoxGeometry(w, h, d), p.color ?? 0xb7a58a, h / 2));
      break;
    case 'fountain': {
      g.add(mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.2, h * 0.6, 12), 0xe8e2d4, h * 0.3));
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(w / 2 - 0.4, w / 2 - 0.4, 0.1, 12),
        new THREE.MeshLambertMaterial({ color: 0x5cc7f0, transparent: true, opacity: 0.9 }),
      );
      water.position.y = h * 0.62;
      g.add(water);
      g.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, h * 1.6, 8), 0xe8e2d4, h * 0.8));
      g.add(mesh(new THREE.CylinderGeometry(1.2, 0.6, 0.3, 10), 0xe8e2d4, h * 1.6));
      break;
    }
    case 'stairs': {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        g.add(mesh(new THREE.BoxGeometry(w, (h / steps) * (i + 1), d / steps), 0xe9e2d0, ((h / steps) * (i + 1)) / 2).translateZ(d / 2 - (d / steps) * (i + 0.5)));
      }
      break;
    }
    case 'pillar': {
      g.add(mesh(new THREE.BoxGeometry(w, h, d), p.color ?? 0xd8d2c2, h / 2));
      g.add(mesh(new THREE.BoxGeometry(w * 1.25, 0.3, d * 1.25), p.color ?? 0xd8d2c2, h));
      break;
    }
    case 'stonering': {
      // 首領石圈：地面的石環＋符文
      const ring = new THREE.Mesh(new THREE.RingGeometry(w / 2 - 0.6, w / 2, 40), mat(p.color ?? 0xcfc6b0));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.receiveShadow = true;
      g.add(ring);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(w / 2 - 0.6, 40), mat(new THREE.Color(p.color ?? 0xcfc6b0).multiplyScalar(0.82).getHex()));
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = 0.02;
      inner.receiveShadow = true;
      g.add(inner);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.18), new THREE.MeshBasicMaterial({ color: 0xffb36b }));
        rune.position.set(Math.cos(a) * (w / 2 - 0.3), 0.06, Math.sin(a) * (w / 2 - 0.3));
        rune.rotation.y = -a;
        g.add(rune);
      }
      break;
    }
    case 'crystal': {
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35 + i * 0.12, 0), new THREE.MeshLambertMaterial({ color: p.color ?? 0x8fe8ff, emissive: p.color ?? 0x8fe8ff, emissiveIntensity: 0.35, flatShading: true }));
        c.scale.y = 2.2;
        c.position.set((i - 1) * 0.35, 0.6 + i * 0.15, (i % 2) * 0.25);
        c.rotation.z = (i - 1) * 0.3;
        c.castShadow = true;
        g.add(c);
      }
      break;
    }
  }

  g.position.set(p.x, 0, p.z);
  if (p.rot) g.rotation.y = p.rot;
  return g;
}
