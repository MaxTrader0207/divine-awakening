import type { HeroClass } from './classes';

/**
 * 道具（消耗品）—— 古希臘神話主題：共用 10 種＋每個職業專屬 10 種
 * ------------------------------------------------------------
 * 紅藥水 / 藍藥水仍是快捷鍵 1、2 的基本藥水；這裡是背包裡的進階道具，
 * 在「選單 → 裝備」的「道具」區使用，商城有賣，怪物偶爾掉落（首領必掉 1 個）。
 * 效果由 Game.useConsumable() 套用；邏輯（能不能用、扣數量）在 systems/Consumables.ts。
 */
export type BuffStat = 'atk' | 'def' | 'speed' | 'crit' | 'pen' | 'critDmg' | 'cdr' | 'leech';

export type ConsumableEffect =
  /** 立即回復（比例；怒氣職業的 MP 改成固定加怒氣 rage） */
  | { type: 'heal'; hp?: number; mp?: number; rage?: number }
  /** 持續回復：duration 秒內共回復 total 比例的 HP（mp: true 改回 MP） */
  | { type: 'regen'; total: number; duration: number; mp?: boolean }
  /**
   * 暫時增益（秒）。value 的意思：
   * atk / speed：倍率加成（0.2 = +20%）；def：受到傷害減少比例；crit / pen / critDmg：直接加上去；
   * cdr：技能冷卻轉得更快（0.3 = 快 30%）；leech：造成傷害的這個比例回血
   */
  | { type: 'buff'; stat: BuffStat; value: number; duration: number }
  /** 傳送回雅典城 */
  | { type: 'town' }
  /** 長時間加成（遊戲時間秒數，存檔保存） */
  | { type: 'boost'; stat: 'exp' | 'gold'; value: number; duration: number }
  /** 所有技能冷卻立即轉好 */
  | { type: 'cdReset' }
  /** 無敵（秒） */
  | { type: 'invuln'; duration: number }
  /** 以自己為中心的範圍傷害：攻擊力 × power，可附帶暈眩（首領免疫）/ 緩速 */
  | { type: 'nova'; power: number; radius: number; color: number; stun?: number; slow?: number }
  /** 召喚師：立即召喚（不花 MP、不受冷卻） */
  | { type: 'summon'; minion: 'skeleton_minion' | 'skeleton_mage' | 'skeleton_warrior'; count: number }
  /** 護盾：吸收最大 HP 的 ratio 比例傷害，duration 秒後消失 */
  | { type: 'shield'; ratio: number; duration: number };

export interface ConsumableDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** 典故 */
  lore: string;
  price: number;
  effect: ConsumableEffect;
  /** 掉落權重（0 = 不會掉） */
  dropWeight: number;
  /** 共用藥水冷卻（立即回復類） */
  sharesPotionCd?: boolean;
  /** 職業專屬（沒填 = 所有職業共用） */
  cls?: HeroClass;
}

