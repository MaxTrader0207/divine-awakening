import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十一層・萬怪之母的巢穴（副本 Lv.101-105，防禦 395）
 * 奇里乞亞阿里摩伊山下的深洞：萬怪之母厄喀德那在這裡生下了許德拉、刻耳柏洛斯、奇美拉與斯芬克斯。
 * 她永遠不老不死，直到百眼巨人阿爾戈斯趁她熟睡時殺了她。
 * 小怪：蛇母幼蛇、奇美拉幼獸、恩普薩。首領：萬怪之母厄喀德那（萬怪之吼、雙尾毒牙、蛇身絞纏）。
 */
const CAVE = 0x3a2e2a;
const VENOM = 0x5aa83a;

const zone: ZoneDef = {
  id: 'dungeon_21',
  kind: 'dungeon',
  music: 'inferno',
  bossMusic: 'titan',
  name: '萬怪之母的巢穴',
  subtitle: '第二十一層・阿里摩伊的深洞',
  region: '萬怪之母的巢穴',
  levelRange: [101, 105],
  safe: false,
  size: { w: 52, d: 62 },
  groundColor: 0x3a3428,
  theme: 'cave', // v1.93
  skyColor: 0x140f14,
  fogColor: 0x2a2026,
  fogRange: [26, 68],
  mist: true,
  patches: [
    { x: 0, z: 16, w: 6, d: 22, color: 0x4a4234 },
    { x: -12, z: 10, w: 7, d: 5, color: VENOM, water: true }, // 毒池
    { x: 12, z: -2, w: 7, d: 5, color: VENOM, water: true },
    { x: 13, z: 20, w: 8, d: 6, color: 0x5a4a3a }, // 巢裡的蛋殼堆
  ],
  platforms: [{ x: 0, z: -21, w: 28, d: 16, h: 1.8, color: 0x3a2e2a, stairs: { x: 0, width: 5 } }],
  props: [
    // 洞壁
    { kind: 'wall', x: -24, z: 2, w: 2.5, d: 50, h: 5, color: CAVE },
    { kind: 'wall', x: 24, z: 2, w: 2.5, d: 50, h: 5, color: CAVE },
    { kind: 'wall', x: -14, z: 3, w: 8, d: 2, h: 2.6, color: CAVE },
    { kind: 'wall', x: 14, z: 7, w: 8, d: 2, h: 2.6, color: CAVE },
    { kind: 'crystal', x: -19, z: 22, color: 0xc86aff },
    { kind: 'crystal', x: 19, z: 12, color: 0x8aff6a },
    { kind: 'crystal', x: -19, z: -10, color: 0xc86aff },
    { kind: 'crystal', x: 19, z: -14, color: 0x8aff6a },
    { kind: 'rock', x: -6, z: 22, color: 0x2a2420 },
    { kind: 'rock', x: 7, z: 10, color: 0x2a2420 },
    { kind: 'rock', x: -7, z: -8, color: 0x2a2420 },
    { kind: 'decor', x: 13, z: 21, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -12, z: -4, h: 1.0, model: 'rubble', solid: false },
    ...[[-6, 26], [6, 26], [-20, 6], [20, 2], [-3.4, -13], [3.4, -13]].map(([x, z]): PropDef => ({ kind: 'decor', x, z, h: 1.6, model: 'torch', solid: false })),
    // 萬怪之母的巢
    { kind: 'stonering', x: 0, z: -22, w: 11, d: 11, color: 0x6a3a8a },
    ...pillarRing(0, -22, 6, 8, 0x2a2228),
    { kind: 'decor', x: -11, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: ['這層敵人有防禦 395', '毒池不能走，洞裡兩道岩牆從中間繞過', '萬怪之吼的幻影之間有空隙', '蛇身絞纏範圍很大，預警出現就往外跑'],
  spawns: [
    { enemy: 'echidna_brood', x: -12, z: 20, count: 3, spread: 3 },
    { enemy: 'chimera_cub', x: 10, z: 15, count: 2, spread: 3 },
    { enemy: 'empusa', x: 0, z: 12, count: 1 },
    { enemy: 'chimera_cub', x: 12, z: -8, count: 2, spread: 3 },
    { enemy: 'echidna_brood', x: -12, z: -4, count: 3, spread: 3 },
    { enemy: 'empusa', x: 0, z: -5, count: 2, spread: 2.5 },
    { enemy: 'echidna', x: 0, z: -22 },
    { enemy: 'orthrus_pup', x: 10, z: 15, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'lair_bat', x: 12, z: -8, count: 3, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 21, enemyDefense: 395, unlockAfter: 'dungeon_20' },
};

export const echidnaLair: StageDef = {
  zone,
  enemies: {
    echidna_brood: {
      id: 'echidna_brood', name: '蛇母幼蛇', level: 101, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.25, color: 0x5a2a6a,
      stats: { maxHp: 15800, atk: 843, def: 395, moveSpeed: 3.6 },
      attack: melee(1.7, 0.5, 1.5),
      exp: 5850, gold: [401, 561],
    },
    chimera_cub: {
      id: 'chimera_cub', name: '奇美拉幼獸', level: 102, aggro: 'aggressive', shape: 'chimera',
      radius: 0.6, respawn: 12, scale: 0.8, color: 0xa86a3a,
      stats: { maxHp: 17300, atk: 853, def: 395, moveSpeed: 4.4 },
      attack: melee(1.6, 0.5, 1.5),
      exp: 5950, gold: [417, 584],
    },
    empusa: {
      id: 'empusa', name: '恩普薩', level: 103, aggro: 'aggressive', shape: 'gorgon',
      radius: 0.6, respawn: 12, scale: 1.05, color: 0x8a5a2a,
      stats: { maxHp: 16500, atk: 848, def: 395, moveSpeed: 3.4 },
      attack: melee(1.7, 0.5, 1.6),
      exp: 6060, gold: [433, 606],
    },
    echidna: {
      id: 'echidna', name: '萬怪之母厄喀德那', level: 105, aggro: 'aggressive', shape: 'echidna', boss: true, element: 'dark',
      radius: 0.95, respawn: 90, scale: 2.0, color: 0x4a6a3a,
      stats: { maxHp: 511000, atk: 955, def: 395, moveSpeed: 3.0 },
      attack: melee(3.0, 0.55, 1.6),
      exp: 108000, gold: [38300, 46700], gems: 63,
      bossSkills: ['echidna_brood', 'echidna_venom', 'echidna_coil'],
    },
    orthrus_pup: {
      id: 'orthrus_pup', name: '奧特洛斯幼犬', level: 102, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x4a3a3a,
      stats: { maxHp: 14000, atk: 848, def: 395, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 5950, gold: [409, 584],
    },
    lair_bat: {
      id: 'lair_bat', name: '巢穴蝙蝠', level: 101, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x3a2a3a,
      stats: { maxHp: 9400, atk: 694, def: 395, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 3430, gold: [235, 336],
    },
  },
};
