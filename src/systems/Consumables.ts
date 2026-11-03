import { CONSUMABLE_MAP, type ConsumableDef } from '@/data/consumables';

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
    if (hpUseless && mpUseless) return e.hp && e.mp ? 'HP 和 MP 都是滿的' : e.hp ? 'HP 已滿' : 'MP 已滿';
  }
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

export function addConsumable(bag: ConsumableBag, id: string, n = 1) {
  bag.consumables[id] = (bag.consumables[id] ?? 0) + n;
}
