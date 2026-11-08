import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 5・墨西拿漩渦（Lv.58，擊敗第 11 層首領後開放）
 * 一天三次吞下整片海水、再吐出來的漩渦海怪，和斯庫拉隔著海峽對望。奧德修斯寧可經過斯庫拉也不敢靠近她。
 * 只有魔王：漩渦海怪卡律布狄斯（吞海漩渦、海水噴發、漩渦水刃、觸鬚拍擊）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_5',
  kind: 'field',
  music: 'sea',
  bossMusic: 'hunt',
  name: '墨西拿漩渦',
  subtitle: '墨西拿漩渦・神獸討伐',
  region: '墨西拿海峽',
  levelRange: [56, 58],
  lootTier: 6,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x5a7a8a,
  skyColor: 0x3a5a7a,
  fogColor: 0x5a8aa8,
  fogRange: [34, 80],
  patches: [
    // v1.96：兩側是海，中間是礁岩平台
    { x: -19, z: 0, w: 8, d: 56, color: 0x2a6a9a, water: true },
    { x: 19, z: 0, w: 8, d: 56, color: 0x2a6a9a, water: true },
    { x: 0, z: 8, w: 8, d: 30, color: 0xb8a878 },{ x: -17, z: -16, w: 6, d: 8, color: 0x2a6aa8, water: true }, { x: 17, z: -16, w: 6, d: 8, color: 0x2a6aa8, water: true }],
  props: [
    // v1.96：礁岩、船骸（木箱、木桶、斷柱）
    { kind: 'rock', x: -12, z: 10, w: 2.6, d: 2.6, h: 1.8, color: 0x6a7a7a },
    { kind: 'rock', x: 12, z: -22, w: 3, d: 2.6, h: 2.2, color: 0x6a7a7a },
    { kind: 'decor', x: 11, z: 12, h: 1.1, model: 'crate' },
    { kind: 'decor', x: 12.5, z: 14, h: 1.0, model: 'barrel' },
    { kind: 'column', x: -12, z: -22, h: 1.8 },
    { kind: 'wall', x: -12, z: 17, w: 4, d: 0.6, h: 1, color: 0x6a4a2e, rot: 0.5 },
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'rock', x: -16, z: -4, color: 0x5a6a70 },
    { kind: 'rock', x: 16, z: -8, color: 0x5a6a70 },
    { kind: 'rock', x: -14, z: 12, color: 0x5a6a70 },
    { kind: 'crystal', x: 13, z: 12, color: 0x7ad8ff },
    { kind: 'column', x: -10, z: -20 },
    { kind: 'column', x: 10, z: -20 },
    { kind: 'decor', x: 16, z: 4, h: 1.0, model: 'barrel_large' },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '墨西拿漩渦：神獸討伐第 5 關，只有一隻魔王',
    '漩渦海怪卡律布狄斯：一天三次吞下整片海水、再吐出來的漩渦海怪，和斯庫拉隔著海峽對望。奧德修斯寧可經過…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_charybdis', x: 0, z: -8 }],
  beast: { order: 5, unlockAfter: 'dungeon_11', icon: '🌀' },
};

export const whirlpoolStrait: StageDef = {
  zone,
  enemies: {
    beast_charybdis: {
      id: 'beast_charybdis', name: '漩渦海怪卡律布狄斯', level: 58, aggro: 'aggressive', shape: 'charybdis', boss: true, element: 'water',
      radius: 1.4, respawn: 90, scale: 1.6, color: 0x3a8ac8,
      stats: { maxHp: 268000, atk: 559, def: 207, moveSpeed: 1.6 },
      attack: melee(3.2, 0.6, 1.8),
      exp: 45100, gold: [15410, 18720], gems: 42,
      bossSkills: ['charybdis_maelstrom', 'charybdis_spout', 'charybdis_tide_spokes', 'charybdis_tentacle_lash'],
    },
  },
};
