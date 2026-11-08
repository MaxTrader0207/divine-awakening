import { localDate } from './DailyQuests';

/**
 * 倒下後的復活選擇（v1.82，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 以前倒下一律回主城、扣 10% 金幣——神話難度、首領戰打到一半倒下就得整層重來。現在倒下後可以選：
 * - 原地復活：每天第一次免費，之後花鑽石（同一張地圖連續用越來越貴），不扣金幣；戰場在等你選的期間是停住的，
 *   首領保留目前的血量，復活後有幾秒無敵。
 * - 入口復活：回到這張地圖的入口，扣金幣（跟以前一樣），怪物維持原狀（首領會脫戰回滿血）。
 * - 回主城：跟以前一樣。
 * 試煉塔、每週首領挑戰倒下照舊直接結算（沒有復活選擇）。
 */
export const REVIVE = {
  /** 原地復活的鑽石：第一次 gemBase，同一張地圖每多用一次 +gemStep，最多 gemMax */
  gemBase: 5,
  gemStep: 5,
  gemMax: 30,
  /** 每天免費原地復活次數 */
  freePerDay: 1,
  /** 原地復活後的無敵秒數 */
  invuln: 3,
  /** AUTO 開著時幾秒後自動選「入口復活」 */
  autoSecs: 8,
};

export interface ReviveState {
  /** 最後一次用免費復活的日期 */
  freeDate: string;
  /** 當天用了幾次免費 */
  freeUsed: number;
}

export function newReviveState(): ReviveState {
  return { freeDate: '', freeUsed: 0 };
}

export function normalizeRevive(v: unknown): ReviveState {
  const r = newReviveState();
  if (!v || typeof v !== 'object') return r;
  const o = v as Partial<ReviveState>;
  if (typeof o.freeDate === 'string') r.freeDate = o.freeDate;
  r.freeUsed = Math.max(0, Math.floor(Number(o.freeUsed) || 0));
  return r;
}

export function freeLeft(r: ReviveState, today = localDate()): number {
  return Math.max(0, REVIVE.freePerDay - (r.freeDate === today ? r.freeUsed : 0));
}

/** 原地復活要多少鑽石（0 = 免費）；usedHere = 這次進地圖後已經原地復活幾次 */
export function reviveCost(r: ReviveState, usedHere: number, today = localDate()): number {
  if (freeLeft(r, today) > 0) return 0;
  return Math.min(REVIVE.gemMax, REVIVE.gemBase + REVIVE.gemStep * usedHere);
}

/** 原地復活：扣鑽石或用掉免費次數；鑽石不夠回傳 false */
export function payRevive(r: ReviveState, wallet: { gems: number }, usedHere: number, today = localDate()): boolean {
  const cost = reviveCost(r, usedHere, today);
  if (cost === 0) {
    if (r.freeDate !== today) {
      r.freeDate = today;
      r.freeUsed = 0;
    }
    r.freeUsed++;
    return true;
  }
  if (wallet.gems < cost) return false;
  wallet.gems -= cost;
  return true;
}
