import type { EquipSlot, Rarity, Stats } from './types';
import type { HeroClass } from './classes';
import { CLASS_GEAR, MAX_TIER, NAMED_TIERS, TIERS, type GearProfile, type Tier } from './gear';

/**
 * 裝備資料
 * ------------------------------------------------------------
 * 裝備 = 底材（slot × tier）× 稀有度倍率 × 強化倍率。
 * tier 1 = 阿卡迪亞草原 / 第一層、tier 2 = 第二層、tier 3 = 第三層、tier 4 = 第四～六層（與多多納聖林）、
 * tier 5 = 第七～九層、tier 6 = 第十～十二層、tier 7 = 第十三～十七層、tier 8 = 第十八～二十二層。
 * 「穿透」集中在帽子與戒指：這是突破第二、三層防禦的關鍵。
 */

export interface ItemBase {
  id: string;
  slot: EquipSlot;
  tier: Tier;
  name: string;
  icon: string;
  stats: Partial<Stats>;
  /** 神話裝：只屬於某個職業、只從怪物掉落 */
  cls?: HeroClass;
  named?: boolean;
  profile?: GearProfile;
}

/**
 * 依職業改寫標準裝（`${slot}_t${tier}`，所有職業共用 id）的名稱、圖示與欄位名稱。
 * 遊戲啟動時呼叫一次（一個存檔只會有一個職業）。
 */
export function applyClassGear(cls: HeroClass) {
  const g = CLASS_GEAR[cls];
  for (const slot of SLOT_ORDER) {
    SLOT_NAMES[slot] = g.slotNames[slot];
    for (const tier of TIERS) {
      const b = ITEM_BASES[`${slot}_t${tier}`];
      b.name = `${g.prefixes[tier - 1]}${g.slotNames[slot]}`;
      b.icon = g.icons[slot];
    }
  }
}

/** 某職業、某欄位、某階可以掉落的神話裝 id */
export function namedGearIds(cls: HeroClass, slot: EquipSlot, tier: number): string[] {
  return (NAMED_INDEX.get(`${cls}|${slot}|${tier}`) ?? []).slice();
}

export const SLOT_NAMES: Record<EquipSlot, string> = { ...CLASS_GEAR.mage.slotNames };

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
const FLAT_SCALE = [1, 2.2, 3.6, 5.4, 7.6, 10.2, 13.2, 16.6];
const PCT_SCALE = [1, 1.6, 2.2, 2.8, 3.4, 4.0, 4.6, 5.2];
const PCT_KEYS: (keyof Stats)[] = ['pen', 'critRate', 'critDmg', 'moveSpeed'];

const ICONS: Record<EquipSlot, string> = { ...CLASS_GEAR.mage.icons };

/** 粗略戰力（裝備比較、神話裝屬性預算用）；Inventory.itemScore 也用這個 */
export function statScore(s: Partial<Stats>): number {
  return (s.atk ?? 0) * 3 + (s.def ?? 0) * 2.5 + (s.maxHp ?? 0) * 0.25 + (s.maxMp ?? 0) * 0.2 + (s.pen ?? 0) * 400 + (s.critRate ?? 0) * 300 + (s.critDmg ?? 0) * 120 + (s.moveSpeed ?? 0) * 40;
}

/**
 * 神話裝的能力偏向：主屬性（該欄位標準裝的屬性）× k ＋ 額外屬性（第 1 階的數值，依階級成長），
 * 最後整體縮放到「同階標準裝戰力 × NAMED_BUDGET」—— 比標準裝略好，但稀有度仍是主要差距。
 */
export const NAMED_BUDGET = 1.08;
const PROFILES: Record<GearProfile, { k: number; extra: Partial<Stats> }> = {
  power: { k: 1, extra: {} },
  crit: { k: 0.65, extra: { critRate: 0.03 } },
  pierce: { k: 0.65, extra: { pen: 0.04 } },
  fury: { k: 0.65, extra: { critDmg: 0.12 } },
  guard: { k: 0.65, extra: { def: 3 } },
  vital: { k: 0.65, extra: { maxHp: 45 } },
  arcane: { k: 0.65, extra: { maxMp: 25 } },
  swift: { k: 0.7, extra: { moveSpeed: 0.2 } },
};

function roundStat(k: keyof Stats, v: number): number {
  return PCT_KEYS.includes(k) ? Math.round(v * 1000) / 1000 : Math.max(1, Math.round(v));
}

function namedStats(slot: EquipSlot, tier: Tier, profile: GearProfile): Partial<Stats> {
  const std = scaled(slot, tier);
  const p = PROFILES[profile];
  const raw: Partial<Stats> = {};
  for (const [k, v] of Object.entries(std) as [keyof Stats, number][]) raw[k] = v * p.k;
  for (const [k, v] of Object.entries(p.extra) as [keyof Stats, number][]) {
    const f = PCT_KEYS.includes(k) ? PCT_SCALE[tier - 1] : FLAT_SCALE[tier - 1];
    raw[k] = (raw[k] ?? 0) + v * f;
  }
  const mul = (statScore(std) * NAMED_BUDGET) / statScore(raw);
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(raw) as [keyof Stats, number][]) out[k] = roundStat(k, v * mul);
  return out;
}

function scaled(slot: EquipSlot, tier: Tier): Partial<Stats> {
  const out: Partial<Stats> = {};
  for (const [k, v] of Object.entries(T1[slot]) as [keyof Stats, number][]) {
    const f = PCT_KEYS.includes(k) ? PCT_SCALE[tier - 1] : FLAT_SCALE[tier - 1];
    out[k] = PCT_KEYS.includes(k) ? Math.round(v * f * 1000) / 1000 : Math.round(v * f);
  }
  return out;
}

export const ITEM_BASES: Record<string, ItemBase> = {};
// 標準裝（所有職業共用 id，名稱由 applyClassGear 依職業改寫）
for (const slot of SLOT_ORDER) {
  for (const tier of TIERS) {
    const id = `${slot}_t${tier}`;
    ITEM_BASES[id] = { id, slot, tier, name: `${CLASS_GEAR.mage.prefixes[tier - 1]}${CLASS_GEAR.mage.slotNames[slot]}`, icon: ICONS[slot], stats: scaled(slot, tier) };
  }
}
// 神話裝：每個職業 × 每個欄位 × 20 件
const NAMED_INDEX = new Map<string, string[]>();
for (const [cls, g] of Object.entries(CLASS_GEAR) as [HeroClass, (typeof CLASS_GEAR)[HeroClass]][]) {
  for (const slot of SLOT_ORDER) {
    g.named[slot].forEach((name, i) => {
      const tier = NAMED_TIERS[i];
      const profile = g.profiles[i];
      const id = `${cls}_${slot}_${String(i + 1).padStart(2, '0')}`;
      ITEM_BASES[id] = { id, slot, tier, name, icon: g.icons[slot], stats: namedStats(slot, tier, profile), cls, named: true, profile };
      const key = `${cls}|${slot}|${tier}`;
      NAMED_INDEX.set(key, [...(NAMED_INDEX.get(key) ?? []), id]);
    });
  }
}

export { MAX_TIER, TIERS, type Tier };

/** 依玩家等級建議的裝備階級（每日任務額外獎勵等使用） */
export function tierForLevel(level: number): Tier {
  if (level <= 6) return 1;
  if (level <= 12) return 2;
  if (level <= 18) return 3;
  if (level <= 30) return 4;
  if (level <= 45) return 5;
  if (level <= 60) return 6;
  if (level <= 85) return 7;
  return 8;
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
  return [80, 450, 1800, 6000][tier - 1];
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
