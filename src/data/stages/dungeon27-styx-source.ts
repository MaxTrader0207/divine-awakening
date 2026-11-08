import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十七層・斯堤克斯河源（副本 Lv.131-135，防禦 465）
 * 冥河斯堤克斯從高崖上落下的源頭：眾神以這條河起誓，違誓的神要昏睡一年、被逐出奧林帕斯九年。
 * 泰坦之戰時，前半公牛、後半長蛇的牛蛇從這裡出現——誰燒了牠的內臟，誰就能打敗眾神。
 * 小怪：冥河鰻群、背誓的泰坦亡靈、冥河毒蟾、誓約獵犬、斯堤克斯巨蟹。首領：牛蛇俄菲奧陶洛斯（牛角衝撞、蛇尾橫掃、冥河漲潮、盤蛇鎖地）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_27',
  kind: 'dungeon',
  music: 'dungeon',
  theme: 'underworld',
  name: '斯堤克斯河源',
  subtitle: '第二十七層・眾神起誓的冥河瀑布',
  region: '斯堤克斯河源',
  levelRange: [131, 135],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x2e3a44,
  skyColor: 0x1a2a3a,
  fogColor: 0x2a3a4a,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 18, w: 6, d: 16, color: 0x3a4a54 },
    // 冥河：中間留一段淺灘
    { x: -14, z: 6, w: 22, d: 3, color: 0x2a5a7a, water: true },
    { x: 15, z: 6, w: 24, d: 3, color: 0x2a5a7a, water: true },
    { x: 1, z: 6, w: 6, d: 3, color: 0x3a5a6a },
    { x: -20, z: -14, w: 6, d: 8, color: 0x2a5a7a, water: true },
    { x: 20, z: 22, w: 6, d: 6, color: 0x2a5a7a, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x2a3440, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -18, z: 24, rot: 0.6, color: 0x5a6a7a }, // 起誓石
    { kind: 'rock', x: -7, z: 22, color: 0x2a3440 },
    { kind: 'rock', x: 7, z: 12, color: 0x2a3440 },
    { kind: 'rock', x: 20, z: -8, color: 0x2a3440 },
    { kind: 'rock', x: -20, z: 16, color: 0x2a3440 },
    { kind: 'crystal', x: -7, z: 14, color: 0x6ae0ff },
    { kind: 'crystal', x: 15, z: 14, color: 0x6ae0ff },
    { kind: 'crystal', x: 6, z: -12, color: 0x6ae0ff },
    { kind: 'column', x: -16, z: -4, h: 1.4, color: 0x4a5a6a },
    { kind: 'column', x: 16, z: 0, h: 2.0, color: 0x4a5a6a },
    { kind: 'decor', x: -8, z: -12, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0x2a6a9a },
    ...pillarRing(0, -23, 6, 8, 0x3a4a5a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 465', '冥河只能從中間的淺灘過去', '蛇尾橫掃範圍很寬，往牠身後繞', '盤蛇鎖地的蛇身之間是安全區'],
  spawns: [
    { enemy: 'styx_eel', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'forsworn_titan', x: 10, z: 17, count: 1 },
    { enemy: 'styx_toad', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'oath_hound', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'styx_crab', x: -12, z: -4, count: 1 },
    { enemy: 'styx_eel', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'styx_toad', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'forsworn_titan', x: -12, z: 10, count: 1 },
    { enemy: 'oath_hound', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'ophiotaurus', x: 0, z: -23 },
  ],
  dungeon: { floor: 27, enemyDefense: 465, unlockAfter: 'dungeon_26' },
};

export const styxSource: StageDef = {
  zone,
  enemies: {
    styx_eel: {
      id: 'styx_eel', name: '冥河鰻群', level: 131, aggro: 'aggressive', shape: 'serpent',
      radius: 0.5, respawn: 12, scale: 0.95, color: 0x2a5a6a,
      stats: { maxHp: 13700, atk: 1055, def: 465, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 9340, gold: [710, 994],
    },
    forsworn_titan: {
      id: 'forsworn_titan', name: '背誓的泰坦亡靈', level: 132, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.65, respawn: 12, scale: 1.3, color: 0xc8d0d8,
      stats: { maxHp: 36400, atk: 1055, def: 465, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 9470, gold: [739, 1035],
    },
    styx_toad: {
      id: 'styx_toad', name: '冥河毒蟾', level: 133, aggro: 'aggressive', shape: 'frog', model: 'frog', ranged: true,
      radius: 0.6, respawn: 12, scale: 1.2, color: 0x3a6a7a,
      stats: { maxHp: 19400, atk: 1108, def: 465, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 9600, gold: [767, 1074],
    },
    oath_hound: {
      id: 'oath_hound', name: '誓約獵犬', level: 134, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x3a4a5a,
      stats: { maxHp: 19400, atk: 1055, def: 465, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 9730, gold: [795, 1113],
    },
    styx_crab: {
      id: 'styx_crab', name: '斯堤克斯巨蟹', level: 135, aggro: 'aggressive', shape: 'crab',
      radius: 0.65, respawn: 12, scale: 1.35, color: 0x2a4a5a,
      stats: { maxHp: 27300, atk: 1266, def: 465, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 9860, gold: [824, 1154],
    },
    ophiotaurus: {
      id: 'ophiotaurus', name: '牛蛇俄菲奧陶洛斯', level: 135, aggro: 'aggressive', shape: 'ophiotaurus', boss: true, element: 'water',
      radius: 1.0, respawn: 90, scale: 2.0, color: 0x2a4a5a,
      stats: { maxHp: 667000, atk: 1150, def: 465, moveSpeed: 3.4 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 169000, gold: [75500, 92100], gems: 81,
      bossSkills: ['ophio_gore', 'ophio_tail', 'ophio_flood', 'ophio_coils'],
    },
  },
};
