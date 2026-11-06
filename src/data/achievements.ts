import type { GameState } from '@/core/GameState';
import type { ZoneId } from './types';
import { DUNGEON_ORDER, FIELD_ORDER, ZONES, bossOf } from './stages';
import { CODEX_ENTRIES, CODEX_MAX_POINTS, codexFound, codexPoints } from './codex';
import { COMPANION_LIST } from './companions';
import { GROWTH, bondLevel, teamOf } from './companionGrowth';
import { ENHANCE_MAX, RARITY_ORDER } from './items';

/**
 * 成就（v1.64）
 * ------------------------------------------------------------
 * 進度一律從存檔「算」出來（等級、統計、破關紀錄、圖鑑、夥伴……），
 * 存檔只記已領取 / 已通知過的 id（`GameState.achievements`）。
 * 新增成就：在 ACHIEVEMENTS 加一筆，`progress` 回傳 [目前, 目標]。
 * id 一旦上線就不要改（已領取的紀錄靠 id）。
 */
export type AchievementCat = 'growth' | 'battle' | 'story' | 'collect' | 'codex';

export const ACH_CATS: Record<AchievementCat, string> = {
  growth: '成長',
  battle: '戰鬥',
  story: '征途',
  collect: '收集',
  codex: '圖鑑',
};

export interface AchievementDef {
  id: string;
  cat: AchievementCat;
  icon: string;
  name: string;
  desc: string;
  /** 獎勵鑽石 */
  gems: number;
  progress: (s: GameState) => [number, number];
}

const lv = (n: number) => (s: GameState): [number, number] => [Math.min(s.level, n), n];
const stat = (k: keyof GameState['stats'], n: number) => (s: GameState): [number, number] => [Math.min(s.stats[k] ?? 0, n), n];
/** 擊敗第 n 層首領（主線） */
const floor = (n: number) => (s: GameState): [number, number] => [s.bossesDefeated.includes(DUNGEON_ORDER[n - 1]) ? 1 : 0, 1];
const sRanks = (s: GameState, zones?: ZoneId[]) =>
  Object.entries(s.clears).filter(([z, c]) => c?.bestRank === 'S' && (!zones || zones.includes(z as ZoneId))).length;
