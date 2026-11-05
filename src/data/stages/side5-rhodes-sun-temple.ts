import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線五・羅德島日神殿（Lv.51-55，擊敗第十層首領後開放）
 * 太陽神赫利俄斯的島，港口曾立著青銅巨像。傳說不死鳥每五百年會飛到日神殿，在乳香柴堆上焚身重生。
 * 小怪：青銅巨像衛兵、日炎鳥妖。守護者：不死鳥菲尼克斯（火）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_5',
  kind: 'field',
  music: 'sea',
  name: '羅德島日神殿',
  subtitle: '羅德島日神殿・支線・守護者',
  region: '羅德島',
  levelRange: [51, 55],
  lootTier: 6,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0xd8c8a0,
  skyColor: 0xf0c890,
  fogColor: 0xf4dcb0,
  fogRange: [36, 85],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0xe8dcc0 },
    { x: 0, z: -11, w: 4, d: 12, color: 0xe8dcc0 },
    { x: 0, z: 1, w: 12, d: 9, color: 0xf0e4c8 },
    { x: 0, z: -23, w: 14, d: 12, color: 0xf4d890 }, // 守護者祭壇
    { x: -21, z: 0, w: 8, d: 58, color: 0x3a8ac8, water: true },
  ],
  props: [
    ...row('column', -6, 20, 0, -6, 5),
    ...row('column', 6, 20, 0, -6, 5),
    ...row('palm', -15, 22, 0, -9, 5),
    ...row('palm', 15, 20, 0, -9, 5),
    { kind: 'statue', x: -10, z: 4, rot: 0 },
    { kind: 'statue', x: 10, z: 4, rot: 0 },
    { kind: 'amphora', x: -3, z: -14 },
    { kind: 'amphora', x: 3, z: 14 },
    { kind: 'decor', x: -6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xf8e8b0 },
    ...pillarRing(0, -23, 6.5, 8, 0xf8f0e0),
    { kind: 'crystal', x: -3, z: -28, color: 0xff9a3a },
    { kind: 'crystal', x: 3, z: -28, color: 0xff9a3a },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '羅德島日神殿：支線地圖，擊敗第十層首領後開放',
    '不死鳥菲尼克斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '菲尼克斯是火屬性：火剋冰（獅鷲、刻托斯）、被水剋',
    '浴火重生前全身會變亮，看到就往外跑',
  ],
  spawns: [
    { enemy: 'rhodes_colossus', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'sun_harpy', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'rhodes_colossus', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'sun_harpy', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_phoenix', x: 0, z: -23 },
  ],
  side: { guardian: 'guardian_phoenix', unlockAfter: 'dungeon_10' },
};

export const rhodesSunTemple: StageDef = {
  zone,
  enemies: {
    rhodes_colossus: {
      id: 'rhodes_colossus', name: '青銅巨像衛兵', level: 53, aggro: 'aggressive', shape: 'golem',
      radius: 0.8, respawn: 12, scale: 1.15, color: 0xc8963a,
      stats: { maxHp: 10800, atk: 440, def: 180, moveSpeed: 2.4 },
      attack: melee(1.6, 0.6, 1.8),
      exp: 1950, gold: [158, 224],
    },
    sun_harpy: {
      id: 'sun_harpy', name: '日炎鳥妖', level: 52, aggro: 'aggressive', shape: 'harpy',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xff9a4a,
      stats: { maxHp: 5900, atk: 432, def: 180, moveSpeed: 4.8 },
      attack: melee(1.2, 0.4, 1.3),
      exp: 1820, gold: [148, 210],
    },
    guardian_phoenix: {
      id: 'guardian_phoenix', name: '不死鳥菲尼克斯', level: 55, aggro: 'aggressive', shape: 'phoenix', boss: true, element: 'fire',
      radius: 0.8, respawn: 90, scale: 1.6, color: 0xe8402a,
      stats: { maxHp: 168000, atk: 384, def: 180, moveSpeed: 3.8 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 23800, gold: [8500, 10400], gems: 29,
      bossSkills: ['phoenix_flame', 'phoenix_rain', 'phoenix_dive', 'phoenix_rebirth'],
    },
  },
};
