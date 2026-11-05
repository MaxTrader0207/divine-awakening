import type { PropDef, StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第十層・底比斯荒原（副本 Lv.46-50，防禦 175）
 * 底比斯城外的岩石荒原：斯芬克斯蹲在城門外的高岩上，答不出謎語的旅人都被吃掉。
 * 小怪：透墨索斯狐、伊斯墨諾斯龍蛇、安菲翁石衛。首領：斯芬克斯（獅爪重擊、展翼俯衝、謎語封印）。
 */
const SAND = 0xd8b880;
const RUIN = 0xc8b090;
const mesa = (x: number, z: number, w: number, d: number, h = 3): PropDef => ({ kind: 'wall', x, z, w, d, h, color: 0xb08a5a });

const zone: ZoneDef = {
  id: 'dungeon_10',
  kind: 'dungeon',
  music: 'wild',
  name: '底比斯荒原',
  subtitle: '第十層・斯芬克斯之謎',
  region: '底比斯荒原',
  levelRange: [46, 50],
  safe: false,
  size: { w: 52, d: 62 },
  groundColor: SAND,
  skyColor: 0xf0c890,
  fogColor: 0xe0b880,
  fogRange: [34, 82],
  patches: [
    { x: 0, z: 14, w: 6, d: 26, color: 0xc8a870 },
    { x: -12, z: 2, w: 14, d: 4, color: 0xc8a870 },
    { x: 15, z: 20, w: 6, d: 5, color: 0x4a8aa8, water: true }, // 狄耳刻泉
    { x: -16, z: -12, w: 6, d: 5, color: 0x4a8aa8, water: true },
  ],
  platforms: [{ x: 0, z: -21, w: 28, d: 16, h: 2, color: 0xa88a5a, stairs: { x: 0, width: 5 } }],
  props: [
    // 荒原上的平頂岩（留出通道）
    mesa(-12, 14, 7, 5), mesa(13, 9, 6, 6), mesa(-16, -3, 5, 6), mesa(8, -6, 8, 4), mesa(-5, 6, 4, 3, 2),
    // 底比斯城牆殘段（安菲翁用琴聲搬來的石頭）
    { kind: 'wall', x: -20, z: 24, w: 8, d: 1.5, h: 2.2, color: RUIN },
    { kind: 'wall', x: 20, z: 26, w: 8, d: 1.5, h: 2.2, color: RUIN },
    { kind: 'column', x: -5, z: 25, color: RUIN },
    { kind: 'column', x: 5, z: 25, color: RUIN },
    { kind: 'pillar', x: 20, z: -2, h: 1.5, color: RUIN },
    { kind: 'pillar', x: -21, z: 8, h: 2.2, color: RUIN },
    { kind: 'statue', x: -9, z: -10, rot: 0.6, color: 0xc8b090 },
    { kind: 'cypress', x: 19, z: 13 },
    { kind: 'cypress', x: -20, z: 18 },
    { kind: 'bush', x: 7, z: 19, color: 0x8a8a4a },
    { kind: 'bush', x: -8, z: 22, color: 0x8a8a4a },
    { kind: 'rock', x: 4, z: 13, color: 0x9a7a5a },
    { kind: 'rock', x: 17, z: -12, color: 0x9a7a5a },
    { kind: 'decor', x: -2, z: -6, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 12, z: 24, h: 1.0, model: 'rubble', solid: false },
    // 斯芬克斯的高岩
    { kind: 'stonering', x: 0, z: -22, w: 10, d: 10, color: 0xd8c098 },
    ...pillarRing(0, -22, 5.6, 8, 0xa88a5a),
    { kind: 'decor', x: -3.4, z: -12.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -12.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -12, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: ['這層敵人有防禦 175', '平頂岩會擋路，沿著小路繞', '謎語封印：符文之間有縫，站進縫裡', '透墨索斯狐跑得非常快，跑不掉就回頭打'],
  spawns: [
    { enemy: 'teumessian_fox', x: -4, z: 18, count: 3, spread: 3 },
    { enemy: 'ismenian_serpent', x: 7, z: 15, count: 2, spread: 3 },
    { enemy: 'amphion_guardian', x: 2, z: 4, count: 2, spread: 3 },
    { enemy: 'teumessian_fox', x: 15, z: -1, count: 3, spread: 3 },
    { enemy: 'ismenian_serpent', x: -10, z: -8, count: 3, spread: 3 },
    { enemy: 'amphion_guardian', x: 2, z: -11, count: 1 },
    { enemy: 'sphinx', x: 0, z: -22 },
  ],
  dungeon: { floor: 10, enemyDefense: 175, unlockAfter: 'dungeon_9' },
};

export const thebesWastes: StageDef = {
  zone,
  enemies: {
    teumessian_fox: {
      id: 'teumessian_fox', name: '透墨索斯狐', level: 46, aggro: 'aggressive', shape: 'hound',
      radius: 0.5, respawn: 12, scale: 0.95, color: 0xd8742a,
      stats: { maxHp: 5200, atk: 370, def: 175, moveSpeed: 5.2 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 1400, gold: [120, 172],
    },
    ismenian_serpent: {
      id: 'ismenian_serpent', name: '伊斯墨諾斯龍蛇', level: 47, aggro: 'aggressive', shape: 'serpent',
      radius: 0.65, respawn: 12, scale: 1.3, color: 0x9a2a2a,
      stats: { maxHp: 6000, atk: 385, def: 175, moveSpeed: 3.4 },
      attack: melee(1.7, 0.5, 1.6),
      exp: 1480, gold: [124, 178],
    },
    amphion_guardian: {
      id: 'amphion_guardian', name: '安菲翁石衛', level: 48, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 15, scale: 1.3, color: 0xc8a878,
      stats: { maxHp: 8000, atk: 395, def: 175, moveSpeed: 2.5 },
      attack: melee(1.9, 0.7, 2),
      exp: 1560, gold: [130, 188],
    },
    sphinx: {
      id: 'sphinx', name: '斯芬克斯', level: 50, aggro: 'aggressive', shape: 'sphinx', boss: true, element: 'wind',
      radius: 0.7, respawn: 90, scale: 2.1, color: 0xd8a85a,
      stats: { maxHp: 190000, atk: 465, def: 175, moveSpeed: 3.4 },
      attack: melee(2.8, 0.55, 1.6),
      exp: 28000, gold: [9400, 11400], gems: 30,
      bossSkills: ['sphinx_swipe', 'sphinx_dive', 'riddle_seal'],
    },
  },
};
