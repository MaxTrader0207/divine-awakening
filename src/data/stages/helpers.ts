import type { PropDef } from '../types';

/**
 * 關卡版面的小工具（各關卡檔案共用）
 */

/* 小工具：產生一排物件，減少重複資料 */
export function row(kind: PropDef['kind'], x0: number, z0: number, dx: number, dz: number, n: number, extra: Partial<PropDef> = {}): PropDef[] {
  return Array.from({ length: n }, (_, i) => ({ kind, x: x0 + dx * i, z: z0 + dz * i, ...extra }));
}


/** 敵人近戰攻擊：距離、出手前搖（秒）、冷卻 */
export const melee = (range: number, windup: number, cooldown: number) => ({ range, windup, cooldown });

/** 首領石圈周圍的一圈石柱（南側留開口） */
export const pillarRing = (cx: number, cz: number, r: number, n: number, color?: number): PropDef[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return { kind: 'pillar' as const, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, h: 2.6, color };
  }).filter((p) => p.z < cz + r * 0.6); // 石圈南側留開口

/** 固定亂數種子的樹林（avoid：要空出來的圓形空地） */
export function scatterTrees(seed: number, n: number, w: number, d: number, avoid: { x: number; z: number; r: number }[]): PropDef[] {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: PropDef[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const x = (rnd() - 0.5) * (w - 4);
    const z = (rnd() - 0.5) * (d - 4);
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    out.push({ kind: 'tree', x, z, h: 4 + rnd() * 2.5, color: 0x2f6b46 });
  }
  return out;
}

