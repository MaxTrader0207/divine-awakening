import type { StageDef, ZoneDef } from '../types';
import { melee, row } from './helpers';

/**
 * 阿卡迪亞草原（野外 Lv.1-10）
 * 新手區：潘神軟泥、德律阿得菇；東側有三個不同防禦的斯巴達訓練木樁；東邊出口通往多多納聖林，西邊出口通往德爾斐山徑（v1.62）。
 */
const zone: ZoneDef = {
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
    { x: -33, z: 4, radius: 2.4, to: 'delphi_path', arrive: { x: 24, z: 20 }, label: '德爾斐山徑 Lv.8', style: 'edge' },
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

export const grassland: StageDef = {
  zone,
  enemies: {
    training_dummy: {
      id: 'training_dummy', name: '斯巴達訓練木樁', level: 1, aggro: 'none', shape: 'dummy',
      radius: 0.6, respawn: 2.5, scale: 1.25, color: 0xb0814f,
      stats: { maxHp: 400, atk: 0, def: 0, moveSpeed: 0 },
      exp: 0, gold: [0, 0],
    },
    green_slime: {
      id: 'green_slime', name: '潘神軟泥', level: 2, aggro: 'aggressive', shape: 'slime',
      radius: 0.6, respawn: 12, scale: 1, color: 0x6fd36a,
      stats: { maxHp: 130, atk: 16, def: 0, moveSpeed: 2.6 },
      attack: melee(1.1, 0.5, 1.6),
      exp: 14, gold: [3, 6],
    },
    meadow_mushroom: {
      id: 'meadow_mushroom', name: '德律阿得菇', level: 4, aggro: 'passive', shape: 'mushroom',
      radius: 0.6, respawn: 12, scale: 1.1, color: 0xd9584a,
      stats: { maxHp: 230, atk: 22, def: 3, moveSpeed: 2.4 },
      attack: melee(1.2, 0.6, 1.8),
      exp: 24, gold: [5, 9],
    },
  },
};
