import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十七層・阿爾戈斯牧場（副本 Lv.81-85，防禦 315）
 * 赫拉神廟旁的牧場：宙斯把伊俄變成白牛，赫拉派百眼巨人阿爾戈斯日夜看守——他睡覺時也總有幾隻眼睛睜著。
 * 後來赫密士吹笛子讓所有眼睛都閉上，赫拉把百眼放上了孔雀的尾羽。
 * 小怪：伊俄白牛、赫拉牛虻、百眼守望者。首領：百眼巨人阿爾戈斯（百眼凝視、牧杖橫掃、不眠之眼）。
 */
const WOOD = 0x8a6a3a;
const MARBLE = 0xe8e2d4;

const zone: ZoneDef = {
  id: 'dungeon_17',
  kind: 'dungeon',
  name: '阿爾戈斯牧場',
  subtitle: '第十七層・百眼巨人的看守',
  region: '阿爾戈斯牧場',
  levelRange: [81, 85],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x7a9a4a,
  skyColor: 0x88b8e0,
  fogColor: 0xa8c8e0,
  fogRange: [34, 84],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x9a8a5a },
    { x: -14, z: 14, w: 10, d: 8, color: 0x8aaa4a }, // 牛欄草地
    { x: 13, z: -4, w: 10, d: 8, color: 0x8aaa4a },
    { x: 15, z: 10, w: 6, d: 4, color: 0x5a8ab8, water: true }, // 飲水池
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x8a8070, stairs: { x: 0, width: 5 } }],
  props: [
    // 牛欄（留出入口）
    { kind: 'fence', x: -14, z: 18.5, w: 10, d: 0.3, color: WOOD },
    { kind: 'fence', x: -19, z: 14, w: 0.3, d: 9, color: WOOD },
    { kind: 'fence', x: -16, z: 9.5, w: 6, d: 0.3, color: WOOD },
    { kind: 'fence', x: 13, z: 0.5, w: 10, d: 0.3, color: WOOD },
    { kind: 'fence', x: 18, z: -4, w: 0.3, d: 9, color: WOOD },
    { kind: 'temple', x: 15, z: 22, w: 11, d: 7, color: MARBLE }, // 赫拉神廟
    { kind: 'olive', x: -8, z: 24 },
    { kind: 'olive', x: 7, z: 4 },
    { kind: 'olive', x: -7, z: -4 },
    { kind: 'olive', x: -21, z: -10 },
    { kind: 'statue', x: 6, z: 14, rot: -0.4, color: MARBLE }, // 赫拉像
    { kind: 'amphora', x: 9, z: 18, h: 1.0 },
    { kind: 'rock', x: 21, z: -14, color: 0x6a6a5a },
    { kind: 'decor', x: -20, z: 22, h: 1.0, model: 'sack', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    // 看守的高丘
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x3aa88a },
    ...pillarRing(0, -23, 6, 8, MARBLE),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 315', '百眼凝視的光束之間有空隙，站在空隙裡', '牧杖橫掃範圍很寬，往首領背後繞', '赫拉牛虻飛得快，用範圍技能一起打'],
  spawns: [
    { enemy: 'io_heifer', x: -14, z: 14, count: 3, spread: 2.5 },
    { enemy: 'hera_gadfly', x: 10, z: 10, count: 3, spread: 3 },
    { enemy: 'argus_watcher', x: -2, z: 14, count: 1 },
    { enemy: 'io_heifer', x: 12, z: -5, count: 3, spread: 3 },
    { enemy: 'hera_gadfly', x: -12, z: -3, count: 3, spread: 3 },
    { enemy: 'argus_watcher', x: 0, z: -6, count: 1 },
    { enemy: 'argus', x: 0, z: -23 },
  ],
  dungeon: { floor: 17, enemyDefense: 315, unlockAfter: 'dungeon_16' },
};

export const argosPasture: StageDef = {
  zone,
  enemies: {
    io_heifer: {
      id: 'io_heifer', name: '伊俄白牛', level: 81, aggro: 'aggressive', shape: 'bull',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0xf0ece0,
      stats: { maxHp: 12900, atk: 675, def: 315, moveSpeed: 4.0 },
      attack: melee(1.7, 0.55, 1.6),
      exp: 3930, gold: [274, 384],
    },
    hera_gadfly: {
      id: 'hera_gadfly', name: '赫拉牛虻', level: 82, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 1.3, color: 0x6a6a2a,
      stats: { maxHp: 8100, atk: 680, def: 315, moveSpeed: 5.2 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 4020, gold: [285, 399],
    },
    argus_watcher: {
      id: 'argus_watcher', name: '百眼守望者', level: 83, aggro: 'aggressive', shape: 'argus',
      radius: 0.65, respawn: 12, scale: 0.8, color: 0xb89a7a,
      stats: { maxHp: 13500, atk: 685, def: 315, moveSpeed: 2.8 },
      attack: melee(2.0, 0.6, 1.7),
      exp: 4110, gold: [296, 414],
    },
    argus: {
      id: 'argus', name: '百眼巨人阿爾戈斯', level: 85, aggro: 'aggressive', shape: 'argus', boss: true,
      radius: 0.95, respawn: 90, scale: 1.6, color: 0xc8a080,
      stats: { maxHp: 349000, atk: 775, def: 315, moveSpeed: 3.0 },
      attack: melee(3.2, 0.6, 1.7),
      exp: 74000, gold: [24300, 29600], gems: 51,
      bossSkills: ['argus_gaze', 'argus_club', 'argus_watch'],
    },
  },
};
