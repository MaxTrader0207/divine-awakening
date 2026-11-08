/**
 * 首領招式庫（資料）
 * ------------------------------------------------------------
 * 每個招式 = 一種「招式模板」（pattern）＋參數。BossController 依模板執行：
 * 先畫紅色預警（Telegraphs），預警結束時站在範圍內才會受傷（傷害 = 首領攻擊力公式 × power）。
 * 「狂暴」（血量低於 50%）時，參數裡 *Enraged 的值會取代原本的值。
 *
 * 新增招式：在 BOSS_SKILLS 加一筆（選一個 pattern 填參數）→ 在首領的 EnemyDef.bossSkills 裡引用 id。
 * 需要全新的動作（例如召喚小怪、拉人）才要到 systems/BossController.ts 加新的 pattern。
 * 詳細步驟見 docs/CONTENT.md。
 */

interface Base {
  /** 招式中文名（文件、除錯用） */
  name: string;
  /** 一句話說明 */
  desc: string;
  /** 預警時間（秒） */
  windup: number;
  /** 傷害倍率 */
  power: number;
  /** 特效顏色 */
  color: number;
}

export type BossSkillDef =
  /** 前方扇形 */
  | (Base & { pattern: 'cone'; range: number; angle: number; angleEnraged?: number })
  /** 直線衝撞（衝到終點，會被牆擋住） */
  | (Base & { pattern: 'dash'; length: number; width: number })
  /** 以自己為中心的圓 */
  | (Base & { pattern: 'nova'; radius: number; radiusEnraged?: number; discColor?: number })
  /** 在玩家附近隨機落下多個圓（第一個落在玩家腳下） */
  | (Base & { pattern: 'rain'; count: number; countEnraged?: number; radius: number; spread: number; stagger: number; pillarColor?: number })
  /** 跳到玩家位置砸地 */
  | (Base & { pattern: 'leap'; radius: number; discColor?: number })
  /** 從自己往玩家方向一排圓（依序爆開） */
  | (Base & { pattern: 'line'; count: number; countEnraged?: number; start: number; spacing: number; radius: number; stagger: number })
  /** 以自己為中心、平均分布的多道窄扇形（第一道對準玩家；扇形之間是安全區） */
  | (Base & { pattern: 'spokes'; count: number; countEnraged?: number; range: number; angle: number })
  /** 同時好幾排 line（角度相對玩家方向，度），例如三頭犬三顆頭一起噴火 */
  | (Base & { pattern: 'multiLine'; angles: number[]; anglesEnraged?: number[]; count: number; start: number; spacing: number; radius: number; stagger: number });

