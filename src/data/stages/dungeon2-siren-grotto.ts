import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 第二層・賽蓮海蝕洞（副本 Lv.5-10，防禦 18）
 * 小怪：特里同珊瑚泥、斯廷法利斯蝠鳥。首領：青銅巨人塔洛斯（震地、潮水落下）。
 */
const zone: ZoneDef = {
  id: 'dungeon_2',
  kind: 'dungeon',
  music: 'sea',
  name: '賽蓮海蝕洞',
  subtitle: '第二層・海妖歌聲',
  region: '賽蓮海蝕洞',
  levelRange: [5, 10],
  safe: false,
  size: { w: 48, d: 60 },
  groundColor: 0x6f97a6,
  theme: { base: 'cave', particles: { kind: 'spray', colors: [0xe8f8ff, 0xc8eaff], count: 50 }, scatter: [{ kind: 'shell', density: 1.2, colors: [0xffe0d0, 0xf8c8a0], onPath: true }, { kind: 'pebble', density: 1.6, colors: [0x5a7a88, 0x6a8a94], onPath: true }, { kind: 'shard', density: 0.5, colors: [0x6fe3ff] }] }, // v1.93
  skyColor: 0x24323f,
  fogColor: 0x2f4654,
  patches: [
    { x: -18, z: 4, w: 12, d: 34, color: 0x2f86b0, water: true },
    { x: 2, z: 6, w: 6, d: 26, color: 0x86aab6 },
  ],
  platforms: [{ x: 4, z: -19, w: 24, d: 16, h: 1.2, color: 0x5a8090, stairs: { x: 4, width: 5 } }],
  props: [
    ...row('wall', -22, 26, 0, -6, 4, { w: 4, d: 2, h: 3.4, color: 0x4a6470 }),
    ...row('wall', 22, 26, 0, -6, 9, { w: 4, d: 2, h: 3.4, color: 0x4a6470 }),
    { kind: 'rock', x: -6, z: 10, color: 0xe58a8a },
    { kind: 'rock', x: 12, z: 2, color: 0xe58a8a },
    { kind: 'rock', x: -9, z: -6, color: 0xf0a0b0 },
    { kind: 'crystal', x: 14, z: 14, color: 0x8fe8ff },
    { kind: 'crystal', x: -10, z: 18, color: 0xb48cff },
    { kind: 'crystal', x: 16, z: -8, color: 0x8fe8ff },
    { kind: 'crystal', x: -8, z: -24, color: 0xb48cff },
    { kind: 'pillar', x: 10, z: 10, h: 3.2, color: 0x7a9aa8 },
    { kind: 'stonering', x: 6, z: -21, w: 10, d: 10, color: 0x9ab8c4 },
    ...pillarRing(6, -21, 5.6, 8, 0x7a9aa8),
    { kind: 'decor', x: 0.6, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 7.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -6, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 16, z: -24, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 18，記得堆穿透（帽子、戒指）', '斯廷法利斯蝠鳥速度很快，先用冰霜新星緩速', '青銅巨人塔洛斯會召喚潮水落下，看到紅圈就跑'],
  spawns: [
    { enemy: 'coral_slime', x: 4, z: 12, count: 3, spread: 4 },
    { enemy: 'cave_bat', x: -4, z: 0, count: 3, spread: 4 },
    { enemy: 'coral_slime', x: 12, z: -4, count: 2, spread: 3 },
    { enemy: 'cave_bat', x: 14, z: 18, count: 2, spread: 3 },
    { enemy: 'tide_golem', x: 6, z: -21 },
    { enemy: 'grotto_crab', x: -4, z: 0, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'siren_maid', x: 14, z: 18, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'cave_eel', x: -4, z: 0, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 2, enemyDefense: 18, unlockAfter: 'dungeon_1' },
};

export const sirenGrotto: StageDef = {
  zone,
  enemies: {
    coral_slime: {
      id: 'coral_slime', name: '特里同珊瑚泥', level: 6, aggro: 'aggressive', shape: 'slime',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0xf08a9a,
      stats: { maxHp: 470, atk: 58, def: 18, moveSpeed: 2.6 },
      attack: melee(1.2, 0.5, 1.6),
      exp: 42, gold: [10, 16],
    },
    cave_bat: {
      id: 'cave_bat', name: '斯廷法利斯蝠鳥', level: 7, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 1, color: 0x5a4a7a,
      stats: { maxHp: 380, atk: 62, def: 18, moveSpeed: 4 },
      attack: melee(1.1, 0.35, 1.3),
      exp: 46, gold: [10, 18],
    },
    tide_golem: {
      id: 'tide_golem', name: '青銅巨人塔洛斯', level: 10, aggro: 'aggressive', shape: 'golem', boss: true, element: 'metal',
      radius: 0.7, respawn: 90, scale: 2.4, color: 0x6a9ab0,
      stats: { maxHp: 24000, atk: 130, def: 18, moveSpeed: 2.2 },
      attack: melee(2.6, 0.7, 2),
      exp: 950, gold: [400, 520], gems: 8,
      bossSkills: ['ground_slam', 'tide_rain'],
    },
    grotto_crab: {
      id: 'grotto_crab', name: '海蝕洞寄居蟹', level: 9, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 12, scale: 1.5, color: 0x9a6a5a,
      stats: { maxHp: 1200, atk: 80, def: 18, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 130, gold: [27, 38],
    },
    siren_maid: {
      id: 'siren_maid', name: '賽蓮侍女', level: 8, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xc8a8d8,
      stats: { maxHp: 540, atk: 82, def: 18, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 92, gold: [20, 29],
    },
    cave_eel: {
      id: 'cave_eel', name: '洞窟海鰻', level: 7, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0x2a6a7a,
      stats: { maxHp: 330, atk: 60, def: 18, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 43, gold: [12, 17],
    },
  },
};
