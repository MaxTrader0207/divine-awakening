import type { EnemyShape } from '@/data/types';
import type { ShapeBuild } from './types';
import { bat, dummy, frog, golem, mushroom, skeleton, slime } from './basic';
import { crab } from './crab';
import { bull, harpy, hound, hydra, minotaur, serpent } from './beasts';
import { boar, cyclops, gorgon, lion } from './legends';
import { chimera, dragon, sphinx } from './monsters';
import { centaur, cetus, griffin, hind, scylla } from './wilds';
import { argus, echidna, geryon, kampe } from './primordials';

/**
 * 敵人程式模型登記表：EnemyDef.shape → 建造函式。
 * 新增造型：在這個資料夾新增一個檔案（參考 crab.ts / basic.ts），在這裡登記，並把名稱加到 types.ts 的 EnemyShape。
 */
export const ENEMY_SHAPES: Record<EnemyShape, ShapeBuild> = {
  dummy,
  slime,
  mushroom,
  crab,
  frog,
  bat,
  skeleton,
  golem,
  serpent,
  hydra,
  harpy,
  bull,
  minotaur,
  hound,
  boar,
  lion,
  gorgon,
  cyclops,
  sphinx,
  dragon,
  chimera,
  scylla,
  griffin,
  hind,
  argus,
  geryon,
  cetus,
  centaur,
  echidna,
  kampe,
};

export type { ShapeBuild, ShapeBuilder, ShapeAnimState, ShapeResult } from './types';
export { RIG_ANIMS, DEFAULT_RIG, type RigAnims } from './rigs';
