import type { Rarity } from '@/data/types';
import { RARITY, RARITY_ORDER, SLOT_ORDER, namedGearIds } from '@/data/items';
import type { HeroClass } from '@/data/classes';

/** 小怪掉裝備機率 */
export const DROP_CHANCE = 0.18;
/** 掉到的裝備是神話裝（職業專屬）的機率：小怪 / 首領 */
export const NAMED_CHANCE = { normal: 0.35, boss: 0.6 };
/** 小怪額外掉藥水機率 */
export const POTION_DROP_CHANCE = 0.08;

/**
 * 擲骰掉落（純函式）
 * - tier：區域等級（草原 / 第一層 = 1，第二層 = 2，第三層 = 3）
 * - 首領：必掉 1 件，精良以上
 * - 有指定職業時，有機率掉該職業的神話裝（同欄位、同階）
 */
export function rollDrop(tier: number, boss: boolean, rng: () => number = Math.random, cls?: HeroClass): { base: string; rarity: Rarity } | null {
  if (!boss && rng() >= DROP_CHANCE) return null;
  const weights = RARITY_ORDER.map((r) => (boss ? RARITY[r].bossWeight : RARITY[r].weight));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  let rarity: Rarity = 'common';
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      rarity = RARITY_ORDER[i];
      break;
    }
  }
  const slot = SLOT_ORDER[Math.floor(rng() * SLOT_ORDER.length)];
  const t = Math.max(1, Math.min(4, tier));
  if (cls) {
    const named = namedGearIds(cls, slot, t);
    if (named.length && rng() < (boss ? NAMED_CHANCE.boss : NAMED_CHANCE.normal)) return { base: named[Math.floor(rng() * named.length)], rarity };
  }
  return { base: `${slot}_t${t}`, rarity };
}
