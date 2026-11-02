import * as THREE from 'three';
import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { MAGE_SKILLS } from '@/data/player';
import type { SkillDef, SkillSlot } from '@/data/types';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { EnemyManager } from './EnemyManager';
import type { ProjectileSystem } from './ProjectileSystem';
import type { TargetSelector } from './TargetSelector';
import type { Effects } from './Effects';
import { damageArea } from './Damage';

/**
 * 技能系統：普攻 + Q/W/E/R、藥水。
 * 所有冷卻都在這裡，HUD 只讀 cooldownRatio() / remaining()。
 *
 *  普攻  魔彈       追蹤單體
 *  Q     火球術     追蹤投射物，命中範圍爆炸 r=2.2
 *  W     冰霜新星   以自身為中心 r=4，附加緩速 50% 2.5 秒
 *  E     烈焰爆發   目標腳下 0.35 秒預警後爆炸 r=3
 *  R     閃現       往搖桿方向（無輸入則面向）瞬移 6m，0.3 秒無敵
 */
export const POTION_COOLDOWN = 2;
export const POTION_HEAL_RATIO = 0.35;
export const FROST_SLOW = { duration: 2.5, mul: 0.5 };
export const FLAME_DELAY = 0.35;

export interface SkillContext {
  player: Player;
  state: GameState;
  enemies: EnemyManager;
  targets: TargetSelector;
  projectiles: ProjectileSystem;
  effects: Effects;
  collision: () => CollisionWorld;
  moveInput: () => { x: number; z: number };
}

interface Delayed {
  t: number;
  run: () => void;
}

const BY_SLOT = Object.fromEntries(MAGE_SKILLS.map((s) => [s.slot, s])) as Record<SkillSlot, SkillDef>;

export class SkillSystem {
  private cd: Record<SkillSlot, number> = { basic: 0, Q: 0, W: 0, E: 0, R: 0 };
  potionCd = 0;
  private delayed: Delayed[] = [];
  private tmp = new THREE.Vector3();

  constructor(private ctx: SkillContext) {}

  def(slot: SkillSlot): SkillDef {
    return BY_SLOT[slot];
  }

  remaining(slot: SkillSlot): number {
    return this.cd[slot];
  }

  cooldownRatio(slot: SkillSlot): number {
    const total = BY_SLOT[slot].cooldown;
    return total > 0 ? this.cd[slot] / total : 0;
  }

  /** MP 足夠且冷卻完成 */
  canCast(slot: SkillSlot): boolean {
    return this.cd[slot] <= 0 && this.ctx.player.mp >= BY_SLOT[slot].mpCost && this.ctx.player.alive;
  }

  reset() {
    for (const k of Object.keys(this.cd) as SkillSlot[]) this.cd[k] = 0;
    this.potionCd = 0;
    this.delayed = [];
  }

