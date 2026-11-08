import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第三十層・奧林帕斯之巔（副本 Lv.146-150，防禦 495）——最終層
 * 宙斯推翻了父親克洛諾斯，把泰坦們關進塔爾塔洛斯。可是時間之神從來沒有真正被關住過——
 * 獄卒坎佩倒下之後，克洛諾斯拿著當年閹割天空之神烏拉諾斯的鐮刀，回來奪取奧林帕斯。這是最後的試煉。
 * 小怪：泰坦重步兵、時之巨像、時之亡巫、時空翼龍、泰坦獨眼巨人。首領：泰坦之王克洛諾斯（哈耳珀之鐮、十二時辰、時間凍結、吞噬眾神）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_30',
  kind: 'dungeon',
  music: 'titan',
  bossMusic: 'final',
  theme: 'mountain',
  name: '奧林帕斯之巔',
  subtitle: '第三十層・時間之神的反撲',
  region: '奧林帕斯之巔',
  levelRange: [146, 150],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0xc8c4b8,
  skyColor: 0x3a3a6a,
  fogColor: 0x6a6a9a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 34, color: 0xe8e0c8 }, // 黃金大道
    { x: -22, z: 4, w: 6, d: 46, color: 0xe8eef8, water: true }, // 雲海
    { x: 22, z: 4, w: 6, d: 46, color: 0xe8eef8, water: true },
    { x: -12, z: 20, w: 8, d: 6, color: 0xb8b0a0 },
    { x: 12, z: -4, w: 8, d: 6, color: 0xb8b0a0 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0xb8b4a8, stairs: { x: 0, width: 5 } }],
  props: [
    // 眾神的柱廊
    ...[24, 14, 4, -6, -16].flatMap((z): PropDef[] => [{ kind: 'column', x: -16, z, h: 3, color: 0xe8e4d8 }, { kind: 'column', x: 16, z, h: 3, color: 0xe8e4d8 }]),
    { kind: 'statue', x: -7, z: 24, rot: 0.3, color: 0xf0e0a0 }, // 宙斯金像
    { kind: 'statue', x: 7, z: 24, rot: -0.3, color: 0xe8e4d8 }, // 赫拉像
    { kind: 'crystal', x: -7, z: 14, color: 0x9ae8ff }, // 凍住的時間
    { kind: 'crystal', x: 7, z: 2, color: 0x9ae8ff },
    { kind: 'crystal', x: -7, z: -12, color: 0xffd36b },
    { kind: 'decor', x: 8, z: -12, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x6a8ab8 },
    ...pillarRing(0, -23, 6, 8, 0xe8e4d8),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 495', '兩側是雲海，不能走', '十二時辰的指針之間有空隙，站在空隙裡', '時間凍結的碎片會一直落下，不要停在原地'],
  spawns: [
    { enemy: 'titan_hoplite', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'chronos_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'hourglass_witch', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'aeon_drake', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'titan_cyclops', x: -12, z: -4, count: 1 },
    { enemy: 'titan_hoplite', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'hourglass_witch', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'chronos_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'aeon_drake', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'kronos', x: 0, z: -23 },
  ],
  dungeon: { floor: 30, enemyDefense: 495, unlockAfter: 'dungeon_29' },
};

export const olympusSummit: StageDef = {
  zone,
  enemies: {
    titan_hoplite: {
      id: 'titan_hoplite', name: '泰坦重步兵', level: 146, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_minion',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0xc8c0b0,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 11350, gold: [945, 1323],
    },
    chronos_colossus: {
      id: 'chronos_colossus', name: '時之巨像', level: 147, aggro: 'aggressive', shape: 'golem',
      radius: 0.75, respawn: 12, scale: 1.4, color: 0x8a8aa8,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 11490, gold: [983, 1376],
    },
    hourglass_witch: {
      id: 'hourglass_witch', name: '時之亡巫', level: 148, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.15, color: 0xc8c0d8,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 11630, gold: [1021, 1429],
    },
    aeon_drake: {
      id: 'aeon_drake', name: '時空翼龍', level: 149, aggro: 'aggressive', shape: 'dragon',
      radius: 0.6, respawn: 12, scale: 0.7, color: 0x5a5a8a,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 11770, gold: [1059, 1483],
    },
    titan_cyclops: {
      id: 'titan_cyclops', name: '泰坦獨眼巨人', level: 150, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.65, respawn: 12, scale: 0.95, color: 0x8a7a9a,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 11910, gold: [1096, 1534],
    },
    kronos: {
      id: 'kronos', name: '泰坦之王克洛諾斯', level: 150, aggro: 'aggressive', shape: 'kronos', boss: true, element: 'ice',
      radius: 1.2, respawn: 90, scale: 2.1, color: 0x3a3a5a,
      stats: { maxHp: 740000, atk: 1240, def: 495, moveSpeed: 3.0 },
      attack: melee(3.4, 0.6, 1.7),
      exp: 204000, gold: [106100, 129400], gems: 90,
      bossSkills: ['kronos_harpe', 'kronos_hours', 'kronos_freeze', 'kronos_devour'],
    },
  },
};
