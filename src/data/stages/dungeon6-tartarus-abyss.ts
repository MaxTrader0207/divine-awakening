import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 第六層・塔爾塔洛斯深淵（副本 Lv.26-30，防禦 95）
 * 冥界最深處：紫黑色的地面、冥河斯堤克斯橫越地圖（中間只有一座窄橋）、冥火坑。
 * 小怪：冥界獵犬、刻爾死靈、百臂巨人獄卒。首領：刻耳柏洛斯（三頭冥火、冥犬撲擊、冥火落雨）。
 */
const STYX = 0x4a2a7a;
const FIRE = 0xff5a1a;

const zone: ZoneDef = {
  id: 'dungeon_6',
  kind: 'dungeon',
  music: 'inferno',
  name: '塔爾塔洛斯深淵',
  subtitle: '第六層・冥界之門',
  region: '塔爾塔洛斯深淵',
  levelRange: [26, 30],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0x3a2e3e,
  skyColor: 0x1e1220,
  fogColor: 0x3a2034,
  fogRange: [30, 74],
  patches: [
    // 冥河：中間留 6 公尺寬的橋
    { x: -14, z: 4, w: 22, d: 5, color: STYX, water: true },
    { x: 14, z: 4, w: 22, d: 5, color: STYX, water: true },
    { x: 0, z: 4, w: 6, d: 5, color: 0x5a4a52 },
    // 冥火坑
    { x: -15, z: 18, w: 5, d: 5, color: FIRE, water: true },
    { x: 16, z: 15, w: 5, d: 4, color: FIRE, water: true },
    { x: -16, z: -8, w: 5, d: 5, color: FIRE, water: true },
    { x: 15, z: -6, w: 6, d: 4, color: FIRE, water: true },
    // 小路
    { x: 0, z: 14, w: 5, d: 16, color: 0x2e2632 },
    { x: 0, z: -6, w: 5, d: 12, color: 0x2e2632 },
  ],
  platforms: [{ x: 0, z: -20, w: 26, d: 16, h: 1.6, color: 0x3a2a3a, stairs: { x: 0, width: 5 } }],
  props: [
    // 橋頭的石柱
    { kind: 'column', x: -4, z: 8, color: 0x6a5a6a },
    { kind: 'column', x: 4, z: 8, color: 0x6a5a6a },
    { kind: 'column', x: -4, z: 0, color: 0x6a5a6a },
    { kind: 'column', x: 4, z: 0, color: 0x6a5a6a },
    { kind: 'crystal', x: -20, z: 12, color: 0xb48cff },
    { kind: 'crystal', x: 21, z: 22, color: 0xff8a3c },
    { kind: 'crystal', x: -9, z: -12, color: 0xb48cff },
    { kind: 'crystal', x: 20, z: -14, color: 0xff8a3c },
    { kind: 'crystal', x: -21, z: -24, color: 0xb48cff },
    { kind: 'rock', x: 9, z: 21, color: 0x2a2228 },
    { kind: 'rock', x: -8, z: 13, color: 0x2a2228 },
    { kind: 'rock', x: 9, z: -9, color: 0x2a2228 },
    { kind: 'pillar', x: -21, z: 23, h: 1.6, color: 0x4a3a4a },
    { kind: 'pillar', x: 21, z: 2, h: 2.4, color: 0x4a3a4a },
    { kind: 'stonering', x: 0, z: -21, w: 10, d: 10, color: 0x7a4a8a },
    ...pillarRing(0, -21, 5.6, 8, 0x4a3a4a),
    { kind: 'decor', x: -3.4, z: -11.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -11.6, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -6, z: 25, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 12, z: -26, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 95', '冥河只有中間一座橋能過，小心在橋上被包圍', '三頭冥火會往三個方向噴，站到火線之間', '冥火坑不能踩'],
  spawns: [
    { enemy: 'hellhound', x: -6, z: 16, count: 3, spread: 3 },
    { enemy: 'keres', x: 8, z: 12, count: 2, spread: 3 },
    { enemy: 'tartarus_warden', x: 0, z: -4, count: 1 },
    { enemy: 'hellhound', x: -12, z: -2, count: 2, spread: 3 },
    { enemy: 'keres', x: 12, z: -2, count: 2, spread: 3 },
    { enemy: 'tartarus_warden', x: -8, z: -10, count: 1 },
    { enemy: 'cerberus', x: 0, z: -21 },
    { enemy: 'styx_ferryman', x: 8, z: 12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'erinys_handmaid', x: -12, z: -2, count: 2, spread: 3.5 }, // v1.63
  ],
  dungeon: { floor: 6, enemyDefense: 95, unlockAfter: 'dungeon_5' },
};

export const tartarusAbyss: StageDef = {
  zone,
  enemies: {
    hellhound: {
      id: 'hellhound', name: '冥界獵犬', level: 26, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x2e262a,
      stats: { maxHp: 2900, atk: 215, def: 95, moveSpeed: 4.6 },
      attack: melee(1.4, 0.4, 1.3),
      exp: 560, gold: [62, 92],
    },
    keres: {
      id: 'keres', name: '刻爾死靈', level: 27, aggro: 'aggressive', shape: 'bat', model: 'bat',
      radius: 0.5, respawn: 12, scale: 1.2, color: 0x7a1a2a,
      stats: { maxHp: 2500, atk: 230, def: 95, moveSpeed: 4.8 },
      attack: melee(1.2, 0.35, 1.2),
      exp: 580, gold: [64, 96],
    },
    tartarus_warden: {
      id: 'tartarus_warden', name: '百臂巨人獄卒', level: 28, aggro: 'aggressive', shape: 'golem',
      radius: 0.7, respawn: 15, scale: 1.35, color: 0x4a4a5a,
      stats: { maxHp: 4200, atk: 240, def: 95, moveSpeed: 2.4 },
      attack: melee(1.9, 0.7, 2),
      exp: 650, gold: [70, 104],
    },
    cerberus: {
      id: 'cerberus', name: '刻耳柏洛斯', level: 30, aggro: 'aggressive', shape: 'hound', boss: true, element: 'dark',
      radius: 0.55, respawn: 90, scale: 2.6, color: 0x2a2226,
      stats: { maxHp: 105000, atk: 310, def: 95, moveSpeed: 3.4 },
      attack: melee(2.6, 0.5, 1.6),
      exp: 10500, gold: [3600, 4600], gems: 20,
      bossSkills: ['hellfire_breath', 'cerberus_pounce', 'underworld_flames'],
    },
    styx_ferryman: {
      id: 'styx_ferryman', name: '冥河擺渡亡魂', level: 27, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_rogue',
      radius: 0.55, respawn: 12, scale: 1.05, color: 0xc8c8d8,
      stats: { maxHp: 2450, atk: 226, def: 95, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 580, gold: [67, 96],
    },
    erinys_handmaid: {
      id: 'erinys_handmaid', name: '復仇女神侍從', level: 29, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x6a3a5a,
      stats: { maxHp: 2600, atk: 250, def: 95, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 730, gold: [78, 112],
    },
  },
};
