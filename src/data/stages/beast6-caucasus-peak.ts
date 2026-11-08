import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 6・高加索懸崖（Lv.68，擊敗第 13 層首領後開放）
 * 宙斯派來懲罰普羅米修斯的巨鷹，每天飛到高加索山的懸崖，啄食被鎖住的泰坦的肝臟。
 * 只有魔王：高加索巨鷹（巨翼狂風、高空俯衝、銅羽風暴、旋風）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_6',
  kind: 'field',
  music: 'wild',
  bossMusic: 'hunt',
  name: '高加索懸崖',
  subtitle: '高加索懸崖・神獸討伐',
  region: '高加索山',
  levelRange: [66, 68],
  lootTier: 7,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x8a8478,
  skyColor: 0x9ab8d8,
  fogColor: 0xc0d0e0,
  fogRange: [34, 80],
  patches: [],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'rock', x: -16, z: -12, color: 0x8a8478 },
    { kind: 'rock', x: 16, z: -10, color: 0x8a8478 },
    { kind: 'rock', x: -16, z: 8, color: 0x8a8478 },
    { kind: 'rock', x: 16, z: 12, color: 0x8a8478 },
    { kind: 'pillar', x: 0, z: -22, color: 0x9a948a },
    { kind: 'decor', x: -12, z: -20, h: 1.0, model: 'rubble' },
    { kind: 'cypress', x: 14, z: 0 },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '高加索懸崖：神獸討伐第 6 關，只有一隻魔王',
    '高加索巨鷹：宙斯派來懲罰普羅米修斯的巨鷹，每天飛到高加索山的懸崖，啄食被鎖住的泰坦的肝臟。…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_caucasus', x: 0, z: -8 }],
  beast: { order: 6, unlockAfter: 'dungeon_13', icon: '🦅' },
};

export const caucasusPeak: StageDef = {
  zone,
  enemies: {
    beast_caucasus: {
      id: 'beast_caucasus', name: '高加索巨鷹', level: 68, aggro: 'aggressive', shape: 'caucasus', boss: true, element: 'wind',
      radius: 0.95, respawn: 90, scale: 1.9, color: 0x4a3a2a,
      stats: { maxHp: 330000, atk: 653, def: 247, moveSpeed: 4.2 },
      attack: melee(2.6, 0.5, 1.6),
      exp: 59000, gold: [19900, 24260], gems: 49,
      bossSkills: ['caucasus_gale_wing', 'caucasus_sky_dive', 'caucasus_feather_storm', 'caucasus_cyclone'],
    },
  },
};
