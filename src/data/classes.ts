import type { SkillDef, Stats } from './types';

/**
 * 職業資料
 * ------------------------------------------------------------
 * 新增職業：在 CLASSES 加一筆（屬性、技能、模型動畫、武器名稱），
 * 技能效果寫在 systems/SkillSystem.ts 的 cast()（依 skill.id 分派）。
 */
export type HeroClass = 'mage' | 'archer' | 'knight' | 'berserker' | 'summoner' | 'swordsman' | 'tamer' | 'ninja';

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
  recolor?: { from: number; to: number; hue: number; light?: number; maxL?: number; sat?: number };
  /** 手上額外拿的道具（assets/models 的靜態模型 id、長度公尺、右手 r / 左手 l） */
  /** 手上的道具：length 全長（公尺）、thin 橫向粗細倍率（預設 1）、grip 握點離底端的比例（預設 0.35）；id 'whip' = 程式鞭子（訓獸師） */
  prop?: { id: string; length: number; hand: 'r' | 'l'; thin?: number; grip?: number };
  /** 遮住口鼻的面罩（忍者，v1.88）：顏色、相對頭骨的高度 / 半徑 / 前移（公尺，世界尺度） */
  /** 影分身外觀（忍者，v1.89）：本體出手時左右兩個影子跟著晚一拍出刀 */
  shadowClone?: { color: number; glow: number; rim: number };
  mask?: { color: number; y: number; r: number; h: number; z?: number };
  /** 平滑著色的摺角（度）：夾角小於此值的相鄰面法線平均（預設 60，0＝維持原本的平面著色） */
  smooth?: number;
  /**
   * v1.108 職業專屬動作：
   * combo＝普攻連段（1.2 秒內連續普攻依序換動作；沒有就一直用 cast / 技能的 anim）、
   * combatIdle＝戰鬥中（剛出手 / 被打 4 秒內）的待機姿勢、hit2 / death2＝輪流 / 隨機的第二套受擊與倒下。
   */
  combo?: string[];
  combatIdle?: string;
  /** v1.110 隨動披風 / 圍巾（可以多條，例如圍巾兩條尾巴） */
  capes?: import('@/entities/Cape').CapeDef[];
  hit2?: string;
  death2?: string;
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
    anims: { model: 'mage', idle: 'Idle', run: 'Running_A', cast: 'Spellcast_Shoot', castBig: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', combo: ['Spellcast_Shoot', '1H_Ranged_Shoot'], combatIdle: 'Spellcasting', hit2: 'Hit_B', death2: 'Death_B' },
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
    anims: { model: 'rogue', idle: 'Idle', run: 'Running_B', cast: '2H_Ranged_Shoot', castBig: 'Throw', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Backward', cheer: 'Cheer', combo: ['2H_Ranged_Shoot'], combatIdle: '2H_Ranged_Aiming', hit2: 'Hit_B', death2: 'Death_B', capes: [{ color: 0x2f5a34, tip: 0x244528, length: 0.62, width: 0.34, widthBottom: 0.44, up: 0.12, back: 0.16 }] },
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
    anims: { model: 'knight', idle: 'Idle', run: 'Running_A', cast: '1H_Melee_Attack_Slice_Horizontal', castBig: '1H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', combo: ['1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop'], combatIdle: 'Blocking', hit2: 'Hit_B', death2: 'Death_B' },
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
    anims: { model: 'barbarian', idle: '2H_Melee_Idle', run: 'Running_A', cast: '2H_Melee_Attack_Slice', castBig: '2H_Melee_Attack_Chop', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', combo: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Stab', '2H_Melee_Attack_Chop'], hit2: 'Hit_B', death2: 'Death_B', capes: [{ color: 0x6b4a2e, tip: 0x4a3220, length: 0.66, width: 0.5, widthBottom: 0.6, up: 0.1, back: 0.2, ragged: true }] },
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
    anims: { model: 'summoner', idle: 'Idle', run: 'Running_A', cast: 'Spellcast_Shoot', castBig: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', combo: ['Spellcast_Shoot', 'Spellcast_Raise'], combatIdle: 'Spellcasting', hit2: 'Hit_B', death2: 'Death_B', recolor: { from: 70, to: 200, hue: 275, light: 0.8 }, prop: { id: 'skel_staff', length: 1.9, hand: 'r' }, capes: [{ color: 0x3a2050, tip: 0x160a24, length: 0.9, width: 0.38, widthBottom: 0.52, up: 0.12, back: 0.16, ragged: true }] },
  },
  swordsman: {
    id: 'swordsman',
    name: '劍俠',
    desc: '一劍走天涯的大俠：快劍三連斬、劍氣遠攻、凌波微步穿梭敵陣',
    icon: '🗡️',
    base: { maxHp: 270, maxMp: 110, atk: 24, def: 8, pen: 0.04, moveSpeed: 6.9, critRate: 0.12, critDmg: 1.7 },
    perLevel: { maxHp: 50, maxMp: 11, atk: 3.8, def: 1.8 },
    skills: [
      { id: 'sword_strike', name: '快劍', slot: 'basic', mpCost: 0, cooldown: 0.42, power: 0.92, range: 2.7, shape: 'cone', arc: 1.9, icon: '🗡', color: 0xd8f4ff, auto: 'single', anim: '1H_Melee_Attack_Slice_Diagonal' },
      { id: 'sword_qi', name: '劍氣斬', slot: 'Q', mpCost: 12, cooldown: 4, power: 2.1, range: 10, shape: 'projectile', icon: '🌙', color: 0x8fe8ff, auto: 'single', anim: '1H_Melee_Attack_Slice_Horizontal' },
      { id: 'swift_step', name: '凌波微步', slot: 'W', mpCost: 12, cooldown: 6, power: 1.7, range: 7, shape: 'dash', icon: '💨', color: 0xb8f0ff, auto: 'gap', anim: 'Dodge_Forward' },
      { id: 'sword_rain', name: '萬劍歸宗', slot: 'E', mpCost: 32, cooldown: 11, power: 1.0, range: 9, shape: 'circle', radius: 3.6, waves: 4, icon: '⚔', color: 0x6ad8ff, auto: 'target-aoe', anim: '2H_Melee_Attack_Spinning' },
      { id: 'sword_intent', name: '人劍合一', slot: 'R', mpCost: 25, cooldown: 30, power: 0, range: 0, shape: 'circle', duration: 8, icon: '☯', color: 0xffe9a0, auto: 'burst', anim: 'Cheer' },
    ],
    anims: { model: 'swordsman', idle: 'Idle', run: 'Running_B', cast: '1H_Melee_Attack_Slice_Diagonal', castBig: '1H_Melee_Attack_Stab', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', hit2: 'Hit_B', death2: 'Death_B', recolor: { from: 90, to: 200, hue: 212, light: 0.95 }, prop: { id: 'sword_1h', length: 1.8, hand: 'r', thin: 0.45, grip: 0.22 }, capes: [{ color: 0x9ad0ff, tip: 0xe8f6ff, length: 1.2, width: 0.13, up: 0.3, back: 0.3, side: 0.14, segments: 9 }, { color: 0x9ad0ff, tip: 0xe8f6ff, length: 0.95, width: 0.11, up: 0.3, back: 0.3, side: 0.02, segments: 8 }] },
  },
  tamer: {
    id: 'tamer',
    name: '訓獸師',
    desc: '阿蒂蜜絲的獵人：揮鞭指揮獵犬、神鷹與巨熊並肩作戰，野性咆哮讓獸群狂暴',
    icon: '🐺',
    base: { maxHp: 260, maxMp: 115, atk: 23, def: 8, pen: 0.02, moveSpeed: 6.7, critRate: 0.07, critDmg: 1.55 },
    perLevel: { maxHp: 50, maxMp: 12, atk: 3.8, def: 1.8 },
    skills: [
      { id: 'beast_whip', name: '馴獸鞭', slot: 'basic', mpCost: 0, cooldown: 0.6, power: 1.0, range: 3.8, shape: 'cone', arc: 1.3, icon: '〰', color: 0xe8c27a, auto: 'single', anim: '1H_Melee_Attack_Slice_Diagonal' },
      { id: 'call_hounds', name: '斯巴達獵犬', slot: 'Q', mpCost: 16, cooldown: 5, power: 0, range: 0, shape: 'circle', summon: 'hound', count: 2, icon: '🐕', color: 0xf0b860, auto: 'summon', anim: 'Spellcast_Raise' },
      { id: 'call_eagle', name: '宙斯神鷹', slot: 'W', mpCost: 20, cooldown: 8, power: 0, range: 0, shape: 'circle', summon: 'eagle', count: 1, icon: '🦅', color: 0xffd36b, auto: 'summon', anim: 'Spellcast_Raise' },
      { id: 'call_bear', name: '卡呂冬巨熊', slot: 'E', mpCost: 30, cooldown: 15, power: 0, range: 0, shape: 'circle', summon: 'bear', count: 1, icon: '🐻', color: 0xd8a060, auto: 'summon', anim: 'Spellcast_Long' },
      { id: 'wild_roar', name: '野性咆哮', slot: 'R', mpCost: 25, cooldown: 24, power: 0, range: 0, shape: 'circle', radius: 14, duration: 8, icon: '🦁', color: 0xff9a3c, auto: 'burst', anim: 'Cheer' },
    ],
    anims: { model: 'tamer', idle: 'Idle', run: 'Running_A', cast: '1H_Melee_Attack_Slice_Diagonal', castBig: 'Spellcast_Long', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', combo: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop'], hit2: 'Hit_B', death2: 'Death_B', recolor: { from: 5, to: 20.5, hue: 118, light: 0.85, maxL: 0.56 }, prop: { id: 'whip', length: 1.6, hand: 'r' }, capes: [{ color: 0x4a6a32, tip: 0x2e4a20, length: 0.58, width: 0.46, widthBottom: 0.52, up: 0.1, back: 0.2, ragged: true }] },
  },
  ninja: {
    id: 'ninja',
    name: '忍者',
    desc: '從東方渡海而來的影之刺客：雙刃連斬、手裏劍、瞬身繞背，影分身讓每一刀都斬兩次',
    icon: '🥷',
    base: { maxHp: 230, maxMp: 105, atk: 24, def: 6.5, pen: 0.05, moveSpeed: 7.1, critRate: 0.14, critDmg: 1.75 },
    perLevel: { maxHp: 45, maxMp: 10, atk: 3.9, def: 1.5 },
    skills: [
      { id: 'kunai_slash', name: '雙刃連斬', slot: 'basic', mpCost: 0, cooldown: 0.38, power: 0.8, range: 2.5, shape: 'cone', arc: 1.9, icon: '⚔', color: 0xc8b8ff, auto: 'single', anim: 'Dualwield_Melee_Attack_Slice' },
      { id: 'shuriken', name: '手裏劍', slot: 'Q', mpCost: 11, cooldown: 3.5, power: 1.0, range: 11, shape: 'projectile', count: 3, icon: '✴', color: 0xd8d0ff, auto: 'single', anim: 'Throw' },
      { id: 'shadow_step', name: '瞬身斬', slot: 'W', mpCost: 14, cooldown: 6, power: 2.0, range: 9, shape: 'dash', icon: '🌒', color: 0x9a7aff, auto: 'gap', anim: 'Dualwield_Melee_Attack_Stab' },
      { id: 'smoke_bomb', name: '煙玉・爆遁', slot: 'E', mpCost: 26, cooldown: 10, power: 1.4, range: 0, shape: 'circle', radius: 4.2, waves: 2, icon: '💨', color: 0xb0a8c8, auto: 'self-aoe', anim: 'Dodge_Backward' },
      { id: 'shadow_clone', name: '影分身之術', slot: 'R', mpCost: 25, cooldown: 28, power: 0, range: 0, shape: 'circle', duration: 8, icon: '👥', color: 0x8a6aff, auto: 'burst', anim: '2H_Melee_Attack_Spinning' },
    ],
    anims: { model: 'ninja', idle: 'Idle', run: 'Running_B', cast: 'Dualwield_Melee_Attack_Slice', castBig: 'Throw', hit: 'Hit_A', death: 'Death_A', dodge: 'Dodge_Forward', cheer: 'Cheer', hit2: 'Hit_B', death2: 'Death_B', recolor: { from: 70, to: 200, hue: 250, light: 0.42, sat: 0.35 }, mask: { color: 0x1a1824, y: 0.17, r: 0.72, h: 0.34, z: 0.01 }, shadowClone: { color: 0x4a3a78, glow: 0x150c30, rim: 0xb090ff }, capes: [{ color: 0xc0283a, tip: 0x6a1020, length: 1.35, width: 0.13, up: 0.3, back: 0.3, side: 0.14, segments: 10 }, { color: 0xc0283a, tip: 0x6a1020, length: 1.05, width: 0.11, up: 0.3, back: 0.3, side: 0.02, segments: 9 }] },
  },
};

export const CLASS_LIST: HeroClass[] = ['mage', 'archer', 'knight', 'berserker', 'summoner', 'swordsman', 'tamer', 'ninja'];
