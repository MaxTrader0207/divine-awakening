import type { ZoneId } from '@/data/types';
import { TUTORIAL_STEPS, type TutorialStep } from '@/data/tutorial';

/**
 * 新手指引（純邏輯，可單元測試）
 * ------------------------------------------------------------
 * - 步驟依序進行（data/tutorial.ts），遊戲事件推進目前這一步的進度。
 * - 「狀態型」目標（已在某區域、等級、已擊敗首領）輪到時立刻檢查，老玩家不會卡在已經做過的事。
 * - 獎勵每一步只發一次：重新開始指引不會重複領（rewarded 記錄發到第幾步）。
 */
export interface TutorialState {
  /** 目前步驟索引（= TUTORIAL_STEPS.length 表示完成） */
  step: number;
  /** 目前這一步的進度（走了幾公尺、打倒幾隻） */
  progress: number;
  /** 這一步用過的技能（Q/W/E/R） */
  skills: string[];
  done: boolean;
  /** 不在畫面上顯示指引卡片與箭頭 */
  hidden: boolean;
  /** 已發過獎勵的步驟數（索引 < rewarded 的不再發） */
  rewarded: number;
}

export type TutorialEvent =
  | { type: 'move'; meters: number }
  | { type: 'zone'; zone: ZoneId }
  | { type: 'kill' }
  | { type: 'skill'; slot: string }
  | { type: 'auto'; on: boolean }
  | { type: 'level'; level: number }
  | { type: 'equip' }
  | { type: 'buy' }
  | { type: 'enhance' }
  | { type: 'boss'; zone: ZoneId };

/** 檢查狀態型目標需要的玩家資料 */
export interface TutorialContext {
  zoneId: ZoneId;
  level: number;
  bossesDefeated: ZoneId[];
}

export interface CompletedStep {
  step: TutorialStep;
  index: number;
  /** 這次有沒有發獎勵（重新開始後再完成不發） */
  rewarded: boolean;
}

export function newTutorial(): TutorialState {
  return { step: 0, progress: 0, skills: [], done: false, hidden: false, rewarded: 0 };
}

/** 舊存檔（v5 以前）：已經玩過一段的直接視為完成並隱藏，新手才從頭開始 */
export function tutorialForExisting(level: number, bossesDefeated: ZoneId[]): TutorialState {
  if (level >= 3 || bossesDefeated.length > 0) return { ...newTutorial(), step: TUTORIAL_STEPS.length, done: true, hidden: true, rewarded: TUTORIAL_STEPS.length };
  return newTutorial();
}

export function currentStep(t: TutorialState): TutorialStep | null {
  return t.done ? null : TUTORIAL_STEPS[t.step] ?? null;
}

/** 目前進度文字，例如「3 / 10 公尺」；沒有數量的目標回傳空字串 */
export function progressText(t: TutorialState): string {
  const s = currentStep(t);
  if (!s) return '';
  const g = s.goal;
  if (g.type === 'move') return `${Math.min(g.meters, Math.floor(t.progress))} / ${g.meters} 公尺`;
  if (g.type === 'kill') return `${t.progress} / ${g.count}`;
  if (g.type === 'skills') return `${t.skills.length} / ${g.count}`;
  return '';
}

/** 目前這一步在玩家所在區域要指向的位置 */
export function targetFor(t: TutorialState, zoneId: ZoneId): { x: number; z: number } | null {
  if (t.hidden) return null;
  return currentStep(t)?.targets?.[zoneId] ?? null;
}

function satisfiedNow(s: TutorialStep, ctx: TutorialContext): boolean {
  const g = s.goal;
  if (g.type === 'zone') return ctx.zoneId === g.zone || (g.zone === 'dungeon_1' && ctx.bossesDefeated.includes('dungeon_1'));
  if (g.type === 'level') return ctx.level >= g.level;
  if (g.type === 'boss') return ctx.bossesDefeated.includes(g.zone);
  return false;
}

function matches(s: TutorialStep, t: TutorialState, ev: TutorialEvent): boolean {
  const g = s.goal;
  switch (g.type) {
    case 'move':
      if (ev.type !== 'move') return false;
      t.progress += ev.meters;
      return t.progress >= g.meters;
    case 'kill':
      if (ev.type !== 'kill') return false;
      t.progress += 1;
      return t.progress >= g.count;
    case 'skills':
      if (ev.type !== 'skill' || !['Q', 'W', 'E', 'R'].includes(ev.slot)) return false;
      if (!t.skills.includes(ev.slot)) t.skills.push(ev.slot);
      return t.skills.length >= g.count;
    case 'auto':
      return ev.type === 'auto' && ev.on;
    case 'zone':
      return ev.type === 'zone' && ev.zone === g.zone;
    case 'level':
      return ev.type === 'level' && ev.level >= g.level;
    case 'boss':
      return ev.type === 'boss' && ev.zone === g.zone;
    case 'equip':
    case 'buy':
    case 'enhance':
      return ev.type === g.type;
  }
}

function complete(t: TutorialState, out: CompletedStep[]) {
  const index = t.step;
  const step = TUTORIAL_STEPS[index];
  const rewarded = index >= t.rewarded;
  if (rewarded) t.rewarded = index + 1;
  out.push({ step, index, rewarded });
  t.step++;
  t.progress = 0;
  t.skills = [];
  if (t.step >= TUTORIAL_STEPS.length) t.done = true;
}

/** 輪到狀態型目標時立刻檢查（可能連續完成好幾步） */
function settle(t: TutorialState, ctx: TutorialContext, out: CompletedStep[]) {
  for (let s = currentStep(t); s && satisfiedNow(s, ctx); s = currentStep(t)) complete(t, out);
}

/** 處理一個遊戲事件；回傳這次完成的步驟（呼叫端負責發獎勵、顯示訊息） */
export function tutorialEvent(t: TutorialState, ev: TutorialEvent | null, ctx: TutorialContext): CompletedStep[] {
  const out: CompletedStep[] = [];
  if (t.done) return out;
  settle(t, ctx, out);
  const s = currentStep(t);
  if (ev && s && matches(s, t, ev)) {
    complete(t, out);
    settle(t, ctx, out);
  }
  return out;
}

/** 重新開始（已領過的獎勵不再發） */
export function restartTutorial(t: TutorialState) {
  Object.assign(t, { step: 0, progress: 0, skills: [], done: false, hidden: false });
}
