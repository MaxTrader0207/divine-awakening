import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十八層・厄律提亞島（副本 Lv.86-90，防禦 335）
 * 世界最西邊、太陽落下的紅色島嶼：三身巨人革律翁的紅牛在這裡吃草，雙頭犬與巨人牧工看守。
 * 海克力斯的第十項試煉：他在海峽兩岸立起兩根石柱，才來到這座島。
 * 小怪：厄律提亞守犬、革律翁紅牛、巨人牧工。首領：三身巨人革律翁（三身擲矛、六臂橫掃、巨人踐踏）。
 */
const SEA = 0x3a5a8a;
const SUNSTONE = 0xd8a080;

const zone: ZoneDef = {
  id: 'dungeon_18',
  kind: 'dungeon',
  bossMusic: 'titan',
  name: '厄律提亞島',
  subtitle: '第十八層・日落之島',
  region: '厄律提亞島',
  levelRange: [86, 90],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x9a6a4a,
  skyColor: 0xd8805a,
  fogColor: 0xc87a5a,
  fogRange: [30, 76],
  patches: [
    { x: 21, z: 2, w: 12, d: 60, color: SEA, water: true }, // 西海
    { x: -4, z: 8, w: 5, d: 32, color: 0xb88a5a },
    { x: -14, z: 18, w: 11, d: 8, color: 0x8a5a3a }, // 紅牛的牧場
    { x: 6, z: -4, w: 10, d: 7, color: 0x8a5a3a },
  ],
  platforms: [{ x: 0, z: -22, w: 28, d: 16, h: 2, color: 0x7a4a3a, stairs: { x: 0, width: 5 } }],
  props: [
    // 海克力斯之柱
    { kind: 'column', x: -6, z: 28, h: 6, color: SUNSTONE },
    { kind: 'column', x: 6, z: 28, h: 6, color: SUNSTONE },
    { kind: 'fence', x: -14, z: 22.5, w: 11, d: 0.3, color: 0x7a4a2a },
    { kind: 'fence', x: -20, z: 18, w: 0.3, d: 9, color: 0x7a4a2a },
    { kind: 'rock', x: 13, z: 22, color: 0x6a4a3a },
    { kind: 'rock', x: 13, z: 8, color: 0x6a4a3a },
    { kind: 'rock', x: 13, z: -10, color: 0x6a4a3a },
    { kind: 'rock', x: -20, z: -4, color: 0x6a4a3a },
    { kind: 'palm', x: -21, z: 26 },
    { kind: 'palm', x: -22, z: 6 },
    { kind: 'palm', x: -21, z: -12 },
    { kind: 'statue', x: -9, z: 6, rot: 0.5, color: SUNSTONE }, // 赫利俄斯像（太陽的金杯船停在這裡）
    { kind: 'decor', x: 8, z: 18, h: 1.0, model: 'sack', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 革律翁的王座
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xc84a2a },
    ...pillarRing(0, -23, 6, 8, 0x8a5a4a),
    { kind: 'decor', x: -11, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 335', '東邊是海，不能走', '三身擲矛是三排直線，站在兩排之間', '巨人踐踏落地範圍大，看到影子就跑'],
  spawns: [
    { enemy: 'geryon_cattle', x: -14, z: 18, count: 3, spread: 3 },
    { enemy: 'erytheia_hound', x: 6, z: 18, count: 2, spread: 3 },
    { enemy: 'giant_herder', x: -3, z: 12, count: 1 },
    { enemy: 'geryon_cattle', x: 6, z: -4, count: 3, spread: 3 },
    { enemy: 'erytheia_hound', x: -12, z: -2, count: 3, spread: 3 },
    { enemy: 'giant_herder', x: -2, z: -7, count: 1 },
    { enemy: 'geryon', x: 0, z: -23 },
    { enemy: 'giant_shade', x: 6, z: 18, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'sunset_harpy', x: 6, z: -4, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 18, enemyDefense: 335, unlockAfter: 'dungeon_17' },
};

export const erytheiaIsle: StageDef = {
  zone,
  enemies: {
    erytheia_hound: {
      id: 'erytheia_hound', name: '厄律提亞守犬', level: 86, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.2, color: 0x6a2a1a,
      stats: { maxHp: 10100, atk: 717, def: 335, moveSpeed: 5.0 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 4380, gold: [301, 421],
    },
    geryon_cattle: {
      id: 'geryon_cattle', name: '革律翁紅牛', level: 87, aggro: 'aggressive', shape: 'bull',
      radius: 0.65, respawn: 12, scale: 1.2, color: 0xa82a1a,
      stats: { maxHp: 14200, atk: 722, def: 335, moveSpeed: 4.0 },
      attack: melee(1.7, 0.55, 1.6),
      exp: 4470, gold: [313, 438],
    },
    giant_herder: {
      id: 'giant_herder', name: '巨人牧工', level: 88, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.15, color: 0x8a5a4a,
      stats: { maxHp: 17200, atk: 727, def: 335, moveSpeed: 2.4 },
      attack: melee(2.0, 0.65, 1.8),
      exp: 4560, gold: [325, 455],
    },
    geryon: {
      id: 'geryon', name: '三身巨人革律翁', level: 90, aggro: 'aggressive', shape: 'geryon', boss: true, element: 'metal',
      radius: 0.95, respawn: 90, scale: 1.7, color: 0xd8a080,
      stats: { maxHp: 384000, atk: 820, def: 335, moveSpeed: 3.0 },
      attack: melee(3.0, 0.6, 1.7),
      exp: 82000, gold: [27200, 33200], gems: 54,
      bossSkills: ['geryon_spears', 'geryon_sweep', 'geryon_leap'],
    },
    giant_shade: {
      id: 'giant_shade', name: '巨人戰士亡魂', level: 89, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.55, respawn: 12, scale: 1.16, color: 0xe8e2d0,
      stats: { maxHp: 17100, atk: 874, def: 335, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 6010, gold: [410, 586],
    },
    sunset_harpy: {
      id: 'sunset_harpy', name: '夕陽鳥妖', level: 87, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xe88a4a,
      stats: { maxHp: 10200, atk: 769, def: 335, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 4950, gold: [337, 481],
    },
  },
};
