import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第九層・獨眼巨人洞窟（副本 Lv.41-45，防禦 155）
 * 《奧德賽》裡波呂斐摩斯的洞穴：昏暗的岩洞、羊圈、乳酪架、滿地巨石，洞口被大石堵住。
 * 小怪：西西里巨角公羊、萊斯特律戈涅斯巨人、獨眼巨人鍛工。首領：獨眼巨人波呂斐摩斯（巨棒橫掃、投擲巨石、撼地重踏）。
 */
const CAVE = 0x5a4a3e;
const boulder = (x: number, z: number): PropDef => ({ kind: 'rock', x, z, color: 0x6a5a4a });

const zone: ZoneDef = {
  id: 'dungeon_9',
  kind: 'dungeon',
  name: '獨眼巨人洞窟',
  subtitle: '第九層・奧德修斯的考驗',
  region: '獨眼巨人洞窟',
  levelRange: [41, 45],
  safe: false,
  size: { w: 52, d: 62 },
  groundColor: 0x6a5a48,
  skyColor: 0x241c18,
  fogColor: 0x3a2e26,
  fogRange: [28, 70],
  patches: [
    { x: 0, z: 16, w: 6, d: 22, color: 0x7a6a54 },
    { x: -13, z: 15, w: 10, d: 8, color: 0x8a8a5a }, // 羊圈的乾草
    { x: 14, z: -4, w: 5, d: 5, color: 0xff6a2a, water: true }, // 鍛爐火坑
    { x: -14, z: -6, w: 6, d: 4, color: 0x3a6a8a, water: true }, // 地下泉
  ],
  platforms: [{ x: 0, z: -21, w: 28, d: 16, h: 1.6, color: 0x5a4a3a, stairs: { x: 0, width: 5 } }],
  props: [
    // 洞壁
    { kind: 'wall', x: -24, z: 2, w: 2.5, d: 50, h: 5, color: CAVE },
    { kind: 'wall', x: 24, z: 2, w: 2.5, d: 50, h: 5, color: CAVE },
    // 羊圈
    { kind: 'fence', x: -13, z: 19.5, w: 10, d: 0.3, color: 0x7a5a3a },
    { kind: 'fence', x: -8, z: 15, w: 0.3, d: 9, color: 0x7a5a3a },
    // 洞中的巨石群（留出走道）
    boulder(6, 18), boulder(9, 22), boulder(-4, 8), boulder(-7, 5), boulder(10, 6), boulder(16, 10),
    boulder(-16, 2), boulder(4, -6), boulder(-9, -12), boulder(17, -14),
    { kind: 'wall', x: -3, z: 0, w: 12, d: 2.2, h: 2.6, color: CAVE },
    { kind: 'wall', x: 14, z: 3, w: 10, d: 2.2, h: 2.6, color: CAVE },
    { kind: 'crystal', x: -19, z: 24, color: 0x8ab8ff },
    { kind: 'crystal', x: 19, z: 20, color: 0x8ab8ff },
    { kind: 'crystal', x: -19, z: -16, color: 0xffa04a },
    { kind: 'amphora', x: 14, z: 25, h: 1.1 },
    { kind: 'amphora', x: 16, z: 24, h: 0.9 },
    { kind: 'decor', x: -18, z: 9, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 11, z: -10, h: 1.0, model: 'rubble', solid: false },
    ...[[-6, 25], [6, 26], [-20, 4], [20, -6], [-6, -12], [8, -12]].map(([x, z]): PropDef => ({ kind: 'decor', x, z, h: 1.6, model: 'torch', solid: false })),
    // 波呂斐摩斯的座位
    { kind: 'stonering', x: 0, z: -22, w: 10, d: 10, color: 0x7a6a5a },
    ...pillarRing(0, -22, 5.6, 8, 0x4a3a30),
    { kind: 'decor', x: 12, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: ['這層敵人有防禦 155', '洞中兩道岩牆，從中間或兩側繞過', '投擲巨石範圍很大但很慢，看到影子就走開', '萊斯特律戈涅斯巨人血很厚，可以先繞開'],
  spawns: [
    { enemy: 'sicilian_ram', x: -13, z: 15, count: 3, spread: 2.5 },
    { enemy: 'cyclops_smith', x: 8, z: 13, count: 2, spread: 3 },
    { enemy: 'laestrygonian', x: 0, z: 6, count: 1 },
    { enemy: 'sicilian_ram', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'cyclops_smith', x: -12, z: -4, count: 2, spread: 3 },
    { enemy: 'laestrygonian', x: 0, z: -9, count: 1 },
    { enemy: 'polyphemus', x: 0, z: -22 },
    { enemy: 'cave_bat_swarm', x: 8, z: 13, count: 3, spread: 3.5 }, // v1.63
    { enemy: 'cyclops_sheepdog', x: 12, z: -6, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 9, enemyDefense: 155, unlockAfter: 'dungeon_8' },
};

export const cyclopsCave: StageDef = {
  zone,
  enemies: {
    sicilian_ram: {
      id: 'sicilian_ram', name: '西西里巨角公羊', level: 41, aggro: 'aggressive', shape: 'bull',
      radius: 0.65, respawn: 12, scale: 1, color: 0xe8e0cc,
      stats: { maxHp: 4600, atk: 330, def: 155, moveSpeed: 4.2 },
      attack: melee(1.5, 0.5, 1.5),
      exp: 1100, gold: [100, 146],
    },
    cyclops_smith: {
      id: 'cyclops_smith', name: '獨眼巨人鍛工', level: 42, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.65, respawn: 12, scale: 0.9, color: 0x9a7a62,
      stats: { maxHp: 5600, atk: 345, def: 155, moveSpeed: 2.8 },
      attack: melee(1.9, 0.6, 1.8),
      exp: 1180, gold: [104, 152],
    },
    laestrygonian: {
      id: 'laestrygonian', name: '萊斯特律戈涅斯巨人', level: 43, aggro: 'aggressive', shape: 'golem',
      radius: 0.75, respawn: 15, scale: 1.45, color: 0x6a5040,
      stats: { maxHp: 8200, atk: 360, def: 155, moveSpeed: 2.4 },
      attack: melee(2, 0.75, 2.1),
      exp: 1300, gold: [112, 164],
    },
    polyphemus: {
      id: 'polyphemus', name: '獨眼巨人波呂斐摩斯', level: 45, aggro: 'aggressive', shape: 'cyclops', boss: true, element: 'thunder',
      radius: 0.7, respawn: 90, scale: 1.9, color: 0xb08a6a,
      stats: { maxHp: 165000, atk: 425, def: 155, moveSpeed: 2.8 },
      attack: melee(3, 0.6, 1.8),
      exp: 23000, gold: [7600, 9400], gems: 28,
      bossSkills: ['club_sweep', 'boulder_toss', 'cyclops_stomp'],
    },
    cave_bat_swarm: {
      id: 'cave_bat_swarm', name: '洞窟蝙蝠群', level: 41, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x5a4a3a,
      stats: { maxHp: 2650, atk: 272, def: 155, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 640, gold: [59, 85],
    },
    cyclops_sheepdog: {
      id: 'cyclops_sheepdog', name: '獨眼巨人的牧犬', level: 43, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x8a7a6a,
      stats: { maxHp: 4250, atk: 344, def: 155, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 1170, gold: [107, 153],
    },
  },
};
