import * as THREE from 'three';
import { MINIONS, WILD_ROAR, type MinionId } from '@/data/minions';
import { Enemy } from '@/entities/Enemy';
import { ENEMIES } from '@/data/stages';
import { Minion } from '@/entities/Minion';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import { damageArea, damageEnemy } from './Damage';
import type { Effects } from './Effects';
import type { EnemyManager } from './EnemyManager';
import type { ProjectileSystem } from './ProjectileSystem';
import type { TargetSelector } from './TargetSelector';

/**
 * 召喚物管理（召喚師的亡靈、訓獸師的野獸）
 * ------------------------------------------------------------
 * AI（每隻每幀）：
 *   1. 離主人太遠（> LEASH）→ 放棄目標跑回去；超過 TELEPORT 直接傳回主人身邊。
 *   2. 選目標：主人鎖定的敵人優先，否則主人周圍 SEARCH 內最近的敵人（不主動打還沒開戰的首領、木樁）。
 *   3. 走到攻擊距離 → 前搖 → 出手（近戰直接結算、提瑞西阿斯亡靈發射投射物）。
 *   4. 沒有目標：在主人身後排隊跟隨。
 * 嘲諷：骷髏打到小怪時，小怪會改打骷髏（Enemy.aggroMinion，見 EnemyAI）；首領不受嘲諷。
 * 敵人與首領技能打骷髏：Game.hitMinion() / hitMinionsInside()。
 * 守護者夥伴（v1.58，def.guardian）：外觀用守護者的敵人造型（縮小），出手是以目標為中心的範圍雷擊（def.splash），帶屬性。
 */
export const MINION_LEASH = 14;
export const MINION_TELEPORT = 26;
export const MINION_SEARCH = 11;
/** 冥府骨爆：每隻爆炸半徑、倍率、主人回血（最大 HP 比例） */
export const DETONATE = { radius: 2.6, power: 1.8, heal: 0.08 };

export interface MinionContext {
  player: Player;
  enemies: EnemyManager;
  targets: TargetSelector;
  projectiles: ProjectileSystem;
  effects: Effects;
  collision: () => CollisionWorld;
  heightAt: (x: number, z: number) => number;
}

