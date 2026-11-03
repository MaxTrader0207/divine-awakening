import { expToNext } from '@/data/player';

/**
 * 成長規則（純函式，可單元測試）
 */

/** 等級差修正：玩家比怪高 5 級以上經驗大減，避免在新手區刷等 */
export function expForKill(baseExp: number, playerLevel: number, enemyLevel: number): number {
  const diff = playerLevel - enemyLevel;
  if (diff >= 8) return Math.max(1, Math.round(baseExp * 0.1));
  if (diff >= 5) return Math.max(1, Math.round(baseExp * 0.4));
  if (diff <= -3) return Math.round(baseExp * 1.2);
  return baseExp;
}

export const MAX_LEVEL = 110;

/** 加經驗並處理連續升級；回傳新的等級、經驗與升了幾級 */
export function addExp(level: number, exp: number, gained: number): { level: number; exp: number; levelsGained: number } {
  let l = level;
  let e = exp + gained;
  let n = 0;
  while (l < MAX_LEVEL && e >= expToNext(l)) {
    e -= expToNext(l);
    l++;
    n++;
  }
  if (l >= MAX_LEVEL) e = 0;
  return { level: l, exp: e, levelsGained: n };
}

export function rollGold(range: [number, number], rng: () => number = Math.random): number {
  const [lo, hi] = range;
  return lo + Math.floor(rng() * (hi - lo + 1));
}
