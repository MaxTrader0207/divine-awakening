import { applyDivinity } from './Divinity';
import { equipBlock, rebirthStatMul } from './Rebirth';
import type { EquipSlot, Rarity, Stats } from '@/data/types';
import { ENHANCE_BONUS_PER_LEVEL, ENHANCE_GEM_COST, ENHANCE_RATES, ITEM_BASES, RARITY, RARITY_ORDER, SLOT_ORDER, enhanceCost, sellPrice, statScore , PCT_STAT_KEYS, CRIT_RARITY_DAMP, CRIT_RATE_MAX, CRIT_DMG_MAX, PEN_MAX, enhanceCap } from '@/data/items';
import { statsForLevel } from '@/data/player';
import { CLASSES, RAGE } from '@/data/classes';
import { codexBonus } from '@/data/codex';
import { applySetBonus, setBonusTotal } from '@/data/gearSets';

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
  /** v1.64 怪物圖鑑：點數換成永久加成（攻擊、生命、防禦 %） */
  codex?: Record<string, number>;
  /** v1.76 神格等級：點數分配的永久加成 */
  divinity?: import('./Divinity').DivinityState;
  /** v1.83 轉生：永久加成、裝備階級限制 */
  rebirth?: import('./Rebirth').RebirthState;
}

/** 背包格數（v1.28 從 40 擴充到 100） */
export const INVENTORY_SIZE = 100;

export function itemName(it: ItemInstance): string {
  const b = ITEM_BASES[it.base];
  return `${RARITY[it.rarity].name}・${b?.name ?? it.base}${it.plus > 0 ? ` +${it.plus}` : ''}`;
}

export function itemStats(it: ItemInstance): Partial<Stats> {
  const b = ITEM_BASES[it.base];
  if (!b) return {};
  const plus = Math.min(it.plus, enhanceCap(it));
  const mul = RARITY[it.rarity].mul * (1 + plus * ENHANCE_BONUS_PER_LEVEL);
  // v1.105：百分比屬性（爆擊、爆傷、穿透、移速）不吃強化，稀有度只吃超過 1 的部分的 40%
  const pctMul = 1 + (RARITY[it.rarity].mul - 1) * CRIT_RARITY_DAMP;
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(b.stats) as [keyof Stats, number][]) out[k] = v * (PCT_STAT_KEYS.includes(k) ? pctMul : mul);
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
  // v1.69 神話裝套裝效果（同一套穿 2 / 4 / 6 件）
  applySetBonus(st, setBonusTotal(s.equipment));
  if (s.codex) {
    const b = codexBonus(s.codex);
    st.atk *= 1 + b.atk;
    st.maxHp *= 1 + b.maxHp;
    st.def *= 1 + b.def;
  }
  // v1.76 神格等級（滿級後的點數分配）
  applyDivinity(st, s.divinity);
  // v1.83 轉生：攻擊 / 生命 / 防禦永久加成
  if (s.rebirth?.count) {
    const k = rebirthStatMul(s.rebirth.count);
    st.atk *= k;
    st.maxHp *= k;
    st.def *= k;
  }
  st.maxHp = Math.round(st.maxHp);
  st.maxMp = Math.round(st.maxMp);
  // 怒氣職業：上限固定 100（裝備的 MP 不加怒氣）
  if (CLASSES[s.heroClass ?? 'mage']?.resource === 'rage') st.maxMp = RAGE.max;
  st.atk = Math.round(st.atk);
  st.def = Math.round(st.def * 10) / 10;
  st.pen = Math.min(PEN_MAX, st.pen);
  st.critRate = Math.min(CRIT_RATE_MAX, st.critRate);
  st.critDmg = Math.min(CRIT_DMG_MAX, st.critDmg);
  return st;
}

/** 戰力：粗略評分，排序與比較用 */
export function itemScore(it: ItemInstance): number {
  return statScore(itemStats(it));
}

export function addItem(s: InventoryState, base: string, rarity: Rarity, plus = 0): ItemInstance | null {
  if (s.inventory.length >= INVENTORY_SIZE) return null;
  const it: ItemInstance = { uid: s.nextUid++, base, rarity, plus: Math.min(plus, enhanceCap({ base, rarity })) };
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
  if (equipBlock(s, it)) return false; // v1.83 轉生後的階級限制
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

/**
 * 一鍵賣出會賣掉哪些：稀有度在 maxRarity 以下、沒強化過、不是★神話裝，
 * 而且同欄位身上有穿、身上的比較好（v1.98：★神話裝與身上沒穿東西的欄位不賣，跟撿到時自動賣出一致）
 */
export function junkItems(s: InventoryState, maxRarity: Rarity): ItemInstance[] {
  const limit = RARITY_ORDER.indexOf(maxRarity);
  return s.inventory.filter((it) => {
    const b = ITEM_BASES[it.base];
    if (!b || b.named || it.plus > 0 || RARITY_ORDER.indexOf(it.rarity) > limit) return false;
    const cur = s.equipment[b.slot];
    return !!cur && itemScore(cur) >= itemScore(it);
  });
}

/** 一鍵賣出：比目前裝備差、且稀有度在指定以下的（清單見 junkItems） */
export function sellJunk(s: InventoryState, maxRarity: Rarity): { count: number; gold: number } {
  let count = 0;
  let gold = 0;
  for (const it of junkItems(s, maxRarity)) {
    gold += sell(s, it.uid);
    count++;
  }
  return { count, gold };
}

/**
 * 撿到時自動賣出（v1.80，設定 autoSell）：稀有度在 maxRarity 以下、不是★神話裝、
 * 而且不比同欄位身上的好 → 回傳賣價；不賣回傳 0。（強化過的裝備不會從地上撿到，不用判斷）
 */
export function autoSellPrice(s: InventoryState, base: string, rarity: Rarity, maxRarity: Rarity | 'off'): number {
  if (maxRarity === 'off') return 0;
  const b = ITEM_BASES[base];
  if (!b || b.named) return 0;
  if (RARITY_ORDER.indexOf(rarity) > RARITY_ORDER.indexOf(maxRarity)) return 0;
  const cur = s.equipment[b.slot];
  const it: ItemInstance = { uid: -1, base, rarity, plus: 0 };
  if (!cur || itemScore(cur) < itemScore(it)) return 0;
  return sellPrice(b.tier ?? 1, rarity, 0);
}

export function findItem(s: InventoryState, uid: number): ItemInstance | undefined {
  return s.inventory.find((i) => i.uid === uid) ?? Object.values(s.equipment).find((i) => i?.uid === uid);
}

export type EnhanceResult = 'success' | 'fail' | 'max' | 'no-gold' | 'no-gems' | 'missing';

/** 強化：失敗只扣錢不降級；useGems = 用鑽石保證成功（仍要付金幣） */
export function enhance(s: InventoryState, uid: number, useGems = false, rng: () => number = Math.random): EnhanceResult {
  const it = findItem(s, uid);
  if (!it) return 'missing';
  if (it.plus >= enhanceCap(it)) return 'max';
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
