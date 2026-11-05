import { CONSUMABLE_MAP, MAX_STACK, type ConsumableDef } from '@/data/consumables';

/**
 * 道具使用的判斷與扣數量（純邏輯，可單元測試）。效果由 Game 套用。
 */
export interface ConsumableBag {
  consumables: Record<string, number>;
}

export interface UseContext {
  /** 在安全區（城裡） */
  safe: boolean;
  /** 首領戰中 */
  bossFight: boolean;
  hpFull: boolean;
  mpFull: boolean;
  /** 藥水冷卻中 */
  potionCd: boolean;
  alive: boolean;
}

/** 回傳 null = 可以用；否則是不能用的原因 */
export function cannotUse(bag: ConsumableBag, id: string, ctx: UseContext): string | null {
  const def = CONSUMABLE_MAP[id];
  if (!def) return '沒有這個道具';
  if ((bag.consumables[id] ?? 0) <= 0) return `${def.name}用完了`;
  if (!ctx.alive) return '倒地中不能使用';
  const e = def.effect;
  if (def.sharesPotionCd && ctx.potionCd) return '藥水冷卻中';
  if (e.type === 'heal') {
    const hpUseless = !e.hp || ctx.hpFull;
    const mpUseless = !(e.mp || e.rage) || ctx.mpFull;
    if (hpUseless && mpUseless) return e.hp && e.mp ? 'HP 和 MP 都是滿的' : e.hp ? 'HP 已滿' : e.rage && !e.mp ? '怒氣已滿' : 'MP 已滿';
  }
  if (e.type === 'nova' && ctx.safe) return '城裡沒有敵人';
  if (e.type === 'town') {
    if (ctx.safe) return '已經在城裡了';
    if (ctx.bossFight) return '首領戰中不能傳送';
  }
  return null;
}

/** 扣掉一個並回傳定義（不能用時回傳 null） */
export function consume(bag: ConsumableBag, id: string, ctx: UseContext): ConsumableDef | null {
  if (cannotUse(bag, id, ctx)) return null;
  bag.consumables[id] = (bag.consumables[id] ?? 0) - 1;
  if (bag.consumables[id] <= 0) delete bag.consumables[id];
  return CONSUMABLE_MAP[id];
}

/** 加入道具；超過上限（每種 99 個）時不加，回傳 false */
export function addConsumable(bag: ConsumableBag, id: string, n = 1): boolean {
  const cur = bag.consumables[id] ?? 0;
  if (cur + n > MAX_STACK) return false;
  bag.consumables[id] = cur + n;
  return true;
}

/* ---------------- 快捷道具欄（v1.53：左下紅藍藥水旁的 2 格） ---------------- */

/** 快捷欄格數 */
export const QUICK_SLOTS = 2;

/** 沒設定過時自動挑：持有數量最多的道具（回城羽毛排最後），不足補 null */
export function autoQuickSlots(consumables: Record<string, number>): (string | null)[] {
  const ids = Object.keys(consumables)
    .filter((id) => CONSUMABLE_MAP[id] && consumables[id] > 0)
    .sort((a, b) => Number(CONSUMABLE_MAP[a].effect.type === 'town') - Number(CONSUMABLE_MAP[b].effect.type === 'town') || consumables[b] - consumables[a]);
  return Array.from({ length: QUICK_SLOTS }, (_, i) => ids[i] ?? null);
}

/**
 * 把道具放進第 slot 格（0 起算）。已在另一格的話兩格交換；
 * 放進已經是同一個道具的格子 = 取下（清空）。回傳新的陣列。
 */
export function setQuickSlot(slots: (string | null)[], slot: number, id: string): (string | null)[] {
  const out = Array.from({ length: QUICK_SLOTS }, (_, i) => slots[i] ?? null);
  if (out[slot] === id) {
    out[slot] = null;
    return out;
  }
  const other = out.indexOf(id);
  if (other >= 0) out[other] = out[slot];
  out[slot] = id;
  return out;
}
