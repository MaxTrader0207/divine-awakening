import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第八層・戈爾貢之島（副本 Lv.36-40，防禦 135）
 * 世界西方盡頭的孤島：被梅杜莎石化的勇士雕像散落各處，傾倒的神殿石柱、海水環繞。
 * 小怪：戈爾貢毒蛇、石化戰士、格賴埃灰巫（遠程）。首領：梅杜莎（石化凝視、蛇髮亂舞、毒蛇箭雨）。
 */
const SEA = 0x2a5a7a;
const STONE = 0xa8a8a0;
const statue = (x: number, z: number, rot = 0): PropDef => ({ kind: 'statue', x, z, rot, color: 0x9a9a92 });

const zone: ZoneDef = {
  id: 'dungeon_8',
  kind: 'dungeon',
  name: '戈爾貢之島',
  subtitle: '第八層・石像之島',
  region: '戈爾貢之島',
  levelRange: [36, 40],
  safe: false,
  size: { w: 52, d: 62 },
  groundColor: 0x8a9278,
  theme: 'coast', // v1.93
  skyColor: 0x5a6a7a,
  fogColor: 0x6a7a84,
  fogRange: [32, 78],
  patches: [
    // 島的兩側是海
    { x: -22, z: 4, w: 8, d: 46, color: SEA, water: true },
    { x: 22, z: 4, w: 8, d: 46, color: SEA, water: true },
    // 中間的潮池
    { x: -6, z: 7, w: 7, d: 5, color: SEA, water: true },
    { x: 9, z: -4, w: 6, d: 6, color: SEA, water: true },
    // 石板路
    { x: 0, z: 18, w: 5, d: 14, color: 0xb8b8a8 },
    { x: 3, z: 3, w: 4, d: 12, color: 0xb8b8a8 },
    { x: -3, z: -8, w: 4, d: 8, color: 0xb8b8a8 },
  ],
  platforms: [{ x: 0, z: -21, w: 26, d: 16, h: 1.6, color: 0x7a8070, stairs: { x: 0, width: 5 } }],
  props: [
    // 被石化的勇士
    statue(-9, 20, 0.4), statue(8, 22, -0.6), statue(-13, 12, 1.2), statue(14, 11, -1.4),
    statue(-3, 13, 2.6), statue(13, 1, 0.8), statue(-14, -3, -0.3), statue(4, -11, 3.0), statue(-10, -10, 1.6),
    // 傾倒的神殿
    { kind: 'column', x: -5, z: 24, color: STONE },
    { kind: 'column', x: 5, z: 24, color: STONE },
    { kind: 'pillar', x: 15, z: 18, h: 1.2, color: STONE },
    { kind: 'pillar', x: -16, z: 4, h: 1.8, color: STONE },
    { kind: 'pillar', x: 16, z: -9, h: 1.4, color: STONE },
    { kind: 'rock', x: -15, z: 22, color: 0x6a7068 },
    { kind: 'rock', x: 15, z: 25, color: 0x6a7068 },
    { kind: 'rock', x: -5, z: -2, color: 0x6a7068 },
    { kind: 'cypress', x: -16, z: -13 },
    { kind: 'cypress', x: 16, z: -14 },
    { kind: 'bush', x: 9, z: 15, color: 0x5a7a4a },
    { kind: 'bush', x: -10, z: 2, color: 0x5a7a4a },
    { kind: 'amphora', x: 11, z: 23 },
    { kind: 'decor', x: -12, z: 26, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 7, z: 6, h: 1.0, model: 'rubble', solid: false },
    // 梅杜莎的神殿
    { kind: 'stonering', x: 0, z: -22, w: 10, d: 10, color: 0x9aa890 },
    ...pillarRing(0, -22, 5.6, 8, STONE),
    { kind: 'decor', x: -3.4, z: -12.4, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -12.4, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -11, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: ['這層敵人有防禦 135', '格賴埃灰巫會從遠處施法，優先處理', '石化凝視很長但很窄，往側邊走就能躲開', '蛇髮亂舞：站到兩條蛇之間的縫隙'],
  spawns: [
    { enemy: 'gorgon_viper', x: -6, z: 17, count: 3, spread: 3 },
    { enemy: 'petrified_warrior', x: 9, z: 12, count: 2, spread: 3 },
    { enemy: 'graeae_witch', x: -10, z: 8, count: 2, spread: 3 },
    { enemy: 'gorgon_viper', x: 6, z: -1, count: 3, spread: 3 },
    { enemy: 'petrified_warrior', x: -10, z: -5, count: 2, spread: 3 },
    { enemy: 'graeae_witch', x: 9, z: -10, count: 2, spread: 2.5 },
    { enemy: 'medusa', x: 0, z: -22 },
    { enemy: 'gorgon_bat', x: 9, z: 12, count: 3, spread: 3.5 }, // v1.63
    { enemy: 'petrified_crab', x: 6, z: -1, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 8, enemyDefense: 135, unlockAfter: 'dungeon_7' },
};

export const gorgonIsle: StageDef = {
  zone,
  enemies: {
    gorgon_viper: {
      id: 'gorgon_viper', name: '戈爾貢毒蛇', level: 36, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0x5a6a3a,
      stats: { maxHp: 3900, atk: 295, def: 135, moveSpeed: 3.4 },
      attack: melee(1.5, 0.45, 1.5),
      exp: 900, gold: [88, 128],
    },
    petrified_warrior: {
      id: 'petrified_warrior', name: '石化戰士', level: 37, aggro: 'aggressive', shape: 'golem',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0x9a9a92,
      stats: { maxHp: 5400, atk: 300, def: 135, moveSpeed: 2.5 },
      attack: melee(1.7, 0.7, 2),
      exp: 950, gold: [92, 134],
    },
    graeae_witch: {
      id: 'graeae_witch', name: '格賴埃灰巫', level: 38, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1, color: 0xb8b8b0,
      stats: { maxHp: 3300, atk: 315, def: 135, moveSpeed: 2.6 },
      attack: { range: 7.5, windup: 0.9, cooldown: 2.4 },
      exp: 990, gold: [94, 138],
    },
    medusa: {
      id: 'medusa', name: '梅杜莎', level: 40, aggro: 'aggressive', shape: 'gorgon', boss: true, element: 'earth',
      radius: 0.7, respawn: 90, scale: 2, color: 0x4a7a4a,
      stats: { maxHp: 140000, atk: 380, def: 135, moveSpeed: 3 },
      attack: melee(2.6, 0.55, 1.6),
      exp: 18000, gold: [6000, 7600], gems: 25,
      bossSkills: ['gorgon_gaze', 'snake_hair', 'gorgon_arrows'],
    },
    gorgon_bat: {
      id: 'gorgon_bat', name: '戈爾貢夜蝠', level: 36, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x4a5a4a,
      stats: { maxHp: 2300, atk: 251, def: 135, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 540, gold: [54, 77],
    },
    petrified_crab: {
      id: 'petrified_crab', name: '石化巨蟹', level: 39, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 12, scale: 1.5, color: 0x9a9a90,
      stats: { maxHp: 7150, atk: 280, def: 135, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 1420, gold: [135, 193],
    },
  },
};
