import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 4・利比亞毒沙丘（Lv.48，擊敗第 9 層首領後開放）
 * 梅杜莎的頭顱被佩爾修斯帶著飛過利比亞時，滴下的血化成了這條身體兩端各有一顆頭的毒蛇。
 * 只有魔王：雙頭蛇安菲斯拜納（前後毒噴、蛇身橫掃、毒沙雨、翻滾突進）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_4',
  kind: 'field',
  music: 'wild',
  bossMusic: 'hunt',
  name: '利比亞毒沙丘',
  subtitle: '利比亞毒沙丘・神獸討伐',
  region: '利比亞沙漠',
  levelRange: [46, 48],
  lootTier: 6,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0xc8b07a,
  skyColor: 0xe8c88a,
  fogColor: 0xe0c898,
  fogRange: [34, 80],
  patches: [{ x: 0, z: 0, w: 4, d: 40, color: 0xd8c08a }],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'palm', x: -16, z: 12 },
    { kind: 'palm', x: 17, z: 10 },
    { kind: 'rock', x: -15, z: -12, color: 0xb89a6a },
    { kind: 'rock', x: 15, z: -14, color: 0xb89a6a },
    { kind: 'column', x: -10, z: -20 },
    { kind: 'column', x: 10, z: -20 },
    { kind: 'amphora', x: 14, z: 2 },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '利比亞毒沙丘：神獸討伐第 4 關，只有一隻魔王',
    '雙頭蛇安菲斯拜納：梅杜莎的頭顱被佩爾修斯帶著飛過利比亞時，滴下的血化成了這條身體兩端各有一顆頭的毒…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_amphisbaena', x: 0, z: -8 }],
  beast: { order: 4, unlockAfter: 'dungeon_9', icon: '🐍' },
};

export const libyanDunes: StageDef = {
  zone,
  enemies: {
    beast_amphisbaena: {
      id: 'beast_amphisbaena', name: '雙頭蛇安菲斯拜納', level: 48, aggro: 'aggressive', shape: 'amphisbaena', boss: true, element: 'poison',
      radius: 1.0, respawn: 90, scale: 1.7, color: 0x6a8a3a,
      stats: { maxHp: 207000, atk: 471, def: 167, moveSpeed: 3.4 },
      attack: melee(2.8, 0.55, 1.7),
      exp: 31200, gold: [10420, 12720], gems: 35,
      bossSkills: ['amphisbaena_twin_venom', 'amphisbaena_coil_whip', 'amphisbaena_acid_rain', 'amphisbaena_serpent_lunge'],
    },
  },
};
