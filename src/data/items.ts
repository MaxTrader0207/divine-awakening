import type { EquipSlot, Rarity, Stats } from './types';

/**
 * 裝備資料
 * ------------------------------------------------------------
 * 裝備 = 底材（slot × tier）× 稀有度倍率 × 強化倍率。
 * tier 1 = 新手草原 / 第一層、tier 2 = 第二層、tier 3 = 第三層。
 * 「穿透」集中在帽子與戒指：這是突破第二、三層防禦的關鍵。
 */

export interface ItemBase {
  id: string;
  slot: EquipSlot;
  tier: 1 | 2 | 3;
  name: string;
  icon: string;
  stats: Partial<Stats>;
}

export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '法杖',
  hat: '帽子',
  robe: '法袍',
  gloves: '手套',
  boots: '鞋子',
  ring: '戒指',
};

export const SLOT_ORDER: EquipSlot[] = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'];

export const RARITY: Record<Rarity, { name: string; mul: number; color: string; weight: number; bossWeight: number }> = {
  common: { name: '普通', mul: 1, color: '#d8dbe2', weight: 60, bossWeight: 0 },
  fine: { name: '精良', mul: 1.3, color: '#6fd36a', weight: 28, bossWeight: 50 },
  rare: { name: '稀有', mul: 1.7, color: '#5cb2ff', weight: 10, bossWeight: 38 },
  epic: { name: '史詩', mul: 2.2, color: '#c38bff', weight: 2, bossWeight: 12 },
};

export const RARITY_ORDER: Rarity[] = ['common', 'fine', 'rare', 'epic'];

/** 每個欄位 tier 1 的基礎屬性 */
const T1: Record<EquipSlot, Partial<Stats>> = {
  weapon: { atk: 8 },
  hat: { maxMp: 20, pen: 0.04 },
  robe: { maxHp: 60, def: 4 },
  gloves: { atk: 3, critRate: 0.03 },
  boots: { moveSpeed: 0.3, def: 2 },
  ring: { pen: 0.05, critDmg: 0.1 },
};

/** 平坦數值與百分比數值的 tier 成長不同，避免百分比爆掉 */
const FLAT_SCALE = [1, 2.2, 3.6];
const PCT_SCALE = [1, 1.6, 2.2];
const PCT_KEYS: (keyof Stats)[] = ['pen', 'critRate', 'critDmg', 'moveSpeed'];

const NAMES: Record<EquipSlot, [string, string, string]> = {
  weapon: ['見習法杖', '珊瑚法杖', '熔心法杖'],
  hat: ['見習尖帽', '潮汐尖帽', '熔岩尖帽'],
  robe: ['見習法袍', '珊瑚法袍', '熔心法袍'],
  gloves: ['布手套', '潮風手套', '焰紋手套'],
  boots: ['布靴', '浪行靴', '焦土靴'],
  ring: ['銅戒', '珍珠戒', '火紋戒'],
};

const ICONS: Record<EquipSlot, string> = { weapon: '🪄', hat: '🎩', robe: '🥻', gloves: '🧤', boots: '🥾', ring: '💍' };

function scaled(slot: EquipSlot, tier: 1 | 2 | 3): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(T1[slot]) as [keyof Stats, number][]) {
    const f = PCT_KEYS.includes(k) ? PCT_SCALE[tier - 1] : FLAT_SCALE[tier - 1];
    out[k] = PCT_KEYS.includes(k) ? Math.round(v * f * 1000) / 1000 : Math.round(v * f);
  }
  return out;
}

export const ITEM_BASES: Record<string, ItemBase> = {};
for (const slot of SLOT_ORDER) {
  for (const tier of [1, 2, 3] as const) {
    const id = `${slot}_t${tier}`;
    ITEM_BASES[id] = { id, slot, tier, name: NAMES[slot][tier - 1], icon: ICONS[slot], stats: scaled(slot, tier) };
  }
}

/** 強化：每 +1 全屬性 +8%；成功率與費用 */
export const ENHANCE_MAX = 10;
export const ENHANCE_BONUS_PER_LEVEL = 0.08;
export const ENHANCE_RATES = [1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25];
export const ENHANCE_GEM_COST = 5;
export function enhanceCost(tier: number, plus: number): number {
  return Math.round(40 * tier * tier * (plus + 1) * (1 + plus * 0.25));
}

/** 賣出價格 */
export function sellPrice(tier: number, rarity: Rarity, plus: number): number {
  return Math.round(12 * tier * tier * RARITY[rarity].mul * (1 + plus * 0.3));
}

/** 商店販售的普通裝備價格 */
export function shopPrice(tier: number): number {
  return [80, 450, 1800][tier - 1];
}

export const POTION_PRICE = { hp: 20, mp: 20 };

export const STAT_LABELS: Record<keyof Stats, string> = {
  maxHp: 'HP',
  maxMp: 'MP',
  atk: '攻擊',
  def: '防禦',
  pen: '穿透',
  moveSpeed: '移速',
  critRate: '爆擊率',
  critDmg: '爆擊傷害',
};

export function formatStat(k: keyof Stats, v: number): string {
  if (k === 'pen' || k === 'critRate' || k === 'critDmg') return `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
  if (k === 'moveSpeed') return v.toFixed(2);
  return String(Math.round(v));
}