export class MinionManager {
  list: Minion[] = [];
  private seq = 0;
  private tmp = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private ctx: MinionContext) {}

  /** 活著的召喚物數量（可指定種類；不指定時不算守護者夥伴） */
  count(id?: MinionId): number {
    return this.list.filter((m) => m.alive && (id ? m.def.id === id : !m.def.guardian)).length;
  }

  /** 召喚 n 隻；超過上限時最舊的先消失 */
  summon(id: MinionId, n = 1) {
    const def = MINIONS[id];
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    for (let i = 0; i < n; i++) {
      const alive = this.list.filter((m) => m.alive && m.def.id === id);
      if (alive.length >= def.max) alive.sort((a, b) => a.life - b.life)[0].die();
      // 在主人前方扇形散開出現
      const a = p.facing + (n > 1 ? (i - (n - 1) / 2) * 0.9 : 0);
      const x = p.pos.x + Math.sin(a) * 1.8;
      const z = p.pos.z + Math.cos(a) * 1.8;
      const m = new Minion(def, p.stats, x, z, def.guardian ? this.avatarOf(def.guardian, def.avatarScale ?? 0.6) : undefined);
      m.facing = p.facing;
      m.slot = this.seq++;
      const pos = { x, z };
      this.ctx.collision().resolve(pos, def.radius);
      m.pos.x = pos.x;
      m.pos.z = pos.z;
      m.groundY = this.ctx.heightAt(m.pos.x, m.pos.z);
      this.list.push(m);
      this.scene.add(m.object);
      fx.ring(m.pos.x, m.pos.z, 0.2, 1.4, def.color, 0.5);
      fx.pillar(m.pos.x, m.pos.z, 0.45, def.color, 0.5);
    }
    // 埃阿斯亡靈：出場時把周圍小怪拉過來
    if (def.tauntOnSummon) {
      const guard = this.list[this.list.length - 1];
      for (const e of this.ctx.enemies.enemies) {
        if (!e.alive || e.def.boss || e.def.aggro === 'none' || e.ai === 'return') continue;
        if (Math.hypot(e.pos.x - guard.pos.x, e.pos.z - guard.pos.z) > def.tauntOnSummon) continue;
        e.aggroMinion = guard;
        e.provoked = true;
        if (e.ai === 'idle' || e.ai === 'wander') e.ai = 'chase';
      }
      fx.ring(guard.pos.x, guard.pos.z, 0.5, def.tauntOnSummon, def.color, 0.5);
    }
  }

  /** 守護者夥伴的外觀：用守護者的敵人資料建一個縮小的 Enemy（隱藏名牌與血條） */
  private avatarOf(enemyId: string, scale: number): Enemy | undefined {
    const ed = ENEMIES[enemyId];
    if (!ed) return undefined;
    const av = new Enemy({ ...ed, scale: ed.scale * scale }, { enemy: ed.id, x: 0, z: 0 });
    for (const c of av.object.children) if ((c as THREE.Sprite).isSprite) c.visible = false;
    return av;
  }

  /**
   * 野性咆哮（訓獸師）：主人周圍的野獸回血、延長存在時間，duration 秒內攻擊 / 攻速 / 移速提升。
   * 回傳受到鼓舞的數量。
   */
  roarAll(duration: number): number {
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    let n = 0;
    for (const m of this.list) {
      if (!m.alive || !m.def.beast) continue;
      if (Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z) > WILD_ROAR.radius) continue;
      m.roarT = duration;
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * WILD_ROAR.heal);
      m.life = Math.min(m.def.life + WILD_ROAR.extend, m.life + WILD_ROAR.extend);
      fx.ring(m.pos.x, m.pos.z, 0.3, 1.8, 0xff9a3c, 0.45);
      n++;
    }
    return n;
  }

  /** 冥府骨爆：所有召喚物原地爆炸，回傳爆炸數量 */
  detonateAll(): number {
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    let n = 0;
    for (const m of this.list) {
      if (!m.alive || m.def.guardian) continue; // 守護者夥伴不會被引爆
      fx.disc(m.pos.x, m.pos.z, DETONATE.radius, 0x8a5aff, 0.45, 0.6);
      fx.ring(m.pos.x, m.pos.z, 0.4, DETONATE.radius * 1.2, 0xd8c8ff, 0.4);
      damageArea(this.ctx.enemies.enemies, m.pos.x, m.pos.z, DETONATE.radius, p.stats, DETONATE.power);
      m.die();
      n++;
    }
    if (n) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * DETONATE.heal * n);
    return n;
  }

  /** 換地圖、主人倒下：全部移除 */
  clear() {
    for (const m of this.list) m.dispose();
    this.list = [];
  }

  update(dt: number, camera: THREE.Camera) {
    const p = this.ctx.player;
    if (!p.alive && this.list.some((m) => m.alive)) for (const m of this.list) m.die();
    for (let i = this.list.length - 1; i >= 0; i--) {
      const m = this.list[i];
      if (m.alive) {
        m.life -= dt;
        if (m.life <= 0) m.die();
        else this.think(m, dt);
      }
      m.groundY += (this.ctx.heightAt(m.pos.x, m.pos.z) - m.groundY) * Math.min(1, dt * 12);
      m.update(dt, camera);
      if (!m.alive && m.dying <= 0) {
        m.dispose();
        this.list.splice(i, 1);
      }
    }
    this.separate();
  }

  private think(m: Minion, dt: number) {
    const p = this.ctx.player;
    m.attackCd = Math.max(0, m.attackCd - dt);
    const toOwner = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z);
    if (toOwner > MINION_TELEPORT) {
      m.pos.x = p.pos.x - Math.sin(p.facing) * 1.5;
      m.pos.z = p.pos.z - Math.cos(p.facing) * 1.5;
      m.target = null;
      m.windup = 0;
      return;
    }
    if (toOwner > MINION_LEASH) {
      m.target = null;
      m.windup = 0;
      this.moveTo(m, p.pos.x, p.pos.z, m.def.moveSpeed * m.speedMul * 1.4, dt, 2);
      return;
    }

    // 選目標
    if (!this.valid(m.target)) m.target = this.pickTarget();
    const t = m.target;

    // 出手中
    if (m.windup > 0) {
      m.windup -= dt;
      if (t) this.face(m, t.pos.x - m.pos.x, t.pos.z - m.pos.z, dt, 10);
      if (m.windup <= 0) {
        m.windup = 0;
        m.attackCd = m.def.cooldown / m.attackSpeed;
        if (t && this.valid(t)) this.strike(m, t);
      }
      return;
    }

    if (!t) {
      // 跟隨：主人身後排一排
      // 主人身後半圓排開（每隻固定一個位置）
      const a = p.facing + Math.PI + ((m.slot % 7) - 3) * 0.42;
      const r = 2.2 + (m.slot % 2) * 0.9;
      const bx = p.pos.x + Math.sin(a) * r;
      const bz = p.pos.z + Math.cos(a) * r;
      if (Math.hypot(bx - m.pos.x, bz - m.pos.z) > 1.2) this.moveTo(m, bx, bz, m.def.moveSpeed * m.speedMul, dt, 0.6);
      return;
    }

    const d = Math.hypot(t.pos.x - m.pos.x, t.pos.z - m.pos.z);
    const reach = m.def.range + t.radius + m.radius * 0.5;
    if (d > reach) {
      this.moveTo(m, t.pos.x, t.pos.z, m.def.moveSpeed * m.speedMul, dt, reach * 0.85);
      return;
    }
    this.face(m, t.pos.x - m.pos.x, t.pos.z - m.pos.z, dt, 12);
    if (m.attackCd <= 0) {
      m.windup = m.def.windup / m.attackSpeed;
      m.swing();
    }
  }

  private strike(m: Minion, t: Enemy) {
    const def = m.def;
    const stats = m.atkMul === 1 ? m.stats : { ...m.stats, atk: m.stats.atk * m.atkMul };
    if (def.ranged) {
      const dx = t.pos.x - m.pos.x;
      const dz = t.pos.z - m.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      this.ctx.projectiles.fire({
        from: this.tmp.set(m.pos.x + (dx / l) * 0.5, m.groundY + (def.beast === 'eagle' ? 1.2 : 1.4), m.pos.z + (dz / l) * 0.5),
        dirX: dx / l,
        dirZ: dz / l,
        target: t,
        attacker: stats,
        power: def.power,
        range: def.range + 4,
        color: def.color,
        speed: 16,
        size: 0.9,
        source: m,
      });
      return;
    }
    const dist = Math.hypot(t.pos.x - m.pos.x, t.pos.z - m.pos.z);
    if (dist > def.range + t.radius + m.radius + 0.6) return; // 目標跑掉了
    if (def.splash) {
      // 守護者：以目標為中心的範圍雷擊
      damageArea(this.ctx.enemies.enemies, t.pos.x, t.pos.z, def.splash, stats, def.power, undefined, m);
      this.ctx.effects.pillar(t.pos.x, t.pos.z, 0.7, def.color, 0.35);
      this.ctx.effects.ring(t.pos.x, t.pos.z, 0.3, def.splash, def.color, 0.3);
      this.taunt(m, t);
      return;
    }
    damageEnemy(t, stats, def.power, m);
    this.ctx.effects.ring(t.pos.x, t.pos.z, 0.2, 0.9, def.color, 0.25);
    this.taunt(m, t);
  }

  /** 嘲諷：小怪改打這隻骷髏 */
  private taunt(m: Minion, e: Enemy) {
    if (!e.alive || e.def.boss || m.def.taunt === 'none') return;
    const cur = e.aggroMinion;
    if (m.def.taunt === 'always' || !cur || !cur.alive) {
      e.aggroMinion = m;
      e.provoked = true;
    }
  }

  private valid(e: Enemy | null): e is Enemy {
    if (!e || !e.alive || e.ai === 'return' || e.def.aggro === 'none') return false;
    const p = this.ctx.player;
    return Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < MINION_SEARCH + 4;
  }

  private pickTarget(): Enemy | null {
    const p = this.ctx.player;
    const cur = this.ctx.targets.current;
    if (cur && this.valid(cur) && (!cur.def.boss || cur.engaged)) return cur;
    let best: Enemy | null = null;
    let bd = MINION_SEARCH;
    for (const e of this.ctx.enemies.enemies) {
      if (!e.alive || e.ai === 'return' || e.def.aggro === 'none') continue;
      if (e.def.boss && !e.engaged) continue;
      // 只打主人附近、而且已經開打或主動型的敵人（不去惹遠處閒晃的被動怪）
      const fighting = e.ai === 'chase' || e.ai === 'attack' || e.ai === 'boss' || e.provoked;
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (!fighting && d > 7) continue;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  private moveTo(m: Minion, tx: number, tz: number, speed: number, dt: number, stopAt: number) {
    const dx = tx - m.pos.x;
    const dz = tz - m.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopAt) return;
    const step = Math.min(d - stopAt, speed * dt);
    m.pos.x += (dx / d) * step;
    m.pos.z += (dz / d) * step;
    this.ctx.collision().resolve(m.pos, m.radius);
    this.face(m, dx, dz, dt, 10);
    m.moving = 1;
  }

  private face(m: Minion, dx: number, dz: number, dt: number, rate: number) {
    let d = Math.atan2(dx, dz) - m.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    m.facing += d * Math.min(1, dt * rate);
  }

  /** 召喚物彼此推開，也不會穿進敵人身體 */
  private separate() {
    const L = this.list.filter((m) => m.alive);
    const p = this.ctx.player;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      this.ctx.enemies.pushOut(a.pos, a.radius);
      // 不要疊在主人身上
      const px = a.pos.x - p.pos.x;
      const pz = a.pos.z - p.pos.z;
      const pmin = a.radius + p.radius + 0.15;
      const pd = Math.hypot(px, pz);
      if (pd < pmin) {
        const k = pd > 1e-4 ? pmin / pd : 0;
        a.pos.x = pd > 1e-4 ? p.pos.x + px * k : p.pos.x + pmin;
        a.pos.z = pd > 1e-4 ? p.pos.z + pz * k : p.pos.z;
      }
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const min = (a.radius + b.radius) * 0.95;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
    }
  }
}
