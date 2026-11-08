import type { ZoneDef } from './types';

/**
 * 地圖主題（v1.92）：world/Dressing.ts 依主題替關卡加上
 * - 地面：顏色起伏（雜訊）、斑塊、道路 / 色塊的柔和邊緣、水邊的濕沙，地圖外圍的緩坡
 * - 邊界：可走範圍外一圈懸崖 / 樹林 / 冰岩 / 熔岩石（南邊壓低，免得擋鏡頭）
 * - 散佈裝飾：草叢、碎石、花、獸骨、貝殼、蘑菇、水晶碎片、餘燼…（InstancedMesh，每種 1 個 draw call，不擋路）
 * - 氣氛：飄落粒子（落葉、雪、火星、光點、灰燼、水氣）、光線顏色
 * - 探索點：寶箱（Game 的 updateTreasures：走近打開、給金幣 / 藥水，同一張圖 10 分鐘後再出現）
 *
 * 主題由 themeFor(def) 依背景音樂、地面顏色、種類自動判斷；ZoneDef.theme 可以指定主題 id 或覆寫部分參數。
 * 新增關卡不用另外設定就會有景觀；想調整就在關卡檔寫 theme: { ... }。
 */
export type ThemeId = 'meadow' | 'forest' | 'coast' | 'desert' | 'mountain' | 'volcanic' | 'underworld' | 'snow' | 'cave' | 'swamp';

export type ScatterKind = 'grass' | 'pebble' | 'flower' | 'bone' | 'shell' | 'mushroom' | 'shard' | 'ember' | 'twig' | 'snowclump' | 'reed' | 'skull';

export type BorderKind = 'cliff' | 'trees' | 'ice' | 'lava' | 'dunes' | 'reef' | 'ruins';

export type ParticleKind = 'leaf' | 'snow' | 'ember' | 'mote' | 'ash' | 'spray' | 'spore';

export interface ScatterDef {
  kind: ScatterKind;
  /** 每 100 平方公尺幾個 */
  density: number;
  /** 顏色（多個時每個隨機挑一個） */
  colors: number[];
  /** 大小倍率 */
  scale?: number;
  /** 也放在道路 / 色塊上（碎石、獸骨可以；草、花不行） */
  onPath?: boolean;
}

export interface MapTheme {
  ground: {
    /** 亮度起伏幅度（0.12 ＝ ±6%） */
    noise: number;
    /** 大塊斑紋的顏色與比例（0~1） */
    blotch?: number;
    blotchAmt?: number;
    /** 色塊（道路）邊緣的柔和寬度（公尺） */
    edge: number;
    /** 外圍緩坡最高幾公尺（南邊減半） */
    hills: number;
    /** 水邊濕沙顏色 */
    shore?: number;
  };
  border: { kind: BorderKind; colors: number[]; /** 每公尺邊界幾個 */ density: number; height: [number, number] };
  scatter: ScatterDef[];
  particles?: { kind: ParticleKind; colors: number[]; count: number };
  light: { sky: number; ground: number; hemi: number; sun: number; sunI: number };
  /** 寶箱數量（安全區 0） */
  treasures: number;
}

const BASE_LIGHT = { sky: 0xffffff, ground: 0x8a9a6a, hemi: 1.6, sun: 0xfff4e0, sunI: 2.2 };

