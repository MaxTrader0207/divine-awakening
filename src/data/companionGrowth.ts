import { CAPTURE, COMPANIONS, type CompanionState } from './companions';
import type { BuffStat } from './consumables';

/**
 * 夥伴養成（v1.66）
 * ------------------------------------------------------------
 * 每隻收服的夥伴有自己的「等級」與「好感度」（存在 CompanionState.growth）。
 *
 * 等級 Lv.1~30：夥伴的生命、攻擊、防禦每級 +GROWTH.perLv。
 *   經驗來源：帶著時你打倒敵人（夥伴在場上 ×3）、首領、餵食（花金幣）、再次打倒已收服的守護者。
 * 好感度 ♥0~5：召喚、一起打倒首領、餵食都會增加，到各階解鎖羈絆效果：
 *   ♥1 冷卻 −5 秒、♥2 存在 +5 秒、♥3 專屬技能、♥4 冷卻再 −5 秒、♥5 夥伴屬性 +10%、專屬技能冷卻 −30%。
 * 專屬技能：每隻一招（COMPANION_SKILLS），夥伴在場時自動施放，效果由 Game.companionSkill() 套用。
 */
export const GROWTH = {
  maxLv: 30,
  /** 每級屬性 +2.5%（Lv.30 = ×1.725） */
  perLv: 0.025,
  /** 帶著時你每打倒一隻小怪 +1 經驗；夥伴在場上時 ×liveMul */
  killExp: 1,
  liveMul: 3,
  /** 打倒首領（含菁英、守護者） */
  bossExp: 25,
  /** 再次打倒已收服的守護者：給那隻夥伴的經驗與好感 */
  repeatExp: 120,
  repeatBond: 5,
  /** 召喚一次 +1 好感；夥伴在場時打倒首領 +5 */
  bondSummon: 1,
  bondBoss: 5,
  /** 好感度各階門檻（累計點數） */
  bondTiers: [10, 30, 60, 100, 160],
  /** ♥5：夥伴屬性加成、專屬技能冷卻倍率 */
  bond5Stat: 0.1,
  bond5SkillCd: 0.7,
};

/** 餵食神饌點心：花金幣換經驗與好感（價格隨夥伴等級上升） */
export const FEED = {
  exp: 40,
  bond: 2,
  /** 金幣 = base + 夥伴等級 × perLv */
  base: 200,
  perLv: 150,
};

export interface CompanionGrowth {
  lv: number;
  exp: number;
  /** 好感度點數（累計） */
  bond: number;
}

export function newGrowth(): CompanionGrowth {
  return { lv: 1, exp: 0, bond: 0 };
}

/** 讀某隻夥伴的養成（沒有就建立） */
export function growthOf(st: CompanionState, id: string): CompanionGrowth {
  st.growth ??= {};
  return (st.growth[id] ??= newGrowth());
}

/** 升到下一級要多少經驗 */
export function compExpToNext(lv: number): number {
  return 20 + lv * 10;
}

/** 好感度階級 0~5 */
export function bondLevel(points: number): number {
  let n = 0;
  for (const t of GROWTH.bondTiers) if (points >= t) n++;
  return n;
}

/** 到下一階還要幾點（滿了回傳 null） */
export function bondNext(points: number): number | null {
  return GROWTH.bondTiers.find((t) => points < t) ?? null;
}

/** 加經驗；回傳升了幾級 */
export function addCompExp(g: CompanionGrowth, exp: number): number {
  if (g.lv >= GROWTH.maxLv) {
    g.exp = 0;
    return 0;
  }
  g.exp += exp;
  let n = 0;
  while (g.lv < GROWTH.maxLv && g.exp >= compExpToNext(g.lv)) {
    g.exp -= compExpToNext(g.lv);
    g.lv++;
    n++;
  }
  if (g.lv >= GROWTH.maxLv) g.exp = 0;
  return n;
}

/** 加好感；回傳是否升階 */
export function addBond(g: CompanionGrowth, pts: number): boolean {
  const before = bondLevel(g.bond);
  g.bond += pts;
  return bondLevel(g.bond) > before;
}

/** 屬性倍率（生命、攻擊、防禦都乘這個） */
export function compStatMul(g: CompanionGrowth): number {
  return (1 + (g.lv - 1) * GROWTH.perLv) * (bondLevel(g.bond) >= 5 ? 1 + GROWTH.bond5Stat : 1);
}

/** 召喚冷卻（秒） */
export function compCooldown(g: CompanionGrowth | undefined): number {
  const b = g ? bondLevel(g.bond) : 0;
  return CAPTURE.cooldown - (b >= 1 ? 5 : 0) - (b >= 4 ? 5 : 0);
}

