import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線九・斯巴達恐懼神殿（Lv.91-95，擊敗第十八層首領後開放）
 * 斯巴達人在城裡為恐懼之神福波斯立了神殿——不是崇拜恐懼，而是祈求敵人在戰場上被恐懼吞噬。
 * 小怪：斯巴達亡魂戰士、恐懼之影。守護者：恐懼之神福波斯（暗）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_9',
  kind: 'field',
  music: 'inferno',
  name: '斯巴達恐懼神殿',
  subtitle: '斯巴達恐懼神殿・支線・守護者',
  region: '斯巴達',
  levelRange: [91, 95],
  lootTier: 8,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0x3a3440,
  skyColor: 0x2a2238,
  fogColor: 0x3a3048,
  fogRange: [24, 70],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0x5a5260 },
    { x: 0, z: -11, w: 4, d: 12, color: 0x5a5260 },
    { x: 0, z: 1, w: 12, d: 9, color: 0x4a4252 },
    { x: 0, z: -23, w: 14, d: 12, color: 0x3a3248 }, // 守護者祭壇
    { x: -14, z: -14, w: 5, d: 4, color: 0x3a2a5a, water: true },
  ],
  props: [
    ...row('column', -6, 20, 0, -6, 5),
    ...row('column', 6, 20, 0, -6, 5),
    ...row('cypress', -14, 22, 0, -8, 6, { color: 0x2a2a34 }),
    ...row('cypress', 14, 20, 0, -8, 6, { color: 0x2a2a34 }),
    { kind: 'statue', x: -10, z: 2, rot: 0 },
    { kind: 'statue', x: 10, z: 2, rot: 0 },
    { kind: 'decor', x: -6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -9, z: -12, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'decor', x: 9, z: -12, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0x5a4a6a },
    ...pillarRing(0, -23, 6.5, 8, 0x4a4058),
    { kind: 'crystal', x: -3, z: -28, color: 0x8a4aff },
    { kind: 'crystal', x: 3, z: -28, color: 0x8a4aff },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '斯巴達恐懼神殿：支線地圖，擊敗第十八層首領後開放',
    '恐懼之神福波斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '福波斯是暗屬性：光暗互剋——對拉冬、金角鹿特別有效，也比較怕牠們',
    '恐懼收割幾乎掃半圈，繞到牠背後',
  ],
  spawns: [
    { enemy: 'spartan_shade', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'terror_shade', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'spartan_shade', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'terror_shade', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_phobos', x: 0, z: -23 },
    { enemy: 'spartan_scout', x: 13, z: 6, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'dread_statue', x: -12, z: -12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'dread_priest', x: 13, z: 6, count: 2, spread: 3.5 }, // v1.63
  ],
  side: { guardian: 'guardian_phobos', unlockAfter: 'dungeon_18' },
};

export const spartaPhobosShrine: StageDef = {
  zone,
  enemies: {
    spartan_shade: {
      id: 'spartan_shade', name: '斯巴達亡魂戰士', level: 92, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x6a5a7a,
      stats: { maxHp: 13000, atk: 756, def: 340, moveSpeed: 3.4 },
      attack: melee(1.4, 0.45, 1.4),
      exp: 4900, gold: [338, 473],
    },
    terror_shade: {
      id: 'terror_shade', name: '恐懼之影', level: 94, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 1.2, color: 0x5a3a7a,
      stats: { maxHp: 10500, atk: 766, def: 340, moveSpeed: 5.0 },
      attack: melee(1.2, 0.4, 1.3),
      exp: 5000, gold: [352, 492],
    },
    guardian_phobos: {
      id: 'guardian_phobos', name: '恐懼之神福波斯', level: 95, aggro: 'aggressive', shape: 'phobos', boss: true, element: 'dark',
      radius: 0.7, respawn: 90, scale: 1.55, color: 0x2a2236,
      stats: { maxHp: 329000, atk: 657, def: 340, moveSpeed: 3.6 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 63000, gold: [22900, 27900], gems: 53,
      bossSkills: ['phobos_reap', 'phobos_terror', 'phobos_shadow', 'phobos_nightfall'],
    },
    spartan_scout: {
      id: 'spartan_scout', name: '斯巴達斥候亡魂', level: 93, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_rogue',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xd8d0e0,
      stats: { maxHp: 11500, atk: 778, def: 306, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 5060, gold: [347, 496],
    },
    dread_statue: {
      id: 'dread_statue', name: '恐懼石像', level: 95, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.41, color: 0x4a4058,
      stats: { maxHp: 23700, atk: 716, def: 425, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 7300, gold: [508, 726],
    },
    dread_priest: {
      id: 'dread_priest', name: '恐懼祭司亡魂', level: 94, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xc8b8e0,
      stats: { maxHp: 11300, atk: 832, def: 340, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 5690, gold: [392, 560],
    },
  },
};
