import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { EnemyManager } from './EnemyManager';
import type { SkillSystem } from './SkillSystem';
import type { TargetSelector } from './TargetSelector';
import type { CollisionWorld } from '@/world/Collision';
import type { MinionManager } from './MinionManager';
import { MINIONS, type MinionId } from '@/data/minions';

/**
 * AUTO 自動戰鬥
 * 每幀決定：喝藥 → 撿東西 → 選目標 → 放技能 → 移動方向。
 * 玩家推搖桿時以手動移動為優先（AUTO 仍保持開啟，放開搖桿後繼續）。
 *
 * 技能優先序（依 SkillDef.auto）：
 *   E 烈焰爆發  目標周圍 3m 有 2 隻以上，或目標是首領
 *   W 冰霜新星  自己周圍 4m 有 2 隻以上，或有敵人貼身（< 2.5m）
 *   Q 火球術    有目標就放
 *   普攻        其餘時間
 * 閃現（R）不自動使用，保留給玩家躲首領技能。
 * 近戰職業（普攻射程 < 4）：要走到「射程 + 敵人體型」以內才出手；
 *   guard 類技能（騎士守護）在被 3 隻以上圍住、血量低於 60% 有敵人貼身、或首領出招時開。
 */
export const AUTO_SEARCH_RANGE = 32;
export const AUTO_HP_POTION = 0.4;
export const AUTO_MP_POTION = 0.2;

export interface AutoContext {
  player: Player;
  enemies: EnemyManager;
  targets: TargetSelector;
  skills: SkillSystem;
  /** 最近的掉落物（第 6 週），沒有回傳 null */
  nearestLoot: () => { x: number; z: number } | null;
  /** 危險區域（首領預警）：玩家站在裡面時回傳逃離方向 */
  dangerEscape: () => { x: number; z: number } | null;
  collision: () => CollisionWorld;
  /** 玩家等級（AUTO 不主動去打比自己高等的首領） */
  level: () => number;
  /** 召喚物（召喚師） */
  minions?: MinionManager;
}

/** 繞路時嘗試的偏轉角度（弧度），左右各試一次 */
const STEER_ANGLES = [0, 0.5, 1.0, 1.5, 2.0, 2.5];
const PROBE = 1.4;
/** 開始繞路後維持同一側的秒數（避免在障礙物前左右抖動） */
const DETOUR_COMMIT = 3;

export class AutoBattle {
  on = false;
  /** 本幀建議的移動向量 */
  readonly move = { x: 0, z: 0 };
  /** 上一次的移動方向（沿牆走時延續，避免左右抖動） */
  private last = { x: 0, z: 1 };
  private detour = 0;
  private probe = { x: 0, z: 0 };

  constructor(private ctx: AutoContext) {}

