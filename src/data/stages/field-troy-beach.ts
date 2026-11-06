import type { StageDef, ZoneDef } from '../types';
import { melee, row } from './helpers';

/**
 * 特洛伊海灘（野外 Lv.15-21，需要 Lv.15；v1.62）
 * 馬拉松古戰場東邊出口進入。希臘聯軍圍城十年的海灘：沙灘上還留著船骸與營帳，城牆廢墟在北方。
 * 海神波賽頓曾派海怪襲擊特洛伊，被海克力斯擊退——如今牠又從海裡爬了上來。
 * 掉落 3～4 階（大多 4 階）。菁英首領：特洛伊海怪（水）。
 */
const zone: ZoneDef = {
  id: 'troy_beach',
  music: 'sea',
  kind: 'field',
  name: '特洛伊海灘',
  subtitle: '特洛伊海灘・Lv.15-21',
  region: '特洛阿斯',
  levelRange: [15, 21],
  minLevel: 15,
  lootTier: 4,
  lootTiers: [3, 4, 4],
  safe: false,
  size: { w: 66, d: 60 },
  groundColor: 0xe0d0a0,
  skyColor: 0x9ccbe8,
  fogColor: 0xc8e0ec,
  fogRange: [40, 90],
  patches: [
    { x: 0, z: 26, w: 66, d: 8, color: 0x3a8ac8, water: true }, // 愛琴海
    { x: 22, z: 16, w: 18, d: 10, color: 0x3a8ac8, water: true }, // 海灣（海怪出沒）
    { x: -10, z: 0, w: 36, d: 5, color: 0xc8b88a },
    { x: 10, z: -10, w: 5, d: 20, color: 0xc8b88a },
    { x: 0, z: -22, w: 40, d: 8, color: 0x9a9080 }, // 城牆廢墟前
    { x: 18, z: 6, w: 12, d: 8, color: 0xd8c898 },
  ],
  props: [
    ...row('column', -24, -27, 8, 0, 7),
    { kind: 'rock', x: -26, z: -20, w: 3, h: 3.2, d: 3, color: 0x9a9080 },
    { kind: 'rock', x: 26, z: -22, w: 3, h: 3.6, d: 3, color: 0x9a9080 },
    { kind: 'decor', x: -16, z: 12, h: 1.0, model: 'rubble', solid: false }, // 船骸
    { kind: 'decor', x: -6, z: 16, h: 1.2, model: 'tent' },
    { kind: 'decor', x: 4, z: 14, h: 1.2, model: 'tent' },
    { kind: 'decor', x: -2, z: 9, h: 1.0, model: 'barrel' },
    { kind: 'decor', x: 0, z: 10, h: 1.0, model: 'barrel' },
    { kind: 'decor', x: -12, z: -6, h: 1.0, model: 'weaponrack' },
    { kind: 'decor', x: -20, z: -12, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'palm', x: -24, z: 14 },
    { kind: 'palm', x: 28, z: 2 },
    { kind: 'palm', x: 8, z: -2 },
    { kind: 'amphora', x: 14, z: -16 },
    { kind: 'statue', x: 0, z: -18, rot: 0 },
    { kind: 'decor', x: 26, z: 6, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: -33, z: 0, radius: 2.4, to: 'marathon_field', arrive: { x: 29, z: -4 }, label: '馬拉松古戰場', style: 'edge' }],
  spawn: { x: -29, z: 0 },
  tips: ['特洛伊海灘需要 Lv.15，掉落 3～4 階裝備（大多 4 階）', '特洛伊亡兵成群出現，用範圍技能一次清掉', '東邊海灣的特洛伊海怪會掀起巨浪，看到預警就往岸上跑', '多多納聖林（Lv.11-25，4 階）在阿卡迪亞草原東邊'],
  spawns: [
    { enemy: 'troy_crab', x: -14, z: 8, count: 3, spread: 4 },
    { enemy: 'trojan_shade', x: -4, z: -8, count: 4, spread: 4 },
    { enemy: 'troy_serpent', x: 10, z: -14, count: 3, spread: 4 },
    { enemy: 'trojan_shade', x: -18, z: -16, count: 2, spread: 3 },
    { enemy: 'troy_cetus', x: 18, z: 8 },
  ],
};

export const troyBeach: StageDef = {
  zone,
  enemies: {
    troy_crab: {
      id: 'troy_crab', name: '特洛伊沙蟹', level: 16, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 12, scale: 1.15, color: 0xc8784a,
      stats: { maxHp: 1450, atk: 128, def: 40, moveSpeed: 3.0 },
      attack: melee(1.4, 0.5, 1.6),
      exp: 200, gold: [32, 48],
    },
    trojan_shade: {
      id: 'trojan_shade', name: '特洛伊亡兵', level: 18, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_minion',
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 1350, atk: 142, def: 36, moveSpeed: 3.0 },
      attack: melee(1.4, 0.5, 1.5),
      exp: 230, gold: [36, 54],
    },
    troy_serpent: {
      id: 'troy_serpent', name: '拉奧孔海蛇', level: 20, aggro: 'aggressive', shape: 'serpent',
      radius: 0.6, respawn: 12, scale: 1.15, color: 0x2a7a8a,
      stats: { maxHp: 1750, atk: 156, def: 42, moveSpeed: 3.6 },
      attack: melee(1.6, 0.45, 1.5),
      exp: 260, gold: [40, 60],
    },
    troy_cetus: {
      id: 'troy_cetus', name: '特洛伊海怪', level: 22, aggro: 'aggressive', shape: 'cetus', boss: true, element: 'water',
      radius: 0.9, respawn: 120, scale: 1.3, color: 0x3a6a8a,
      stats: { maxHp: 56000, atk: 218, def: 48, moveSpeed: 3.0 },
      attack: melee(2.6, 0.55, 1.7),
      exp: 3900, gold: [1300, 1800], gems: 10,
      bossSkills: ['cetus_wave', 'tide_rain', 'cetus_tail'],
    },
  },
};
