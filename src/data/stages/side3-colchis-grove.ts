import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 支線三・科爾基斯聖林（Lv.31-35，擊敗第六層首領後開放）
 * 黑海東岸的阿瑞斯聖林。載佛里克索斯飛越大海的金羊被獻給宙斯，金羊毛就掛在這裡的橡樹上——
 * 傳說金羊的靈並沒有離開。小怪：聖林守蛇、銅蹄火牛。守護者：金羊克律索瑪羅斯（光）。
 */
const CLEAR = [
  { x: 0, z: 24, r: 6 },
  { x: 0, z: 0, r: 7 },
  { x: -14, z: 8, r: 5 },
  { x: 14, z: 6, r: 5 },
  { x: -12, z: -12, r: 5 },
  { x: 13, z: -12, r: 5 },
  { x: 0, z: -22, r: 9 },
  { x: 0, z: 13, r: 3 },
  { x: 0, z: -11, r: 3 },
];

const zone: ZoneDef = {
  id: 'side_3',
  kind: 'field',
  music: 'forest',
  name: '科爾基斯聖林',
  subtitle: '科爾基斯聖林・支線・守護者',
  region: '科爾基斯',
  levelRange: [31, 35],
  lootTier: 5,
  safe: false,
  size: { w: 50, d: 58 },
  groundColor: 0x5a7a48,
  skyColor: 0xe8c890,
  fogColor: 0xe8d8a8,
  fogRange: [30, 80],
  patches: [
    { x: 0, z: 13, w: 4, d: 18, color: 0x9a8a5a },
    { x: 0, z: -11, w: 4, d: 12, color: 0x9a8a5a },
    { x: 0, z: 0, w: 10, d: 10, color: 0x8a9a50 },
    { x: 0, z: -22, w: 13, d: 12, color: 0xc8a850 }, // 金羊毛的祭壇
    { x: 17, z: 18, w: 6, d: 5, color: 0x4f8ab8, water: true },
  ],
  props: [
    ...scatterTrees(20261107, 34, 50, 58, CLEAR),
    { kind: 'stonering', x: 0, z: -22, w: 11, d: 11, color: 0xe8d8a0 },
    ...pillarRing(0, -22, 6, 8, 0xf0e0b0),
    { kind: 'olive', x: 0, z: -27 }, // 掛金羊毛的聖樹
    { kind: 'crystal', x: -2.5, z: -27, color: 0xffe27a },
    { kind: 'crystal', x: 2.5, z: -27, color: 0xffe27a },
    { kind: 'statue', x: -16, z: -2, rot: 0 },
    { kind: 'statue', x: 16, z: -2, rot: 0 },
    { kind: 'temple', x: -15, z: 19, w: 8, d: 5, h: 5 },
    { kind: 'flowers', x: -5, z: 9, w: 3, d: 1.4 },
    { kind: 'flowers', x: 5, z: 9, w: 3, d: 1.4 },
    { kind: 'decor', x: -6, z: -20, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -20, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 9, z: -26, h: 1.3, model: 'chest_gold' },
    { kind: 'amphora', x: -8, z: -14 },
  ],
  portals: [{ x: 0, z: 28, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: [
    '科爾基斯聖林：支線地圖，擊敗第六層首領後開放',
    '金羊克律索瑪羅斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '金羊是光屬性：光和暗互剋——對刻耳柏洛斯、厄喀德那、坎佩特別有效，但也比較怕牠們',
    '金羊毛光輝的光束之間是安全區；聖蹄震地要拉開距離',
  ],
  spawns: [
    { enemy: 'colchis_serpent', x: -14, z: 8, count: 3, spread: 4 },
    { enemy: 'colchis_bull', x: 14, z: 6, count: 2, spread: 4 },
    { enemy: 'colchis_serpent', x: 13, z: -12, count: 2, spread: 3 },
    { enemy: 'colchis_bull', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_chrysomallos', x: 0, z: -22 },
    { enemy: 'colchis_hound', x: 14, z: 6, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'spartoi', x: -12, z: -12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'grove_harpy', x: 14, z: 6, count: 2, spread: 3.5 }, // v1.63
  ],
  side: { guardian: 'guardian_chrysomallos', unlockAfter: 'dungeon_6' },
};

export const colchisGrove: StageDef = {
  zone,
  enemies: {
    colchis_serpent: {
      id: 'colchis_serpent', name: '聖林守蛇', level: 32, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0x6a9a3a,
      stats: { maxHp: 3200, atk: 245, def: 95, moveSpeed: 3.8 },
      attack: melee(1.6, 0.45, 1.5),
      exp: 700, gold: [72, 104],
    },
    colchis_bull: {
      id: 'colchis_bull', name: '銅蹄火牛', level: 34, aggro: 'aggressive', shape: 'bull',
      radius: 0.8, respawn: 14, scale: 1.05, color: 0xb87840,
      stats: { maxHp: 3800, atk: 258, def: 95, moveSpeed: 3.6 },
      attack: melee(1.7, 0.55, 1.7),
      exp: 780, gold: [80, 116],
    },
    guardian_chrysomallos: {
      id: 'guardian_chrysomallos', name: '金羊克律索瑪羅斯', level: 35, aggro: 'aggressive', shape: 'chrysomallos', boss: true, element: 'light',
      radius: 0.8, respawn: 90, scale: 1.75, color: 0xf2c84a,
      stats: { maxHp: 95000, atk: 262, def: 95, moveSpeed: 3.6 },
      attack: melee(2.3, 0.55, 1.7),
      exp: 9700, gold: [3400, 4400], gems: 18,
      bossSkills: ['ram_charge', 'ram_radiance', 'ram_sunfall', 'ram_quake'],
    },
    colchis_hound: {
      id: 'colchis_hound', name: '科爾基斯獵犬', level: 33, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x7a5a3a,
      stats: { maxHp: 3100, atk: 266, def: 86, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 780, gold: [82, 117],
    },
    spartoi: {
      id: 'spartoi', name: '龍牙戰士', level: 35, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.55, respawn: 12, scale: 1.16, color: 0xe8e2d0,
      stats: { maxHp: 5100, atk: 348, def: 105, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 1060, gold: [111, 159],
    },
    grove_harpy: {
      id: 'grove_harpy', name: '聖林鳥妖', level: 33, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x8aa858,
      stats: { maxHp: 2950, atk: 279, def: 95, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 860, gold: [90, 129],
    },
  },
};