/** 存在時間（秒） */
export function compDuration(g: CompanionGrowth | undefined): number {
  const b = g ? bondLevel(g.bond) : 0;
  return CAPTURE.duration + (b >= 2 ? 5 : 0);
}

export function feedCost(g: CompanionGrowth): number {
  return FEED.base + g.lv * FEED.perLv;
}

/** 好感度各階的效果文字（卡片顯示） */
export const BOND_PERKS = ['召喚冷卻 −5 秒', '存在時間 +5 秒', '解鎖專屬技能', '召喚冷卻再 −5 秒', '夥伴屬性 +10%、專屬技能冷卻 −30%'];

/* ======================= 專屬技能 ======================= */

export type CompanionSkill =
  /** 以夥伴為中心的範圍傷害（夥伴攻擊 × power） */
  | { kind: 'nova'; radius: number; power: number }
  /** 補你的血（最大生命比例），可同時造成範圍傷害 */
  | { kind: 'heal'; ratio: number; radius?: number; power?: number }
  /** 給你護盾（最大生命比例、秒數） */
  | { kind: 'shield'; ratio: number; duration: number }
  /** 給你增益 */
  | { kind: 'buff'; stat: BuffStat; value: number; duration: number }
  /** 你的血低於 at 時立刻補 ratio（每次召喚一次） */
  | { kind: 'rebirth'; at: number; ratio: number };

export interface CompanionSkillDef {
  name: string;
  desc: string;
  /** 施放間隔（秒）；rebirth 不用 */
  every: number;
  skill: CompanionSkill;
}

export const COMPANION_SKILLS: Record<string, CompanionSkillDef> = {
  pegasus: { name: '雷霆蹄擊', desc: '每 9 秒雷擊周圍 5 公尺，造成夥伴攻擊 ×300% 傷害', every: 9, skill: { kind: 'nova', radius: 5, power: 3 } },
  aetos: { name: '天穹風刃', desc: '每 7 秒以狂風掃過周圍 7 公尺，造成夥伴攻擊 ×220% 傷害', every: 7, skill: { kind: 'nova', radius: 7, power: 2.2 } },
  chrysomallos: { name: '金羊毛庇護', desc: '每 12 秒給你最大生命 15% 的護盾（8 秒）', every: 12, skill: { kind: 'shield', ratio: 0.15, duration: 8 } },
  hippocampus: { name: '潮汐之癒', desc: '每 10 秒補你最大生命 8%，並以浪潮打周圍 4 公尺（×150%）', every: 10, skill: { kind: 'heal', ratio: 0.08, radius: 4, power: 1.5 } },
  phoenix: { name: '浴火重生', desc: '你的生命低於 30% 時立刻補 35%（每次召喚一次）', every: 0, skill: { kind: 'rebirth', at: 0.3, ratio: 0.35 } },
  boreas: { name: '凜冬領域', desc: '每 8 秒以寒風打周圍 6 公尺，造成夥伴攻擊 ×200% 傷害', every: 8, skill: { kind: 'nova', radius: 6, power: 2 } },
  briareos: { name: '百臂壁壘', desc: '每 14 秒讓你防禦 +30%（8 秒）', every: 14, skill: { kind: 'buff', stat: 'def', value: 0.3, duration: 8 } },
  scorpius: { name: '劇毒瘴氣', desc: '每 8 秒放出毒霧打周圍 5 公尺，造成夥伴攻擊 ×260% 傷害', every: 8, skill: { kind: 'nova', radius: 5, power: 2.6 } },
  phobos: { name: '恐懼收割', desc: '每 10 秒巨鐮橫掃周圍 6 公尺，造成夥伴攻擊 ×320% 傷害', every: 10, skill: { kind: 'nova', radius: 6, power: 3.2 } },
  ares: { name: '戰神號令', desc: '每 15 秒讓你攻擊 +20%（8 秒）', every: 15, skill: { kind: 'buff', stat: 'atk', value: 0.2, duration: 8 } },
};

/** 專屬技能是否已解鎖（♥3） */
export function skillUnlocked(g: CompanionGrowth | undefined): boolean {
  return !!g && bondLevel(g.bond) >= 3;
}

/** 專屬技能實際間隔（♥5 再 −30%） */
export function skillInterval(id: string, g: CompanionGrowth): number {
  const d = COMPANION_SKILLS[id];
  return d.every * (bondLevel(g.bond) >= 5 ? GROWTH.bond5SkillCd : 1);
}

// 每隻夥伴都要有專屬技能
for (const id of Object.keys(COMPANIONS)) if (!COMPANION_SKILLS[id]) throw new Error(`[companionGrowth] 夥伴 ${id} 沒有專屬技能`);
