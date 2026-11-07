import { bus } from '@/core/EventBus';
import type { Enemy } from '@/entities/Enemy';
import { calcDamage, type AttackerStats, type DamageResult } from './Combat';
import { elementMul, type Element } from '@/data/elements';

/**
 * 傷害結算的唯一入口（有副作用：發事件）。
 * 普攻、技能、首領技能都經過這裡，確保傷害數字、擊殺獎勵、音效一致。
 */
/**
 * 傷害來源（v1.58）：召喚物 / 守護者夥伴。沒填＝玩家本人。
 * 首領用它記仇恨（誰打得最痛就轉頭打誰）；有屬性時套用相剋倍率（data/elements.ts）。
 */
export interface DamageSource {
  element?: Element;
}

export function damageEnemy(e: Enemy, attacker: AttackerStats, power: number, source?: DamageSource): DamageResult | null {
  if (!e.alive) return null;
  const res = calcDamage(attacker, power, e.defense);
  if (source?.element) res.amount = Math.max(1, Math.round(res.amount * elementMul(source.element, e.def.element)));
  const killed = e.takeDamage(res.amount, source);
  // 首領的神力擋下超量傷害時，顯示實際扣掉的量
  res.amount = e.lastDealt;
  bus.emit('combat:hit', { x: e.pos.x, y: e.height + 0.2, z: e.pos.z, amount: res.amount, crit: res.crit, targetIsPlayer: false });
  if (killed) {
    bus.emit('enemy:killed', {
      enemyId: e.def.id,
      name: e.def.name,
      x: e.pos.x,
      z: e.pos.z,
      level: e.level,
      exp: Math.round(e.def.exp * e.expMul),
      gold: (e.goldMul === 1 ? e.def.gold : [Math.round(e.def.gold[0] * e.goldMul), Math.round(e.def.gold[1] * e.goldMul)]) as [number, number],
      gems: e.def.gems ?? 0,
      boss: !!e.def.boss,
    });
  }
  return res;
}

/** 對圓形範圍內所有敵人造成傷害，回傳命中數 */
export function damageArea(enemies: Enemy[], x: number, z: number, radius: number, attacker: AttackerStats, power: number, onHit?: (e: Enemy) => void, source?: DamageSource): number {
  let n = 0;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.hypot(e.pos.x - x, e.pos.z - z) <= radius + e.radius) {
      damageEnemy(e, attacker, power, source);
      onHit?.(e);
      n++;
    }
  }
  return n;
}

/**
 * 近戰扇形：以 (x, z) 為頂點、面向 (dirX, dirZ)、半徑 range、總角度 arc 內的敵人。
 * 貼身（距離小於敵人半徑 + 0.6）一律算命中，避免角色疊在怪身上時打不到。
 */
export function inCone(e: Enemy, x: number, z: number, dirX: number, dirZ: number, range: number, arc: number): boolean {
  const dx = e.pos.x - x;
  const dz = e.pos.z - z;
  const d = Math.hypot(dx, dz);
  if (d > range + e.radius) return false;
  if (d < e.radius + 0.6) return true;
  const cos = (dx * dirX + dz * dirZ) / d;
  return cos >= Math.cos(arc / 2);
}

export function damageCone(enemies: Enemy[], x: number, z: number, dirX: number, dirZ: number, range: number, arc: number, attacker: AttackerStats, power: number, onHit?: (e: Enemy) => void): number {
  let n = 0;
  for (const e of enemies) {
    if (!e.alive || !inCone(e, x, z, dirX, dirZ, range, arc)) continue;
    damageEnemy(e, attacker, power);
    onHit?.(e);
    n++;
  }
  return n;
}
