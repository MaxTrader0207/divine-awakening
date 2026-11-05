import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第一層・波賽頓海岸（副本 Lv.1-5，防禦 0）
 * 小怪：卡基諾斯幼蟹、寧芙潮蛙。首領：巨蟹卡基諾斯（巨鉗重擊、衝撞）。
 */
/* 副本版面共通：南邊入口（z ≈ +20）→ 中段小怪 → 北邊高台（石階在南側）→ 高台上的首領石圈。
 * 高台四周是峭壁，只能從石階上去，首領也只會在高台附近活動。 */
const zone: ZoneDef = {
  id: 'dungeon_1',
  kind: 'dungeon',
  music: 'sea',
  name: '波賽頓海岸',
  subtitle: '第一層・入口與西側',
  region: '波賽頓海岸',
  levelRange: [1, 5],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0xe6cf95,
  skyColor: 0xbfe3f2,
  fogColor: 0xe9e2c8,
  patches: [
    { x: 19, z: 0, w: 12, d: 60, color: 0x4fb3d9, water: true },
    { x: 12.5, z: 0, w: 1.2, d: 60, color: 0xf3e7c4 },
    { x: -2, z: 6, w: 4, d: 24, color: 0xd8c08a },
  ],
  platforms: [{ x: -6, z: -19, w: 26, d: 16, h: 1.4, color: 0x8fc15a, stairs: { x: -6, width: 5 } }],
  props: [
    { kind: 'palm', x: 9, z: 18 },
    { kind: 'palm', x: 10, z: 4 },
    { kind: 'palm', x: 9.5, z: -8 },
    { kind: 'palm', x: -18, z: 16 },
    { kind: 'palm', x: -20, z: 2 },
    { kind: 'rock', x: -9, z: 6 },
    { kind: 'rock', x: 5, z: -3 },
    { kind: 'rock', x: -14, z: 12 },
    { kind: 'pillar', x: -16, z: -4, h: 2.2 },
    { kind: 'pillar', x: 3, z: 14, h: 1.6 },
    { kind: 'bush', x: -12, z: -1 },
    { kind: 'tree', x: -16, z: -23 },
    { kind: 'tree', x: 4, z: -24 },
    { kind: 'stonering', x: -2, z: -21, w: 10, d: 10 },
    ...pillarRing(-2, -21, 5.6, 8),
    { kind: 'decor', x: -9.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -2.6, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: 22, h: 1.2, model: 'barrel_large' },
    { kind: 'decor', x: 7.2, z: 20.6, h: 1.4, model: 'crates_stacked' },
    { kind: 'decor', x: -6, z: 23, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -2, z: -14.6, h: 2.4, model: 'banner_red', solid: false },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['首領巨蟹卡基諾斯在高台東北的石圈', '被攻擊時會自動反擊最近的敵人', '留意被動怪：寧芙潮蛙受到攻擊才會反擊', '首領出招前地上會出現紅色範圍，用閃現（R）躲開'],
  spawns: [
    { enemy: 'hermit_crab', x: -6, z: 12, count: 3, spread: 4 },
    { enemy: 'bubble_frog', x: 2, z: 0, count: 3, spread: 4 },
    { enemy: 'hermit_crab', x: -15, z: 2, count: 3, spread: 3 },
    { enemy: 'crab_king', x: -2, z: -21 },
  ],
  dungeon: { floor: 1, enemyDefense: 0 },
};

export const poseidonCoast: StageDef = {
  zone,
  enemies: {
    hermit_crab: {
      id: 'hermit_crab', name: '卡基諾斯幼蟹', level: 3, aggro: 'aggressive', shape: 'crab',
      radius: 0.6, respawn: 12, scale: 1, color: 0xe2703a,
      stats: { maxHp: 180, atk: 26, def: 0, moveSpeed: 2.8 },
      attack: melee(1.2, 0.45, 1.5),
      exp: 18, gold: [4, 8],
    },
    bubble_frog: {
      id: 'bubble_frog', name: '寧芙潮蛙', level: 4, aggro: 'passive', shape: 'frog', model: 'frog',
      radius: 0.6, respawn: 12, scale: 1, color: 0x4fc3c9,
      stats: { maxHp: 250, atk: 30, def: 0, moveSpeed: 3.2 },
      attack: melee(1.3, 0.5, 1.6),
      exp: 26, gold: [5, 10],
    },
    crab_king: {
      id: 'crab_king', name: '巨蟹卡基諾斯', level: 6, aggro: 'aggressive', shape: 'crab', boss: true, element: 'water',
      radius: 0.62, respawn: 90, scale: 2.6, color: 0xd9452a,
      stats: { maxHp: 8800, atk: 72, def: 0, moveSpeed: 2.6 },
      attack: melee(2.4, 0.6, 1.8),
      exp: 320, gold: [150, 220], gems: 5,
      bossSkills: ['claw_slam', 'charge'],
    },
  },
};
