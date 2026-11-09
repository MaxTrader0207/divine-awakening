import type { EquipSlot, Rarity, ZoneId } from './types';
import type { HeroClass } from './classes';
import type { GearProfile } from './gear';

/**
 * 神域副本（v1.101）
 * ------------------------------------------------------------
 * 打倒第 30 層克洛諾斯之後開放的 5 個高難度副本（`ZoneDef.sanctum`），依序開放。
 * 和專屬套裝深度綁定：
 *   1. 專屬掉落：第 k 個神域只掉「第 k 套神域裝」（每個職業 5 套 × 6 件，id `${職業}_${欄位}_${20+k}`），
 *      其他地方完全不會掉（不在 namedGearIds、鑽石商店、離線收益、套裝補完的池子裡）。
 *   2. 神域詛咒：在第 k 個神域裡，玩家（含召喚物）造成的傷害 −dealt、受到的傷害 +taken；
 *      身上每穿 1 件「這個神域的套裝」詛咒減輕 1/6，6 件全滿時詛咒變成祝福（BLESSING）。
 *   3. 敵人是固定強度（借用神話難度的換算 `mythicMods`，第 k 個神域 = 神話第 SANCTUMS[k].floor 層），首領不會自動調整。
 * 神域裝都是第 8 階，屬性預算比一般神話裝高（`budget`，一般神話裝是 1.08）。
 * 全身穿同一套神域裝時，神裝形態用這個神域的專屬配色（data/divineForm.ts 的 9～13）。
 */
export interface SanctumDef {
  order: number;
  zone: ZoneId;
  /** 神域名稱 */
  name: string;
  icon: string;
  /** 換算用的神話層數（敵人等級 = MAX_LEVEL + floor） */
  floor: number;
  curse: { name: string; icon: string; desc: string; dealt: number; taken: number };
  /** 神域裝的屬性預算（相對同階標準裝） */
  budget: number;
  /** 首次通關鑽石 */
  firstGems: number;
}

export const SANCTUMS: SanctumDef[] = [
  { order: 1, zone: 'sanctum_1', name: '赫菲斯托斯神鍛場', icon: '⚒️', floor: 1, budget: 1.14, firstGems: 60,
    curse: { name: '熔爐灼熱', icon: '🔥', desc: '神火讓武器發燙、鎧甲變軟', dealt: 0.3, taken: 0.3 } },
  { order: 2, zone: 'sanctum_2', name: '波賽頓深海神殿', icon: '🔱', floor: 3, budget: 1.18, firstGems: 80,
    curse: { name: '深海重壓', icon: '🌊', desc: '海神的水壓壓得人抬不起手', dealt: 0.35, taken: 0.4 } },
  { order: 3, zone: 'sanctum_3', name: '阿蒂蜜絲月之獵林', icon: '🌙', floor: 6, budget: 1.22, firstGems: 100,
    curse: { name: '月蝕迷霧', icon: '🌫️', desc: '月光被遮住，看不清獵物、也看不清獵人', dealt: 0.4, taken: 0.45 } },
  { order: 4, zone: 'sanctum_4', name: '黑帝斯冥府王座', icon: '👑', floor: 9, budget: 1.26, firstGems: 120,
    curse: { name: '冥府凋零', icon: '💀', desc: '生命一點一點被冥府吸走', dealt: 0.45, taken: 0.5 } },
  { order: 5, zone: 'sanctum_5', name: '宙斯雷霆神殿', icon: '⚡', floor: 12, budget: 1.3, firstGems: 150,
    curse: { name: '天罰雷霆', icon: '⚡', desc: '眾神之王不允許凡人站在這裡', dealt: 0.5, taken: 0.55 } },
];

/** 6 件全滿時：詛咒反轉成祝福 */
export const BLESSING = { dealt: 0.15, taken: 0.15 };

/** 掉落：小怪掉這個神域套裝的機率、首領必掉幾件、寶箱機率；偏向還沒有的部位 */
export const SANCTUM_DROP = { mob: 0.06, boss: 1, chest: 0.25, preferMissing: 0.7 };

/** 神域裝編號：第 k 套 = 20 + k（一般神話裝是 01～20） */
export const sanctumIndex = (order: number) => 20 + order;

