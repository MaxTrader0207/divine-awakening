import { describe, expect, it } from 'vitest';
import { CAPTURE, COMPANION_LIST, newCompanionState, pityLeft, tryCapture } from './companions';
import { MINIONS } from './minions';
import { ENEMIES, SIDE_ORDER, ZONES, DUNGEON_ORDER } from './stages';
import { STAGE_EPILOGUE } from './stageClear';
import { migrate } from '@/core/SaveSystem';

describe('守護者夥伴', () => {
  it('資料一致：守護者在自己的支線地圖、夥伴的召喚物與屬性對得上', () => {
    for (const c of COMPANION_LIST) {
      const z = ZONES[c.zone];
      expect(z.side?.guardian, `${c.id} 的地圖 ${c.zone} 不是它的支線`).toBe(c.guardian);
      expect(SIDE_ORDER).toContain(c.zone);
      expect(DUNGEON_ORDER).toContain(z.side!.unlockAfter);
      const g = ENEMIES[c.guardian];
      expect(g?.boss, `${c.guardian} 應該是首領`).toBe(true);
      expect(g.element).toBe(c.element);
      const m = MINIONS[c.minion];
      expect(m.guardian).toBe(c.guardian);
      expect(m.element).toBe(c.element);
      expect(m.life).toBe(CAPTURE.duration);
      expect(m.max).toBe(1);
      expect(STAGE_EPILOGUE[c.zone]).toBeTruthy();
    }
  });

  it('收服：機率＋保底，第 pity 次一定成功；收服後自動帶上', () => {
    const st = newCompanionState();
    const never = () => 0.99;
    for (let i = 1; i < CAPTURE.pity; i++) {
      expect(tryCapture(st, 'pegasus', never)).toBe('failed');
      expect(pityLeft(st, 'pegasus')).toBe(CAPTURE.pity - i);
    }
    expect(tryCapture(st, 'pegasus', never)).toBe('captured');
    expect(st.owned).toEqual(['pegasus']);
    expect(st.active).toBe('pegasus');
    expect(tryCapture(st, 'pegasus', never)).toBe('owned');
    const lucky = newCompanionState();
    expect(tryCapture(lucky, 'pegasus', () => CAPTURE.chance - 0.01)).toBe('captured');
  });

  it('存檔 v13：舊存檔補上空的夥伴資料，壞資料被清掉', () => {
    const old = migrate({ version: 12, level: 20 } as never)!;
    expect(old.companions).toEqual({ owned: [], active: null, attempts: {}, growth: {} });
    const bad = migrate({ version: 13, companions: { owned: ['pegasus', 'nope'], active: 'nope', attempts: { pegasus: 2 } } } as never)!;
    expect(bad.companions.owned).toEqual(['pegasus']);
    expect(bad.companions.active).toBeNull();
    expect(bad.companions.attempts.pegasus).toBe(2);
  });
});
