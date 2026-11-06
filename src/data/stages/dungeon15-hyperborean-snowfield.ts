import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十五層・希柏里爾雪原（副本 Lv.71-75，防禦 275）
 * 北風玻瑞阿斯吹不到的極北之地：希柏里爾人終年見到阿波羅的陽光，雪原裡埋著獅鷲守護的黃金。
 * 獨眼的阿里瑪斯波伊人一直想偷黃金，和獅鷲打了好幾百年。
 * 小怪：阿里瑪斯波伊獨眼人、幼獅鷲、希柏里爾雪狼。首領：獅鷲（鷹王俯衝、金爪撕裂、羽刃狂風）。
 */
const ICE = 0xa8d8f0;
const ice = (x: number, z: number): PropDef => ({ kind: 'crystal', x, z, color: 0xaee8ff });

const zone: ZoneDef = {
  id: 'dungeon_15',
  kind: 'dungeon',
  music: 'wild',
  bossMusic: 'titan',
  name: '希柏里爾雪原',
  subtitle: '第十五層・北風之外的黃金',
  region: '希柏里爾雪原',
  levelRange: [71, 75],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0xdfe6ee,
  skyColor: 0x9ab8d8,
  fogColor: 0xc8d8e8,
  fogRange: [32, 80],
  mist: true,
  patches: [
    { x: 0, z: 10, w: 6, d: 30, color: 0xc8d0da }, // 踩出來的小路
    { x: -14, z: 14, w: 10, d: 8, color: ICE, water: true }, // 結冰的湖（冰面太薄）
    { x: 14, z: -4, w: 9, d: 7, color: ICE, water: true },
    { x: 13, z: 20, w: 8, d: 6, color: 0xe8d8a0 }, // 雪下露出的金沙
    { x: -13, z: -6, w: 8, d: 6, color: 0xe8d8a0 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0xb8c4d0, stairs: { x: 0, width: 5 } }],
  props: [
    ice(-20, 24), ice(-21, 4), ice(20, 10), ice(21, -12), ice(-6, 4), ice(7, 2), ice(-19, -14),
    { kind: 'rock', x: -7, z: 22, color: 0xe8eef4 },
    { kind: 'rock', x: 19, z: 25, color: 0xe8eef4 },
    { kind: 'rock', x: 6, z: -8, color: 0xe8eef4 },
    { kind: 'cypress', x: -22, z: 18, color: 0xc8d8d0 },
    { kind: 'cypress', x: 22, z: 2, color: 0xc8d8d0 },
    { kind: 'cypress', x: -22, z: -6, color: 0xc8d8d0 },
    { kind: 'statue', x: 8, z: 12, rot: -0.6, color: 0xf0e0a0 }, // 阿波羅金像
    { kind: 'decor', x: 15, z: 22, h: 1.2, model: 'chest_gold' },
    { kind: 'decor', x: -13, z: -9, h: 1.2, model: 'chest_gold' },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 獅鷲的黃金巢
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xd8b860 },
    ...pillarRing(0, -23, 6, 8, 0xd8dce4),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 275', '結冰的湖冰太薄，不能走上去', '鷹王俯衝落地前有影子，看到就跑開', '羽刃狂風是一直線，往側邊閃'],
  spawns: [
    { enemy: 'hyperborean_wolf', x: -12, z: 22, count: 3, spread: 3 },
    { enemy: 'arimaspian', x: 10, z: 17, count: 2, spread: 3 },
    { enemy: 'griffin_fledgling', x: -2, z: 12, count: 1 },
    { enemy: 'hyperborean_wolf', x: 13, z: -11, count: 3, spread: 3 },
    { enemy: 'arimaspian', x: -12, z: -2, count: 2, spread: 3 },
    { enemy: 'griffin_fledgling', x: 0, z: -5, count: 2, spread: 2.5 },
    { enemy: 'griffin', x: 0, z: -23 },
    { enemy: 'ice_golem', x: 10, z: 17, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'snow_harpy', x: 13, z: -11, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 15, enemyDefense: 275, unlockAfter: 'dungeon_14' },
};

export const hyperboreanSnowfield: StageDef = {
  zone,
  enemies: {
    arimaspian: {
      id: 'arimaspian', name: '阿里瑪斯波伊獨眼人', level: 71, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.65, respawn: 12, scale: 0.85, color: 0xc8a088,
      stats: { maxHp: 11500, atk: 591, def: 275, moveSpeed: 2.9 },
      attack: melee(1.8, 0.6, 1.7),
      exp: 3100, gold: [226, 316],
    },
    griffin_fledgling: {
      id: 'griffin_fledgling', name: '幼獅鷲', level: 72, aggro: 'aggressive', shape: 'griffin',
      radius: 0.6, respawn: 12, scale: 0.85, color: 0xc89a4a,
      stats: { maxHp: 9100, atk: 596, def: 275, moveSpeed: 4.6 },
      attack: melee(1.4, 0.45, 1.3),
      exp: 3180, gold: [235, 329],
    },
    hyperborean_wolf: {
      id: 'hyperborean_wolf', name: '希柏里爾雪狼', level: 73, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0xe8eef4,
      stats: { maxHp: 8200, atk: 581, def: 275, moveSpeed: 5.2 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 3260, gold: [244, 342],
    },
    griffin: {
      id: 'griffin', name: '獅鷲', level: 75, aggro: 'aggressive', shape: 'griffin', boss: true, element: 'ice',
      radius: 0.85, respawn: 90, scale: 2.2, color: 0xd8a84a,
      stats: { maxHp: 311000, atk: 685, def: 275, moveSpeed: 3.6 },
      attack: melee(2.7, 0.55, 1.6),
      exp: 59000, gold: [19400, 23700], gems: 45,
      bossSkills: ['griffin_dive', 'griffin_talon', 'griffin_gale'],
    },
    ice_golem: {
      id: 'ice_golem', name: '冰晶魔像', level: 74, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.41, color: 0xbfe8ff,
      stats: { maxHp: 15100, atk: 551, def: 275, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 4680, gold: [341, 487],
    },
    snow_harpy: {
      id: 'snow_harpy', name: '北境雪妖', level: 72, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xe0ecf4,
      stats: { maxHp: 8000, atk: 621, def: 275, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 3500, gold: [253, 362],
    },
  },
};
