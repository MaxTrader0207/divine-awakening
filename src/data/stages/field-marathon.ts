import type { StageDef, ZoneDef } from '../types';
import { melee, row } from './helpers';

/**
 * 馬拉松古戰場（野外 Lv.12-18，需要 Lv.12；v1.62）
 * 德爾斐山徑北邊出口進入。雅典人擊退波斯大軍的海邊平原，傳令兵從這裡一路跑回雅典報捷。
 * 戰死者的亡魂還在原野上遊蕩；忒修斯降伏的馬拉松公牛也回來了。
 * 掉落 3～4 階（各半）。菁英首領：馬拉松公牛（火，會噴火的克里特公牛）。東邊出口通往特洛伊海灘。
 */
const zone: ZoneDef = {
  id: 'marathon_field',
  music: 'wild',
  kind: 'field',
  name: '馬拉松古戰場',
  subtitle: '馬拉松古戰場・Lv.12-18',
  region: '赫拉斯大陸',
  levelRange: [12, 18],
  minLevel: 12,
  lootTier: 3,
  lootTiers: [3, 4],
  safe: false,
  size: { w: 66, d: 60 },
  groundColor: 0xa8a066,
  skyColor: 0xd8c8a0,
  fogColor: 0xe0d4b4,
  fogRange: [42, 92],
  patches: [
    { x: 0, z: 14, w: 5, d: 26, color: 0xb8a878 },
    { x: 12, z: -4, w: 40, d: 5, color: 0xb8a878 },
    { x: -14, z: -14, w: 16, d: 12, color: 0x8a8050 }, // 波斯營地遺址
    { x: 14, z: 14, w: 14, d: 10, color: 0x8a8050 },
    { x: -28, z: 10, w: 8, d: 36, color: 0x4a8ab8, water: true }, // 海灣
    { x: 0, z: -20, w: 14, d: 10, color: 0x9a7a5a }, // 公牛的牧地
  ],
  props: [
    ...row('rock', 30, 24, 0, -8, 7, { color: 0x8a7a5a }),
    { kind: 'rock', x: -8, z: 2, w: 4, h: 3, d: 4, color: 0x9a8a6a }, // 雅典人的墳丘
    { kind: 'statue', x: -8, z: 6, rot: 0 },
    { kind: 'decor', x: -16, z: -12, h: 1.2, model: 'tent' },
    { kind: 'decor', x: -11, z: -17, h: 1.2, model: 'tent' },
    { kind: 'decor', x: -18, z: -18, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'decor', x: 12, z: 12, h: 1.0, model: 'weaponrack' },
    { kind: 'decor', x: 17, z: 16, h: 1.0, model: 'rubble', solid: false },
    { kind: 'decor', x: 8, z: 18, h: 1.0, model: 'banner_red', solid: false },
    { kind: 'olive', x: 16, z: 4 },
    { kind: 'olive', x: -4, z: 20 },
    { kind: 'olive', x: 22, z: -14 },
    { kind: 'cypress', x: 6, z: 24 },
    { kind: 'cypress', x: -6, z: -26 },
    { kind: 'stonering', x: 0, z: -20, w: 11, d: 11, color: 0x8a6a4a },
    { kind: 'decor', x: 8, z: -25, h: 1.3, model: 'chest_gold' },
  ],
  portals: [
    { x: 0, z: 28, radius: 2.4, to: 'delphi_path', arrive: { x: 0, z: -26 }, label: '德爾斐山徑', style: 'edge' },
    { x: 32, z: -4, radius: 2.4, to: 'troy_beach', arrive: { x: -30, z: 0 }, label: '特洛伊海灘 Lv.15', style: 'edge' },
  ],
  spawn: { x: 0, z: 24 },
  tips: ['馬拉松古戰場需要 Lv.12，掉落 3～4 階裝備（各一半）', '馬拉松亡魂弓手會從遠處放箭，看到腳下紅圈就移動', '南邊牧地的馬拉松公牛會衝撞、噴火，是菁英首領', '東邊出口通往特洛伊海灘'],
  spawns: [
    { enemy: 'marathon_hoplite', x: 0, z: 10, count: 3, spread: 4 },
    { enemy: 'marathon_archer', x: -14, z: -12, count: 3, spread: 4 },
    { enemy: 'marathon_ox', x: 14, z: 14, count: 3, spread: 4 },
    { enemy: 'marathon_hoplite', x: 18, z: -6, count: 2, spread: 3 },
    { enemy: 'marathon_bull', x: 0, z: -20 },
    { enemy: 'battlefield_dog', x: -14, z: -12, count: 2, spread: 3.5 }, // v1.63
    { enemy: 'stymphalian_bird', x: 18, z: -6, count: 2, spread: 3.5 }, // v1.63
  ],
};

export const marathonField: StageDef = {
  zone,
  enemies: {
    marathon_hoplite: {
      id: 'marathon_hoplite', name: '雅典重裝亡魂', level: 13, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_warrior',
      radius: 0.6, respawn: 12, scale: 1.05, color: 0xe8e2d0,
      stats: { maxHp: 1150, atk: 108, def: 32, moveSpeed: 2.7 },
      attack: melee(1.5, 0.55, 1.6),
      exp: 150, gold: [26, 40],
    },
    marathon_archer: {
      id: 'marathon_archer', name: '波斯亡魂弓手', level: 15, aggro: 'aggressive', shape: 'skeleton', model: 'skeleton_mage', ranged: true,
      radius: 0.55, respawn: 12, scale: 1, color: 0xe8e2d0,
      stats: { maxHp: 950, atk: 122, def: 30, moveSpeed: 2.5 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 175, gold: [30, 46],
    },
    marathon_ox: {
      id: 'marathon_ox', name: '馬拉松野牛', level: 17, aggro: 'aggressive', shape: 'bull',
      radius: 0.75, respawn: 12, scale: 0.85, color: 0x7a5a3a,
      stats: { maxHp: 1550, atk: 136, def: 36, moveSpeed: 3.8 },
      attack: melee(1.6, 0.55, 1.7),
      exp: 205, gold: [34, 52],
    },
    marathon_bull: {
      id: 'marathon_bull', name: '馬拉松公牛', level: 19, aggro: 'aggressive', shape: 'bull', boss: true, element: 'fire',
      radius: 0.85, respawn: 120, scale: 1.6, color: 0x9a3a2a,
      stats: { maxHp: 50000, atk: 200, def: 42, moveSpeed: 3.4 },
      attack: melee(2.5, 0.55, 1.7),
      exp: 3300, gold: [1100, 1500], gems: 9,
      bossSkills: ['bull_rush', 'lava_spit', 'ground_slam'],
    },
    battlefield_dog: {
      id: 'battlefield_dog', name: '戰場野狗', level: 14, aggro: 'aggressive', shape: 'hound',
      radius: 0.55, respawn: 12, scale: 1.1, color: 0x7a6a52,
      stats: { maxHp: 890, atk: 112, def: 29, moveSpeed: 5.0 },
      attack: melee(1.3, 0.35, 1.2),
      exp: 170, gold: [31, 44],
    },
    stymphalian_bird: {
      id: 'stymphalian_bird', name: '斯廷法利斯怪鳥', level: 16, aggro: 'aggressive', shape: 'harpy', ranged: true,
      radius: 0.55, respawn: 12, scale: 1.05, color: 0x8a8a9a,
      stats: { maxHp: 1080, atk: 139, def: 33, moveSpeed: 2.6 },
      attack: { range: 7, windup: 0.9, cooldown: 2.4 },
      exp: 250, gold: [40, 57],
    },
  },
};