  update(dt: number) {
    for (const k of Object.keys(this.cd) as SkillSlot[]) this.cd[k] = Math.max(0, this.cd[k] - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) {
        this.delayed.splice(i, 1);
        d.run();
      }
    }
  }

  /**
   * 嘗試施放。silent = true 時不顯示「冷卻中 / MP 不足」提示（按住普攻、AUTO 用）。
   * 回傳是否成功。
   */
  cast(slot: SkillSlot, silent = false): boolean {
    const sk = BY_SLOT[slot];
    const p = this.ctx.player;
    if (!p.alive) return false;
    if (this.cd[slot] > 0) return false;
    if (p.mp < sk.mpCost) {
      if (!silent) bus.emit('toast', { text: 'MP 不足' });
      return false;
    }
    let ok = false;
    switch (slot) {
      case 'basic':
        ok = this.castBolt(sk, false);
        break;
      case 'Q':
        ok = this.castBolt(sk, true);
        break;
      case 'W':
        ok = this.castFrostNova(sk);
        break;
      case 'E':
        ok = this.castFlameBurst(sk);
        break;
      case 'R':
        ok = this.castBlink(sk);
        break;
    }
    if (!ok) return false;
    p.mp -= sk.mpCost;
    this.cd[slot] = sk.cooldown;
    bus.emit('skill:cast', { slot });
    if (sk.mpCost > 0) bus.emit('player:changed');
    return true;
  }

  usePotion(kind: 'hp' | 'mp', silent = false): boolean {
    const p = this.ctx.player;
    const s = this.ctx.state;
    if (!p.alive || this.potionCd > 0) return false;
    const max = kind === 'hp' ? p.stats.maxHp : p.stats.maxMp;
    const cur = kind === 'hp' ? p.hp : p.mp;
    if (s.potions[kind] <= 0) {
      if (!silent) bus.emit('toast', { text: kind === 'hp' ? '紅藥水用完了，可到主城道具店購買' : '藍藥水用完了，可到主城道具店購買' });
      return false;
    }
    if (cur >= max) {
      if (!silent) bus.emit('toast', { text: kind === 'hp' ? 'HP 已滿' : 'MP 已滿' });
      return false;
    }
    const heal = Math.round(max * POTION_HEAL_RATIO);
    if (kind === 'hp') p.hp = Math.min(max, p.hp + heal);
    else p.mp = Math.min(max, p.mp + heal);
    s.potions[kind]--;
    this.potionCd = POTION_COOLDOWN;
    this.ctx.effects.ring(p.pos.x, p.pos.z, 0.4, 1.4, kind === 'hp' ? 0xff6a55 : 0x5cb2ff, 0.5);
    bus.emit('skill:cast', { slot: 'potion' });
    bus.emit('player:changed');
    return true;
  }

  /* ---------------- 各技能 ---------------- */

  /** 朝向：有目標面向目標，否則用角色面向 */
  private aim(range: number) {
    const p = this.ctx.player;
    const target = this.ctx.targets.acquire(p.pos.x, p.pos.z, range);
    let dx = Math.sin(p.facing);
    let dz = Math.cos(p.facing);
    if (target) {
      dx = target.pos.x - p.pos.x;
      dz = target.pos.z - p.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
    }
    return { target, dx, dz };
  }

  private castBolt(sk: SkillDef, fireball: boolean): boolean {
    const p = this.ctx.player;
    const { target, dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    const from = this.tmp.set(p.pos.x + dx * 0.6, 1.5 + p.groundY, p.pos.z + dz * 0.6);
    const fx = this.ctx.effects;
    return this.ctx.projectiles.fire({
      from,
      dirX: dx,
      dirZ: dz,
      target,
      attacker: p.stats,
      power: sk.power,
      range: sk.range,
      color: sk.color,
      speed: fireball ? 15 : 18,
      size: fireball ? 1.9 : 1,
      aoe: fireball ? sk.radius ?? 2.2 : 0,
      onImpact: fireball ? (x, z) => {
        fx.disc(x, z, sk.radius ?? 2.2, 0xff7a2a, 0.35, 0.7);
        fx.ring(x, z, 0.5, (sk.radius ?? 2.2) * 1.1, 0xffc46b, 0.4);
      } : undefined,
    });
  }

  private castFrostNova(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 4;
    p.cast(Math.sin(p.facing), Math.cos(p.facing));
    this.ctx.effects.ring(p.pos.x, p.pos.z, 0.5, r, 0x8fe3ff, 0.45);
    this.ctx.effects.disc(p.pos.x, p.pos.z, r, 0x4fb8ff, 0.5, 0.45);
    damageArea(this.ctx.enemies.enemies, p.pos.x, p.pos.z, r, p.stats, sk.power, (e) => e.applySlow(FROST_SLOW.duration, FROST_SLOW.mul));
    return true;
  }

  private castFlameBurst(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 3;
    const { target, dx, dz } = this.aim(sk.range);
    const x = target ? target.pos.x : p.pos.x + dx * 4;
    const z = target ? target.pos.z : p.pos.z + dz * 4;
    p.cast(dx, dz);
    p.castBig();
    const fx = this.ctx.effects;
    fx.ring(x, z, r * 1.5, r, 0xff9a3c, FLAME_DELAY);
    const stats = { ...p.stats };
    this.delayed.push({
      t: FLAME_DELAY,
      run: () => {
        fx.disc(x, z, r, 0xff5a1a, 0.45, 0.8);
        fx.ring(x, z, r * 0.6, r * 1.25, 0xffd36b, 0.45);
        fx.pillar(x, z, r * 0.5, 0xff8a3c, 0.4);
        damageArea(this.ctx.enemies.enemies, x, z, r, stats, sk.power);
      },
    });
    return true;
  }

  private castBlink(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const mv = this.ctx.moveInput();
    let dx = mv.x;
    let dz = mv.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.1) {
      dx = Math.sin(p.facing);
      dz = Math.cos(p.facing);
    } else {
      dx /= l;
      dz /= l;
    }
    const fx = this.ctx.effects;
    p.dodge();
    fx.pillar(p.pos.x, p.pos.z, 0.8, sk.color, 0.4);
    fx.ring(p.pos.x, p.pos.z, 0.3, 1.6, sk.color, 0.35);
    // 分段前進，每段都做碰撞，不會穿牆
    const col = this.ctx.collision();
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      p.pos.x += (dx * sk.range) / steps;
      p.pos.z += (dz * sk.range) / steps;
      col.resolve(p.pos, p.radius);
    }
    p.facing = Math.atan2(dx, dz);
    p.invulnerable = Math.max(p.invulnerable, 0.3);
    fx.ring(p.pos.x, p.pos.z, 1.6, 0.3, sk.color, 0.3);
    fx.pillar(p.pos.x, p.pos.z, 0.8, sk.color, 0.4);
    return true;
  }
}
