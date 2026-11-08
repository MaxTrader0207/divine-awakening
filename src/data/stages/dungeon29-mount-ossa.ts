import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十九層・奧薩山（副本 Lv.141-145，防禦 485）
 * 海神之子俄托斯與厄菲阿爾忒斯，九歲就高九尋：他們把奧薩山疊上奧林帕斯山，再把佩利翁山疊上去，想爬上天界。
 * 阿蒂蜜絲化成一頭鹿從兩人之間跑過，兩兄弟同時擲出長矛——刺中的是彼此。
 * 小怪：巨人族少年、奧薩山岩巨像、奧薩山蛇髮女妖、阿蒂蜜絲幻鹿、奧薩山野牛。首領：阿洛伊代雙子巨人（疊山落石、雙矛突刺、雙子震地、巨人飛躍）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_29',
  kind: 'dungeon',
  music: 'titan',
  theme: 'mountain',
  name: '奧薩山',
  subtitle: '第二十九層・把山疊上天的巨人',
  region: '奧薩山',
  levelRange: [141, 145],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x7a7468,
  skyColor: 0x8aa0c0,
  fogColor: 0xa8b4c4,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0x8a8476 }, // 山路
    { x: -15, z: 20, w: 10, d: 8, color: 0x6a645a }, // 落石堆
    { x: 15, z: -6, w: 10, d: 8, color: 0x6a645a },
    { x: -20, z: -6, w: 6, d: 8, color: 0x2a2a30, water: true }, // 裂谷
    { x: 20, z: 14, w: 6, d: 8, color: 0x2a2a30, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x6a645a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -18, z: 26, rot: 0.6, color: 0xe8e0d0 }, // 阿蒂蜜絲像
    ...[[-21, 16], [21, 26], [-6, 22], [7, -12], [21, -20], [-21, -22], [14, 4]].map(([x, z], i): PropDef => ({ kind: 'rock', x, z, color: i % 2 ? 0x8a8478 : 0x6a645a })),
    { kind: 'cypress', x: -22, z: 4 },
    { kind: 'cypress', x: 22, z: -2 },
    { kind: 'crystal', x: -7, z: 2, color: 0xd8b070 },
    { kind: 'decor', x: 8, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -14, z: -14, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xa8885a },
    ...pillarRing(0, -23, 6, 8, 0x8a8478),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 485', '黑色的裂谷不能走', '雙子巨人的長矛會同時刺出兩排，站在兩排之間或往外閃', '巨人飛躍落地前有影子，看到就跑開'],
  spawns: [
    { enemy: 'giant_youth', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'ossa_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'ossa_gorgon', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'artemis_hind', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'ossa_bull', x: -12, z: -4, count: 1 },
    { enemy: 'giant_youth', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'ossa_gorgon', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'ossa_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'artemis_hind', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'aloadae', x: 0, z: -23 },
  ],
  dungeon: { floor: 29, enemyDefense: 485, unlockAfter: 'dungeon_28' },
};

export const mountOssa: StageDef = {
  zone,
  enemies: {
    giant_youth: {
      id: 'giant_youth', name: '巨人族少年', level: 141, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.55, respawn: 12, scale: 0.75, color: 0xc89a78,
      stats: { maxHp: 15200, atk: 1127, def: 485, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 10660, gold: [859, 1203],
    },
    ossa_colossus: {
      id: 'ossa_colossus', name: '奧薩山岩巨像', level: 142, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.35, color: 0x7a7064,
      stats: { maxHp: 40600, atk: 1127, def: 485, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 10800, gold: [894, 1252],
    },
    ossa_gorgon: {
      id: 'ossa_gorgon', name: '奧薩山蛇髮女妖', level: 143, aggro: 'aggressive', shape: 'gorgon', ranged: true,
      radius: 0.6, respawn: 12, scale: 0.95, color: 0x6a7a5a,
      stats: { maxHp: 21600, atk: 1183, def: 485, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 10930, gold: [928, 1299],
    },
    artemis_hind: {
      id: 'artemis_hind', name: '阿蒂蜜絲幻鹿', level: 144, aggro: 'aggressive', shape: 'hind',
      radius: 0.6, respawn: 12, scale: 0.9, color: 0xe8d8b0,
      stats: { maxHp: 21600, atk: 1127, def: 485, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 11070, gold: [962, 1347],
    },
    ossa_bull: {
      id: 'ossa_bull', name: '奧薩山野牛', level: 145, aggro: 'aggressive', shape: 'bull',
      radius: 0.7, respawn: 12, scale: 1.0, color: 0x5a4a3a,
      stats: { maxHp: 30500, atk: 1352, def: 485, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 11210, gold: [997, 1396],
    },
    aloadae: {
      id: 'aloadae', name: '阿洛伊代雙子巨人', level: 145, aggro: 'aggressive', shape: 'aloadae', boss: true, element: 'earth',
      radius: 1.3, respawn: 90, scale: 1.7, color: 0x8a6a4a,
      stats: { maxHp: 715000, atk: 1210, def: 485, moveSpeed: 2.8 },
      attack: melee(3.2, 0.6, 1.8),
      exp: 192000, gold: [94800, 115700], gems: 87,
      bossSkills: ['aloadae_boulder', 'aloadae_spears', 'aloadae_quake', 'aloadae_leap'],
    },
  },
};
