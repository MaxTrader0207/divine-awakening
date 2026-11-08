import type { EnemyDef, StageDef, ZoneDef, ZoneId } from '../types';
import { MAX_TIER } from '../gear';
import { town } from './town';
import { grassland } from './grassland';
import { poseidonCoast } from './dungeon1-poseidon-coast';
import { sirenGrotto } from './dungeon2-siren-grotto';
import { hephaestusForge } from './dungeon3-hephaestus-forge';
import { dodonaGrove } from './dodona-grove';
import { delphiPath } from './field-delphi-path';
import { marathonField } from './field-marathon';
import { troyBeach } from './field-troy-beach';
import { lernaSwamp } from './dungeon4-lerna-swamp';
import { knossosLabyrinth } from './dungeon5-knossos-labyrinth';
import { tartarusAbyss } from './dungeon6-tartarus-abyss';
import { nemeanValley } from './dungeon7-nemean-valley';
import { gorgonIsle } from './dungeon8-gorgon-isle';
import { cyclopsCave } from './dungeon9-cyclops-cave';
import { thebesWastes } from './dungeon10-thebes-wastes';
import { hesperidesGarden } from './dungeon11-hesperides-garden';
import { realmOfHades } from './dungeon12-realm-of-hades';
import { calydonForest } from './dungeon13-calydon-forest';
import { messinaStrait } from './dungeon14-messina-strait';
import { hyperboreanSnowfield } from './dungeon15-hyperborean-snowfield';
import { ceryneianMountain } from './dungeon16-ceryneian-mountain';
import { argosPasture } from './dungeon17-argos-pasture';
import { erytheiaIsle } from './dungeon18-erytheia-isle';
import { aethiopianCoast } from './dungeon19-aethiopian-coast';
import { pelionMountain } from './dungeon20-pelion-mountain';
import { echidnaLair } from './dungeon21-echidna-lair';
import { othrysBattlefield } from './dungeon22-othrys-battlefield';
import { libyanSerpentCave } from './dungeon23-libyan-serpent-cave';
import { fieldOfAres } from './dungeon24-field-of-ares';
import { teumessosMountain } from './dungeon25-teumessos-mountain';
import { hecateCrossroads } from './dungeon26-hecate-crossroads';
import { styxSource } from './dungeon27-styx-source';
import { stymphalianLake } from './dungeon28-stymphalian-lake';
import { mountOssa } from './dungeon29-mount-ossa';
import { olympusSummit } from './dungeon30-olympus-summit';
import { heliconSpring } from './side1-helicon-spring';
import { idaSummit } from './side2-ida-summit';
import { colchisGrove } from './side3-colchis-grove';
import { aegaePalace } from './side4-aegae-palace';
import { rhodesSunTemple } from './side5-rhodes-sun-temple';
import { thracianPeak } from './side6-thracian-peak';
import { etnaFoothills } from './side7-etna-foothills';
import { chiosHuntingGround } from './side8-chios-hunting-ground';
import { spartaPhobosShrine } from './side9-sparta-phobos-shrine';
import { areopagus } from './side10-areopagus';
import { orthrusDen } from './beast1-orthrus-den';
import { diomedesStables } from './beast2-diomedes-stables';
import { aventineCave } from './beast3-aventine-cave';
import { libyanDunes } from './beast4-libyan-dunes';
import { whirlpoolStrait } from './beast5-whirlpool-strait';
import { caucasusPeak } from './beast6-caucasus-peak';
import { goldenFleeceGrove } from './beast7-golden-fleece-grove';
import { libyanArena } from './beast8-libyan-arena';
import { phlegraFields } from './beast9-phlegra-fields';
import { typhonAbyss } from './beast10-typhon-abyss';
import { trialTower } from './trial-tower';

