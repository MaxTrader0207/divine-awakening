import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 9・佛勒格拉戰場（Lv.98，擊敗第 19 層首領後開放）
 * 大地之母為了替泰坦報仇而生下的巨人族之一，下半身是兩條巨蛇。巨人之戰中被雅典娜用整座西西里島壓住，翻身時就是埃特納火山的地震。
 * 只有魔王：巨人恩刻拉多斯（巨石投擲、銅盾猛擊、蛇足噬咬、埃特納噴發）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_9',
  kind: 'field',
  music: 'inferno',
  bossMusic: 'boss',
  name: '佛勒格拉戰場',
  subtitle: '佛勒格拉戰場・神獸討伐',
  region: '佛勒格拉平原',
  levelRange: [96, 98],
  lootTier: 8,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x5a4a44,
  skyColor: 0x4a3a3a,
  fogColor: 0x7a5a50,
  fogRange: [34, 80],
  patches: [],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'decor', x: -14, z: -10, h: 1.2, model: 'banner_red' },
    { kind: 'decor', x: 14, z: -12, h: 1.0, model: 'weaponrack' },
    { kind: 'rock', x: -16, z: 8, color: 0x4a3a34 },
    { kind: 'rock', x: 16, z: 6, color: 0x4a3a34 },
    { kind: 'decor', x: 10, z: 14, h: 1.0, model: 'rubble' },
    { kind: 'crystal', x: -10, z: -20, color: 0xff7a2a },
    { kind: 'crystal', x: 10, z: -20, color: 0xff7a2a },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '佛勒格拉戰場：神獸討伐第 9 關，只有一隻魔王',
    '巨人恩刻拉多斯：大地之母為了替泰坦報仇而生下的巨人族之一，下半身是兩條巨蛇。巨人之戰中被雅典娜用…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_enceladus', x: 0, z: -8 }],
  beast: { order: 9, unlockAfter: 'dungeon_19', icon: '🗿' },
};

export const phlegraFields: StageDef = {
  zone,
  enemies: {
    beast_enceladus: {
      id: 'beast_enceladus', name: '巨人恩刻拉多斯', level: 98, aggro: 'aggressive', shape: 'enceladus', boss: true, element: 'metal',
      radius: 1.05, respawn: 90, scale: 1.4, color: 0xb88a4a,
      stats: { maxHp: 514000, atk: 937, def: 367, moveSpeed: 3.0 },
      attack: melee(3.2, 0.6, 1.8),
      exp: 114500, gold: [39260, 47880], gems: 71,
      bossSkills: ['enceladus_boulder_hurl', 'enceladus_shield_bash', 'enceladus_serpent_legs', 'enceladus_etna_eruption'],
    },
  },
};