  update(dt = 1 / 60) {
    this.move.x = 0;
    this.move.z = 0;
    this.detour = Math.max(0, this.detour - dt);
    if (!this.on) return;
    const { player: p, skills, enemies, targets } = this.ctx;
    if (!p.alive) return;

    // 1. 喝藥
    if (p.hp / p.stats.maxHp < AUTO_HP_POTION) skills.usePotion('hp', true);
    else if (p.mp / p.stats.maxMp < AUTO_MP_POTION && !skills.usesRage) skills.usePotion('mp', true);

    // 2. 躲首領預警
    const escape = this.ctx.dangerEscape();
    if (escape) {
      this.setMove(escape.x, escape.z);
      return;
    }

    // 3. 撿東西（附近沒有戰鬥時）
    const loot = this.ctx.nearestLoot();
    const fighting = enemies.enemies.some((e) => e.alive && (e.ai === 'chase' || e.ai === 'attack') && dist(e, p) < 8);
    if (loot && !fighting) {
      this.moveTo(loot.x, loot.z);
      return;
    }

    // 4. 目標
    const bolt = skills.def('basic');
    let target = targets.current && targets.current.alive && targets.current.def.aggro !== 'none' ? targets.current : null;
    if (!target || dist(target, p) > AUTO_SEARCH_RANGE) target = this.pickTarget();
    targets.current = target;
    if (!target) return;

    const d = dist(target, p);
    const melee = bolt.range < 4;
    const reach = melee ? bolt.range + target.radius - 0.5 : bolt.range - 1;
    if (d > reach) {
      this.moveTo(target.pos.x, target.pos.z);
      // 邊走邊放增益 / 召喚（被圍時開防禦、召喚師先把骷髏叫出來）
      if (this.tryGuard(target)) return;
      // 近戰：離目標 4m 以上、在衝鋒距離內就衝過去
      if (melee) {
        for (const slot of ['R', 'E', 'Q'] as const) {
          const sk = skills.def(slot);
          if (sk.auto !== 'gap' || !skills.canCast(slot)) continue;
          if (d - reach > 4 && d < sk.range + reach && !this.ctx.dangerEscape() && (target.engaged || target.ai === 'chase' || target.ai === 'attack' || !target.def.boss)) {
            skills.cast(slot, true);
            return;
          }
        }
      }
      return;
    }

    // 5. 技能：依 SkillDef.auto 規則，E → W → Q 的順序找第一個該放的
    const around = (x: number, z: number, r: number) => enemies.enemies.filter((e) => e.alive && e.def.aggro !== 'none' && Math.hypot(e.pos.x - x, e.pos.z - z) < r).length;
    if (this.tryGuard(target)) return;
    for (const slot of ['E', 'W', 'Q'] as const) {
      const sk = skills.def(slot);
      if (!skills.canCast(slot)) continue;
      const r = sk.radius ?? 3;
      const want =
        sk.auto === 'target-aoe' ? target.def.boss || around(target.pos.x, target.pos.z, r) >= 2
        : sk.auto === 'self-aoe' ? around(p.pos.x, p.pos.z, r) >= 2 || around(p.pos.x, p.pos.z, 2.5) >= 1
        : sk.auto === 'single' ? !melee || d <= reach + 0.3
        : false;
      if (want && skills.cast(slot, true)) return;
    }
    skills.cast('basic', true);
  }

  /**
   * 增益技能：
   *  guard（騎士守護、狂戰士嗜血）：被圍、殘血有怪貼身、打首領、或首領正在出招
   *  burst（狂戰士狂暴）：打首領，或身邊 3 隻以上
   */
  private tryGuard(target: Enemy): boolean {
    const { player: p, skills, enemies } = this.ctx;
    const near = enemies.enemies.filter((e) => e.alive && e.def.aggro !== 'none' && (e.ai === 'chase' || e.ai === 'attack' || e.ai === 'boss') && dist(e, p) < 4 + e.radius).length;
    const bossNear = target.def.boss && target.engaged && dist(target, p) < 6;
    for (const slot of ['R', 'W', 'Q', 'E'] as const) {
      const sk = skills.def(slot);
      if (!skills.canCast(slot)) continue;
      if (sk.auto === 'guard') {
        if (p.guardT > 0 || p.bloodlustT > 0) continue;
        const bossCasting = target.def.boss && target.engaged && (target.windup > 0 || this.ctx.dangerEscape() !== null);
        const want = near >= 3 || (near >= 1 && p.hp / p.stats.maxHp < 0.6) || bossNear || bossCasting;
        if (want && skills.cast(slot, true)) return true;
      } else if (sk.auto === 'summon') {
        // 召喚物不足就補（骷髏兵少於上限、巨衛不在場…）
        const id = sk.summon as MinionId | undefined;
        const mm = this.ctx.minions;
        if (!id || !mm || !MINIONS[id]) continue;
        const have = mm.count(id);
        const lowLife = mm.list.filter((m) => m.alive && m.def.id === id && m.life < 4).length;
        const want = MINIONS[id].max >= 3 ? have + (sk.count ?? 1) <= MINIONS[id].max || lowLife > 0 : have - lowLife < MINIONS[id].max;
        if (want && skills.cast(slot, true)) return true;
      } else if (sk.auto === 'detonate') {
        // 殘血保命（爆炸回血），或召喚物快消失時引爆
        const mm = this.ctx.minions;
        if (!mm) continue;
        const alive = mm.count();
        const expiring = mm.list.filter((m) => m.alive && m.life < 1.5 && Math.hypot(m.pos.x - target.pos.x, m.pos.z - target.pos.z) < 4).length;
        if (alive >= 1 && (p.hp / p.stats.maxHp < 0.35 || expiring >= 2) && skills.cast(slot, true)) return true;
      } else if (sk.auto === 'burst') {
        if (p.berserkT > 0) continue;
        if ((bossNear || near >= 3) && skills.cast(slot, true)) return true;
      }
    }
    return false;
  }