/** 有菁英首領的野外 */
const ELITE_FIELDS = FIELD_ORDER.filter((z) => bossOf(z));
const growthList = (s: GameState) => Object.values(s.companions.growth ?? {});
const maxPetLv = (s: GameState) => Math.max(0, ...growthList(s).map((g) => g.lv));
const maxBond = (s: GameState) => Math.max(0, ...growthList(s).map((g) => bondLevel(g.bond)));
const allGear = (s: GameState) => [...Object.values(s.equipment), ...s.inventory].filter(Boolean);

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- 成長 ----
  { id: 'lv10', cat: 'growth', icon: '🌱', name: '初出茅廬', desc: '升到 Lv.10', gems: 5, progress: lv(10) },
  { id: 'lv30', cat: 'growth', icon: '🌿', name: '嶄露頭角', desc: '升到 Lv.30', gems: 10, progress: lv(30) },
  { id: 'lv60', cat: 'growth', icon: '🌳', name: '英雄之路', desc: '升到 Lv.60', gems: 20, progress: lv(60) },
  { id: 'lv90', cat: 'growth', icon: '⚡', name: '半神', desc: '升到 Lv.90', gems: 30, progress: lv(90) },
  { id: 'lv110', cat: 'growth', icon: '👑', name: '神格覺醒', desc: '升到最高等級 Lv.110', gems: 50, progress: lv(110) },
  { id: 'play1h', cat: 'growth', icon: '⏳', name: '流連忘返', desc: '遊玩 1 小時', gems: 5, progress: (s) => [Math.min(Math.floor(s.stats.playTime / 60), 60), 60] },
  { id: 'play10h', cat: 'growth', icon: '⌛', name: '忠實冒險者', desc: '遊玩 10 小時', gems: 15, progress: (s) => [Math.min(Math.floor(s.stats.playTime / 3600), 10), 10] },
  { id: 'quest10', cat: 'growth', icon: '📋', name: '使命必達', desc: '完成 10 個每日任務', gems: 5, progress: stat('questsDone', 10) },
  { id: 'quest100', cat: 'growth', icon: '📜', name: '眾神的信使', desc: '完成 100 個每日任務', gems: 25, progress: stat('questsDone', 100) },

  // ---- 戰鬥 ----
  { id: 'kill100', cat: 'battle', icon: '🗡', name: '初試身手', desc: '打倒 100 隻敵人', gems: 5, progress: stat('kills', 100) },
  { id: 'kill1k', cat: 'battle', icon: '⚔', name: '百戰之士', desc: '打倒 1,000 隻敵人', gems: 10, progress: stat('kills', 1000) },
  { id: 'kill5k', cat: 'battle', icon: '🛡', name: '千軍辟易', desc: '打倒 5,000 隻敵人', gems: 20, progress: stat('kills', 5000) },
  { id: 'kill20k', cat: 'battle', icon: '🔥', name: '萬夫莫敵', desc: '打倒 20,000 隻敵人', gems: 40, progress: stat('kills', 20000) },
  { id: 'boss10', cat: 'battle', icon: '💀', name: '屠龍新手', desc: '打倒首領 10 次（含菁英與守護者）', gems: 10, progress: stat('bossKills', 10) },
  { id: 'boss50', cat: 'battle', icon: '☠', name: '首領剋星', desc: '打倒首領 50 次', gems: 20, progress: stat('bossKills', 50) },
  { id: 'boss200', cat: 'battle', icon: '🐉', name: '弒神者', desc: '打倒首領 200 次', gems: 40, progress: stat('bossKills', 200) },
  { id: 'rankS1', cat: 'battle', icon: '🌟', name: '完美表現', desc: '首領戰第一次拿到 S 評價', gems: 5, progress: (s) => [Math.min(sRanks(s), 1), 1] },
  { id: 'rankS10', cat: 'battle', icon: '✨', name: '十全十美', desc: '在 10 個不同關卡拿到 S 評價', gems: 20, progress: (s) => [Math.min(sRanks(s), 10), 10] },
  { id: 'rankSall', cat: 'battle', icon: '💫', name: '無懈可擊', desc: `主線 ${DUNGEON_ORDER.length} 層全部拿到 S 評價`, gems: 50, progress: (s) => [sRanks(s, DUNGEON_ORDER), DUNGEON_ORDER.length] },
  { id: 'death1', cat: 'battle', icon: '🩹', name: '勝敗乃兵家常事', desc: '第一次倒下', gems: 3, progress: stat('deaths', 1) },

  // ---- 征途（主線、野外） ----
  ...[3, 6, 9, 12, 16, 19].map((n, i): AchievementDef => ({
    id: `floor${n}`, cat: 'story', icon: '🏛', name: `${ZONES[DUNGEON_ORDER[n - 1]].name}的勝利者`, desc: `擊敗第 ${n} 層首領`, gems: [5, 10, 15, 20, 25, 30][i], progress: floor(n),
  })),
  { id: 'floor22', cat: 'story', icon: '🏆', name: '奧林帕斯的守護者', desc: `擊敗最終層首領（第 ${DUNGEON_ORDER.length} 層）`, gems: 60, progress: floor(DUNGEON_ORDER.length) },
  { id: 'elites', cat: 'story', icon: '🗺', name: '野外霸主', desc: `打倒全部 ${ELITE_FIELDS.length} 張野外的菁英首領`, gems: 15, progress: (s) => [ELITE_FIELDS.filter((z) => (s.clears[z]?.count ?? 0) > 0).length, ELITE_FIELDS.length] },

  // ---- 收集 ----
  { id: 'pet1', cat: 'collect', icon: '🪽', name: '神獸之友', desc: '收服第一隻守護者夥伴', gems: 10, progress: (s) => [Math.min(s.companions.owned.length, 1), 1] },
  { id: 'pet5', cat: 'collect', icon: '🦅', name: '馴神者', desc: '收服 5 隻守護者夥伴', gems: 20, progress: (s) => [Math.min(s.companions.owned.length, 5), 5] },
  { id: 'petAll', cat: 'collect', icon: '🌈', name: '萬神殿', desc: `收服全部 ${COMPANION_LIST.length} 隻守護者夥伴`, gems: 50, progress: (s) => [s.companions.owned.length, COMPANION_LIST.length] },
  { id: 'petDuo', cat: 'collect', icon: '👥', name: '雙星連袂', desc: '同時帶上主力與支援兩隻夥伴', gems: 10, progress: (s) => [Math.min(teamOf(s.companions).length, 2), 2] },
  { id: 'petLv10', cat: 'collect', icon: '🐾', name: '並肩作戰', desc: '任一隻夥伴升到 Lv.10', gems: 10, progress: (s) => [Math.min(maxPetLv(s), 10), 10] },
  { id: 'petLvMax', cat: 'collect', icon: '🏅', name: '神獸導師', desc: `任一隻夥伴升到 Lv.${GROWTH.maxLv}`, gems: 30, progress: (s) => [Math.min(maxPetLv(s), GROWTH.maxLv), GROWTH.maxLv] },
  { id: 'petBond3', cat: 'collect', icon: '💞', name: '心意相通', desc: '任一隻夥伴好感度 ♥♥♥（學會專屬技能）', gems: 10, progress: (s) => [Math.min(maxBond(s), 3), 3] },
  { id: 'petBond5', cat: 'collect', icon: '💖', name: '永恆的羈絆', desc: '任一隻夥伴好感度 ♥♥♥♥♥', gems: 25, progress: (s) => [Math.min(maxBond(s), 5), 5] },
  { id: 'myth1', cat: 'collect', icon: '★', name: '神話的開端', desc: '撿到第一件★神話裝', gems: 5, progress: stat('mythics', 1) },
  { id: 'myth10', cat: 'collect', icon: '🌠', name: '神話收藏家', desc: '撿到 10 件★神話裝', gems: 15, progress: stat('mythics', 10) },
  { id: 'myth50', cat: 'collect', icon: '🌌', name: '傳說之庫', desc: '撿到 50 件★神話裝', gems: 30, progress: stat('mythics', 50) },
  { id: 'enh10', cat: 'collect', icon: '🔨', name: '鍛造學徒', desc: '強化成功 10 次', gems: 5, progress: stat('enhanceOk', 10) },
  { id: 'enh50', cat: 'collect', icon: '⚒', name: '赫菲斯托斯的弟子', desc: '強化成功 50 次', gems: 15, progress: stat('enhanceOk', 50) },
  { id: 'enhMax', cat: 'collect', icon: '💎', name: '神匠', desc: `擁有一件 +${ENHANCE_MAX} 裝備`, gems: 20, progress: (s) => [Math.min(Math.max(0, ...allGear(s).map((i) => i!.plus)), ENHANCE_MAX), ENHANCE_MAX] },
  { id: 'epicSet', cat: 'collect', icon: '🟣', name: '史詩全身', desc: '6 個欄位同時穿著史詩裝備', gems: 15, progress: (s) => [Object.values(s.equipment).filter((i) => i && i.rarity === RARITY_ORDER[RARITY_ORDER.length - 1]).length, 6] },
  { id: 'item20', cat: 'collect', icon: '🧪', name: '善用道具', desc: '使用道具 20 次', gems: 5, progress: stat('itemsUsed', 20) },
  { id: 'item100', cat: 'collect', icon: '⚗', name: '鍊金術士', desc: '使用道具 100 次', gems: 10, progress: stat('itemsUsed', 100) },

  // ---- 圖鑑 ----
  { id: 'dex30', cat: 'codex', icon: '📖', name: '博物學者', desc: '圖鑑發現 30 種敵人', gems: 5, progress: (s) => [Math.min(codexFound(s.codex), 30), 30] },
  { id: 'dex100', cat: 'codex', icon: '📚', name: '怪物學家', desc: '圖鑑發現 100 種敵人', gems: 15, progress: (s) => [Math.min(codexFound(s.codex), 100), 100] },
  { id: 'dexAll', cat: 'codex', icon: '🏺', name: '赫拉斯全書', desc: `圖鑑發現全部 ${CODEX_ENTRIES.length} 種敵人`, gems: 40, progress: (s) => [codexFound(s.codex), CODEX_ENTRIES.length] },
  { id: 'dexHalf', cat: 'codex', icon: '⭐', name: '星光半滿', desc: `圖鑑點數達到 ${Math.ceil(CODEX_MAX_POINTS / 2)}（一半）`, gems: 25, progress: (s) => [Math.min(codexPoints(s.codex), Math.ceil(CODEX_MAX_POINTS / 2)), Math.ceil(CODEX_MAX_POINTS / 2)] },
  { id: 'dexFull', cat: 'codex', icon: '🌞', name: '全知', desc: `圖鑑點數全滿（${CODEX_MAX_POINTS}）`, gems: 60, progress: (s) => [codexPoints(s.codex), CODEX_MAX_POINTS] },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
