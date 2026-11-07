import { MAX_LEVEL } from './Progression';

/**
 * 神格等級（v1.76，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 等級到 MAX_LEVEL 之後，經驗不再浪費，改累積「神格經驗」：
 * - 每升 1 級神格得到 1 點神格點數，分配到下面 5 種永久屬性（每種有上限）。
 * - 每升 1 級另外給鑽石（DIVINITY.gems），讓滿級後一直打怪也有收穫。
 * - 重新分配要花鑽石（DIVINITY.resetCost）。
 * 套用：Inventory.computeStats() 依 state.divinity 加成（在套裝、圖鑑之後）。
 * 新增屬性：在 DIV_STATS 加一筆，computeStats 的 applyDivinity 會自動套用（只支援 Stats 的欄位）。
 */
export type DivStat = 'atk' | 'maxHp' | 'def' | 'critRate' | 'critDmg';

export interface DivinityState {
  lv: number;
  exp: number;
  alloc: Record<DivStat, number>;
}

export interface DivStatDef {
  id: DivStat;
  icon: string;
  name: string;
  /** 每點加多少；mul = 乘法百分比（0.01 = +1%），add = 直接加（爆擊率 / 爆擊傷害） */
  per: number;
  mode: 'mul' | 'add';
  /** 最多投幾點 */
  cap: number;
}

export const DIVINITY = {
  /** 第 1 級要的經驗（之後每級 +growth） */
  base: 120_000,
  growth: 0.04,
  /** 每升 1 級給的鑽石 */
  gems: 2,
  /** 重新分配的鑽石 */
  resetCost: 30,
};

export const DIV_STATS: DivStatDef[] = [
  { id: 'atk', icon: '⚔', name: '戰神之力（攻擊）', per: 0.01, mode: 'mul', cap: 50 },
  { id: 'maxHp', icon: '❤', name: '泰坦之軀（生命）', per: 0.015, mode: 'mul', cap: 50 },
  { id: 'def', icon: '🛡', name: '雅典娜之盾（防禦）', per: 0.015, mode: 'mul', cap: 50 },
  { id: 'critRate', icon: '🎯', name: '阿波羅之眼（爆擊率）', per: 0.004, mode: 'add', cap: 25 },
  { id: 'critDmg', icon: '💥', name: '宙斯之雷（爆擊傷害）', per: 0.02, mode: 'add', cap: 25 },
];
export const DIV_MAP = Object.fromEntries(DIV_STATS.map((d) => [d.id, d])) as Record<DivStat, DivStatDef>;
/** 全部投滿要幾點 */
export const DIV_MAX_POINTS = DIV_STATS.reduce((a, d) => a + d.cap, 0);

export function newDivinityState(): DivinityState {
  return { lv: 0, exp: 0, alloc: { atk: 0, maxHp: 0, def: 0, critRate: 0, critDmg: 0 } };
}

/** 讀檔整理（缺欄位補 0、超過上限的砍掉） */
export function normalizeDivinity(v: unknown): DivinityState {
  const d = newDivinityState();
  if (!v || typeof v !== 'object') return d;
  const o = v as Partial<DivinityState>;
  d.lv = Math.max(0, Math.floor(Number(o.lv) || 0));
  d.exp = Math.max(0, Number(o.exp) || 0);
  for (const s of DIV_STATS) d.alloc[s.id] = Math.min(s.cap, Math.max(0, Math.floor(Number(o.alloc?.[s.id]) || 0)));
  // 投的點數不能比等級多
  while (spentPoints(d) > d.lv) {
    const top = DIV_STATS.reduce((a, s) => (d.alloc[s.id] > d.alloc[a.id] ? s : a));
    d.alloc[top.id]--;
  }
  return d;
}

/** 開放條件：角色滿級 */
export function divinityOpen(level: number): boolean {
  return level >= MAX_LEVEL;
}

/** 升到下一級要的神格經驗 */
export function divExpToNext(lv: number): number {
  return Math.round(DIVINITY.base * (1 + DIVINITY.growth * lv));
}

/** 加神格經驗，回傳升了幾級 */
export function addDivExp(d: DivinityState, exp: number): number {
  d.exp += Math.max(0, exp);
  let n = 0;
  while (d.exp >= divExpToNext(d.lv)) {
    d.exp -= divExpToNext(d.lv);
    d.lv++;
    n++;
  }
  return n;
}

export function spentPoints(d: DivinityState): number {
  return DIV_STATS.reduce((a, s) => a + d.alloc[s.id], 0);
}

export function freePoints(d: DivinityState): number {
  return Math.max(0, d.lv - spentPoints(d));
}

/** 投 1 點；不能投回傳原因 */
export function allocPoint(d: DivinityState, id: DivStat): string | null {
  const def = DIV_MAP[id];
  if (!def) return '沒有這個屬性';
  if (freePoints(d) <= 0) return '沒有可用的神格點數';
  if (d.alloc[id] >= def.cap) return '這項已經到上限';
  d.alloc[id]++;
  return null;
}

/** 重新分配（點數全部退回）；鑽石由呼叫端扣 */
export function resetAlloc(d: DivinityState) {
  for (const s of DIV_STATS) d.alloc[s.id] = 0;
}

/** 這項目前的加成文字，例如「+12%」 */
export function divBonusText(id: DivStat, points: number): string {
  const def = DIV_MAP[id];
  const v = def.per * points * 100;
  return `+${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/** 套到屬性上（computeStats 呼叫；爆擊上限由 computeStats 最後統一處理） */
export function applyDivinity(st: { atk: number; maxHp: number; def: number; critRate: number; critDmg: number }, d: DivinityState | undefined) {
  if (!d) return;
  for (const s of DIV_STATS) {
    const p = d.alloc[s.id];
    if (!p) continue;
    if (s.mode === 'mul') st[s.id] *= 1 + s.per * p;
    else st[s.id] += s.per * p;
  }
}
