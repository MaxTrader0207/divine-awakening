/**
 * 首領強度自動調整（v1.55）
 * ------------------------------------------------------------
 * 目標：不論玩家等級、裝備、道具怎麼堆，首領戰平均約 BOSS_PACE.target（180）秒，
 * 而且不會有「幾十秒就秒掉」的情況。三層機制：
 *
 * 1. 攻擊力（開戰時決定一次）：玩家比「該層標準配備」強（血多、防禦高）時，
 *    首領攻擊力往「每一下打掉的血量比例和標準配備時一樣」提高（只取一半，最多 ×2）；所有首領攻擊力再 ×0.85（戰鬥變長、挨打次數變多）。
 * 2. 生命（戰鬥中每秒調整）：用最近 20 秒的實際輸出預測剩餘時間，
 *    開戰時先依「每下期望傷害」和該層標準配備的比例預估一次；戰鬥中比目標快就把「目前血量與最大血量」一起放大（血條百分比不變，只是掉得慢），每秒最多 ×1.08；
 *    比目標慢很多（例如等級不夠）才縮小，每秒最多 ×0.95，最低到原本的 50%。
 * 3. 硬下限：開戰 t 秒時，首領血量最少還剩 1 − (t + 6) / BOSS_PACE.min（150 秒）。
 *    超過的傷害被首領的神力擋下（顯示「抵擋」），所以不可能在 150 秒內打倒。
 *
 * 純邏輯，不碰 Three.js，方便單元測試；Game 在首領開戰時建立、每幀呼叫 update()。
 */
export const BOSS_PACE = {
  /** 目標秒數 */
  target: 180,
  /** 最快秒數（硬下限） */
  min: 150,
  /** 開場允許的爆發（秒）：前 6 秒可以打掉 6/150 = 4% */
  burst: 6,
  /** 開始調整生命前的觀察時間（秒） */
  warmup: 6,
  /** 用最近幾秒的輸出估算 */
  window: 20,
  /** 每秒最多放大 / 縮小 */
  upStep: 1.08,
  downStep: 0.95,
  /** 生命最少是原本的幾倍、最多幾倍 */
  minMul: 0.5,
  maxMul: 30,
  /** 剩下多少比例時不再調整（最後一段讓玩家打完） */
  finishFrac: 0.06,
  /** 攻擊力倍率上限；算出來的加成只取一半（戰鬥時間變長，挨打次數本來就變多） */
  atkMax: 2,
  atkSoft: 0.5,
  /** 所有首領攻擊力基準：戰鬥統一拉長到約 180 秒，挨打次數比以前多，攻擊力整體 ×0.85 */
  atkBase: 0.85,
  /** 開戰時的生命預估：取「每下期望傷害比」的幾次方（略保守，剩下交給戰鬥中調整） */
  initPow: 0.9,
};

export interface ScalableBoss {
  hp: number;
  maxHp: number;
}

export class BossScaler {
  t = 0;
  /** 累積造成的傷害（實際扣掉的） */
  dealt = 0;
  /** 被硬下限擋掉的傷害 */
  absorbed = 0;
  private samples: { t: number; dealt: number }[] = [{ t: 0, dealt: 0 }];
  private sampleT = 0;

  constructor(readonly baseMax: number) {}

  /** 這一下最多能扣多少（超過的被擋下）；回傳實際扣掉的量 */
  clamp(e: ScalableBoss, amount: number): number {
    const minFrac = Math.max(0, 1 - (this.t + BOSS_PACE.burst) / BOSS_PACE.min);
    const allowed = Math.max(0, e.hp - e.maxHp * minFrac);
    const dealt = Math.min(amount, allowed);
    this.absorbed += amount - dealt;
    this.dealt += dealt;
    return dealt;
  }

  /** 推進時間並調整生命；回傳這次的放大倍率（1 = 沒變） */
  update(dt: number, e: ScalableBoss): number {
    this.t += dt;
    this.sampleT += dt;
    if (this.sampleT < 1) return 1;
    this.sampleT = 0;
    this.samples.push({ t: this.t, dealt: this.dealt });
    while (this.samples.length > 2 && this.t - this.samples[1].t > BOSS_PACE.window) this.samples.shift();
    if (this.t < BOSS_PACE.warmup || e.hp <= e.maxHp * BOSS_PACE.finishFrac) return 1;
    const first = this.samples[0];
    const span = this.t - first.t;
    const dps = span > 0 ? (this.dealt - first.dealt) / span : 0;
    const left = BOSS_PACE.target - this.t;
    let g = 1;
    if (dps > 0) {
      const eta = e.hp / dps;
      // 太快：放大（最後 15 秒不再放大，讓玩家打完）
      if (left > 15 && eta < left * 0.92) g = Math.min(BOSS_PACE.upStep, left / eta);
      // 太慢：縮小（至少留 20 秒）
      else if (this.t > 20 && eta > Math.max(20, left) * 1.15) g = Math.max(BOSS_PACE.downStep, Math.max(20, left) / eta);
    }
    // 生命上下限（相對原本）
    const next = Math.min(this.baseMax * BOSS_PACE.maxMul, Math.max(this.baseMax * BOSS_PACE.minMul, e.maxHp * g));
    g = next / e.maxHp;
    if (Math.abs(g - 1) < 1e-4) return 1;
    e.maxHp = next;
    e.hp = Math.min(e.maxHp, e.hp * g);
    return g;
  }
}

/**
 * 首領攻擊力倍率：讓玩家每被打一下掉的血量比例，至少和「該層標準配備」一樣。
 * 傷害公式是 max(攻擊 × 10%, 攻擊 − 防禦)（防禦是減法），所以解 m：
 *   max(0.1·m·A, m·A − D) = 目標傷害 T
 */
export function bossAtkMul(atk: number, player: { maxHp: number; def: number }, ref: { maxHp: number; def: number }): number {
  const hit = (m: number, def: number) => Math.max(0.1 * m * atk, m * atk - def);
  const target = (hit(1, ref.def) / ref.maxHp) * player.maxHp;
  if (hit(1, player.def) >= target) return BOSS_PACE.atkBase;
  // 減防那一段：m·A − D = T
  let m = (target + player.def) / atk;
  if (0.9 * m * atk < player.def) m = target / (0.1 * atk); // 其實落在保底那一段
  m = 1 + (m - 1) * BOSS_PACE.atkSoft;
  return Math.min(BOSS_PACE.atkMax, Math.max(1, m)) * BOSS_PACE.atkBase;
}

interface HitterStats {
  atk: number;
  pen: number;
  critRate: number;
  critDmg: number;
}

/** 對防禦 def 的目標，每下的期望傷害（含爆擊期望，不含技能倍率） */
export function expectedHit(s: HitterStats, def: number): number {
  const base = Math.max(s.atk * 0.1, s.atk - def * (1 - Math.min(1, s.pen)));
  return base * (1 + s.critRate * (s.critDmg - 1));
}

/**
 * 開戰時的生命倍率：玩家每下期望傷害 ÷ 該層標準配備的，取 initPow 次方。
 * 比標準強才放大（弱的話交給戰鬥中慢慢縮小），最多 BOSS_PACE.maxMul。
 */
export function bossInitialHpMul(player: HitterStats, ref: HitterStats, bossDef: number): number {
  const r = expectedHit(player, bossDef) / Math.max(1e-6, expectedHit(ref, bossDef));
  return Math.min(BOSS_PACE.maxMul, Math.max(1, Math.pow(r, BOSS_PACE.initPow)));
}
