import type { PropDef, ZoneDef, ZoneId } from './types';

/* 小工具：產生一排物件，減少重複資料 */
function row(kind: PropDef['kind'], x0: number, z0: number, dx: number, dz: number, n: number, extra: Partial<PropDef> = {}): PropDef[] {
  return Array.from({ length: n }, (_, i) => ({ kind, x: x0 + dx * i, z: z0 + dz * i, ...extra }));
}

const town: ZoneDef = {
  id: 'town',
  music: 'town',
  kind: 'town',
  name: '赫拉斯大陸',
  subtitle: '雅典城・安全區',
  region: '赫拉斯大陸',
  safe: true,
  size: { w: 56, d: 64 },
  groundColor: 0x9fbf6a,
  skyColor: 0xbfe3f2,
  fogColor: 0xcfe6ee,
  patches: [
    { x: 0, z: 0, w: 14, d: 64, color: 0xd9d2bf }, // 南北大道
    { x: 0, z: -8, w: 56, d: 10, color: 0xd9d2bf }, // 東西大街（商店街）
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
    // 花圃旁的蝴蝶
    { kind: 'butterfly', x: 8.8, z: 4, variant: 0 },
    { kind: 'butterfly', x: -8.8, z: 12, variant: 1 },
    { kind: 'butterfly', x: -12, z: 22, variant: 2 },
    { kind: 'butterfly', x: -12, z: 28, variant: 3 },
  ],
  portals: [
    { x: 0, z: 30, radius: 2.6, to: 'grassland', arrive: { x: 0, z: -24 }, label: '阿卡迪亞草原', style: 'edge' },
    { x: 0, z: 1.5, radius: 1.6, to: 'dungeon_1', arrive: { x: 0, z: 20 }, label: '傳送石', style: 'stone' },
  ],
  spawn: { x: 0, z: 14 },
  triggers: [
    { x: -12, z: -12.6, radius: 1.4, tab: 'shop', label: '武器店' },
    { x: 12, z: -12.6, radius: 1.4, tab: 'shop', label: '防具店' },
    { x: -22, z: -12.6, radius: 1.2, tab: 'shop', label: '道具店' },
    { x: 22, z: -12.6, radius: 1.2, tab: 'enhance', label: '強化屋' },
  ],
  tips: ['主城中央的傳送石可以前往波賽頓海岸等副本地區', '商店街就在主城的東西大街上', '往南走可以進入阿卡迪亞草原', '神殿屋頂上的貓頭鷹是雅典娜的聖鳥'],
};

const grassland: ZoneDef = {
  id: 'grassland',
  music: 'grassland',
  kind: 'field',
  name: '赫拉斯大陸',
  subtitle: '阿卡迪亞草原・Lv.1-10',
  region: '赫拉斯大陸',
  levelRange: [1, 10],
  safe: false,
  size: { w: 70, d: 60 },
  groundColor: 0x86c24f,
  skyColor: 0xbfe3f2,
  fogColor: 0xd2ebd2,
  patches: [
    { x: 0, z: -18, w: 8, d: 24, color: 0xc9b98f },
    { x: 8, z: 4, w: 30, d: 6, color: 0xc9b98f },
    { x: 28, z: 4, w: 14, d: 5, color: 0xc9b98f },
  ],
  props: [
    ...row('fence', -30, -6, 4, 0, 6, { rot: 0 }),
    ...row('fence', 10, -6, 4, 0, 6, { rot: 0 }),
    { kind: 'tree', x: -14, z: -20 },
    { kind: 'tree', x: 16, z: -22 },
    { kind: 'tree', x: -24, z: 10 },
    { kind: 'tree', x: -8, z: 18 },
    { kind: 'tree', x: 26, z: 16 },
    { kind: 'tree', x: 4, z: 22 },
    { kind: 'bush', x: -18, z: 0 },
    { kind: 'bush', x: 20, z: -2 },
    { kind: 'bush', x: 12, z: 18 },
    { kind: 'rock', x: -4, z: 10 },
    { kind: 'rock', x: 24, z: 8 },
    { kind: 'rock', x: -26, z: -20 },
    { kind: 'decor', x: 22, z: -14, h: 2.4, w: 2.4, d: 2.4, model: 'tent' },
    { kind: 'decor', x: 19.5, z: -12, h: 1.0, model: 'barrel' },
    { kind: 'decor', x: 2, z: -14, h: 1.4, model: 'weaponrack' },
  ],
  portals: [
    { x: 0, z: -28, radius: 2.6, to: 'town', arrive: { x: 0, z: 26 }, label: '雅典城', style: 'edge' },
    { x: 33, z: 4, radius: 2.4, to: 'mistwood', arrive: { x: -29, z: 20 }, label: '多多納聖林 Lv.11', style: 'edge' },
  ],
  spawn: { x: 0, z: -24 },
  tips: ['斯巴達訓練木樁在草原東側，可以測試不同防禦下的傷害', '敵人防禦越高越需要穿透', '按住普攻鍵可以連續攻擊'],
  spawns: [
    { enemy: 'training_dummy', x: 6, z: -16, def: 0, tag: '防禦 0' },
    { enemy: 'training_dummy', x: 11, z: -16, def: 18, tag: '防禦 18' },
    { enemy: 'training_dummy', x: 16, z: -16, def: 40, tag: '防禦 40' },
    { enemy: 'green_slime', x: -18, z: 8, count: 4, spread: 5 },
    { enemy: 'green_slime', x: 20, z: 12, count: 3, spread: 4 },
    { enemy: 'meadow_mushroom', x: -6, z: 20, count: 3, spread: 4 },
    { enemy: 'meadow_mushroom', x: -22, z: -16, count: 2, spread: 3 },
  ],
};

