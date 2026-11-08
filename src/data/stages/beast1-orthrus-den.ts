import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 1・厄律提亞牧犬巢（Lv.18，擊敗第 3 層首領後開放）
 * 堤豐與厄喀德那的孩子、三頭犬刻耳柏洛斯的兄弟。替巨人革律翁看守紅色的牛群，兩顆頭從不同時睡著。
 * 只有魔王：雙頭犬俄耳托斯（雙首撕咬、撲咬、雙重嚎叫、獵犬衝刺）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_1',
  kind: 'field',
  music: 'wild',
  bossMusic: 'hunt',
  name: '厄律提亞牧犬巢',
  subtitle: '厄律提亞牧犬巢・神獸討伐',
  region: '厄律提亞',
  levelRange: [16, 18],
  lootTier: 3,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x5a5048,
  skyColor: 0x4a3a5a,
  fogColor: 0x6a5a7a,
  fogRange: [34, 80],
  patches: [
    // v1.96：牧草地與泥巴路、西側牛欄、東側水塘，北邊牧犬窩
    { x: 0, z: 8, w: 6, d: 30, color: 0x7a6a58 },
    { x: -15, z: 12, w: 12, d: 14, color: 0x6a7a4a },
    { x: 15, z: 14, w: 12, d: 12, color: 0x6a7a4a },
    { x: 15, z: 15, w: 6, d: 4, color: 0x4a7a8a, water: true },
  ],
  props: [
    // v1.96：西側牛欄（圍欄＋飼料桶）、東側水塘邊的灌木、北邊牧犬窩（岩堆＋碎石＋骨頭堆）
    { kind: 'fence', x: -15, z: 18, w: 8, d: 0.4 },
    { kind: 'fence', x: -19, z: 14, w: 8, d: 0.4, rot: Math.PI / 2 },
    { kind: 'decor', x: -12, z: 15, h: 1.0, model: 'barrel' },
    { kind: 'decor', x: -17, z: 11.5, h: 0.9, model: 'sack', solid: false },
    { kind: 'bush', x: 19, z: 18, color: 0x4a6a3a },
    { kind: 'bush', x: 11, z: 18.5, color: 0x5a7a3a },
    { kind: 'rock', x: -6, z: -24, w: 4, d: 3, h: 2.6, color: 0x4a4048 },
    { kind: 'rock', x: 6, z: -24.5, w: 3.4, d: 3, h: 2.2, color: 0x4a4048 },
    { kind: 'decor', x: 0, z: -25, h: 1.1, model: 'rubble' },
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'rock', x: -14, z: -6, color: 0x5a5060 },
    { kind: 'rock', x: 15, z: 4, color: 0x5a5060 },
    { kind: 'crystal', x: -10, z: -18, color: 0xb48cff },
    { kind: 'crystal', x: 11, z: -19, color: 0xb48cff },
    { kind: 'decor', x: -16, z: 14, h: 1.0, model: 'rubble' },
    { kind: 'fence', x: -15, z: 8, w: 6, d: 0.4 },
    { kind: 'fence', x: 15, z: 10, w: 6, d: 0.4 },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '厄律提亞牧犬巢：神獸討伐第 1 關，只有一隻魔王',
    '雙頭犬俄耳托斯：堤豐與厄喀德那的孩子、三頭犬刻耳柏洛斯的兄弟。替巨人革律翁看守紅色的牛群，兩顆頭…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_orthrus', x: 0, z: -8 }],
  beast: { order: 1, unlockAfter: 'dungeon_3', icon: '🐕' },
};

export const orthrusDen: StageDef = {
  zone,
  enemies: {
    beast_orthrus: {
      id: 'beast_orthrus', name: '雙頭犬俄耳托斯', level: 18, aggro: 'aggressive', shape: 'orthrus', boss: true, element: 'dark',
      radius: 0.85, respawn: 90, scale: 2.1, color: 0x3a3040,
      stats: { maxHp: 71000, atk: 232, def: 49, moveSpeed: 3.6 },
      attack: melee(2.6, 0.55, 1.7),
      exp: 5100, gold: [1800, 2380], gems: 16,
      bossSkills: ['orthrus_twin_bite', 'orthrus_pounce', 'orthrus_howl', 'orthrus_rush'],
    },
  },
};
