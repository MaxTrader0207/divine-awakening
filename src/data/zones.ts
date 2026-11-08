/**
 * 相容入口：地圖資料已拆到 src/data/stages/（一個關卡一個檔案）。
 * 舊的 import 路徑（@/data/zones）繼續可用。
 */
export { ZONES, DUNGEON_ORDER, FIELD_ORDER, SIDE_ORDER, BEAST_ORDER, WORLD_FIELDS, UPCOMING_FIELDS, STAGES, zoneLabel, zoneName, floorLabel, bossOf, lootTierOf, lootTierText, rollZoneTier, zonesForLevel } from './stages';
