import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十八層・斯廷法利斯湖（副本 Lv.136-140，防禦 475）
 * 阿卡迪亞的沼澤湖，住著一大群青銅羽毛的怪鳥：羽毛像箭一樣射下來，糞便帶著毒。
 * 海克力斯的第六項試煉：雅典娜送他赫菲斯托斯打造的銅響板，嚇得鳥群一起飛起來。
 * 小怪：銅羽蝠鳥、沼澤泥巨像、銅羽鷹身女妖、湖畔銅蹄鹿、沼澤野豬。首領：斯廷法利斯銅羽鳥王（銅羽齊射、鳥王俯衝、銅羽暴雨、刃翼迴旋）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_28',
  kind: 'dungeon',
  music: 'wild',
  theme: 'swamp',
  name: '斯廷法利斯湖',
  subtitle: '第二十八層・銅羽怪鳥的沼澤',
  region: '斯廷法利斯湖',
  levelRange: [136, 140],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x4a5a3a,
  skyColor: 0x7a8a7a,
  fogColor: 0x8a9a8a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x6a6a4a }, // 木棧道
    { x: -14, z: 18, w: 12, d: 6, color: 0x3a6a6a, water: true }, // 沼澤
    { x: 15, z: 10, w: 12, d: 6, color: 0x3a6a6a, water: true },
    { x: -15, z: -12, w: 10, d: 6, color: 0x3a6a6a, water: true },
    { x: 18, z: -18, w: 8, d: 6, color: 0x3a6a6a, water: true },
    { x: 14, z: 24, w: 8, d: 5, color: 0x5a6a3a },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x4a4a3a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -20, z: 26, rot: 0.6, color: 0xd8d4c8 }, // 雅典娜像（銅響板）
    { kind: 'tree', x: -22, z: 6, color: 0x6a6a5a },
    { kind: 'tree', x: 22, z: 0, color: 0x6a6a5a },
    { kind: 'tree', x: 22, z: 20, color: 0x6a6a5a },
    { kind: 'tree', x: -22, z: -22, color: 0x6a6a5a },
    { kind: 'rock', x: -7, z: 24, color: 0x5a5a4a },
    { kind: 'rock', x: 7, z: -12, color: 0x5a5a4a },
    { kind: 'crystal', x: 6, z: 18, color: 0xf0d890 }, // 掉在地上的銅羽
    { kind: 'crystal', x: -7, z: 4, color: 0xf0d890 },
    { kind: 'crystal', x: 20, z: -6, color: 0xf0d890 },
    { kind: 'bush', x: -20, z: 12, color: 0x4a6a3a },
    { kind: 'decor', x: 6, z: 26, h: 1.0, model: 'barrel', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xc89a4a },
    ...pillarRing(0, -23, 6, 8, 0x6a6a5a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 475', '沼澤不能走，沿著木棧道前進', '銅羽齊射有好幾排，站在兩排中間', '刃翼迴旋之間有空隙'],
  spawns: [
    { enemy: 'bronze_batbird', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'marsh_colossus', x: 10, z: 17, count: 1 },
    { enemy: 'stymph_harpy', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'marsh_hind', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'marsh_boar', x: -12, z: -4, count: 1 },
    { enemy: 'bronze_batbird', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'stymph_harpy', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'marsh_colossus', x: -12, z: 10, count: 1 },
    { enemy: 'marsh_hind', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'stymphalian_king', x: 0, z: -23 },
  ],
  dungeon: { floor: 28, enemyDefense: 475, unlockAfter: 'dungeon_27' },
};

export const stymphalianLake: StageDef = {
  zone,
  enemies: {
    bronze_batbird: {
      id: 'bronze_batbird', name: '銅羽蝠鳥', level: 136, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 1.0, color: 0xb8864a,
      stats: { maxHp: 14400, atk: 1091, def: 475, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9990, gold: [781, 1093],
    },
    marsh_colossus: {
      id: 'marsh_colossus', name: '沼澤泥巨像', level: 137, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.3, color: 0x4a5a3a,
      stats: { maxHp: 38500, atk: 1091, def: 475, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 10120, gold: [812, 1137],
    },
    stymph_harpy: {
      id: 'stymph_harpy', name: '銅羽鷹身女妖', level: 138, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xb8864a,
      stats: { maxHp: 20400, atk: 1146, def: 475, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 10250, gold: [844, 1182],
    },
    marsh_hind: {
      id: 'marsh_hind', name: '湖畔銅蹄鹿', level: 139, aggro: 'aggressive', shape: 'hind',
      radius: 0.6, respawn: 12, scale: 0.9, color: 0xa8865a,
      stats: { maxHp: 20400, atk: 1091, def: 475, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 10390, gold: [875, 1225],
    },
    marsh_boar: {
      id: 'marsh_boar', name: '沼澤野豬', level: 140, aggro: 'aggressive', shape: 'boar',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0x4a4a3a,
      stats: { maxHp: 28900, atk: 1309, def: 475, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 10520, gold: [906, 1268],
    },
    stymphalian_king: {
      id: 'stymphalian_king', name: '斯廷法利斯銅羽鳥王', level: 140, aggro: 'aggressive', shape: 'stymphalian', boss: true, element: 'metal',
      radius: 1.0, respawn: 90, scale: 1.9, color: 0xa8783a,
      stats: { maxHp: 691000, atk: 1180, def: 475, moveSpeed: 4.0 },
      attack: melee(2.6, 0.5, 1.5),
      exp: 181000, gold: [84600, 103200], gems: 84,
      bossSkills: ['stymph_feathers', 'stymph_dive', 'stymph_storm', 'stymph_wings'],
    },
  },
};
