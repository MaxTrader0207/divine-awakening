import type { Element } from './elements';
import type { MinionId } from './minions';
import type { ZoneId } from './types';

/**
 * 守護者夥伴（v1.58）
 * ------------------------------------------------------------
 * 10 隻古希臘魔獸 / 戰神，各自住在一張支線地圖（ZoneDef.side），隨主線進度開放。
 * 打倒守護者時有 CAPTURE.chance 機率收服；連續失敗也沒關係，第 CAPTURE.pity 次一定成功。
 * 收服後在「裝備 → 夥伴」選一隻帶著，戰鬥中按「夥伴」按鈕（電腦 G 鍵）召喚出來幫忙：
 *   存在 CAPTURE.duration 秒、冷卻 CAPTURE.cooldown 秒；數值是玩家目前屬性的倍率（data/minions.ts）。
 * 屬性：夥伴打首領、首領打夥伴都套用相剋（data/elements.ts，剋 ×1.5、被剋 ×0.7）。
 *
 * 新增守護者：
 *   1. data/stages/sideN-*.ts 新增支線地圖（side: { guardian, unlockAfter }），在 stages/index.ts 登記
 *   2. 守護者造型 entities/enemyShapes/guardians.ts、招式 data/bossSkills.ts
 *   3. data/minions.ts 加夥伴（guardian = 守護者 id）
 *   4. 這裡加一筆；data/stageClear.ts 補結局與 7 句職業台詞
 */
export interface CompanionDef {
  id: string;
  name: string;
  /** 稱號（卡片副標題） */
  title: string;
  icon: string;
  element: Element;
  /** 守護者的敵人 id（打倒牠才能收服） */
  guardian: string;
  /** 召喚出來的夥伴（data/minions.ts） */
  minion: MinionId;
  /** 住在哪張支線地圖 */
  zone: ZoneId;
  /** 一句話介紹（神話） */
  lore: string;
  /** 戰鬥特色 */
  role: string;
}

export const CAPTURE = {
  /** 每次打倒守護者的收服機率 */
  chance: 0.25,
  /** 第幾次一定成功（保底） */
  pity: 4,
  /** 召喚後存在幾秒、冷卻幾秒 */
  duration: 30,
  cooldown: 60,
};

export const COMPANIONS: Record<string, CompanionDef> = {
  pegasus: {
    id: 'pegasus',
    name: '天馬珀伽索斯',
    title: '雷霆的坐騎',
    icon: '🪽',
    element: 'thunder',
    guardian: 'guardian_pegasus',
    minion: 'pegasus',
    zone: 'side_1',
    lore: '從梅杜莎的血中誕生的白色飛馬，一蹄踏出了赫利孔山的靈感之泉，後來為宙斯運送雷霆。',
    role: '近戰範圍雷擊、出場嘲諷周圍小怪；雷剋水，對水屬性首領傷害 ×1.5。',
  },
};

export const COMPANION_LIST = Object.values(COMPANIONS);

/** 由守護者的敵人 id 找夥伴 */
export function companionOfGuardian(enemyId: string): CompanionDef | undefined {
  return COMPANION_LIST.find((c) => c.guardian === enemyId);
}

export interface CompanionState {
  /** 已收服的夥伴 id */
  owned: string[];
  /** 目前帶著的夥伴（null = 沒帶） */
  active: string | null;
  /** 還沒收服前，打倒守護者的次數（保底用） */
  attempts: Record<string, number>;
}

export function newCompanionState(): CompanionState {
  return { owned: [], active: null, attempts: {} };
}

/**
 * 打倒守護者：擲收服。回傳 'captured'（收服）、'failed'（這次沒收服，剩幾次保底見 pityLeft）、'owned'（早就有了）。
 * 收服時如果還沒帶夥伴，自動帶上。
 */
export function tryCapture(st: CompanionState, id: string, rng: () => number = Math.random): 'captured' | 'failed' | 'owned' {
  if (st.owned.includes(id)) return 'owned';
  const n = (st.attempts[id] ?? 0) + 1;
  st.attempts[id] = n;
  if (n >= CAPTURE.pity || rng() < CAPTURE.chance) {
    st.owned.push(id);
    delete st.attempts[id];
    if (!st.active) st.active = id;
    return 'captured';
  }
  return 'failed';
}

/** 還要再打倒幾次一定收服 */
export function pityLeft(st: CompanionState, id: string): number {
  return Math.max(1, CAPTURE.pity - (st.attempts[id] ?? 0));
}