export const BOSS_SKILLS = {
  claw_slam: {
    pattern: 'cone', name: '巨鉗重擊', desc: '前方扇形重擊（狂暴時範圍更寬）',
    windup: 1.0, power: 1.8, color: 0xffb36b, range: 6, angle: 100, angleEnraged: 140,
  },
  charge: {
    pattern: 'dash', name: '衝撞', desc: '朝玩家直線衝撞 12 公尺',
    windup: 1.1, power: 2, color: 0xffb36b, length: 12, width: 2.8,
  },
  ground_slam: {
    pattern: 'nova', name: '震地', desc: '自身周圍震地（狂暴時範圍更大）',
    windup: 1.2, power: 2, color: 0x8fe3ff, discColor: 0x4fb8ff, radius: 5.5, radiusEnraged: 7,
  },
  tide_rain: {
    pattern: 'rain', name: '潮水落下', desc: '玩家附近落下多道潮水（狂暴時更多）',
    windup: 1.4, power: 1.5, color: 0x4fb8ff, pillarColor: 0x8fe3ff, count: 4, countEnraged: 6, radius: 2.2, spread: 5, stagger: 0.12,
  },
  leap: {
    // 遠程職業躲不掉距離，所以預警給長一點、傷害低一點（v1.16）
    pattern: 'leap', name: '飛撲砸地', desc: '跳到玩家位置砸地',
    windup: 1.5, power: 1.8, color: 0xff8a3c, discColor: 0xff5a1a, radius: 3.4,
  },
  lava_spit: {
    pattern: 'line', name: '熔岩噴吐', desc: '朝玩家方向吐出一排熔岩彈（狂暴時更長）',
    windup: 0.9, power: 1.2, color: 0xff5a1a, count: 5, countEnraged: 7, start: 2.5, spacing: 2.2, radius: 1.7, stagger: 0.15,
  },

  /* ---- 第四層 九頭蛇許德拉 ---- */
  venom_spit: {
    pattern: 'line', name: '毒液噴吐', desc: '朝玩家方向一排毒液（狂暴時更長）',
    windup: 1.0, power: 1.3, color: 0x6fd36a, count: 6, countEnraged: 8, start: 2.5, spacing: 2.2, radius: 1.7, stagger: 0.13,
  },
  hydra_heads: {
    pattern: 'spokes', name: '九頭齊咬', desc: '多顆頭往四周咬下，頭與頭之間是安全區（狂暴時頭更多）',
    windup: 1.2, power: 1.6, color: 0x9fe36a, count: 5, countEnraged: 7, range: 8, angle: 24,
  },
  poison_rain: {
    pattern: 'rain', name: '毒霧落下', desc: '玩家附近落下多團毒霧',
    windup: 1.5, power: 1.4, color: 0x5aa84a, pillarColor: 0xb8f08a, count: 5, countEnraged: 7, radius: 2.4, spread: 6, stagger: 0.12,
  },
  /* ---- 第五層 米諾陶洛斯 ---- */
  labrys_sweep: {
    pattern: 'cone', name: '雙刃斧橫掃', desc: '前方大範圍橫掃（狂暴時幾乎半圈）',
    windup: 1.1, power: 2.0, color: 0xffd36b, range: 7, angle: 150, angleEnraged: 200,
  },
  bull_rush: {
    pattern: 'dash', name: '狂牛衝撞', desc: '低頭朝玩家衝撞 16 公尺',
    windup: 1.3, power: 1.9, color: 0xff8a5a, length: 16, width: 3.2,
  },
  labyrinth_quake: {
    pattern: 'rain', name: '迷宮落石', desc: '踏地震動，迷宮頂端的石塊落下',
    windup: 1.4, power: 1.5, color: 0xcfc6b0, pillarColor: 0xfff2d0, count: 6, countEnraged: 9, radius: 2, spread: 7, stagger: 0.1,
  },
  /* ---- 第六層 刻耳柏洛斯 ---- */
  hellfire_breath: {
    pattern: 'multiLine', name: '三頭冥火', desc: '三顆頭同時往前方三個方向噴火（狂暴時五道）',
    windup: 1.1, power: 1.3, color: 0xff7a2a, angles: [-28, 0, 28], anglesEnraged: [-44, -22, 0, 22, 44], count: 5, start: 2.5, spacing: 2, radius: 1.5, stagger: 0.12,
  },
  cerberus_pounce: {
    pattern: 'leap', name: '冥犬撲擊', desc: '撲到玩家位置',
    windup: 1.5, power: 1.7, color: 0xb48cff, discColor: 0x7a3aff, radius: 3.6,
  },
  underworld_flames: {
    pattern: 'rain', name: '冥火落雨', desc: '塔爾塔洛斯的冥火從天而降',
    windup: 1.4, power: 1.4, color: 0x9a5aff, pillarColor: 0xff9a3c, count: 5, countEnraged: 8, radius: 2.2, spread: 6, stagger: 0.12,
  },
  /* ---- 第七層 涅墨亞獅 ---- */
  lion_claw: {
    pattern: 'cone', name: '獅爪撕裂', desc: '前方扇形撕裂（狂暴時範圍更寬）',
    windup: 1.0, power: 1.9, color: 0xffb34a, range: 6.5, angle: 110, angleEnraged: 160,
  },
  lion_pounce: {
    pattern: 'leap', name: '金鬃猛撲', desc: '撲到玩家位置',
    windup: 1.5, power: 1.7, color: 0xffd36b, discColor: 0xffa02a, radius: 3.6,
  },
  lion_roar: {
    pattern: 'nova', name: '震天獅吼', desc: '自身周圍的怒吼震波（狂暴時範圍更大）',
    windup: 1.2, power: 1.8, color: 0xffe08a, discColor: 0xffb34a, radius: 6, radiusEnraged: 8,
  },
  /* ---- 第八層 梅杜莎 ---- */
  gorgon_gaze: {
    pattern: 'cone', name: '石化凝視', desc: '前方長距離的窄扇形凝視（狂暴時更寬）',
    windup: 1.3, power: 2.0, color: 0xc8ff6a, range: 11, angle: 40, angleEnraged: 70,
  },
  snake_hair: {
    pattern: 'spokes', name: '蛇髮亂舞', desc: '蛇髮往四周咬出，蛇與蛇之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.6, color: 0x7ad35a, count: 6, countEnraged: 8, range: 8, angle: 22,
  },
  gorgon_arrows: {
    pattern: 'multiLine', name: '毒蛇箭雨', desc: '拉弓同時射出四排毒箭（狂暴時六排）',
    windup: 1.1, power: 1.3, color: 0x9aff5a, angles: [-36, -12, 12, 36], anglesEnraged: [-50, -30, -10, 10, 30, 50], count: 5, start: 2.5, spacing: 2.2, radius: 1.4, stagger: 0.1,
  },
  /* ---- 第九層 獨眼巨人波呂斐摩斯 ---- */
  club_sweep: {
    pattern: 'cone', name: '巨棒橫掃', desc: '大範圍橫掃（狂暴時幾乎半圈以上）',
    windup: 1.2, power: 2.0, color: 0xd8a86a, range: 7.5, angle: 160, angleEnraged: 220,
  },
  boulder_toss: {
    pattern: 'rain', name: '投擲巨石', desc: '把洞口的巨石丟向玩家（範圍大、數量少）',
    windup: 1.6, power: 1.8, color: 0xa89878, pillarColor: 0xe8dcc0, count: 3, countEnraged: 5, radius: 3.2, spread: 7, stagger: 0.25,
  },
  cyclops_stomp: {
    pattern: 'line', name: '撼地重踏', desc: '重踏地面，裂痕朝玩家延伸（狂暴時更長）',
    windup: 1.0, power: 1.4, color: 0xff8a4a, count: 6, countEnraged: 9, start: 2.5, spacing: 2.3, radius: 1.8, stagger: 0.12,
  },
  /* ---- 第十層 斯芬克斯 ---- */
  sphinx_swipe: {
    pattern: 'cone', name: '獅爪重擊', desc: '前方扇形重擊（狂暴時更寬）',
    windup: 1.0, power: 2.0, color: 0xf0c060, range: 6.5, angle: 120, angleEnraged: 170,
  },
  sphinx_dive: {
    pattern: 'leap', name: '展翼俯衝', desc: '飛起後俯衝到玩家位置',
    windup: 1.5, power: 1.8, color: 0xf0e0b0, discColor: 0xd8b060, radius: 3.8,
  },
  riddle_seal: {
    pattern: 'spokes', name: '謎語封印', desc: '答錯謎語的懲罰：符文往四周射出，符文之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.7, color: 0x7ad8ff, count: 6, countEnraged: 9, range: 9, angle: 20,
  },
  /* ---- 第十一層 巨龍拉冬 ---- */
  dragon_breath: {
    pattern: 'line', name: '金焰吐息', desc: '朝玩家方向一長排金色火焰（狂暴時更長）',
    windup: 1.0, power: 1.4, color: 0xffc040, count: 7, countEnraged: 10, start: 2.5, spacing: 2.2, radius: 1.9, stagger: 0.1,
  },
  dragon_tail: {
    pattern: 'nova', name: '龍尾橫掃', desc: '甩動長尾掃過周圍（狂暴時範圍更大）',
    windup: 1.1, power: 1.9, color: 0xd8a040, discColor: 0xb87a20, radius: 6, radiusEnraged: 7.5,
  },
  golden_meteor: {
    pattern: 'rain', name: '金蘋果流星', desc: '聖樹上的金蘋果化成流星砸下',
    windup: 1.5, power: 1.5, color: 0xffd040, pillarColor: 0xfff0a0, count: 6, countEnraged: 9, radius: 2.2, spread: 7, stagger: 0.1,
  },
  /* ---- 第十二層 奇美拉 ---- */
  chimera_flame: {
    pattern: 'cone', name: '獅首烈焰', desc: '獅頭噴出大範圍火焰（狂暴時更寬）',
    windup: 1.1, power: 2.0, color: 0xff6a1a, range: 8, angle: 70, angleEnraged: 110,
  },
  chimera_charge: {
    pattern: 'dash', name: '三首衝撞', desc: '朝玩家直線衝撞 18 公尺',
    windup: 1.3, power: 1.9, color: 0xff8a3a, length: 18, width: 3.2,
  },
  chimera_rain: {
    pattern: 'multiLine', name: '三首齊噴', desc: '獅火、羊雷、蛇毒三排同時噴出（狂暴時五排）',
    windup: 1.1, power: 1.4, color: 0xff9a3a, angles: [-30, 0, 30], anglesEnraged: [-50, -25, 0, 25, 50], count: 6, start: 2.5, spacing: 2.1, radius: 1.5, stagger: 0.11,
  },
  /* ---- 第十三層 卡呂冬野豬 ---- */
  boar_gore: {
    pattern: 'dash', name: '獠牙突進', desc: '低頭朝玩家狂奔 20 公尺',
    windup: 1.2, power: 1.9, color: 0xff8a4a, length: 20, width: 3.4,
  },
  boar_tusk_sweep: {
    pattern: 'cone', name: '獠牙橫挑', desc: '前方大範圍挑擊（狂暴時幾乎半圈以上）',
    windup: 1.1, power: 2.0, color: 0xf4e0b0, range: 7, angle: 140, angleEnraged: 200,
  },
  boar_quake: {
    pattern: 'rain', name: '斷木落石', desc: '撞斷的樹幹與落石砸向玩家附近',
    windup: 1.5, power: 1.5, color: 0x8a6a3a, pillarColor: 0xd8c08a, count: 7, countEnraged: 10, radius: 2.1, spread: 7, stagger: 0.1,
  },
  /* ---- 第十四層 斯庫拉 ---- */
  scylla_dogs: {
    pattern: 'spokes', name: '六犬齊咬', desc: '腰間六隻犬頭往四周咬出，犬頭之間是安全區（狂暴時八道）',
    windup: 1.2, power: 1.7, color: 0x6ad8ff, count: 6, countEnraged: 8, range: 9, angle: 22,
  },
  scylla_tentacles: {
    pattern: 'multiLine', name: '觸手鞭擊', desc: '四條觸手同時往前方拍下（狂暴時六條）',
    windup: 1.1, power: 1.4, color: 0x4ab8d8, angles: [-36, -12, 12, 36], anglesEnraged: [-50, -30, -10, 10, 30, 50], count: 6, start: 2.5, spacing: 2.1, radius: 1.5, stagger: 0.1,
  },
  charybdis_whirl: {
    pattern: 'nova', name: '卡律布狄斯漩渦', desc: '對岸的漩渦捲起，吞沒周圍（狂暴時範圍更大）',
    windup: 1.3, power: 1.9, color: 0x8fe3ff, discColor: 0x2a7ab8, radius: 6.5, radiusEnraged: 8.5,
  },
  /* ---- 第十五層 獅鷲 ---- */
  griffin_dive: {
    pattern: 'leap', name: '鷹王俯衝', desc: '飛上高空後俯衝到玩家位置',
    windup: 1.5, power: 1.9, color: 0xffe08a, discColor: 0xd8a040, radius: 4,
  },
  griffin_talon: {
    pattern: 'cone', name: '金爪撕裂', desc: '前方扇形撕裂（狂暴時範圍更寬）',
    windup: 1.0, power: 2.0, color: 0xffc040, range: 7, angle: 120, angleEnraged: 170,
  },
  griffin_gale: {
    pattern: 'line', name: '羽刃狂風', desc: '振翅颳出一排銳利的羽刃（狂暴時更長）',
    windup: 1.0, power: 1.4, color: 0xe8f4ff, count: 8, countEnraged: 11, start: 2.5, spacing: 2.1, radius: 1.7, stagger: 0.09,
  },
  /* ---- 第十六層 刻律涅金角鹿 ---- */
  hind_charge: {
    pattern: 'dash', name: '金角衝刺', desc: '快得追不上的衝刺，直線 22 公尺',
    windup: 1.1, power: 1.9, color: 0xffd040, length: 22, width: 3,
  },
  hind_stomp: {
    pattern: 'nova', name: '銅蹄踏地', desc: '銅蹄重踏，震波擴散（狂暴時範圍更大）',
    windup: 1.2, power: 1.9, color: 0xd8a060, discColor: 0xb87a30, radius: 6.5, radiusEnraged: 8.5,
  },
  hind_moonfall: {
    pattern: 'rain', name: '月神箭雨', desc: '阿蒂蜜絲為聖鹿降下月光箭雨',
    windup: 1.5, power: 1.5, color: 0xc8e0ff, pillarColor: 0xf0f6ff, count: 7, countEnraged: 10, radius: 2.1, spread: 7, stagger: 0.09,
  },
  /* ---- 第十七層 百眼巨人阿爾戈斯 ---- */
  argus_gaze: {
    pattern: 'spokes', name: '百眼凝視', desc: '全身的眼睛同時射出光束，光束之間是安全區（狂暴時更多）',
    windup: 1.3, power: 1.7, color: 0x9affd8, count: 8, countEnraged: 11, range: 10, angle: 16,
  },
  argus_club: {
    pattern: 'cone', name: '牧杖橫掃', desc: '巨大的牧杖橫掃前方（狂暴時更寬）',
    windup: 1.2, power: 2.0, color: 0xc8a070, range: 8, angle: 150, angleEnraged: 210,
  },
  argus_watch: {
    pattern: 'rain', name: '不眠之眼', desc: '百隻眼睛盯住玩家，光柱接連落下',
    windup: 1.4, power: 1.5, color: 0x6affc8, pillarColor: 0xd0fff0, count: 7, countEnraged: 10, radius: 2.1, spread: 7, stagger: 0.1,
  },
  /* ---- 第十八層 三身巨人革律翁 ---- */
  geryon_spears: {
    pattern: 'multiLine', name: '三身擲矛', desc: '三個身體同時擲出長矛（狂暴時五道）',
    windup: 1.1, power: 1.5, color: 0xff6a4a, angles: [-30, 0, 30], anglesEnraged: [-50, -25, 0, 25, 50], count: 7, start: 2.5, spacing: 2.1, radius: 1.5, stagger: 0.1,
  },
  geryon_sweep: {
    pattern: 'cone', name: '六臂橫掃', desc: '六條手臂一起掃過（狂暴時超過半圈）',
    windup: 1.2, power: 2.0, color: 0xff9a5a, range: 7.5, angle: 180, angleEnraged: 240,
  },
  geryon_leap: {
    pattern: 'leap', name: '巨人踐踏', desc: '跳到玩家位置重重踩下',
    windup: 1.5, power: 1.9, color: 0xd86a3a, discColor: 0xa84a2a, radius: 4.2,
  },
  /* ---- 第十九層 海怪刻托斯 ---- */
  cetus_wave: {
    pattern: 'line', name: '滔天巨浪', desc: '朝玩家方向掀起一排巨浪（狂暴時更長）',
    windup: 1.1, power: 1.5, color: 0x4fb8ff, count: 8, countEnraged: 11, start: 2.8, spacing: 2.3, radius: 2.1, stagger: 0.1,
  },
  cetus_tail: {
    pattern: 'nova', name: '巨尾拍海', desc: '巨尾拍擊，浪花炸開（狂暴時範圍更大）',
    windup: 1.2, power: 2.0, color: 0x8fe3ff, discColor: 0x2a6ab8, radius: 7, radiusEnraged: 9,
  },
  cetus_spout: {
    pattern: 'rain', name: '噴潮水柱', desc: '從海裡噴出的水柱砸向玩家附近',
    windup: 1.5, power: 1.5, color: 0x6ac8ff, pillarColor: 0xd0f0ff, count: 7, countEnraged: 11, radius: 2.2, spread: 7.5, stagger: 0.09,
  },
  /* ---- 第二十層 半人馬涅索斯 ---- */
  nessus_volley: {
    pattern: 'multiLine', name: '連珠箭', desc: '張弓同時射出五排箭（狂暴時七排）',
    windup: 1.1, power: 1.4, color: 0xffd36b, angles: [-40, -20, 0, 20, 40], anglesEnraged: [-54, -36, -18, 0, 18, 36, 54], count: 6, start: 2.5, spacing: 2.2, radius: 1.4, stagger: 0.09,
  },
  nessus_trample: {
    pattern: 'dash', name: '馬蹄踐踏', desc: '四蹄狂奔，朝玩家直線衝撞 20 公尺',
    windup: 1.2, power: 2.0, color: 0xc88a4a, length: 20, width: 3.2,
  },
  nessus_blood: {
    pattern: 'rain', name: '毒血之雨', desc: '沾了九頭蛇毒的血灑向玩家附近',
    windup: 1.5, power: 1.6, color: 0x8a2a4a, pillarColor: 0xff6a8a, count: 7, countEnraged: 11, radius: 2.2, spread: 7.5, stagger: 0.09,
  },
  /* ---- 第二十一層 萬怪之母厄喀德那 ---- */
  echidna_brood: {
    pattern: 'spokes', name: '萬怪之吼', desc: '子嗣的幻影往四周撲出，幻影之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.8, color: 0xc86aff, count: 7, countEnraged: 10, range: 10, angle: 20,
  },
  echidna_venom: {
    pattern: 'multiLine', name: '雙尾毒牙', desc: '兩條蛇尾與本體同時噴出毒液（狂暴時五道）',
    windup: 1.1, power: 1.5, color: 0x8aff6a, angles: [-28, 0, 28], anglesEnraged: [-48, -24, 0, 24, 48], count: 7, start: 2.5, spacing: 2.1, radius: 1.6, stagger: 0.1,
  },
  echidna_coil: {
    pattern: 'nova', name: '蛇身絞纏', desc: '巨大的蛇身盤繞橫掃周圍（狂暴時範圍更大）',
    windup: 1.2, power: 2.0, color: 0x6ad87a, discColor: 0x3a8a4a, radius: 7, radiusEnraged: 9,
  },
  /* ---- 第二十二層 塔爾塔洛斯獄龍坎佩 ---- */
  /* ---- 守護者・天馬珀伽索斯（支線：赫利孔山靈泉，雷） ---- */
  pegasus_thunder: {
    pattern: 'rain', name: '天雷蹄音', desc: '踏蹄召雷，玩家附近連續落雷（狂暴時更多）',
    windup: 1.3, power: 1.3, color: 0xffd84a, pillarColor: 0xfff4b0, count: 4, countEnraged: 6, radius: 2.1, spread: 5, stagger: 0.14,
  },
  pegasus_dive: {
    pattern: 'leap', name: '天馬俯衝', desc: '振翅飛起後俯衝到玩家位置',
    windup: 1.5, power: 1.6, color: 0xfff0a0, discColor: 0xffd84a, radius: 3.6,
  },
  pegasus_storm: {
    pattern: 'spokes', name: '雷翼風暴', desc: '張開雙翼往四周放出雷光，光束之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.3, color: 0xffe27a, count: 4, countEnraged: 6, range: 8, angle: 26,
  },
  pegasus_gallop: {
    pattern: 'dash', name: '閃電奔馳', desc: '化成一道閃電朝玩家直線奔馳',
    windup: 1.15, power: 1.6, color: 0xfff4b0, length: 13, width: 2.6,
  },

  /* ---- 守護者・宙斯神鷹埃托斯（支線：伊達山之巔，風） ---- */
  aetos_gale: {
    pattern: 'cone', name: '神鷹狂風', desc: '振翅往前方颳出狂風（狂暴時更寬）',
    windup: 1.1, power: 1.5, color: 0x9ff0c8, range: 7.5, angle: 65, angleEnraged: 90,
  },
  aetos_dive: {
    pattern: 'leap', name: '神鷹撲擊', desc: '飛上高空後俯衝抓向玩家',
    windup: 1.4, power: 1.7, color: 0xd8f8e8, discColor: 0x9ff0c8, radius: 3.4,
  },
  aetos_feathers: {
    pattern: 'multiLine', name: '羽刃齊射', desc: '同時往三個方向射出羽刃（狂暴時四道）',
    windup: 1.1, power: 1.3, color: 0xe8ffe8, angles: [-30, 0, 30], anglesEnraged: [-45, -15, 15, 45], count: 4, start: 2, spacing: 2, radius: 1.4, stagger: 0.1,
  },
  aetos_cyclone: {
    pattern: 'nova', name: '天穹旋風', desc: '在身邊捲起旋風（狂暴時範圍更大）',
    windup: 1.3, power: 1.5, color: 0x9ff0c8, discColor: 0x5fd8a0, radius: 5.5, radiusEnraged: 7,
  },

  /* ---- 守護者・金羊克律索瑪羅斯（支線：科爾基斯聖林，光） ---- */
  ram_charge: {
    pattern: 'dash', name: '金角衝撞', desc: '低頭朝玩家直線衝撞',
    windup: 1.25, power: 1.7, color: 0xffe9a0, length: 13, width: 2.8,
  },
  ram_radiance: {
    pattern: 'spokes', name: '金羊毛光輝', desc: '羊毛放出一圈光束，光束之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.4, color: 0xfff0a8, count: 5, countEnraged: 7, range: 9, angle: 20,
  },
  ram_sunfall: {
    pattern: 'rain', name: '日輪墜落', desc: '玩家附近落下多道金光（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0xffd86a, pillarColor: 0xfff4c0, count: 5, countEnraged: 7, radius: 2.0, spread: 5.5, stagger: 0.15,
  },
  ram_quake: {
    pattern: 'nova', name: '聖蹄震地', desc: '前蹄重踏，身邊震地（狂暴時範圍更大）',
    windup: 1.2, power: 1.6, color: 0xffe9a0, discColor: 0xd8b04a, radius: 4.5, radiusEnraged: 6,
  },

  /* ---- 守護者・海馬希波坎普斯（支線：埃蓋海底宮殿，水） ---- */
  hippo_wave: {
    pattern: 'line', name: '怒濤直擊', desc: '朝玩家方向捲起一排浪頭（狂暴時更長）',
    windup: 1.0, power: 1.4, color: 0x4fb8ff, count: 6, countEnraged: 8, start: 2.5, spacing: 2.2, radius: 1.8, stagger: 0.12,
  },
  hippo_surge: {
    pattern: 'dash', name: '海潮奔騰', desc: '乘著浪潮朝玩家直線衝刺',
    windup: 1.15, power: 1.7, color: 0x8fe3ff, length: 14, width: 3,
  },
  hippo_whirl: {
    pattern: 'nova', name: '漩渦', desc: '魚尾一甩，身邊捲起漩渦（狂暴時範圍更大）',
    windup: 1.3, power: 1.5, color: 0x4fb8ff, discColor: 0x2a7ad8, radius: 6, radiusEnraged: 7.5,
  },
  hippo_rain: {
    pattern: 'rain', name: '海神驟雨', desc: '玩家附近落下多道水柱（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0x4fb8ff, pillarColor: 0x9fe8ff, count: 5, countEnraged: 7, radius: 2.2, spread: 6, stagger: 0.12,
  },

  /* ---- 守護者・不死鳥菲尼克斯（支線：羅德島日神殿，火） ---- */
  phoenix_flame: {
    pattern: 'cone', name: '烈焰吐息', desc: '往前方噴出烈焰（狂暴時更寬）',
    windup: 1.1, power: 1.5, color: 0xff7a2a, range: 8, angle: 70, angleEnraged: 100,
  },
  phoenix_rain: {
    pattern: 'rain', name: '焚天火羽', desc: '玩家附近落下燃燒的羽毛（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0xff7a2a, pillarColor: 0xffd86a, count: 5, countEnraged: 7, radius: 2.0, spread: 5.5, stagger: 0.13,
  },
  phoenix_dive: {
    pattern: 'leap', name: '炎鳥俯衝', desc: '化成火球俯衝到玩家位置',
    windup: 1.4, power: 1.7, color: 0xffb35a, discColor: 0xff5a1a, radius: 3.5,
  },
  phoenix_rebirth: {
    pattern: 'nova', name: '浴火重生', desc: '全身爆出烈焰（狂暴時範圍更大）',
    windup: 1.4, power: 1.6, color: 0xff7a2a, discColor: 0xff3a1a, radius: 5.5, radiusEnraged: 7,
  },

  /* ---- 守護者・北風神波瑞阿斯（支線：色雷斯冰峰，冰） ---- */
  boreas_blizzard: {
    pattern: 'rain', name: '北風暴雪', desc: '玩家附近落下冰柱（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0x9fe6ff, pillarColor: 0xeaffff, count: 4, countEnraged: 6, radius: 2.0, spread: 5.5, stagger: 0.12,
  },
  boreas_gust: {
    pattern: 'dash', name: '寒風突襲', desc: '乘著北風朝玩家直線飛衝',
    windup: 1.3, power: 1.7, color: 0xcff4ff, length: 14, width: 2.8,
  },
  boreas_frost: {
    pattern: 'spokes', name: '霜之放射', desc: '往四周放出冰霜光束，光束之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.4, color: 0x9fe6ff, count: 5, countEnraged: 7, range: 9, angle: 20,
  },
  boreas_breath: {
    pattern: 'cone', name: '凜冬之息', desc: '往前方吹出寒氣（狂暴時更寬）',
    windup: 1.1, power: 1.5, color: 0xbff0ff, range: 6.5, angle: 65, angleEnraged: 90,
  },

  /* ---- 守護者・百臂巨人布里阿瑞俄斯（支線：埃特納山麓，土） ---- */
  bri_fists: {
    pattern: 'multiLine', name: '百臂連拳', desc: '好幾隻手同時往前砸（狂暴時更多道）',
    windup: 1.2, power: 1.3, color: 0xd8a860, angles: [-35, 0, 35], anglesEnraged: [-50, -20, 20, 50], count: 4, start: 2, spacing: 2.1, radius: 1.5, stagger: 0.11,
  },
  bri_quake: {
    pattern: 'nova', name: '大地震裂', desc: '六隻手一起捶地（狂暴時範圍更大）',
    windup: 1.3, power: 1.6, color: 0xd8a860, discColor: 0x8a6a3a, radius: 5.5, radiusEnraged: 7,
  },
  bri_boulders: {
    pattern: 'rain', name: '投石如雨', desc: '朝玩家附近丟出巨石（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0xb8865a, pillarColor: 0xd8b888, count: 5, countEnraged: 7, radius: 2.1, spread: 6, stagger: 0.14,
  },
  bri_slam: {
    pattern: 'leap', name: '巨人踏擊', desc: '跳到玩家位置重踏',
    windup: 1.5, power: 1.7, color: 0xd8a860, discColor: 0x8a6a3a, radius: 3.6,
  },

  /* ---- 守護者・天蠍斯科爾皮俄斯（支線：希俄斯島獵場，毒） ---- */
  scorp_sting: {
    pattern: 'line', name: '毒尾突刺', desc: '尾刺往玩家方向連續突刺（狂暴時更長）',
    windup: 1.15, power: 1.4, color: 0xb6ff4a, count: 5, countEnraged: 6, start: 2.2, spacing: 2.1, radius: 1.6, stagger: 0.1,
  },
  scorp_spray: {
    pattern: 'cone', name: '毒霧噴灑', desc: '往前方噴出毒霧（狂暴時更寬）',
    windup: 1.1, power: 1.5, color: 0x8fd84a, range: 6.5, angle: 70, angleEnraged: 95,
  },
  scorp_burrow: {
    pattern: 'leap', name: '鑽地突襲', desc: '鑽進土裡，從玩家腳下鑽出',
    windup: 1.5, power: 1.7, color: 0xb6ff4a, discColor: 0x6a8a2a, radius: 3.4,
  },
  scorp_cloud: {
    pattern: 'nova', name: '劇毒瘴氣', desc: '身邊散出毒瘴（狂暴時範圍更大）',
    windup: 1.3, power: 1.5, color: 0x8fd84a, discColor: 0x4a8a2a, radius: 5.5, radiusEnraged: 7,
  },

  /* ---- 守護者・恐懼之神福波斯（支線：斯巴達恐懼神殿，暗） ---- */
  phobos_reap: {
    pattern: 'cone', name: '恐懼收割', desc: '巨鐮往前方大範圍橫掃（狂暴時幾乎半圈）',
    windup: 1.15, power: 1.6, color: 0xb48cff, range: 7, angle: 120, angleEnraged: 170,
  },
  phobos_terror: {
    pattern: 'spokes', name: '戰慄放射', desc: '往四周放出恐懼之影，影子之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.4, color: 0x8a4aff, count: 4, countEnraged: 6, range: 9, angle: 20,
  },
  phobos_shadow: {
    pattern: 'dash', name: '暗影突進', desc: '化成黑影朝玩家直線突進',
    windup: 1.25, power: 1.7, color: 0xb48cff, length: 14, width: 2.6,
  },
  phobos_nightfall: {
    pattern: 'rain', name: '夜幕降臨', desc: '玩家附近落下暗影（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0x8a4aff, pillarColor: 0xd8c0ff, count: 5, countEnraged: 7, radius: 2.0, spread: 5.5, stagger: 0.13,
  },

  /* ---- 守護者・戰神阿瑞斯（支線：阿瑞斯之丘，金） ---- */
  ares_spear: {
    pattern: 'line', name: '戰神之槍', desc: '長槍往玩家方向貫穿（狂暴時更長）',
    windup: 1.15, power: 1.4, color: 0xffd86a, count: 5, countEnraged: 6, start: 2.4, spacing: 2.2, radius: 1.6, stagger: 0.09,
  },
  ares_charge: {
    pattern: 'dash', name: '戰車衝鋒', desc: '舉盾朝玩家直線衝鋒',
    windup: 1.3, power: 1.6, color: 0xffb35a, length: 14, width: 3,
  },
  ares_volley: {
    pattern: 'multiLine', name: '萬槍齊發', desc: '同時往好幾個方向擲出長槍（狂暴時更多道）',
    windup: 1.35, power: 1.3, color: 0xffd86a, angles: [-30, 0, 30], anglesEnraged: [-45, -15, 15, 45], count: 4, start: 2, spacing: 2.1, radius: 1.4, stagger: 0.1,
  },
  ares_warcry: {
    pattern: 'nova', name: '戰神怒吼', desc: '舉盾怒吼，身邊震盪（狂暴時範圍更大）',
    windup: 1.3, power: 1.6, color: 0xffb35a, discColor: 0xd83a2a, radius: 5, radiusEnraged: 6.3,
  },

  kampe_heads: {
    pattern: 'spokes', name: '五十獸首', desc: '腰間的獸首往四周撲咬，獸首之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.8, color: 0xff6a3a, count: 9, countEnraged: 12, range: 10, angle: 15,
  },
  kampe_sting: {
    pattern: 'line', name: '蠍尾毒刺', desc: '蠍尾朝玩家刺出一長排毒針（狂暴時更長）',
    windup: 1.0, power: 1.6, color: 0xb8ff4a, count: 9, countEnraged: 12, start: 2.5, spacing: 2.1, radius: 1.7, stagger: 0.08,
  },
  kampe_hellfire: {
    pattern: 'rain', name: '塔爾塔洛斯獄火', desc: '深淵獄火從地底噴發',
    windup: 1.5, power: 1.6, color: 0xff4a1a, pillarColor: 0xffb04a, count: 8, countEnraged: 12, radius: 2.2, spread: 8, stagger: 0.08,
  },
  kampe_leap: {
    pattern: 'leap', name: '獄龍降臨', desc: '展開黑翼飛起，砸落在玩家位置',
    windup: 1.5, power: 2.0, color: 0xff8a3a, discColor: 0x8a1a1a, radius: 4.4,
  },

  /* ==== 神獸討伐（v1.86，data/stages/beast*.ts） ==== */
  orthrus_twin_bite: {
    pattern: 'multiLine', name: '雙首撕咬', desc: '兩顆頭同時往前方兩側噴出冥火（狂暴時四道）',
    windup: 1.1, power: 1.4, color: 0xb48cff, angles: [-20, 20], anglesEnraged: [-36, -12, 12, 36], count: 4, start: 2, spacing: 2.1, radius: 1.5, stagger: 0.1,
  },
  orthrus_pounce: {
    pattern: 'leap', name: '撲咬', desc: '躍起撲向玩家',
    windup: 1.45, power: 1.6, color: 0xd8c0ff, discColor: 0x8a4aff, radius: 3.4,
  },
  orthrus_howl: {
    pattern: 'nova', name: '雙重嚎叫', desc: '兩顆頭一起嚎叫，震盪四周（狂暴時範圍更大）',
    windup: 1.2, power: 1.5, color: 0xb48cff, discColor: 0x5a2a8a, radius: 5, radiusEnraged: 6.4,
  },
  orthrus_rush: {
    pattern: 'dash', name: '獵犬衝刺', desc: '壓低身子朝玩家直線衝刺',
    windup: 1.1, power: 1.6, color: 0xd8c0ff, length: 13, width: 2.6,
  },
  mare_stampede: {
    pattern: 'dash', name: '雷霆奔踏', desc: '化成一道雷光朝玩家直線狂奔',
    windup: 1.15, power: 1.7, color: 0xfff4b0, length: 15, width: 2.8,
  },
  mare_hoof_storm: {
    pattern: 'rain', name: '蹄下落雷', desc: '人立踏蹄，玩家附近連續落雷（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0xffd84a, pillarColor: 0xfff4b0, count: 4, countEnraged: 6, radius: 2.1, spread: 5, stagger: 0.13,
  },
  mare_rear_kick: {
    pattern: 'cone', name: '後腿踢擊', desc: '往前方扇形猛踢（狂暴時更寬）',
    windup: 1.0, power: 1.7, color: 0xffe27a, range: 5.5, angle: 90, angleEnraged: 130,
  },
  mare_herd: {
    pattern: 'multiLine', name: '馬群衝鋒', desc: '幽靈馬群往三個方向衝出（狂暴時五道）',
    windup: 1.3, power: 1.3, color: 0xfff0a0, angles: [-28, 0, 28], anglesEnraged: [-44, -22, 0, 22, 44], count: 5, start: 2, spacing: 2.1, radius: 1.4, stagger: 0.08,
  },
  cacus_fire_breath: {
    pattern: 'cone', name: '烈焰吐息', desc: '往前方噴出大片火焰（狂暴時更寬）',
    windup: 1.15, power: 1.6, color: 0xff5a1a, range: 8, angle: 55, angleEnraged: 80,
  },
  cacus_club_quake: {
    pattern: 'nova', name: '石棒震地', desc: '高舉石棒砸地，周圍噴出熔岩（狂暴時範圍更大）',
    windup: 1.3, power: 1.8, color: 0xff8a3c, discColor: 0xff5a1a, radius: 5.5, radiusEnraged: 7,
  },
  cacus_magma_spit: {
    pattern: 'line', name: '熔岩吐彈', desc: '朝玩家吐出一排熔岩彈（狂暴時更長）',
    windup: 0.95, power: 1.3, color: 0xff6a1a, count: 6, countEnraged: 8, start: 2.5, spacing: 2.2, radius: 1.7, stagger: 0.12,
  },
  cacus_ember_rain: {
    pattern: 'rain', name: '火山灰雨', desc: '洞頂落下燃燒的岩塊（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0xff4a1a, pillarColor: 0xffb04a, count: 5, countEnraged: 7, radius: 2.1, spread: 5.5, stagger: 0.12,
  },
  amphisbaena_twin_venom: {
    pattern: 'multiLine', name: '前後毒噴', desc: '兩顆頭往前後兩個方向噴毒（狂暴時四道）',
    windup: 1.1, power: 1.4, color: 0xa8d14f, angles: [0, 180], anglesEnraged: [-30, 30, 150, 210], count: 6, start: 2, spacing: 2.1, radius: 1.6, stagger: 0.1,
  },
  amphisbaena_coil_whip: {
    pattern: 'nova', name: '蛇身橫掃', desc: '身體一圈橫掃（狂暴時範圍更大）',
    windup: 1.2, power: 1.6, color: 0x8ab84a, discColor: 0x4a6a2a, radius: 5.2, radiusEnraged: 6.6,
  },
  amphisbaena_acid_rain: {
    pattern: 'rain', name: '毒沙雨', desc: '玩家附近落下毒沙（狂暴時更多）',
    windup: 1.35, power: 1.3, color: 0xb8ff4a, pillarColor: 0xe0ff8a, count: 5, countEnraged: 7, radius: 2.0, spread: 5.5, stagger: 0.12,
  },
  amphisbaena_serpent_lunge: {
    pattern: 'dash', name: '翻滾突進', desc: '像車輪一樣滾向玩家',
    windup: 1.15, power: 1.6, color: 0xd8ff6a, length: 14, width: 2.6,
  },
  charybdis_maelstrom: {
    pattern: 'nova', name: '吞海漩渦', desc: '把四周的海水全部吸進巨口（狂暴時範圍更大）',
    windup: 1.35, power: 1.9, color: 0x4fb8ff, discColor: 0x1a5a9a, radius: 6.5, radiusEnraged: 8.5,
  },
  charybdis_spout: {
    pattern: 'rain', name: '海水噴發', desc: '吐出吞下的海水，從天而降（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0x8fe3ff, pillarColor: 0xd8f4ff, count: 6, countEnraged: 8, radius: 2.1, spread: 7, stagger: 0.1,
  },
  charybdis_tide_spokes: {
    pattern: 'spokes', name: '漩渦水刃', desc: '水渦甩出一道道水刃，水刃之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.5, color: 0x4fb8ff, count: 5, countEnraged: 7, range: 10, angle: 22,
  },
  charybdis_tentacle_lash: {
    pattern: 'multiLine', name: '觸鬚拍擊', desc: '觸鬚往前方好幾個方向拍下（狂暴時更多）',
    windup: 1.2, power: 1.4, color: 0x6ac8ff, angles: [-25, 0, 25], anglesEnraged: [-45, -20, 0, 20, 45], count: 4, start: 2.2, spacing: 2.1, radius: 1.5, stagger: 0.1,
  },
  caucasus_gale_wing: {
    pattern: 'cone', name: '巨翼狂風', desc: '振翅往前方颳出狂風（狂暴時更寬）',
    windup: 1.1, power: 1.5, color: 0x8fe3b0, range: 9, angle: 60, angleEnraged: 90,
  },
  caucasus_sky_dive: {
    pattern: 'leap', name: '高空俯衝', desc: '飛上高空後俯衝抓向玩家',
    windup: 1.5, power: 1.8, color: 0xd8ffe8, discColor: 0x3a8a5a, radius: 3.8,
  },
  caucasus_feather_storm: {
    pattern: 'spokes', name: '銅羽風暴', desc: '往四周射出銅羽，羽毛之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.4, color: 0xc8a050, count: 6, countEnraged: 8, range: 10, angle: 18,
  },
  caucasus_cyclone: {
    pattern: 'rain', name: '旋風', desc: '玩家附近捲起好幾道旋風（狂暴時更多）',
    windup: 1.35, power: 1.4, color: 0x8fe3b0, pillarColor: 0xd8ffe8, count: 5, countEnraged: 7, radius: 2.1, spread: 6, stagger: 0.12,
  },
  colchis_golden_breath: {
    pattern: 'line', name: '金光吐息', desc: '朝玩家吐出一長排金色光焰（狂暴時更長）',
    windup: 1.0, power: 1.5, color: 0xfff0a8, count: 8, countEnraged: 10, start: 2.6, spacing: 2.1, radius: 1.7, stagger: 0.09,
  },
  colchis_coil_crush: {
    pattern: 'nova', name: '盤身絞殺', desc: '巨大的身體盤繞橫掃周圍（狂暴時範圍更大）',
    windup: 1.25, power: 1.9, color: 0xffd36b, discColor: 0x8a6a1a, radius: 6.5, radiusEnraged: 8,
  },
  colchis_sleepless_gaze: {
    pattern: 'spokes', name: '不眠之瞳', desc: '金色瞳孔射出一道道光束，光束之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.5, color: 0xfff6c8, count: 6, countEnraged: 9, range: 11, angle: 16,
  },
  colchis_fleece_flare: {
    pattern: 'rain', name: '金羊毛之光', desc: '金羊毛發光，玩家附近降下光柱（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0xffe27a, pillarColor: 0xfff6c8, count: 6, countEnraged: 8, radius: 2.0, spread: 6.5, stagger: 0.1,
  },
  antaeus_earth_slam: {
    pattern: 'leap', name: '大地重摔', desc: '跳起來用全身重量砸向玩家',
    windup: 1.5, power: 2.0, color: 0xc79a5a, discColor: 0x6a4a2a, radius: 4.2,
  },
  antaeus_quake: {
    pattern: 'nova', name: '大地震盪', desc: '雙拳捶地，周圍震盪（狂暴時範圍更大）',
    windup: 1.25, power: 1.8, color: 0xc79a5a, discColor: 0x5a7a2a, radius: 6, radiusEnraged: 7.5,
  },
  antaeus_rock_throw: {
    pattern: 'rain', name: '巨岩投擲', desc: '從地上挖起巨岩亂丟（狂暴時更多）',
    windup: 1.4, power: 1.5, color: 0xa8885a, pillarColor: 0xe0c89a, count: 5, countEnraged: 7, radius: 2.2, spread: 6, stagger: 0.12,
  },
  antaeus_tackle: {
    pattern: 'dash', name: '摔角衝撞', desc: '壓低身子朝玩家直線撲抱',
    windup: 1.15, power: 1.8, color: 0xd8b07a, length: 13, width: 3,
  },
  enceladus_boulder_hurl: {
    pattern: 'line', name: '巨石投擲', desc: '把巨石往玩家方向丟出，一路彈跳（狂暴時更遠）',
    windup: 1.1, power: 1.6, color: 0xd0d6e0, count: 7, countEnraged: 9, start: 2.5, spacing: 2.3, radius: 1.8, stagger: 0.1,
  },
  enceladus_shield_bash: {
    pattern: 'cone', name: '銅盾猛擊', desc: '舉盾往前方猛撞（狂暴時更寬）',
    windup: 1.0, power: 1.8, color: 0xffd36b, range: 6, angle: 100, angleEnraged: 140,
  },
  enceladus_serpent_legs: {
    pattern: 'multiLine', name: '蛇足噬咬', desc: '兩條蛇尾往前方左右撲咬（狂暴時四道）',
    windup: 1.15, power: 1.5, color: 0x8ac86a, angles: [-22, 22], anglesEnraged: [-40, -14, 14, 40], count: 5, start: 1.8, spacing: 2.1, radius: 1.5, stagger: 0.1,
  },
  enceladus_etna_eruption: {
    pattern: 'rain', name: '埃特納噴發', desc: '大地裂開噴出火柱（狂暴時更多）',
    windup: 1.45, power: 1.5, color: 0xff7a2a, pillarColor: 0xffc06a, count: 6, countEnraged: 9, radius: 2.1, spread: 7, stagger: 0.1,
  },
  typhon_hundred_heads: {
    pattern: 'spokes', name: '百首齊噬', desc: '肩上的龍頭往四周撲咬，龍頭之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.8, color: 0xff6a2a, count: 9, countEnraged: 12, range: 11, angle: 15,
  },
  typhon_storm_of_gods: {
    pattern: 'rain', name: '眾神之劫', desc: '天空降下雷霆與獄火（狂暴時更多）',
    windup: 1.5, power: 1.6, color: 0xb48cff, pillarColor: 0xffb04a, count: 8, countEnraged: 12, radius: 2.2, spread: 8, stagger: 0.08,
  },
  typhon_abyss_roar: {
    pattern: 'nova', name: '深淵咆哮', desc: '張開黑翼咆哮，震盪四周（狂暴時範圍更大）',
    windup: 1.3, power: 1.9, color: 0xb48cff, discColor: 0x3a1a5a, radius: 6.5, radiusEnraged: 8.5,
  },
  typhon_dragon_flames: {
    pattern: 'multiLine', name: '龍首獄火', desc: '好幾顆龍頭同時往前方噴火（狂暴時更多道）',
    windup: 1.25, power: 1.5, color: 0xff5a1a, angles: [-30, -10, 10, 30], anglesEnraged: [-48, -28, -9, 9, 28, 48], count: 5, start: 2, spacing: 2.1, radius: 1.5, stagger: 0.08,
  },

  /* ==== 第二十三～三十層（v1.97，scratchpad gen/gen_titans.py 產生） ==== */
  /* ---- 第二十三層 蛇身女王拉彌亞 ---- */
  lamia_coil: {
    pattern: 'nova', name: '蛇身絞殺', desc: '盤起蛇身往四周猛甩（狂暴時範圍更大）',
    windup: 1.2, power: 1.8, color: 0x9aff6a, discColor: 0x3a6a2a, radius: 5.5, radiusEnraged: 7,
  },
  lamia_venom: {
    pattern: 'multiLine', name: '毒牙噴吐', desc: '朝前方三個方向噴出毒液（狂暴時五道）',
    windup: 1.1, power: 1.5, color: 0xb8ff4a, angles: [-25, 0, 25], anglesEnraged: [-40, -20, 0, 20, 40], count: 6, start: 2.5, spacing: 2.1, radius: 1.5, stagger: 0.09,
  },
  lamia_lunge: {
    pattern: 'dash', name: '蛇行突襲', desc: '壓低身子朝玩家直線竄出',
    windup: 1.0, power: 1.8, color: 0xd8ff8a, length: 14, width: 2.6,
  },
  lamia_grief: {
    pattern: 'rain', name: '噬子之怨', desc: '被吞噬的孩子們的怨念從地底湧出',
    windup: 1.4, power: 1.5, color: 0x9a6aff, pillarColor: 0xd8b0ff, count: 6, countEnraged: 9, radius: 2.1, spread: 7, stagger: 0.1,
  },
  /* ---- 第二十四層 科爾基斯青銅火牛 ---- */
  khalko_charge: {
    pattern: 'dash', name: '青銅衝鋒', desc: '低頭朝玩家直線衝撞',
    windup: 1.0, power: 2.0, color: 0xffb06a, length: 16, width: 3,
  },
  khalko_breath: {
    pattern: 'cone', name: '鼻孔噴火', desc: '朝前方扇形噴出烈焰（狂暴時更寬）',
    windup: 1.0, power: 1.7, color: 0xff7a1a, range: 8, angle: 70, angleEnraged: 110,
  },
  khalko_furrow: {
    pattern: 'multiLine', name: '火犁', desc: '拖著火焰犁出三道火溝（狂暴時五道）',
    windup: 1.2, power: 1.5, color: 0xff5a1a, angles: [-30, 0, 30], anglesEnraged: [-48, -24, 0, 24, 48], count: 7, start: 2, spacing: 2.1, radius: 1.5, stagger: 0.07,
  },
  khalko_stomp: {
    pattern: 'nova', name: '銅蹄震地', desc: '人立起來重重踏地（狂暴時範圍更大）',
    windup: 1.2, power: 1.8, color: 0xffd08a, discColor: 0x8a3a1a, radius: 5.5, radiusEnraged: 7,
  },
  /* ---- 第二十五層 透墨索斯天狐 ---- */
  fox_dash: {
    pattern: 'dash', name: '疾風奔襲', desc: '化成一陣風朝玩家直線衝過去',
    windup: 0.9, power: 1.8, color: 0xbff6ff, length: 16, width: 2.6,
  },
  fox_tails: {
    pattern: 'spokes', name: '三尾風刃', desc: '三條尾巴往四周甩出風刃，風刃之間是安全區（狂暴時更多）',
    windup: 1.1, power: 1.6, color: 0x9af0ff, count: 6, countEnraged: 9, range: 9, angle: 18,
  },
  fox_whirl: {
    pattern: 'rain', name: '旋風', desc: '玩家附近捲起好幾道旋風（狂暴時更多）',
    windup: 1.3, power: 1.4, color: 0x9af0ff, pillarColor: 0xe8ffff, count: 5, countEnraged: 8, radius: 2.2, spread: 6, stagger: 0.12,
  },
  fox_pounce: {
    pattern: 'leap', name: '天狐撲擊', desc: '高高躍起撲向玩家',
    windup: 1.3, power: 1.8, color: 0xd8f8ff, discColor: 0x4a9ab8, radius: 3.8,
  },
  /* ---- 第二十六層 銅足夜魔恩普莎 ---- */
  empusa_flames: {
    pattern: 'rain', name: '冥火之髮', desc: '火焰長髮甩出冥火，落在玩家附近（狂暴時更多）',
    windup: 1.3, power: 1.5, color: 0xff5ad8, pillarColor: 0xffb0f0, count: 6, countEnraged: 9, radius: 2.1, spread: 7, stagger: 0.1,
  },
  empusa_kick: {
    pattern: 'leap', name: '銅足踐踏', desc: '跳起來用青銅腿踩向玩家',
    windup: 1.3, power: 1.9, color: 0xffc070, discColor: 0x6a3a1a, radius: 4,
  },
  empusa_shriek: {
    pattern: 'nova', name: '夜魔尖嘯', desc: '發出刺耳的尖嘯，震盪四周（狂暴時範圍更大）',
    windup: 1.1, power: 1.6, color: 0xff8ae8, discColor: 0x5a1a4a, radius: 5, radiusEnraged: 6.6,
  },
  empusa_claws: {
    pattern: 'cone', name: '吸血利爪', desc: '往前方扇形撕抓（狂暴時更寬）',
    windup: 1.0, power: 1.8, color: 0xff3a8a, range: 6, angle: 100, angleEnraged: 140,
  },
  /* ---- 第二十七層 牛蛇俄菲奧陶洛斯 ---- */
  ophio_gore: {
    pattern: 'dash', name: '牛角衝撞', desc: '低頭朝玩家直線衝撞',
    windup: 1.0, power: 1.9, color: 0x9af0ff, length: 14, width: 2.8,
  },
  ophio_tail: {
    pattern: 'cone', name: '蛇尾橫掃', desc: '蛇尾往前方大範圍橫掃（狂暴時更寬）',
    windup: 1.1, power: 1.7, color: 0x6ae0ff, range: 7, angle: 120, angleEnraged: 170,
  },
  ophio_flood: {
    pattern: 'rain', name: '冥河漲潮', desc: '冥河的水從地底湧出（狂暴時更多）',
    windup: 1.4, power: 1.5, color: 0x4fb8ff, pillarColor: 0x9ae8ff, count: 7, countEnraged: 10, radius: 2.2, spread: 7, stagger: 0.09,
  },
  ophio_coils: {
    pattern: 'spokes', name: '盤蛇鎖地', desc: '蛇身往四周鋪開，蛇身之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.6, color: 0x6ae0ff, count: 7, countEnraged: 10, range: 10, angle: 15,
  },
  /* ---- 第二十八層 斯廷法利斯銅羽鳥王 ---- */
  stymph_feathers: {
    pattern: 'multiLine', name: '銅羽齊射', desc: '往前方射出好幾排銅羽（狂暴時更多）',
    windup: 1.1, power: 1.5, color: 0xf0d890, angles: [-30, -10, 10, 30], anglesEnraged: [-45, -27, -9, 9, 27, 45], count: 7, start: 2, spacing: 2.0, radius: 1.4, stagger: 0.06,
  },
  stymph_dive: {
    pattern: 'leap', name: '鳥王俯衝', desc: '飛到高空再俯衝砸向玩家',
    windup: 1.4, power: 1.9, color: 0xffe8a0, discColor: 0x8a6a2a, radius: 4.2,
  },
  stymph_storm: {
    pattern: 'rain', name: '銅羽暴雨', desc: '銅羽從天上像雨一樣落下（狂暴時更多）',
    windup: 1.4, power: 1.4, color: 0xf0d890, pillarColor: 0xfff4c0, count: 8, countEnraged: 12, radius: 1.9, spread: 8, stagger: 0.07,
  },
  stymph_wings: {
    pattern: 'spokes', name: '刃翼迴旋', desc: '展開刃翼旋轉，羽刃之間是安全區（狂暴時更多）',
    windup: 1.1, power: 1.7, color: 0xffd890, count: 8, countEnraged: 11, range: 9, angle: 14,
  },
  /* ---- 第二十九層 阿洛伊代雙子巨人 ---- */
  aloadae_boulder: {
    pattern: 'rain', name: '疊山落石', desc: '把山岩往天上疊，碎石落在玩家附近（狂暴時更多）',
    windup: 1.5, power: 1.6, color: 0xc8b090, pillarColor: 0xe8d8b0, count: 6, countEnraged: 9, radius: 2.4, spread: 7, stagger: 0.12,
  },
  aloadae_spears: {
    pattern: 'multiLine', name: '雙矛突刺', desc: '兩兄弟的長矛同時刺出兩排（狂暴時四排）',
    windup: 1.0, power: 1.7, color: 0xe8e0d0, angles: [-14, 14], anglesEnraged: [-30, -10, 10, 30], count: 7, start: 2, spacing: 2.2, radius: 1.6, stagger: 0.06,
  },
  aloadae_quake: {
    pattern: 'nova', name: '雙子震地', desc: '兩個巨人一起跺腳（狂暴時範圍更大）',
    windup: 1.2, power: 1.9, color: 0xd8b070, discColor: 0x6a4a2a, radius: 6, radiusEnraged: 7.5,
  },
  aloadae_leap: {
    pattern: 'leap', name: '巨人飛躍', desc: '跳起來砸在玩家位置',
    windup: 1.5, power: 2.0, color: 0xffe0a0, discColor: 0x6a4a2a, radius: 4.6,
  },
  /* ---- 第三十層 泰坦之王克洛諾斯 ---- */
  kronos_harpe: {
    pattern: 'cone', name: '哈耳珀之鐮', desc: '巨鐮往前方大範圍橫掃（狂暴時更寬）',
    windup: 1.1, power: 2.0, color: 0xc8e8ff, range: 8, angle: 120, angleEnraged: 170,
  },
  kronos_hours: {
    pattern: 'spokes', name: '十二時辰', desc: '時之輪的指針往四周掃出，指針之間是安全區（狂暴時更多）',
    windup: 1.2, power: 1.8, color: 0x9ae8ff, count: 12, countEnraged: 16, range: 11, angle: 11,
  },
  kronos_freeze: {
    pattern: 'rain', name: '時間凍結', desc: '凍結的時間碎片從天而降（狂暴時更多）',
    windup: 1.5, power: 1.6, color: 0x9ae8ff, pillarColor: 0xe8faff, count: 9, countEnraged: 13, radius: 2.2, spread: 8, stagger: 0.08,
  },
  kronos_devour: {
    pattern: 'leap', name: '吞噬眾神', desc: '泰坦之王躍起，砸落在玩家位置',
    windup: 1.5, power: 2.1, color: 0xd8f0ff, discColor: 0x2a3a6a, radius: 4.8,
  },
} satisfies Record<string, BossSkillDef>;

export type BossSkillId = keyof typeof BOSS_SKILLS;
