import type { EquipSlot, Rarity, Stats } from '@/data/types';
import { ENHANCE_BONUS_PER_LEVEL, ENHANCE_GEM_COST, ENHANCE_MAX, ENHANCE_RATES, ITEM_BASES, RARITY, RARITY_ORDER, SLOT_ORDER, enhanceCost, sellPrice, statScore } from '@/data/items';
import { statsForLevel } from '@/data/player';
import { CLASSES, RAGE } from '@/data/classes';

/**
 * 背包與裝備（純邏輯，不碰畫面；全部可單元測試）
 * 物品實例只存「底材 id + 稀有度 + 強化等級」，屬性一律即時計算，
 * 之後調整平衡數值時舊存檔會自動套用新數值。
 */
export interface ItemInstance {
  uid: number;
  base: string;
  rarity: Rarity;
  plus: number;
}

export interface InventoryState {
  inventory: ItemInstance[];
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  nextUid: number;
  gold: number;
  gems: number;
  level: number;
  heroClass?: import('@/data/classes').HeroClass;
}

export const INVENTORY_SIZE = 40;

export function itemName(it: ItemInstance): string {
  const b = ITEM_BASES[it.base];
  return `${RARITY[it.rarity].name}・${b?.name ?? it.base}${it.plus > 0 ? ` +${it.plus}` : ''}`;
}

export function itemStats(it: ItemInstance): Partial<Stats> {
  const b = ITEM_BASES[it.base];
  if (!b) return {};
  const mul = RARITY[it.rarity].mul * (1 + it.plus * ENHANCE_BONUS_PER_LEVEL);
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(b.stats) as [keyof Stats, number][]) out[k] = v * mul;
  return out;
}

/** 等級屬性 + 所有裝備 */
export function computeStats(s: InventoryState): Stats {
  const st = statsForLevel(s.level, s.heroClass ?? 'mage');
  for (const slot of SLOT_ORDER) {
    const it = s.equipment[slot];
    if (!it) continue;
    for (const [k, v] of Object.entries(itemStats(it)) as [keyof Stats, number][]) st[k] += v;
  }
  st.maxHp = Math.round(st.maxHp);
  st.maxMp = Math.round(st.maxMp);
  // 怒氣職業：上限固定 100（裝備的 MP 不加怒氣）
  if (CLASSES[s.heroClass ?? 'mage']?.resource === 'rage') st.maxMp = RAGE.max;
  st.atk = Math.round(st.atk);
  st.def = Math.round(st.def * 10) / 10;
  st.pen = Math.min(0.9, st.pen);
  st.critRate = Math.min(0.75, st.critRate);
  return st;
}

/** 戰力：粗略評分，排序與比較用 */
export function itemScore(it: ItemInstance): number {
  return statScore(itemStats(it));
}

export function addItem(s: InventoryState, base: string, rarity: Rarity, plus = 0): ItemInstance | null {
  if (s.inventory.length >= INVENTORY_SIZE) return null;
  const it: ItemInstance = { uid: s.nextUid++, base, rarity, plus };
  s.inventory.push(it);
  return it;
}

/** 從背包裝上；原本的裝備放回背包 */
export function equip(s: InventoryState, uid: number): boolean {
  const idx = s.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) return false;
  const it = s.inventory[idx];
  const slot = ITEM_BASES[it.base]?.slot;
  if (!slot) return false;
  s.inventory.splice(idx, 1);
  const prev = s.equipment[slot];
  s.equipment[slot] = it;
  if (prev) s.inventory.push(prev);
  return true;
}

export function unequip(s: InventoryState, slot: EquipSlot): boolean {
  const it = s.equipment[slot];
  if (!it || s.inventory.length >= INVENTORY_SIZE) return false;
  delete s.equipment[slot];
  s.inventory.push(it);
  return true;
}

export function sell(s: InventoryState, uid: number): number {
  const idx = s.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) return 0;
  const it = s.inventory[idx];
  const price = sellPrice(ITEM_BASES[it.base]?.tier ?? 1, it.rarity, it.plus);
  s.inventory.splice(idx, 1);
  s.gold += price;
  return price;
}

/** 一鍵賣出：比目前裝備差、且稀有度在指定以下的 */
export function sellJunk(s: InventoryState, maxRarity: Rarity): { count: number; gold: number } {
  const limit = RARITY_ORDER.indexOf(maxRarity);
  let count = 0;
  let gold = 0;
  for (const it of [...s.inventory]) {
    if (RARITY_ORDER.indexOf(it.rarity) > limit || it.plus > 0) continue;
    const slot = ITEM_BASES[it.base]?.slot;
    const cur = slot ? s.equipment[slot] : undefined;
    if (cur && itemScore(cur) < itemScore(it)) continue;
    gold += sell(s, it.uid);
    count++;
  }
  return { count, gold };
}

export function findItem(s: InventoryState, uid: number): ItemInstance | undefined {
  return s.inventory.find((i) => i.uid === uid) ?? Object.values(s.equipment).find((i) => i?.uid === uid);
}

export type EnhanceResult = 'success' | 'fail' | 'max' | 'no-gold' | 'no-gems' | 'missing';

/** 強化：失敗只扣錢不降級；useGems = 用鑽石保證成功（仍要付金幣） */
export function enhance(s: InventoryState, uid: number, useGems = false, rng: () => number = Math.random): EnhanceResult {
  const it = findItem(s, uid);
  if (!it) return 'missing';
  if (it.plus >= ENHANCE_MAX) return 'max';
  const tier = ITEM_BASES[it.base]?.tier ?? 1;
  const cost = enhanceCost(tier, it.plus);
  if (s.gold < cost) return 'no-gold';
  if (useGems && s.gems < ENHANCE_GEM_COST) return 'no-gems';
  s.gold -= cost;
  if (useGems) s.gems -= ENHANCE_GEM_COST;
  const ok = useGems || rng() < ENHANCE_RATES[it.plus];
  if (ok) it.plus++;
  return ok ? 'success' : 'fail';
}
