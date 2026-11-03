import type { SkillDef, Stats } from './types';

/**
 * 職業資料
 * ------------------------------------------------------------
 * 新增職業：在 CLASSES 加一筆（屬性、技能、模型動畫、武器名稱），
 * 技能效果寫在 systems/SkillSystem.ts 的 cast()（依 skill.id 分派）。
 */
export type HeroClass = 'mage' | 'archer' | 'knight' | 'berserker' | 'summoner';

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
  /** 模型自發光顏色（職業靈光） */
  tint?: number;
  /** 貼圖換色：色相落在 [from, to]（度）的像素轉成 hue 度（召喚師：綠色布料 → 深紫） */
  recolor?: { from: number; to: number; hue: number; light?: number };
  /** 手上額外拿的道具（assets/models 的靜態模型 id、長度公尺、右手 r / 左手 l） */
  prop?: { id: string; length: number; hand: 'r' | 'l' };
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
  /** 資源：mp 魔力（自然回復）；rage 怒氣（上限 100，打人 / 被打累積，脫戰消退） */
  resource?: 'mp' | 'rage';
}

/** 怒氣規則（狂戰士） */
export const RAGE = {
  max: 100,
  /** 每打中一隻敵人 */
  perHit: 3,
  /** 每次受傷 */
  perHurt: 6,
  /** 脫戰幾秒後開始消退 */
  idleDelay: 5,
  /** 每秒消退 */
  decay: 6,
};

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
  },
  knight: {
    id: 'knight',
    name: '騎士',
    desc: '劍盾近戰、血厚防高，盾擊打斷敵人、守護大減傷',
    icon: '🛡️',
    base: { maxHp: 320, maxMp: 90, atk: 22, def: 11, pen: 0, moveSpeed: 6.4, critRate: 0.05, critDmg: 1.5 },
    perLevel: { maxHp: 60, maxMp: 9, atk: 3.7, def: 2.4 },
    skills: [
      { id: 'slash', name: '劍擊', slot: 'basic', mpCost: 0, cooldown: 0.5, power: 1.35, range: 2.7, shape: 'cone', arc: 2.1, icon: '⚔', color: 0xfff1c4, auto: 'single', anim: '1H_Melee_Attack_Slice_Horizontal' },
      { id: 'shield_bash', name: '盾擊', slot: 'Q', mpCost: 10, cooldown: 4, power: 2.4, range: 3, shape: 'cone', arc: 1.6, stun: 1.4, icon: '🛡', color: 0xffd36b, auto: 'single', anim: 'Block_Attack' },
      { id: 'guard', name: '守護', slot: 'W', mpCost: 18, cooldown: 12, power: 0, range: 0, shape: 'circle', radius: 6, duration: 4, icon: '✚', color: 0x8fd4ff, auto: 'guard', anim: 'Blocking' },
      { id: 'whirlwind', name: '旋風斬', slot: 'E', mpCost: 26, cooldown: 9, power: 1.4, range: 0, shape: 'circle', radius: 3.6, waves: 3, icon: '🌀', color: 0xffe9a0, auto: 'self-aoe', anim: '2H_Melee_Attack_Spin' },
      { id: 'charge', name: '衝鋒', slot: 'R', mpCost: 12, cooldown: 7, power: 1.8, range: 7, shape: 'dash', icon: '➤', color: 0xffb36b, auto: 'gap', anim: 'Dodge_Forward' },
    ],
    anims: { model: 'knight', idle: 'Idle', run: 'Running_A', cast: '1H_Melee_Attack_Slice_Horizontal', castBig: '1H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer' },
  },
  berserker: {
    id: 'berserker',
    name: '狂戰士',
    desc: '雙手巨斧近戰爆發，打人累積怒氣放大招、嗜血回血',
    icon: '🪓',
    resource: 'rage',
    base: { maxHp: 290, maxMp: 100, atk: 25, def: 8, pen: 0.05, moveSpeed: 6.6, critRate: 0.08, critDmg: 1.7 },
    perLevel: { maxHp: 54, atk: 4.2, def: 1.8 },
    skills: [
      { id: 'cleave', name: '劈砍', slot: 'basic', mpCost: 0, cooldown: 0.7, power: 1.5, range: 2.9, shape: 'cone', arc: 2.2, icon: '🪓', color: 0xffb08a, auto: 'single', anim: '2H_Melee_Attack_Slice' },
      { id: 'leap', name: '躍擊', slot: 'Q', mpCost: 20, cooldown: 6, power: 2.2, range: 8, shape: 'circle', radius: 2.8, icon: '⤒', color: 0xff8a4a, auto: 'gap', anim: 'Jump_Full_Short' },
      { id: 'bloodlust', name: '嗜血', slot: 'W', mpCost: 30, cooldown: 15, power: 0, range: 0, shape: 'circle', duration: 6, icon: '🩸', color: 0xff4a5a, auto: 'guard', anim: 'Cheer' },
      { id: 'execute', name: '斬殺', slot: 'E', mpCost: 40, cooldown: 7, power: 3.2, range: 3.2, shape: 'cone', arc: 1.4, icon: '💀', color: 0xff3a2a, auto: 'single', anim: '2H_Melee_Attack_Chop' },
      { id: 'berserk', name: '狂暴', slot: 'R', mpCost: 0, cooldown: 30, power: 0, range: 0, shape: 'circle', duration: 8, icon: '🔥', color: 0xff5a2a, auto: 'burst', anim: 'Cheer' },
    ],
    anims: { model: 'barbarian', idle: '2H_Melee_Idle', run: 'Running_A', cast: '2H_Melee_Attack_Slice', castBig: '2H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer' },
  },
  summoner: {
    id: 'summoner',
    name: '召喚師',
    desc: '召喚冥府亡靈大軍替你作戰，本人在後方用冥河暗箭支援',
    icon: '💀',
    base: { maxHp: 230, maxMp: 130, atk: 22, def: 6, pen: 0, moveSpeed: 6.5, critRate: 0.05, critDmg: 1.5 },
    perLevel: { maxHp: 46, maxMp: 15, atk: 3.8, def: 1.5 },
    skills: [
      { id: 'shadow_bolt', name: '冥河暗箭', slot: 'basic', mpCost: 0, cooldown: 0.65, power: 0.85, range: 9, shape: 'projectile', icon: '☾', color: 0xb48cff, auto: 'single' },
      { id: 'raise_skeleton', name: '斯巴達亡靈', slot: 'Q', mpCost: 16, cooldown: 4, power: 0, range: 0, shape: 'circle', summon: 'skeleton_minion', count: 2, icon: '💀', color: 0xa58cff, auto: 'summon', anim: 'Spellcast_Raise' },
      { id: 'raise_mage', name: '提瑞西阿斯亡靈', slot: 'W', mpCost: 22, cooldown: 7, power: 0, range: 0, shape: 'circle', summon: 'skeleton_mage', count: 1, icon: '🔮', color: 0xb48cff, auto: 'summon', anim: 'Spellcast_Raise' },
      { id: 'raise_guard', name: '埃阿斯亡靈', slot: 'E', mpCost: 32, cooldown: 14, power: 0, range: 0, shape: 'circle', summon: 'skeleton_warrior', count: 1, icon: '🛡', color: 0x9a7aff, auto: 'summon', anim: 'Spellcast_Long' },
      { id: 'bone_burst', name: '冥府骨爆', slot: 'R', mpCost: 10, cooldown: 10, power: 1.8, range: 0, shape: 'circle', radius: 2.6, icon: '💥', color: 0xd8c8ff, auto: 'detonate', anim: 'Spellcast_Shoot' },
    ],
    anims: { model: 'summoner', idle: 'Idle', run: 'Running_A', cast: 'Spellcast_Shoot', castBig: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', recolor: { from: 70, to: 200, hue: 275, light: 0.8 }, prop: { id: 'skel_staff', length: 1.9, hand: 'r' } },
  },
};

export const CLASS_LIST: HeroClass[] = ['mage', 'archer', 'knight', 'berserker', 'summoner'];