/* ---------------- 副本 ----------------
 * 版面共通：南邊入口（z ≈ +20）→ 中段小怪 → 北邊高台（石階在南側）→ 高台上的首領石圈。
 * 高台四周是峭壁，只能從石階上去，首領也只會在高台附近活動。
 */
const pillarRing = (cx: number, cz: number, r: number, n: number, color?: number): PropDef[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    return { kind: 'pillar' as const, x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, h: 2.6, color };
  }).filter((p) => p.z < cz + r * 0.6); // 石圈南側留開口

const dungeon1: ZoneDef = {
  id: 'dungeon_1',
  kind: 'dungeon',
  name: '波賽頓海岸',
  subtitle: '第一層・入口與西側',
  region: '波賽頓海岸',
  levelRange: [1, 5],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0xe6cf95,
  skyColor: 0xbfe3f2,
  fogColor: 0xe9e2c8,
  patches: [
    { x: 19, z: 0, w: 12, d: 60, color: 0x4fb3d9, water: true },
    { x: 12.5, z: 0, w: 1.2, d: 60, color: 0xf3e7c4 },
    { x: -2, z: 6, w: 4, d: 24, color: 0xd8c08a },
  ],
  platforms: [{ x: -6, z: -19, w: 26, d: 16, h: 1.4, color: 0x8fc15a, stairs: { x: -6, width: 5 } }],
  props: [
    { kind: 'palm', x: 9, z: 18 },
    { kind: 'palm', x: 10, z: 4 },
    { kind: 'palm', x: 9.5, z: -8 },
    { kind: 'palm', x: -18, z: 16 },
    { kind: 'palm', x: -20, z: 2 },
    { kind: 'rock', x: -9, z: 6 },
    { kind: 'rock', x: 5, z: -3 },
    { kind: 'rock', x: -14, z: 12 },
    { kind: 'pillar', x: -16, z: -4, h: 2.2 },
    { kind: 'pillar', x: 3, z: 14, h: 1.6 },
    { kind: 'bush', x: -12, z: -1 },
    { kind: 'tree', x: -16, z: -23 },
    { kind: 'tree', x: 4, z: -24 },
    { kind: 'stonering', x: -2, z: -21, w: 10, d: 10 },
    ...pillarRing(-2, -21, 5.6, 8),
    { kind: 'decor', x: -9.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -2.6, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: 22, h: 1.2, model: 'barrel_large' },
    { kind: 'decor', x: 7.2, z: 20.6, h: 1.4, model: 'crates_stacked' },
    { kind: 'decor', x: -6, z: 23, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -2, z: -14.6, h: 2.4, model: 'banner_red', solid: false },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['首領巨蟹卡基諾斯在高台東北的石圈', '被攻擊時會自動反擊最近的敵人', '留意被動怪：寧芙潮蛙受到攻擊才會反擊', '首領出招前地上會出現紅色範圍，用閃現（R）躲開'],
  spawns: [
    { enemy: 'hermit_crab', x: -6, z: 12, count: 3, spread: 4 },
    { enemy: 'bubble_frog', x: 2, z: 0, count: 3, spread: 4 },
    { enemy: 'hermit_crab', x: -15, z: 2, count: 3, spread: 3 },
    { enemy: 'crab_king', x: -2, z: -21 },
  ],
  dungeon: { floor: 1, bossName: '巨蟹卡基諾斯', enemyDefense: 0 },
};

const dungeon2: ZoneDef = {
  id: 'dungeon_2',
  kind: 'dungeon',
  name: '賽蓮海蝕洞',
  subtitle: '第二層・海妖歌聲',
  region: '賽蓮海蝕洞',
  levelRange: [5, 10],
  safe: false,
  size: { w: 48, d: 60 },
  groundColor: 0x6f97a6,
  skyColor: 0x24323f,
  fogColor: 0x2f4654,
  patches: [
    { x: -18, z: 4, w: 12, d: 34, color: 0x2f86b0, water: true },
    { x: 2, z: 6, w: 6, d: 26, color: 0x86aab6 },
  ],
  platforms: [{ x: 4, z: -19, w: 24, d: 16, h: 1.2, color: 0x5a8090, stairs: { x: 4, width: 5 } }],
  props: [
    ...row('wall', -22, 26, 0, -6, 4, { w: 4, d: 2, h: 3.4, color: 0x4a6470 }),
    ...row('wall', 22, 26, 0, -6, 9, { w: 4, d: 2, h: 3.4, color: 0x4a6470 }),
    { kind: 'rock', x: -6, z: 10, color: 0xe58a8a },
    { kind: 'rock', x: 12, z: 2, color: 0xe58a8a },
    { kind: 'rock', x: -9, z: -6, color: 0xf0a0b0 },
    { kind: 'crystal', x: 14, z: 14, color: 0x8fe8ff },
    { kind: 'crystal', x: -10, z: 18, color: 0xb48cff },
    { kind: 'crystal', x: 16, z: -8, color: 0x8fe8ff },
    { kind: 'crystal', x: -8, z: -24, color: 0xb48cff },
    { kind: 'pillar', x: 10, z: 10, h: 3.2, color: 0x7a9aa8 },
    { kind: 'stonering', x: 6, z: -21, w: 10, d: 10, color: 0x9ab8c4 },
    ...pillarRing(6, -21, 5.6, 8, 0x7a9aa8),
    { kind: 'decor', x: 0.6, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 7.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -6, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 16, z: -24, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 18，記得堆穿透（帽子、戒指）', '斯廷法利斯蝠鳥速度很快，先用冰霜新星緩速', '青銅巨人塔洛斯會召喚潮水落下，看到紅圈就跑'],
  spawns: [
    { enemy: 'coral_slime', x: 4, z: 12, count: 3, spread: 4 },
    { enemy: 'cave_bat', x: -4, z: 0, count: 3, spread: 4 },
    { enemy: 'coral_slime', x: 12, z: -4, count: 2, spread: 3 },
    { enemy: 'cave_bat', x: 14, z: 18, count: 2, spread: 3 },
    { enemy: 'tide_golem', x: 6, z: -21 },
  ],
  dungeon: { floor: 2, bossName: '青銅巨人塔洛斯', enemyDefense: 18, unlockAfter: 'dungeon_1' },
};

const dungeon3: ZoneDef = {
  id: 'dungeon_3',
  kind: 'dungeon',
  name: '赫菲斯托斯熔爐',
  subtitle: '第三層・埃特納火山',
  region: '赫菲斯托斯熔爐',
  levelRange: [10, 15],
  safe: false,
  size: { w: 50, d: 60 },
  groundColor: 0x8a6448,
  skyColor: 0xc98a6a,
  fogColor: 0x9a6a50,
  patches: [
    { x: 15, z: 8, w: 10, d: 12, color: 0xff6a1a, water: true },
    { x: -15, z: -4, w: 8, d: 10, color: 0xff6a1a, water: true },
    { x: 0, z: 8, w: 6, d: 26, color: 0x6e4e38 },
  ],
  platforms: [{ x: 0, z: -19, w: 26, d: 16, h: 1.6, color: 0x5e4232, stairs: { x: 0, width: 5 } }],
  props: [
    { kind: 'rock', x: -8, z: 14, color: 0x4a3426 },
    { kind: 'rock', x: 8, z: -2, color: 0x4a3426 },
    { kind: 'rock', x: -20, z: 16, color: 0x4a3426 },
    { kind: 'rock', x: 20, z: -6, color: 0x4a3426 },
    { kind: 'crystal', x: 8, z: 18, color: 0xff8a3c },
    { kind: 'crystal', x: -12, z: 6, color: 0xff8a3c },
    { kind: 'crystal', x: 18, z: -14, color: 0xffb36b },
    { kind: 'pillar', x: -6, z: 2, h: 2.4, color: 0x6b4a36 },
    { kind: 'stonering', x: 0, z: -21, w: 10, d: 10, color: 0x9a6a50 },
    ...pillarRing(0, -21, 5.6, 8, 0x6b4a36),
    { kind: 'decor', x: -3.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 3.4, z: -6.2, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 10, z: 22, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: -16, z: 20, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: 0, z: 27, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: ['這層敵人有防禦 40，記得堆穿透', '熔岩池不能踩', '堤豐巨蛙會跳到你身上，看到紅圈立刻閃開'],
  spawns: [
    { enemy: 'lava_slime', x: -6, z: 12, count: 3, spread: 4 },
    { enemy: 'ember_frog', x: 6, z: 0, count: 3, spread: 4 },
    { enemy: 'lava_slime', x: -10, z: -6, count: 2, spread: 3 },
    { enemy: 'ember_frog', x: 12, z: 16, count: 2, spread: 3 },
    { enemy: 'magma_frog', x: 0, z: -21 },
  ],
  dungeon: { floor: 3, bossName: '堤豐巨蛙', enemyDefense: 40, unlockAfter: 'dungeon_2' },
};

/* ---------------- 多多納聖林 ----------------
 * 阿卡迪亞草原東側出口進入，需要 Lv.11。大片樹林（隨機但固定的配置）、濃霧、骷髏群，北邊石圈有菁英首領。
 */
function scatterTrees(seed: number, n: number, w: number, d: number, avoid: { x: number; z: number; r: number }[]): PropDef[] {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: PropDef[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const x = (rnd() - 0.5) * (w - 4);
    const z = (rnd() - 0.5) * (d - 4);
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    if (out.some((t) => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
    out.push({ kind: 'tree', x, z, h: 4 + rnd() * 2.5, color: 0x2f6b46 });
  }
  return out;
}

const MIST_CLEAR = [
  { x: -30, z: 20, r: 7 }, // 入口
  { x: -14, z: 14, r: 7 },
  { x: 8, z: 18, r: 7 },
  { x: 14, z: -2, r: 7 },
  { x: -12, z: -8, r: 7 },
  { x: 0, z: -24, r: 9 }, // 首領石圈
  { x: -22, z: 6, r: 4 },
  { x: -4, z: 4, r: 5 },
  { x: 4, z: -12, r: 4 },
];

const mistwood: ZoneDef = {
  id: 'mistwood',
  music: 'forest',
  kind: 'field',
  name: '多多納聖林',
  subtitle: '多多納聖林・Lv.11-25',
  region: '赫拉斯大陸',
  levelRange: [11, 25],
  minLevel: 11,
  lootTier: 4,
  safe: false,
  size: { w: 70, d: 64 },
  groundColor: 0x4f7a52,
  skyColor: 0x8fa8a0,
  fogColor: 0xb7c8c0,
  fogRange: [38, 78],
  mist: true,
  patches: [
    { x: -20, z: 20, w: 24, d: 5, color: 0x6e6450 },
    { x: -4, z: 8, w: 5, d: 26, color: 0x6e6450 },
    { x: 6, z: -6, w: 24, d: 5, color: 0x6e6450 },
    { x: 0, z: -18, w: 5, d: 18, color: 0x6e6450 },
    { x: 24, z: 22, w: 10, d: 8, color: 0x3a6a8a, water: true },
  ],
  props: [
    ...scatterTrees(20261102, 62, 70, 64, MIST_CLEAR.concat([{ x: -20, z: 20, r: 3 }, { x: -4, z: 8, r: 3 }, { x: 6, z: -6, r: 3 }, { x: 0, z: -14, r: 3 }])),
    { kind: 'stonering', x: 0, z: -24, w: 11, d: 11, color: 0x8a9a90 },
    ...pillarRing(0, -24, 6.2, 8, 0x7a8a80),
    { kind: 'decor', x: -27, z: 16, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -27, z: 24, h: 1.6, model: 'torch', solid: false },
    { kind: 'rock', x: -8, z: 0, color: 0x7a8a80 },
    { kind: 'rock', x: 18, z: 4, color: 0x7a8a80 },
    { kind: 'pillar', x: -16, z: -4, h: 1.8, color: 0x7a8a80 },
    { kind: 'pillar', x: 10, z: 14, h: 2.4, color: 0x7a8a80 },
    { kind: 'decor', x: 12, z: -26, h: 1.3, model: 'chest_gold' },
    { kind: 'decor', x: -12, z: 18, h: 1.0, model: 'rubble', solid: false },
  ],
  portals: [{ x: -33, z: 20, radius: 2.6, to: 'grassland', arrive: { x: 29, z: 4 }, label: '阿卡迪亞草原', style: 'edge' }],
  spawn: { x: -29, z: 20 },
  tips: ['多多納聖林需要 Lv.11', '黑卡蒂亡巫會從遠處施法，看到腳下紅圈就移動', '北邊石圈的龍牙將軍非常強，建議 Lv.22 以上', '這裡掉落第 4 階裝備'],
  spawns: [
    { enemy: 'skeleton_minion', x: -14, z: 14, count: 4, spread: 4 },
    { enemy: 'skeleton_rogue', x: 8, z: 18, count: 3, spread: 4 },
    { enemy: 'skeleton_minion', x: -4, z: 4, count: 2, spread: 3 },
    { enemy: 'skeleton_warrior', x: 14, z: -2, count: 3, spread: 4 },
    { enemy: 'skeleton_mage', x: -12, z: -8, count: 3, spread: 4 },
    { enemy: 'skeleton_warrior', x: 4, z: -12, count: 2, spread: 3 },
    { enemy: 'skeleton_lord', x: 0, z: -24 },
  ],
};

export const ZONES: Record<ZoneId, ZoneDef> = {
  town,
  grassland,
  dungeon_1: dungeon1,
  dungeon_2: dungeon2,
  dungeon_3: dungeon3,
  mistwood,
};

/** 世界地圖上的野外區域（含尚未實作者，僅供地圖頁顯示） */
export const WORLD_FIELDS: { name: string; range: string; zone?: ZoneId }[] = [
  { name: '雅典城（安全區）', range: '', zone: 'town' },
  { name: '阿卡迪亞草原', range: 'Lv.1-10', zone: 'grassland' },
  { name: '多多納聖林', range: 'Lv.11-25', zone: 'mistwood' },
  { name: '塔爾塔洛斯深淵', range: 'Lv.26-45' },
  { name: '冥王黑帝斯的國度', range: 'Lv.46-60' },
];

export const DUNGEON_ORDER: ZoneId[] = ['dungeon_1', 'dungeon_2', 'dungeon_3'];

/** 給存檔欄位用的短地名：雅典城、阿卡迪亞草原、第一層・波賽頓海岸… */
export function zoneLabel(id: string | undefined): string {
  const def = id ? ZONES[id as ZoneId] : undefined;
  if (!def) return '雅典城';
  if (def.kind === 'dungeon' && def.dungeon) return `第${'一二三四五'[def.dungeon.floor - 1]}層・${def.name}`;
  return def.subtitle.split('・')[0];
}
