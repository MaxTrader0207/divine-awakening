import { describe, expect, it } from 'vitest';
import { currentStep, newTutorial, restartTutorial, targetFor, tutorialEvent, tutorialForExisting, type TutorialContext } from './Tutorial';
import { TUTORIAL_STEPS } from '@/data/tutorial';
import { migrate } from '@/core/SaveSystem';

const town: TutorialContext = { zoneId: 'town', level: 1, bossesDefeated: [] };

describe('新手指引', () => {
  it('依序完成：走動 → 出城（換地圖事件）', () => {
    const t = newTutorial();
    expect(tutorialEvent(t, { type: 'move', meters: 4 }, town)).toHaveLength(0);
    const done = tutorialEvent(t, { type: 'move', meters: 7 }, town);
    expect(done.map((d) => d.step.id)).toEqual(['move']);
    expect(done[0].rewarded).toBe(true);
    expect(currentStep(t)?.id).toBe('field');
    // 還沒輪到的事件不算（打怪不會完成「出城」）
    expect(tutorialEvent(t, { type: 'kill' }, town)).toHaveLength(0);
    expect(tutorialEvent(t, { type: 'zone', zone: 'grassland' }, { ...town, zoneId: 'grassland' }).map((d) => d.step.id)).toEqual(['field']);
  });

  it('技能步驟要兩種不同的技能，普攻與藥水不算', () => {
    const t = { ...newTutorial(), step: TUTORIAL_STEPS.findIndex((s) => s.id === 'skills') };
    tutorialEvent(t, { type: 'skill', slot: 'basic' }, town);
    tutorialEvent(t, { type: 'skill', slot: 'potion' }, town);
    tutorialEvent(t, { type: 'skill', slot: 'Q' }, town);
    expect(tutorialEvent(t, { type: 'skill', slot: 'Q' }, town)).toHaveLength(0);
    expect(tutorialEvent(t, { type: 'skill', slot: 'E' }, town).map((d) => d.step.id)).toEqual(['skills']);
  });

  it('狀態型目標輪到時立刻完成（已經 Lv.5 就直接跳過「升到 Lv.3」）', () => {
    const t = { ...newTutorial(), step: TUTORIAL_STEPS.findIndex((s) => s.id === 'auto') };
    const done = tutorialEvent(t, { type: 'auto', on: true }, { zoneId: 'grassland', level: 5, bossesDefeated: [] });
    expect(done.map((d) => d.step.id)).toEqual(['auto', 'level']);
    expect(currentStep(t)?.id).toBe('item');
  });

  it('全部完成後 done，重新開始不會重複發獎勵', () => {
    const t = newTutorial();
    t.step = TUTORIAL_STEPS.length - 1;
    t.rewarded = TUTORIAL_STEPS.length - 1;
    const last = tutorialEvent(t, { type: 'boss', zone: 'dungeon_2' }, town);
    expect(last[0].rewarded).toBe(true);
    expect(t.done).toBe(true);
    restartTutorial(t);
    expect(t.done).toBe(false);
    expect(t.step).toBe(0);
    const again = tutorialEvent(t, { type: 'move', meters: 20 }, town);
    expect(again[0].rewarded).toBe(false);
  });

  it('箭頭目標依所在區域：要回城的步驟在草原指向城門', () => {
    const t = { ...newTutorial(), step: TUTORIAL_STEPS.findIndex((s) => s.id === 'buy') };
    expect(targetFor(t, 'town')).toEqual({ x: -22, z: -12.6 });
    expect(targetFor(t, 'grassland')).toEqual({ x: 0, z: -28 });
    expect(targetFor(t, 'dungeon_2')).toBeNull();
    t.hidden = true;
    expect(targetFor(t, 'town')).toBeNull();
  });

  it('舊存檔：玩過一段的視為完成，新手從頭開始', () => {
    expect(tutorialForExisting(8, []).done).toBe(true);
    expect(tutorialForExisting(1, []).done).toBe(false);
    const old = migrate({ version: 4, level: 12, bossesDefeated: ['dungeon_1'] } as never)!;
    expect(old.tutorial.done).toBe(true);
    expect(old.tutorial.hidden).toBe(true);
    const fresh = migrate({ version: 4, level: 1, bossesDefeated: [] } as never)!;
    expect(fresh.tutorial.step).toBe(0);
    expect(fresh.tutorial.done).toBe(false);
  });

  it('快捷道具步驟：用一次道具就完成；v11 存檔的步驟往後挪一格', () => {
    const idx = TUTORIAL_STEPS.findIndex((s) => s.id === 'item');
    expect(idx).toBe(6);
    expect(TUTORIAL_STEPS[idx - 1].id).toBe('level');
    const t = { ...newTutorial(), step: idx };
    expect(tutorialEvent(t, { type: 'kill' }, town)).toEqual([]);
    expect(tutorialEvent(t, { type: 'item' }, town).map((d) => d.step.id)).toEqual(['item']);
    // v11 存在「換上新裝備」（舊索引 6）→ v12 變成索引 7，仍是同一步
    const old = migrate({ version: 11, level: 4, bossesDefeated: [], tutorial: { step: 6, progress: 0, skills: [], done: false, hidden: false, rewarded: 6 } } as never)!;
    expect(TUTORIAL_STEPS[old.tutorial.step].id).toBe('equip');
    expect(old.tutorial.rewarded).toBe(6);
    // 還在前面步驟的不動
    const early = migrate({ version: 11, level: 1, bossesDefeated: [], tutorial: { step: 3, progress: 0, skills: [], done: false, hidden: false, rewarded: 3 } } as never)!;
    expect(TUTORIAL_STEPS[early.tutorial.step].id).toBe('skills');
    // 已完成的維持完成
    const fin = migrate({ version: 11, level: 9, bossesDefeated: ['dungeon_1'], tutorial: { step: 11, progress: 0, skills: [], done: true, hidden: false, rewarded: 11 } } as never)!;
    expect(fin.tutorial.done).toBe(true);
    expect(fin.tutorial.step).toBe(TUTORIAL_STEPS.length);
  });

  it('v1.100：首領之後還有尋寶、每日任務、第二層首領；完成第二層首領才結束', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(ids.slice(-4)).toEqual(['boss', 'chest', 'quest', 'floor2']);
    const t = { ...newTutorial(), step: ids.indexOf('chest'), rewarded: ids.indexOf('chest') };
    const field: TutorialContext = { zoneId: 'grassland', level: 6, bossesDefeated: ['dungeon_1'] };
    expect(tutorialEvent(t, { type: 'quest' }, field)).toHaveLength(0);
    expect(tutorialEvent(t, { type: 'chest' }, field).map((d) => d.step.id)).toEqual(['chest']);
    expect(tutorialEvent(t, { type: 'quest' }, field).map((d) => d.step.id)).toEqual(['quest']);
    expect(t.done).toBe(false);
    // 已經打倒第二層首領的話，輪到時直接完成
    const done = tutorialEvent(t, null, { ...field, bossesDefeated: ['dungeon_1', 'dungeon_2'] });
    expect(done.map((d) => d.step.id)).toEqual(['floor2']);
    expect(t.done).toBe(true);
  });

  it('每一步的 HUD 目標文字夠短、說明不空白', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.text.length).toBeLessThanOrEqual(22);
      expect(s.hint.length).toBeGreaterThan(20);
    }
  });
});
