import type { StageDef, ZoneDef } from '../types';
import { melee, pillarRing } from './helpers';

/**
 * 神獸討伐 3・阿文提諾火窟（Lv.38，擊敗第 7 層首領後開放）
 * 火神赫菲斯托斯的兒子，住在阿文提諾山的洞窟裡，口中噴火，偷走了海克力斯的牛還倒著拖進洞裡。
 * 只有魔王：吐火巨人卡庫斯（烈焰吐息、石棒震地、熔岩吐彈、火山灰雨）。第一次打倒額外送鑽石（systems/BeastHunt.ts）。
 * 由 scratchpad 的 gen/gen_beasts.py 產生，之後直接改這個檔即可。
 */
const zone: ZoneDef = {
  id: 'beast_3',
  kind: 'field',
  music: 'inferno',
  bossMusic: 'boss',
  name: '阿文提諾火窟',
  subtitle: '阿文提諾火窟・神獸討伐',
  region: '阿文提諾山',
  levelRange: [36, 38],
  lootTier: 5,
  safe: false,
  size: { w: 44, d: 56 },
  groundColor: 0x4a3a34,
  skyColor: 0x3a1a14,
  fogColor: 0x6a3a2a,
  fogRange: [34, 80],
  patches: [{ x: -15, z: -16, w: 5, d: 4, color: 0xff5a1a, water: true }, { x: 16, z: -16, w: 4, d: 4, color: 0xff5a1a, water: true }],
  props: [
    { kind: 'stonering', x: 0, z: -8, w: 18, d: 18, color: 0xd8d0c0 },
    ...pillarRing(0, -8, 11, 10, 0xe8e4d8),
    { kind: 'rock', x: -15, z: -8, color: 0x3a2a24 },
    { kind: 'rock', x: 16, z: -2, color: 0x3a2a24 },
    { kind: 'crystal', x: -12, z: -20, color: 0xff7a2a },
    { kind: 'crystal', x: 12, z: -20, color: 0xff7a2a },
    { kind: 'decor', x: -14, z: 14, h: 1.4, model: 'torch' },
    { kind: 'decor', x: 14, z: 14, h: 1.4, model: 'torch' },
    { kind: 'decor', x: 16, z: 8, h: 1.0, model: 'rubble' },
  ],
  portals: [{ x: 0, z: 26, radius: 2.4, to: 'town', arrive: { x: 0, z: 4 }, label: '回到主城', style: 'edge' }],
  spawn: { x: 0, z: 21 },
  tips: [
    '阿文提諾火窟：神獸討伐第 3 關，只有一隻魔王',
    '吐火巨人卡庫斯：火神赫菲斯托斯的兒子，住在阿文提諾山的洞窟裡，口中噴火，偷走了海克力斯的牛還倒著…',
    '首領會記住你怎麼躲招——一直躲同樣的方式，牠的預警會越來越短',
  ],
  spawns: [{ enemy: 'beast_cacus', x: 0, z: -8 }],
  beast: { order: 3, unlockAfter: 'dungeon_7', icon: '🔥' },
};

export const aventineCave: StageDef = {
  zone,
  enemies: {
    beast_cacus: {
      id: 'beast_cacus', name: '吐火巨人卡庫斯', level: 38, aggro: 'aggressive', shape: 'cacus', boss: true, element: 'fire',
      radius: 1.0, respawn: 90, scale: 1.45, color: 0x8a3a2a,
      stats: { maxHp: 153000, atk: 384, def: 127, moveSpeed: 2.8 },
      attack: melee(3.0, 0.6, 1.8),
      exp: 19700, gold: [6620, 8350], gems: 29,
      bossSkills: ['cacus_fire_breath', 'cacus_club_quake', 'cacus_magma_spit', 'cacus_ember_rain'],
    },
  },
};