export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'ambrosia',
    name: '神饌安布羅西亞',
    icon: '🍯',
    desc: '立即回復 70% HP',
    lore: '奧林帕斯眾神的食物，吃了能長生不老',
    price: 60,
    effect: { type: 'heal', hp: 0.7 },
    dropWeight: 10,
    sharesPotionCd: true,
  },
  {
    id: 'nectar',
    name: '神酒涅克塔',
    icon: '🏺',
    desc: '立即回復 70% MP（狂戰士：怒氣 +60）',
    lore: '眾神宴會上由赫柏斟上的美酒',
    price: 60,
    effect: { type: 'heal', mp: 0.7, rage: 60 },
    dropWeight: 10,
    sharesPotionCd: true,
  },
  {
    id: 'wine',
    name: '狄俄尼索斯葡萄酒',
    icon: '🍷',
    desc: '立即回復 40% HP 與 40% MP（狂戰士：怒氣 +35）',
    lore: '酒神親手釀的葡萄酒，讓人忘卻疲憊',
    price: 70,
    effect: { type: 'heal', hp: 0.4, mp: 0.4, rage: 35 },
    dropWeight: 8,
    sharesPotionCd: true,
  },
  {
    id: 'hestia_bread',
    name: '赫斯提亞爐火麵包',
    icon: '🍞',
    desc: '15 秒內持續回復共 60% HP',
    lore: '在灶神聖火旁烤好的麵包，每個家庭爐火的祝福',
    price: 40,
    effect: { type: 'regen', total: 0.6, duration: 15 },
    dropWeight: 12,
  },
  {
    id: 'ares_blood',
    name: '阿瑞斯戰血',
    icon: '⚔️',
    desc: '60 秒內攻擊力 +20%',
    lore: '戰神在特洛伊戰場上流下的血',
    price: 120,
    effect: { type: 'buff', stat: 'atk', value: 0.2, duration: 60 },
    dropWeight: 5,
  },
  {
    id: 'athena_oil',
    name: '雅典娜橄欖油',
    icon: '🫒',
    desc: '60 秒內受到的傷害 -25%',
    lore: '雅典娜送給雅典城的聖樹所榨的油，塗在盾上能擋住惡意',
    price: 120,
    effect: { type: 'buff', stat: 'def', value: 0.25, duration: 60 },
    dropWeight: 5,
  },
  {
    id: 'hermes_tonic',
    name: '赫密士疾行藥',
    icon: '💨',
    desc: '30 秒內移動速度 +30%',
    lore: '信使之神的祕方，喝了腳步像長了翅膀',
    price: 80,
    effect: { type: 'buff', stat: 'speed', value: 0.3, duration: 30 },
    dropWeight: 6,
  },
  {
    id: 'hermes_feather',
    name: '赫密士之羽',
    icon: '🪶',
    desc: '立即傳送回雅典城（城裡、首領戰中不能用）',
    lore: '從信使之神的飛翼涼鞋上掉下來的羽毛',
    price: 50,
    effect: { type: 'town' },
    dropWeight: 6,
  },
  {
    id: 'muse_honey',
    name: '謬思蜂蜜',
    icon: '🐝',
    desc: '10 分鐘內（遊戲時間）獲得的經驗值 +30%',
    lore: '赫利孔山上，九位謬思女神花園裡的蜂蜜',
    price: 300,
    effect: { type: 'boost', stat: 'exp', value: 0.3, duration: 600 },
    dropWeight: 2,
  },
  {
    id: 'tyche_coin',
    name: '堤喀幸運金幣',
    icon: '🪙',
    desc: '10 分鐘內（遊戲時間）獲得的金幣 +50%',
    lore: '命運與幸運女神堤喀的金幣，擲出去總是正面',
    price: 300,
    effect: { type: 'boost', stat: 'gold', value: 0.5, duration: 600 },
    dropWeight: 2,
  },
];

/** 同一種道具最多疊幾個 */
export const MAX_STACK = 99;

/** 精簡寫法：建立一個職業專屬道具 */
function c(cls: HeroClass, id: string, name: string, icon: string, desc: string, lore: string, price: number, effect: ConsumableEffect, dropWeight: number): ConsumableDef {
  return { id: `${cls}_${id}`, name, icon, desc, lore, price, effect, dropWeight, cls, sharesPotionCd: effect.type === 'heal' };
}

