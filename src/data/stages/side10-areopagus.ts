import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線十・阿瑞斯之丘（Lv.101-105，擊敗第二十層首領後開放）
 * 雅典衛城旁的岩丘。傳說戰神阿瑞斯曾在這裡接受眾神審判，從此成了古雅典的法庭——戰神至今仍在丘頂等待挑戰者。
 * 小怪：戰神亡靈戰士、阿瑞斯野豬。守護者：戰神阿瑞斯（金）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_10',
  kind: 'field',
  music: 'wild',
  name: '阿瑞斯之丘',
  subtitle: '阿瑞斯之丘・支線・守護者',
  region: '雅典',
  levelRange: [101, 105],
  lootTier: 8,
  safe: false,
  size: { w: 54, d: 62 },
  groundColor: 0x8a6a4a,
  skyColor: 0xc87a5a,
  fogColor: 0xb88a6a,
  fogRange: [30, 80],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0xa88a6a },
    { x: 0, z: -11, w: 4, d: 12, color: 0xa88a6a },
    { x: 0, z: 1, w: 12, d: 9, color: 0x9a7a5a },
    { x: 0, z: -23, w: 14, d: 12, color: 0xb89a6a }, // 守護者祭壇

  ],
  props: [
    ...row('rock', -23, 27, 0, -6, 10, { color: 0x7a5a42 }),
    ...row('rock', 23, 26, 0, -6, 10, { color: 0x7a5a42 }),
    { kind: 'decor', x: -9, z: 14, h: 1.0, model: 'weaponrack' },
    { kind: 'decor', x: 9, z: 12, h: 1.0, model: 'weaponrack' },
    { kind: 'decor', x: -12, z: -4, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'decor', x: 12, z: -4, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'decor', x: -6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 14, z: 18, h: 1.2, model: 'tent' },
    { kind: 'statue', x: -9, z: -28, rot: 0 },
    { kind: 'statue', x: 9, z: -28, rot: 0 },
    { kind: 'decor', x: -10, z: 4, h: 1.0, model: 'rubble', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0xd8c098 },
    ...pillarRing(0, -23, 6.5, 8, 0xe8dcc0),
    { kind: 'crystal', x: -3, z: -28, color: 0xffd86a },
    { kind: 'crystal', x: 3, z: -28, color: 0xffd86a },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 30, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 25 },
  tips: [
    '阿瑞斯之丘：支線地圖，擊敗第二十層首領後開放',
    '戰神阿瑞斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '阿瑞斯是金屬性：金和毒互剋——對許德拉、涅索斯特別有效，也比較怕牠們',
    '萬槍齊發同時射好幾道，站在兩道之間；戰車衝鋒往側邊閃',
  ],
  spawns: [
    { enemy: 'ares_shade', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'ares_boar', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'ares_shade', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'ares_boar', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_ares', x: 0, z: -23 },
  ],
  side: { guardian: 'guardian_ares', unlockAfter: 'dungeon_20' },
};

export const areopagus: StageDef = {
  zone,
  enemies: {
    ares_shade: {
      id: 'ares_shade', name: '戰神亡靈戰士', level: 102, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.55, respawn: 12, scale: 1.15, color: 0x8a6a4a,
      stats: { maxHp: 15200, atk: 840, def: 380, moveSpeed: 3.4 },
      attack: melee(1.4, 0.45, 1.4),
      exp: 5900, gold: [410, 575],
    },
    ares_boar: {
      id: 'ares_boar', name: '阿瑞斯野豬', level: 104, aggro: 'aggressive', shape: 'boar',
      radius: 0.7, respawn: 12, scale: 1.1, color: 0x6a3a2a,
      stats: { maxHp: 17000, atk: 852, def: 380, moveSpeed: 3.8 },
      attack: melee(1.5, 0.5, 1.6),
      exp: 6000, gold: [425, 595],
    },
    guardian_ares: {
      id: 'guardian_ares', name: '戰神阿瑞斯', level: 105, aggro: 'aggressive', shape: 'ares', boss: true, element: 'metal',
      radius: 0.75, respawn: 90, scale: 1.55, color: 0xc8963a,
      stats: { maxHp: 370000, atk: 650, def: 360, moveSpeed: 3.3 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 75600, gold: [28700, 35000], gems: 59,
      bossSkills: ['ares_spear', 'ares_charge', 'ares_volley', 'ares_warcry'],
    },
  },
};
