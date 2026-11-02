import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';

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
 */
export const AGGRO_RANGE = 6.5;
export const LEASH = 16;
export const WANDER_RADIUS = 3;

export interface AiContext {
  player: Player;
  collision: CollisionWorld;
  /** 敵人普攻命中玩家 */
  hitPlayer: (e: Enemy, power: number) => void;
  /** 遠程怪（骷髏法師）出手：在玩家腳下放預警，前搖結束時結算 */
  rangedAttack?: (e: Enemy, windup: number) => void;
}

export function updateEnemyAI(e: Enemy, dt: number, ctx: AiContext) {
  if (!e.alive || e.def.aggro === 'none') return;
  const p = ctx.player;
  e.attackCd = Math.max(0, e.attackCd - dt);
  const dx = p.pos.x - e.pos.x;
  const dz = p.pos.z - e.pos.z;
  const dist = Math.hypot(dx, dz);
  const homeDist = Math.hypot(e.pos.x - e.home.x, e.pos.z - e.home.z);
  const atk = e.def.attack ?? { range: 1.2, windup: 0.5, cooldown: 1.5 };
  const reach = atk.range + p.radius + e.radius * 0.5;
  const speed = e.def.stats.moveSpeed * e.slowMul;

  // 共通：脫戰條件
  if (e.ai === 'chase' || e.ai === 'attack' || e.ai === 'boss') {
    const leash = e.def.boss ? LEASH * 1.5 : LEASH;
    if (!p.alive || homeDist > leash) {
      e.ai = 'return';
      e.windup = 0;
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
        if (e.attackCd <= 0) {
          e.ai = 'attack';
          e.windup = atk.windup;
          if (e.def.ranged) ctx.rangedAttack?.(e, atk.windup);
        }
      } else {
        moveToward(e, p.pos.x, p.pos.z, speed, dt, ctx.collision, reach * 0.85);
      }
      break;
    }
    case 'attack': {
      face(e, dx, dz, dt, 6);
      e.windup -= dt;
      if (e.windup <= 0) {
        e.windup = 0;
        // 出手時玩家還在範圍內（+0.6 容錯）才算命中：玩家可以靠走位閃開
        if (!e.def.ranged && p.alive && dist <= reach + 0.6) ctx.hitPlayer(e, 1);
        e.attackCd = atk.cooldown;
        e.ai = 'chase';
      }
      break;
    }
    case 'boss':
      break; // BossController 控制中
    case 'return': {
      const arrived = moveToward(e, e.home.x, e.home.z, Math.max(speed, 3) * 1.6, dt, ctx.collision);
      if (arrived) {
        e.resetToHome();
        e.ai = 'idle';
        e.aiTimer = 1;
      }
      break;
    }
  }
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
