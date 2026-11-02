import type { PropDef, ZoneDef, ZoneId } from './types';

/* 小工具：產生一排物件，減少重複資料 */
function row(kind: PropDef['kind'], x0: number, z0: number, dx: number, dz: number, n: number, extra: Partial<PropDef> = {}): PropDef[] {
  return Array.from({ length: n }, (_, i) => ({ kind, x: x0 + dx * i, z: z0 + dz * i, ...extra }));
}

const town: ZoneDef = {
  id: 'town',
  kind: 'town',
  name: '艾爾芙大陸',
  subtitle: '主城艾爾芙・安全區',
  region: '艾爾芙大陸',
  safe: true,
  size: { w: 56, d: 64 },
  groundColor: 0x9fbf6a,
  skyColor: 0xbfe3f2,
  fogColor: 0xcfe6ee,
  patches: [
    { x: 0, z: 0, w: 14, d: 64, color: 0xd9d2bf }, // 南北大道
    { x: 0, z: -8, w: 56, d: 10, color: 0xd9d2bf }, // 東西大街（商店街）
    { x: 0, z: 8, w: 22, d: 22, color: 0xcfc7b2 }, // 中央廣場
  ],
  props: [
    { kind: 'fountain', x: 0, z: 8 },
    { kind: 'house', x: -12, z: -18, w: 10, d: 8, color: 0x3d6fb6, sign: '武器店' },
    { kind: 'house', x: 12, z: -18, w: 10, d: 8, color: 0x3d6fb6, sign: '防具店' },
    { kind: 'house', x: -22, z: -18, w: 7, d: 8, color: 0x4a7cc2, sign: '道具店' },
    { kind: 'house', x: 22, z: -18, w: 7, d: 8, color: 0x4a7cc2, sign: '強化屋' },
    { kind: 'house', x: -20, z: 8, w: 9, d: 12, color: 0x3d6fb6 },
    { kind: 'house', x: 20, z: 8, w: 9, d: 12, color: 0x3d6fb6 },
    { kind: 'house', x: -20, z: 24, w: 9, d: 9, color: 0x5a86c6 },
    { kind: 'house', x: 20, z: 24, w: 9, d: 9, color: 0x5a86c6 },
    ...row('lamp', -6, -24, 0, 8, 7),
    ...row('lamp', 6, -24, 0, 8, 7),
    ...row('tree', -26, -28, 6, 0, 3),
    ...row('tree', 14, -28, 6, 0, 3),
  ],
  portals: [
    { x: 0, z: 30, radius: 2.6, to: 'grassland', arrive: { x: 0, z: -24 }, label: '新手草原', style: 'edge' },
    { x: 0, z: 1.5, radius: 1.6, to: 'dungeon_1', arrive: { x: 0, z: 20 }, label: '傳送石', style: 'stone' },
  ],
  spawn: { x: 0, z: 14 },
  tips: ['主城中央的傳送石可以前往海岸古道等副本地區', '商店街就在主城的東西大街上', '往南走可以進入新手草原'],
};

