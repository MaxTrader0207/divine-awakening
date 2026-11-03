import type { HeroClass } from './classes';

/**
 * 道具（消耗品）—— 古希臘神話主題：共用 15 種＋每個職業專屬 15 種（v1.33 起，後 5 種是後期的高階道具）
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
  /* ---- v1.33 高階共用道具 ---- */
  {
    id: 'hebe_cup',
    name: '赫柏青春之杯',
    icon: '🏆',
    desc: '立即回復 100% HP 與 100% MP（狂戰士：怒氣補滿）',
    lore: '青春女神赫柏為眾神斟酒的金杯',
    price: 320,
    effect: { type: 'heal', hp: 1, mp: 1, rage: 100 },
    dropWeight: 2,
    sharesPotionCd: true,
  },
  {
    id: 'nike_wreath',
    name: '尼姬勝利花環',
    icon: '🌸',
    desc: '60 秒內攻擊力 +30%',
    lore: '有翼的勝利女神為勝利者戴上的花環',
    price: 220,
    effect: { type: 'buff', stat: 'atk', value: 0.3, duration: 60 },
    dropWeight: 3,
  },
  {
    id: 'aegis_shard',
    name: '埃癸斯神盾碎片',
    icon: '🛡️',
    desc: '獲得最大 HP 45% 的護盾（30 秒）',
    lore: '宙斯與雅典娜的神盾，上面鑲著梅杜莎的頭',
    price: 240,
    effect: { type: 'shield', ratio: 0.45, duration: 30 },
    dropWeight: 3,
  },
  {
    id: 'kairos_sand',
    name: '凱洛斯時機之沙',
    icon: '⏳',
    desc: '所有技能冷卻立即轉好',
    lore: '「恰當時機」之神凱洛斯，只有前額有頭髮，錯過就抓不住',
    price: 260,
    effect: { type: 'cdReset' },
    dropWeight: 2,
  },
  {
    id: 'zeus_bolt',
    name: '宙斯雷霆碎片',
    icon: '⚡',
    desc: '對周圍 8 公尺造成 4 倍攻擊力的雷擊傷害',
    lore: '獨眼巨人為宙斯鍛造的雷霆掉下的一角',
    price: 240,
    effect: { type: 'nova', power: 4, radius: 8, color: 0xffe25a },
    dropWeight: 3,
  },
];

/** 同一種道具最多疊幾個 */
export const MAX_STACK = 99;

/** 精簡寫法：建立一個職業專屬道具 */
function c(cls: HeroClass, id: string, name: string, icon: string, desc: string, lore: string, price: number, effect: ConsumableEffect, dropWeight: number): ConsumableDef {
  return { id: `${cls}_${id}`, name, icon, desc, lore, price, effect, dropWeight, cls, sharesPotionCd: effect.type === 'heal' };
}

