import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 多多納聖林（野外 Lv.11-25，需要 Lv.11）
 * 阿卡迪亞草原東側出口進入。大片樹林、濃霧、龍牙兵群；北邊石圈有菁英首領龍牙將軍（衝撞、震地）。
 */
const MIST_CLEAR = [
  { x: -30, z: 20, r: 7 }, // 入口
  { x: -14, z: 14, r: 7 },
  { x: 8, z: 18, r: 7 },
  { x: 14, z: -2, r: 7 },
  { x: -12, z: -8, r: 7 },
  { x: 0, z: -24, r: 9 }, // 首領石圈
  { x: -22, z: 6, r: 4 },
  { x: -4, z: 4, r: 5 },
  { x: 4, z: -12, r: 4 },
];

const zone: ZoneDef = {
  id: 'mistwood',
  music: 'forest',
  kind: 'field',
  name: '多多納聖林',
  subtitle: '多多納聖林・Lv.11-25',
  region: '赫拉斯大陸',
  levelRange: [11, 25],
  minLevel: 11,
  lootTier: 4,
  safe: false,
  size: { w: 70, d: 64 },
  groundColor: 0x4f7a52,
  skyColor: 0x8fa8a0,
  fogColor: 0xb7c8c0,
  fogRange: [38, 78],
  mist: true,
  patches: [
    { x: -20, z: 20, w: 24, d: 5, color: 0x6e6450 },
    { x: -4, z: 8, w: 5, d: 26, color: 0x6e6450 },
    { x: 6, z: -6, w: 24, d: 5, color: 0x6e6450 },
    { x: 0, z: -18, w: 5, d: 18, color: 0x6e6450 },
    { x: 24, z: 22, w: 10, d: 8, color: 0x3a6a8a, water: true },
  ],
  props: [
    ...scatterTrees(20261102, 62, 70, 64, MIST_CLEAR.concat([{ x: -20, z: 20, r: 3 }, { x: -4, z: 8, r: 3 }, { x: 6, z: -6, r: 3 }, { x: 0, z: -14, r: 3 }])),
    { kind: 'stonering', x: 0, z: -24, w: 11, d: 11, color: 0x8a9a90 },
    ...pillarRing(0, -24, 6.2, 8, 0x7a8a80),
    { kind: 'decor', x: -27, z: 16, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -27, z: 24, h: 1.6, model: 'torch', solid: false },
    { kind: 'rock', x: -8, z: 0, color: 0x7a8a80 },
    { kind: 'rock', x: 18, z: 4, color: 0x7a8a80 },
    { kind: 'pillar', x: -16, z: -4, h: 1.8, color: 0x7a8a80 },
    { kind: 'pillar', x: 10, z: 14, h: 2.4, color: 0x7a8a80 },
    { kind: 'decor', x: 12, z: -26, h: 1.3, model: 'chest_gold' },
    { kind: 'decor', x: -12, z: 18, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: -33, z: 20, radius: 2.6, to: 'grassland', arrive: { x: 29, z: 4 }, label: '阿卡迪亞草原', style: 'edge' }],
  spawn: { x: -29, z: 20 },
  tips: ['多多納聖林需要 Lv.11', '黑卡蒂亡巫會從遠處施法，看到腳下紅圈就移動', '北邊石圈的龍牙將軍非常強，建議 Lv.22 以上', '這裡掉落第 4 階裝備'],
  spawns: [
    { enemy: 'skeleton_minion', x: -14, z: 14, count: 4, spread: 4 },
    { enemy: 'skeleton_rogue', x: 8, z: 18, count: 3, spread: 4 },
    { enemy: 'skeleton_minion', x: -4, z: 4, count: 2, spread: 3 },
    { enemy: 'skeleton_warrior', x: 14, z: -2, count: 3, spread: 4 },
    { enemy: 'skeleton_mage', x: -12, z: -8, count: 3, spread: 4 },
    { enemy: 'skeleton_warrior', x: 4, z: -12, count: 2, spread: 3 },
    { enemy: 'skeleton_lord', x: 0, z: -24 },
  ],
};

export const dodonaGrove: StageDef = {
  zone,
  enemies: {
    skeleton_minion: {
      id: 'skeleton_minion', name: '龍牙兵', level: 14, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_minion',
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 1100, atk: 112, def: 30, moveSpeed: 2.8 },
      attack: melee(1.4, 0.55, 1.6),
      exp: 220, gold: [30, 46],
    },
    skeleton_rogue: {
      id: 'skeleton_rogue', name: '冥河盜骸', level: 16, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_rogue',
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 1000, atk: 126, def: 30, moveSpeed: 4.2 },
      attack: melee(1.3, 0.4, 1.3),
      exp: 260, gold: [34, 52],
    },
    skeleton_warrior: {
      id: 'skeleton_warrior', name: '龍牙重裝兵', level: 19, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0xe8e2d0,
      stats: { maxHp: 1750, atk: 148, def: 46, moveSpeed: 2.6 },
      attack: melee(1.5, 0.6, 1.7),
      exp: 340, gold: [42, 64],
    },
    skeleton_mage: {
      id: 'skeleton_mage', name: '黑卡蒂亡巫', level: 21, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 1300, atk: 162, def: 34, moveSpeed: 2.4 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 380, gold: [46, 70],
    },
    skeleton_lord: {
      id: 'skeleton_lord', name: '龍牙將軍', level: 24, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior', boss: true,
      radius: 0.62, respawn: 120, scale: 1.7, color: 0xe8e2d0,
      stats: { maxHp: 60000, atk: 230, def: 55, moveSpeed: 2.8 },
      attack: melee(2.2, 0.6, 1.6),
      exp: 4200, gold: [1500, 2000], gems: 10,
      bossSkills: ['charge', 'ground_slam'],
    },
  },
};
