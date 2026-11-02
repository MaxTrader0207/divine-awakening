/**
 * 召喚物資料（召喚師）
 * ------------------------------------------------------------
 * 數值都是「召喚師目前屬性」的倍率，所以召喚物會跟著等級與裝備一起變強。
 * 新增召喚物：加一筆，在 data/classes.ts 的技能填 `summon: '<id>'`。
 */
export type MinionId = 'skeleton_minion' | 'skeleton_mage' | 'skeleton_warrior';

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
  /** 身上的紫色靈光強度 */
  glow: number;
}

export const MINIONS: Record<MinionId, MinionDef> = {
  skeleton_minion: {
    id: 'skeleton_minion',
    name: '骷髏兵',
    model: 'skeleton_minion',
    height: 1.7,
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
  },
  skeleton_mage: {
    id: 'skeleton_mage',
    name: '骷髏法師',
    model: 'skeleton_mage',
    height: 1.8,
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
  },
  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: '骷髏巨衛',
    model: 'skeleton_warrior',
    height: 2.4,
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
  },
};
