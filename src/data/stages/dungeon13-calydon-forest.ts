import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 第十三層・卡呂冬森林（副本 Lv.61-65，防禦 235）
 * 卡呂冬的橡樹林：國王忘了祭祀阿蒂蜜絲，女神降下巨大的野豬蹂躪田野。
 * 墨勒阿革洛斯召集全希臘的英雄來狩獵，阿塔蘭塔射出了第一箭。
 * 小怪：卡呂冬灰狼、庫瑞忒斯亡魂、卡呂冬母野豬。首領：卡呂冬野豬（獠牙突進、獠牙橫挑、斷木落石）。
 */
const OAK = 0x3f5a2e;
const trail = (x: number, z: number): PropDef => ({ kind: 'bush', x, z, color: 0x6a7a3a });

const zone: ZoneDef = {
  id: 'dungeon_13',
  kind: 'dungeon',
  name: '卡呂冬森林',
  subtitle: '第十三層・卡呂冬大狩獵',
  region: '卡呂冬森林',
  levelRange: [61, 65],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x5a6a3a,
  skyColor: 0x5a7a6a,
  fogColor: 0x6a8070,
  fogRange: [30, 74],
  patches: [
    { x: 0, z: 8, w: 5, d: 34, color: 0x7a6a4a }, // 獵人小徑
    // 溪流：中間留一段淺灘
    { x: -14, z: 3, w: 22, d: 3, color: 0x4a7a8a, water: true },
    { x: 15, z: 3, w: 24, d: 3, color: 0x4a7a8a, water: true },
    { x: -14, z: 18, w: 10, d: 7, color: 0x6a5a32 }, // 被野豬翻過的田
    { x: 13, z: -6, w: 9, d: 6, color: 0x6a5a32 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 1.8, color: 0x4a4a32, stairs: { x: 0, width: 5 } }],
  props: [
    ...scatterTrees(1313, 26, 54, 64, [
      ...Array.from({ length: 12 }, (_, i) => ({ x: 0, z: 30 - i * 5, r: 5 })),
      ...Array.from({ length: 11 }, (_, i) => ({ x: -25 + i * 5, z: 3, r: 2.8 })),
      { x: 0, z: -22, r: 18 },
      { x: -12, z: 20, r: 5 }, { x: 10, z: 18, r: 5 }, { x: -2, z: 14, r: 4 }, { x: 12, z: -4, r: 5 }, { x: -12, z: -4, r: 5 }, { x: 0, z: -6, r: 4 },
    ]).map((t) => ({ ...t, color: OAK })),
    trail(-4, 22), trail(4, 18), trail(-5, 8), trail(5, -2),
    { kind: 'statue', x: -8, z: 10, rot: 0.6, color: 0xd8d4c8 }, // 阿蒂蜜絲像
    { kind: 'rock', x: 8, z: 9, color: 0x5a5a4a },
    { kind: 'rock', x: -18, z: -12, color: 0x5a5a4a },
    { kind: 'decor', x: 17, z: 13, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -16, z: 26, h: 1.2, model: 'tent' },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 野豬的巢穴
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x6a5a3a },
    ...pillarRing(0, -23, 6, 8, 0x4a3a2a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 235', '溪流只能從中間的淺灘過去', '獠牙突進很長，往兩側閃', '斷木落石數量多，一直移動就好'],
  spawns: [
    { enemy: 'calydon_wolf', x: -12, z: 20, count: 3, spread: 3 },
    { enemy: 'curete_shade', x: 10, z: 18, count: 2, spread: 3 },
    { enemy: 'calydon_sow', x: -2, z: 14, count: 1 },
    { enemy: 'calydon_wolf', x: 12, z: -4, count: 3, spread: 3 },
    { enemy: 'calydon_sow', x: -12, z: -4, count: 2, spread: 3 },
    { enemy: 'curete_shade', x: 0, z: -6, count: 2, spread: 2.5 },
    { enemy: 'calydonian_boar', x: 0, z: -23 },
  ],
  dungeon: { floor: 13, enemyDefense: 235, unlockAfter: 'dungeon_12' },
};

export const calydonForest: StageDef = {
  zone,
  enemies: {
    calydon_wolf: {
      id: 'calydon_wolf', name: '卡呂冬灰狼', level: 61, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x7a7a72,
      stats: { maxHp: 7300, atk: 497, def: 235, moveSpeed: 5.0 },
      attack: melee(1.3, 0.4, 1.25),
      exp: 2360, gold: [187, 262],
    },
    curete_shade: {
      id: 'curete_shade', name: '庫瑞忒斯亡魂', level: 62, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_rogue',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0xc8d0b8,
      stats: { maxHp: 8600, atk: 507, def: 235, moveSpeed: 3.4 },
      attack: melee(1.6, 0.5, 1.5),
      exp: 2430, gold: [194, 272],
    },
    calydon_sow: {
      id: 'calydon_sow', name: '卡呂冬母野豬', level: 63, aggro: 'aggressive', shape: 'boar',
      radius: 0.65, respawn: 12, scale: 1.25, color: 0x5a3a2a,
      stats: { maxHp: 10300, atk: 517, def: 235, moveSpeed: 3.8 },
      attack: melee(1.6, 0.55, 1.6),
      exp: 2500, gold: [202, 283],
    },
    calydonian_boar: {
      id: 'calydonian_boar', name: '卡呂冬野豬', level: 65, aggro: 'aggressive', shape: 'boar', boss: true,
      radius: 0.95, respawn: 90, scale: 2.7, color: 0x4a3020,
      stats: { maxHp: 277000, atk: 595, def: 235, moveSpeed: 3.8 },
      attack: melee(2.6, 0.55, 1.6),
      exp: 45000, gold: [15500, 18900], gems: 39,
      bossSkills: ['boar_gore', 'boar_tusk_sweep', 'boar_quake'],
    },
  },
};
