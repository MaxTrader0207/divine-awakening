import type { ZoneId } from '@/data/types';

/**
 * 破關結算（純邏輯，可測試）
 * - 首領戰期間 Game 用 BossFight 記錄時間、被首領招式打中次數、用藥；
 * - 擊敗首領時 finishClear() 算出評價（S/A/B/C）、更新個人紀錄（存在 GameState.clears，每個存檔＝一個職業）。
 */
export type ClearRank = 'S' | 'A' | 'B' | 'C';

export interface ClearRecord {
  /** 破關次數 */
  count: number;
  /** 最快秒數 */
  best: number;
  /** 最好的評價 */
  bestRank: ClearRank;
}

export interface BossFight {
  zoneId: ZoneId;
  /** 開戰時的遊戲時間（秒） */
  start: number;
  /** 被首領招式（紅色預警）打中 */
  skillHits: number;
  /** 被打中總次數 */
  hits: number;
  /** 開戰時的藥水＋道具總數（用來算用了幾個） */
  itemsAtStart: number;
}

export interface ClearResult {
  zoneId: ZoneId;
  secs: number;
  skillHits: number;
  hits: number;
  itemsUsed: number;
  rank: ClearRank;
  /** 第幾次破關 */
  count: number;
  /** 這次之前的最佳秒數（第一次破關為 undefined） */
  prevBest?: number;
  newRecord: boolean;
  first: boolean;
}

/** 標準時間（秒）：在這之內打完不扣分 */
export const PAR_SECS = 80;

const RANK_ORDER: ClearRank[] = ['S', 'A', 'B', 'C'];

/** 評價：滿分 100，被首領招式打中每次 -6、用藥每個 -2、超過標準時間每 4 秒 -1 */
export function rankClear(secs: number, skillHits: number, itemsUsed: number): ClearRank {
  const score = 100 - skillHits * 6 - itemsUsed * 2 - Math.max(0, secs - PAR_SECS) / 4;
  if (score >= 85) return 'S';
  if (score >= 68) return 'A';
  if (score >= 48) return 'B';
  return 'C';
}

export function betterRank(a: ClearRank, b: ClearRank): ClearRank {
  return RANK_ORDER.indexOf(a) <= RANK_ORDER.indexOf(b) ? a : b;
}

/** 結算並更新紀錄（會修改 clears） */
export function finishClear(clears: Partial<Record<ZoneId, ClearRecord>>, fight: BossFight, now: number, itemsNow: number): ClearResult {
  const secs = Math.max(1, Math.round(now - fight.start));
  const itemsUsed = Math.max(0, fight.itemsAtStart - itemsNow);
  const rank = rankClear(secs, fight.skillHits, itemsUsed);
  const prev = clears[fight.zoneId];
  const rec: ClearRecord = prev
    ? { count: prev.count + 1, best: Math.min(prev.best, secs), bestRank: betterRank(prev.bestRank, rank) }
    : { count: 1, best: secs, bestRank: rank };
  clears[fight.zoneId] = rec;
  return {
    zoneId: fight.zoneId,
    secs,
    skillHits: fight.skillHits,
    hits: fight.hits,
    itemsUsed,
    rank,
    count: rec.count,
    prevBest: prev?.best,
    newRecord: !!prev && secs < prev.best,
    first: !prev,
  };
}

/** 1:05 這種格式 */
export function fmtSecs(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}
