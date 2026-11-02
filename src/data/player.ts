import type { SkillDef, Stats } from './types';
import { CLASSES, type HeroClass } from './classes';

/** 法師（預設職業）的基礎屬性；其他職業見 data/classes.ts */
export const BASE_STATS: Stats = CLASSES.mage.base;
export const STATS_PER_LEVEL: Partial<Stats> = CLASSES.mage.perLevel;

/** 升到下一級所需經驗 */
export function expToNext(level: number): number {
  return Math.round(75 * Math.pow(level, 1.8) + 100);
}

export function statsForLevel(level: number, cls: HeroClass = 'mage'): Stats {
  const def = CLASSES[cls] ?? CLASSES.mage;
  const s: Stats = { ...def.base };
  const n = level - 1;
  (Object.keys(def.perLevel) as (keyof Stats)[]).forEach((k) => {
    s[k] += (def.perLevel[k] ?? 0) * n;
  });
  s.maxHp = Math.round(s.maxHp);
  s.maxMp = Math.round(s.maxMp);
  s.atk = Math.round(s.atk);
  return s;
}

/** 法師技能（相容舊程式；新程式請用 CLASSES[cls].skills） */
export const MAGE_SKILLS: SkillDef[] = CLASSES.mage.skills;