/**
 * 關卡登記表（唯一需要手動排序的地方）
 * ------------------------------------------------------------
 * 順序 = 世界地圖、每日任務的顯示順序。副本的層數看 zone.dungeon.floor。
 * 其他清單（ZONES、ENEMIES、DUNGEON_ORDER、野外清單、首領查詢…）都由這裡自動產生。
 * 新增關卡：見 docs/CONTENT.md「新增關卡」。
 */
export const STAGES: StageDef[] = [town, grassland, poseidonCoast, sirenGrotto, hephaestusForge, dodonaGrove, delphiPath, marathonField, troyBeach, lernaSwamp, knossosLabyrinth, tartarusAbyss, nemeanValley, gorgonIsle, cyclopsCave, thebesWastes, hesperidesGarden, realmOfHades,
  calydonForest, messinaStrait, hyperboreanSnowfield, ceryneianMountain, argosPasture, erytheiaIsle, aethiopianCoast, pelionMountain, echidnaLair, othrysBattlefield,
  libyanSerpentCave, fieldOfAres, teumessosMountain, hecateCrossroads, styxSource, stymphalianLake, mountOssa, olympusSummit,
  heliconSpring, idaSummit, colchisGrove, aegaePalace,
  rhodesSunTemple, thracianPeak, etnaFoothills, chiosHuntingGround, spartaPhobosShrine, areopagus,
  orthrusDen, diomedesStables, aventineCave, libyanDunes, whirlpoolStrait, caucasusPeak, goldenFleeceGrove, libyanArena, phlegraFields, typhonAbyss, trialTower];

export const ZONES = Object.fromEntries(STAGES.map((s) => [s.zone.id, s.zone])) as Record<ZoneId, ZoneDef>;

export const ENEMIES: Record<string, EnemyDef> = {};
for (const st of STAGES) {
  for (const [id, e] of Object.entries(st.enemies)) {
    if (ENEMIES[id]) throw new Error(`[stages] 敵人 id 重複：${id}（${st.zone.id}）`);
    ENEMIES[id] = e;
  }
}

/** 副本依層數排序 */
export const DUNGEON_ORDER: ZoneId[] = STAGES.filter((s) => s.zone.dungeon)
  .sort((a, b) => a.zone.dungeon!.floor - b.zone.dungeon!.floor)
  .map((s) => s.zone.id);

/** 城鎮與野外（世界地圖上可以直接前往的地方），依登記順序 */
export const FIELD_ORDER: ZoneId[] = STAGES.filter((s) => s.zone.kind !== 'dungeon' && !s.zone.side && !s.zone.beast && !s.zone.tower).map((s) => s.zone.id);

/** 支線地圖（守護者的家，v1.58），依登記順序 */
export const SIDE_ORDER: ZoneId[] = STAGES.filter((s) => s.zone.side).map((s) => s.zone.id);

/** 神獸討伐（v1.86），依關數排序 */
export const BEAST_ORDER: ZoneId[] = STAGES.filter((s) => s.zone.beast)
  .sort((a, b) => a.zone.beast!.order - b.zone.beast!.order)
  .map((s) => s.zone.id);

/** 還沒做的地區（只在地圖頁列出名稱） */
export const UPCOMING_FIELDS: { name: string; range: string }[] = [
];

/** 世界地圖上的野外清單（已開放＋即將開放） */
export const WORLD_FIELDS: { name: string; range: string; zone?: ZoneId }[] = [
  ...FIELD_ORDER.map((id) => {
    const z = ZONES[id];
    return { name: id === 'town' ? `${zoneName(id)}（安全區）` : zoneName(id), range: z.levelRange ? `Lv.${z.levelRange[0]}-${z.levelRange[1]}${z.lootTiers ? `・掉落 ${lootTierText(id)}` : ''}` : '', zone: id };
  }),
  ...UPCOMING_FIELDS,
];

