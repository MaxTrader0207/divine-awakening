import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神域副本 2・波賽頓深海神殿（v1.101，敵人換算成神話第 3 層＝Lv.153，首領不自動調整）
 * 海神波賽頓在愛琴海底的宮殿：黃金的馬車、珊瑚的柱子，海馬拉著戰車在水中奔馳。
 * 深海的重量壓在每個闖入者的肩上，連舉起武器都很吃力。
 * 詛咒與專屬套裝見 data/sanctum.ts。由 scratchpad 的 gen/gen_sanctum.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'sanctum_2',
  kind: 'field',
  music: 'sea',
  theme: 'coast',
  name: '波賽頓深海神殿',
  subtitle: '神域 2・詛咒「深海重壓」',
  region: '神域',
  levelRange: [153, 153],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x2a4a5a,
  skyColor: 0x0a2a4a,
  fogColor: 0x1a4a6a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0x8ab8c8 },
    { x: -20, z: 6, w: 6, d: 40, color: 0x2a6a9a, water: true },
    { x: 20, z: 6, w: 6, d: 40, color: 0x2a6a9a, water: true },
    { x: -12, z: 20, w: 8, d: 6, color: 0x4a8a8a },
    { x: 12, z: -10, w: 8, d: 6, color: 0x4a8a8a },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x2a3a4a, stairs: { x: 0, width: 5 } }],
  props: [
    ...[24, 14, 4, -6, -16].flatMap((z): PropDef[] => [{ kind: 'column', x: -15, z, h: 3, color: 0x9ad8e0 }, { kind: 'column', x: 15, z, h: 3, color: 0x9ad8e0 }]),
    { kind: 'statue', x: -7, z: 23, rot: 0.3, color: 0x6ad8e8 }, // 波賽頓像
    { kind: 'crystal', x: 7, z: 22, color: 0x6ae8ff },
    { kind: 'crystal', x: -7, z: 3, color: 0xff8ac8 }, // 珊瑚
    { kind: 'crystal', x: 7, z: -12, color: 0xff8ac8 },
    { kind: 'rock', x: -8, z: -12, w: 2.4, d: 2.4, h: 1.6, color: 0x4a6a7a },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x4fb8ff },
    ...pillarRing(0, -23, 6, 8, 0x9ad8e0),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['神域詛咒：穿越多件這裡的專屬套裝，詛咒越弱，6 件全滿變成祝福', '這裡的敵人是固定強度，首領不會自動調整', '小怪有機會掉落這個神域的專屬套裝，首領必掉一件'],
  spawns: [
    { enemy: 'temple_guard', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'abyss_crab', x: 10, z: 17, count: 1 },
    { enemy: 'siren_priestess', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'abyss_eel', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'abyss_toad', x: -12, z: -4, count: 1 },
    { enemy: 'temple_guard', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'siren_priestess', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'abyss_crab', x: -12, z: 10, count: 1 },
    { enemy: 'abyss_eel', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'abyss_toad', x: 12, z: 8, count: 1 },
    { enemy: 'triton', x: 0, z: -23 },
  ],
  sanctum: { order: 2, unlockAfter: 'sanctum_1', icon: '🔱' },
};

export const sanctumSea: StageDef = {
  zone,
  enemies: {
    temple_guard: {
      id: 'temple_guard', name: '海神神殿衛兵', level: 153, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 14, scale: 1.2, color: 0xb8e8f0,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9600, gold: [900, 1260],
    },
    abyss_crab: {
      id: 'abyss_crab', name: '深淵巨蟹', level: 153, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 14, scale: 1.45, color: 0x2a5a7a,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9600, gold: [960, 1340],
    },
    siren_priestess: {
      id: 'siren_priestess', name: '塞壬祭司', level: 153, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 14, scale: 1.05, color: 0x6ac8d8,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [1020, 1420],
    },
    abyss_eel: {
      id: 'abyss_eel', name: '深海電鰻', level: 153, aggro: 'aggressive', shape: 'serpent',
      radius: 0.55, respawn: 14, scale: 1.1, color: 0x2a4a8a,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9600, gold: [1080, 1500],
    },
    abyss_toad: {
      id: 'abyss_toad', name: '深淵巨蟾', level: 153, aggro: 'aggressive', shape: 'frog', model: 'frog',
      radius: 0.65, respawn: 14, scale: 1.4, color: 0x2a6a6a,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9600, gold: [1140, 1580],
    },
    triton: {
      id: 'triton', name: '海神之子特里同', level: 153, aggro: 'aggressive', shape: 'lamia', boss: true, element: 'water',
      radius: 1.1, respawn: 120, scale: 2.3, color: 0x2a8a8a,
      stats: { maxHp: 760000, atk: 1240, def: 495, moveSpeed: 3.4 },
      attack: melee(3.0, 0.55, 1.6),
      exp: 520000, gold: [110000, 134000], gems: 30,
      bossSkills: ['sanct2_conch', 'sanct2_trident', 'sanct2_tide', 'sanct2_surge'],
    },
  },
};