/** 職業專屬道具：每個職業 15 種，只有該職業看得到、買得到、掉得到 */
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
  c('mage', 'mnemosyne_spring', '謨涅摩緒涅記憶泉', '⛲', '25 秒內持續回復共 100% MP', '記憶女神之泉，喝了想起所有咒語', 150, { type: 'regen', total: 1, duration: 25, mp: true }, 6),
  c('mage', 'metis_draught', '墨提斯智謀藥', '🧠', '60 秒內爆擊率 +15%', '智慧女神墨提斯，雅典娜的母親', 170, { type: 'buff', stat: 'crit', value: 0.15, duration: 60 }, 4),
  c('mage', 'aegis_mantle', '雅典娜神盾披風', '🧥', '獲得最大 HP 45% 的護盾（30 秒）', '雅典娜借給佩爾修斯的光亮盾牌', 210, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('mage', 'chronos_hourglass', '柯羅諾斯時之沙漏', '⌛', '30 秒內技能冷卻快 45%', '時間之神手中流動的沙', 240, { type: 'buff', stat: 'cdr', value: 0.45, duration: 30 }, 2),
  c('mage', 'hyperion_flame', '許珀里翁烈陽', '🌞', '對周圍 7 公尺造成 4.5 倍攻擊力的烈焰傷害', '光明泰坦許珀里翁的太陽之火', 240, { type: 'nova', power: 4.5, radius: 7, color: 0xffb030 }, 3),
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
  c('archer', 'cerynitian_antler', '刻律涅牝鹿金角', '🦌', '40 秒內移動速度 +50%', '赫拉克勒斯追了一整年的金角銅蹄鹿', 150, { type: 'buff', stat: 'speed', value: 0.5, duration: 40 }, 5),
  c('archer', 'stymphalian_quill', '斯廷法利斯銅羽', '🪶', '60 秒內爆擊傷害 +50%', '怪鳥射出的銅羽，比箭還鋒利', 180, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('archer', 'nemean_pelt', '涅墨亞獅皮斗篷', '🦁', '獲得最大 HP 40% 的護盾（30 秒）', '刀槍不入的獅皮，赫拉克勒斯一直披在身上', 200, { type: 'shield', ratio: 0.4, duration: 30 }, 3),
  c('archer', 'hesperides_apple', '赫斯珀里得斯金蘋果', '🍏', '立即回復 100% HP', '黃昏女神花園裡赫拉的金蘋果', 250, { type: 'heal', hp: 1 }, 2),
  c('archer', 'helios_arrow', '赫利俄斯日焰箭', '☄️', '對周圍 8 公尺造成 4 倍攻擊力的火焰傷害', '太陽神的金車掉下的一道火光', 240, { type: 'nova', power: 4, radius: 8, color: 0xffa030 }, 3),
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
  c('knight', 'asclepius_salve', '阿斯克勒庇俄斯蛇杖膏', '⚕️', '立即回復 100% HP', '醫神蛇杖上的藥膏，能讓死人復活', 250, { type: 'heal', hp: 1 }, 2),
  c('knight', 'myrmidon_banner', '密爾彌冬戰旗', '🚩', '60 秒內攻擊力 +30%', '阿基里斯麾下最勇猛的軍團戰旗', 190, { type: 'buff', stat: 'atk', value: 0.3, duration: 60 }, 4),
  c('knight', 'hephaestus_rivet', '赫菲斯托斯神鍛鉚釘', '🔩', '45 秒內受到傷害 -45%', '火神為阿基里斯打造盾牌時留下的鉚釘', 210, { type: 'buff', stat: 'def', value: 0.45, duration: 45 }, 3),
  c('knight', 'zeus_aegis', '宙斯埃癸斯', '🛡️', '獲得最大 HP 60% 的護盾（30 秒）', '眾神之王的山羊皮神盾，搖動就會雷電交加', 250, { type: 'shield', ratio: 0.6, duration: 30 }, 2),
  c('knight', 'heracles_club', '赫拉克勒斯橄欖木棒', '🏏', '周圍 7 公尺的敵人受到 3.5 倍傷害並暈眩 2 秒（首領不會暈）', '大力士親手砍下的野橄欖樹幹', 220, { type: 'nova', power: 3.5, radius: 7, color: 0xd8a86a, stun: 2 }, 3),
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
  c('berserker', 'talos_ichor', '塔洛斯神血', '🩸', '立即回復 100% HP，怒氣補滿', '青銅巨人腳踝裡流動的神血', 250, { type: 'heal', hp: 1, rage: 100 }, 2),
  c('berserker', 'heracles_wrath', '赫拉克勒斯之怒', '😤', '45 秒內攻擊力 +40%', '被赫拉逼瘋時的大力士之怒', 230, { type: 'buff', stat: 'atk', value: 0.4, duration: 45 }, 3),
  c('berserker', 'lycaon_fang', '呂卡翁狼牙', '🐺', '45 秒內造成傷害的 15% 回血', '被宙斯變成狼的阿卡迪亞國王', 210, { type: 'buff', stat: 'leech', value: 0.15, duration: 45 }, 3),
  c('berserker', 'ares_bronze', '阿瑞斯青銅盾', '🛡️', '獲得最大 HP 45% 的護盾（30 秒）', '戰神在特洛伊城下舉著的青銅盾', 200, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('berserker', 'cyclops_hammer', '獨眼巨人鐵鎚', '🔨', '對周圍 7 公尺造成 4.5 倍傷害並暈眩 1.5 秒（首領不會暈）', '為宙斯鍛造雷霆的鐵鎚', 240, { type: 'nova', power: 4.5, radius: 7, color: 0xff8a3a, stun: 1.5 }, 3),
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
  c('summoner', 'orpheus_lament', '奧菲斯輓歌', '🎶', '立即召喚 2 隻提瑞西阿斯亡靈', '讓冥府亡魂都落淚的歌', 200, { type: 'summon', minion: 'skeleton_mage', count: 2 }, 4),
  c('summoner', 'hades_key', '冥府之鑰', '🗝️', '立即召喚 2 隻埃阿斯亡靈', '冥王黑帝斯掌管的冥府大門鑰匙', 250, { type: 'summon', minion: 'skeleton_warrior', count: 2 }, 3),
  c('summoner', 'persephone_crown', '普西芬妮冥后冠', '👑', '獲得最大 HP 40% 的護盾（30 秒）', '冥后頭上的水仙花冠', 200, { type: 'shield', ratio: 0.4, duration: 30 }, 3),
  c('summoner', 'nyx_veil', '尼克斯夜幕面紗', '🌑', '4 秒內無敵', '連宙斯都畏懼的黑夜女神', 190, { type: 'invuln', duration: 4 }, 3),
  c('summoner', 'erebus_mist', '厄瑞玻斯冥霧', '🌫️', '對周圍 7 公尺造成 3 倍傷害並緩速', '冥府最深處的黑暗之霧', 170, { type: 'nova', power: 3, radius: 7, color: 0x7a5aaa, slow: 3 }, 4),
  // ---- 劍俠：爆擊、冷卻、身法 ----
  c('swordsman', 'icaria_wine', '伊卡里亞葡萄酒', '🍷', '立即回復 50% HP', '酒神第一次把葡萄酒交給人間的村莊', 45, { type: 'heal', hp: 0.5 }, 12),
  c('swordsman', 'castalia_spring', '卡斯塔利亞聖泉', '💧', '立即回復 50% MP', '德爾菲山腳下、詩人與劍客都來飲的泉水', 40, { type: 'heal', mp: 0.5 }, 12),
  c('swordsman', 'panacea_herb', '帕納刻萬靈草', '🌿', '20 秒內持續回復共 80% HP', '醫神之女帕納刻，能治百病的藥草', 110, { type: 'regen', total: 0.8, duration: 20 }, 8),
  c('swordsman', 'hermes_strap', '赫密士鞋帶', '🪢', '40 秒內移動速度 +40%', '從信使之神的飛翼涼鞋拆下的鞋帶', 100, { type: 'buff', stat: 'speed', value: 0.4, duration: 40 }, 6),
  c('swordsman', 'nemesis_whetstone', '涅墨西斯磨劍石', '🪨', '60 秒內爆擊率 +20%', '復仇女神用來磨利審判之劍的石頭', 150, { type: 'buff', stat: 'crit', value: 0.2, duration: 60 }, 4),
  c('swordsman', 'peleus_oil', '珀琉斯劍油', '🛢️', '60 秒內攻擊力 +25%', '阿基里斯之父擦拭神賜之劍的油', 160, { type: 'buff', stat: 'atk', value: 0.25, duration: 60 }, 4),
  c('swordsman', 'palamedes_dice', '帕拉墨得斯骰子', '🎲', '30 秒內技能冷卻快 30%', '特洛伊戰場上，智者發明來打發時間的骰子', 150, { type: 'buff', stat: 'cdr', value: 0.3, duration: 30 }, 4),
  c('swordsman', 'harpe_shard', '珀耳修斯金鐮碎片', '🌙', '60 秒內爆擊傷害 +50%', '斬下梅杜莎頭顱的金鐮刃上掉下的碎片', 170, { type: 'buff', stat: 'critDmg', value: 0.5, duration: 60 }, 4),
  c('swordsman', 'boreas_gust', '玻瑞阿斯北風', '🌬️', '對周圍 7 公尺造成 3 倍傷害並緩速', '北風之神一口氣吹出的劍風', 130, { type: 'nova', power: 3, radius: 7, color: 0xb8f0ff, slow: 3 }, 5),
  c('swordsman', 'ariadne_thread', '阿里阿德涅線團', '🧶', '所有技能冷卻立即轉好', '帶忒修斯走出迷宮的線團', 200, { type: 'cdReset' }, 3),
  c('swordsman', 'dioscuri_star', '狄俄斯庫里雙星', '✨', '3 秒內無敵', '守護航海者與劍士的雙子星', 160, { type: 'invuln', duration: 3 }, 3),
  c('swordsman', 'meleager_brand', '墨勒阿革洛斯命運木', '🪵', '45 秒內造成傷害的 12% 回血', '燒完就會帶走主人性命的那根木柴', 180, { type: 'buff', stat: 'leech', value: 0.12, duration: 45 }, 3),
  c('swordsman', 'thetis_veil', '忒提斯海紗', '🌊', '獲得最大 HP 45% 的護盾（30 秒）', '海之女神披在兒子身上的海紗', 210, { type: 'shield', ratio: 0.45, duration: 30 }, 3),
  c('swordsman', 'fleece_thread', '金羊毛絲線', '🐑', '立即回復 100% HP 與 MP', '從科爾基斯金羊毛上抽出的一縷金絲', 250, { type: 'heal', hp: 1, mp: 1 }, 2),
  c('swordsman', 'cronus_harpe', '克洛諾斯鐮刃', '🌘', '對周圍 7 公尺造成 5 倍攻擊力的傷害', '泰坦之王推翻天空時揮出的第一把鐮刃', 260, { type: 'nova', power: 5, radius: 7, color: 0x8fd8ff }, 2),
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
