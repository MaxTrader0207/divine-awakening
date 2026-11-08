import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 2・色雷斯食人馬廄（Lv.28，擊敗第 5 層首領後開放）
 * 色雷斯國王狄俄墨得斯用人肉餵養的牝馬，用鐵鍊拴在青銅馬槽上；奔跑時蹄下會打出雷光。
 * 只有魔王：狄俄墨得斯的食人馬（雷霆奔踏、蹄下落雷、後腿踢擊、馬群衝鋒）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_2',
  kind: 'field',
  music: 'wild',
  bossMusic: 'hunt',
  name: '色雷斯食人馬廄',
  subtitle: '色雷斯食人馬廄・神獸討伐',
  region: '色雷斯',
  levelRange: [26, 28],
  lootTier: 4,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x6a5a44,
  theme: 'mountain', // v1.93
  skyColor: 0x6a7a9a,
  fogColor: 0x8a8aa0,
  fogRange: [34, 80],
  patches: [
    // v1.96：馬廄前的泥地與乾草地
    { x: 0, z: 8, w: 6, d: 30, color: 0x6a5a48 },
    { x: -16, z: 6, w: 10, d: 22, color: 0x8a7a50 },
    { x: 16, z: 8, w: 10, d: 16, color: 0xa89a60 },
  ],
  props: [
    // v1.96：西側一排馬廄隔間（木牆）、東側乾草堆與食槽、散落的貨物
    ...[-2, 5, 12].map((z) => ({ kind: 'wall' as const, x: -16, z, w: 8, d: 0.6, h: 2.2, color: 0x7a5a3a })),
    { kind: 'wall', x: -20.2, z: 5, w: 0.6, d: 16, h: 2.6, color: 0x6a4a2e },
    { kind: 'decor', x: -13, z: 1.5, h: 0.9, model: 'sack', solid: false },
    { kind: 'decor', x: -13.5, z: 8.5, h: 1.0, model: 'barrel' },
    { kind: 'wall', x: 16, z: 2, w: 6, d: 1, h: 0.8, color: 0x6a4a2e },
    { kind: 'decor', x: 14, z: 10, h: 1.3, model: 'crates_stacked' },
    { kind: 'decor', x: 18, z: 12.5, h: 0.9, model: 'sack', solid: false },
    { kind: 'decor', x: 17.5, z: 14, h: 0.9, model: 'sack', solid: false },
    { kind: 'fence', x: 15, z: 18, w: 8, d: 0.4 },
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'fence', x: -14, z: -4, w: 0.4, d: 10 },
    { kind: 'fence', x: 14, z: -4, w: 0.4, d: 10 },
    { kind: 'decor', x: -15, z: 10, h: 1.0, model: 'barrel' },
    { kind: 'decor', x: 15, z: 12, h: 1.0, model: 'sack' },
    { kind: 'decor', x: 13, z: -18, h: 1.2, model: 'crates_stacked' },
    { kind: 'rock', x: -16, z: -18, color: 0x8a8070 },
    { kind: 'decor', x: -12, z: 16, h: 1.4, model: 'torch' },
    { kind: 'decor', x: 12, z: 16, h: 1.4, model: 'torch' },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '色雷斯食人馬廄：神獸討伐第 2 關，只有一隻魔王',
    '狄俄墨得斯的食人馬：色雷斯國王狄俄墨得斯用人肉餵養的牝馬，用鐵鍊拴在青銅馬槽上；奔跑時蹄下會打出雷光…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_mare', x: 0, z: -8 }],
  beast: { order: 2, unlockAfter: 'dungeon_5', icon: '🐎' },
};

export const diomedesStables: StageDef = {
  zone,
  enemies: {
    beast_mare: {
      id: 'beast_mare', name: '狄俄墨得斯的食人馬', level: 28, aggro: 'aggressive', shape: 'mare', boss: true, element: 'thunder',
      radius: 0.9, respawn: 90, scale: 1.75, color: 0x2a2428,
      stats: { maxHp: 111000, atk: 309, def: 87, moveSpeed: 4.0 },
      attack: melee(2.6, 0.5, 1.6),
      exp: 11200, gold: [3840, 4940], gems: 22,
      bossSkills: ['mare_stampede', 'mare_hoof_storm', 'mare_rear_kick', 'mare_herd'],
    },
  },
};
