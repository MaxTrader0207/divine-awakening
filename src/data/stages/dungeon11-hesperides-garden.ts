import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十一層・赫斯珀里得斯聖園（副本 Lv.51-55，防禦 195）
 * 世界西方盡頭的黃昏花園：赫拉的金蘋果樹由巨龍拉冬盤繞守護，泰坦阿特拉斯在附近扛著天空。
 * 小怪：科爾基斯青銅牛、塞壬歌姬、阿特拉斯泰坦衛兵。首領：巨龍拉冬（金焰吐息、龍尾橫掃、金蘋果流星）。
 */
const HEDGE = 0x3a7a4a;
const appleTree = (x: number, z: number): PropDef => ({ kind: 'olive', x, z, color: 0x4a8a3a });

const zone: ZoneDef = {
  id: 'dungeon_11',
  kind: 'dungeon',
  name: '赫斯珀里得斯聖園',
  subtitle: '第十一層・黃昏的金蘋果',
  region: '赫斯珀里得斯聖園',
  levelRange: [51, 55],
  safe: false,
  size: { w: 52, d: 62 },
  groundColor: 0x6a9a4a,
  skyColor: 0xf0907a,
  fogColor: 0xd88a7a,
  fogRange: [34, 82],
  patches: [
    { x: 0, z: 12, w: 5, d: 28, color: 0xd8c8a0 }, // 白石步道
    { x: 0, z: 2, w: 30, d: 4, color: 0xd8c8a0 },
    { x: -14, z: 14, w: 7, d: 7, color: 0x4a8ab8, water: true }, // 噴泉池
    { x: 14, z: 14, w: 7, d: 7, color: 0x4a8ab8, water: true },
    ...[[-9, 22], [9, 22], [-17, -6], [17, -6]].map(([x, z]) => ({ x, z, w: 5, d: 4, color: 0xd88ab8 })), // 花圃
  ],
  platforms: [{ x: 0, z: -21, w: 28, d: 16, h: 1.4, color: 0xc8b890, stairs: { x: 0, width: 5 } }],
  props: [
    // 樹籬圍出的花園（留出步道）
    { kind: 'hedge', x: -12, z: 7, w: 12, d: 1.2, color: HEDGE },
    { kind: 'hedge', x: 12, z: 7, w: 12, d: 1.2, color: HEDGE },
    { kind: 'hedge', x: -7, z: -4, w: 14, d: 1.2, color: HEDGE },
    { kind: 'hedge', x: 16, z: -4, w: 10, d: 1.2, color: HEDGE },
    appleTree(-20, 22), appleTree(20, 22), appleTree(-8, 11), appleTree(7, 10), appleTree(-20, 0), appleTree(20, 1), appleTree(-12, -11), appleTree(12, -11),
    { kind: 'fountain', x: 0, z: 16 },
    { kind: 'column', x: -4, z: 24 },
    { kind: 'column', x: 4, z: 24 },
    { kind: 'statue', x: -21, z: 11, rot: 1.2 },
    { kind: 'statue', x: 21, z: 11, rot: -1.2 },
    { kind: 'flowers', x: -3, z: -8 },
    { kind: 'flowers', x: 3, z: 6 },
    { kind: 'flowers', x: -15, z: -14 },
    { kind: 'amphora', x: 10, z: 26 },
    { kind: 'bench', x: -10, z: 26 },
    // 金蘋果樹下的龍巢
    { kind: 'stonering', x: 0, z: -22, w: 10, d: 10, color: 0xe8d8a8 },
    ...pillarRing(0, -22, 5.6, 8, 0xe8e0c8),
    { kind: 'crystal', x: -9, z: -26, color: 0xffd040 },
    { kind: 'crystal', x: 9, z: -26, color: 0xffd040 },
    { kind: 'decor', x: -3.4, z: -12.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -12.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 12, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: ['這層敵人有防禦 195', '樹籬會擋路，沿白石步道走', '龍尾橫掃以拉冬為中心，遠程站遠一點', '金焰吐息很長，往側邊閃'],
  spawns: [
    { enemy: 'colchian_bull', x: -7, z: 21, count: 2, spread: 3 },
    { enemy: 'siren_singer', x: 8, z: 20, count: 3, spread: 3 },
    { enemy: 'atlas_warden', x: 0, z: 10, count: 1 },
    { enemy: 'colchian_bull', x: 10, z: -1, count: 2, spread: 3 },
    { enemy: 'siren_singer', x: -12, z: 1, count: 3, spread: 3 },
    { enemy: 'atlas_warden', x: 8, z: -9, count: 1 },
    { enemy: 'ladon', x: 0, z: -22 },
  ],
  dungeon: { floor: 11, enemyDefense: 195, unlockAfter: 'dungeon_10' },
};

export const hesperidesGarden: StageDef = {
  zone,
  enemies: {
    colchian_bull: {
      id: 'colchian_bull', name: '科爾基斯青銅牛', level: 51, aggro: 'aggressive', shape: 'bull',
      radius: 0.7, respawn: 12, scale: 1.15, color: 0xb8863a,
      stats: { maxHp: 6800, atk: 415, def: 195, moveSpeed: 4.0 },
      attack: melee(1.6, 0.5, 1.6),
      exp: 1720, gold: [140, 200],
    },
    siren_singer: {
      id: 'siren_singer', name: '塞壬歌姬', level: 52, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xe8b8d8,
      stats: { maxHp: 5800, atk: 430, def: 195, moveSpeed: 4.8 },
      attack: melee(1.3, 0.4, 1.3),
      exp: 1800, gold: [146, 208],
    },
    atlas_warden: {
      id: 'atlas_warden', name: '阿特拉斯泰坦衛兵', level: 53, aggro: 'aggressive', shape: 'golem',
      radius: 0.8, respawn: 15, scale: 1.55, color: 0x6a6a8a,
      stats: { maxHp: 10500, atk: 440, def: 195, moveSpeed: 2.4 },
      attack: melee(2.1, 0.75, 2.1),
      exp: 1900, gold: [156, 222],
    },
    ladon: {
      id: 'ladon', name: '巨龍拉冬', level: 55, aggro: 'aggressive', shape: 'dragon', boss: true, element: 'light',
      radius: 0.8, respawn: 90, scale: 2, color: 0x3a8a5a,
      stats: { maxHp: 215000, atk: 505, def: 195, moveSpeed: 3 },
      attack: melee(3, 0.6, 1.7),
      exp: 34000, gold: [11400, 13800], gems: 33,
      bossSkills: ['dragon_breath', 'dragon_tail', 'golden_meteor'],
    },
  },
};
