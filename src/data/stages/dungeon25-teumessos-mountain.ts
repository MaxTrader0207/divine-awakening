import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第二十五層・透墨索斯山（副本 Lv.121-125，防禦 445）
 * 命中註定永遠不會被抓到的透墨索斯狐，和命中註定抓得到一切的獵犬萊拉普斯——兩個預言互相矛盾。
 * 宙斯只好把牠們一起變成石頭，放上星空。但山上的狐狸，好像從石頭裡跑出來了。
 * 小怪：透墨索斯小狐、底比斯岩像、透墨索斯半人馬射手、萊拉普斯幻影、透墨索斯野豬。首領：透墨索斯天狐（疾風奔襲、三尾風刃、旋風、天狐撲擊）。
 * 由 scratchpad 的 gen/gen_titans.py 產生（v1.97），之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'dungeon_25',
  kind: 'dungeon',
  music: 'wild',
  theme: 'mountain',
  name: '透墨索斯山',
  subtitle: '第二十五層・永遠追不到的狐狸',
  region: '透墨索斯山',
  levelRange: [121, 125],
  safe: false,
  size: { w: 54, d: 64 },
  groundColor: 0x6a7a4a,
  skyColor: 0x7a9ab8,
  fogColor: 0x9ab0c0,
  fogRange: [30, 76],
  patches: [
    { x: 0, z: 8, w: 5, d: 32, color: 0x8a7a5a }, // 山徑
    { x: -15, z: 16, w: 10, d: 8, color: 0x8a8a6a }, // 碎石坡
    { x: 15, z: -4, w: 9, d: 8, color: 0x8a8a6a },
    { x: 20, z: 20, w: 6, d: 6, color: 0x4a8ab8, water: true }, // 山泉
    { x: -20, z: -18, w: 6, d: 6, color: 0x4a8ab8, water: true },
  ],
  platforms: [{ x: 0, z: -22, w: 30, d: 16, h: 2, color: 0x6a6a5a, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'statue', x: -18, z: 25, rot: 0.6, color: 0xb8b0a0 }, // 化成石頭的狐狸
    { kind: 'statue', x: 18, z: 26, rot: -0.6, color: 0xb8b0a0 }, // 化成石頭的獵犬萊拉普斯
    { kind: 'cypress', x: -22, z: 10 },
    { kind: 'cypress', x: 22, z: 4 },
    { kind: 'cypress', x: -22, z: -6 },
    { kind: 'olive', x: 21, z: -14 },
    { kind: 'rock', x: -7, z: 22, color: 0x8a8478 },
    { kind: 'rock', x: 7, z: -12, color: 0x8a8478 },
    { kind: 'rock', x: -20, z: 0, color: 0x8a8478 },
    { kind: 'bush', x: 6, z: 20, color: 0x5a7a3a },
    { kind: 'bush', x: -6, z: 4, color: 0x5a7a3a },
    { kind: 'flowers', x: 14, z: 10, w: 3, d: 1 },
    { kind: 'decor', x: -3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -14, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 11, d: 11, color: 0xd8743a },
    ...pillarRing(0, -23, 6, 8, 0x9a948a),
    { kind: 'decor', x: -12, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: ['這層敵人有防禦 445', '山泉不能走，從旁邊繞過去', '天狐很快：疾風奔襲的直線很長', '三尾風刃之間有空隙，站在空隙裡'],
  spawns: [
    { enemy: 'teumessian_kit', x: -10, z: 20, count: 3, spread: 3 },
    { enemy: 'theban_boulder', x: 10, z: 17, count: 1 },
    { enemy: 'teumessos_archer', x: 0, z: 12, count: 2, spread: 2.5 },
    { enemy: 'laelaps_phantom', x: 12, z: -6, count: 2, spread: 3 },
    { enemy: 'teumessos_boar', x: -12, z: -4, count: 1 },
    { enemy: 'teumessian_kit', x: 9, z: 1, count: 3, spread: 3 },
    { enemy: 'teumessos_archer', x: -6, z: -8, count: 2, spread: 2.5 },
    { enemy: 'theban_boulder', x: -12, z: 10, count: 1 },
    { enemy: 'laelaps_phantom', x: 0, z: -2, count: 2, spread: 2.5 },
    { enemy: 'teumessos_skyfox', x: 0, z: -23 },
  ],
  dungeon: { floor: 25, enemyDefense: 445, unlockAfter: 'dungeon_24' },
};

export const teumessosMountain: StageDef = {
  zone,
  enemies: {
    teumessian_kit: {
      id: 'teumessian_kit', name: '透墨索斯小狐', level: 121, aggro: 'aggressive', shape: 'hound',
      radius: 0.5, respawn: 12, scale: 0.95, color: 0xd87a3a,
      stats: { maxHp: 12300, atk: 983, def: 445, moveSpeed: 4.4 },
      attack: melee(1.3, 0.4, 1.2),
      exp: 8090, gold: [587, 822],
    },
    theban_boulder: {
      id: 'theban_boulder', name: '底比斯岩像', level: 122, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.25, color: 0x8a8a7a,
      stats: { maxHp: 32700, atk: 983, def: 445, moveSpeed: 2.4 },
      attack: melee(2.0, 0.6, 1.8),
      exp: 8220, gold: [610, 854],
    },
    teumessos_archer: {
      id: 'teumessos_archer', name: '透墨索斯半人馬射手', level: 123, aggro: 'aggressive', shape: 'centaur', ranged: true,
      radius: 0.6, respawn: 12, scale: 0.95, color: 0x8a6a4a,
      stats: { maxHp: 17400, atk: 1032, def: 445, moveSpeed: 2.8 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 8340, gold: [634, 888],
    },
    laelaps_phantom: {
      id: 'laelaps_phantom', name: '萊拉普斯幻影', level: 124, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.2, color: 0xe8d8a0,
      stats: { maxHp: 17400, atk: 983, def: 445, moveSpeed: 5.0 },
      attack: melee(1.4, 0.4, 1.25),
      exp: 8460, gold: [657, 920],
    },
    teumessos_boar: {
      id: 'teumessos_boar', name: '透墨索斯野豬', level: 125, aggro: 'aggressive', shape: 'boar',
      radius: 0.65, respawn: 12, scale: 1.15, color: 0x6a4a3a,
      stats: { maxHp: 24500, atk: 1180, def: 445, moveSpeed: 3.0 },
      attack: melee(1.9, 0.8, 2.2),
      exp: 8580, gold: [681, 953],
    },
    teumessos_skyfox: {
      id: 'teumessos_skyfox', name: '透墨索斯天狐', level: 125, aggro: 'aggressive', shape: 'vulpes', boss: true, element: 'wind',
      radius: 0.9, respawn: 90, scale: 2.1, color: 0xd8743a,
      stats: { maxHp: 623000, atk: 1090, def: 445, moveSpeed: 4.4 },
      attack: melee(2.6, 0.5, 1.4),
      exp: 147000, gold: [60200, 73400], gems: 75,
      bossSkills: ['fox_dash', 'fox_tails', 'fox_whirl', 'fox_pounce'],
    },
  },
};
