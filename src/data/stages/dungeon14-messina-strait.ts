import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十四層・墨西拿海峽（副本 Lv.66-70，防禦 255）
 * 奧德修斯的船必須穿過的海峽：一邊是吞吐海水的漩渦卡律布狄斯，另一邊的岩洞住著斯庫拉。
 * 船員寧可失去六個人，也不能整艘船沉入漩渦。
 * 小怪：斯庫拉海犬、漩渦巨蟹、墨西拿海蛇。首領：斯庫拉（六犬齊咬、觸手鞭擊、卡律布狄斯漩渦）。
 */
const SEA = 0x2a6a9a;
const reef = (x: number, z: number): PropDef => ({ kind: 'rock', x, z, color: 0x5a5a52 });

const zone: ZoneDef = {
  id: 'dungeon_14',
  kind: 'dungeon',
  music: 'sea',
  bossMusic: 'titan',
  name: '墨西拿海峽',
  subtitle: '第十四層・斯庫拉與卡律布狄斯',
  region: '墨西拿海峽',
  levelRange: [66, 70],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x8a7a62,
  skyColor: 0x2a4a6a,
  fogColor: 0x4a6a8a,
  fogRange: [30, 74],
  mist: true,
  patches: [
    // 兩側是海
    { x: -21, z: 2, w: 12, d: 46, color: SEA, water: true },
    { x: 21, z: 2, w: 12, d: 46, color: SEA, water: true },
    // 中間的海溝，只有中央的礁石可以走
    { x: -8, z: 6, w: 14, d: 4, color: SEA, water: true },
    { x: 9, z: 6, w: 12, d: 4, color: SEA, water: true },
    { x: 1, z: 6, w: 4, d: 4, color: 0x6a6252 },
    { x: 0, z: 18, w: 8, d: 12, color: 0x9a8a6a },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x4a4a4a, stairs: { x: 0, width: 5 } }],
  props: [
    reef(-13, 22), reef(13, 24), reef(-13, 12), reef(13, 13), reef(-13, -4), reef(13, -8), reef(-12, -12),
    { kind: 'crystal', x: -12, z: 0, color: 0xff8a7a }, // 珊瑚
    { kind: 'crystal', x: 12, z: 0, color: 0xff8a7a },
    { kind: 'crystal', x: 8, z: 22, color: 0x7ad8ff },
    { kind: 'column', x: -6, z: -9, color: 0xa8a090 },
    { kind: 'column', x: 7, z: -10, color: 0xa8a090 },
    // 奧德修斯船隊的殘骸
    { kind: 'decor', x: -8, z: 26, h: 1.2, model: 'barrel', solid: false },
    { kind: 'decor', x: 7, z: 14, h: 1.4, model: 'crates_stacked' },
    { kind: 'decor', x: -7, z: 13, h: 1.0, model: 'barrel_large' },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 斯庫拉的岩洞
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x2a6a8a },
    ...pillarRing(0, -23, 6, 8, 0x3a4a52),
    { kind: 'decor', x: 12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 255', '兩側是海，海溝只能從中間的礁石走過去', '六犬齊咬：站在犬頭之間的空隙', '漩渦是以首領為中心，預警出現就往外跑'],
  spawns: [
    { enemy: 'scylla_hound', x: -9, z: 20, count: 3, spread: 3 },
    { enemy: 'whirl_crab', x: 9, z: 18, count: 2, spread: 3 },
    { enemy: 'strait_serpent', x: 0, z: 14, count: 1 },
    { enemy: 'scylla_hound', x: 10, z: -3, count: 3, spread: 3 },
    { enemy: 'strait_serpent', x: -10, z: -2, count: 2, spread: 3 },
    { enemy: 'whirl_crab', x: 0, z: -5, count: 2, spread: 2.5 },
    { enemy: 'scylla', x: 0, z: -23 },
  ],
  dungeon: { floor: 14, enemyDefense: 255, unlockAfter: 'dungeon_13' },
};

export const messinaStrait: StageDef = {
  zone,
  enemies: {
    scylla_hound: {
      id: 'scylla_hound', name: '斯庫拉海犬', level: 66, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x3a5a7a,
      stats: { maxHp: 7700, atk: 539, def: 255, moveSpeed: 5.0 },
      attack: melee(1.3, 0.4, 1.25),
      exp: 2720, gold: [206, 288],
    },
    whirl_crab: {
      id: 'whirl_crab', name: '漩渦巨蟹', level: 67, aggro: 'aggressive', shape: 'crab',
      radius: 0.65, respawn: 12, scale: 1.35, color: 0x2a6a8a,
      stats: { maxHp: 10900, atk: 549, def: 255, moveSpeed: 2.8 },
      attack: melee(1.6, 0.55, 1.6),
      exp: 2790, gold: [214, 300],
    },
    strait_serpent: {
      id: 'strait_serpent', name: '墨西拿海蛇', level: 68, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.2, color: 0x2a8a8a,
      stats: { maxHp: 9100, atk: 559, def: 255, moveSpeed: 3.4 },
      attack: melee(1.7, 0.5, 1.5),
      exp: 2870, gold: [222, 311],
    },
    scylla: {
      id: 'scylla', name: '斯庫拉', level: 70, aggro: 'aggressive', shape: 'scylla', boss: true,
      radius: 0.9, respawn: 90, scale: 2.1, color: 0x2a6a8a,
      stats: { maxHp: 293000, atk: 640, def: 255, moveSpeed: 3.0 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 52000, gold: [17300, 21100], gems: 42,
      bossSkills: ['scylla_dogs', 'scylla_tentacles', 'charybdis_whirl'],
    },
  },
};
