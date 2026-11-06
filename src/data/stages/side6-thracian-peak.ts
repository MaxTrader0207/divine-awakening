import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線六・色雷斯冰峰（Lv.61-65，擊敗第十二層首領後開放）
 * 北風神波瑞阿斯住在色雷斯的冰峰洞窟，冬天就是從這裡吹向整個希臘。
 * 小怪：色雷斯雪狼、北風之子。守護者：北風神波瑞阿斯（冰）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_6',
  kind: 'field',
  music: 'wild',
  name: '色雷斯冰峰',
  subtitle: '色雷斯冰峰・支線・守護者',
  region: '色雷斯',
  levelRange: [61, 65],
  lootTier: 7,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0xe8eef4,
  skyColor: 0xb8d0e8,
  fogColor: 0xe8f0f8,
  fogRange: [28, 78],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0xc8d4e0 },
    { x: 0, z: -11, w: 4, d: 12, color: 0xc8d4e0 },
    { x: 0, z: 1, w: 12, d: 9, color: 0xdce6f0 },
    { x: 0, z: -23, w: 14, d: 12, color: 0xbfe0f4 }, // 守護者祭壇
    { x: 13, z: 14, w: 7, d: 5, color: 0x8fc8e8, water: true },
  ],
  props: [
    ...row('rock', -22, 26, 0, -6, 9, { color: 0xb8c8d8 }),
    ...row('rock', 22, 25, 0, -6, 9, { color: 0xb8c8d8 }),
    ...row('cypress', -12, 20, 0, -8, 5, { color: 0xdce8f0 }),
    ...row('cypress', 12, 18, 0, -8, 5, { color: 0xdce8f0 }),
    { kind: 'crystal', x: -9, z: 8, color: 0xbff0ff },
    { kind: 'crystal', x: 9, z: -4, color: 0xbff0ff },
    { kind: 'crystal', x: -14, z: -14, color: 0xbff0ff },
    { kind: 'statue', x: -9, z: -28, rot: 0 },
    { kind: 'statue', x: 9, z: -28, rot: 0 },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xeaf6ff },
    ...pillarRing(0, -23, 6.5, 8, 0xd8ecff),
    { kind: 'crystal', x: -3, z: -28, color: 0x9fe6ff },
    { kind: 'crystal', x: 3, z: -28, color: 0x9fe6ff },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '色雷斯冰峰：支線地圖，擊敗第十二層首領後開放',
    '北風神波瑞阿斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '波瑞阿斯是冰屬性：冰剋風（斯芬克斯）、被火剋',
    '寒風突襲是直線衝刺，往側邊閃最安全',
  ],
  spawns: [
    { enemy: 'thracian_wolf', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'boread', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'thracian_wolf', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'boread', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_boreas', x: 0, z: -23 },
    { enemy: 'frost_statue', x: 13, z: 6, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'thrace_snow_boar', x: -12, z: -12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'ice_cave_bat', x: 13, z: 6, count: 3, spread: 3.5 }, // v1.63
  ],
  side: { guardian: 'guardian_boreas', unlockAfter: 'dungeon_12' },
};

export const thracianPeak: StageDef = {
  zone,
  enemies: {
    thracian_wolf: {
      id: 'thracian_wolf', name: '色雷斯雪狼', level: 62, aggro: 'aggressive', shape: 'hound',
      radius: 0.6, respawn: 12, scale: 1.05, color: 0xe0ecf4,
      stats: { maxHp: 7600, atk: 500, def: 220, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.4),
      exp: 2400, gold: [190, 266],
    },
    boread: {
      id: 'boread', name: '北風之子', level: 64, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x9fc8e8,
      stats: { maxHp: 8100, atk: 512, def: 220, moveSpeed: 4.8 },
      attack: melee(1.3, 0.4, 1.4),
      exp: 2480, gold: [198, 278],
    },
    guardian_boreas: {
      id: 'guardian_boreas', name: '北風神波瑞阿斯', level: 65, aggro: 'aggressive', shape: 'boreas', boss: true, element: 'ice',
      radius: 0.75, respawn: 90, scale: 1.5, color: 0x9fc8e8,
      stats: { maxHp: 216000, atk: 452, def: 220, moveSpeed: 3.8 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 31500, gold: [11600, 14200], gems: 35,
      bossSkills: ['boreas_breath', 'boreas_blizzard', 'boreas_gust', 'boreas_frost'],
    },
    frost_statue: {
      id: 'frost_statue', name: '冰晶石像', level: 65, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.41, color: 0xcfeaff,
      stats: { maxHp: 14200, atk: 482, def: 275, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 3620, gold: [287, 410],
    },
    thrace_snow_boar: {
      id: 'thrace_snow_boar', name: '色雷斯雪豬', level: 64, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1.21, color: 0xd8d8d0,
      stats: { maxHp: 10900, atk: 636, def: 242, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 3340, gold: [262, 374],
    },
    ice_cave_bat: {
      id: 'ice_cave_bat', name: '冰窟蝙蝠', level: 62, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x8ab8d8,
      stats: { maxHp: 4900, atk: 431, def: 176, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 1460, gold: [114, 163],
    },
  },
};
