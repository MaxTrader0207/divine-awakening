import { bus } from '@/core/EventBus';
import type { Enemy } from '@/entities/Enemy';
import { calcDamage, type AttackerStats, type DamageResult } from './Combat';

/**
 * 傷害結算的唯一入口（有副作用：發事件）。
 * 普攻、技能、首領技能都經過這裡，確保傷害數字、擊殺獎勵、音效一致。
 */
export function damageEnemy(e: Enemy, attacker: AttackerStats, power: number): DamageResult | null {
  if (!e.alive) return null;
  const res = calcDamage(attacker, power, e.defense);
  const killed = e.takeDamage(res.amount);
  bus.emit('combat:hit', { x: e.pos.x, y: e.height + 0.2, z: e.pos.z, amount: res.amount, crit: res.crit, targetIsPlayer: false });
  if (killed) {
    bus.emit('enemy:killed', {
      enemyId: e.def.id,
      name: e.def.name,
      x: e.pos.x,
      z: e.pos.z,
      level: e.def.level,
      exp: e.def.exp,
      gold: e.def.gold,
      boss: !!e.def.boss,
    });
  }
  return res;
}

/** 對圓形範圍內所有敵人造成傷害，回傳命中數 */
export function damageArea(enemies: Enemy[], x: number, z: number, radius: number, attacker: AttackerStats, power: number, onHit?: (e: Enemy) => void): number {
  let n = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.pos.x - x, e.pos.z - z) <= radius + e.radius) {
      damageEnemy(e, attacker, power);
      onHit?.(e);
      n++;
    }
  }
  return n;
}
