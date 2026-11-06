import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 德爾斐山徑（野外 Lv.9-14，需要 Lv.8；v1.62）
 * 阿卡迪亞草原西側出口進入。帕納索斯山腰上通往阿波羅神諭所的石階山路。
 * 傳說阿波羅在這裡射殺了大地之子——巨蟒皮同，牠的子嗣至今仍盤踞山徑。
 * 掉落 3～4 階（大多 3 階）。菁英首領：巨蟒皮同（土）。北邊出口通往馬拉松古戰場。
 */
const CLEAR = [
  { x: 24, z: 20, r: 6 }, // 入口（東）
  { x: 8, z: 14, r: 6 },
  { x: -12, z: 12, r: 6 },
  { x: -14, z: -6, r: 6 },
  { x: 6, z: -4, r: 6 }, // 神諭所
  { x: 14, z: -20, r: 8 }, // 皮同的岩穴
  { x: 0, z: -26, r: 5 }, // 北出口
];

const zone: ZoneDef = {
  id: 'delphi_path',
  music: 'wild',
  kind: 'field',
  name: '德爾斐山徑',
  subtitle: '德爾斐山徑・Lv.9-14',
  region: '赫拉斯大陸',
  levelRange: [9, 14],
  minLevel: 8,
  lootTier: 3,
  lootTiers: [3, 3, 4],
  safe: false,
  size: { w: 60, d: 62 },
  groundColor: 0x8a9a62,
  skyColor: 0xb8d6ee,
  fogColor: 0xd8e4ea,
  fogRange: [40, 88],
  patches: [
    { x: 16, z: 18, w: 18, d: 4, color: 0xc4b48a }, // 山路
    { x: -2, z: 13, w: 22, d: 4, color: 0xc4b48a },
    { x: -12, z: 3, w: 4, d: 20, color: 0xc4b48a },
    { x: -3, z: -6, w: 22, d: 4, color: 0xc4b48a },
    { x: 6, z: -4, w: 10, d: 9, color: 0xd8d0b8 }, // 神諭所石台
    { x: 4, z: -16, w: 4, d: 20, color: 0xc4b48a },
    { x: 14, z: -20, w: 12, d: 10, color: 0x7a6a50 }, // 皮同的岩穴
    { x: -20, z: 22, w: 8, d: 6, color: 0x5a9ac8, water: true }, // 卡斯塔利亞聖泉
  ],
  props: [
    ...scatterTrees(20261201, 40, 60, 62, CLEAR.concat([{ x: 16, z: 18, r: 3 }, { x: -2, z: 13, r: 3 }, { x: -12, z: 3, r: 3 }, { x: 4, z: -16, r: 3 }])),
    { kind: 'temple', x: 6, z: -8, w: 8, d: 4, h: 4.5 },
    { kind: 'column', x: 2, z: -1 },
    { kind: 'column', x: 10, z: -1 },
    { kind: 'statue', x: 6, z: 1, rot: 0 },
    { kind: 'crystal', x: 6, z: -3, color: 0xffe9a0 }, // 世界的肚臍 Omphalos
    { kind: 'stonering', x: 14, z: -20, w: 10, d: 10, color: 0x6a5a48 },
    ...pillarRing(14, -20, 5.5, 6, 0x8a7a60),
    { kind: 'rock', x: -22, z: -14, color: 0x8a8678 },
    { kind: 'rock', x: 22, z: 4, color: 0x8a8678 },
    { kind: 'rock', x: -4, z: 22, color: 0x8a8678 },
    { kind: 'amphora', x: -18, z: 18 },
    { kind: 'decor', x: 20, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [
    { x: 28, z: 20, radius: 2.4, to: 'grassland', arrive: { x: -29, z: 4 }, label: '阿卡迪亞草原', style: 'edge' },
    { x: 0, z: -29, radius: 2.4, to: 'marathon_field', arrive: { x: 0, z: 25 }, label: '馬拉松古戰場 Lv.12', style: 'edge' },
  ],
  spawn: { x: 24, z: 20 },
  tips: ['德爾斐山徑需要 Lv.8，掉落 3～4 階裝備（大多 3 階）', '皮同幼蛇會噴毒，別站在牠正前方', '東南岩穴的巨蟒皮同是菁英首領，打倒必掉精良以上裝備', '北邊出口通往馬拉松古戰場'],
  spawns: [
    { enemy: 'python_brood', x: 8, z: 14, count: 3, spread: 4 },
    { enemy: 'parnassus_boar', x: -12, z: 12, count: 3, spread: 4 },
    { enemy: 'delphi_harpy', x: -14, z: -6, count: 3, spread: 4 },
    { enemy: 'python_brood', x: 4, z: -14, count: 2, spread: 3 },
    { enemy: 'great_python', x: 14, z: -20 },
    { enemy: 'parnassus_statue', x: -12, z: 12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'oracle_bat', x: 4, z: -14, count: 3, spread: 3.5 }, // v1.63
  ],
};

export const delphiPath: StageDef = {
  zone,
  enemies: {
    python_brood: {
      id: 'python_brood', name: '皮同幼蛇', level: 10, aggro: 'aggressive', shape: 'serpent',
      radius: 0.55, respawn: 12, scale: 0.95, color: 0x7a8a3a,
      stats: { maxHp: 720, atk: 84, def: 24, moveSpeed: 3.2 },
      attack: melee(1.4, 0.45, 1.5),
      exp: 90, gold: [18, 28],
    },
    parnassus_boar: {
      id: 'parnassus_boar', name: '帕納索斯野豬', level: 12, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 0.9, color: 0x6a5240,
      stats: { maxHp: 900, atk: 96, def: 28, moveSpeed: 3.6 },
      attack: melee(1.5, 0.5, 1.6),
      exp: 110, gold: [22, 34],
    },
    delphi_harpy: {
      id: 'delphi_harpy', name: '德爾斐鳥妖', level: 13, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1, color: 0xc8b48a,
      stats: { maxHp: 820, atk: 104, def: 26, moveSpeed: 4.4 },
      attack: melee(1.2, 0.4, 1.3),
      exp: 120, gold: [24, 36],
    },
    great_python: {
      id: 'great_python', name: '巨蟒皮同', level: 15, aggro: 'aggressive', shape: 'serpent', boss: true, element: 'earth',
      radius: 0.8, respawn: 120, scale: 2.3, color: 0x5a6a2a,
      stats: { maxHp: 42000, atk: 170, def: 34, moveSpeed: 3.0 },
      attack: melee(2.4, 0.55, 1.7),
      exp: 2600, gold: [900, 1200], gems: 8,
      bossSkills: ['venom_spit', 'charge', 'ground_slam'],
    },
    parnassus_statue: {
      id: 'parnassus_statue', name: '帕納索斯石像', level: 13, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 12, scale: 1.41, color: 0xd8d0b8,
      stats: { maxHp: 1520, atk: 94, def: 32, moveSpeed: 2.3 },
      attack: melee(1.6, 0.6, 1.9),
      exp: 200, gold: [37, 53],
    },
    oracle_bat: {
      id: 'oracle_bat', name: '神諭洞蝠', level: 10, aggro: 'aggressive', shape: 'bat',
      radius: 0.5, respawn: 12, scale: 0.96, color: 0x5a4a6a,
      stats: { maxHp: 460, atk: 76, def: 21, moveSpeed: 4.4 },
      attack: melee(1.2, 0.35, 1.1),
      exp: 60, gold: [13, 19],
    },
  },
};
