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
} satisfies Record<string, BossSkillDef>;

export type BossSkillId = keyof typeof BOSS_SKILLS;
