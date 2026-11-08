import { describe, expect, it } from 'vitest';
import { BEAST_ORDER, ZONES, bossOf } from '@/data/stages';
import { ENEMY_SHAPES } from '@/entities/enemyShapes';
import { BOSS_SKILLS } from '@/data/bossSkills';
import { newGameState, isZoneUnlocked } from '@/core/GameState';
import { beastBonus, beastFirstGems, beastsDone } from './BeastHunt';

describe('神獸討伐（v1.86）', () => {
  it('10 關，依序排列；每關只有一隻魔王，造型、屬性、4 招都有', () => {
    expect(BEAST_ORDER.length).toBe(10);
    BEAST_ORDER.forEach((id, i) => {
      const z = ZONES[id];
      expect(z.beast!.order).toBe(i + 1);
      expect(z.spawns!.length).toBe(1);
      const b = bossOf(id)!;
      expect(b.boss).toBe(true);
      expect(ENEMY_SHAPES[b.shape]).toBeTruthy();
      expect(b.element).toBeTruthy();
      expect(b.bossSkills!.length).toBe(4);
      for (const sk of b.bossSkills!) expect(BOSS_SKILLS[sk as keyof typeof BOSS_SKILLS], sk).toBeTruthy();
    });
    // 等級遞增、最後一隻是堤豐（打倒最終首領後）
    const lv = BEAST_ORDER.map((id) => bossOf(id)!.level);
    expect([...lv].sort((a, b) => a - b)).toEqual(lv);
    expect(ZONES[BEAST_ORDER[9]].beast!.unlockAfter).toBe('dungeon_22');
  });

  it('隨主線開放；首殺鑽石遞增；進度從 bossesDefeated 算', () => {
    const s = newGameState('mage');
    expect(isZoneUnlocked(s, 'beast_1')).toBe(false);
    s.bossesDefeated.push(ZONES.beast_1.beast!.unlockAfter);
    expect(isZoneUnlocked(s, 'beast_1')).toBe(true);
    expect(isZoneUnlocked(s, 'beast_2')).toBe(false);
    expect(beastFirstGems(1)).toBeLessThan(beastFirstGems(10));
    expect(beastBonus('beast_3')).toBe(beastFirstGems(3));
    expect(beastBonus('dungeon_3')).toBe(0);
    expect(beastsDone(s.bossesDefeated)).toBe(0);
    s.bossesDefeated.push('beast_1', 'beast_4');
    expect(beastsDone(s.bossesDefeated)).toBe(2);
  });
});
