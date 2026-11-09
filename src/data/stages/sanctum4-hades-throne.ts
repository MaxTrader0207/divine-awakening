import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神域副本 4・黑帝斯冥府王座（v1.101，敵人換算成神話第 9 層＝Lv.159，首領不自動調整）
 * 冥王黑帝斯的王座大廳，冥府三判官在這裡審判每一個亡魂。
 * 活人的生命會一點一點被吸走——除非穿著冥王親自承認的鎧甲。
 * 詛咒與專屬套裝見 data/sanctum.ts。由 scratchpad 的 gen/gen_sanctum.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'sanctum_4',
  kind: 'field',
  music: 'dungeon',
  theme: 'underworld',
  name: '黑帝斯冥府王座',
  subtitle: '神域 4・詛咒「冥府凋零」',
  region: '神域',
  levelRange: [159, 159],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x2a2234,
  skyColor: 0x0a0612,
  fogColor: 0x2a1a3a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0x4a3a5a },
    { x: -19, z: 6, w: 6, d: 14, color: 0x3a1a5a, water: true }, // 冥河支流
    { x: 19, z: -4, w: 6, d: 14, color: 0x3a1a5a, water: true },
    { x: -14, z: 22, w: 8, d: 5, color: 0x3a2a4a },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x241c2e, stairs: { x: 0, width: 5 } }],
  props: [
    ...[24, 14, -6, -16].flatMap((z): PropDef[] => [{ kind: 'column', x: -15, z, h: 3, color: 0x4a3a5a }, { kind: 'column', x: 15, z, h: 3, color: 0x4a3a5a }]),
    { kind: 'statue', x: -7, z: 23, rot: 0.3, color: 0x3a3048 }, // 黑帝斯像
    { kind: 'statue', x: 7, z: 23, rot: -0.3, color: 0x4a4058 }, // 波瑟芬妮像
    ...[[-8, 2], [8, -12], [-20, 22], [20, 18]].map(([x, z]): PropDef => ({ kind: 'decor', x, z, h: 1.6, model: 'torch', solid: false })),
    { kind: 'crystal', x: 7, z: 4, color: 0xb06aff },
    { kind: 'crystal', x: -7, z: -12, color: 0x6affc0 },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x8a4aff },
    ...pillarRing(0, -23, 6, 8, 0x4a3a5a),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['神域詛咒：穿越多件這裡的專屬套裝，詛咒越弱，6 件全滿變成祝福', '這裡的敵人是固定強度，首領不會自動調整', '小怪有機會掉落這個神域的專屬套裝，首領必掉一件'],
  spawns: [
    { enemy: 'shade_wanderer', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'hades_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'throne_erinys', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'throne_hound', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'throne_knight', x: -12, z: -4, count: 1 },
    { enemy: 'shade_wanderer', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'throne_erinys', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'hades_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'throne_hound', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'throne_knight', x: 12, z: 8, count: 1 },
    { enemy: 'minos_judge', x: 0, z: -23 },
  ],
  sanctum: { order: 4, unlockAfter: 'sanctum_3', icon: '👑' },
};

export const sanctumThrone: StageDef = {
  zone,
  enemies: {
    shade_wanderer: {
      id: 'shade_wanderer', name: '徘徊的亡魂', level: 159, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_minion',
      radius: 0.55, respawn: 14, scale: 1.15, color: 0xc8c0d8,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9600, gold: [900, 1260],
    },
    hades_colossus: {
      id: 'hades_colossus', name: '冥府巨像', level: 159, aggro: 'aggressive', shape: 'golem',
      radius: 0.75, respawn: 14, scale: 1.5, color: 0x3a3048,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9600, gold: [960, 1340],
    },
    throne_erinys: {
      id: 'throne_erinys', name: '復仇女神厄里倪斯', level: 159, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 14, scale: 1.1, color: 0x5a2a4a,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [1020, 1420],
    },
    throne_hound: {
      id: 'throne_hound', name: '冥府王座獵犬', level: 159, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 14, scale: 1.25, color: 0x1a1420,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9600, gold: [1080, 1500],
    },
    throne_knight: {
      id: 'throne_knight', name: '冥府王座騎士', level: 159, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.65, respawn: 14, scale: 1.35, color: 0xb8a8c8,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9600, gold: [1140, 1580],
    },
    minos_judge: {
      id: 'minos_judge', name: '冥府判官米諾斯', level: 159, aggro: 'aggressive', shape: 'kronos', boss: true, element: 'dark',
      radius: 1.2, respawn: 120, scale: 2.0, color: 0x2a1a3a,
      stats: { maxHp: 760000, atk: 1240, def: 495, moveSpeed: 3.0 },
      attack: melee(3.4, 0.6, 1.7),
      exp: 520000, gold: [110000, 134000], gems: 30,
      bossSkills: ['sanct4_verdict', 'sanct4_souls', 'sanct4_wither', 'sanct4_gavel'],
    },
  },
};
