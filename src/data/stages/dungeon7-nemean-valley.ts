import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第七層・涅墨亞山谷（副本 Lv.31-35，防禦 115）
 * 海克力斯第一項試煉：刀槍不入的涅墨亞獅藏身在山谷盡頭的雙口洞穴。
 * 乾燥的金黃山谷、橄欖樹與柏樹、岩壁、獸骨。
 * 小怪：涅墨亞山狼、厄律曼托斯野豬、俄庫珀忒鷹身女妖。首領：涅墨亞獅（獅爪撕裂、金鬃猛撲、震天獅吼）。
 */
const ROCK = 0x8a7a5a;

const zone: ZoneDef = {
  id: 'dungeon_7',
  kind: 'dungeon',
  music: 'wild',
  name: '涅墨亞山谷',
  subtitle: '第七層・獅子的巢穴',
  region: '涅墨亞山谷',
  levelRange: [31, 35],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0xc8a868,
  skyColor: 0xe8c890,
  fogColor: 0xd8b880,
  fogRange: [36, 84],
  patches: [
    { x: 0, z: 8, w: 6, d: 30, color: 0xb89858 }, // 山谷小路
    { x: -12, z: 14, w: 9, d: 7, color: 0xa8b060 }, // 草地
    { x: 13, z: -3, w: 9, d: 8, color: 0xa8b060 },
    { x: 18, z: 18, w: 6, d: 5, color: 0x5a8aa8, water: true }, // 泉水
  ],
  platforms: [{ x: 0, z: -20, w: 26, d: 16, h: 1.4, color: 0x9a8058, stairs: { x: 0, width: 5 } }],
  props: [
    // 山谷兩側的岩壁
    { kind: 'wall', x: -23, z: 2, w: 3, d: 44, h: 4, color: ROCK },
    { kind: 'wall', x: 23, z: 2, w: 3, d: 44, h: 4, color: ROCK },
    // 中段一道岩脊（左右各留通道）
    { kind: 'wall', x: -8, z: 3, w: 14, d: 2, h: 2.4, color: ROCK },
    { kind: 'wall', x: 13, z: 7, w: 8, d: 2, h: 2.4, color: ROCK },
    { kind: 'olive', x: -17, z: 22 },
    { kind: 'olive', x: 9, z: 20 },
    { kind: 'olive', x: -6, z: -8 },
    { kind: 'cypress', x: 18, z: 25 },
    { kind: 'cypress', x: -19, z: 8 },
    { kind: 'cypress', x: 19, z: -12 },
    { kind: 'cypress', x: -18, z: -12 },
    { kind: 'rock', x: 6, z: 13, color: ROCK },
    { kind: 'rock', x: -4, z: 18, color: ROCK },
    { kind: 'rock', x: 8, z: -6, color: ROCK },
    { kind: 'rock', x: -14, z: -4, color: ROCK },
    { kind: 'bush', x: -9, z: 13, color: 0x8a9a4a },
    { kind: 'bush', x: 15, z: -1, color: 0x8a9a4a },
    { kind: 'bush', x: 3, z: 24, color: 0x8a9a4a },
    { kind: 'decor', x: -11, z: 24, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 12, z: -9, h: 1.0, model: 'rubble', solid: false },
    // 獅子巢穴（高台＋石圈）
    { kind: 'stonering', x: 0, z: -21, w: 10, d: 10, color: 0xb89858 },
    ...pillarRing(0, -21, 5.6, 8, 0x8a7050),
    { kind: 'decor', x: -3.4, z: -11.8, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -11.8, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 10, z: -25, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 115', '中間的岩脊只能從左右兩側繞過', '涅墨亞獅的震天獅吼範圍很大，看到預警就往外跑', '野豬衝得很猛，弓手法師先拉開距離'],
  spawns: [
    { enemy: 'nemean_wolf', x: -10, z: 17, count: 3, spread: 3 },
    { enemy: 'erymanthian_boar', x: 9, z: 15, count: 2, spread: 3 },
    { enemy: 'ocypete_harpy', x: 3, z: 9, count: 2, spread: 3 },
    { enemy: 'erymanthian_boar', x: -14, z: -4, count: 2, spread: 3 },
    { enemy: 'nemean_wolf', x: 14, z: -3, count: 3, spread: 3 },
    { enemy: 'ocypete_harpy', x: -2, z: -8, count: 2, spread: 3 },
    { enemy: 'nemean_lion', x: 0, z: -21 },
    { enemy: 'nemean_cub', x: 9, z: 15, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'valley_viper', x: -14, z: -4, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 7, enemyDefense: 115, unlockAfter: 'dungeon_6' },
};

export const nemeanValley: StageDef = {
  zone,
  enemies: {
    nemean_wolf: {
      id: 'nemean_wolf', name: '涅墨亞山狼', level: 31, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x8a7a6a,
      stats: { maxHp: 3400, atk: 255, def: 115, moveSpeed: 4.6 },
      attack: melee(1.4, 0.4, 1.3),
      exp: 720, gold: [74, 108],
    },
    erymanthian_boar: {
      id: 'erymanthian_boar', name: '厄律曼托斯野豬', level: 32, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1.2, color: 0x5a4434,
      stats: { maxHp: 4400, atk: 265, def: 115, moveSpeed: 3.8 },
      attack: melee(1.6, 0.55, 1.7),
      exp: 760, gold: [78, 114],
    },
    ocypete_harpy: {
      id: 'ocypete_harpy', name: '俄庫珀忒鷹身女妖', level: 33, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x6a5a8a,
      stats: { maxHp: 3000, atk: 280, def: 115, moveSpeed: 4.8 },
      attack: melee(1.3, 0.4, 1.3),
      exp: 790, gold: [80, 118],
    },
    nemean_lion: {
      id: 'nemean_lion', name: '涅墨亞獅', level: 35, aggro: 'aggressive', shape: 'lion', boss: true, element: 'metal',
      radius: 0.7, respawn: 90, scale: 2.2, color: 0xd8a848,
      stats: { maxHp: 122000, atk: 345, def: 115, moveSpeed: 3.6 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 14000, gold: [4800, 6000], gems: 22,
      bossSkills: ['lion_claw', 'lion_pounce', 'lion_roar'],
    },
    nemean_cub: {
      id: 'nemean_cub', name: '涅墨亞幼獅', level: 34, aggro: 'aggressive', shape: 'lion',
      radius: 0.6, respawn: 12, scale: 0.91, color: 0xd8a858,
      stats: { maxHp: 5100, atk: 329, def: 115, moveSpeed: 3.0 },
      attack: melee(1.7, 0.6, 1.8),
      exp: 1050, gold: [109, 156],
    },
    valley_viper: {
      id: 'valley_viper', name: '山谷毒蛇', level: 31, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0x8a7a3a,
      stats: { maxHp: 2950, atk: 248, def: 115, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 710, gold: [75, 107],
    },
  },
};
