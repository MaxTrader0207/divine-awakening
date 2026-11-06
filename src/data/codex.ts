import type { ZoneId } from './types';
import { DUNGEON_ORDER, ENEMIES, FIELD_ORDER, SIDE_ORDER, ZONES, zoneLabel } from './stages';

/**
 * 怪物圖鑑（v1.64）
 * ------------------------------------------------------------
 * 每打倒一隻敵人就記一筆（`GameState.codex`：敵人 id → 擊殺數）。
 * 擊殺數到門檻升星（★1 發現、★2、★3），每顆星 = 1 點圖鑑點數；
 * 點數換算成永久加成：全部收集滿 = 攻擊 +8%、生命 +8%、防禦 +5%（照比例給）。
 * 新增怪物不用改這裡：清單直接從關卡資料產生（不攻擊的訓練木樁不算）。
 */
export type CodexKind = 'mob' | 'boss';

/** 升星門檻：小怪 1 / 50 / 200 隻；首領（含菁英、守護者）1 / 5 / 20 次 */
export const CODEX_TIERS: Record<CodexKind, number[]> = {
  mob: [1, 50, 200],
  boss: [1, 5, 20],
};

/** 全部收集滿的加成（點數照比例） */
export const CODEX_BONUS_MAX = { atk: 0.08, maxHp: 0.08, def: 0.05 };

export interface CodexEntry {
  id: string;
  name: string;
  level: number;
  kind: CodexKind;
  zoneId: ZoneId;
}

export interface CodexGroup {
  zoneId: ZoneId;
  label: string;
  entries: CodexEntry[];
}

/** 依地圖分組（野外 → 主線 → 支線），組內依等級、首領排最後 */
function buildGroups(): CodexGroup[] {
  const order: ZoneId[] = [...FIELD_ORDER, ...DUNGEON_ORDER, ...SIDE_ORDER];
  const out: CodexGroup[] = [];
  for (const zoneId of order) {
    const ids = new Set((ZONES[zoneId].spawns ?? []).map((s) => s.enemy));
    const entries: CodexEntry[] = [];
    for (const id of ids) {
      const e = ENEMIES[id];
      if (!e || e.aggro === 'none') continue;
      entries.push({ id, name: e.name, level: e.level, kind: e.boss ? 'boss' : 'mob', zoneId });
    }
    if (!entries.length) continue;
    entries.sort((a, b) => (a.kind === b.kind ? a.level - b.level : a.kind === 'boss' ? 1 : -1));
    out.push({ zoneId, label: ZONES[zoneId].side ? `支線・${ZONES[zoneId].name}` : zoneLabel(zoneId), entries });
  }
  return out;
}

export const CODEX_GROUPS: CodexGroup[] = buildGroups();
export const CODEX_ENTRIES: CodexEntry[] = CODEX_GROUPS.flatMap((g) => g.entries);
const BY_ID = new Map(CODEX_ENTRIES.map((e) => [e.id, e]));

export function codexEntry(id: string): CodexEntry | undefined {
  return BY_ID.get(id);
}

/** 星數 0~3 */
export function codexStars(kind: CodexKind, kills: number): number {
  let n = 0;
  for (const t of CODEX_TIERS[kind]) if (kills >= t) n++;
  return n;
}

/** 下一顆星需要的擊殺數（已滿回傳 null） */
export function codexNext(kind: CodexKind, kills: number): number | null {
  return CODEX_TIERS[kind].find((t) => kills < t) ?? null;
}

export const CODEX_MAX_POINTS = CODEX_ENTRIES.reduce((n, e) => n + CODEX_TIERS[e.kind].length, 0);

/** 目前的圖鑑點數（只算清單裡的怪；已刪除的舊 id 不算） */
export function codexPoints(codex: Record<string, number> | undefined): number {
  if (!codex) return 0;
  let n = 0;
  for (const [id, kills] of Object.entries(codex)) {
    const e = BY_ID.get(id);
    if (e) n += codexStars(e.kind, kills);
  }
  return n;
}

/** 已發現（★1 以上）的數量 */
export function codexFound(codex: Record<string, number> | undefined): number {
  if (!codex) return 0;
  let n = 0;
  for (const [id, kills] of Object.entries(codex)) if (BY_ID.has(id) && kills > 0) n++;
  return n;
}

/** 圖鑑加成（比例，例如 atk 0.012 = +1.2%） */
export function codexBonus(codex: Record<string, number> | undefined): { atk: number; maxHp: number; def: number } {
  const r = codexPoints(codex) / CODEX_MAX_POINTS;
  return { atk: CODEX_BONUS_MAX.atk * r, maxHp: CODEX_BONUS_MAX.maxHp * r, def: CODEX_BONUS_MAX.def * r };
}

/**
 * 記一筆擊殺；回傳升到幾星（沒升星回傳 0）。不在圖鑑裡的敵人（訓練木樁）不記。
 */
export function recordKill(codex: Record<string, number>, id: string): number {
  const e = BY_ID.get(id);
  if (!e) return 0;
  const before = codex[id] ?? 0;
  codex[id] = before + 1;
  const s0 = codexStars(e.kind, before);
  const s1 = codexStars(e.kind, before + 1);
  return s1 > s0 ? s1 : 0;
}