export const THEMES: Record<ThemeId, MapTheme> = {
  meadow: {
    ground: { noise: 0.14, blotch: 0x8ab85a, blotchAmt: 0.35, edge: 1.1, hills: 5, shore: 0xc8b88a },
    border: { kind: 'trees', colors: [0x3f8a44, 0x4f9a4a, 0x5aa84e], density: 0.45, height: [3.5, 6] },
    scatter: [
      { kind: 'grass', density: 14, colors: [0x5a9a3a, 0x6aaa44, 0x4a8a34] },
      { kind: 'flower', density: 2.6, colors: [0xffe066, 0xff8aa8, 0xffffff, 0xb08aff] },
      { kind: 'pebble', density: 0.8, colors: [0xbfb6a0, 0xa8a090], onPath: true },
    ],
    particles: { kind: 'leaf', colors: [0xb8e070, 0xffffff, 0xffe9a0], count: 60 },
    light: BASE_LIGHT,
    treasures: 2,
  },
  forest: {
    ground: { noise: 0.18, blotch: 0x4a7a3a, blotchAmt: 0.4, edge: 1.2, hills: 6, shore: 0x7a8a5a },
    border: { kind: 'trees', colors: [0x2f6a3a, 0x3a7a40, 0x2a5a34], density: 0.7, height: [5, 8] },
    scatter: [
      { kind: 'grass', density: 7, colors: [0x3f7a34, 0x4a8a3a, 0x355f2c] },
      { kind: 'mushroom', density: 0.9, colors: [0xd04a3a, 0xe8d0a0, 0xb07040] },
      { kind: 'twig', density: 1.2, colors: [0x6a4a2a, 0x7a5a34], onPath: true },
      { kind: 'flower', density: 0.6, colors: [0xffffff, 0xc0a0ff] },
    ],
    particles: { kind: 'leaf', colors: [0xd8a040, 0xb86a2a, 0x8aa040], count: 80 },
    light: { sky: 0xf0ffe8, ground: 0x5a7a4a, hemi: 1.45, sun: 0xffe8c0, sunI: 2.0 },
    treasures: 3,
  },
  coast: {
    ground: { noise: 0.1, blotch: 0xe8dcb0, blotchAmt: 0.3, edge: 1.4, hills: 3, shore: 0xb8a878 },
    border: { kind: 'reef', colors: [0x9a8a70, 0xb0a088, 0x7a8a8a], density: 0.35, height: [1.5, 4] },
    scatter: [
      { kind: 'shell', density: 1.4, colors: [0xffe0d0, 0xf8c8a0, 0xffffff], onPath: true },
      { kind: 'pebble', density: 1.2, colors: [0xd8d0b8, 0xb8b0a0], onPath: true },
      { kind: 'grass', density: 2, colors: [0x8aa858, 0xa0b468] },
    ],
    particles: { kind: 'spray', colors: [0xe8f8ff, 0xc8eaff], count: 50 },
    light: { sky: 0xf4fbff, ground: 0x9aa890, hemi: 1.65, sun: 0xfff0d8, sunI: 2.3 },
    treasures: 2,
  },
  desert: {
    ground: { noise: 0.12, blotch: 0xd8b878, blotchAmt: 0.35, edge: 1.4, hills: 6, shore: 0xa89060 },
    border: { kind: 'dunes', colors: [0xc8a060, 0xb89050, 0xa88048], density: 0.3, height: [2.5, 6] },
    scatter: [
      { kind: 'pebble', density: 1.6, colors: [0xa89070, 0x8a7a5a], onPath: true },
      { kind: 'bone', density: 0.5, colors: [0xf0e8d0], onPath: true },
      { kind: 'twig', density: 0.6, colors: [0x8a6a40] },
      { kind: 'grass', density: 1.4, colors: [0xa8a050, 0x9a9048] },
    ],
    particles: { kind: 'ash', colors: [0xe8d0a0, 0xd8c090], count: 50 },
    light: { sky: 0xfff4e0, ground: 0xb09060, hemi: 1.55, sun: 0xffe0b0, sunI: 2.4 },
    treasures: 2,
  },
  mountain: {
    ground: { noise: 0.16, blotch: 0x9a9a7a, blotchAmt: 0.3, edge: 1.2, hills: 8, shore: 0x8a8a70 },
    border: { kind: 'cliff', colors: [0x8a7a62, 0x9a8a70, 0x7a6a56], density: 0.5, height: [3, 7] },
    scatter: [
      { kind: 'pebble', density: 2, colors: [0x9a9080, 0x8a8070, 0xaaa090], onPath: true },
      { kind: 'grass', density: 3.5, colors: [0x8a9a4a, 0x7a8a40] },
      { kind: 'flower', density: 0.4, colors: [0xffe066, 0xffffff] },
    ],
    particles: { kind: 'mote', colors: [0xfff0c0], count: 40 },
    light: { sky: 0xfff8e8, ground: 0x8a8a6a, hemi: 1.55, sun: 0xfff0d0, sunI: 2.3 },
    treasures: 2,
  },
  volcanic: {
    ground: { noise: 0.2, blotch: 0x3a2a24, blotchAmt: 0.35, edge: 1.0, hills: 6, shore: 0xa04020 },
    border: { kind: 'lava', colors: [0x3a302c, 0x4a3a34, 0x2a2420], density: 0.5, height: [3, 7] },
    scatter: [
      { kind: 'pebble', density: 1.8, colors: [0x2a2420, 0x4a3a30], onPath: true },
      { kind: 'ember', density: 0.9, colors: [0xff7a2a, 0xffb040], onPath: true },
      { kind: 'shard', density: 0.4, colors: [0x5a3a30] },
    ],
    particles: { kind: 'ember', colors: [0xff8a3a, 0xffc060, 0xff5a2a], count: 90 },
    light: { sky: 0xffd8c0, ground: 0x6a3a2a, hemi: 1.4, sun: 0xffc090, sunI: 2.2 },
    treasures: 2,
  },
  underworld: {
    ground: { noise: 0.18, blotch: 0x2a2438, blotchAmt: 0.4, edge: 1.0, hills: 5, shore: 0x3a5a6a },
    border: { kind: 'ruins', colors: [0x3a3448, 0x4a4458, 0x2a2638], density: 0.45, height: [3, 6.5] },
    scatter: [
      { kind: 'bone', density: 0.9, colors: [0xd8d0c0], onPath: true },
      { kind: 'skull', density: 0.25, colors: [0xe0d8c8], onPath: true },
      { kind: 'shard', density: 0.6, colors: [0x8a6aff, 0x5ad0c0] },
      { kind: 'pebble', density: 1.2, colors: [0x3a3448, 0x4a4458], onPath: true },
    ],
    particles: { kind: 'mote', colors: [0x9a8aff, 0x6ae0d0], count: 70 },
    light: { sky: 0xd8d0ff, ground: 0x3a3450, hemi: 1.35, sun: 0xd8d0ff, sunI: 1.9 },
    treasures: 2,
  },
  snow: {
    ground: { noise: 0.08, blotch: 0xffffff, blotchAmt: 0.4, edge: 1.4, hills: 7, shore: 0xa8c0d0 },
    border: { kind: 'ice', colors: [0xe8f4ff, 0xc8e0f0, 0xa8c8e0], density: 0.45, height: [3, 7] },
    scatter: [
      { kind: 'snowclump', density: 1.6, colors: [0xffffff, 0xeaf4ff] },
      { kind: 'shard', density: 0.5, colors: [0xa8e0ff, 0xc8f0ff] },
      { kind: 'pebble', density: 0.8, colors: [0x8a98a8], onPath: true },
    ],
    particles: { kind: 'snow', colors: [0xffffff, 0xeaf6ff], count: 110 },
    light: { sky: 0xf0f8ff, ground: 0xa0b4c8, hemi: 1.7, sun: 0xf0f4ff, sunI: 2.1 },
    treasures: 2,
  },
  cave: {
    ground: { noise: 0.16, blotch: 0x5a5a64, blotchAmt: 0.3, edge: 1.0, hills: 6, shore: 0x4a6a70 },
    border: { kind: 'cliff', colors: [0x4a4a54, 0x5a5a64, 0x3a3a44], density: 0.55, height: [3.5, 7.5] },
    scatter: [
      { kind: 'pebble', density: 1.8, colors: [0x5a5a64, 0x6a6a74], onPath: true },
      { kind: 'shard', density: 0.6, colors: [0x6fe3ff, 0x9a8aff] },
      { kind: 'mushroom', density: 0.4, colors: [0x6ae0c0, 0x8ac0ff] },
    ],
    particles: { kind: 'spore', colors: [0x9ae8ff, 0xc8b0ff], count: 60 },
    light: { sky: 0xe0e8ff, ground: 0x4a4a5a, hemi: 1.45, sun: 0xe8ecff, sunI: 2.0 },
    treasures: 2,
  },
  swamp: {
    ground: { noise: 0.18, blotch: 0x3a4a2a, blotchAmt: 0.45, edge: 1.2, hills: 4, shore: 0x4a5a34 },
    border: { kind: 'trees', colors: [0x3a5a34, 0x4a6a3a, 0x2a4a2a], density: 0.55, height: [4, 7] },
    scatter: [
      { kind: 'reed', density: 3, colors: [0x6a8a3a, 0x8a9a4a] },
      { kind: 'mushroom', density: 0.7, colors: [0xb0c060, 0x8a6aaa] },
      { kind: 'grass', density: 4, colors: [0x4a6a30, 0x5a7a38] },
    ],
    particles: { kind: 'spore', colors: [0xc8e070, 0xa0d060], count: 70 },
    light: { sky: 0xe8f0d8, ground: 0x4a5a3a, hemi: 1.45, sun: 0xf0f0c8, sunI: 2.0 },
    treasures: 2,
  },
};

