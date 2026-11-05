import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { Minion } from '@/entities/Minion';

/**
 * 小怪 AI 狀態機
 *
 *   idle ──(隨機)──▶ wander ──▶ idle
 *     │  主動怪：玩家進入 AGGRO_RANGE
 *     │  任何怪：被打（provoked）
 *     ▼
 *   chase ──(進入攻擊距離)──▶ attack（前搖 windup → 出手）──▶ chase
 *     │  離出生點超過 LEASH，或玩家死亡
 *     ▼
 *   return（快速回家、回滿血、這段期間不吃傷害）──▶ idle
 *
 * 首領平常和小怪一樣追擊與普攻；施放技能時 BossController 把 ai 設為 'boss'，這段期間這裡不動它。
 * 首領額外的「活」：兩次普攻之間繞著玩家側移（不會呆站著挨打）、貼太近會退開、
 * 短時間被打掉 COUNTER_HP 比例的血會提早反擊（每 COUNTER_CD 秒最多一次）。
 */
export const AGGRO_RANGE = 6.5;
export const LEASH = 16;
/** 回家最多走幾秒，超過就直接回到原位（避免被地形卡住、血量凍結） */
export const RETURN_TIMEOUT = 6;
export const WANDER_RADIUS = 3;
/** 首領反擊：上次出手後受到最大血量的這個比例就提早出手 */
export const COUNTER_HP = 0.03;
export const COUNTER_CD = 5;
/** 首領反擊時普攻冷卻縮短到幾秒 */
const COUNTER_DELAY = 0.3;
/** 首領側移速度（相對移動速度） */
const STRAFE_SPEED = 0.38;

export interface AiContext {
  player: Player;
  collision: CollisionWorld;
  /** 敵人普攻命中玩家 */
  hitPlayer: (e: Enemy, power: number) => void;
  /** 遠程怪（黑卡蒂亡巫）出手：在目標腳下放預警，前搖結束時結算 */
  rangedAttack?: (e: Enemy, windup: number, tx: number, tz: number) => void;
  /** 敵人普攻命中召喚物（召喚師的骷髏） */
  hitMinion?: (e: Enemy, m: Minion, power: number) => void;
}

