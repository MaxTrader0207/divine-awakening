/**
 * 有骨架動畫的外部模型（KayKit 骷髏、Quaternius 青蛙）：動畫名稱與目標身高。
 * EnemyDef.model 填這裡的 key 就會用模型；模型沒載入時退回 shape 的程式模型。
 * 新增模型：scripts/build-assets.mjs 加入 glb → 這裡登記動畫名稱。
 */
export interface RigAnims {
  idle: string;
  walk: string;
  attack: string;
  cast?: string;
  hit?: string;
  death: string;
  /** 目標身高（公尺，未乘 scale） */
  height: number;
  /** 走路動畫速度基準（移動速度 / 這個值 = timeScale） */
  walkRef: number;
  /** 依怪物顏色改模型材質（材質名稱 → 'body' 主色 / 'belly' 淡色） */
  recolor?: Record<string, 'body' | 'belly'>;
}

const SKEL: RigAnims = { idle: 'Idle', walk: 'Walking_D_Skeletons', attack: '1H_Melee_Attack_Chop', cast: 'Spellcast_Shoot', hit: 'Hit_A', death: 'Death_C_Skeletons', height: 2.3, walkRef: 2.4 };

export const RIG_ANIMS: Record<string, RigAnims> = {
  skeleton_minion: SKEL,
  skeleton_rogue: SKEL,
  skeleton_warrior: SKEL,
  skeleton_mage: SKEL,
  // Quaternius Frog（CC0）：身體換成這種怪的顏色（寧芙潮蛙藍綠、奇美拉火蛙紅…），肚子用淡一點的同色系
  frog: { idle: 'Frog_Idle', walk: 'Frog_Jump', attack: 'Frog_Attack', death: 'Frog_Death', height: 1.05, walkRef: 3, recolor: { Green: 'body', Yellow: 'belly' } },
};

export const DEFAULT_RIG = SKEL;
