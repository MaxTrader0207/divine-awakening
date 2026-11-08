import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 8・大地母神角鬥場（Lv.88，擊敗第 17 層首領後開放）
 * 海神波賽頓與大地女神蓋亞的兒子，逼每個路人跟他摔角，用敗者的頭骨蓋神殿。只要腳踩著大地，他就永遠不會累。
 * 只有魔王：大地之子安泰俄斯（大地重摔、大地震盪、巨岩投擲、摔角衝撞）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_8',
  kind: 'field',
  music: 'wild',
  bossMusic: 'hunt',
  name: '大地母神角鬥場',
  subtitle: '大地母神角鬥場・神獸討伐',
  region: '利比亞',
  levelRange: [86, 88],
  lootTier: 8,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x9a7a54,
  theme: 'desert', // v1.93
  skyColor: 0xd8b88a,
  fogColor: 0xd8c0a0,
  fogRange: [34, 80],
  patches: [],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'column', x: -15, z: -12 },
    { kind: 'column', x: 15, z: -12 },
    { kind: 'column', x: -15, z: 6 },
    { kind: 'column', x: 15, z: 6 },
    { kind: 'statue', x: 0, z: -22, rot: 0 },
    { kind: 'bench', x: -16, z: -3 },
    { kind: 'bench', x: 16, z: -3 },
    { kind: 'decor', x: 12, z: 16, h: 1.4, model: 'torch' },
    { kind: 'decor', x: -12, z: 16, h: 1.4, model: 'torch' },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '大地母神角鬥場：神獸討伐第 8 關，只有一隻魔王',
    '大地之子安泰俄斯：海神波賽頓與大地女神蓋亞的兒子，逼每個路人跟他摔角，用敗者的頭骨蓋神殿。只要腳踩…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_antaeus', x: 0, z: -8 }],
  beast: { order: 8, unlockAfter: 'dungeon_17', icon: '🤼' },
};

export const libyanArena: StageDef = {
  zone,
  enemies: {
    beast_antaeus: {
      id: 'beast_antaeus', name: '大地之子安泰俄斯', level: 88, aggro: 'aggressive', shape: 'antaeus', boss: true, element: 'earth',
      radius: 1.0, respawn: 90, scale: 1.35, color: 0xa87a58,
      stats: { maxHp: 425000, atk: 842, def: 327, moveSpeed: 3.2 },
      attack: melee(3.0, 0.55, 1.8),
      exp: 94600, gold: [31250, 38110], gems: 63,
      bossSkills: ['antaeus_earth_slam', 'antaeus_quake', 'antaeus_rock_throw', 'antaeus_tackle'],
    },
  },
};