  /** 最近的敵人；還沒開打、而且等級比玩家高的首領會略過（避免 AUTO 把低等玩家帶去送死） */
  private pickTarget(): Enemy | null {
    const p = this.ctx.player;
    const lv = this.ctx.level();
    let best: Enemy | null = null;
    let bd = AUTO_SEARCH_RANGE;
    for (const e of this.ctx.enemies.enemies) {
      if (!e.alive || e.ai === 'return' || e.def.aggro === 'none') continue;
      if (e.def.boss && !e.engaged && lv < e.def.level) continue;
      const d = dist(e, p) - e.radius;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private moveTo(x: number, z: number) {
    const p = this.ctx.player;
    this.setMove(x - p.pos.x, z - p.pos.z);
  }

  /**
   * 局部繞路（沿牆走）：往目標方向分段探測，被牆 / 柵欄擋住時，
   * 從左右各個偏轉角度中挑「能前進」且「最接近上一次移動方向」的方向，
   * 這樣經過目標正下方時也不會左右抖動。沒有全域尋路，但足以繞過柵欄、房子、石頭。
   */
  private setMove(dx: number, dz: number) {
    const l = Math.hypot(dx, dz);
    if (l < 0.01) return;
    const base = Math.atan2(dx / l, dz / l);
    if (this.passable(base)) {
      this.applyDir(base);
      return;
    }
    let best: number | null = null;
    let bestScore = -Infinity;
    for (const raw of STEER_ANGLES) {
      if (raw === 0) continue;
      for (const sgn of [1, -1]) {
        const a = base + raw * sgn;
        if (!this.passable(a)) continue;
        // 沿牆中：以延續上次方向為主；剛被擋住：以偏轉最少為主
        const cont = Math.sin(a) * this.last.x + Math.cos(a) * this.last.z;
        const score = this.detour > 0 ? cont * 2 - raw * 0.3 : -raw + cont * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = a;
        }
      }
    }
    if (best === null) {
      this.applyDir(base);
      return;
    }
    this.detour = DETOUR_COMMIT;
    this.applyDir(best);
  }

  private applyDir(a: number) {
    this.move.x = Math.sin(a);
    this.move.z = Math.cos(a);
    this.last.x = this.move.x;
    this.last.z = this.move.z;
  }

  /** 分 4 小步探測該方向能不能走（避免薄柵欄被一步跨過） */
  private passable(a: number): boolean {
    const p = this.ctx.player;
    const col = this.ctx.collision();
    const sx = Math.sin(a);
    const sz = Math.cos(a);
    this.probe.x = p.pos.x;
    this.probe.z = p.pos.z;
    for (let i = 0; i < 4; i++) {
      this.probe.x += (sx * PROBE) / 4;
      this.probe.z += (sz * PROBE) / 4;
      col.resolve(this.probe, p.radius);
    }
    const progress = (this.probe.x - p.pos.x) * sx + (this.probe.z - p.pos.z) * sz;
    return progress > PROBE * 0.7;
  }
}

function dist(e: Enemy, p: Player) {
  return Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
}
