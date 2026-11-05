import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, scatterTrees } from './helpers';

/**
 * 支線八・希俄斯島獵場（Lv.81-85，擊敗第十六層首領後開放）
 * 獵人俄里翁誇口要殺光大地上所有野獸，大地女神蓋亞派出一隻巨蠍刺死了他——兩者後來都成了天上的星座。
 * 小怪：毒蠍幼體、俄里翁的獵犬。守護者：天蠍斯科爾皮俄斯（毒）——打倒後有機會收服成夥伴。
 */
const CLEAR = [
  { x: 0, z: 24, r: 6 },
  { x: 0, z: 1, r: 7 },
  { x: -13, z: 8, r: 5 },
  { x: 13, z: 6, r: 5 },
  { x: -12, z: -12, r: 5 },
  { x: 12, z: -13, r: 5 },
  { x: 0, z: -23, r: 9 },
  { x: 0, z: 13, r: 3 },
  { x: 0, z: -11, r: 3 },
];

const zone: ZoneDef = {
  id: 'side_8',
  kind: 'field',
  music: 'forest',
  name: '希俄斯島獵場',
  subtitle: '希俄斯島獵場・支線・守護者',
  region: '希俄斯島',
  levelRange: [81, 85],
  lootTier: 7,
  safe: false,
  size: { w: 50, d: 58 },
  groundColor: 0x6a7a40,
  skyColor: 0x5a6a8a,
  fogColor: 0x8a9a7a,
  fogRange: [26, 74],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0x8a7a4a },
    { x: 0, z: -11, w: 4, d: 12, color: 0x8a7a4a },
    { x: 0, z: 1, w: 12, d: 9, color: 0x7a8a48 },
    { x: 0, z: -23, w: 14, d: 12, color: 0x6a6a40 }, // 守護者祭壇
    { x: 15, z: 18, w: 6, d: 4, color: 0x4a7a5a, water: true },
  ],
  props: [
    ...scatterTrees(20261108, 36, 50, 58, CLEAR),
    { kind: 'rock', x: -9, z: 6, color: 0x6a6a58 },
    { kind: 'rock', x: 9, z: -6, color: 0x6a6a58 },
    { kind: 'decor', x: -6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: -12, z: 16, h: 1.2, model: 'tent' },
    { kind: 'decor', x: 13, z: 17, h: 1.0, model: 'weaponrack' },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0x9a9a70 },
    ...pillarRing(0, -23, 6.5, 8, 0xb8b490),
    { kind: 'crystal', x: -3, z: -28, color: 0xb6ff4a },
    { kind: 'crystal', x: 3, z: -28, color: 0xb6ff4a },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 28, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 23 },
  tips: [
    '希俄斯島獵場：支線地圖，擊敗第十六層首領後開放',
    '天蠍斯科爾皮俄斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '天蠍是毒屬性：毒和金互剋——對塔洛斯、涅墨亞獅、革律翁特別有效，也比較怕牠們',
    '鑽地突襲會從你腳下鑽出，看到預警就離開',
  ],
  spawns: [
    { enemy: 'scorp_brood', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'orion_hound', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'scorp_brood', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'orion_hound', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_scorpius', x: 0, z: -23 },
  ],
  side: { guardian: 'guardian_scorpius', unlockAfter: 'dungeon_16' },
};

export const chiosHuntingGround: StageDef = {
  zone,
  enemies: {
    scorp_brood: {
      id: 'scorp_brood', name: '毒蠍幼體', level: 82, aggro: 'aggressive', shape: 'crab',
      radius: 0.7, respawn: 12, scale: 1.2, color: 0x4a3a5a,
      stats: { maxHp: 11500, atk: 672, def: 300, moveSpeed: 3.4 },
      attack: melee(1.4, 0.5, 1.5),
      exp: 3980, gold: [280, 392],
    },
    orion_hound: {
      id: 'orion_hound', name: '俄里翁的獵犬', level: 84, aggro: 'aggressive', shape: 'hound',
      radius: 0.6, respawn: 12, scale: 1.05, color: 0x6a5a48,
      stats: { maxHp: 10800, atk: 684, def: 300, moveSpeed: 5.2 },
      attack: melee(1.4, 0.4, 1.3),
      exp: 4080, gold: [292, 408],
    },
    guardian_scorpius: {
      id: 'guardian_scorpius', name: '天蠍斯科爾皮俄斯', level: 85, aggro: 'aggressive', shape: 'scorpius', boss: true, element: 'poison',
      radius: 0.9, respawn: 90, scale: 1.7, color: 0x3a2a4a,
      stats: { maxHp: 272000, atk: 589, def: 300, moveSpeed: 3.6 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 51800, gold: [18200, 22200], gems: 47,
      bossSkills: ['scorp_sting', 'scorp_spray', 'scorp_burrow', 'scorp_cloud'],
    },
  },
};
