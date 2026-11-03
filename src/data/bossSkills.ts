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
  | (Base & { pattern: 'line'; count: number; countEnraged?: number; start: number; spacing: number; radius: number; stagger: number });

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
} satisfies Record<string, BossSkillDef>;

export type BossSkillId = keyof typeof BOSS_SKILLS;