/** 關卡檔可以寫的覆寫：主題 id，或主題 id＋部分參數 */
export type ThemeOverride = ThemeId | ({ base?: ThemeId } & Partial<Omit<MapTheme, 'ground' | 'border' | 'light'>> & {
  ground?: Partial<MapTheme['ground']>;
  border?: Partial<MapTheme['border']>;
  light?: Partial<MapTheme['light']>;
});

/** 依背景音樂、地面顏色、種類自動挑主題（關卡檔沒指定 theme 時） */
export function autoTheme(def: Pick<ZoneDef, 'music' | 'groundColor' | 'kind' | 'id'>): ThemeId {
  const c = def.groundColor;
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const l = (r + g + b) / 3;
  if (def.music === 'sea') return 'coast';
  if (def.music === 'forest') return 'forest';
  if (def.music === 'grassland' || def.music === 'town') return 'meadow';
  if (def.music === 'inferno') return l < 0.28 && b >= r * 0.9 ? 'underworld' : 'volcanic';
  if (b > 0.75 && l > 0.72) return 'snow';
  if (l < 0.35) return b > r ? 'underworld' : 'cave';
  if (g > r && g > b && l < 0.5) return 'swamp';
  if (g > r * 1.05 && g > b) return 'meadow';
  if (r > b * 1.35 && l > 0.5) return 'desert';
  return def.kind === 'dungeon' && !def.music ? 'cave' : 'mountain';
}

export function themeFor(def: ZoneDef): MapTheme {
  const o = def.theme || undefined;
  const baseId: ThemeId = typeof o === 'string' ? o : (o?.base ?? autoTheme(def));
  const base = THEMES[baseId];
  if (!o || typeof o === 'string') return base;
  return {
    ...base,
    ...o,
    ground: { ...base.ground, ...o.ground },
    border: { ...base.border, ...o.border },
    light: { ...base.light, ...o.light },
    scatter: o.scatter ?? base.scatter,
    particles: o.particles === undefined ? base.particles : o.particles,
    treasures: o.treasures ?? base.treasures,
  } as MapTheme;
}
