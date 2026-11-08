import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 10・堤豐深淵（Lv.112，擊敗第 22 層首領後開放）
 * 大地之母蓋亞與塔爾塔洛斯的最後一個孩子，萬怪之父。頭頂星辰、雙手伸到東西兩端，肩上長著一百顆龍頭——連眾神都化成動物逃到埃及。
 * 只有魔王：萬怪之王堤豐（百首齊噬、眾神之劫、深淵咆哮、龍首獄火）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_10',
  kind: 'field',
  music: 'inferno',
  bossMusic: 'final',
  name: '堤豐深淵',
  subtitle: '堤豐深淵・神獸討伐',
  region: '塔爾塔洛斯深淵',
  levelRange: [108, 110],
  lootTier: 8,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x2a2430,
  skyColor: 0x1a0a1a,
  fogColor: 0x3a1a2a,
  fogRange: [34, 80],
  patches: [
    // v1.96：深淵的裂谷與紫色瘴氣池
    { x: -17, z: -14, w: 8, d: 14, color: 0x5a2a7a, water: true },
    { x: 17, z: 6, w: 8, d: 16, color: 0x5a2a7a, water: true },
    { x: 0, z: 8, w: 6, d: 30, color: 0x3a3048 },{ x: -16, z: -16, w: 5, d: 5, color: 0xff4a1a, water: true }, { x: 16, z: -15, w: 5, d: 5, color: 0x8a4aff, water: true }],
  props: [
    // v1.96：尖聳的岩柱、紫水晶群、碎石
    { kind: 'rock', x: -15, z: 6, w: 2.4, d: 2.4, h: 6, color: 0x3a3048 },
    { kind: 'rock', x: 14, z: -18, w: 2.6, d: 2.6, h: 7, color: 0x3a3048 },
    { kind: 'rock', x: 8, z: 18, w: 2, d: 2, h: 4, color: 0x4a3a58 },
    { kind: 'crystal', x: -12, z: -24, color: 0xb48cff },
    { kind: 'crystal', x: 12, z: -24, color: 0xb48cff },
    { kind: 'crystal', x: -18, z: 16, color: 0x8a6aff },
    { kind: 'decor', x: -9, z: 16, h: 1.0, model: 'rubble' },
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'crystal', x: -12, z: -20, color: 0xb48cff },
    { kind: 'crystal', x: 12, z: -20, color: 0xff6a2a },
    { kind: 'crystal', x: -16, z: 4, color: 0xff6a2a },
    { kind: 'crystal', x: 16, z: 2, color: 0xb48cff },
    { kind: 'rock', x: -15, z: 14, color: 0x2a2430 },
    { kind: 'rock', x: 15, z: 14, color: 0x2a2430 },
    { kind: 'decor', x: -6, z: -24, h: 1.0, model: 'rubble' },
    { kind: 'decor', x: 6, z: -24, h: 1.0, model: 'rubble' },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '堤豐深淵：神獸討伐第 10 關，只有一隻魔王',
    '萬怪之王堤豐：大地之母蓋亞與塔爾塔洛斯的最後一個孩子，萬怪之父。頭頂星辰、雙手伸到東西兩端，肩…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_typhon', x: 0, z: -8 }],
  beast: { order: 10, unlockAfter: 'dungeon_22', icon: '🐲' },
};

export const typhonAbyss: StageDef = {
  zone,
  enemies: {
    beast_typhon: {
      id: 'beast_typhon', name: '萬怪之王堤豐', level: 112, aggro: 'aggressive', shape: 'typhon', boss: true, element: 'dark',
      radius: 1.2, respawn: 90, scale: 1.45, color: 0x5a4a6a,
      stats: { maxHp: 670000, atk: 1069, def: 423, moveSpeed: 2.8 },
      attack: melee(3.4, 0.6, 1.9),
      exp: 144700, gold: [53690, 65450], gems: 81,
      bossSkills: ['typhon_hundred_heads', 'typhon_storm_of_gods', 'typhon_abyss_roar', 'typhon_dragon_flames'],
    },
  },
};
