import * as THREE from 'three';
import { bus } from '@/core/EventBus';
import type { GameState } from '@/core/GameState';
import { CLASSES, type HeroClass } from '@/data/classes';
import type { SkillDef, SkillSlot } from '@/data/types';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { EnemyManager } from './EnemyManager';
import type { ProjectileSystem } from './ProjectileSystem';
import type { TargetSelector } from './TargetSelector';
import type { Effects } from './Effects';
import { damageArea, damageCone, damageEnemy } from './Damage';
import type { Enemy } from '@/entities/Enemy';

/**
 * 技能系統：普攻 + Q/W/E/R、藥水。技能清單依職業（data/classes.ts），效果依 skill.id 分派。
 * 所有冷卻都在這裡，HUD 只讀 cooldownRatio() / remaining()。
 *
 * 法師
 *  普攻  魔彈       追蹤單體
 *  Q     火球術     追蹤投射物，命中範圍爆炸 r=2.2
 *  W     冰霜新星   以自身為中心 r=4，附加緩速 50% 2.5 秒
 *  E     烈焰爆發   目標腳下 0.35 秒預警後爆炸 r=3
 *  R     閃現       往搖桿方向（無輸入則面向）瞬移 6m，0.3 秒無敵
 * 弓手
 *  普攻  射擊       快速追蹤箭
 *  Q     多重箭     扇形 5 支箭（不追蹤）
 *  W     貫穿箭     直線穿透所有敵人
 *  E     箭雨       目標區域 3 波傷害
 *  R     後跳       往後（或搖桿方向）跳開 6m，附近敵人緩速
 * 騎士
 *  普攻  劍擊       前方扇形 2.7m / 120°，可同時砍多隻
 *  Q     盾擊       前方扇形 3m，暈眩 1.4 秒並打斷前搖（首領免疫暈眩）
 *  W     守護       4 秒受到傷害 -60%，6m 內敵人被挑釁
 *  E     旋風斬     自身周圍 3.6m，0.3 秒一圈共 3 圈
 *  R     衝鋒       往目標 / 搖桿方向衝 7m，撞到的敵人受傷，0.35 秒無敵
 */
export const POTION_COOLDOWN = 2;
export const POTION_HEAL_RATIO = 0.35;
export const FROST_SLOW = { duration: 2.5, mul: 0.5 };
export const FLAME_DELAY = 0.35;
/** 守護減傷比例 */
export const GUARD_REDUCTION = 0.6;

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

export class SkillSystem {
  readonly list: SkillDef[];
  private bySlot: Record<SkillSlot, SkillDef>;
  private cd: Record<SkillSlot, number> = { basic: 0, Q: 0, W: 0, E: 0, R: 0 };
  potionCd = 0;
  private delayed: Delayed[] = [];
  private tmp = new THREE.Vector3();
  private guardFx = 0;

  constructor(private ctx: SkillContext, heroClass: HeroClass = 'mage') {
    this.list = CLASSES[heroClass].skills;
    this.bySlot = Object.fromEntries(this.list.map((s) => [s.slot, s])) as Record<SkillSlot, SkillDef>;
  }

  def(slot: SkillSlot): SkillDef {
    return this.bySlot[slot];
  }

  remaining(slot: SkillSlot): number {
    return this.cd[slot];
  }

  cooldownRatio(slot: SkillSlot): number {
    const total = this.bySlot[slot].cooldown;
    return total > 0 ? this.cd[slot] / total : 0;
  }

  /** MP 足夠且冷卻完成 */
  canCast(slot: SkillSlot): boolean {
    return this.cd[slot] <= 0 && this.ctx.player.mp >= this.bySlot[slot].mpCost && this.ctx.player.alive;
  }

  reset() {
    for (const k of Object.keys(this.cd) as SkillSlot[]) this.cd[k] = 0;
    this.potionCd = 0;
    this.delayed = [];
  }

