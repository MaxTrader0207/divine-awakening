import { describe, expect, it } from 'vitest';
import { BOSS_LEASH, BOSS_LEASH_HARD, LEASH, shouldLeash } from './EnemyAI';

describe('脫戰', () => {
  it('小怪：離家超過 LEASH 就回家', () => {
    expect(shouldLeash(false, LEASH - 1, 0, true)).toBe(false);
    expect(shouldLeash(false, LEASH + 1, 0, true)).toBe(true);
  });
  it('首領：被拖遠但玩家還在場地裡，不脫戰（不會回滿血重打）', () => {
    expect(shouldLeash(true, BOSS_LEASH + 5, 10, true)).toBe(false);
    expect(shouldLeash(true, BOSS_LEASH_HARD + 1, 10, true)).toBe(true);
  });
  it('首領：玩家離開場地或死亡才脫戰', () => {
    expect(shouldLeash(true, 5, BOSS_LEASH + 1, true)).toBe(true);
    expect(shouldLeash(true, 5, 5, false)).toBe(true);
  });
});
