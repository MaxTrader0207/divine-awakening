import type { EnemyDef } from './types';

/**
 * 敵人資料表
 * ------------------------------------------------------------
 * 數值基準（見 docs/BALANCE.md）：
 * - 同等級法師普攻 3~6 下打倒小怪；小怪 4~8 下打倒同等級法師（不喝藥）。
 * - 副本 2 / 3 層的防禦 18 / 40 會讓沒有穿透、等級不足的法師打得非常吃力。
 * - 首領約 40~90 秒的戰鬥（建議等級、普通裝備）。
 * aggro：aggressive 主動攻擊；passive 被打才反擊；none 不會攻擊（木樁）。
 */

const melee = (range: number, windup: number, cooldown: number) => ({ range, windup, cooldown });

export const ENEMIES: Record<string, EnemyDef> = {
  training_dummy: {
    id: 'training_dummy', name: '訓練木樁', level: 1, aggro: 'none', shape: 'dummy',
    radius: 0.6, respawn: 2.5, scale: 1.25, color: 0xb0814f,
    stats: { maxHp: 400, atk: 0, def: 0, moveSpeed: 0 },
    exp: 0, gold: [0, 0],
  },

  /* ---------- 新手草原 Lv.1-10 ---------- */
  green_slime: {
    id: 'green_slime', name: '草原史萊姆', level: 2, aggro: 'aggressive', shape: 'slime',
    radius: 0.6, respawn: 12, scale: 1, color: 0x6fd36a,
    stats: { maxHp: 70, atk: 16, def: 0, moveSpeed: 2.6 },
    attack: melee(1.1, 0.5, 1.6),
    exp: 14, gold: [3, 6],
  },
  meadow_mushroom: {
    id: 'meadow_mushroom', name: '草原蘑菇', level: 4, aggro: 'passive', shape: 'mushroom',
    radius: 0.6, respawn: 12, scale: 1.1, color: 0xd9584a,
    stats: { maxHp: 130, atk: 22, def: 3, moveSpeed: 2.4 },
    attack: melee(1.2, 0.6, 1.8),
    exp: 24, gold: [5, 9],
  },

  /* ---------- 第一層 海岸古道 Lv.1-5，防禦 0 ---------- */
  hermit_crab: {
    id: 'hermit_crab', name: '寄居蟹', level: 3, aggro: 'aggressive', shape: 'crab',
    radius: 0.6, respawn: 12, scale: 1, color: 0xe2703a,
    stats: { maxHp: 100, atk: 26, def: 0, moveSpeed: 2.8 },
    attack: melee(1.2, 0.45, 1.5),
    exp: 18, gold: [4, 8],
  },
  bubble_frog: {
    id: 'bubble_frog', name: '泡咪潮蛙', level: 4, aggro: 'passive', shape: 'frog',
    radius: 0.6, respawn: 12, scale: 1, color: 0x4fc3c9,
    stats: { maxHp: 140, atk: 30, def: 0, moveSpeed: 3.2 },
    attack: melee(1.3, 0.5, 1.6),
    exp: 26, gold: [5, 10],
  },
  crab_king: {
    id: 'crab_king', name: '巨鉗蟹王', level: 6, aggro: 'aggressive', shape: 'crab', boss: true,
    radius: 0.62, respawn: 90, scale: 2.6, color: 0xd9452a,
    stats: { maxHp: 5500, atk: 60, def: 0, moveSpeed: 2.6 },
    attack: melee(2.4, 0.6, 1.8),
    exp: 320, gold: [150, 220], gems: 5,
    bossSkills: ['claw_slam', 'charge'],
  },

  /* ---------- 第二層 珊瑚洞窟 Lv.5-10，防禦 18 ---------- */
  coral_slime: {
    id: 'coral_slime', name: '珊瑚史萊姆', level: 6, aggro: 'aggressive', shape: 'slime',
    radius: 0.65, respawn: 12, scale: 1.15, color: 0xf08a9a,
    stats: { maxHp: 260, atk: 58, def: 18, moveSpeed: 2.6 },
    attack: melee(1.2, 0.5, 1.6),
    exp: 42, gold: [10, 16],
  },
  cave_bat: {
    id: 'cave_bat', name: '洞窟蝙蝠', level: 7, aggro: 'aggressive', shape: 'bat',
    radius: 0.5, respawn: 12, scale: 1, color: 0x5a4a7a,
    stats: { maxHp: 210, atk: 62, def: 18, moveSpeed: 4 },
    attack: melee(1.1, 0.35, 1.3),
    exp: 46, gold: [10, 18],
  },
  tide_golem: {
    id: 'tide_golem', name: '潮汐古魔像', level: 10, aggro: 'aggressive', shape: 'golem', boss: true,
    radius: 0.7, respawn: 90, scale: 2.4, color: 0x6a9ab0,
    stats: { maxHp: 15000, atk: 110, def: 18, moveSpeed: 2.2 },
    attack: melee(2.6, 0.7, 2),
    exp: 950, gold: [400, 520], gems: 8,
    bossSkills: ['ground_slam', 'tide_rain'],
  },

  /* ---------- 第三層 熔心火山口 Lv.10-15，防禦 40 ---------- */
  lava_slime: {
    id: 'lava_slime', name: '熔岩史萊姆', level: 11, aggro: 'aggressive', shape: 'slime',
    radius: 0.7, respawn: 12, scale: 1.25, color: 0xff6a2a,
    stats: { maxHp: 480, atk: 96, def: 40, moveSpeed: 2.6 },
    attack: melee(1.3, 0.5, 1.6),
    exp: 95, gold: [22, 34],
  },
  ember_frog: {
    id: 'ember_frog', name: '火山蛙', level: 12, aggro: 'aggressive', shape: 'frog',
    radius: 0.65, respawn: 12, scale: 1.15, color: 0xc9442a,
    stats: { maxHp: 440, atk: 104, def: 40, moveSpeed: 3.4 },
    attack: melee(1.3, 0.45, 1.5),
    exp: 105, gold: [24, 38],
  },
  magma_frog: {
    id: 'magma_frog', name: '熔心巨蛙', level: 15, aggro: 'aggressive', shape: 'frog', boss: true,
    radius: 0.7, respawn: 90, scale: 2.8, color: 0xb8321e,
    stats: { maxHp: 32000, atk: 165, def: 40, moveSpeed: 3 },
    attack: melee(2.6, 0.6, 1.8),
    exp: 2600, gold: [900, 1200], gems: 12,
    bossSkills: ['leap', 'lava_spit'],
  },
};