export function updateEnemyAI(e: Enemy, dt: number, ctx: AiContext) {
  if (!e.alive || e.def.aggro === 'none') return;
  const p = ctx.player;
  e.attackCd = Math.max(0, e.attackCd - dt);
  // 目標：被召喚物嘲諷時打骷髏，否則打玩家
  if (e.aggroMinion && !e.aggroMinion.alive) e.aggroMinion = null;
  const minion = e.aggroMinion;
  const tgt = minion ?? p;
  const dx = tgt.pos.x - e.pos.x;
  const dz = tgt.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
  const atk = e.def.attack ?? { range: 1.2, windup: 0.5, cooldown: 1.5 };
  const reach = atk.range + tgt.radius + e.radius * 0.5;
  const speed = e.def.stats.moveSpeed * e.slowMul;
  if (e.def.boss) e.counterCd = Math.max(0, e.counterCd - dt);

  // 共通：脫戰條件
  if (e.ai === 'chase' || e.ai === 'attack' || e.ai === 'boss') {
    const leash = e.def.boss ? LEASH * 2 : LEASH; // 首領有衝撞、飛撲，活動範圍大一點
    if (!p.alive || homeDist > leash) {
      e.ai = 'return';
      e.windup = 0;
      e.aiTimer = RETURN_TIMEOUT;
    }
  }

  // 暈眩：原地不動、不攻擊（被打會記仇，醒來直接追）
  if (e.stunTimer > 0) {
    e.windup = 0;
    if (e.ai === 'idle' || e.ai === 'wander') e.ai = 'chase';
    return;
  }

  switch (e.ai) {
    case 'idle':
    case 'wander': {
      if (p.alive && (e.provoked || (e.def.aggro === 'aggressive' && dist < AGGRO_RANGE))) {
        e.ai = 'chase';
        break;
      }
      e.aiTimer -= dt;
      if (e.ai === 'idle' && e.aiTimer <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * WANDER_RADIUS;
        e.wanderTarget = { x: e.home.x + Math.cos(a) * r, z: e.home.z + Math.sin(a) * r };
        e.ai = 'wander';
        e.aiTimer = 4;
      }
      if (e.ai === 'wander' && e.wanderTarget) {
        const arrived = moveToward(e, e.wanderTarget.x, e.wanderTarget.z, speed * 0.45, dt, ctx.collision);
        if (arrived || e.aiTimer <= 0) {
          e.ai = 'idle';
          e.aiTimer = 1.5 + Math.random() * 3;
        }
      }
      break;
    }
    case 'chase': {
      if (dist <= reach) {
        face(e, dx, dz, dt, 12);
        if (e.def.boss) {
          // 被狂打：提早反擊
          if (e.attackCd > COUNTER_DELAY && e.counterCd <= 0 && e.hurtSince > e.maxHp * COUNTER_HP) {
            e.attackCd = COUNTER_DELAY;
            e.counterCd = COUNTER_CD;
          }
          const close = e.radius * 0.8 + tgt.radius;
          if (dist < close && dist > 1e-3) {
            // 疊在玩家身上（飛撲落地、玩家鑽進來）：退開一點
            step(e, -dx / dist, -dz / dist, speed * 0.8, dt, ctx.collision);
            face(e, dx, dz, dt, 12);
          } else if (e.attackCd > 0.45 && dist > 1e-3) strafe(e, dx / dist, dz / dist, speed * STRAFE_SPEED, dt, ctx.collision);
        }
        if (e.attackCd <= 0) {
          e.ai = 'attack';
          e.windup = atk.windup;
          e.hurtSince = 0;
          if (e.def.ranged) ctx.rangedAttack?.(e, atk.windup, tgt.pos.x, tgt.pos.z);
        }
      } else {
        moveToward(e, tgt.pos.x, tgt.pos.z, speed, dt, ctx.collision, reach * 0.85);
      }
      break;
    }
    case 'attack': {
      face(e, dx, dz, dt, 6);
      e.windup -= dt;
      if (e.windup <= 0) {
        e.windup = 0;
        // 出手時玩家還在範圍內（+0.6 容錯）才算命中：玩家可以靠走位閃開
        if (!e.def.ranged && dist <= reach + 0.6) {
          if (minion) ctx.hitMinion?.(e, minion, 1);
          else if (p.alive) ctx.hitPlayer(e, 1);
        }
        e.attackCd = atk.cooldown;
        e.ai = 'chase';
      }
      break;
    }
    case 'boss':
      break; // BossController 控制中
    case 'return': {
      // 直線走回家；被高台、牆卡住走不回去時（例如首領衝撞衝下高台），逾時直接回到原位
      e.aiTimer -= dt;
      const arrived = moveToward(e, e.home.x, e.home.z, Math.max(speed, 3) * 1.6, dt, ctx.collision);
      if (!arrived && e.aiTimer <= 0) {
        e.pos.x = e.home.x;
        e.pos.z = e.home.z;
      }
      if (arrived || e.aiTimer <= 0) {
        e.resetToHome();
        e.ai = 'idle';
        e.aiTimer = 1;
      }
      break;
    }
  }
}

/** 朝 (nx, nz) 單位向量走一步（不轉身） */
function step(e: Enemy, nx: number, nz: number, speed: number, dt: number, col: CollisionWorld) {
  e.pos.x += nx * speed * dt;
  e.pos.z += nz * speed * dt;
  col.resolve(e.pos, e.radius);
  e.moving = 1;
}

/** 首領：面向目標、繞著目標側移；每 1.2~2.8 秒隨機換方向 */
function strafe(e: Enemy, nx: number, nz: number, speed: number, dt: number, col: CollisionWorld) {
  e.strafeT -= dt;
  if (e.strafeT <= 0) {
    e.strafeDir = Math.random() < 0.5 ? -1 : 1;
    e.strafeT = 1.2 + Math.random() * 1.6;
  }
  const bx = e.pos.x;
  const bz = e.pos.z;
  step(e, -nz * e.strafeDir, nx * e.strafeDir, speed, dt, col);
  // 撞牆走不動：換方向
  if (Math.hypot(e.pos.x - bx, e.pos.z - bz) < speed * dt * 0.3) e.strafeT = 0;
}

/** 往目標移動，回傳是否抵達（stopAt：距離目標多近就停） */
export function moveToward(e: Enemy, tx: number, tz: number, speed: number, dt: number, col: CollisionWorld, stopAt = 0.2): boolean {
  const dx = tx - e.pos.x;
  const dz = tz - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d <= stopAt) return true;
  const step = Math.min(d - stopAt, speed * dt);
  e.pos.x += (dx / d) * step;
  e.pos.z += (dz / d) * step;
  col.resolve(e.pos, e.radius);
  face(e, dx, dz, dt, 10);
  e.moving = 1;
  return false;
}

export function face(e: Enemy, dx: number, dz: number, dt: number, rate: number) {
  const target = Math.atan2(dx, dz);
  let d = target - e.facing;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  e.facing += d * Math.min(1, dt * rate);
}
