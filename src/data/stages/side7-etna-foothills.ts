import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing, row } from './helpers';

/**
 * 支線七・埃特納山麓（Lv.71-75，擊敗第十四層首領後開放）
 * 西西里的埃特納火山。泰坦之戰後，百臂巨人布里阿瑞俄斯被派來看守地底的囚牢，火山的隆隆聲就是他的腳步。
 * 小怪：熔岩石巨人、埃特納鍛工。守護者：百臂巨人布里阿瑞俄斯（土）——打倒後有機會收服成夥伴。
 */
const zone: ZoneDef = {
  id: 'side_7',
  kind: 'field',
  music: 'inferno',
  name: '埃特納山麓',
  subtitle: '埃特納山麓・支線・守護者',
  region: '西西里',
  levelRange: [71, 75],
  lootTier: 7,
  safe: false,
  size: { w: 52, d: 60 },
  groundColor: 0x4a3a32,
  skyColor: 0x8a5a48,
  fogColor: 0x6a4a3a,
  fogRange: [26, 72],
  patches: [
    { x: 0, z: 14, w: 4, d: 20, color: 0x6a5a50 },
    { x: 0, z: -11, w: 4, d: 12, color: 0x6a5a50 },
    { x: 0, z: 1, w: 12, d: 9, color: 0x5a4a42 },
    { x: 0, z: -23, w: 14, d: 12, color: 0x7a5a48 }, // 守護者祭壇
    { x: -15, z: 12, w: 6, d: 4, color: 0xff5a1a, water: true },
    { x: 15, z: -16, w: 6, d: 4, color: 0xff5a1a, water: true },
  ],
  props: [
    ...row('rock', -22, 26, 0, -6, 9, { color: 0x3a302c }),
    ...row('rock', 22, 25, 0, -6, 9, { color: 0x3a302c }),
    { kind: 'rock', x: -10, z: 16, color: 0x3a302c },
    { kind: 'rock', x: 11, z: 6, color: 0x3a302c },
    { kind: 'rock', x: -14, z: -6, color: 0x3a302c },
    { kind: 'crystal', x: -8, z: 2, color: 0xff7a2a },
    { kind: 'crystal', x: 8, z: -10, color: 0xff7a2a },
    { kind: 'decor', x: -6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 6, z: -19, h: 1.6, model: 'torch', solid: false },
    { kind: 'decor', x: 12, z: 18, h: 1.0, model: 'rubble', solid: false },
    { kind: 'stonering', x: 0, z: -23, w: 12, d: 12, color: 0x8a7060 },
    ...pillarRing(0, -23, 6.5, 8, 0x5a4a44),
    { kind: 'crystal', x: -3, z: -28, color: 0xff6a2a },
    { kind: 'crystal', x: 3, z: -28, color: 0xff6a2a },
    { kind: 'decor', x: 10, z: -27, h: 1.3, model: 'chest_gold' },
  ],
  portals: [{ x: 0, z: 29, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 24 },
  tips: [
    '埃特納山麓：支線地圖，擊敗第十四層首領後開放',
    '百臂巨人布里阿瑞俄斯是「守護者」——打倒牠有機會收服成夥伴（第 4 次一定成功）',
    '布里阿瑞俄斯是土屬性：土剋雷（獨眼巨人、阿爾戈斯）、被風剋',
    '百臂連拳會同時砸好幾排，站在兩排之間',
  ],
  spawns: [
    { enemy: 'lava_golem', x: -13, z: 8, count: 3, spread: 4 },
    { enemy: 'etna_smith', x: 13, z: 6, count: 3, spread: 4 },
    { enemy: 'lava_golem', x: 12, z: -13, count: 2, spread: 3 },
    { enemy: 'etna_smith', x: -12, z: -12, count: 2, spread: 3 },
    { enemy: 'guardian_briareos', x: 0, z: -23 },
  ],
  side: { guardian: 'guardian_briareos', unlockAfter: 'dungeon_14' },
};

export const etnaFoothills: StageDef = {
  zone,
  enemies: {
    lava_golem: {
      id: 'lava_golem', name: '熔岩石巨人', level: 72, aggro: 'aggressive', shape: 'golem',
      radius: 0.8, respawn: 12, scale: 1.15, color: 0x8a4a2a,
      stats: { maxHp: 11200, atk: 585, def: 260, moveSpeed: 2.4 },
      attack: melee(1.6, 0.6, 1.8),
      exp: 3150, gold: [230, 322],
    },
    etna_smith: {
      id: 'etna_smith', name: '埃特納鍛工', level: 74, aggro: 'aggressive', shape: 'cyclops',
      radius: 0.75, respawn: 12, scale: 1.0, color: 0x9a7a68,
      stats: { maxHp: 10000, atk: 592, def: 260, moveSpeed: 2.9 },
      attack: melee(1.6, 0.55, 1.7),
      exp: 3230, gold: [240, 336],
    },
    guardian_briareos: {
      id: 'guardian_briareos', name: '百臂巨人布里阿瑞俄斯', level: 75, aggro: 'aggressive', shape: 'briareos', boss: true, element: 'earth',
      radius: 0.9, respawn: 90, scale: 1.55, color: 0x9a8268,
      stats: { maxHp: 243000, atk: 520, def: 260, moveSpeed: 3.2 },
      attack: melee(2.4, 0.5, 1.6),
      exp: 41300, gold: [14500, 17800], gems: 41,
      bossSkills: ['bri_fists', 'bri_quake', 'bri_boulders', 'bri_slam'],
    },
  },
};
