import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神域副本 3・阿蒂蜜絲月之獵林（v1.101，敵人換算成神話第 6 層＝Lv.156，首領不自動調整）
 * 月神阿蒂蜜絲的狩獵之林，只在滿月的夜晚出現。闖入的獵人會被變成鹿，被自己的獵犬追捕——就像亞克提安。
 * 月蝕的迷霧遮住一切，看不清獵物，也看不清誰才是獵人。
 * 詛咒與專屬套裝見 data/sanctum.ts。由 scratchpad 的 gen/gen_sanctum.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'sanctum_3',
  kind: 'field',
  music: 'forest',
  theme: 'forest',
  name: '阿蒂蜜絲月之獵林',
  subtitle: '神域 3・詛咒「月蝕迷霧」',
  region: '神域',
  levelRange: [156, 156],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x2a3a3a,
  skyColor: 0x10182a,
  fogColor: 0x3a4a5a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x5a6a6a },
    { x: -16, z: 16, w: 10, d: 8, color: 0x3a5a4a },
    { x: 16, z: -6, w: 10, d: 8, color: 0x3a5a4a },
    { x: 19, z: 20, w: 6, d: 6, color: 0x8ab8e8, water: true }, // 月光泉
    { x: -19, z: -16, w: 6, d: 6, color: 0x8ab8e8, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x3a4048, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -7, z: 23, rot: 0.3, color: 0xe8ecff }, // 阿蒂蜜絲像
    { kind: 'cypress', x: -22, z: 6, color: 0x2a4a3a },
    { kind: 'cypress', x: 22, z: 4, color: 0x2a4a3a },
    { kind: 'cypress', x: -22, z: -6, color: 0x2a4a3a },
    { kind: 'olive', x: 21, z: -16, color: 0x3a5a4a },
    { kind: 'olive', x: -20, z: 24, color: 0x3a5a4a },
    { kind: 'crystal', x: 7, z: 22, color: 0xe0ecff },
    { kind: 'crystal', x: -7, z: 3, color: 0xe0ecff },
    { kind: 'crystal', x: 7, z: -12, color: 0xc8d8ff },
    { kind: 'bush', x: -8, z: -12, color: 0x2a4a3a },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xc8d8ff },
    ...pillarRing(0, -23, 6, 8, 0x8a94a8),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['神域詛咒：穿越多件這裡的專屬套裝，詛咒越弱，6 件全滿變成祝福', '這裡的敵人是固定強度，首領不會自動調整', '小怪有機會掉落這個神域的專屬套裝，首領必掉一件'],
  spawns: [
    { enemy: 'moon_wolf', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'moon_bear', x: 10, z: 17, count: 1 },
    { enemy: 'nymph_archer', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'actaeon_stag', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'moon_owl', x: -12, z: -4, count: 1 },
    { enemy: 'moon_wolf', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'nymph_archer', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'moon_bear', x: -12, z: 10, count: 1 },
    { enemy: 'actaeon_stag', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'moon_owl', x: 12, z: 8, count: 1 },
    { enemy: 'laelaps', x: 0, z: -23 },
  ],
  sanctum: { order: 3, unlockAfter: 'sanctum_2', icon: '🌙' },
};

export const sanctumMoon: StageDef = {
  zone,
  enemies: {
    moon_wolf: {
      id: 'moon_wolf', name: '月影銀狼', level: 156, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 14, scale: 1.2, color: 0xc8d0e0,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9600, gold: [900, 1260],
    },
    moon_bear: {
      id: 'moon_bear', name: '卡利斯托月熊', level: 156, aggro: 'aggressive', shape: 'boar',
      radius: 0.75, respawn: 14, scale: 1.5, color: 0x5a5a6a,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9600, gold: [960, 1340],
    },
    nymph_archer: {
      id: 'nymph_archer', name: '寧芙月光射手', level: 156, aggro: 'aggressive', shape: 'centaur', ranged: true,
      radius: 0.6, respawn: 14, scale: 0.95, color: 0xa8b8d8,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [1020, 1420],
    },
    actaeon_stag: {
      id: 'actaeon_stag', name: '亞克提安之鹿', level: 156, aggro: 'aggressive', shape: 'hind',
      radius: 0.6, respawn: 14, scale: 1.0, color: 0xd8c8a0,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9600, gold: [1080, 1500],
    },
    moon_owl: {
      id: 'moon_owl', name: '月蝕夜梟', level: 156, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 14, scale: 1.1, color: 0x6a6a8a,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9600, gold: [1140, 1580],
    },
    laelaps: {
      id: 'laelaps', name: '月神獵犬萊拉普斯', level: 156, aggro: 'aggressive', shape: 'vulpes', boss: true, element: 'light',
      radius: 1.0, respawn: 120, scale: 2.3, color: 0xc8d0e8,
      stats: { maxHp: 760000, atk: 1240, def: 495, moveSpeed: 4.6 },
      attack: melee(2.8, 0.5, 1.4),
      exp: 520000, gold: [110000, 134000], gems: 30,
      bossSkills: ['sanct3_hunt', 'sanct3_moonfang', 'sanct3_eclipse', 'sanct3_pounce'],
    },
  },
};
