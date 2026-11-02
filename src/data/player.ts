import type { SkillDef, Stats } from './types';

/** 等級 1 的基礎屬性 */
export const BASE_STATS: Stats = {
  maxHp: 220,
  maxMp: 120,
  atk: 24,
  def: 6,
  pen: 0,
  moveSpeed: 6.5,
  critRate: 0.05,
  critDmg: 1.5,
};

/** 每升一級增加的屬性 */
export const STATS_PER_LEVEL: Partial<Stats> = {
  maxHp: 44,
  maxMp: 14,
  atk: 4,
  def: 1.5,
};

/** 升到下一級所需經驗 */
export function expToNext(level: number): number {
  return Math.round(40 * Math.pow(level, 1.6) + 60);
}

export function statsForLevel(level: number): Stats {
  const s: Stats = { ...BASE_STATS };
  const n = level - 1;
  (Object.keys(STATS_PER_LEVEL) as (keyof Stats)[]).forEach((k) => {
    s[k] += (STATS_PER_LEVEL[k] ?? 0) * n;
  });
  s.maxHp = Math.round(s.maxHp);
  s.maxMp = Math.round(s.maxMp);
  return s;
}

/** 小法師技能（第 3 週實作效果，目前僅供 HUD 顯示） */
export const MAGE_SKILLS: SkillDef[] = [
  { id: 'magic_bolt', name: '普攻', slot: 'basic', mpCost: 0, cooldown: 0.6, power: 1, range: 9, shape: 'projectile', icon: '✦', color: 0xffd36b },
  { id: 'fireball', name: '火球術', slot: 'Q', mpCost: 12, cooldown: 3, power: 2.2, range: 10, shape: 'projectile', icon: '🔥', color: 0xff6a2a },
  { id: 'frost_nova', name: '冰霜新星', slot: 'W', mpCost: 20, cooldown: 7, power: 1.6, range: 0, shape: 'circle', radius: 4, icon: '❄', color: 0x6ad1ff },
  { id: 'flame_burst', name: '烈焰爆發', slot: 'E', mpCost: 30, cooldown: 10, power: 3.2, range: 8, shape: 'circle', radius: 3, icon: '☄', color: 0xff9a3c },
  { id: 'blink', name: '閃現', slot: 'R', mpCost: 15, cooldown: 8, power: 0, range: 6, shape: 'dash', icon: '➶', color: 0xb48cff },
];
