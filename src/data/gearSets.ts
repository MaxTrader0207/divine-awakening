import type { EquipSlot, Stats } from './types';
import type { HeroClass } from './classes';
import { CLASSES } from './classes';
import { CLASS_GEAR, NAMED_TIERS, type GearProfile } from './gear';

/**
 * 神話裝套裝效果（v1.69）
 * ------------------------------------------------------------
 * 每個職業的 20 組神話裝：6 個欄位裡「同一個編號」的神話裝是同一套（例如法師第 14 件全是「烏拉諾斯」系列）。
 * 同時穿著同一套的 2 / 4 / 6 件，各自觸發套裝效果（加在全身屬性上，見 computeStats）：
 *   2 件：依這套的能力偏向（PROFILE_BONUS）
 *   4 件：攻擊 +6%、生命 +6%
 *   6 件：再加攻擊 +8%、生命 +8%、防禦 +8%
 * 同一套的 6 件都是同一階，套裝名稱取 6 件名稱的共同字首（沒有就用武器名）。
 */
const SLOTS: EquipSlot[] = ['weapon', 'hat', 'robe', 'gloves', 'boots', 'ring'];
const ID_RE = /^([a-z]+)_(weapon|hat|robe|gloves|boots|ring)_(\d{2})$/;

export interface GearSetDef {
  /** `${職業}_${編號 01~20}` */
  id: string;
  cls: HeroClass;
  index: number;
  name: string;
  tier: number;
  profile: GearProfile;
  /** 每個欄位這套的裝備 id */
  pieces: Record<EquipSlot, string>;
}

/** 百分比加成（atk 0.05 = +5%）；critRate / pen / critDmg 是直接加 */
export type SetBonus = Partial<Record<'atk' | 'maxHp' | 'maxMp' | 'def' | 'moveSpeed' | 'critRate' | 'pen' | 'critDmg', number>>;

export const PROFILE_BONUS: Record<GearProfile, { text: string; bonus: SetBonus }> = {
  power: { text: '攻擊 +5%', bonus: { atk: 0.05 } },
  crit: { text: '爆擊率 +4%', bonus: { critRate: 0.04 } },
  pierce: { text: '穿透 +5%', bonus: { pen: 0.05 } },
  fury: { text: '爆擊傷害 +15%', bonus: { critDmg: 0.15 } },
  guard: { text: '防禦 +10%', bonus: { def: 0.1 } },
  vital: { text: '生命 +8%', bonus: { maxHp: 0.08 } },
  arcane: { text: 'MP +12%', bonus: { maxMp: 0.12 } },
  swift: { text: '移速 +6%', bonus: { moveSpeed: 0.06 } },
};

export const SET_4: { text: string; bonus: SetBonus } = { text: '攻擊 +6%、生命 +6%', bonus: { atk: 0.06, maxHp: 0.06 } };
export const SET_6: { text: string; bonus: SetBonus } = { text: '攻擊 +8%、生命 +8%、防禦 +8%', bonus: { atk: 0.08, maxHp: 0.08, def: 0.08 } };

/** 怒氣職業沒有 MP：魔力偏向的 2 件效果改成生命 */
function profileBonus(cls: HeroClass, p: GearProfile) {
  if (p === 'arcane' && CLASSES[cls]?.resource === 'rage') return PROFILE_BONUS.vital;
  return PROFILE_BONUS[p];
}

function commonPrefix(xs: string[]): string {
  let p = xs[0] ?? '';
  for (const x of xs) while (!x.startsWith(p)) p = p.slice(0, -1);
  return p;
}

function buildSets(): Map<string, GearSetDef> {
  const out = new Map<string, GearSetDef>();
  for (const [cls, g] of Object.entries(CLASS_GEAR) as [HeroClass, (typeof CLASS_GEAR)[HeroClass]][]) {
    for (let i = 0; i < NAMED_TIERS.length; i++) {
      const names = SLOTS.map((s) => g.named[s][i]);
      const prefix = commonPrefix(names);
      const nn = String(i + 1).padStart(2, '0');
      const id = `${cls}_${nn}`;
      out.set(id, {
        id,
        cls,
        index: i,
        name: prefix.length >= 2 ? `${prefix}套裝` : `「${names[0]}」套裝`,
        tier: NAMED_TIERS[i],
        profile: g.profiles[i],
        pieces: Object.fromEntries(SLOTS.map((s) => [s, `${cls}_${s}_${nn}`])) as Record<EquipSlot, string>,
      });
    }
  }
  return out;
}

export const GEAR_SETS = buildSets();

/** 裝備 id → 所屬套裝（標準裝回傳 undefined） */
export function setOf(baseId: string): GearSetDef | undefined {
  const m = ID_RE.exec(baseId);
  return m ? GEAR_SETS.get(`${m[1]}_${m[3]}`) : undefined;
}

/** 套裝各段效果（2 / 4 / 6 件） */
export function setTiers(set: GearSetDef): { need: number; text: string; bonus: SetBonus }[] {
  const p = profileBonus(set.cls, set.profile);
  return [
    { need: 2, text: p.text, bonus: p.bonus },
    { need: 4, text: SET_4.text, bonus: SET_4.bonus },
    { need: 6, text: SET_6.text, bonus: SET_6.bonus },
  ];
}

export interface ActiveSet {
  set: GearSetDef;
  /** 穿著幾件 */
  count: number;
  /** 穿著的欄位 */
  slots: EquipSlot[];
}

/** 身上的套裝（至少 1 件），件數多的排前面 */
export function equippedSets(equipment: Partial<Record<EquipSlot, { base: string }>>): ActiveSet[] {
  const map = new Map<string, ActiveSet>();
  for (const slot of SLOTS) {
    const it = equipment[slot];
    const set = it ? setOf(it.base) : undefined;
    if (!set) continue;
    const a = map.get(set.id) ?? { set, count: 0, slots: [] };
    a.count++;
    a.slots.push(slot);
    map.set(set.id, a);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.set.tier - a.set.tier);
}

/** 全部生效中的套裝加成（加總） */
export function setBonusTotal(equipment: Partial<Record<EquipSlot, { base: string }>>): SetBonus {
  const total: SetBonus = {};
  for (const a of equippedSets(equipment)) {
    for (const t of setTiers(a.set)) {
      if (a.count < t.need) continue;
      for (const [k, v] of Object.entries(t.bonus) as [keyof SetBonus, number][]) total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}

/** 套用到屬性上（百分比類乘、爆擊 / 穿透 / 爆傷直接加；上限由 computeStats 最後處理） */
export function applySetBonus(st: Stats, b: SetBonus) {
  if (b.atk) st.atk *= 1 + b.atk;
  if (b.maxHp) st.maxHp *= 1 + b.maxHp;
  if (b.maxMp) st.maxMp *= 1 + b.maxMp;
  if (b.def) st.def *= 1 + b.def;
  if (b.moveSpeed) st.moveSpeed *= 1 + b.moveSpeed;
  if (b.critRate) st.critRate += b.critRate;
  if (b.pen) st.pen += b.pen;
  if (b.critDmg) st.critDmg += b.critDmg;
}
