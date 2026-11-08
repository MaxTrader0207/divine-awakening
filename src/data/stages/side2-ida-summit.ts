import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線二・伊達山之巔（Lv.21-25，擊敗第四層首領後開放）
 * 宙斯誕生與藏身的聖山，神鷹埃托斯在峰頂為眾神之王守望（也是牠把伽倪墨得斯帶上奧林帕斯）。
 * 小怪：伊達山風妖、伊達山野豬。守護者：宙斯神鷹埃托斯（風）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_2',
  kind: 'field',
  music: 'wild',
  name: '伊達山之巔',
  subtitle: '伊達山之巔・支線・守護者',
  region: '伊達山',
  levelRange: [21, 25],
  lootTier: 4,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0x8a9478,
  theme: 'mountain', // v1.93
  skyColor: 0xa8d0f0,
  fogColor: 0xe0ecf4,
  fogRange: [36, 85],
  patches: [
    { x: 0, z: 15, w: 4, d: 18, color: 0xa8a090 },
    { x: 0, z: -12, w: 4, d: 12, color: 0xa8a090 },
    { x: 0, z: 2, w: 12, d: 9, color: 0xb4ae9c }, // 半山平台
    { x: 0, z: -23, w: 14, d: 12, color: 0xc8c4b8 }, // 峰頂
    { x: -14, z: 6, w: 9, d: 7, color: 0x7a8a68 },
    { x: 14, z: -6, w: 9, d: 7, color: 0x7a8a68 },
  ],
  props: [
    // 山壁：兩側的岩石
    ...row('rock', -23, 26, 0, -6, 9, { color: 0x8a8678 }),
    ...row('rock', 23, 25, 0, -6, 9, { color: 0x8a8678 }),
    { kind: 'rock', x: -9, z: 18, color: 0x8a8678 },
    { kind: 'rock', x: 10, z: 16, color: 0x8a8678 },
    { kind: 'rock', x: -17, z: -14, color: 0x8a8678 },
    { kind: 'rock', x: 18, z: 10, color: 0x8a8678 },
    { kind: 'cypress', x: -7, z: 23 },
    { kind: 'cypress', x: 7, z: 23 },
    { kind: 'cypress', x: -18, z: 16 },
    { kind: 'cypress', x: 17, z: 18 },
    { kind: 'olive', x: -15, z: -4 },
    { kind: 'olive', x: 15, z: 2 },
    // 宙斯的峰頂祭壇
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xe0dcd0 },
    ...pillarRing(0, -23, 6.5, 6, 0xf0ece0),
    { kind: 'statue', x: -8, z: -28, rot: 0 },
    { kind: 'statue', x: 8, z: -28, rot: 0 },
    { kind: 'crystal', x: -4, z: -27, color: 0x9ff0c8 },
    { kind: 'crystal', x: 4, z: -27, color: 0x9ff0c8 },
    { kind: 'column', x: -5, z: 4 },
    { kind: 'column', x: 5, z: 4 },
    { kind: 'amphora', x: -3, z: 0 },
    { kind: 'decor', x: 9, z: -27, h: 1.3, model: 'chest_gold' },
    { kind: 'decor', x: -10, z: 2, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '伊達山之巔：支線地圖，擊敗第四層首領後開放',
    '宙斯神鷹埃托斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '埃托斯是風屬性：風剋土（米諾陶洛斯、梅杜莎都是土屬性）、被冰剋',
    '羽刃齊射會同時射三個方向，站在兩道之間就安全',
  ],
  spawns: [
    { enemy: 'ida_harpy', x: -14, z: 6, count: 3, spread: 4 },
    { enemy: 'ida_boar', x: 14, z: -6, count: 3, spread: 4 },
    { enemy: 'ida_harpy', x: 12, z: 14, count: 2, spread: 3 },
    { enemy: 'ida_boar', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_aetos', x: 0, z: -23 },
    { enemy: 'ida_wolf', x: 14, z: -6, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'summit_statue', x: -12, z: -12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'crag_bat', x: 14, z: -6, count: 3, spread: 3.5 }, // v1.63
  ],
  side: { guardian: 'guardian_aetos', unlockAfter: 'dungeon_4' },
};

export const idaSummit: StageDef = {
  zone,
  enemies: {
    ida_harpy: {
      id: 'ida_harpy', name: '伊達山風妖', level: 22, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x9ad8b8,
      stats: { maxHp: 2300, atk: 168, def: 60, moveSpeed: 4.2 },
      attack: melee(1.2, 0.4, 1.3),
      exp: 400, gold: [48, 72],
    },
    ida_boar: {
      id: 'ida_boar', name: '伊達山野豬', level: 24, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1, color: 0x7a6248,
      stats: { maxHp: 2800, atk: 178, def: 60, moveSpeed: 3.8 },
      attack: melee(1.5, 0.5, 1.6),
      exp: 460, gold: [54, 80],
    },
    guardian_aetos: {
      id: 'guardian_aetos', name: '宙斯神鷹埃托斯', level: 25, aggro: 'aggressive', shape: 'aetos', boss: true, element: 'wind',
      radius: 0.8, respawn: 90, scale: 1.6, color: 0xa8763a,
      stats: { maxHp: 65000, atk: 200, def: 60, moveSpeed: 3.8 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 5300, gold: [1800, 2400], gems: 13,
      bossSkills: ['aetos_gale', 'aetos_feathers', 'aetos_dive', 'aetos_cyclone'],
    },
    ida_wolf: {
      id: 'ida_wolf', name: '伊達山狼', level: 23, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x8a8a7a,
      stats: { maxHp: 2000, atk: 183, def: 54, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 460, gold: [57, 82],
    },
    summit_statue: {
      id: 'summit_statue', name: '山巔石像', level: 25, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.41, color: 0xc8c4b8,
      stats: { maxHp: 4150, atk: 186, def: 75, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 680, gold: [85, 122],
    },
    crag_bat: {
      id: 'crag_bat', name: '岩洞蝙蝠', level: 22, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x5a5a5a,
      stats: { maxHp: 1300, atk: 148, def: 48, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 250, gold: [32, 46],
    },
  },
};