  update(dt: number) {
    for (const k of Object.keys(this.cd) as SkillSlot[]) this.cd[k] = Math.max(0, this.cd[k] - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    // 守護中：腳下持續出現藍色護盾光圈
    const p = this.ctx.player;
    if (p.guardT > 0) {
      this.guardFx -= dt;
      if (this.guardFx <= 0) {
        this.guardFx = 0.35;
        this.ctx.effects.ring(p.pos.x, p.pos.z, 1.5, 1.1, 0x8fd4ff, 0.35);
      }
    }
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
    const sk = this.bySlot[slot];
    const p = this.ctx.player;
    if (!p.alive) return false;
    if (this.cd[slot] > 0) return false;
    if (p.mp < sk.mpCost) {
      if (!silent) bus.emit('toast', { text: 'MP 不足' });
      return false;
    }
    let ok = false;
    switch (sk.id) {
      case 'magic_bolt':
        ok = this.castBolt(sk, false);
        break;
      case 'fireball':
        ok = this.castBolt(sk, true);
        break;
      case 'frost_nova':
        ok = this.castFrostNova(sk);
        break;
      case 'flame_burst':
        ok = this.castFlameBurst(sk);
        break;
      case 'blink':
        ok = this.castBlink(sk);
        break;
      case 'arrow':
        ok = this.castArrow(sk);
        break;
      case 'multishot':
        ok = this.castMultishot(sk);
        break;
      case 'pierce':
        ok = this.castPierce(sk);
        break;
      case 'arrow_rain':
        ok = this.castArrowRain(sk);
        break;
      case 'backstep':
        ok = this.castBackstep(sk);
        break;
      case 'slash':
        ok = this.castSlash(sk);
        break;
      case 'shield_bash':
        ok = this.castShieldBash(sk);
        break;
      case 'guard':
        ok = this.castGuard(sk);
        break;
      case 'whirlwind':
        ok = this.castWhirlwind(sk);
        break;
      case 'charge':
        ok = this.castCharge(sk);
        break;
    }
    if (!ok) return false;
    p.mp -= sk.mpCost;
    this.cd[slot] = sk.cooldown;
    bus.emit('skill:cast', { slot, id: sk.id });
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

  /* ---------------- 弓手 ---------------- */

  private fireFrom(dx: number, dz: number) {
    const p = this.ctx.player;
    return this.tmp.set(p.pos.x + dx * 0.6, 1.4 + p.groundY, p.pos.z + dz * 0.6);
  }

  private castArrow(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { target, dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    return this.ctx.projectiles.fire({ from: this.fireFrom(dx, dz), dirX: dx, dirZ: dz, target, attacker: p.stats, power: sk.power, range: sk.range, color: sk.color, speed: 28, size: 0.7, arrow: true });
  }

  private castMultishot(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    const n = sk.count ?? 5;
    const spread = 0.7; // 總扇形角（弧度）
    const base = Math.atan2(dx, dz);
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / (n - 1);
      const ax = Math.sin(a);
      const az = Math.cos(a);
      this.ctx.projectiles.fire({ from: this.fireFrom(ax, az), dirX: ax, dirZ: az, target: null, attacker: p.stats, power: sk.power, range: sk.range, color: sk.color, speed: 24, size: 0.7, arrow: true });
    }
    return true;
  }

  private castPierce(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    p.castBig();
    this.ctx.effects.ring(p.pos.x, p.pos.z, 0.4, 1.6, sk.color, 0.3);
    return this.ctx.projectiles.fire({ from: this.fireFrom(dx, dz), dirX: dx, dirZ: dz, target: null, attacker: p.stats, power: sk.power, range: sk.range, color: sk.color, speed: 34, size: 1.6, arrow: true, pierce: true });
  }

  private castArrowRain(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 3.6;
    const { target, dx, dz } = this.aim(sk.range);
    const x = target ? target.pos.x : p.pos.x + dx * 5;
    const z = target ? target.pos.z : p.pos.z + dz * 5;
    p.cast(dx, dz);
    p.castBig();
    const fx = this.ctx.effects;
    fx.ring(x, z, r * 1.3, r, sk.color, 0.4);
    const stats = { ...p.stats };
    const waves = sk.waves ?? 3;
    for (let w = 0; w < waves; w++) {
      this.delayed.push({
        t: 0.35 + w * 0.35,
        run: () => {
          fx.disc(x, z, r, 0x6aa8d8, 0.3, 0.45);
          for (let k = 0; k < 4; k++) fx.pillar(x + (Math.random() - 0.5) * r * 1.4, z + (Math.random() - 0.5) * r * 1.4, 0.12, 0xd8f0ff, 0.25);
          damageArea(this.ctx.enemies.enemies, x, z, r, stats, sk.power);
        },
      });
    }
    return true;
  }

  private castBackstep(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const mv = this.ctx.moveInput();
    const l = Math.hypot(mv.x, mv.z);
    // 有推搖桿就往搖桿方向，否則往面向的反方向跳
    const dx = l > 0.1 ? mv.x / l : -Math.sin(p.facing);
    const dz = l > 0.1 ? mv.z / l : -Math.cos(p.facing);
    const fx = this.ctx.effects;
    fx.ring(p.pos.x, p.pos.z, 0.4, 3, sk.color, 0.4);
    // 起跳點的敵人緩速
    for (const e of this.ctx.enemies.enemies) if (e.alive && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 3) e.applySlow(2, 0.5);
    const col = this.ctx.collision();
    for (let i = 0; i < 24; i++) {
      p.pos.x += (dx * sk.range) / 24;
      p.pos.z += (dz * sk.range) / 24;
      col.resolve(p.pos, p.radius);
    }
    p.dodge();
    p.invulnerable = Math.max(p.invulnerable, 0.3);
    fx.pillar(p.pos.x, p.pos.z, 0.6, sk.color, 0.35);
    return true;
  }

  /* ---------------- 騎士 ---------------- */

  /** 近戰朝向：鎖定範圍放寬一點（會先轉身面向最近的敵人） */
  private meleeAim(range: number) {
    return this.aim(range + 1.5);
  }

  private castSlash(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.meleeAim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, 2.2);
    const facing = Math.atan2(dx, dz);
    this.ctx.effects.arc(p.pos.x, p.pos.z, facing, 0.8, sk.range, sk.color, 0.2, 0.9 + p.groundY);
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, sk.range, sk.arc ?? 2.1, p.stats, sk.power);
    return true;
  }

