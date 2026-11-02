import type { Rarity } from '@/data/types';
import { RARITY, RARITY_ORDER, SLOT_ORDER } from '@/data/items';

/** 小怪掉裝備機率 */
export const DROP_CHANCE = 0.18;
/** 小怪額外掉藥水機率 */
export const POTION_DROP_CHANCE = 0.08;

/**
 * 擲骰掉落（純函式）
 * - tier：區域等級（草原 / 第一層 = 1，第二層 = 2，第三層 = 3）
 * - 首領：必掉 1 件，精良以上
 */
export function rollDrop(tier: number, boss: boolean, rng: () => number = Math.random): { base: string; rarity: Rarity } | null {
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
  return { base: `${slot}_t${t}`, rarity };
}
