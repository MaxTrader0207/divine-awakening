import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十二層・冥王黑帝斯的國度（副本 Lv.56-60，防禦 215）
 * 冥府的長春花原野：灰白的花海、黑色的柏樹、冥王宮殿的黑色石柱，遠處是忘川勒特河。
 * 維吉爾《埃涅阿斯紀》：冥府門口守著奇美拉、許德拉、戈爾貢、鷹身女妖的幽影——最深處等著的是噴火的奇美拉。
 * 小怪：冥府亡靈戰士、厄里倪厄斯、拉彌亞。首領：奇美拉（獅首烈焰、三首衝撞、三首齊噴）。
 */
const LETHE = 0x5a6a9a;
const OBSIDIAN = 0x2a2430;
const asphodel = (x: number, z: number): PropDef => ({ kind: 'bush', x, z, color: 0xb8b8c8 }); // 灰白的長春花叢

const zone: ZoneDef = {
  id: 'dungeon_12',
  kind: 'dungeon',
  music: 'inferno',
  bossMusic: 'titan',
  name: '冥王黑帝斯的國度',
  subtitle: '第十二層・長春花原野',
  region: '冥王黑帝斯的國度',
  levelRange: [56, 60],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x4a4652,
  skyColor: 0x14101a,
  fogColor: 0x2a2234,
  fogRange: [28, 72],
  mist: true,
  patches: [
    // 忘川：中間兩座橋
    { x: -18, z: 8, w: 18, d: 5, color: LETHE, water: true },
    { x: 0, z: 8, w: 8, d: 5, color: LETHE, water: true },
    { x: 18, z: 8, w: 18, d: 5, color: LETHE, water: true },
    { x: -7, z: 8, w: 3, d: 5, color: 0x6a6070 },
    { x: 7, z: 8, w: 3, d: 5, color: 0x6a6070 },
    // 長春花原野
    { x: -14, z: 20, w: 12, d: 8, color: 0x6a6a72 },
    { x: 14, z: -4, w: 12, d: 8, color: 0x6a6a72 },
    { x: 0, z: -6, w: 5, d: 12, color: 0x3a3442 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x2e2836, stairs: { x: 0, width: 5 } }],
  props: [
    asphodel(-16, 22), asphodel(-11, 18), asphodel(-18, 16), asphodel(13, -2), asphodel(17, -7), asphodel(10, -6), asphodel(-6, 25), asphodel(8, 20),
    { kind: 'cypress', x: -22, z: 26, color: 0x1e2a22 },
    { kind: 'cypress', x: 22, z: 24, color: 0x1e2a22 },
    { kind: 'cypress', x: -22, z: -6, color: 0x1e2a22 },
    { kind: 'cypress', x: 22, z: -14, color: 0x1e2a22 },
    { kind: 'cypress', x: -14, z: -14, color: 0x1e2a22 },
    // 冥王宮殿的黑色石柱
    ...[-11, -5, 5, 11].map((x): PropDef => ({ kind: 'column', x, z: -12.5, color: OBSIDIAN })),
    { kind: 'column', x: -4, z: 13, color: OBSIDIAN },
    { kind: 'column', x: 4, z: 13, color: OBSIDIAN },
    { kind: 'statue', x: -16, z: 2, rot: 0.8, color: 0x5a5a66 },
    { kind: 'statue', x: 17, z: 18, rot: -0.8, color: 0x5a5a66 },
    { kind: 'crystal', x: -20, z: 13, color: 0x8a6aff },
    { kind: 'crystal', x: 20, z: 3, color: 0x8a6aff },
    { kind: 'crystal', x: -9, z: -8, color: 0xff6a3a },
    { kind: 'crystal', x: 20, z: -24, color: 0xff6a3a },
    { kind: 'rock', x: 9, z: 26, color: 0x2a2630 },
    { kind: 'rock', x: -4, z: -2, color: 0x2a2630 },
    { kind: 'decor', x: -8, z: 2, h: 1.0, model: 'rubble', solid: false },
    // 冥府王座前
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x6a3a8a },
    ...pillarRing(0, -23, 6, 8, OBSIDIAN),
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -13, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 215，擊敗奇美拉後通往更遠的遠征', '忘川不能走，左右各有一座橋', '三首衝撞很長，往側邊閃，不要往後退', '厄里倪厄斯會成群追殺，用範圍技能'],
  spawns: [
    { enemy: 'hades_shade', x: -12, z: 20, count: 3, spread: 3 },
    { enemy: 'erinys', x: 10, z: 18, count: 3, spread: 3 },
    { enemy: 'lamia', x: -2, z: 17, count: 1 },
    { enemy: 'hades_shade', x: 12, z: -2, count: 3, spread: 3 },
    { enemy: 'lamia', x: -12, z: -1, count: 2, spread: 3 },
    { enemy: 'erinys', x: 0, z: -4, count: 2, spread: 2.5 },
    { enemy: 'chimera', x: 0, z: -23 },
  ],
  dungeon: { floor: 12, enemyDefense: 215, unlockAfter: 'dungeon_11' },
};

export const realmOfHades: StageDef = {
  zone,
  enemies: {
    hades_shade: {
      id: 'hades_shade', name: '冥府亡靈戰士', level: 56, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0xd8d0e0,
      stats: { maxHp: 7600, atk: 455, def: 215, moveSpeed: 3.4 },
      attack: melee(1.6, 0.55, 1.6),
      exp: 2100, gold: [168, 236],
    },
    erinys: {
      id: 'erinys', name: '厄里倪厄斯', level: 57, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x5a1a2a,
      stats: { maxHp: 6600, atk: 470, def: 215, moveSpeed: 5 },
      attack: melee(1.3, 0.38, 1.25),
      exp: 2200, gold: [172, 244],
    },
    lamia: {
      id: 'lamia', name: '拉彌亞', level: 58, aggro: 'aggressive', shape: 'gorgon',
      radius: 0.65, respawn: 12, scale: 1.1, color: 0x6a3a8a,
      stats: { maxHp: 8800, atk: 480, def: 215, moveSpeed: 3.2 },
      attack: melee(1.8, 0.55, 1.7),
      exp: 2300, gold: [180, 256],
    },
    chimera: {
      id: 'chimera', name: '奇美拉', level: 60, aggro: 'aggressive', shape: 'chimera', boss: true,
      radius: 0.75, respawn: 90, scale: 2.2, color: 0xb87a3a,
      stats: { maxHp: 245000, atk: 550, def: 215, moveSpeed: 3.4 },
      attack: melee(2.9, 0.55, 1.6),
      exp: 40000, gold: [13800, 16800], gems: 36,
      bossSkills: ['chimera_flame', 'chimera_charge', 'chimera_rain'],
    },
  },
};
