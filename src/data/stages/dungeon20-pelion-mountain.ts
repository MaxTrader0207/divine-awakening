import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 第二十層・佩利翁山（副本 Lv.96-100，防禦 375）
 * 半人馬族世代居住的松林高山：賢者喀戎在山洞裡教出了阿基里斯與伊阿宋，
 * 但不是每個半人馬都像他一樣——涅索斯在河邊想擄走德伊阿妮拉，被海克力斯的毒箭射穿。
 * 小怪：半人馬掠奪者、拉庇泰亡魂、佩利翁山獅。首領：半人馬涅索斯（連珠箭、馬蹄踐踏、毒血之雨）。
 */
const PINE = 0x234a32;
const CLIFF = 0x5a5a52;

const zone: ZoneDef = {
  id: 'dungeon_20',
  kind: 'dungeon',
  music: 'wild',
  bossMusic: 'titan',
  name: '佩利翁山',
  subtitle: '第二十層・半人馬的松林',
  region: '佩利翁山',
  levelRange: [96, 100],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x4f6a3a,
  skyColor: 0x6a98c0,
  fogColor: 0x8aa8b8,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 5, d: 34, color: 0x7a6a4a },
    { x: 14, z: 2, w: 20, d: 3, color: 0x4a7a9a, water: true }, // 歐厄諾斯河
    { x: -15, z: 2, w: 18, d: 3, color: 0x4a7a9a, water: true },
    { x: -14, z: 20, w: 9, d: 7, color: 0x6a7a4a },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2.2, color: 0x5a5a4a, stairs: { x: 0, width: 5 } }],
  props: [
    ...scatterTrees(2020, 24, 54, 64, [
      ...Array.from({ length: 12 }, (_, i) => ({ x: 0, z: 30 - i * 5, r: 5 })),
      ...Array.from({ length: 11 }, (_, i) => ({ x: -25 + i * 5, z: 2, r: 2.8 })),
      { x: 0, z: -22, r: 18 }, { x: -18, z: 12, r: 5 },
      { x: -12, z: 20, r: 5 }, { x: 10, z: 18, r: 5 }, { x: -2, z: 14, r: 4 }, { x: 12, z: -6, r: 5 }, { x: -12, z: -6, r: 5 }, { x: 0, z: -6, r: 4 },
    ]).map((t) => ({ ...t, color: PINE })),
    // 喀戎的山洞
    { kind: 'wall', x: -21, z: 12, w: 2, d: 8, h: 4, color: CLIFF },
    { kind: 'wall', x: -17, z: 15.5, w: 8, d: 1.5, h: 4, color: CLIFF },
    { kind: 'decor', x: -18, z: 11, h: 1.6, model: 'torch', solid: false },
    { kind: 'rock', x: 8, z: 8, color: CLIFF },
    { kind: 'rock', x: -7, z: -10, color: CLIFF },
    { kind: 'decor', x: 17, z: 24, h: 1.2, model: 'weaponrack' },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 半人馬的聚會場
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x8a2a4a },
    ...pillarRing(0, -23, 6, 8, CLIFF),
    { kind: 'decor', x: 12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 375', '河只能從中間的淺灘過', '連珠箭是扇形的多排直線，貼近首領反而好躲', '毒血之雨落點多，邊打邊移動'],
  spawns: [
    { enemy: 'centaur_raider', x: -12, z: 20, count: 3, spread: 3 },
    { enemy: 'pelion_lion', x: 10, z: 18, count: 2, spread: 3 },
    { enemy: 'lapith_shade', x: -2, z: 14, count: 1 },
    { enemy: 'centaur_raider', x: 12, z: -6, count: 3, spread: 3 },
    { enemy: 'lapith_shade', x: -12, z: -6, count: 3, spread: 3 },
    { enemy: 'pelion_lion', x: 0, z: -6, count: 2, spread: 2.5 },
    { enemy: 'nessus', x: 0, z: -23 },
    { enemy: 'pelion_boar', x: 10, z: 18, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'peak_harpy', x: 12, z: -6, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 20, enemyDefense: 375, unlockAfter: 'dungeon_19' },
};

export const pelionMountain: StageDef = {
  zone,
  enemies: {
    centaur_raider: {
      id: 'centaur_raider', name: '半人馬掠奪者', level: 96, aggro: 'aggressive', shape: 'centaur',
      radius: 0.65, respawn: 12, scale: 0.9, color: 0x7a5a3a,
      stats: { maxHp: 15800, atk: 806, def: 375, moveSpeed: 4.4 },
      attack: melee(1.8, 0.5, 1.5),
      exp: 5340, gold: [364, 510],
    },
    lapith_shade: {
      id: 'lapith_shade', name: '拉庇泰亡魂', level: 97, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0xd0c8b8,
      stats: { maxHp: 15000, atk: 801, def: 375, moveSpeed: 3.4 },
      attack: melee(1.6, 0.55, 1.6),
      exp: 5440, gold: [379, 531],
    },
    pelion_lion: {
      id: 'pelion_lion', name: '佩利翁山獅', level: 98, aggro: 'aggressive', shape: 'lion',
      radius: 0.6, respawn: 12, scale: 0.85, color: 0x8a7050,
      stats: { maxHp: 14300, atk: 811, def: 375, moveSpeed: 4.6 },
      attack: melee(1.5, 0.45, 1.35),
      exp: 5540, gold: [394, 552],
    },
    nessus: {
      id: 'nessus', name: '半人馬涅索斯', level: 100, aggro: 'aggressive', shape: 'centaur', boss: true, element: 'poison',
      radius: 0.9, respawn: 90, scale: 1.75, color: 0x5a3a2a,
      stats: { maxHp: 464000, atk: 910, def: 375, moveSpeed: 4.0 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 99000, gold: [34200, 41700], gems: 60,
      bossSkills: ['nessus_volley', 'nessus_trample', 'nessus_blood'],
    },
    pelion_boar: {
      id: 'pelion_boar', name: '佩利翁野豬', level: 99, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1.21, color: 0x5a4a3a,
      stats: { maxHp: 19800, atk: 973, def: 375, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 7270, gold: [498, 711],
    },
    peak_harpy: {
      id: 'peak_harpy', name: '山巔鷹妖', level: 97, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x9a8a6a,
      stats: { maxHp: 11900, atk: 858, def: 375, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 6030, gold: [408, 583],
    },
  },
};
