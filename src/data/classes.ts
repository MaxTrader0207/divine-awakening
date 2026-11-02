import type { SkillDef, Stats } from './types';

/**
 * 職業資料
 * ------------------------------------------------------------
 * 新增職業：在 CLASSES 加一筆（屬性、技能、模型動畫、武器名稱），
 * 技能效果寫在 systems/SkillSystem.ts 的 cast()（依 skill.id 分派）。
 */
export type HeroClass = 'mage' | 'archer';

/** 模型動畫名稱對應（KayKit 動畫名） */
export interface HeroAnimSet {
  model: string;
  idle: string;
  run: string;
  cast: string;
  castBig: string;
  hit: string;
  death: string;
  dodge: string;
  cheer: string;
}

export interface ClassDef {
  id: HeroClass;
  name: string;
  /** 選職業畫面的一句話 */
  desc: string;
  icon: string;
  base: Stats;
  perLevel: Partial<Stats>;
  skills: SkillDef[];
  anims: HeroAnimSet;
  /** 武器欄的名稱（第 1~4 階）與圖示 */
  weaponNames: [string, string, string, string];
  weaponIcon: string;
}

export const CLASSES: Record<HeroClass, ClassDef> = {
  mage: {
    id: 'mage',
    name: '法師',
    desc: '範圍魔法清怪、冰霜緩速，攻擊力高但比較脆弱',
    icon: '🔮',
    base: { maxHp: 220, maxMp: 120, atk: 24, def: 6, pen: 0, moveSpeed: 6.5, critRate: 0.05, critDmg: 1.5 },
    perLevel: { maxHp: 44, maxMp: 14, atk: 4, def: 1.5 },
    skills: [
      { id: 'magic_bolt', name: '普攻', slot: 'basic', mpCost: 0, cooldown: 0.6, power: 1, range: 9, shape: 'projectile', icon: '✦', color: 0xffd36b, auto: 'single' },
      { id: 'fireball', name: '火球術', slot: 'Q', mpCost: 12, cooldown: 3, power: 2.2, range: 10, shape: 'projectile', radius: 2.2, icon: '🔥', color: 0xff6a2a, auto: 'single' },
      { id: 'frost_nova', name: '冰霜新星', slot: 'W', mpCost: 20, cooldown: 7, power: 1.6, range: 0, shape: 'circle', radius: 4, icon: '❄', color: 0x6ad1ff, auto: 'self-aoe' },
      { id: 'flame_burst', name: '烈焰爆發', slot: 'E', mpCost: 30, cooldown: 10, power: 3.2, range: 8, shape: 'circle', radius: 3, icon: '☄', color: 0xff9a3c, auto: 'target-aoe' },
      { id: 'blink', name: '閃現', slot: 'R', mpCost: 15, cooldown: 8, power: 0, range: 6, shape: 'dash', icon: '➶', color: 0xb48cff, auto: 'none' },
    ],
    anims: { model: 'mage', idle: 'Idle', run: 'Running_A', cast: 'Spellcast_Shoot', castBig: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer' },
    weaponNames: ['見習法杖', '珊瑚法杖', '熔心法杖', '霧森法杖'],
    weaponIcon: '🪄',
  },
  archer: {
    id: 'archer',
    name: '弓手',
    desc: '射程遠、移動快、爆擊高，靠走位與後跳拉開距離',
    icon: '🏹',
    base: { maxHp: 240, maxMp: 100, atk: 23, def: 7, pen: 0.03, moveSpeed: 6.9, critRate: 0.1, critDmg: 1.6 },
    perLevel: { maxHp: 46, maxMp: 10, atk: 3.7, def: 1.6 },
    skills: [
      { id: 'arrow', name: '射擊', slot: 'basic', mpCost: 0, cooldown: 0.5, power: 0.92, range: 11, shape: 'projectile', icon: '➹', color: 0xd8f0ff, auto: 'single' },
      { id: 'multishot', name: '多重箭', slot: 'Q', mpCost: 12, cooldown: 4, power: 1.1, range: 11, shape: 'projectile', count: 5, icon: '⋔', color: 0xa8e0ff, auto: 'single' },
      { id: 'pierce', name: '貫穿箭', slot: 'W', mpCost: 18, cooldown: 6, power: 2.4, range: 15, shape: 'projectile', icon: '➵', color: 0x6ad1ff, auto: 'single' },
      { id: 'arrow_rain', name: '箭雨', slot: 'E', mpCost: 30, cooldown: 10, power: 1.25, range: 10, shape: 'circle', radius: 3.6, waves: 3, icon: '☔', color: 0x9fd4ff, auto: 'target-aoe' },
      { id: 'backstep', name: '後跳', slot: 'R', mpCost: 12, cooldown: 7, power: 0, range: 6, shape: 'dash', icon: '↶', color: 0x8fe8c0, auto: 'none' },
    ],
    anims: { model: 'rogue', idle: 'Idle', run: 'Running_A', cast: '2H_Ranged_Shoot', castBig: 'Throw', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Backward', cheer: 'Cheer' },
    weaponNames: ['見習短弩', '珊瑚弩', '熔心弩', '霧影弩'],
    weaponIcon: '🏹',
  },
};

export const CLASS_LIST: HeroClass[] = ['mage', 'archer'];
