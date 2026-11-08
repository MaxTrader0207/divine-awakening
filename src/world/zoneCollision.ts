import type { PlatformDef, ZoneDef } from '@/data/types';
import { CollisionWorld } from './Collision';
import { PROP_DEFAULTS } from './Props';

/** 石階長度（公尺） */
export const RAMP = 3.5;

/**
 * 依 ZoneDef 建立碰撞（不碰任何 3D 物件，可在單元測試裡用來檢查「首領走得到嗎」）。
 * Zone 建場景時也用這個，所以畫面與碰撞永遠一致。
 */
export function buildZoneCollision(def: ZoneDef, col = new CollisionWorld()): CollisionWorld {
  const { w, d } = def.size;
  col.bounds = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };
  // 水面 / 熔岩 / 毒沼：不能走
  for (const p of def.patches) if (p.water) col.addBox(p.x, p.z, p.w, p.d);
  for (const pf of def.platforms ?? []) addPlatformColliders(col, pf);
  // 會擋路的場景物件
  for (const p of def.props) {
    const pd = PROP_DEFAULTS[p.kind];
    if (!(p.solid ?? pd.solid)) continue;
    const pw = p.w ?? pd.w;
    const pdd = p.d ?? pd.d;
    if (pd.round) col.addCircle(p.x, p.z, Math.max(pw, pdd) * 0.45);
    else if (p.rot && Math.abs(Math.sin(p.rot)) > 0.7) col.addBox(p.x, p.z, pdd, pw);
    else col.addBox(p.x, p.z, pw, pdd);
  }
  return col;
}

/** 高台：北、西、東三邊是峭壁，南邊只留石階缺口（石階兩側有矮牆） */
export function addPlatformColliders(col: CollisionWorld, pf: PlatformDef) {
  const hw = pf.w / 2;
  const hd = pf.d / 2;
  const T = 0.5;
  col.addBox(pf.x, pf.z - hd, pf.w + T, T);
  col.addBox(pf.x - hw, pf.z, T, pf.d + T);
  col.addBox(pf.x + hw, pf.z, T, pf.d + T);
  if (pf.stairs) {
    const s = pf.stairs;
    const gapL = s.x - s.width / 2;
    const gapR = s.x + s.width / 2;
    const leftW = gapL - (pf.x - hw);
    const rightW = pf.x + hw - gapR;
    if (leftW > 0) col.addBox(pf.x - hw + leftW / 2, pf.z + hd, leftW, T);
    if (rightW > 0) col.addBox(gapR + rightW / 2, pf.z + hd, rightW, T);
    col.addBox(gapL - 0.2, pf.z + hd + RAMP / 2, 0.4, RAMP);
    col.addBox(gapR + 0.2, pf.z + hd + RAMP / 2, 0.4, RAMP);
  } else col.addBox(pf.x, pf.z + hd, pf.w + T, T);
}

/**
 * 從 from 走得到 to 嗎？（0.5m 格子 BFS；radius = 角色半徑）。內容測試用。
 */
export function reachable(col: CollisionWorld, from: { x: number; z: number }, to: { x: number; z: number }, radius = 0.55, near = 2.5): boolean {
  const step = 0.5;
  const b = col.bounds;
  const nx = Math.ceil((b.maxX - b.minX) / step);
  const nz = Math.ceil((b.maxZ - b.minZ) / step);
  const free = (i: number, j: number) => {
    const p = { x: b.minX + (i + 0.5) * step, z: b.minZ + (j + 0.5) * step };
    const q = { ...p };
    col.resolve(q, radius);
    return Math.hypot(q.x - p.x, q.z - p.z) < 0.01;
  };
  const toIdx = (x: number, z: number) => [Math.floor((x - b.minX) / step), Math.floor((z - b.minZ) / step)];
  const [si, sj] = toIdx(from.x, from.z);
  const seen = new Uint8Array(nx * nz);
  const queue: number[] = [si, sj];
  seen[sj * nx + si] = 1;
  while (queue.length) {
    const j = queue.pop()!;
    const i = queue.pop()!;
    const x = b.minX + (i + 0.5) * step;
    const z = b.minZ + (j + 0.5) * step;
    if (Math.hypot(x - to.x, z - to.z) < near) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di;
      const c = j + dj;
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
      seen[c * nx + a] = 1;
      if (free(a, c)) queue.push(a, c);
    }
  }
  return false;
}

/**
 * 從 from 出發走得到的範圍（step 公尺格子的洪水填充），回傳查詢函式。
 * 景觀（v1.92）挑寶箱位置用：一次填完，之後每個候選點 O(1) 查詢。
 */
export function reachMap(col: CollisionWorld, from: { x: number; z: number }, radius = 0.55, step = 1): (x: number, z: number) => boolean {
  const b = col.bounds;
  const nx = Math.ceil((b.maxX - b.minX) / step);
  const nz = Math.ceil((b.maxZ - b.minZ) / step);
  const free = (i: number, j: number) => {
    const p = { x: b.minX + (i + 0.5) * step, z: b.minZ + (j + 0.5) * step };
    const q = { ...p };
    col.resolve(q, radius);
    return Math.hypot(q.x - p.x, q.z - p.z) < 0.01;
  };
  const seen = new Uint8Array(nx * nz);
  const si = Math.min(nx - 1, Math.max(0, Math.floor((from.x - b.minX) / step)));
  const sj = Math.min(nz - 1, Math.max(0, Math.floor((from.z - b.minZ) / step)));
  const queue: number[] = [si, sj];
  seen[sj * nx + si] = 2;
  while (queue.length) {
    const j = queue.pop()!;
    const i = queue.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di;
      const c = j + dj;
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a]) continue;
      if (free(a, c)) {
        seen[c * nx + a] = 2;
        queue.push(a, c);
      } else seen[c * nx + a] = 1;
    }
  }
  return (x, z) => {
    const i = Math.floor((x - b.minX) / step);
    const j = Math.floor((z - b.minZ) / step);
    return i >= 0 && j >= 0 && i < nx && j < nz && seen[j * nx + i] === 2;
  };
}
