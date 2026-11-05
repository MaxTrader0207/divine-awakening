import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十九層・衣索比亞海岸（副本 Lv.91-95，防禦 355）
 * 卡西奧佩婭誇口女兒比海中仙女還美，波賽頓派海怪刻托斯蹂躪衣索比亞的海岸。
 * 公主安朵美達被鎖在海邊的岩石上獻祭，直到珀耳修斯拿著梅杜莎的頭飛來。
 * 小怪：刻托斯幼獸、涅瑞伊得斯怨靈、衣索比亞礁蟹。首領：海怪刻托斯（滔天巨浪、巨尾拍海、噴潮水柱）。
 */
const SEA = 0x2a5a8a;
const reef = (x: number, z: number): PropDef => ({ kind: 'rock', x, z, color: 0x4a4440 });

const zone: ZoneDef = {
  id: 'dungeon_19',
  kind: 'dungeon',
  music: 'sea',
  bossMusic: 'titan',
  name: '衣索比亞海岸',
  subtitle: '第十九層・安朵美達的岩石',
  region: '衣索比亞海岸',
  levelRange: [91, 95],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x6a6058,
  skyColor: 0x3a5a7a,
  fogColor: 0x5a7a8a,
  fogRange: [30, 74],
  mist: true,
  patches: [
    { x: -20, z: 0, w: 14, d: 56, color: SEA, water: true }, // 外海
    { x: 18, z: 20, w: 18, d: 8, color: SEA, water: true }, // 海灣
    { x: 2, z: 8, w: 5, d: 32, color: 0x8a7a62 },
    { x: 8, z: 2, w: 10, d: 7, color: 0x9a8a6a }, // 沙灘
  ],
  platforms: [{ x: 2, z: -22, w: 26, d: 16, h: 2, color: 0x4a4440, stairs: { x: 2, width: 5 } }],
  props: [
    // 安朵美達被鎖的岩石
    reef(12, 10), { kind: 'column', x: 12, z: 13, h: 3, color: 0x6a6a6a },
    reef(-10, 24), reef(-11, 6), reef(-10, -10), reef(20, -6), reef(19, 4),
    { kind: 'crystal', x: -9, z: 15, color: 0xff8a7a },
    { kind: 'crystal', x: 21, z: -16, color: 0x7ad8ff },
    { kind: 'palm', x: 21, z: 10 },
    { kind: 'palm', x: 9, z: 26 },
    { kind: 'statue', x: -6, z: -4, rot: 0.8, color: 0xc8c0b0 }, // 被石化的衛兵
    { kind: 'decor', x: 7, z: 18, h: 1.0, model: 'barrel', solid: false },
    { kind: 'decor', x: -0.6, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 4.6, z: -14, h: 1.6, model: 'torch', solid: false },
    // 海怪上岸的地方
    { kind: 'stonering', x: 2, z: -23, w: 11, d: 11, color: 0x2a6a9a },
    ...pillarRing(2, -23, 6, 8, 0x3a4a5a),
    { kind: 'decor', x: 12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 355', '西邊是外海、東北是海灣，都不能走', '滔天巨浪很長，往側邊閃', '巨尾拍海以首領為中心，範圍很大'],
  spawns: [
    { enemy: 'nereid_wraith', x: -4, z: 22, count: 3, spread: 3 },
    { enemy: 'cetus_spawn', x: 6, z: 12, count: 2, spread: 3 },
    { enemy: 'reef_crab', x: 2, z: 16, count: 1 },
    { enemy: 'reef_crab', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'nereid_wraith', x: -6, z: -2, count: 3, spread: 3 },
    { enemy: 'cetus_spawn', x: 4, z: -4, count: 2, spread: 2.5 },
    { enemy: 'cetus', x: 2, z: -23 },
  ],
  dungeon: { floor: 19, enemyDefense: 355, unlockAfter: 'dungeon_18' },
};

export const aethiopianCoast: StageDef = {
  zone,
  enemies: {
    cetus_spawn: {
      id: 'cetus_spawn', name: '刻托斯幼獸', level: 91, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.25, color: 0x2a4a7a,
      stats: { maxHp: 13700, atk: 759, def: 355, moveSpeed: 3.4 },
      attack: melee(1.7, 0.5, 1.5),
      exp: 4850, gold: [331, 463],
    },
    nereid_wraith: {
      id: 'nereid_wraith', name: '涅瑞伊得斯怨靈', level: 92, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x6ab8d8,
      stats: { maxHp: 10400, atk: 764, def: 355, moveSpeed: 5.0 },
      attack: melee(1.3, 0.38, 1.2),
      exp: 4940, gold: [345, 483],
    },
    reef_crab: {
      id: 'reef_crab', name: '衣索比亞礁蟹', level: 93, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 12, scale: 1.4, color: 0x4a6a8a,
      stats: { maxHp: 16900, atk: 769, def: 355, moveSpeed: 2.8 },
      attack: melee(1.6, 0.55, 1.6),
      exp: 5040, gold: [358, 501],
    },
    cetus: {
      id: 'cetus', name: '海怪刻托斯', level: 95, aggro: 'aggressive', shape: 'cetus', boss: true, element: 'ice',
      radius: 1.0, respawn: 90, scale: 2.6, color: 0x2a4a7a,
      stats: { maxHp: 422000, atk: 865, def: 355, moveSpeed: 2.8 },
      attack: melee(3.0, 0.6, 1.7),
      exp: 90000, gold: [30500, 37200], gems: 57,
      bossSkills: ['cetus_wave', 'cetus_tail', 'cetus_spout'],
    },
  },
};
