import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第五層・克諾索斯迷宮（副本 Lv.21-25，防禦 75）
 * 代達洛斯為米諾斯王建造的迷宮：三道長牆把地圖切成來回的走廊（右 → 左 → 右），
 * 牆上有火把，走廊中間有半截牆柱。終點的高台上是米諾陶洛斯。
 * 小怪：代達洛斯機關兵、克里特狂牛、雅典祭品亡魂。首領：米諾陶洛斯（雙刃斧橫掃、狂牛衝撞、迷宮落石）。
 */
const WALL = 0x9a8a6a;
const wall = (x: number, z: number, w: number, d: number): PropDef => ({ kind: 'wall', x, z, w, d, h: 3.4, color: WALL });

const zone: ZoneDef = {
  id: 'dungeon_5',
  kind: 'dungeon',
  name: '克諾索斯迷宮',
  subtitle: '第五層・代達洛斯的迷宮',
  region: '克諾索斯迷宮',
  levelRange: [21, 25],
  safe: false,
  size: { w: 56, d: 64 },
  groundColor: 0xb8a888,
  skyColor: 0x4a3e34,
  fogColor: 0x6a5a48,
  fogRange: [34, 80],
  patches: [
    // 地面的回紋石板
    { x: 0, z: 24, w: 10, d: 14, color: 0xcfc0a0 },
    { x: 0, z: 11, w: 50, d: 2, color: 0xa89878 },
    { x: 0, z: 1, w: 50, d: 2, color: 0xa89878 },
    { x: 0, z: -21, w: 14, d: 14, color: 0xd8c8a8 },
  ],
  platforms: [{ x: 0, z: -21, w: 28, d: 16, h: 1, color: 0x8a7a5a, stairs: { x: 0, width: 5 } }],
  props: [
    // 三道長牆：缺口依序在右、左、右
    wall(-9, 16, 38, 1.2),
    wall(9, 6, 38, 1.2),
    wall(-9, -4, 38, 1.2),
    // 走廊中的半截牆（留兩側通道）
    wall(4, 11, 1.2, 4),
    wall(-20, 11, 1.2, 4),
    wall(-4, 1, 1.2, 4),
    wall(18, 1, 1.2, 4),
    // 入口的石柱與陶罐
    { kind: 'column', x: -5, z: 21 },
    { kind: 'column', x: 5, z: 21 },
    { kind: 'amphora', x: -22, z: 27 },
    { kind: 'amphora', x: 23, z: 26, h: 0.9 },
    // 牆上的火把
    ...[[-20, 15.2], [-4, 15.2], [6, 6.8], [22, 6.8], [-20, -3.2], [-4, -3.2], [-20, 6.8], [20, -4.8]].map(
      ([x, z]): PropDef => ({ kind: 'decor', x, z, h: 1.6, model: 'torch', solid: false }),
    ),
    { kind: 'decor', x: 24, z: -8, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -24, z: 20, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
    { kind: 'stonering', x: 0, z: -22, w: 10, d: 10, color: 0xc8b898 },
    ...pillarRing(0, -22, 5.6, 8, 0x8a7a5a),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 25 },
  tips: ['這層敵人有防禦 75', '迷宮是來回的走廊：右 → 左 → 右，終點在最北邊', '米諾陶洛斯的狂牛衝撞很長，往側邊閃，不要往後退', '克里特狂牛衝得很快，騎士可以用盾擊打斷'],
  spawns: [
    { enemy: 'daedalus_automaton', x: -16, z: 23, count: 2, spread: 3 },
    { enemy: 'athenian_shade', x: -12, z: 11, count: 3, spread: 2.5 },
    { enemy: 'daedalus_automaton', x: 16, z: 11, count: 2, spread: 2.5 },
    { enemy: 'cretan_bull', x: 6, z: 1, count: 2, spread: 2.5 },
    { enemy: 'athenian_shade', x: -18, z: 1, count: 2, spread: 2 },
    { enemy: 'cretan_bull', x: 18, z: -9, count: 2, spread: 2.5 },
    { enemy: 'minotaur', x: 0, z: -22 },
  ],
  dungeon: { floor: 5, enemyDefense: 75, unlockAfter: 'dungeon_4' },
};

export const knossosLabyrinth: StageDef = {
  zone,
  enemies: {
    daedalus_automaton: {
      id: 'daedalus_automaton', name: '代達洛斯機關兵', level: 21, aggro: 'aggressive', shape: 'golem',
      radius: 0.6, respawn: 12, scale: 1.05, color: 0xb8863a,
      stats: { maxHp: 2600, atk: 175, def: 75, moveSpeed: 2.4 },
      attack: melee(1.6, 0.7, 2),
      exp: 430, gold: [52, 78],
    },
    cretan_bull: {
      id: 'cretan_bull', name: '克里特狂牛', level: 22, aggro: 'aggressive', shape: 'bull',
      radius: 0.7, respawn: 12, scale: 1.1, color: 0x6a4a3a,
      stats: { maxHp: 2300, atk: 190, def: 75, moveSpeed: 4 },
      attack: melee(1.6, 0.5, 1.6),
      exp: 450, gold: [54, 80],
    },
    athenian_shade: {
      id: 'athenian_shade', name: '雅典祭品亡魂', level: 23, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_rogue',
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 2000, atk: 200, def: 75, moveSpeed: 4.2 },
      attack: melee(1.3, 0.4, 1.3),
      exp: 470, gold: [56, 84],
    },
    minotaur: {
      id: 'minotaur', name: '米諾陶洛斯', level: 25, aggro: 'aggressive', shape: 'minotaur', boss: true, element: 'earth',
      radius: 0.6, respawn: 90, scale: 1.9, color: 0x5a3a2a,
      stats: { maxHp: 84000, atk: 270, def: 75, moveSpeed: 3 },
      attack: melee(2.8, 0.6, 1.7),
      exp: 7600, gold: [2600, 3400], gems: 16,
      bossSkills: ['labrys_sweep', 'bull_rush', 'labyrinth_quake'],
    },
  },
};
