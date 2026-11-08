import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十六層・刻律涅山（副本 Lv.76-80，防禦 295）
 * 阿卡迪亞的刻律涅山：狩獵女神阿蒂蜜絲的聖林，金角銅蹄的牝鹿跑得比箭還快。
 * 海克力斯不能傷牠，只好追了整整一年，才在拉冬河邊抓到牠。
 * 小怪：刻律涅牝鹿、阿蒂蜜絲獵魂、阿卡迪亞山貓。首領：刻律涅金角鹿（金角衝刺、銅蹄踏地、月神箭雨）。
 */
const MARBLE = 0xe8e2d4;

const zone: ZoneDef = {
  id: 'dungeon_16',
  kind: 'dungeon',
  music: 'wild',
  bossMusic: 'titan',
  name: '刻律涅山',
  subtitle: '第十六層・阿蒂蜜絲的聖林',
  region: '刻律涅山',
  levelRange: [76, 80],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x6a7a4a,
  theme: 'mountain', // v1.93
  skyColor: 0x7aa0c8,
  fogColor: 0x9ab8c8,
  fogRange: [34, 82],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x8a8060 },
    { x: 12, z: 20, w: 10, d: 7, color: 0x8aa04a }, // 草原
    { x: -12, z: -6, w: 10, d: 7, color: 0x8aa04a },
    { x: 15, z: -2, w: 8, d: 5, color: 0x5a8ab8, water: true }, // 聖泉
    { x: -6, z: 26, w: 6, d: 4, color: 0xd8c8e8 }, // 野花
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x7a7a6a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'temple', x: -16, z: 10, rot: Math.PI / 2, w: 8, d: 13, color: MARBLE }, // 阿蒂蜜絲神廟
    { kind: 'cypress', x: 21, z: 26, color: 0x2a4a32 },
    { kind: 'cypress', x: 22, z: 12, color: 0x2a4a32 },
    { kind: 'cypress', x: -22, z: -10, color: 0x2a4a32 },
    { kind: 'cypress', x: 21, z: -12, color: 0x2a4a32 },
    { kind: 'olive', x: 8, z: 26 },
    { kind: 'olive', x: 7, z: 6 },
    { kind: 'olive', x: -7, z: -2 },
    { kind: 'flowers', x: -5, z: 22 },
    { kind: 'flowers', x: 5, z: 12 },
    { kind: 'statue', x: 8, z: -10, rot: -0.5, color: MARBLE },
    { kind: 'column', x: -6, z: -10, color: MARBLE },
    { kind: 'rock', x: -20, z: 26, color: 0x6a6a5a },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 聖鹿的林間空地
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xd8c070 },
    ...pillarRing(0, -23, 6, 8, MARBLE),
    { kind: 'decor', x: 12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 295', '阿蒂蜜絲獵魂會從遠處射箭，優先處理', '金角衝刺比任何首領都快，提早往兩側閃', '銅蹄踏地範圍很大，看到預警就往外跑'],
  spawns: [
    { enemy: 'ceryneian_doe', x: -10, z: 22, count: 3, spread: 3 },
    { enemy: 'arcadian_lynx', x: 10, z: 18, count: 2, spread: 3 },
    { enemy: 'artemis_huntress', x: -2, z: 14, count: 1 },
    { enemy: 'ceryneian_doe', x: 10, z: -6, count: 3, spread: 3 },
    { enemy: 'arcadian_lynx', x: -12, z: -6, count: 2, spread: 3 },
    { enemy: 'artemis_huntress', x: 0, z: -5, count: 2, spread: 2.5 },
    { enemy: 'golden_hind', x: 0, z: -23 },
    { enemy: 'forest_boar', x: 10, z: 18, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'moon_bat', x: 10, z: -6, count: 3, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 16, enemyDefense: 295, unlockAfter: 'dungeon_15' },
};

export const ceryneianMountain: StageDef = {
  zone,
  enemies: {
    ceryneian_doe: {
      id: 'ceryneian_doe', name: '刻律涅牝鹿', level: 76, aggro: 'aggressive', shape: 'hind',
      radius: 0.55, respawn: 12, scale: 0.85, color: 0xb8884a,
      stats: { maxHp: 9100, atk: 633, def: 295, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 3510, gold: [249, 349],
    },
    artemis_huntress: {
      id: 'artemis_huntress', name: '阿蒂蜜絲獵魂', level: 77, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.1, color: 0xd8e0ff,
      stats: { maxHp: 8100, atk: 638, def: 295, moveSpeed: 2.8 },
      exp: 3590, gold: [259, 363],
    },
    arcadian_lynx: {
      id: 'arcadian_lynx', name: '阿卡迪亞山貓', level: 78, aggro: 'aggressive', shape: 'lion',
      radius: 0.6, respawn: 12, scale: 0.8, color: 0x9a7a5a,
      stats: { maxHp: 10200, atk: 643, def: 295, moveSpeed: 4.6 },
      attack: melee(1.5, 0.45, 1.35),
      exp: 3670, gold: [269, 377],
    },
    golden_hind: {
      id: 'golden_hind', name: '刻律涅金角鹿', level: 80, aggro: 'aggressive', shape: 'hind', boss: true, element: 'light',
      radius: 0.85, respawn: 90, scale: 2.0, color: 0xd8a040,
      stats: { maxHp: 329000, atk: 730, def: 295, moveSpeed: 4.2 },
      attack: melee(2.6, 0.5, 1.5),
      exp: 66000, gold: [21700, 26500], gems: 48,
      bossSkills: ['hind_charge', 'hind_stomp', 'hind_moonfall'],
    },
    forest_boar: {
      id: 'forest_boar', name: '山林野豬', level: 79, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1.21, color: 0x6a4a32,
      stats: { maxHp: 12300, atk: 775, def: 295, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 4850, gold: [340, 486],
    },
    moon_bat: {
      id: 'moon_bat', name: '月夜蝙蝠', level: 76, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x8a8ab8,
      stats: { maxHp: 5500, atk: 538, def: 295, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 2110, gold: [146, 209],
    },
  },
};
