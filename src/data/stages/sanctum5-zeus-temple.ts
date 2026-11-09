import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神域副本 5・宙斯雷霆神殿（v1.101，敵人換算成神話第 12 層＝Lv.162，首領不自動調整）
 * 奧林帕斯最高處、眾神之王宙斯的神殿。雷霆從這裡劈向大地，神鷹埃托斯在殿頂盤旋。
 * 凡人站在這裡本身就是一種冒犯——天罰的雷霆會落在每一個不被認可的人身上。
 * 詛咒與專屬套裝見 data/sanctum.ts。由 scratchpad 的 gen/gen_sanctum.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'sanctum_5',
  kind: 'field',
  music: 'titan',
  bossMusic: 'final',
  theme: 'mountain',
  name: '宙斯雷霆神殿',
  subtitle: '神域 5・詛咒「天罰雷霆」',
  region: '神域',
  levelRange: [162, 162],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0xd8d4c8,
  skyColor: 0x1a2a5a,
  fogColor: 0x5a6a9a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 34, color: 0xf0e0a0 },
    { x: -22, z: 4, w: 6, d: 46, color: 0xe8eef8, water: true }, // 雲海
    { x: 22, z: 4, w: 6, d: 46, color: 0xe8eef8, water: true },
    { x: -12, z: 20, w: 8, d: 6, color: 0xb8b0a0 },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0xc8c4b8, stairs: { x: 0, width: 5 } }],
  props: [
    ...[24, 14, 4, -6, -16].flatMap((z): PropDef[] => [{ kind: 'column', x: -16, z, h: 3.4, color: 0xf0e8d0 }, { kind: 'column', x: 16, z, h: 3.4, color: 0xf0e8d0 }]),
    { kind: 'statue', x: -7, z: 24, rot: 0.3, color: 0xf0e0a0 }, // 宙斯金像
    { kind: 'statue', x: 7, z: 24, rot: -0.3, color: 0xf0e0a0 },
    { kind: 'crystal', x: -7, z: 14, color: 0x9ae8ff },
    { kind: 'crystal', x: 7, z: 2, color: 0xffe14a },
    { kind: 'crystal', x: -7, z: -12, color: 0x9ae8ff },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xffe14a },
    ...pillarRing(0, -23, 6, 8, 0xf0e8d0),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['神域詛咒：穿越多件這裡的專屬套裝，詛咒越弱，6 件全滿變成祝福', '這裡的敵人是固定強度，首領不會自動調整', '小怪有機會掉落這個神域的專屬套裝，首領必掉一件'],
  spawns: [
    { enemy: 'thunder_guard', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'olympus_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'thunder_harpy', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'zeus_griffin', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'thunder_smith_cyclops', x: -12, z: -4, count: 1 },
    { enemy: 'thunder_guard', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'thunder_harpy', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'olympus_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'zeus_griffin', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'thunder_smith_cyclops', x: 12, z: 8, count: 1 },
    { enemy: 'aetos_dios', x: 0, z: -23 },
  ],
  sanctum: { order: 5, unlockAfter: 'sanctum_4', icon: '⚡' },
};

export const sanctumThunder: StageDef = {
  zone,
  enemies: {
    thunder_guard: {
      id: 'thunder_guard', name: '雷霆神殿衛士', level: 162, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 14, scale: 1.25, color: 0xf0e8c8,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9600, gold: [900, 1260],
    },
    olympus_colossus: {
      id: 'olympus_colossus', name: '奧林帕斯巨像', level: 162, aggro: 'aggressive', shape: 'golem',
      radius: 0.75, respawn: 14, scale: 1.55, color: 0xd8d0b8,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9600, gold: [960, 1340],
    },
    thunder_harpy: {
      id: 'thunder_harpy', name: '雷暴鷹身女妖', level: 162, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 14, scale: 1.1, color: 0x9ab8e8,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [1020, 1420],
    },
    zeus_griffin: {
      id: 'zeus_griffin', name: '宙斯獅鷲', level: 162, aggro: 'aggressive', shape: 'griffin',
      radius: 0.65, respawn: 14, scale: 0.7, color: 0xe8c86a,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9600, gold: [1080, 1500],
    },
    thunder_smith_cyclops: {
      id: 'thunder_smith_cyclops', name: '獨眼雷匠', level: 162, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.65, respawn: 14, scale: 1.0, color: 0x8a9ab8,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9600, gold: [1140, 1580],
    },
    aetos_dios: {
      id: 'aetos_dios', name: '天罰神鷹埃托斯', level: 162, aggro: 'aggressive', shape: 'stymphalian', boss: true, element: 'thunder',
      radius: 1.1, respawn: 120, scale: 2.2, color: 0xe8c86a,
      stats: { maxHp: 760000, atk: 1240, def: 495, moveSpeed: 4.2 },
      attack: melee(2.8, 0.5, 1.5),
      exp: 520000, gold: [110000, 134000], gems: 30,
      bossSkills: ['sanct5_bolts', 'sanct5_stoop', 'sanct5_feathers', 'sanct5_storm'],
    },
  },
};
