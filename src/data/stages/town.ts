import type { StageDef, ZoneDef } from '../types';
import { row } from './helpers';

/**
 * 雅典城（主城・安全區）
 * 古希臘風格的城鎮：神殿、廣場、市集、花園、雞舍與隨機走動的小動物。沒有敵人。
 * v1.94 擴建（56×64 → 84×88）：西市集（藥房、職業行會、旅行商人）、東區（珠寶店、德爾斐神諭殿、訓練場）、
 * 北邊柱廊與橄欖林、南邊城門。每間店走進門口光圈只顯示自己的商品（data/shops.ts）。
 */
const zone: ZoneDef = {
  id: 'town',
  music: 'town',
  kind: 'town',
  name: '赫拉斯大陸',
  subtitle: '雅典城・安全區',
  region: '赫拉斯大陸',
  safe: true,
  size: { w: 84, d: 88 },
  groundColor: 0x9fbf6a,
  // v1.94：主城也有景觀（草叢、野花、城外樹林）；道路邊緣保持俐落，安全區沒有寶箱
  theme: { base: 'meadow', ground: { edge: 0.45, noise: 0.08, hills: 4 }, particles: { kind: 'leaf', colors: [0xffffff, 0xffe9a0, 0xb8e070], count: 30 } },
  skyColor: 0xbfe3f2,
  fogColor: 0xcfe6ee,
  patches: [
    { x: 0, z: 0, w: 14, d: 88, color: 0xd9d2bf }, // 南北大道
    { x: 0, z: -8, w: 84, d: 10, color: 0xd9d2bf }, // 東西大街（商店街）
    { x: -29, z: 12, w: 5, d: 30, color: 0xd2cab6 }, // v1.94 西市集巷
    { x: 29, z: 12, w: 5, d: 30, color: 0xd2cab6 }, // v1.94 東區巷
    { x: -35, z: 22, w: 11, d: 9, color: 0xcfc7b2 }, // 旅行商人的小廣場
    { x: 35, z: 22, w: 12, d: 10, color: 0xc8b890 }, // 訓練場沙地
    { x: 0, z: -37, w: 60, d: 5, color: 0xe3dccb }, // 北邊柱廊步道
    { x: 0, z: 8, w: 22, d: 22, color: 0xcfc7b2 }, // 中央廣場
    { x: 0, z: 8, w: 12, d: 12, color: 0xe3dccb }, // 噴泉周圍的淺色石板
    { x: 0, z: -27, w: 17, d: 9, color: 0xe6dfcc }, // 神殿前庭
    { x: -12, z: 25, w: 6, d: 10, color: 0xcfc7b2 }, // 西南小花園
  ],
  props: [
    /* --- 北：雅典娜神殿 --- */
    { kind: 'temple', x: 0, z: -27, w: 12, d: 7, h: 7 },
    { kind: 'statue', x: -8.6, z: -25 },
    { kind: 'statue', x: 8.6, z: -25 },
    { kind: 'cypress', x: -8.4, z: -30 },
    { kind: 'cypress', x: 8.4, z: -30 },
    { kind: 'olive', x: -24, z: -28 },
    { kind: 'olive', x: -17, z: -29.5 },
    { kind: 'olive', x: 17, z: -29.5 },
    { kind: 'olive', x: 24, z: -28 },

    /* --- 商店街 --- */
    { kind: 'fountain', x: 0, z: 8 },
    { kind: 'house', x: -12, z: -18, w: 9, d: 8, color: 0x3d6fb6, sign: '武器店', model: 'building_blacksmith' },
    { kind: 'house', x: 12, z: -18, w: 9, d: 8, color: 0x3d6fb6, sign: '防具店', model: 'building_tavern' },
    { kind: 'house', x: -22, z: -18, w: 7, d: 7, color: 0x4a7cc2, sign: '道具店', model: 'building_market' },
    { kind: 'house', x: 22, z: -18, w: 7, d: 7, color: 0x4a7cc2, sign: '強化屋', model: 'building_tower' },
    { kind: 'decor', x: -7.5, z: -13, h: 1.4, model: 'weaponrack' },
    { kind: 'decor', x: 7.5, z: -13.5, h: 1.1, model: 'barrel' },
    { kind: 'decor', x: 8.6, z: -13, h: 1.1, model: 'crate' },
    { kind: 'decor', x: -17, z: -13, h: 0.9, model: 'sack', solid: false },
    { kind: 'amphora', x: -26.2, z: -13.6 },
    { kind: 'amphora', x: 17, z: -13.4, h: 0.9 },
    // 大街南側的市集攤位（面向大街）
    { kind: 'stall', x: -15, z: -1.2, rot: Math.PI },
    { kind: 'stall', x: -22.5, z: -1.2, rot: Math.PI },
    { kind: 'stall', x: 15, z: -1.2, rot: Math.PI },
    { kind: 'stall', x: 22.5, z: -1.2, rot: Math.PI },
    { kind: 'amphora', x: -18.8, z: -1.4 },
    { kind: 'amphora', x: -19.5, z: -0.6, h: 0.8 },
    { kind: 'amphora', x: 18.8, z: -1.4, h: 0.9 },
    { kind: 'decor', x: 26.3, z: -0.8, h: 1.3, model: 'crates_stacked' },
    { kind: 'decor', x: -26.3, z: -0.9, h: 1.1, model: 'barrel' },

    /* --- 中央廣場 --- */
    { kind: 'column', x: -10.2, z: -1.5 },
    { kind: 'column', x: 10.2, z: -1.5 },
    { kind: 'column', x: -10.2, z: 17.5 },
    { kind: 'column', x: 10.2, z: 17.5 },
    { kind: 'flowers', x: -8, z: -1.9, w: 3, d: 1 },
    { kind: 'flowers', x: 8, z: -1.9, w: 3, d: 1 },
    { kind: 'flowers', x: -8, z: 18.8, w: 3, d: 1 },
    { kind: 'flowers', x: 8, z: 18.8, w: 3, d: 1 },
    { kind: 'flowers', x: -8.8, z: 4, w: 2.6, d: 1, rot: Math.PI / 2 },
    { kind: 'flowers', x: 8.8, z: 4, w: 2.6, d: 1, rot: Math.PI / 2 },
    { kind: 'flowers', x: -8.8, z: 12, w: 2.6, d: 1, rot: Math.PI / 2 },
    { kind: 'flowers', x: 8.8, z: 12, w: 2.6, d: 1, rot: Math.PI / 2 },
    { kind: 'bench', x: -8.8, z: 8, rot: Math.PI / 2 },
    { kind: 'bench', x: 8.8, z: 8, rot: -Math.PI / 2 },
    ...row('lamp', -6, -16, 0, 8, 6),
    ...row('lamp', 6, -16, 0, 8, 6),

    /* --- 住宅區 --- */
    { kind: 'house', x: -20, z: 8, w: 9, d: 9, color: 0x3d6fb6, model: 'building_church' },
    { kind: 'house', x: 20, z: 8, w: 8, d: 8, color: 0x3d6fb6, model: 'building_home_A' },
    { kind: 'house', x: -20, z: 24, w: 8, d: 8, color: 0x5a86c6, model: 'building_home_B' },
    { kind: 'house', x: 20, z: 24, w: 8, d: 8, color: 0x5a86c6, model: 'building_home_A' },
    // 西：水井
    { kind: 'decor', x: -21, z: 16.2, h: 2.4, w: 2, d: 2, model: 'building_well' },
    { kind: 'amphora', x: -23.4, z: 16.6, h: 0.9 },
    { kind: 'amphora', x: -18.6, z: 15.8 },
    { kind: 'bush', x: -25.5, z: 13.5 },
    { kind: 'bush', x: -15, z: 19.5 },
    { kind: 'olive', x: -26, z: 29 },
    // 西南：雅典娜小花園
    { kind: 'statue', x: -12, z: 25, w: 1.4, d: 1.4, h: 3 },
    { kind: 'flowers', x: -12, z: 21.4, w: 3.4, d: 1 },
    { kind: 'flowers', x: -12, z: 28.6, w: 3.4, d: 1 },
    { kind: 'bench', x: -9.4, z: 25, rot: Math.PI / 2 },
    { kind: 'hedge', x: -14.6, z: 25, w: 6, d: 0.8, rot: Math.PI / 2 },
    { kind: 'cypress', x: -9.4, z: 30.5 },
    { kind: 'cypress', x: 9.4, z: 30.5 },
    // 東：雞舍
    { kind: 'fence', x: 12, z: 19.5, w: 5 },
    { kind: 'fence', x: 12, z: 24.5, w: 5 },
    { kind: 'fence', x: 9.5, z: 22, w: 5, rot: Math.PI / 2 },
    { kind: 'fence', x: 14.5, z: 22, w: 5, rot: Math.PI / 2 },
    { kind: 'decor', x: 9, z: 26, h: 0.9, model: 'sack', solid: false },
    { kind: 'decor', x: 26, z: 14, h: 2.2, w: 2, d: 2, model: 'tent' },
    { kind: 'decor', x: 24, z: 16.4, h: 1, model: 'barrel' },
    { kind: 'bush', x: 15.5, z: 13.8 },
    { kind: 'olive', x: 26.4, z: 3 },
    { kind: 'olive', x: 26, z: 29 },

    /* --- v1.94 西市集 --- */
    // 阿斯克勒庇俄斯藥房（綠屋頂）＋藥草園
    { kind: 'house', x: -35, z: -18, w: 8, d: 7, color: 0x3f9a6a, sign: '藥房' },
    { kind: 'flowers', x: -40, z: -13.5, w: 3, d: 1, rot: Math.PI / 2 },
    { kind: 'amphora', x: -30.6, z: -13.6 },
    { kind: 'amphora', x: -31.4, z: -13.1, h: 0.8 },
    // 職業行會（紫屋頂），門朝南
    { kind: 'house', x: -35, z: 4, w: 9, d: 7, color: 0x7a5ab0, sign: '職業行會' },
    { kind: 'decor', x: -30.4, z: 8.4, h: 1.4, model: 'weaponrack' },
    { kind: 'decor', x: -39.6, z: 8.2, h: 2.2, model: 'banner_red', solid: false },
    // 旅行商人：帳篷＋攤位＋貨物
    { kind: 'decor', x: -37.5, z: 18.5, h: 2.6, w: 3, d: 3, model: 'tent' },
    { kind: 'stall', x: -33, z: 20.5 },
    { kind: 'decor', x: -30.6, z: 18.4, h: 1.3, model: 'crates_stacked' },
    { kind: 'decor', x: -31, z: 25.6, h: 1.1, model: 'barrel' },
    { kind: 'decor', x: -39.5, z: 23.5, h: 0.9, model: 'sack', solid: false },
    { kind: 'decor', x: -38.6, z: 24.4, h: 0.9, model: 'sack', solid: false },
    { kind: 'amphora', x: -36.2, z: 25.4 },
    { kind: 'lamp', x: -26.5, z: 2 },
    { kind: 'lamp', x: -26.5, z: 16 },

    /* --- v1.94 東區 --- */
    // 阿芙蘿黛蒂珠寶（粉屋頂）
    { kind: 'house', x: 35, z: -18, w: 8, d: 7, color: 0xd07aa8, sign: '珠寶店' },
    { kind: 'flowers', x: 40, z: -13.5, w: 3, d: 1, rot: Math.PI / 2 },
    { kind: 'crystal', x: 30.6, z: -13.6, color: 0xff9ad0 },
    // 德爾斐神諭殿（小神殿＋水晶＋招牌旗）
    { kind: 'temple', x: 35, z: 3, w: 10, d: 6.5, h: 5.6 },
    { kind: 'crystal', x: 29.6, z: 7.6, color: 0x8fe8ff },
    { kind: 'crystal', x: 40.4, z: 7.6, color: 0x8fe8ff },
    { kind: 'decor', x: 31.2, z: 8.6, h: 2.4, model: 'banner_red', solid: false, sign: '神諭殿' },
    { kind: 'statue', x: 40.6, z: -1.5, w: 1.3, d: 1.3, h: 3 },
    // 訓練場：圍欄、武器架、標靶木箱
    { kind: 'fence', x: 35, z: 16.6, w: 10 },
    { kind: 'fence', x: 40.2, z: 22, w: 10, rot: Math.PI / 2 },
    { kind: 'fence', x: 35, z: 27.4, w: 10 },
    { kind: 'decor', x: 38.6, z: 18.4, h: 1.4, model: 'weaponrack' },
    { kind: 'decor', x: 31.6, z: 25.6, h: 1.1, model: 'crate' },
    { kind: 'decor', x: 33, z: 25.8, h: 1.1, model: 'barrel' },
    { kind: 'decor', x: 37.5, z: 25.6, h: 2.2, model: 'banner_red', solid: false },
    { kind: 'lamp', x: 26.5, z: 2 },
    { kind: 'lamp', x: 26.5, z: 16 },

    /* --- v1.94 北：柱廊與橄欖林 --- */
    ...row('column', -32, -34.4, 4, 0, 5),
    ...row('column', 16, -34.4, 4, 0, 5),
    ...row('olive', -36, -40.5, 9, 0, 3),
    ...row('olive', 18, -40.5, 9, 0, 3),
    { kind: 'statue', x: -38.5, z: -30, w: 1.4, d: 1.4, h: 3.2 },
    { kind: 'statue', x: 38.5, z: -30, w: 1.4, d: 1.4, h: 3.2 },
    { kind: 'bench', x: -24, z: -31.6 },
    { kind: 'bench', x: 24, z: -31.6 },
    { kind: 'cypress', x: -40, z: -8 },
    { kind: 'cypress', x: 40, z: -8 },

    /* --- v1.94 南：城門與大道 --- */
    { kind: 'wall', x: -24.5, z: 36, w: 31, d: 1.2, h: 2.6, color: 0xd8ccb0 },
    { kind: 'wall', x: 24.5, z: 36, w: 31, d: 1.2, h: 2.6, color: 0xd8ccb0 },
    { kind: 'pillar', x: -8.6, z: 36, w: 1.6, d: 1.6, h: 4.2, color: 0xe8e0cc },
    { kind: 'pillar', x: 8.6, z: 36, w: 1.6, d: 1.6, h: 4.2, color: 0xe8e0cc },
    { kind: 'decor', x: -8.6, z: 37.4, h: 2.4, model: 'banner_red', solid: false },
    { kind: 'decor', x: 8.6, z: 37.4, h: 2.4, model: 'banner_red', solid: false },
    ...row('lamp', -6, 22, 0, 6, 3),
    ...row('lamp', 6, 22, 0, 6, 3),
    { kind: 'cypress', x: -14, z: 33.5 },
    { kind: 'cypress', x: 14, z: 33.5 },
    { kind: 'olive', x: -32, z: 31 },
    { kind: 'olive', x: 32, z: 31 },
  ],
  critters: [
    // 貓頭鷹：神殿正面屋頂的尖端
    { kind: 'owl', x: 0, z: -23.9, perchY: 7, rot: 0 },
    // 廣場的鴿子
    ...[[-4, 4], [-3, 5.2], [4, 12.5], [5.2, 11.5], [3.2, 3], [-5, 13.5]].map(([x, z], i) => ({
      kind: 'pigeon' as const,
      x,
      z,
      variant: i,
      area: { x: 0, z: 8, w: 19, d: 19 },
    })),
    // 雞舍
    ...[[11, 21, 0], [13, 23, 1], [12.5, 20.8, 0]].map(([x, z, v]) => ({ kind: 'chicken' as const, x, z, variant: v, area: { x: 12, z: 22, w: 3.8, d: 3.8 } })),
    ...[[11.5, 21.5], [12, 21.2], [13.3, 22.5]].map(([x, z]) => ({ kind: 'chick' as const, x, z, area: { x: 12, z: 22, w: 3.8, d: 3.8 } })),
    // 帳篷旁邊跑出來的一隻
    { kind: 'chicken', x: 23, z: 18, variant: 1, area: { x: 22, z: 17, w: 9, d: 6 } },
    // 貓狗：整座城閒晃
    { kind: 'cat', x: -19.5, z: 18, variant: 0 },
    { kind: 'cat', x: 10, z: -5, variant: 1 },
    { kind: 'cat', x: 4, z: 22, variant: 2 },
    { kind: 'dog', x: -3, z: 22, variant: 0 },
    // v1.94 新區的小動物
    { kind: 'dog', x: -33, z: 24, variant: 1, area: { x: -35, z: 22, w: 10, d: 8 } },
    { kind: 'cat', x: 33, z: -12, variant: 0 },
    ...[[-30, -36], [-22, -36.5], [22, -36], [30, -36.6]].map(([x, z], i) => ({ kind: 'pigeon' as const, x, z, variant: i + 2, area: { x, z: -37, w: 10, d: 4 } })),
    { kind: 'owl', x: 35, z: 6.1, perchY: 5.6, rot: 0 },
    // 花圃旁的蝴蝶
    { kind: 'butterfly', x: 8.8, z: 4, variant: 0 },
    { kind: 'butterfly', x: -8.8, z: 12, variant: 1 },
    { kind: 'butterfly', x: -12, z: 22, variant: 2 },
    { kind: 'butterfly', x: -12, z: 28, variant: 3 },
  ],
  portals: [
    { x: 0, z: 40.5, radius: 2.6, to: 'grassland', arrive: { x: 0, z: -24 }, label: '阿卡迪亞草原', style: 'edge' },
    { x: 0, z: 1.5, radius: 1.6, to: 'dungeon_1', arrive: { x: 0, z: 20 }, label: '傳送石', style: 'stone' },
  ],
  spawn: { x: 0, z: 14 },
  triggers: [
    { x: -12, z: -12.6, radius: 1.4, tab: 'shop', label: '武器店', shop: 'weapon' },
    { x: 12, z: -12.6, radius: 1.4, tab: 'shop', label: '防具店', shop: 'armor' },
    { x: -22, z: -12.6, radius: 1.2, tab: 'shop', label: '道具店', shop: 'general' },
    { x: 22, z: -12.6, radius: 1.2, tab: 'enhance', label: '強化屋' },
    { x: -35, z: -12.8, radius: 1.3, tab: 'shop', label: '藥房', shop: 'apothecary' },
    { x: 35, z: -12.8, radius: 1.3, tab: 'shop', label: '珠寶店', shop: 'jeweler' },
    { x: -35, z: 9.4, radius: 1.3, tab: 'shop', label: '職業行會', shop: 'guild' },
    { x: 35, z: 8.6, radius: 1.4, tab: 'shop', label: '神諭殿', shop: 'oracle' },
    { x: -33, z: 23.2, radius: 1.3, tab: 'shop', label: '旅行商人', shop: 'merchant' },
  ],
  tips: ['主城中央的傳送石可以前往波賽頓海岸等副本地區', '商店街就在主城的東西大街上；西市集有藥房、職業行會和每天換貨的旅行商人', '東區的德爾斐神諭殿可以用鑽石換好東西', '往南走可以進入阿卡迪亞草原', '神殿屋頂上的貓頭鷹是雅典娜的聖鳥'],
};

export const town: StageDef = {
  zone,
  enemies: {

  },
};