/** 職業專屬道具：每個職業 10 種，只有該職業看得到、買得到、掉得到 */
export const CLASS_CONSUMABLES: ConsumableDef[] = [
  // ---- 法師：魔力、冷卻、穿透 ----
  c('mage', 'nymph_spring', '寧芙泉水', '💧', '立即回復 50% MP', '山林寧芙守護的清泉', 40, { type: 'heal', mp: 0.5 }, 12),
  c('mage', 'selene_dew', '塞勒涅月露', '🌙', '20 秒內持續回復共 80% MP', '月神夜裡灑下的露水', 70, { type: 'regen', total: 0.8, duration: 20, mp: true }, 9),
  c('mage', 'circe_potion', '喀耳刻藥水', '🧪', '立即回復 35% HP 與 60% MP', '艾尤島女巫的祕方，這次不會把你變成豬', 90, { type: 'heal', hp: 0.35, mp: 0.6 }, 8),
  c('mage', 'delphi_laurel', '德爾菲月桂葉', '🌿', '30 秒內技能冷卻快 30%', '阿波羅神廟裡皮媞亞咀嚼的月桂葉', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('mage', 'hecate_moon', '黑卡蒂月光藥', '🔮', '45 秒內穿透 +15%', '在三岔路口、月光下調製的魔藥', 150, { type: 'buff', stat: 'pen', value: 0.15, duration: 45 }, 4),
  c('mage', 'owl_feather', '貓頭鷹智慧之羽', '🪶', '60 秒內爆擊傷害 +40%', '雅典娜的聖鳥掉下的羽毛', 160, { type: 'buff', stat: 'critDmg', value: 0.4, duration: 60 }, 4),
  c('mage', 'promethean_fire', '普羅米修斯火種', '🔥', '對周圍 6 公尺造成 3 倍攻擊力的火焰傷害', '從奧林帕斯偷給人類的火', 120, { type: 'nova', power: 3, radius: 6, color: 0xff7a2a }, 5),
  c('mage', 'muse_scroll', '謬思靈感卷軸', '📜', '所有技能冷卻立即轉好', '九位謬思同時降下的靈感', 200, { type: 'cdReset' }, 3),
  c('mage', 'hades_cap_shard', '隱形帽碎片', '🎩', '4 秒內無敵', '黑帝斯隱形帽上掉下的一角', 180, { type: 'invuln', duration: 4 }, 3),
  c('mage', 'medea_elixir', '美狄亞回春藥', '⚗️', '立即回復 100% HP 與 MP', '美狄亞讓老人返老還童的藥鍋', 250, { type: 'heal', hp: 1, mp: 1 }, 2),
  // ---- 弓手：爆擊、移速、穿透 ----
  c('archer', 'nymph_dew', '林地寧芙露水', '💧', '立即回復 50% HP', '樹林裡寧芙收集的晨露', 40, { type: 'heal', hp: 0.5 }, 12),
  c('archer', 'chiron_herbs', '喀戎草藥包', '🌿', '20 秒內持續回復共 70% HP', '半人馬賢者喀戎教阿斯克勒庇俄斯的草藥', 80, { type: 'regen', total: 0.7, duration: 20 }, 9),
  c('archer', 'centaur_wine', '半人馬奔馳酒', '🍺', '40 秒內移動速度 +40%', '半人馬族婚宴上喝的烈酒', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('archer', 'artemis_eye', '阿蒂蜜絲鷹眼藥', '🦅', '60 秒內爆擊率 +15%', '狩獵女神滴在箭手眼中的藥', 150, { type: 'buff', stat: 'crit', value: 0.15, duration: 60 }, 4),
  c('archer', 'apollo_oil', '阿波羅金陽油', '☀️', '60 秒內攻擊力 +25%', '塗在箭頭上，閃著太陽神的金光', 160, { type: 'buff', stat: 'atk', value: 0.25, duration: 60 }, 4),
  c('archer', 'orion_star', '奧利安星光', '✨', '45 秒內穿透 +15%', '獵戶座三顆腰帶星的光', 150, { type: 'buff', stat: 'pen', value: 0.15, duration: 45 }, 4),
  c('archer', 'string_wax', '赫拉克勒斯弓弦蠟', '🏹', '30 秒內技能冷卻快 30%', '大力士用來保養神弓的蜂蠟', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('archer', 'hydra_venom', '九頭蛇毒箭油', '🐍', '對周圍 7 公尺造成 2.5 倍傷害並緩速', '赫拉克勒斯把箭浸在九頭蛇血裡', 120, { type: 'nova', power: 2.5, radius: 7, color: 0x6fd36a, slow: 3 }, 5),
  c('archer', 'golden_apple', '阿塔蘭塔金蘋果', '🍎', '所有技能冷卻立即轉好', '讓飛毛腿阿塔蘭塔停下腳步的金蘋果', 200, { type: 'cdReset' }, 3),
  c('archer', 'stag_horn', '亞克提安鹿角粉', '🦌', '3 秒內無敵', '被變成鹿的獵人留下的角', 160, { type: 'invuln', duration: 3 }, 3),
  // ---- 騎士：防禦、護盾、暈眩 ----
  c('knight', 'black_broth', '斯巴達黑湯', '🥣', '立即回復 60% HP', '斯巴達戰士每天喝的黑湯，難喝但有力', 50, { type: 'heal', hp: 0.6 }, 12),
  c('knight', 'hector_oath', '赫克托耳誓言', '🕯️', '20 秒內持續回復共 80% HP', '特洛伊守護者出城前的誓言', 120, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('knight', 'hoplite_oil', '重裝步兵盾油', '🛢️', '60 秒內受到傷害 -35%', '擦亮圓盾的橄欖油', 150, { type: 'buff', stat: 'def', value: 0.35, duration: 60 }, 5),
  c('knight', 'ajax_charm', '埃阿斯塔盾護符', '🛡️', '獲得最大 HP 40% 的護盾（30 秒）', '特洛伊戰爭中最堅固的七層牛皮盾', 180, { type: 'shield', ratio: 0.4, duration: 30 }, 4),
  c('knight', 'achilles_cry', '阿基里斯戰吼', '📯', '60 秒內攻擊力 +20%', '阿基里斯在城牆下的怒吼', 140, { type: 'buff', stat: 'atk', value: 0.2, duration: 60 }, 5),
  c('knight', 'red_cloak', '斯巴達紅披風', '🧣', '40 秒內移動速度 +30%', '斯巴達戰士的紅披風，看不出有沒有受傷', 100, { type: 'buff', stat: 'speed', value: 0.3, duration: 40 }, 5),
  c('knight', 'olive_crown', '奧林匹亞橄欖冠', '🫒', '60 秒內穿透 +12%', '奧運冠軍頭上的野橄欖枝', 140, { type: 'buff', stat: 'pen', value: 0.12, duration: 60 }, 4),
  c('knight', 'medusa_eye', '梅杜莎之眼', '👁️', '周圍 6 公尺的敵人石化 3 秒並受到 2 倍傷害（首領不會石化）', '佩爾修斯砍下的蛇髮女妖之眼', 160, { type: 'nova', power: 2, radius: 6, color: 0x9fd3a0, stun: 3 }, 4),
  c('knight', 'leonidas_song', '列奧尼達戰歌', '🎺', '所有技能冷卻立即轉好', '溫泉關三百勇士的戰歌', 200, { type: 'cdReset' }, 3),
  c('knight', 'styx_water', '忒提斯冥河水', '🌊', '5 秒內無敵', '阿基里斯的母親把他浸入冥河的水', 200, { type: 'invuln', duration: 5 }, 2),
  // ---- 狂戰士：怒氣、攻擊、吸血 ----
  c('berserker', 'thracian_spirit', '色雷斯烈酒', '🍶', '怒氣立即補滿', '北方蠻族喝了就上戰場的烈酒', 40, { type: 'heal', rage: 100 }, 12),
  c('berserker', 'bull_blood', '米諾陶洛斯牛血', '🐂', '立即回復 50% HP', '迷宮怪物的血，喝了渾身發熱', 45, { type: 'heal', hp: 0.5 }, 12),
  c('berserker', 'antaeus_soil', '安泰俄斯大地之土', '🪨', '20 秒內持續回復共 80% HP', '只要碰到大地就能恢復力量的巨人', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('berserker', 'ares_wine', '阿瑞斯血酒', '🍷', '60 秒內攻擊力 +30%', '戰神神殿供桌上的紅酒', 170, { type: 'buff', stat: 'atk', value: 0.3, duration: 60 }, 4),
  c('berserker', 'maenad_vine', '酒神女信徒之藤', '🍇', '45 秒內造成傷害的 10% 回血', '狂歡的酒神女信徒頭上的葡萄藤', 160, { type: 'buff', stat: 'leech', value: 0.1, duration: 45 }, 4),
  c('berserker', 'kratos_powder', '克拉托斯力量粉', '💪', '60 秒內爆擊傷害 +50%', '力量之神克拉托斯的祝福', 160, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('berserker', 'chariot_grease', '戰車輪油', '🛞', '40 秒內移動速度 +35%', '阿瑞斯戰車輪軸上的油', 100, { type: 'buff', stat: 'speed', value: 0.35, duration: 40 }, 5),
  c('berserker', 'lion_heart', '尼米亞獅心', '🦁', '30 秒內受到傷害 -40%', '刀槍不入的尼米亞猛獅之心', 160, { type: 'buff', stat: 'def', value: 0.4, duration: 30 }, 4),
  c('berserker', 'titan_stone', '泰坦撼地石', '🌋', '對周圍 7 公尺造成 3.5 倍傷害', '泰坦之戰時被扔下奧林帕斯的巨石碎片', 140, { type: 'nova', power: 3.5, radius: 7, color: 0xff5a3c }, 5),
  c('berserker', 'enyo_horn', '恩尤戰禍號角', '📯', '所有技能冷卻立即轉好', '戰爭女神恩尤吹響的號角', 200, { type: 'cdReset' }, 3),
  // ---- 召喚師：召喚、魔力、生存 ----
  c('summoner', 'styx_water', '冥河之水', '💧', '立即回復 50% MP', '連眾神都要對著它發誓的冥河水', 40, { type: 'heal', mp: 0.5 }, 12),
  c('summoner', 'pomegranate', '普西芬妮石榴籽', '🫐', '立即回復 40% HP 與 40% MP', '吃了就得每年回冥界半年的石榴籽', 70, { type: 'heal', hp: 0.4, mp: 0.4 }, 10),
  c('summoner', 'orpheus_lyre', '奧菲斯里拉', '🎻', '20 秒內持續回復共 80% HP', '感動冥王的琴聲', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('summoner', 'charon_obol', '卡戎銀幣', '🪙', '立即召喚 2 隻斯巴達亡靈（不花 MP）', '付給冥河擺渡人的船資', 90, { type: 'summon', minion: 'skeleton_minion', count: 2 }, 8),
  c('summoner', 'seer_bone', '提瑞西阿斯預言骨', '🦴', '立即召喚 1 隻提瑞西阿斯亡靈', '盲眼先知在冥府占卜用的骨片', 120, { type: 'summon', minion: 'skeleton_mage', count: 1 }, 6),
  c('summoner', 'dragon_tooth', '卡德摩斯龍牙', '🦷', '立即召喚 1 隻埃阿斯亡靈', '種進土裡就會長出戰士的龍牙', 150, { type: 'summon', minion: 'skeleton_warrior', count: 1 }, 5),
  c('summoner', 'honey_cake', '刻耳柏洛斯蜜餅', '🍪', '60 秒內受到傷害 -30%', '安撫冥界三頭犬的蜜餅', 140, { type: 'buff', stat: 'def', value: 0.3, duration: 60 }, 4),
  c('summoner', 'thanatos_feather', '塔納托斯黑羽', '🖤', '45 秒內攻擊力 +25%（召喚物一起變強）', '死神翅膀上的黑色羽毛', 150, { type: 'buff', stat: 'atk', value: 0.25, duration: 45 }, 4),
  c('summoner', 'hecate_flame', '黑卡蒂冥火', '🕯️', '對周圍 6 公尺造成 2.5 倍傷害', '冥界女神火炬上的幽火', 120, { type: 'nova', power: 2.5, radius: 6, color: 0xb48cff }, 5),
  c('summoner', 'lethe_water', '勒特忘川水', '🌫️', '所有技能冷卻立即轉好', '喝了就會忘記一切的遺忘之河', 200, { type: 'cdReset' }, 3),
];

/** 某職業看得到的所有道具（共用＋專屬） */
export function consumablesFor(cls?: HeroClass): ConsumableDef[] {
  return [...CONSUMABLES, ...CLASS_CONSUMABLES.filter((d) => d.cls === cls)];
}

export const CONSUMABLE_MAP: Record<string, ConsumableDef> = Object.fromEntries([...CONSUMABLES, ...CLASS_CONSUMABLES].map((d) => [d.id, d]));

/** 小怪掉道具的機率（首領必掉 1 個） */
export const CONSUMABLE_DROP_CHANCE = 0.05;

/** 依權重隨機挑一個道具（共用＋該職業專屬） */
export function rollConsumable(rng: () => number = Math.random, cls?: HeroClass): string {
  const pool = consumablesFor(cls);
  const total = pool.reduce((a, d) => a + d.dropWeight, 0);
  let r = rng() * total;
  for (const d of pool) {
    r -= d.dropWeight;
    if (r < 0) return d.id;
  }
  return pool[0].id;
}
