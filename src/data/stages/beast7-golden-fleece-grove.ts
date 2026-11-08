import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 7・金羊毛聖樹（Lv.78，擊敗第 15 層首領後開放）
 * 盤繞在阿瑞斯聖林的橡樹下、看守金羊毛的巨龍，從不閉眼。傳奇女巫美狄亞用歌聲和藥草才讓牠睡著。
 * 只有魔王：科爾基斯不眠巨龍（金光吐息、盤身絞殺、不眠之瞳、金羊毛之光）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_7',
  kind: 'field',
  music: 'forest',
  bossMusic: 'hunt',
  name: '金羊毛聖樹',
  subtitle: '金羊毛聖樹・神獸討伐',
  region: '科爾基斯',
  levelRange: [76, 78],
  lootTier: 7,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x4a6a3a,
  skyColor: 0x6a8a5a,
  fogColor: 0x8aa878,
  fogRange: [34, 80],
  patches: [{ x: 0, z: -12, w: 3, d: 18, color: 0x8a7a5a }],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'olive', x: 0, z: -22 },
    { kind: 'tree', x: -16, z: -12 },
    { kind: 'tree', x: 16, z: -10 },
    { kind: 'tree', x: -16, z: 10 },
    { kind: 'tree', x: 17, z: 12 },
    { kind: 'crystal', x: -8, z: -21, color: 0xffd36b },
    { kind: 'crystal', x: 8, z: -21, color: 0xffd36b },
    { kind: 'statue', x: -14, z: 0, rot: 0 },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '金羊毛聖樹：神獸討伐第 7 關，只有一隻魔王',
    '科爾基斯不眠巨龍：盤繞在阿瑞斯聖林的橡樹下、看守金羊毛的巨龍，從不閉眼。傳奇女巫美狄亞用歌聲和藥草…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_colchis', x: 0, z: -8 }],
  beast: { order: 7, unlockAfter: 'dungeon_15', icon: '🐉' },
};

export const goldenFleeceGrove: StageDef = {
  zone,
  enemies: {
    beast_colchis: {
      id: 'beast_colchis', name: '科爾基斯不眠巨龍', level: 78, aggro: 'aggressive', shape: 'colchis', boss: true, element: 'light',
      radius: 1.3, respawn: 90, scale: 1.7, color: 0x2a5a4a,
      stats: { maxHp: 370000, atk: 748, def: 287, moveSpeed: 2.4 },
      attack: melee(3.2, 0.6, 1.8),
      exp: 75800, gold: [24940, 30460], gems: 56,
      bossSkills: ['colchis_golden_breath', 'colchis_coil_crush', 'colchis_sleepless_gaze', 'colchis_fleece_flare'],
    },
  },
};