/** 各職業 5 套神域裝的名稱前綴（套裝名＝前綴＋「套裝」，裝備名＝前綴＋欄位名）與能力偏向 */
export const SANCTUM_GEAR: Record<HeroClass, { prefixes: string[]; profiles: GearProfile[] }> = {
  mage: { prefixes: ['神鍛熔心', '海神潮汐', '月神星輝', '冥王幽冥', '雷霆天罰'], profiles: ['arcane', 'pierce', 'crit', 'fury', 'power'] },
  archer: { prefixes: ['神鍛赤焰', '海神浪擊', '月神狩獵', '冥王魂獵', '雷霆追星'], profiles: ['crit', 'swift', 'pierce', 'fury', 'crit'] },
  knight: { prefixes: ['神鍛青銅', '海神三叉', '月神聖銀', '冥王判決', '雷霆神威'], profiles: ['guard', 'vital', 'guard', 'power', 'vital'] },
  berserker: { prefixes: ['神鍛熔岩', '海神怒濤', '月神狼嚎', '冥王血怒', '雷霆狂神'], profiles: ['fury', 'power', 'crit', 'vital', 'fury'] },
  summoner: { prefixes: ['神鍛灰燼', '海神深淵', '月神幽光', '冥王亡魂', '雷霆星魂'], profiles: ['arcane', 'vital', 'pierce', 'arcane', 'power'] },
  swordsman: { prefixes: ['神鍛火紋', '海神水刃', '月神清輝', '冥王斷魂', '雷霆劍心'], profiles: ['crit', 'pierce', 'swift', 'fury', 'crit'] },
  tamer: { prefixes: ['神鍛爐犬', '海神海馬', '月神銀狼', '冥王三首', '雷霆神鷹'], profiles: ['vital', 'power', 'swift', 'guard', 'fury'] },
  ninja: { prefixes: ['神鍛暗火', '海神暗潮', '月神朧影', '冥王無影', '雷霆瞬影'], profiles: ['crit', 'swift', 'fury', 'pierce', 'crit'] },
};

export function sanctumOf(zone: ZoneId | undefined): SanctumDef | undefined {
  return SANCTUMS.find((s) => s.zone === zone);
}

/** 身上穿了幾件第 k 套神域裝 */
export function sanctumPieces(cls: HeroClass, order: number, equipment: Partial<Record<EquipSlot, { base: string }>>): number {
  const nn = String(sanctumIndex(order));
  return (['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'] as EquipSlot[]).filter((s) => equipment[s]?.base === `${cls}_${s}_${nn}`).length;
}

export interface CurseNow {
  /** 玩家（含召喚物）造成傷害的倍率 */
  dealtMul: number;
  /** 玩家受到傷害的倍率 */
  takenMul: number;
  pieces: number;
  blessed: boolean;
}

/** 在第 order 個神域、穿 pieces 件該神域套裝時的詛咒（或祝福） */
export function curseFor(order: number, pieces: number): CurseNow {
  const s = SANCTUMS[order - 1];
  const p = Math.max(0, Math.min(6, pieces));
  if (p >= 6) return { dealtMul: 1 + BLESSING.dealt, takenMul: 1 - BLESSING.taken, pieces: p, blessed: true };
  const f = 1 - p / 6;
  return { dealtMul: 1 - s.curse.dealt * f, takenMul: 1 + s.curse.taken * f, pieces: p, blessed: false };
}

/** 掉落：從第 order 套挑一件（偏向還沒有的部位），稀有度由呼叫端給 */
export function rollSanctumPiece(cls: HeroClass, order: number, owned: Set<string>, rng: () => number = Math.random): string {
  const slots: EquipSlot[] = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'];
  const nn = String(sanctumIndex(order));
  const ids = slots.map((s) => `${cls}_${s}_${nn}`);
  const missing = ids.filter((id) => !owned.has(id));
  const pool = missing.length && rng() < SANCTUM_DROP.preferMissing ? missing : ids;
  return pool[Math.floor(rng() * pool.length)];
}

/** 首次通關鑽石 */
export function sanctumFirstGems(zone: ZoneId): number {
  return sanctumOf(zone)?.firstGems ?? 0;
}

/** 神域裝的稀有度權重（比一般掉落好一點：首領至少精良） */
export const SANCTUM_RARITY: Record<'mob' | 'boss', Record<Rarity, number>> = {
  mob: { common: 30, fine: 40, rare: 22, epic: 8 },
  boss: { common: 0, fine: 40, rare: 42, epic: 18 },
};

export function rollSanctumRarity(boss: boolean, rng: () => number = Math.random): Rarity {
  const w = SANCTUM_RARITY[boss ? 'boss' : 'mob'];
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const [k, v] of Object.entries(w) as [Rarity, number][]) {
    r -= v;
    if (r < 0) return k;
  }
  return 'fine';
}
