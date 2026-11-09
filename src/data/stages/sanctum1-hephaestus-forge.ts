import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神域副本 1・赫菲斯托斯神鍛場（v1.101，敵人換算成神話第 1 層＝Lv.151，首領不自動調整）
 * 火神赫菲斯托斯打造眾神兵器的工坊：宙斯的雷霆、阿基里斯的盾、潘朵拉都在這裡出爐。
 * 爐火從來沒有熄過，凡人站在這裡，連握劍的手都會發燙。
 * 詛咒與專屬套裝見 data/sanctum.ts。由 scratchpad 的 gen/gen_sanctum.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'sanctum_1',
  kind: 'field',
  music: 'inferno',
  theme: 'volcanic',
  name: '赫菲斯托斯神鍛場',
  subtitle: '神域 1・詛咒「熔爐灼熱」',
  region: '神域',
  levelRange: [151, 151],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x4a3028,
  skyColor: 0x3a1a10,
  fogColor: 0x6a3a20,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 6, d: 32, color: 0x6a4a3a },
    { x: -19, z: 14, w: 7, d: 7, color: 0xff6a1a, water: true },
    { x: 19, z: -2, w: 6, d: 9, color: 0xff6a1a, water: true },
    { x: -18, z: -16, w: 7, d: 6, color: 0xff7a2a, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x3a2a24, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'decor', x: -16, z: 24, h: 1.6, model: 'weaponrack' },
    { kind: 'decor', x: 16, z: 24, h: 1.6, model: 'weaponrack' },
    { kind: 'rock', x: -21, z: 2, w: 3, d: 3, h: 4, color: 0x3a2a24 },
    { kind: 'rock', x: 21, z: 12, w: 3, d: 3, h: 4.5, color: 0x3a2a24 },
    { kind: 'statue', x: -7, z: 23, rot: 0.3, color: 0xc89a5a }, // 赫菲斯托斯像
    { kind: 'crystal', x: 7, z: -12, color: 0xff7a2a },
    { kind: 'crystal', x: -7, z: 3, color: 0xffb04a },
    { kind: 'decor', x: 20, z: -18, h: 1.2, model: 'barrel_large' },
    { kind: 'decor', x: 6, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xff7a2a },
    ...pillarRing(0, -23, 6, 8, 0x8a6a4a),
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['神域詛咒：穿越多件這裡的專屬套裝，詛咒越弱，6 件全滿變成祝福', '這裡的敵人是固定強度，首領不會自動調整', '小怪有機會掉落這個神域的專屬套裝，首領必掉一件'],
  spawns: [
    { enemy: 'forge_automaton', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'forge_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'divine_smith_cyclops', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'divine_bronze_hound', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'forge_drake', x: -12, z: -4, count: 1 },
    { enemy: 'forge_automaton', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'divine_smith_cyclops', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'forge_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'divine_bronze_hound', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'forge_drake', x: 12, z: 8, count: 1 },
    { enemy: 'kedalion', x: 0, z: -23 },
  ],
  sanctum: { order: 1, unlockAfter: 'dungeon_30', icon: '⚒️' },
};

export const sanctumForge: StageDef = {
  zone,
  enemies: {
    forge_automaton: {
      id: 'forge_automaton', name: '神鍛自動人偶', level: 151, aggro: 'aggressive', shape: 'golem',
      radius: 0.6, respawn: 14, scale: 1.0, color: 0xc89a5a,
      stats: { maxHp: 16100, atk: 1163, def: 495, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9600, gold: [900, 1260],
    },
    forge_colossus: {
      id: 'forge_colossus', name: '神鍛青銅巨像', level: 151, aggro: 'aggressive', shape: 'golem',
      radius: 0.75, respawn: 14, scale: 1.45, color: 0x8a6a3a,
      stats: { maxHp: 42900, atk: 1163, def: 495, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9600, gold: [960, 1340],
    },
    divine_smith_cyclops: {
      id: 'divine_smith_cyclops', name: '獨眼神匠', level: 151, aggro: 'aggressive', shape: 'cyclops', ranged: true,
      radius: 0.6, respawn: 14, scale: 0.85, color: 0x9a6a5a,
      stats: { maxHp: 22800, atk: 1221, def: 495, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [1020, 1420],
    },
    divine_bronze_hound: {
      id: 'divine_bronze_hound', name: '青銅神犬', level: 151, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 14, scale: 1.2, color: 0xb8864a,
      stats: { maxHp: 22800, atk: 1163, def: 495, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9600, gold: [1080, 1500],
    },
    forge_drake: {
      id: 'forge_drake', name: '熔爐火蜥', level: 151, aggro: 'aggressive', shape: 'dragon',
      radius: 0.6, respawn: 14, scale: 0.6, color: 0xc8501a,
      stats: { maxHp: 32200, atk: 1396, def: 495, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9600, gold: [1140, 1580],
    },
    kedalion: {
      id: 'kedalion', name: '神鍛守衛刻德利翁', level: 151, aggro: 'aggressive', shape: 'antaeus', boss: true, element: 'fire',
      radius: 1.2, respawn: 120, scale: 1.9, color: 0x8a3a1a,
      stats: { maxHp: 760000, atk: 1240, def: 495, moveSpeed: 3.0 },
      attack: melee(3.2, 0.6, 1.7),
      exp: 520000, gold: [110000, 134000], gems: 30,
      bossSkills: ['sanct1_anvil', 'sanct1_sparks', 'sanct1_bellows', 'sanct1_quench'],
    },
  },
};
