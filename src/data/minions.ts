import type { Element } from './elements';
import type { BeastKind } from '@/entities/BeastModel';

/**
 * 召喚物資料（召喚師的亡靈、訓獸師的野獸）
 * ------------------------------------------------------------
 * 數值都是「召喚師目前屬性」的倍率，所以召喚物會跟著等級與裝備一起變強。
 * 新增召喚物：加一筆，在 data/classes.ts 的技能填 `summon: '<id>'`。
 */
export type MinionId = 'skeleton_minion' | 'skeleton_mage' | 'skeleton_warrior' | 'hound' | 'eagle' | 'bear' | 'pegasus';

export interface MinionDef {
  id: MinionId;
  name: string;
  /** 模型（assets/models/*.glb） */
  model: string;
  /** 模型高度（公尺） */
  height: number;
  radius: number;
  /** HP = 召喚師最大 HP × hpMul */
  hpMul: number;
  /** 攻擊 = 召喚師攻擊 × atkMul（穿透、爆擊沿用召喚師） */
  atkMul: number;
  /** 防禦 = 召喚師防禦 × defMul */
  defMul: number;
  /** 普攻倍率 */
  power: number;
  /** 攻擊距離（近戰約 1.3；遠程發射投射物） */
  range: number;
  ranged?: boolean;
  /** 攻擊冷卻、出手前搖（秒） */
  cooldown: number;
  windup: number;
  moveSpeed: number;
  /** 存在秒數 */
  life: number;
  /** 同時存在上限（超過時最舊的先消失） */
  max: number;
  /** 打中敵人時嘲諷（小怪改打牠）：always = 每次都搶、weak = 敵人沒有其他召喚物目標時才搶 */
  taunt: 'always' | 'weak' | 'none';
  /** 召喚當下把周圍幾公尺的小怪拉過來（0 = 不拉） */
  tauntOnSummon?: number;
  /** 身上的靈光強度（亡靈紫光、野獸金光） */
  glow: number;
  /** 野獸外觀（訓獸師；沒填 = 程式骷髏） */
  beast?: BeastKind;
  /** 召喚特效、法陣、投射物顏色 */
  color: number;
  /** 屬性（守護者夥伴；打首領時套用相剋，data/elements.ts） */
  element?: Element;
  /** 守護者夥伴（v1.58）：外觀直接用守護者的敵人造型（EnemyDef id），縮小成 avatarScale 倍 */
  guardian?: string;
  avatarScale?: number;
  /** 出手時以目標為中心的範圍傷害半徑（0 / 沒填 = 單體） */
  splash?: number;
}

export const MINIONS: Record<MinionId, MinionDef> = {
  skeleton_minion: {
    id: 'skeleton_minion',
    name: '斯巴達亡靈',
    model: 'skeleton_minion',
    height: 2.1,
    radius: 0.45,
    hpMul: 0.35,
    atkMul: 0.5,
    defMul: 0.8,
    power: 1,
    range: 1.3,
    cooldown: 1.1,
    windup: 0.3,
    moveSpeed: 6.2,
    life: 20,
    max: 4,
    taunt: 'weak',
    glow: 0.18,
    color: 0xa58cff,
  },
  skeleton_mage: {
    id: 'skeleton_mage',
    name: '提瑞西阿斯亡靈',
    model: 'skeleton_mage',
    height: 2.2,
    radius: 0.45,
    hpMul: 0.3,
    atkMul: 0.6,
    defMul: 0.6,
    power: 1.1,
    range: 8,
    ranged: true,
    cooldown: 1.5,
    windup: 0.35,
    moveSpeed: 5.8,
    life: 20,
    max: 2,
    taunt: 'none',
    glow: 0.22,
    color: 0xb48cff,
  },
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: '埃阿斯亡靈',
    model: 'skeleton_warrior',
    height: 2.8,
    radius: 0.65,
    hpMul: 1.3,
    atkMul: 0.55,
    defMul: 1.6,
    power: 1.2,
    range: 1.6,
    cooldown: 1.3,
    windup: 0.35,
    moveSpeed: 5.6,
    life: 25,
    max: 1,
    taunt: 'always',
    tauntOnSummon: 7,
    glow: 0.15,
    color: 0xa58cff,
  },

  /* ---- 訓獸師的野獸：存在時間比亡靈長，數量比較少 ---- */
  hound: {
    id: 'hound',
    name: '斯巴達獵犬',
    model: '',
    beast: 'hound',
    height: 1.15,
    radius: 0.5,
    hpMul: 0.4,
    atkMul: 0.42,
    defMul: 0.9,
    power: 1,
    range: 1.4,
    cooldown: 0.95,
    windup: 0.28,
    moveSpeed: 7.6,
    life: 25,
    max: 3,
    taunt: 'weak',
    glow: 0.06,
    color: 0xf0b860,
  },
  eagle: {
    id: 'eagle',
    name: '宙斯神鷹',
    model: '',
    beast: 'eagle',
    height: 0.9,
    radius: 0.45,
    hpMul: 0.3,
    atkMul: 0.5,
    defMul: 0.6,
    power: 1.15,
    range: 7.5,
    ranged: true,
    cooldown: 1.4,
    windup: 0.35,
    moveSpeed: 8,
    life: 25,
    max: 2,
    taunt: 'none',
    glow: 0.1,
    color: 0xffd36b,
  },
  bear: {
    id: 'bear',
    name: '卡呂冬巨熊',
    model: '',
    beast: 'bear',
    height: 1.9,
    radius: 0.85,
    hpMul: 1.5,
    atkMul: 0.5,
    defMul: 1.7,
    power: 1.35,
    range: 1.7,
    cooldown: 1.5,
    windup: 0.45,
    moveSpeed: 5.8,
    life: 30,
    max: 1,
    taunt: 'always',
    tauntOnSummon: 7,
    glow: 0.05,
    color: 0xd8a060,
  },
  /* ---- 守護者夥伴（v1.58，data/companions.ts；不屬於任何職業技能，夥伴按鈕召喚） ---- */
  pegasus: {
    id: 'pegasus',
    name: '天馬珀伽索斯',
    model: '',
    guardian: 'guardian_pegasus',
    avatarScale: 0.62,
    height: 2.4,
    radius: 0.7,
    hpMul: 0.9,
    atkMul: 0.75,
    defMul: 1.1,
    power: 1.3,
    range: 1.8,
    splash: 2.2,
    cooldown: 1.2,
    windup: 0.4,
    moveSpeed: 7.2,
    life: 30,
    max: 1,
    taunt: 'always',
    tauntOnSummon: 6,
    glow: 0.1,
    color: 0xffd84a,
    element: 'thunder',
  },
};

/** 野性咆哮（訓獸師 R）：野獸攻擊力、攻速、移速倍率與回血比例、延長存在時間 */
export const WILD_ROAR = { atk: 1.35, attackSpeed: 1.35, speed: 1.25, heal: 0.4, extend: 8, radius: 14 };
