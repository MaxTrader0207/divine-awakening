import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線四・埃蓋海底宮殿（Lv.41-45，擊敗第八層首領後開放）
 * 荷馬筆下波賽頓住在埃蓋海底的金色宮殿，替海神拉戰車的就是海馬希波坎普斯。
 * 退潮時宮殿的前庭露出海面。小怪：海宮巨蟹、深海鰻蛇。守護者：海馬希波坎普斯（水）。
 */
const zone: ZoneDef = {
  id: 'side_4',
  kind: 'field',
  music: 'sea',
  name: '埃蓋海底宮殿',
  subtitle: '埃蓋海底宮殿・支線・守護者',
  region: '埃蓋海',
  levelRange: [41, 45],
  lootTier: 5,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0xc8c0a0,
  skyColor: 0x6ab0d8,
  fogColor: 0x8ac8e0,
  fogRange: [32, 82],
  patches: [
    { x: -20, z: 0, w: 10, d: 56, color: 0x2a7ab8, water: true },
    { x: 20, z: 0, w: 10, d: 56, color: 0x2a7ab8, water: true },
    { x: 0, z: 13, w: 5, d: 20, color: 0xe0d8c0 }, // 大理石步道
    { x: 0, z: -11, w: 5, d: 12, color: 0xe0d8c0 },
    { x: 0, z: 1, w: 13, d: 9, color: 0xd8ceb0 },
    { x: 0, z: -23, w: 14, d: 12, color: 0xd8c890 }, // 海神寶座
    { x: -8, z: 8, w: 4, d: 3, color: 0x4f9ad8, water: true },
    { x: 8, z: -6, w: 4, d: 3, color: 0x4f9ad8, water: true },
  ],
  props: [
    ...row('column', -6, 20, 0, -6, 5),
    ...row('column', 6, 20, 0, -6, 5),
    ...row('palm', -13, 22, 0, -9, 5),
    ...row('palm', 13, 20, 0, -9, 5),
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xe8d8a0 },
    ...pillarRing(0, -23, 6.5, 8, 0x8fd8e8),
    { kind: 'fountain', x: 0, z: 1 },
    { kind: 'statue', x: -9, z: -28, rot: 0 },
    { kind: 'statue', x: 9, z: -28, rot: 0 },
    { kind: 'crystal', x: -3, z: -28, color: 0x7ad8ff },
    { kind: 'crystal', x: 3, z: -28, color: 0x7ad8ff },
    { kind: 'rock', x: -11, z: -14, color: 0x7a8a8a },
    { kind: 'rock', x: 11, z: 12, color: 0x7a8a8a },
    { kind: 'amphora', x: -4, z: -14 },
    { kind: 'amphora', x: 4, z: 14 },
    { kind: 'decor', x: 10, z: -26, h: 1.3, model: 'chest_gold' },
    { kind: 'decor', x: -10, z: 4, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '埃蓋海底宮殿：支線地圖，擊敗第八層首領後開放',
    '海馬希波坎普斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '海馬是水屬性：水剋火（堤豐巨蛙、奇美拉）、被雷剋（小心第九層的獨眼巨人）',
    '漩渦的範圍很大，看到預警就往外跑',
  ],
  spawns: [
    { enemy: 'aegae_crab', x: -10, z: 8, count: 3, spread: 3 },
    { enemy: 'aegae_eel', x: 11, z: 4, count: 3, spread: 3 },
    { enemy: 'aegae_eel', x: -10, z: -12, count: 2, spread: 3 },
    { enemy: 'aegae_crab', x: 10, z: -14, count: 2, spread: 3 },
    { enemy: 'guardian_hippocampus', x: 0, z: -23 },
  ],
  side: { guardian: 'guardian_hippocampus', unlockAfter: 'dungeon_8' },
};

export const aegaePalace: StageDef = {
  zone,
  enemies: {
    aegae_crab: {
      id: 'aegae_crab', name: '海宮巨蟹', level: 42, aggro: 'aggressive', shape: 'crab',
      radius: 0.75, respawn: 12, scale: 1.3, color: 0x3a8ab8,
      stats: { maxHp: 4500, atk: 318, def: 135, moveSpeed: 3.2 },
      attack: melee(1.5, 0.5, 1.6),
      exp: 1080, gold: [98, 142],
    },
    aegae_eel: {
      id: 'aegae_eel', name: '深海鰻蛇', level: 44, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0x2a6a8a,
      stats: { maxHp: 4300, atk: 332, def: 135, moveSpeed: 4.2 },
      attack: melee(1.6, 0.45, 1.4),
      exp: 1120, gold: [102, 148],
    },
    guardian_hippocampus: {
      id: 'guardian_hippocampus', name: '海馬希波坎普斯', level: 45, aggro: 'aggressive', shape: 'hippocampus', boss: true, element: 'water',
      radius: 0.8, respawn: 90, scale: 1.8, color: 0x2fa0b8,
      stats: { maxHp: 128000, atk: 323, def: 135, moveSpeed: 3.6 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 16000, gold: [5400, 6800], gems: 22,
      bossSkills: ['hippo_wave', 'hippo_surge', 'hippo_whirl', 'hippo_rain'],
    },
  },
};
