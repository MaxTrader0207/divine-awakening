import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 支線一・赫利孔山靈泉（Lv.10-13，擊敗第二層首領後開放）
 * 繆斯女神的聖山。傳說天馬珀伽索斯一蹄踏在岩石上，湧出了靈感之泉希波克里尼。
 * 小怪：赫利孔風妖、聖山野羚。守護者：天馬珀伽索斯（雷）——打倒後有機會收服成夥伴。
 */
const CLEAR = [
  { x: 0, z: 24, r: 6 }, // 入口
  { x: 0, z: 2, r: 8 }, // 靈泉
  { x: -14, z: 10, r: 5 },
  { x: 14, z: 8, r: 5 },
  { x: -12, z: -10, r: 5 },
  { x: 12, z: -12, r: 5 },
  { x: 0, z: -22, r: 9 }, // 守護者祭壇
  { x: 0, z: 14, r: 3 },
  { x: 0, z: -12, r: 3 },
];

const zone: ZoneDef = {
  id: 'side_1',
  kind: 'field',
  music: 'forest',
  name: '赫利孔山靈泉',
  subtitle: '赫利孔山靈泉・支線・守護者',
  region: '赫利孔山',
  levelRange: [10, 13],
  lootTier: 3,
  safe: false,
  size: { w: 50, d: 58 },
  groundColor: 0x7aa86a,
  skyColor: 0x9fc8e8,
  fogColor: 0xcfe2ee,
  fogRange: [40, 90],
  patches: [
    { x: 0, z: 2, w: 9, d: 7, color: 0x4fa8d8, water: true }, // 靈感之泉
    { x: 0, z: 16, w: 4, d: 14, color: 0xb8a888 },
    { x: 0, z: -13, w: 4, d: 12, color: 0xb8a888 },
    { x: -11, z: 2, w: 10, d: 3, color: 0xb8a888 },
    { x: 11, z: 2, w: 10, d: 3, color: 0xb8a888 },
  ],
  props: [
    ...scatterTrees(20261106, 30, 50, 58, CLEAR),
    { kind: 'stonering', x: 0, z: -22, w: 11, d: 11, color: 0xe8e4d8 },
    ...pillarRing(0, -22, 6, 8, 0xf0ece0),
    { kind: 'column', x: -6, z: 7 },
    { kind: 'column', x: 6, z: 7 },
    { kind: 'column', x: -6, z: -3 },
    { kind: 'column', x: 6, z: -3 },
    { kind: 'statue', x: -16, z: -2, rot: 0 },
    { kind: 'statue', x: 16, z: -4, rot: 0 },
    { kind: 'flowers', x: -4, z: 10, w: 3, d: 1.4 },
    { kind: 'flowers', x: 4, z: 11, w: 3, d: 1.4 },
    { kind: 'flowers', x: -8, z: -14, w: 3, d: 1.4 },
    { kind: 'flowers', x: 9, z: 16, w: 3, d: 1.4 },
    { kind: 'rock', x: -18, z: 18, color: 0x9a9a8a },
    { kind: 'rock', x: 18, z: -16, color: 0x9a9a8a },
    { kind: 'crystal', x: -3, z: -24, color: 0xffe27a },
    { kind: 'crystal', x: 3, z: -24, color: 0xffe27a },
    { kind: 'amphora', x: 4, z: 0 },
    { kind: 'decor', x: 10, z: -24, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 28, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: [
    '赫利孔山靈泉：支線地圖，擊敗第二層首領後開放',
    '天馬珀伽索斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '珀伽索斯是雷屬性：雷剋水、被土剋',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [
    { enemy: 'helicon_harpy', x: -14, z: 10, count: 3, spread: 4 },
    { enemy: 'helicon_ibex', x: 14, z: 8, count: 3, spread: 4 },
    { enemy: 'helicon_harpy', x: 12, z: -12, count: 2, spread: 3 },
    { enemy: 'helicon_ibex', x: -12, z: -10, count: 2, spread: 3 },
    { enemy: 'guardian_pegasus', x: 0, z: -22 },
  ],
  side: { guardian: 'guardian_pegasus', unlockAfter: 'dungeon_2' },
};

export const heliconSpring: StageDef = {
  zone,
  enemies: {
    helicon_harpy: {
      id: 'helicon_harpy', name: '赫利孔風妖', level: 11, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1, color: 0xc8d8f0,
      stats: { maxHp: 820, atk: 96, def: 24, moveSpeed: 3.8 },
      attack: melee(1.2, 0.4, 1.4),
      exp: 120, gold: [18, 28],
    },
    helicon_ibex: {
      id: 'helicon_ibex', name: '聖山野羚', level: 12, aggro: 'aggressive', shape: 'hind',
      radius: 0.6, respawn: 12, scale: 0.85, color: 0xb89a6a,
      stats: { maxHp: 1050, atk: 104, def: 24, moveSpeed: 3.4 },
      attack: melee(1.4, 0.5, 1.6),
      exp: 140, gold: [20, 30],
    },
    guardian_pegasus: {
      id: 'guardian_pegasus', name: '天馬珀伽索斯', level: 13, aggro: 'aggressive', shape: 'pegasus', boss: true, element: 'thunder',
      radius: 0.75, respawn: 90, scale: 1.9, color: 0xf6f8ff,
      stats: { maxHp: 36000, atk: 140, def: 24, moveSpeed: 3.4 },
      attack: melee(2.4, 0.55, 1.7),
      exp: 1800, gold: [700, 900], gems: 10,
      bossSkills: ['pegasus_thunder', 'pegasus_gallop', 'pegasus_storm', 'pegasus_dive'],
    },
  },
};