const grassland: ZoneDef = {
  id: 'grassland',
  kind: 'field',
  name: '艾爾芙大陸',
  subtitle: '新手草原・Lv.1-10',
  region: '艾爾芙大陸',
  levelRange: [1, 10],
  safe: false,
  size: { w: 70, d: 60 },
  groundColor: 0x86c24f,
  skyColor: 0xbfe3f2,
  fogColor: 0xd2ebd2,
  patches: [
    { x: 0, z: -18, w: 8, d: 24, color: 0xc9b98f },
    { x: 8, z: 4, w: 30, d: 6, color: 0xc9b98f },
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
  ],
  portals: [{ x: 0, z: -28, radius: 2.6, to: 'town', arrive: { x: 0, z: 26 }, label: '主城艾爾芙', style: 'edge' }],
  spawn: { x: 0, z: -24 },
  tips: ['訓練木樁在草原東側，可以測試不同防禦下的傷害', '敵人防禦越高越需要穿透', '按住普攻鍵可以連續攻擊'],
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

const dungeon1: ZoneDef = {
  id: 'dungeon_1',
  kind: 'dungeon',
  name: '海岸古道',
  subtitle: '第一層・入口與西側',
  region: '海岸古道',
  levelRange: [1, 5],
  safe: false,
  size: { w: 50, d: 56 },
  groundColor: 0xe6cf95,
  skyColor: 0xbfe3f2,
  fogColor: 0xe9e2c8,
  patches: [
    { x: 18, z: 0, w: 14, d: 56, color: 0x4fb3d9, water: true },
    { x: -10, z: -16, w: 22, d: 18, color: 0x8fc15a },
  ],
  props: [
    { kind: 'palm', x: 8, z: 18 },
    { kind: 'palm', x: 9, z: -4 },
    { kind: 'palm', x: -18, z: 16 },
    { kind: 'rock', x: -6, z: 6 },
    { kind: 'rock', x: 4, z: -10 },
    { kind: 'pillar', x: -14, z: 4 },
    { kind: 'pillar', x: 2, z: 12 },
    { kind: 'tree', x: -18, z: -22 },
    { kind: 'tree', x: -2, z: -22 },
    { kind: 'stairs', x: -10, z: -6, w: 6, d: 4 },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 20 },
  tips: ['首領巨鉗蟹王在高台東北的石圈', '被攻擊時會自動反擊最近的敵人', '留意主動怪：泡咪潮蛙受到攻擊才會反擊'],
  spawns: [
    { enemy: 'hermit_crab', x: -8, z: 10, count: 3, spread: 4 },
    { enemy: 'bubble_frog', x: -2, z: -2, count: 3, spread: 4 },
    { enemy: 'hermit_crab', x: -16, z: -4, count: 2, spread: 3 },
    { enemy: 'crab_king', x: -10, z: -20 },
  ],
  dungeon: { floor: 1, bossName: '巨鉗蟹王', enemyDefense: 0 },
};

const dungeon2: ZoneDef = {
  ...dungeon1,
  id: 'dungeon_2',
  name: '珊瑚洞窟',
  subtitle: '第二層・洞窟入口',
  region: '珊瑚洞窟',
  levelRange: [5, 10],
  groundColor: 0x7aa7b8,
  fogColor: 0x9cc3cf,
  patches: [{ x: -16, z: 0, w: 12, d: 56, color: 0x3a8fb5, water: true }],
  props: [
    { kind: 'rock', x: 0, z: 0, color: 0xe58a8a },
    { kind: 'rock', x: 10, z: -12, color: 0xe58a8a },
    { kind: 'pillar', x: 6, z: 10 },
    { kind: 'pillar', x: -4, z: -14 },
  ],
  tips: ['這層敵人有防禦 18，記得堆穿透'],
  spawns: [
    { enemy: 'coral_slime', x: 4, z: 10, count: 3, spread: 4 },
    { enemy: 'cave_bat', x: -2, z: -6, count: 3, spread: 4 },
    { enemy: 'coral_slime', x: 10, z: -2, count: 2, spread: 3 },
    { enemy: 'tide_golem', x: 6, z: -20 },
  ],
  dungeon: { floor: 2, bossName: '潮汐古魔像', enemyDefense: 18, unlockAfter: 'dungeon_1' },
};

const dungeon3: ZoneDef = {
  ...dungeon1,
  id: 'dungeon_3',
  name: '熔心火山口',
  subtitle: '第三層・焦土入口',
  region: '熔心火山口',
  levelRange: [10, 15],
  groundColor: 0xa8774f,
  skyColor: 0xd8b49a,
  fogColor: 0xc99a7a,
  patches: [{ x: 16, z: -10, w: 10, d: 14, color: 0xe86a2a, water: true }],
  props: [
    { kind: 'rock', x: -6, z: 4, color: 0x6b4a36 },
    { kind: 'rock', x: 6, z: -6, color: 0x6b4a36 },
    { kind: 'pillar', x: -12, z: -10 },
  ],
  tips: ['這層敵人有防禦 40，記得堆穿透'],
  spawns: [
    { enemy: 'lava_slime', x: -6, z: 10, count: 3, spread: 4 },
    { enemy: 'ember_frog', x: 4, z: -4, count: 3, spread: 4 },
    { enemy: 'lava_slime', x: -12, z: -6, count: 2, spread: 3 },
    { enemy: 'magma_frog', x: 0, z: -20 },
  ],
  dungeon: { floor: 3, bossName: '熔心巨蛙', enemyDefense: 40, unlockAfter: 'dungeon_2' },
};

export const ZONES: Record<ZoneId, ZoneDef> = {
  town,
  grassland,
  dungeon_1: dungeon1,
  dungeon_2: dungeon2,
  dungeon_3: dungeon3,
};

/** 世界地圖上的野外區域（含尚未實作者，僅供地圖頁顯示） */
export const WORLD_FIELDS: { name: string; range: string; zone?: ZoneId }[] = [
  { name: '主城（安全區）', range: '', zone: 'town' },
  { name: '新手草原', range: 'Lv.1-10', zone: 'grassland' },
  { name: '迷霧森林', range: 'Lv.11-25' },
  { name: '黑暗山谷', range: 'Lv.26-45' },
  { name: '魔王領地', range: 'Lv.46-60' },
];

export const DUNGEON_ORDER: ZoneId[] = ['dungeon_1', 'dungeon_2', 'dungeon_3'];
