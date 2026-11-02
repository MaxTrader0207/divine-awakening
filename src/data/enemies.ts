import type { EnemyDef } from './types';

/**
 * 敵人資料表。第 4 週會補齊 6 種小怪與 3 隻首領。
 * 規範：id 用 snake_case；數值以 Lv.1 法師（攻 24）約 3~5 下打倒小怪為基準。
 */
export const ENEMIES: Record<string, EnemyDef> = {
  training_dummy: {
    id: 'training_dummy',
    name: '訓練木樁',
    level: 1,
    aggro: 'none',
    shape: 'dummy',
    radius: 0.6,
    respawn: 2.5,
    stats: { maxHp: 400, atk: 0, def: 0, moveSpeed: 0 },
    exp: 0,
    gold: [0, 0],
    color: 0xb0814f,
    scale: 1.25,
  },
};
