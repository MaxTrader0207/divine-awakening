import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第三層・赫菲斯托斯熔爐（副本 Lv.10-15，防禦 40）
 * 小怪：火神熔泥、奇美拉火蛙。首領：堤豐巨蛙（飛撲砸地、熔岩噴吐）。
 */
const zone: ZoneDef = {
  id: 'dungeon_3',
  kind: 'dungeon',
  music: 'inferno',
  name: '赫菲斯托斯熔爐',
  subtitle: '第三層・埃特納火山',
  region: '赫菲斯托斯熔爐',
  levelRange: [10, 15],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0x8a6448,
  skyColor: 0xc98a6a,
  fogColor: 0x9a6a50,
  patches: [
    { x: 15, z: 8, w: 10, d: 12, color: 0xff6a1a, water: true },
    { x: -15, z: -4, w: 8, d: 10, color: 0xff6a1a, water: true },
    { x: 0, z: 8, w: 6, d: 26, color: 0x6e4e38 },
  ],
  platforms: [{ x: 0, z: -19, w: 26, d: 16, h: 1.6, color: 0x5e4232, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'rock', x: -8, z: 14, color: 0x4a3426 },
    { kind: 'rock', x: 8, z: -2, color: 0x4a3426 },
    { kind: 'rock', x: -20, z: 16, color: 0x4a3426 },
    { kind: 'rock', x: 20, z: -6, color: 0x4a3426 },
    { kind: 'crystal', x: 8, z: 18, color: 0xff8a3c },
    { kind: 'crystal', x: -12, z: 6, color: 0xff8a3c },
    { kind: 'crystal', x: 18, z: -14, color: 0xffb36b },
    { kind: 'pillar', x: -6, z: 2, h: 2.4, color: 0x6b4a36 },
    { kind: 'stonering', x: 0, z: -21, w: 10, d: 10, color: 0x9a6a50 },
    ...pillarRing(0, -21, 5.6, 8, 0x6b4a36),
    { kind: 'decor', x: -3.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 10, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -16, z: 20, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 40，記得堆穿透', '熔岩池不能踩', '堤豐巨蛙會跳到你身上，看到紅圈立刻閃開'],
  spawns: [
    { enemy: 'lava_slime', x: -6, z: 12, count: 3, spread: 4 },
    { enemy: 'ember_frog', x: 6, z: 0, count: 3, spread: 4 },
    { enemy: 'lava_slime', x: -10, z: -6, count: 2, spread: 3 },
    { enemy: 'ember_frog', x: 12, z: 16, count: 2, spread: 3 },
    { enemy: 'magma_frog', x: 0, z: -21 },
  ],
  dungeon: { floor: 3, enemyDefense: 40, unlockAfter: 'dungeon_2' },
};

export const hephaestusForge: StageDef = {
  zone,
  enemies: {
    lava_slime: {
      id: 'lava_slime', name: '火神熔泥', level: 11, aggro: 'aggressive', shape: 'slime',
      radius: 0.7, respawn: 12, scale: 1.25, color: 0xff6a2a,
      stats: { maxHp: 860, atk: 96, def: 40, moveSpeed: 2.6 },
      attack: melee(1.3, 0.5, 1.6),
      exp: 95, gold: [22, 34],
    },
    ember_frog: {
      id: 'ember_frog', name: '奇美拉火蛙', level: 12, aggro: 'aggressive', shape: 'frog', model: 'frog',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0xc9442a,
      stats: { maxHp: 790, atk: 104, def: 40, moveSpeed: 3.4 },
      attack: melee(1.3, 0.45, 1.5),
      exp: 105, gold: [24, 38],
    },
    magma_frog: {
      id: 'magma_frog', name: '堤豐巨蛙', level: 15, aggro: 'aggressive', shape: 'frog', model: 'frog', boss: true,
      radius: 0.7, respawn: 90, scale: 2.8, color: 0xb8321e,
      stats: { maxHp: 46000, atk: 185, def: 40, moveSpeed: 3 },
      attack: melee(2.6, 0.6, 1.8),
      exp: 2600, gold: [900, 1200], gems: 12,
      bossSkills: ['leap', 'lava_spit'],
    },
  },
};
