import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十二層・俄特律斯山（副本 Lv.106-110，防禦 415）
 * 泰坦族的根據地俄特律斯山：十年的泰坦之戰在這裡打得天崩地裂。
 * 宙斯殺了塔爾塔洛斯的獄卒坎佩，放出獨眼巨人與百臂巨人，才得到雷霆、贏得戰爭——這是最後的試煉。
 * 小怪：泰坦戰士、雷霆獨眼巨人、塔爾塔洛斯翼龍。首領：塔爾塔洛斯獄龍坎佩（五十獸首、蠍尾毒刺、塔爾塔洛斯獄火、獄龍降臨）。
 */
const LAVA = 0xff5a1a;
const TITAN = 0x5a4a44;

const zone: ZoneDef = {
  id: 'dungeon_22',
  kind: 'dungeon',
  music: 'inferno',
  bossMusic: 'final',
  name: '俄特律斯山',
  subtitle: '第二十二層・泰坦之戰的戰場',
  region: '俄特律斯山',
  levelRange: [106, 110],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x3a3438,
  skyColor: 0x2a1420,
  fogColor: 0x4a2a30,
  fogRange: [28, 72],
  mist: true,
  patches: [
    { x: -14, z: 12, w: 8, d: 5, color: LAVA, water: true }, // 熔岩裂縫
    { x: 14, z: 0, w: 8, d: 5, color: LAVA, water: true },
    { x: -12, z: -6, w: 6, d: 4, color: LAVA, water: true },
    { x: 0, z: 10, w: 5, d: 32, color: 0x4a4048 },
    { x: 12, z: 20, w: 8, d: 7, color: 0x2a2428 }, // 雷擊焦痕
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2.2, color: 0x2e2830, stairs: { x: 0, width: 5 } }],
  props: [
    // 泰坦宮殿的斷柱
    ...[[-8, 22], [8, 25], [-20, 18], [20, 10], [-20, -2], [20, -12], [-7, 3], [8, -9]].map(([x, z]): PropDef => ({ kind: 'column', x, z, h: 2 + ((x * 7 + z) % 3), color: TITAN })),
    { kind: 'statue', x: -16, z: 24, rot: 0.6, color: 0x6a6070 }, // 克洛諾斯像
    { kind: 'statue', x: 17, z: -2, rot: -0.8, color: 0x6a6070 },
    { kind: 'crystal', x: -21, z: 8, color: 0xff6a3a },
    { kind: 'crystal', x: 21, z: 24, color: 0x8ad8ff }, // 雷霆的結晶
    { kind: 'crystal', x: -21, z: -14, color: 0xff6a3a },
    { kind: 'rock', x: 7, z: 14, color: 0x2a2428 },
    { kind: 'rock', x: -6, z: -12, color: 0x2a2428 },
    { kind: 'decor', x: 12, z: 21, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3, z: 16, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 塔爾塔洛斯的裂口
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xb83a1a },
    ...pillarRing(0, -23, 6.5, 10, TITAN),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
    { kind: 'decor', x: 12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 415，是最後的副本', '熔岩裂縫不能走', '坎佩有四種招式，蠍尾毒刺是一長排直線', '五十獸首的空隙很窄，看清楚再站'],
  spawns: [
    { enemy: 'titan_soldier', x: -10, z: 22, count: 2, spread: 3 },
    { enemy: 'thunder_cyclops', x: 10, z: 16, count: 2, spread: 3 },
    { enemy: 'tartarus_drake', x: 0, z: 12, count: 2, spread: 2 },
    { enemy: 'tartarus_drake', x: 14, z: -8, count: 2, spread: 3 },
    { enemy: 'titan_soldier', x: -4, z: -5, count: 2, spread: 3 },
    { enemy: 'thunder_cyclops', x: 6, z: -4, count: 1 },
    { enemy: 'kampe', x: 0, z: -23 },
    { enemy: 'titan_shade', x: 10, z: 16, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'storm_harpy', x: 14, z: -8, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 22, enemyDefense: 415, unlockAfter: 'dungeon_21' },
};

export const othrysBattlefield: StageDef = {
  zone,
  enemies: {
    titan_soldier: {
      id: 'titan_soldier', name: '泰坦戰士', level: 106, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.2, color: 0x6a5a4a,
      stats: { maxHp: 24300, atk: 895, def: 415, moveSpeed: 2.6 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 6380, gold: [441, 617],
    },
    thunder_cyclops: {
      id: 'thunder_cyclops', name: '雷霆獨眼巨人', level: 107, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.65, respawn: 12, scale: 0.9, color: 0x7a8aa8,
      stats: { maxHp: 20800, atk: 890, def: 415, moveSpeed: 3.0 },
      attack: melee(1.9, 0.6, 1.7),
      exp: 6490, gold: [459, 643],
    },
    tartarus_drake: {
      id: 'tartarus_drake', name: '塔爾塔洛斯翼龍', level: 108, aggro: 'aggressive', shape: 'dragon',
      radius: 0.6, respawn: 12, scale: 0.75, color: 0x3a1a1a,
      stats: { maxHp: 17300, atk: 885, def: 415, moveSpeed: 4.2 },
      attack: melee(1.7, 0.5, 1.5),
      exp: 6600, gold: [476, 666],
    },
    kampe: {
      id: 'kampe', name: '塔爾塔洛斯獄龍坎佩', level: 110, aggro: 'aggressive', shape: 'kampe', boss: true, element: 'dark',
      radius: 1.0, respawn: 90, scale: 2.0, color: 0x3a1a1a,
      stats: { maxHp: 562000, atk: 1000, def: 415, moveSpeed: 3.2 },
      attack: melee(3.2, 0.6, 1.7),
      exp: 117000, gold: [42900, 52300], gems: 66,
      bossSkills: ['kampe_heads', 'kampe_sting', 'kampe_hellfire', 'kampe_leap'],
    },
    titan_shade: {
      id: 'titan_shade', name: '泰坦亡靈將', level: 109, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.55, respawn: 12, scale: 1.16, color: 0xd8d0c0,
      stats: { maxHp: 28900, atk: 1143, def: 415, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 9030, gold: [626, 894],
    },
    storm_harpy: {
      id: 'storm_harpy', name: '風暴鷹身女妖', level: 107, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x6a7a9a,
      stats: { maxHp: 15500, atk: 948, def: 415, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 7200, gold: [493, 705],
    },
  },
};