/** 短地名：雅典城、阿卡迪亞草原、波賽頓海岸… */
export function zoneName(id: ZoneId | string | undefined): string {
  const def = id ? ZONES[id as ZoneId] : undefined;
  if (!def) return '雅典城';
  return def.kind === 'dungeon' ? def.name : def.subtitle.split('・')[0];
}

/** 層數的中文：一、二…十、十一…二十、二十一…（最多 99） */
export function floorLabel(floor: number): string {
  const D = '零一二三四五六七八九';
  const t = Math.floor(floor / 10);
  const o = floor % 10;
  const s = floor < 10 ? D[floor] : floor >= 100 ? String(floor) : `${t > 1 ? D[t] : ''}十${o ? D[o] : ''}`;
  return `第${s}層`;
}

/** 存檔欄位用的地名：副本加上層數（第一層・波賽頓海岸） */
export function zoneLabel(id: string | undefined): string {
  const def = id ? ZONES[id as ZoneId] : undefined;
  if (!def) return '雅典城';
  if (def.dungeon) return `${floorLabel(def.dungeon.floor)}・${def.name}`;
  return zoneName(def.id);
}

/** 這張地圖的首領（spawns 裡 boss 的敵人；沒有回傳 undefined） */
export function bossOf(id: ZoneId): EnemyDef | undefined {
  for (const sp of ZONES[id]?.spawns ?? []) if (ENEMIES[sp.enemy]?.boss) return ENEMIES[sp.enemy];
  return undefined;
}

/**
 * 這張地圖掉落的裝備階級：有填 lootTier 就用它；副本依層數——
 * 第一～三層 = 1~3 階、第四～六層 = 4 階、第七～九層 = 5 階、第十～十二層 = 6 階、
 * 第十三～十七層 = 7 階、第十八層以後 = 8 階（最高 8；v1.97 的第二十三～三十層也是 8 階）
 */
export function lootTierOf(id: ZoneId): number {
  const z = ZONES[id];
  if (z?.lootTier) return Math.min(MAX_TIER, z.lootTier);
  const f = z?.dungeon?.floor ?? 1;
  if (f >= 18) return Math.min(MAX_TIER, 8);
  if (f >= 13) return Math.min(MAX_TIER, 7);
  return Math.min(MAX_TIER, f <= 3 ? f : 3 + Math.ceil((f - 3) / 3));
}

/** 這一件掉落的階級：有 lootTiers（混合掉落）就隨機抽一個，否則 = lootTierOf() */
export function rollZoneTier(id: ZoneId, rng: () => number = Math.random): number {
  const list = ZONES[id]?.lootTiers;
  if (!list?.length) return lootTierOf(id);
  return Math.min(MAX_TIER, list[Math.floor(rng() * list.length)]);
}

/** 掉落階級的顯示文字：「3～4 階」或「4 階」 */
export function lootTierText(id: ZoneId): string {
  const list = ZONES[id]?.lootTiers;
  if (!list?.length) return `${lootTierOf(id)} 階`;
  const lo = Math.min(...list);
  const hi = Math.max(...list);
  return lo === hi ? `${lo} 階` : `${lo}～${hi} 階`;
}

/** 每日任務「在某區擊倒」會出的區域：等級落在 [建議下限, 建議上限 + 3]，且已解鎖、達到進入等級 */
export function zonesForLevel(level: number, bossesDefeated: ZoneId[]): ZoneId[] {
  const out: ZoneId[] = [];
  for (const st of STAGES) {
    const z = st.zone;
    if (z.safe || !z.levelRange || z.beast) continue; // 神獸討伐只有魔王，不出「擊倒 N 隻」任務
    if (z.minLevel && level < z.minLevel) continue;
    const after = z.dungeon?.unlockAfter ?? z.side?.unlockAfter;
    if (after && !bossesDefeated.includes(after)) continue;
    const [lo, hi] = z.levelRange;
    if (level >= lo && level <= hi + 3) out.push(z.id);
  }
  return out.length ? out : ['grassland'];
}
