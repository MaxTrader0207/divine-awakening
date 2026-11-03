import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第四層・勒拿沼澤（副本 Lv.16-20，防禦 55）
 * 赫拉克勒斯第二項功績的舞台：濃霧、毒沼、枯樹與蘆葦。
 * 小怪：勒拿水蛇、勒拿毒蟾、艾洛鷹身女妖。首領：九頭蛇許德拉（毒液噴吐、九頭齊咬、毒霧落下）。
 */
const POOL = 0x3d5a3a;
const DEAD_TREE = 0x4a4632;
const REED = 0x7a8a4a;

const zone: ZoneDef = {
  id: 'dungeon_4',
  kind: 'dungeon',
  name: '勒拿沼澤',
  subtitle: '第四層・九頭蛇之沼',
  region: '勒拿沼澤',
  levelRange: [16, 20],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0x55623e,
  skyColor: 0x7a8a70,
  fogColor: 0x6e7c5c,
  fogRange: [30, 72],
  mist: true,
  patches: [
    // 毒沼（不能走）
    { x: -14, z: 10, w: 10, d: 8, color: POOL, water: true },
    { x: 15, z: 5, w: 8, d: 9, color: POOL, water: true },
    { x: -9, z: -5, w: 6, d: 4, color: POOL, water: true },
    { x: 17, z: 20, w: 7, d: 5, color: POOL, water: true },
    { x: -19, z: -14, w: 6, d: 6, color: POOL, water: true },
    // 泥巴小路
    { x: 0, z: 6, w: 5, d: 30, color: 0x6a6040 },
    { x: 5, z: 14, w: 12, d: 4, color: 0x6a6040 },
  ],
  platforms: [{ x: 0, z: -20, w: 24, d: 14, h: 1.2, color: 0x4e5a3a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'tree', x: -21, z: 20, h: 4.2, color: DEAD_TREE },
    { kind: 'tree', x: 21, z: 12, h: 4.8, color: DEAD_TREE },
    { kind: 'tree', x: -20, z: 1, h: 4, color: DEAD_TREE },
    { kind: 'tree', x: 9, z: -6, h: 3.8, color: DEAD_TREE },
    { kind: 'tree', x: -15, z: -24, h: 4.5, color: DEAD_TREE },
    { kind: 'tree', x: 17, z: -25, h: 4.2, color: DEAD_TREE },
    ...[[-9, 14], [-19, 7], [-9, 7], [11, 1], [19, 9], [14, 23], [-6, -3], [-22, -11]].map(([x, z]) => ({ kind: 'bush' as const, x, z, color: REED })),
    { kind: 'rock', x: 7, z: 20, color: 0x4a4a3a },
    { kind: 'rock', x: -4, z: 1, color: 0x4a4a3a },
    { kind: 'rock', x: 20, z: -9, color: 0x4a4a3a },
    { kind: 'pillar', x: -22, z: 16, h: 1.4, color: 0x6a7060 },
    { kind: 'pillar', x: 22, z: -3, h: 2, color: 0x6a7060 },
    { kind: 'crystal', x: -12, z: 21, color: 0x9fe36a },
    { kind: 'crystal', x: 12, z: -12, color: 0x9fe36a },
    { kind: 'stonering', x: 0, z: -21, w: 10, d: 10, color: 0x6a7a5a },
    ...pillarRing(0, -21, 5.6, 8, 0x5a6a4a),
    { kind: 'decor', x: -3.4, z: -12.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -12.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: 25, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -8, z: -25, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 55，穿透很重要', '毒沼不能走，沿著泥巴小路前進', '九頭齊咬：頭與頭之間是安全區，站到縫隙裡', '鷹身女妖很快，先緩速或用範圍技能'],
  spawns: [
    { enemy: 'lerna_serpent', x: -3, z: 13, count: 3, spread: 3 },
    { enemy: 'lerna_toad', x: 6, z: 3, count: 3, spread: 3 },
    { enemy: 'aello_harpy', x: 9, z: 14, count: 2, spread: 3 },
    { enemy: 'lerna_serpent', x: 13, z: -6, count: 2, spread: 3 },
    { enemy: 'lerna_toad', x: -14, z: 0, count: 2, spread: 3 },
    { enemy: 'aello_harpy', x: -6, z: -9, count: 2, spread: 3 },
    { enemy: 'hydra', x: 0, z: -21 },
  ],
  dungeon: { floor: 4, enemyDefense: 55, unlockAfter: 'dungeon_3' },
};

export const lernaSwamp: StageDef = {
  zone,
  enemies: {
    lerna_serpent: {
      id: 'lerna_serpent', name: '勒拿水蛇', level: 16, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0x3f7a4a,
      stats: { maxHp: 1500, atk: 140, def: 55, moveSpeed: 3 },
      attack: melee(1.5, 0.5, 1.6),
      exp: 300, gold: [40, 60],
    },
    lerna_toad: {
      id: 'lerna_toad', name: '勒拿毒蟾', level: 17, aggro: 'aggressive', shape: 'frog', model: 'frog',
      radius: 0.65, respawn: 12, scale: 1.2, color: 0x7a5aa0,
      stats: { maxHp: 1700, atk: 150, def: 55, moveSpeed: 3.2 },
      attack: melee(1.4, 0.5, 1.6),
      exp: 320, gold: [42, 64],
    },
    aello_harpy: {
      id: 'aello_harpy', name: '艾洛鷹身女妖', level: 18, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1, color: 0x8a6a4a,
      stats: { maxHp: 1350, atk: 165, def: 55, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.3),
      exp: 340, gold: [44, 68],
    },
    hydra: {
      id: 'hydra', name: '九頭蛇許德拉', level: 20, aggro: 'aggressive', shape: 'hydra', boss: true,
      radius: 0.9, respawn: 90, scale: 2, color: 0x3f7a4a,
      stats: { maxHp: 72000, atk: 245, def: 55, moveSpeed: 2.4 },
      attack: melee(3, 0.6, 1.8),
      exp: 5400, gold: [1900, 2500], gems: 14,
      bossSkills: ['venom_spit', 'hydra_heads', 'poison_rain'],
    },
  },
};
