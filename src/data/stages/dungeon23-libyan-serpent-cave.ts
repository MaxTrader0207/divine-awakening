import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十三層・利比亞蛇窟（副本 Lv.111-115，防禦 425）
 * 利比亞女王拉彌亞與宙斯相戀，被赫拉奪走所有孩子；悲痛讓她變成蛇身的怪物，從此在沙漠的洞窟裡吞噬別人的孩子。
 * 宙斯給了她能取下眼睛的能力，讓她偶爾可以休息——但她從來沒有真正睡著過。
 * 小怪：利比亞角蝰、利比亞沙巨像、拉彌亞之女、利比亞沙獅、沙丘巨鉗蟹。首領：蛇身女王拉彌亞（蛇身絞殺、毒牙噴吐、蛇行突襲、噬子之怨）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_23',
  kind: 'dungeon',
  music: 'wild',
  theme: 'desert',
  name: '利比亞蛇窟',
  subtitle: '第二十三層・拉彌亞的巢穴',
  region: '利比亞蛇窟',
  levelRange: [111, 115],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0xa88a5a,
  skyColor: 0x7a5a3a,
  fogColor: 0x9a7a5a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0xc8a878 }, // 沙路
    { x: -18, z: 14, w: 8, d: 6, color: 0x6a9a3a, water: true }, // 毒池
    { x: 18, z: -12, w: 7, d: 8, color: 0x6a9a3a, water: true },
    { x: -19, z: -14, w: 6, d: 6, color: 0x6a9a3a, water: true },
    { x: 14, z: 22, w: 10, d: 7, color: 0x8a6a44 }, // 蛇蛻
    { x: -14, z: -24, w: 8, d: 6, color: 0x8a6a44 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x8a6a4a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'palm', x: -20, z: 26 },
    { kind: 'palm', x: 21, z: 10 },
    { kind: 'palm', x: -22, z: 2 },
    { kind: 'statue', x: -17, z: 24, rot: 0.6, color: 0xc8a878 }, // 女王拉彌亞的舊像
    { kind: 'column', x: 18, z: 4, h: 1.6, color: 0xc8b088 },
    { kind: 'column', x: -18, z: -4, h: 2.2, color: 0xc8b088 },
    { kind: 'rock', x: 16, z: 24, color: 0x8a6a4a },
    { kind: 'rock', x: 21, z: -22, color: 0x8a6a4a },
    { kind: 'crystal', x: -6, z: 16, color: 0x9aff6a },
    { kind: 'crystal', x: 7, z: -12, color: 0x9aff6a },
    { kind: 'amphora', x: 14, z: 12 },
    { kind: 'decor', x: -16, z: 6, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x6a8a3a },
    ...pillarRing(0, -23, 6, 8, 0xb89a6a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 425', '蛇窟裡的綠色毒池不能走', '蛇身絞殺是以拉彌亞為中心，預警出現就往外跑', '毒牙噴吐有三道（狂暴五道），站在兩道之間'],
  spawns: [
    { enemy: 'libyan_asp', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'sand_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'lamia_daughter', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'desert_lion', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'dune_scorpion', x: -12, z: -4, count: 1 },
    { enemy: 'libyan_asp', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'lamia_daughter', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'sand_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'desert_lion', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'lamia_queen', x: 0, z: -23 },
  ],
  dungeon: { floor: 23, enemyDefense: 425, unlockAfter: 'dungeon_22' },
};

export const libyanSerpentCave: StageDef = {
  zone,
  enemies: {
    libyan_asp: {
      id: 'libyan_asp', name: '利比亞角蝰', level: 111, aggro: 'aggressive', shape: 'serpent',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0xc8a060,
      stats: { maxHp: 11000, atk: 911, def: 425, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 6930, gold: [485, 679],
    },
    sand_colossus: {
      id: 'sand_colossus', name: '利比亞沙巨像', level: 112, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.25, color: 0xb89a6a,
      stats: { maxHp: 29300, atk: 911, def: 425, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 7040, gold: [504, 706],
    },
    lamia_daughter: {
      id: 'lamia_daughter', name: '拉彌亞之女', level: 113, aggro: 'aggressive', shape: 'gorgon', ranged: true,
      radius: 0.6, respawn: 12, scale: 0.95, color: 0x6a8a4a,
      stats: { maxHp: 15600, atk: 957, def: 425, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 7160, gold: [524, 734],
    },
    desert_lion: {
      id: 'desert_lion', name: '利比亞沙獅', level: 114, aggro: 'aggressive', shape: 'lion',
      radius: 0.6, respawn: 12, scale: 0.95, color: 0xd8b070,
      stats: { maxHp: 15600, atk: 911, def: 425, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 7270, gold: [543, 760],
    },
    dune_scorpion: {
      id: 'dune_scorpion', name: '沙丘巨鉗蟹', level: 115, aggro: 'aggressive', shape: 'crab',
      radius: 0.65, respawn: 12, scale: 1.35, color: 0x8a6a3a,
      stats: { maxHp: 22000, atk: 1093, def: 425, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 7390, gold: [563, 788],
    },
    lamia_queen: {
      id: 'lamia_queen', name: '蛇身女王拉彌亞', level: 115, aggro: 'aggressive', shape: 'lamia', boss: true, element: 'poison',
      radius: 1.0, respawn: 90, scale: 2.2, color: 0x4a7a3a,
      stats: { maxHp: 582000, atk: 1030, def: 425, moveSpeed: 3.4 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 127000, gold: [48000, 58600], gems: 69,
      bossSkills: ['lamia_coil', 'lamia_venom', 'lamia_lunge', 'lamia_grief'],
    },
  },
};