  private castShieldBash(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.meleeAim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, 1.8);
    const fx = this.ctx.effects;
    const facing = Math.atan2(dx, dz);
    fx.arc(p.pos.x, p.pos.z, facing, 0.6, sk.range, sk.color, 0.3, 0.7 + p.groundY);
    fx.ring(p.pos.x + dx * 1.6, p.pos.z + dz * 1.6, 0.3, 1.6, sk.color, 0.35);
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, sk.range, sk.arc ?? 1.6, p.stats, sk.power, (e) => {
      if (e.applyStun(sk.stun ?? 1.4)) fx.pillar(e.pos.x, e.pos.z, 0.35, 0xffe27a, 0.5);
      else bus.emit('float:text', { x: e.pos.x, y: e.height + 0.8, z: e.pos.z, text: '免疫', kind: 'info' });
    });
    return true;
  }

  private castGuard(sk: SkillDef): boolean {
    const p = this.ctx.player;
    p.guardT = sk.duration ?? 4;
    p.act(sk.anim, 1.4);
    const fx = this.ctx.effects;
    fx.pillar(p.pos.x, p.pos.z, 0.9, sk.color, 0.5);
    fx.ring(p.pos.x, p.pos.z, 0.5, sk.radius ?? 6, sk.color, 0.5);
    // 挑釁：範圍內的敵人都來找騎士
    const r = sk.radius ?? 6;
    for (const e of this.ctx.enemies.enemies) {
      if (!e.alive || e.def.aggro === 'none' || e.ai === 'return') continue;
      if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > r + e.radius) continue;
      e.provoked = true;
      if (e.ai === 'idle' || e.ai === 'wander') e.ai = 'chase';
    }
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: '守護', kind: 'info' });
    return true;
  }

  private castWhirlwind(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 3.6;
    p.act(sk.anim, 1.5);
    p.cast(Math.sin(p.facing), Math.cos(p.facing));
    const stats = { ...p.stats };
    const fx = this.ctx.effects;
    const waves = sk.waves ?? 3;
    for (let w = 0; w < waves; w++) {
      const spin = () => {
        // 跟著騎士目前位置（旋轉中可以移動）
        const x = p.pos.x;
        const z = p.pos.z;
        for (let k = 0; k < 3; k++) fx.arc(x, z, p.facing + w * 1.1 + (k * Math.PI * 2) / 3, 0.6, r, sk.color, 0.25, 0.8 + p.groundY);
        fx.ring(x, z, r * 0.5, r, 0xffd36b, 0.3);
        damageArea(this.ctx.enemies.enemies, x, z, r, stats, sk.power);
      };
      if (w === 0) spin();
      else this.delayed.push({ t: w * 0.3, run: spin });
    }
    return true;
  }

  private castCharge(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const mv = this.ctx.moveInput();
    const l = Math.hypot(mv.x, mv.z);
    let dx: number;
    let dz: number;
    if (l > 0.1) {
      dx = mv.x / l;
      dz = mv.z / l;
    } else {
      const a = this.aim(sk.range + 2);
      dx = a.dx;
      dz = a.dz;
    }
    const fx = this.ctx.effects;
    fx.ring(p.pos.x, p.pos.z, 0.3, 1.8, sk.color, 0.3);
    p.dodge();
    // 分段前進＋碰撞；沿路撞到的敵人各受一次傷害並緩速
    const col = this.ctx.collision();
    const hit = new Set<Enemy>();
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      p.pos.x += (dx * sk.range) / steps;
      p.pos.z += (dz * sk.range) / steps;
      col.resolve(p.pos, p.radius);
      for (const e of this.ctx.enemies.enemies) {
        if (!e.alive || hit.has(e)) continue;
        if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < e.radius + 1.2) hit.add(e);
      }
      if (i % 7 === 3) fx.ring(p.pos.x, p.pos.z, 0.4, 1.2, sk.color, 0.3);
    }
    for (const e of hit) {
      damageEnemy(e, p.stats, sk.power);
      e.applySlow(1.5, 0.6);
    }
    p.facing = Math.atan2(dx, dz);
    p.invulnerable = Math.max(p.invulnerable, 0.35);
    fx.disc(p.pos.x, p.pos.z, 2.2, sk.color, 0.35, 0.45);
    return true;
  }
}
