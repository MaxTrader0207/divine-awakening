import type { ZoneId } from '@/data/types';
import { BEAST_ORDER, ZONES } from '@/data/stages';

/**
 * 神獸討伐（v1.86，純邏輯，可單元測試）
 * ------------------------------------------------------------
 * 10 張只有一隻魔王的競技場（data/stages/beast*.ts，ZoneDef.beast），隨主線進度開放（約每 2 層開 1 關，
 * 最後一關「萬怪之王堤豐」在打倒最終首領後開放）。魔王每次打倒都照常掉落（首領掉落、鑽石、經驗）；
 * 第一次打倒額外送 firstGems 鑽石。進度就是 bossesDefeated 裡的 beast_N，不另外存檔。
 */
export const BEAST = {
  /** 第一次打倒的額外鑽石：第 1 關 base，之後每關 + step */
  firstBase: 40,
  firstStep: 10,
};

export function beastFirstGems(order: number): number {
  return BEAST.firstBase + BEAST.firstStep * (Math.max(1, order) - 1);
}

/** 已討伐幾隻 */
export function beastsDone(defeated: readonly ZoneId[]): number {
  return BEAST_ORDER.filter((id) => defeated.includes(id)).length;
}

/** 這一關第一次打倒的鑽石（不是神獸關卡回傳 0） */
export function beastBonus(zoneId: ZoneId): number {
  const b = ZONES[zoneId]?.beast;
  return b ? beastFirstGems(b.order) : 0;
}
