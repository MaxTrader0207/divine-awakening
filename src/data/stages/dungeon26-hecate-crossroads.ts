import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十六層・黑卡蒂的三岔路口（副本 Lv.126-130，防禦 455）
 * 三條路交會的地方屬於冥月女神黑卡蒂：旅人在這裡留下供品，夜裡只有火把和狗吠。
 * 她的僕從恩普莎有一條青銅腿、一條驢腿，頭髮是火焰，會變成美女引誘旅人，再吸乾他們的血。
 * 小怪：黑卡蒂冥犬、三岔路亡靈騎士、黑卡蒂女巫、斯特里克斯夜梟、冥月奇美拉。首領：銅足夜魔恩普莎（冥火之髮、銅足踐踏、夜魔尖嘯、吸血利爪）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_26',
  kind: 'dungeon',
  music: 'dungeon',
  theme: 'underworld',
  name: '黑卡蒂的三岔路口',
  subtitle: '第二十六層・月夜的魔女之路',
  region: '黑卡蒂的三岔路口',
  levelRange: [126, 130],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x3a3448,
  skyColor: 0x1a1430,
  fogColor: 0x3a2a4a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x4a4458 }, // 三條路
    { x: -12, z: 18, w: 18, d: 4, color: 0x4a4458 },
    { x: 12, z: 18, w: 18, d: 4, color: 0x4a4458 },
    { x: -20, z: 8, w: 6, d: 6, color: 0x5a3a8a, water: true }, // 冥月池
    { x: 20, z: -4, w: 6, d: 7, color: 0x5a3a8a, water: true },
    { x: -19, z: -16, w: 6, d: 6, color: 0x5a3a8a, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x2e2838, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -7, z: 22, rot: 0.3, color: 0x6a6080 }, // 三面的黑卡蒂像
    { kind: 'statue', x: 7, z: 22, rot: -0.3, color: 0x6a6080 },
    ...[[-20, 22], [20, 22], [-21, -4], [21, 10], [8, -10], [-8, 2]].map(([x, z]): PropDef => ({ kind: 'decor', x, z, h: 1.6, model: 'torch', solid: false })),
    { kind: 'cypress', x: -22, z: 14, color: 0x2a3a2a },
    { kind: 'cypress', x: 22, z: 2, color: 0x2a3a2a },
    { kind: 'cypress', x: 22, z: -18, color: 0x2a3a2a },
    { kind: 'column', x: -16, z: -8, h: 1.4, color: 0x5a5068 },
    { kind: 'crystal', x: 15, z: 24, color: 0xd8a0ff },
    { kind: 'crystal', x: -15, z: -24, color: 0xd8a0ff },
    { kind: 'decor', x: 14, z: 6, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x8a4aff },
    ...pillarRing(0, -23, 6, 8, 0x4a4058),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 455', '紫色的冥月池不能走', '銅足踐踏落地前有影子，看到就跑開', '夜魔尖嘯是以恩普莎為中心的圓'],
  spawns: [
    { enemy: 'hecate_hound', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'crossroads_knight', x: 10, z: 17, count: 1 },
    { enemy: 'hecate_witch', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'strix_owl', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'moon_chimera', x: -12, z: -4, count: 1 },
    { enemy: 'hecate_hound', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'hecate_witch', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'crossroads_knight', x: -12, z: 10, count: 1 },
    { enemy: 'strix_owl', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'empusa_queen', x: 0, z: -23 },
  ],
  dungeon: { floor: 26, enemyDefense: 455, unlockAfter: 'dungeon_25' },
};

export const hecateCrossroads: StageDef = {
  zone,
  enemies: {
    hecate_hound: {
      id: 'hecate_hound', name: '黑卡蒂冥犬', level: 126, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x2a2430,
      stats: { maxHp: 12900, atk: 1019, def: 455, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 8710, gold: [646, 904],
    },
    crossroads_knight: {
      id: 'crossroads_knight', name: '三岔路亡靈騎士', level: 127, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 12, scale: 1.2, color: 0xc8c0d8,
      stats: { maxHp: 34500, atk: 1019, def: 455, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 8830, gold: [671, 939],
    },
    hecate_witch: {
      id: 'hecate_witch', name: '黑卡蒂女巫', level: 128, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.1, color: 0xc8c0d8,
      stats: { maxHp: 18300, atk: 1070, def: 455, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 8960, gold: [697, 976],
    },
    strix_owl: {
      id: 'strix_owl', name: '斯特里克斯夜梟', level: 129, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 1.0, color: 0x5a4a6a,
      stats: { maxHp: 18300, atk: 1019, def: 455, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9080, gold: [723, 1012],
    },
    moon_chimera: {
      id: 'moon_chimera', name: '冥月奇美拉', level: 130, aggro: 'aggressive', shape: 'chimera',
      radius: 0.65, respawn: 12, scale: 0.7, color: 0x4a3a5a,
      stats: { maxHp: 25900, atk: 1223, def: 455, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9210, gold: [749, 1049],
    },
    empusa_queen: {
      id: 'empusa_queen', name: '銅足夜魔恩普莎', level: 130, aggro: 'aggressive', shape: 'empusa', boss: true, element: 'dark',
      radius: 0.9, respawn: 90, scale: 2.0, color: 0x3a1a3a,
      stats: { maxHp: 645000, atk: 1120, def: 455, moveSpeed: 3.6 },
      attack: melee(2.6, 0.55, 1.5),
      exp: 158000, gold: [67400, 82200], gems: 78,
      bossSkills: ['empusa_flames', 'empusa_kick', 'empusa_shriek', 'empusa_claws'],
    },
  },
};
