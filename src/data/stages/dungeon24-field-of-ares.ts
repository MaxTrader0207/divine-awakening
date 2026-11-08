import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十四層・戰神之野（副本 Lv.116-120，防禦 435）
 * 科爾基斯國王埃厄忒斯的試煉：給兩頭噴火的青銅牛套上軛，犁開戰神之野，再播下龍牙。
 * 伊阿宋塗了美狄亞的藥膏才擋住火焰；從犁溝裡長出來的龍牙兵，他丟一塊石頭讓它們自相殘殺。
 * 小怪：戰神之野龍牙兵、青銅牛犢、龍牙祭司、科爾基斯戰狼、戰神牛頭衛兵。首領：科爾基斯青銅火牛（青銅衝鋒、鼻孔噴火、火犁、銅蹄震地）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_24',
  kind: 'dungeon',
  music: 'inferno',
  theme: 'volcanic',
  name: '戰神之野',
  subtitle: '第二十四層・伊阿宋的試煉',
  region: '戰神之野',
  levelRange: [116, 120],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x5a4a38,
  skyColor: 0x6a3a2a,
  fogColor: 0x8a5a3a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0x7a6a4a }, // 犁過的田埂
    ...[22, 14, -6, -14].map((z) => ({ x: -15, z, w: 16, d: 1.6, color: 0x3a2a20 })), // 犁溝
    ...[22, 14, -6, -14].map((z) => ({ x: 15, z, w: 16, d: 1.6, color: 0x3a2a20 })),
    { x: -20, z: 4, w: 6, d: 5, color: 0xff6a1a, water: true }, // 火牛留下的火坑
    { x: 20, z: 8, w: 6, d: 6, color: 0xff6a1a, water: true },
    { x: 19, z: -20, w: 6, d: 5, color: 0xff6a1a, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x4a3a2e, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -17, z: 24, rot: 0.6, color: 0x8a5a4a }, // 戰神阿瑞斯像
    { kind: 'decor', x: 17, z: 25, h: 1.4, model: 'banner_red', solid: false },
    { kind: 'decor', x: -20, z: 16, h: 1.4, model: 'weaponrack' },
    { kind: 'decor', x: 20, z: 18, h: 1.4, model: 'weaponrack' },
    { kind: 'fence', x: -15, z: 28, w: 12, d: 0.4 },
    { kind: 'fence', x: 15, z: 28, w: 12, d: 0.4 },
    { kind: 'rock', x: -20, z: -12, color: 0x4a3a2e },
    { kind: 'rock', x: 7, z: -12, color: 0x4a3a2e },
    { kind: 'crystal', x: -6, z: 16, color: 0xff7a2a },
    { kind: 'crystal', x: 20, z: -6, color: 0xff7a2a },
    { kind: 'decor', x: 6, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -7, z: 2, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xc86a2a },
    ...pillarRing(0, -23, 6, 8, 0x6a4a3a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 435', '犁溝邊的火坑不能走', '青銅衝鋒很長，往兩側閃', '鼻孔噴火是前方扇形，繞到牠身後'],
  spawns: [
    { enemy: 'ares_spartoi', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'bronze_calf', x: 10, z: 17, count: 1 },
    { enemy: 'spartoi_priest', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'colchian_wolf', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'ares_guard', x: -12, z: -4, count: 1 },
    { enemy: 'ares_spartoi', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'spartoi_priest', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'bronze_calf', x: -12, z: 10, count: 1 },
    { enemy: 'colchian_wolf', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'khalkotauros', x: 0, z: -23 },
  ],
  dungeon: { floor: 24, enemyDefense: 435, unlockAfter: 'dungeon_23' },
};

export const fieldOfAres: StageDef = {
  zone,
  enemies: {
    ares_spartoi: {
      id: 'ares_spartoi', name: '戰神之野龍牙兵', level: 116, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_minion',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0xd8d0c0,
      stats: { maxHp: 11600, atk: 947, def: 435, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 7500, gold: [534, 748],
    },
    bronze_calf: {
      id: 'bronze_calf', name: '青銅牛犢', level: 117, aggro: 'aggressive', shape: 'bull',
      radius: 0.7, respawn: 12, scale: 0.95, color: 0xb8864a,
      stats: { maxHp: 30900, atk: 947, def: 435, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 7620, gold: [555, 777],
    },
    spartoi_priest: {
      id: 'spartoi_priest', name: '龍牙祭司', level: 118, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.1, color: 0xd8d0c0,
      stats: { maxHp: 16400, atk: 994, def: 435, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 7740, gold: [576, 806],
    },
    colchian_wolf: {
      id: 'colchian_wolf', name: '科爾基斯戰狼', level: 119, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x6a4a3a,
      stats: { maxHp: 16400, atk: 947, def: 435, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 7860, gold: [598, 837],
    },
    ares_guard: {
      id: 'ares_guard', name: '戰神牛頭衛兵', level: 120, aggro: 'aggressive', shape: 'minotaur',
      radius: 0.65, respawn: 12, scale: 1.0, color: 0x7a3a2a,
      stats: { maxHp: 23200, atk: 1136, def: 435, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 7970, gold: [619, 867],
    },
    khalkotauros: {
      id: 'khalkotauros', name: '科爾基斯青銅火牛', level: 120, aggro: 'aggressive', shape: 'khalkotauros', boss: true, element: 'fire',
      radius: 1.0, respawn: 90, scale: 2.0, color: 0xb8864a,
      stats: { maxHp: 602000, atk: 1060, def: 435, moveSpeed: 3.8 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 137000, gold: [53800, 65600], gems: 72,
      bossSkills: ['khalko_charge', 'khalko_breath', 'khalko_furrow', 'khalko_stomp'],
    },
  },
};
