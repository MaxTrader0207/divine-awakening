import { describe, expect, it } from 'vitest';
import { newGameState } from '@/core/GameState';
import { DUNGEON_ORDER } from '@/data/zones';
import { REBIRTH, applyRebirth, equipBlock, normalizeRebirth, rebirthBlocked, rebirthExpMul, rebirthStatMul } from './Rebirth';
import { INVENTORY_SIZE, computeStats, equip } from './Inventory';
import { MAX_LEVEL } from './Progression';

const endgame = () => {
  const s = newGameState('knight');
  s.level = MAX_LEVEL;
  s.bossesDefeated = [...DUNGEON_ORDER];
  s.equipment = { weapon: { uid: 50, base: 'weapon_t8', rarity: 'epic', plus: 5 }, hat: { uid: 51, base: 'hat_t8', rarity: 'rare', plus: 2 } };
  s.gems = 10;
  s.gold = 5000;
  return s;
};

describe('轉生（v1.83）', () => {
  it('條件：滿級＋打倒最終首領，上限次數', () => {
    const s = newGameState('mage');
    expect(rebirthBlocked(s)).not.toBeNull();
    const e = endgame();
    expect(rebirthBlocked(e)).toBeNull();
    e.rebirth.count = REBIRTH.maxCount;
    expect(rebirthBlocked(e)).toContain('上限');
  });

  it('轉生：回 Lv.1、換職業、裝備收進背包、保留金幣鑽石、加成', () => {
    const s = endgame();
    const before = computeStats(s).atk;
    const r = applyRebirth(s, 'archer');
    expect(r.count).toBe(1);
    expect(s.level).toBe(1);
    expect(s.heroClass).toBe('archer');
    expect(s.playerName).toBe('小弓手');
    expect(s.bossesDefeated).toEqual([]);
    expect(s.zoneId).toBe('town');
    expect(s.inventory.some((i) => i.base === 'weapon_t8')).toBe(true);
    expect(s.equipment.weapon?.base).toBe('weapon_t1');
    expect(s.gems).toBe(10 + REBIRTH.gems);
    expect(s.gold).toBe(5000);
    expect(before).toBeGreaterThan(0);
    expect(rebirthStatMul(1)).toBeCloseTo(1 + REBIRTH.bonusPerRebirth);
    expect(rebirthExpMul(2)).toBeCloseTo(1 + REBIRTH.expPerRebirth * 2);
  });

  it('轉生後高階裝備要練回等級才能穿', () => {
    const s = endgame();
    applyRebirth(s, 'knight');
    const t8 = s.inventory.find((i) => i.base === 'weapon_t8')!;
    expect(equipBlock(s, t8)).toContain('Lv.');
    expect(equip(s, t8.uid)).toBe(false);
    s.level = MAX_LEVEL;
    expect(equipBlock(s, t8)).toBeNull();
    expect(equip(s, t8.uid)).toBe(true);
    // 沒轉生過的角色沒有限制
    const fresh = newGameState('mage');
    expect(equipBlock(fresh, { uid: 1, base: 'weapon_t8', rarity: 'common', plus: 0 })).toBeNull();
  });

  it('背包放不下的換成金幣；讀檔整理', () => {
    const s = endgame();
    for (let i = 0; i < INVENTORY_SIZE; i++) s.inventory.push({ uid: 1000 + i, base: 'boots_t2', rarity: 'common', plus: 0 });
    const gold = s.gold;
    const r = applyRebirth(s, 'mage');
    expect(s.inventory.length).toBe(INVENTORY_SIZE);
    expect(r.sold).toBe(2);
    expect(s.gold).toBeGreaterThan(gold);
    expect(normalizeRebirth({ count: 99, history: [{ cls: 'mage', at: 1 }, { cls: 'xx', at: 2 }] })).toEqual({ count: REBIRTH.maxCount, history: [{ cls: 'mage', at: 1 }] });
  });
});
