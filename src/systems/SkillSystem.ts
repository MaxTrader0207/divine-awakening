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
import { damageArea, damageCone, damageEnemy, inCone } from './Damage';
import type { Enemy } from '@/entities/Enemy';
import type { MinionManager } from './MinionManager';
import { MINIONS, type MinionId } from '@/data/minions';

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
 * 狂戰士（資源是怒氣：打人 / 被打累積，見 data/classes.ts 的 RAGE）
 *  普攻  劈砍       前方扇形 2.9m / 126°
 *  Q     躍擊       跳到目標（8m 內），落地 r2.8 範圍傷害＋緩速，空中無敵
 *  W     嗜血       6 秒內造成傷害的 18% 回血
 *  E     斬殺       前方重擊，目標血量低於 35% 時傷害 ×2
 *  R     狂暴       8 秒攻擊力 +25%、普攻冷卻 ×0.6、怒氣獲得 ×1.5
 * 忍者（v1.88，數值在 NINJA）
 *  普攻  雙刃連斬   前方扇形 2.5m，四下一輪，第四下雙刃突刺 ×1.6
 *  Q     手裏劍     扇形 3 枚、貫穿
 *  W     瞬身斬     瞬移到目標背後斬擊（必定爆擊），短暫無敵；沒目標往前瞬身
 *  E     煙玉・爆遁 自身周圍 r4.2 兩段傷害＋緩速，自己 1 秒無敵
 *  R     影分身之術 8 秒：普攻與手裏劍被影子追擊一次（50%），爆擊率 +15%
 * 召喚師（召喚物 AI 在 MinionManager）
 *  普攻  冥河暗箭     追蹤單體（傷害較低，主力是召喚物）
 *  Q     斯巴達亡靈     召喚 2 隻近戰骷髏（上限 4，存在 20 秒）
 *  W     提瑞西阿斯亡靈   召喚 1 隻遠程骷髏（上限 2）
 *  E     埃阿斯亡靈   召喚 1 隻高血量坦克（上限 1，出場嘲諷周圍小怪）
 *  R     冥府骨爆   所有召喚物原地爆炸（範圍傷害），每隻回復主人 8% HP；沒有召喚物時不能用
 */
export const POTION_COOLDOWN = 2;
export const POTION_HEAL_RATIO = 0.35;
export const FROST_SLOW = { duration: 2.5, mul: 0.5 };
export const FLAME_DELAY = 0.35;
/** 守護減傷比例 */
export const GUARD_REDUCTION = 0.6;
/** 嗜血回血比例 */
export const BLOODLUST_LEECH = 0.18;
/** 狂暴：攻擊力倍率、普攻冷卻倍率、怒氣獲得倍率 */
export const BERSERK = { atk: 1.25, basicCd: 0.6, rage: 1.5 };
/** 斬殺：低血量門檻與倍率 */
export const EXECUTE = { threshold: 0.35, mul: 2 };
/** 劍俠：快劍第三下突刺（倍率、距離）；人劍合一（普攻冷卻、爆擊率、爆擊傷害、附帶劍氣倍率） */
/** 忍者（v1.88）：連斬第四下倍率；影分身（追擊倍率、追擊延遲、爆擊率加成）；煙玉（緩速秒數、無敵秒數）；瞬身斬（背後距離、無敵） */
export const NINJA = { finisherMul: 1.6, cloneMul: 0.5, cloneDelay: 0.12, cloneCrit: 0.15, smokeSlow: 3, smokeInvuln: 1, behind: 1.1, stepInvuln: 0.4 };
export const SWORD = { thrustMul: 1.5, thrustRange: 3.6, intentCd: 0.75, intentCrit: 0.2, intentCritDmg: 0.2, intentQi: 0.3 };

export interface SkillContext {
  player: Player;
  state: GameState;
  enemies: EnemyManager;
  targets: TargetSelector;
  projectiles: ProjectileSystem;
  effects: Effects;
  collision: () => CollisionWorld;
  moveInput: () => { x: number; z: number };
  /** 召喚物（召喚師） */
  minions?: MinionManager;
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

  /** 資源名稱（提示用） */
  private resName: string;
  /** 資源是怒氣（AUTO 不喝藍水補怒氣） */
  readonly usesRage: boolean;

  constructor(private ctx: SkillContext, heroClass: HeroClass = 'mage') {
    this.list = CLASSES[heroClass].skills;
    this.usesRage = CLASSES[heroClass].resource === 'rage';
    this.resName = this.usesRage ? '怒氣' : 'MP';
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
    // 守護（藍）/ 嗜血（紅）/ 狂暴（橘）：腳下持續出現光圈
    const p = this.ctx.player;
    if (p.guardT > 0 || p.bloodlustT > 0 || p.berserkT > 0 || p.swordIntentT > 0 || p.wildRoarT > 0 || p.ninjaCloneT > 0) {
      this.guardFx -= dt;
      if (this.guardFx <= 0) {
        this.guardFx = 0.35;
        const color = p.guardT > 0 ? 0x8fd4ff : p.berserkT > 0 ? 0xff6a2a : p.swordIntentT > 0 ? 0x8fe8ff : p.wildRoarT > 0 ? 0xff9a3c : p.ninjaCloneT > 0 ? 0x8a6aff : 0xff4a5a;
        this.ctx.effects.ring(p.pos.x, p.pos.z, 1.5, 1.1, color, 0.35);
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
      if (!silent) bus.emit('toast', { text: `${this.resName}不足` });
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
      case 'cleave':
        ok = this.castCleave(sk);
        break;
      case 'leap':
        ok = this.castLeap(sk);
        break;
      case 'bloodlust':
        ok = this.castBloodlust(sk);
        break;
      case 'execute':
        ok = this.castExecute(sk);
        break;
      case 'berserk':
        ok = this.castBerserk(sk);
        break;
      case 'shadow_bolt':
        ok = this.castShadowBolt(sk);
        break;
      case 'raise_skeleton':
      case 'raise_mage':
      case 'raise_guard':
        ok = this.castSummon(sk);
        break;
      case 'bone_burst':
        ok = this.castBoneBurst(sk);
        break;
      case 'sword_strike':
        ok = this.castSwordStrike(sk);
        break;
      case 'sword_qi':
        ok = this.castSwordQi(sk);
        break;
      case 'swift_step':
        ok = this.castSwiftStep(sk);
        break;
      case 'sword_rain':
        ok = this.castSwordRain(sk);
        break;
      case 'sword_intent':
        ok = this.castSwordIntent(sk);
        break;
      case 'beast_whip':
        ok = this.castBeastWhip(sk);
        break;
      case 'call_hounds':
      case 'call_eagle':
      case 'call_bear':
        ok = this.castSummon(sk);
        break;
      case 'wild_roar':
        ok = this.castWildRoar(sk);
        break;
      case 'kunai_slash':
        ok = this.castKunai(sk);
        break;
      case 'shuriken':
        ok = this.castShuriken(sk);
        break;
      case 'shadow_step':
        ok = this.castShadowStep(sk);
        break;
      case 'smoke_bomb':
        ok = this.castSmokeBomb(sk);
        break;
      case 'shadow_clone':
        ok = this.castShadowClone(sk);
        break;
    }
    if (!ok) return false;
    p.mp -= sk.mpCost;
    this.cd[slot] = sk.cooldown * (slot === 'basic' && p.berserkT > 0 ? BERSERK.basicCd : 1) * (slot === 'basic' && p.swordIntentT > 0 ? SWORD.intentCd : 1);
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

  /* ---------------- 狂戰士 ---------------- */

  /** 狂暴中攻擊力提升 */
  private atkStats() {
    const p = this.ctx.player;
    return p.berserkT > 0 ? { ...p.stats, atk: p.stats.atk * BERSERK.atk } : p.stats;
  }

  private castCleave(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.meleeAim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, p.berserkT > 0 ? 2.6 : 2);
    const facing = Math.atan2(dx, dz);
    this.ctx.effects.arc(p.pos.x, p.pos.z, facing, 0.9, sk.range, p.berserkT > 0 ? 0xff7a3a : sk.color, 0.22, 1.0 + p.groundY);
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, sk.range, sk.arc ?? 2.2, this.atkStats(), sk.power);
    return true;
  }

  private castLeap(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 2.8;
    const { target, dx, dz } = this.aim(sk.range);
    // 落點：目標腳邊（不疊在目標身上），沒有目標就往前 6m
    let tx = p.pos.x + dx * 6;
    let tz = p.pos.z + dz * 6;
    if (target) {
      const d = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
      const stop = Math.max(0, d - target.radius - 0.8);
      tx = p.pos.x + dx * stop;
      tz = p.pos.z + dz * stop;
    }
    p.cast(dx, dz);
    p.act(sk.anim, 1.9);
    p.invulnerable = Math.max(p.invulnerable, 0.5);
    const fx = this.ctx.effects;
    fx.ring(tx, tz, r * 1.4, r, sk.color, 0.45);
    const sx = p.pos.x;
    const sz = p.pos.z;
    const steps = 8;
    const col = this.ctx.collision();
    for (let i = 1; i <= steps; i++) {
      this.delayed.push({
        t: (0.42 * i) / steps,
        run: () => {
          p.pos.x = sx + ((tx - sx) * i) / steps;
          p.pos.z = sz + ((tz - sz) * i) / steps;
          col.resolve(p.pos, p.radius);
          if (i < steps) return;
          // 落地
          fx.disc(p.pos.x, p.pos.z, r, 0xff6a2a, 0.4, 0.7);
          fx.ring(p.pos.x, p.pos.z, 0.5, r * 1.3, 0xffc46b, 0.4);
          fx.pillar(p.pos.x, p.pos.z, 0.6, sk.color, 0.35);
          bus.emit('skill:cast', { slot: 'impact', id: 'leap_land' });
          damageArea(this.ctx.enemies.enemies, p.pos.x, p.pos.z, r, this.atkStats(), sk.power, (e) => e.applySlow(1.5, 0.5));
        },
      });
    }
    return true;
  }

  private castBloodlust(sk: SkillDef): boolean {
    const p = this.ctx.player;
    p.bloodlustT = sk.duration ?? 6;
    p.act(sk.anim, 1.8);
    this.ctx.effects.pillar(p.pos.x, p.pos.z, 0.8, sk.color, 0.5);
    this.ctx.effects.ring(p.pos.x, p.pos.z, 0.4, 2.4, sk.color, 0.45);
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: '嗜血', kind: 'info' });
    return true;
  }

  private castExecute(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.meleeAim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, 1.7);
    const fx = this.ctx.effects;
    const facing = Math.atan2(dx, dz);
    fx.arc(p.pos.x, p.pos.z, facing, 0.5, sk.range, sk.color, 0.3, 1.1 + p.groundY);
    const stats = this.atkStats();
    let n = 0;
    for (const e of this.ctx.enemies.enemies) {
      if (!e.alive || !inCone(e, p.pos.x, p.pos.z, dx, dz, sk.range, sk.arc ?? 1.4)) continue;
      const low = e.hp / e.maxHp < EXECUTE.threshold;
      damageEnemy(e, stats, sk.power * (low ? EXECUTE.mul : 1));
      fx.pillar(e.pos.x, e.pos.z, low ? 0.7 : 0.4, low ? 0xff2a1a : sk.color, 0.35);
      n++;
    }
    if (!n) fx.disc(p.pos.x + dx * 2, p.pos.z + dz * 2, 1.2, sk.color, 0.3, 0.4);
    return true;
  }

  private castBerserk(sk: SkillDef): boolean {
    const p = this.ctx.player;
    p.berserkT = sk.duration ?? 8;
    p.act(sk.anim, 1.8);
    const fx = this.ctx.effects;
    fx.pillar(p.pos.x, p.pos.z, 1, sk.color, 0.6);
    fx.ring(p.pos.x, p.pos.z, 0.5, 3.5, 0xffa24a, 0.5);
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: '狂暴！', kind: 'info' });
    return true;
  }

  /* ---------------- 召喚師 ---------------- */

  private castShadowBolt(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { target, dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    return this.ctx.projectiles.fire({ from: this.fireFrom(dx, dz), dirX: dx, dirZ: dz, target, attacker: p.stats, power: sk.power, range: sk.range, color: sk.color, speed: 17, size: 0.9 });
  }

  private castSummon(sk: SkillDef): boolean {
    const mm = this.ctx.minions;
    const id = sk.summon as MinionId | undefined;
    if (!mm || !id || !MINIONS[id]) return false;
    const p = this.ctx.player;
    p.act(sk.anim, 1.6);
    this.ctx.effects.ring(p.pos.x, p.pos.z, 0.3, 2.2, sk.color, 0.45);
    mm.summon(id, sk.count ?? 1);
    return true;
  }

  private castBoneBurst(sk: SkillDef): boolean {
    const mm = this.ctx.minions;
    if (!mm || mm.count() === 0) {
      bus.emit('toast', { text: '沒有可以引爆的召喚物' });
      return false;
    }
    const p = this.ctx.player;
    p.act(sk.anim, 2);
    const n = mm.detonateAll();
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: `冥府骨爆 ×${n}`, kind: 'info' });
    bus.emit('player:changed');
    return true;
  }

  /* ---------------- 劍俠 ---------------- */

  /** 快劍連段（0、1 = 斜劈 / 橫劈，2 = 突刺）；停手 1.2 秒就重新數 */
  private swordCombo = 0;
  private swordComboT = 0;

  /** 人劍合一中：爆擊率、爆擊傷害提高 */
  private swordStats() {
    const p = this.ctx.player;
    return p.swordIntentT > 0 ? { ...p.stats, critRate: p.stats.critRate + SWORD.intentCrit, critDmg: p.stats.critDmg + SWORD.intentCritDmg } : p.stats;
  }

  /** 一道會貫穿的劍氣（劍氣斬、人劍合一的普攻附帶） */
  private fireQi(dx: number, dz: number, power: number, range: number, size: number) {
    return this.ctx.projectiles.fire({ from: this.fireFrom(dx, dz), dirX: dx, dirZ: dz, target: null, attacker: this.swordStats(), power, range, color: 0x8fe8ff, speed: 26, size, arrow: false, pierce: true });
  }

  private castSwordStrike(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const now = performance.now() / 1000;
    if (now - this.swordComboT > 1.2) this.swordCombo = 0;
    this.swordComboT = now;
    const step = this.swordCombo % 3;
    this.swordCombo++;
    const thrust = step === 2;
    const range = thrust ? SWORD.thrustRange : sk.range;
    const { dx, dz } = this.meleeAim(range);
    p.cast(dx, dz);
    p.act(thrust ? '1H_Melee_Attack_Stab' : step === 0 ? '1H_Melee_Attack_Slice_Diagonal' : '1H_Melee_Attack_Slice_Horizontal', p.swordIntentT > 0 ? 2.8 : 2.3);
    const facing = Math.atan2(dx, dz);
    const fx = this.ctx.effects;
    if (thrust) {
      fx.arc(p.pos.x, p.pos.z, facing, 0.25, range, 0xffffff, 0.2, 1.0 + p.groundY);
      fx.ring(p.pos.x + dx * range * 0.8, p.pos.z + dz * range * 0.8, 0.2, 1, sk.color, 0.25);
    } else fx.arc(p.pos.x, p.pos.z, facing + (step === 0 ? 0.25 : -0.25), 0.85, range, sk.color, 0.18, 1.0 + p.groundY);
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, range, thrust ? 0.9 : sk.arc ?? 1.9, this.swordStats(), sk.power * (thrust ? SWORD.thrustMul : 1));
    // 人劍合一：每一劍都送出一道小劍氣
    if (p.swordIntentT > 0) this.fireQi(dx, dz, sk.power * SWORD.intentQi, 8, 1.1);
    return true;
  }

  private castSwordQi(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, 2.2);
    const fx = this.ctx.effects;
    fx.arc(p.pos.x, p.pos.z, Math.atan2(dx, dz), 1.1, 2.4, sk.color, 0.25, 1.1 + p.groundY);
    return this.fireQi(dx, dz, sk.power, sk.range, 2);
  }

  private castSwiftStep(sk: SkillDef): boolean {
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
    p.dodge();
    // 殘影：起點、中間各留一道光
    fx.pillar(p.pos.x, p.pos.z, 0.5, sk.color, 0.35);
    const col = this.ctx.collision();
    const hit = new Set<Enemy>();
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      p.pos.x += (dx * sk.range) / steps;
      p.pos.z += (dz * sk.range) / steps;
      col.resolve(p.pos, p.radius);
      for (const e of this.ctx.enemies.enemies) {
        if (!e.alive || hit.has(e)) continue;
        if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < e.radius + 1.3) hit.add(e);
      }
      if (i % 6 === 2) fx.ring(p.pos.x, p.pos.z, 0.3, 0.9, sk.color, 0.25);
    }
    const stats = this.swordStats();
    for (const e of hit) {
      damageEnemy(e, stats, sk.power);
      e.applySlow(2, 0.5);
      fx.arc(e.pos.x, e.pos.z, Math.atan2(dx, dz) + Math.PI / 2, 0.5, 1.6, 0xffffff, 0.2, 1 + e.groundY);
    }
    p.facing = Math.atan2(dx, dz);
    p.invulnerable = Math.max(p.invulnerable, 0.45);
    fx.pillar(p.pos.x, p.pos.z, 0.5, sk.color, 0.35);
    return true;
  }

  private castSwordRain(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 3.6;
    const { target, dx, dz } = this.aim(sk.range);
    const x = target ? target.pos.x : p.pos.x + dx * 5;
    const z = target ? target.pos.z : p.pos.z + dz * 5;
    p.cast(dx, dz);
    p.act(sk.anim, 1.6);
    const fx = this.ctx.effects;
    fx.ring(x, z, r * 1.3, r, sk.color, 0.4);
    const stats = this.swordStats();
    const waves = sk.waves ?? 4;
    for (let w = 0; w < waves; w++) {
      this.delayed.push({
        t: 0.3 + w * 0.28,
        run: () => {
          fx.disc(x, z, r, 0x4ab8e8, 0.28, 0.35);
          // 從天而降的飛劍（細長光柱）
          for (let k = 0; k < 5; k++) {
            const a = Math.random() * Math.PI * 2;
            const d = Math.random() * r * 0.9;
            fx.pillar(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.08, 0xe8fbff, 0.22);
          }
          damageArea(this.ctx.enemies.enemies, x, z, r, stats, sk.power);
        },
      });
    }
    return true;
  }

  private castSwordIntent(sk: SkillDef): boolean {
    const p = this.ctx.player;
    p.swordIntentT = sk.duration ?? 8;
    p.act(sk.anim, 1.8);
    const fx = this.ctx.effects;
    fx.pillar(p.pos.x, p.pos.z, 0.9, 0x8fe8ff, 0.6);
    fx.ring(p.pos.x, p.pos.z, 0.5, 3.5, sk.color, 0.5);
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: '人劍合一', kind: 'info' });
    return true;
  }

  /* ---------------- 忍者（v1.88） ---------------- */

  private kunaiCombo = 0;
  private kunaiComboT = 0;

  /** 影分身中：爆擊率提高 */
  private ninjaStats() {
    const p = this.ctx.player;
    return p.ninjaCloneT > 0 ? { ...p.stats, critRate: p.stats.critRate + NINJA.cloneCrit } : p.stats;
  }

  /** 影分身在旁邊現身（左右各一個紫色殘影） */
  private cloneFx(dx: number, dz: number) {
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    for (const side of [-1, 1]) fx.pillar(p.pos.x + dz * side * 1.1 - dx * 0.4, p.pos.z - dx * side * 1.1 - dz * 0.4, 0.35, 0x8a6aff, 0.25);
  }

  private castKunai(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const now = performance.now() / 1000;
    if (now - this.kunaiComboT > 1.1) this.kunaiCombo = 0;
    this.kunaiComboT = now;
    const step = this.kunaiCombo % 4;
    this.kunaiCombo++;
    const finisher = step === 3;
    const range = finisher ? sk.range + 0.6 : sk.range;
    const { dx, dz } = this.meleeAim(range);
    p.cast(dx, dz);
    p.act(finisher ? 'Dualwield_Melee_Attack_Stab' : step % 2 === 0 ? 'Dualwield_Melee_Attack_Slice' : 'Dualwield_Melee_Attack_Chop', p.ninjaCloneT > 0 ? 3 : 2.6);
    const facing = Math.atan2(dx, dz);
    const fx = this.ctx.effects;
    fx.arc(p.pos.x, p.pos.z, facing + (step % 2 === 0 ? 0.3 : -0.3), finisher ? 0.35 : 0.8, range, sk.color, 0.16, 1.0 + p.groundY);
    if (finisher) fx.arc(p.pos.x, p.pos.z, facing, 0.25, range, 0xffffff, 0.2, 1.0 + p.groundY);
    const power = sk.power * (finisher ? NINJA.finisherMul : 1);
    const arc = finisher ? 1.1 : sk.arc ?? 1.9;
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, range, arc, this.ninjaStats(), power);
    // 影分身：影子緊接著再斬一次
    if (p.ninjaCloneT > 0) {
      this.delayed.push({
        t: NINJA.cloneDelay,
        run: () => {
          if (!p.alive) return;
          fx.arc(p.pos.x, p.pos.z, facing - (step % 2 === 0 ? 0.3 : -0.3), 0.8, range, 0x8a6aff, 0.16, 1.0 + p.groundY);
          damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, range, arc, this.ninjaStats(), power * NINJA.cloneMul);
        },
      });
    }
    return true;
  }

  private throwStars(dx: number, dz: number, sk: SkillDef, power: number, color: number) {
    const n = sk.count ?? 3;
    const spread = 0.42;
    const base = Math.atan2(dx, dz);
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / Math.max(1, n - 1);
      const ax = Math.sin(a);
      const az = Math.cos(a);
      this.ctx.projectiles.fire({ from: this.fireFrom(ax, az), dirX: ax, dirZ: az, target: null, attacker: this.ninjaStats(), power, range: sk.range, color, speed: 26, size: 0.8, pierce: true });
    }
  }

  private castShuriken(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { dx, dz } = this.aim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, 2.4);
    this.throwStars(dx, dz, sk, sk.power, sk.color);
    if (p.ninjaCloneT > 0) {
      this.cloneFx(dx, dz);
      this.delayed.push({ t: NINJA.cloneDelay, run: () => p.alive && this.throwStars(dx, dz, sk, sk.power * NINJA.cloneMul, 0x8a6aff) });
    }
    return true;
  }

  private castShadowStep(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    const target = this.ctx.targets.acquire(p.pos.x, p.pos.z, sk.range);
    fx.pillar(p.pos.x, p.pos.z, 0.5, sk.color, 0.3);
    fx.disc(p.pos.x, p.pos.z, 1.2, 0x3a2a5a, 0.4, 0.4);
    const col = this.ctx.collision();
    if (target) {
      // 繞到目標背後（從玩家看過去的另一側）
      let dx = target.pos.x - p.pos.x;
      let dz = target.pos.z - p.pos.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l;
      dz /= l;
      const back = target.radius + NINJA.behind;
      p.pos.x = target.pos.x + dx * back;
      p.pos.z = target.pos.z + dz * back;
      col.resolve(p.pos, p.radius);
      // 轉身面向目標的背
      const fx2 = target.pos.x - p.pos.x;
      const fz2 = target.pos.z - p.pos.z;
      p.facing = Math.atan2(fx2, fz2);
      p.act(sk.anim, 2.6);
      // 背刺：必定爆擊
      damageEnemy(target, { ...this.ninjaStats(), critRate: 1 }, sk.power);
      fx.arc(target.pos.x, target.pos.z, p.facing + Math.PI, 0.6, 1.8, 0xffffff, 0.22, 1 + target.groundY);
      fx.ring(target.pos.x, target.pos.z, 0.3, 1.4, sk.color, 0.3);
    } else {
      const mv = this.ctx.moveInput();
      const ml = Math.hypot(mv.x, mv.z);
      const dx = ml > 0.1 ? mv.x / ml : Math.sin(p.facing);
      const dz = ml > 0.1 ? mv.z / ml : Math.cos(p.facing);
      p.dodge();
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        p.pos.x += (dx * 6) / steps;
        p.pos.z += (dz * 6) / steps;
        col.resolve(p.pos, p.radius);
      }
      p.facing = Math.atan2(dx, dz);
    }
    p.invulnerable = Math.max(p.invulnerable, NINJA.stepInvuln);
    fx.pillar(p.pos.x, p.pos.z, 0.5, sk.color, 0.3);
    return true;
  }

  private castSmokeBomb(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const r = sk.radius ?? 4.2;
    p.act(sk.anim, 1.8);
    const fx = this.ctx.effects;
    const x = p.pos.x;
    const z = p.pos.z;
    fx.disc(x, z, r, 0x6a6080, 0.55, 1.2);
    fx.ring(x, z, 0.4, r * 1.1, sk.color, 0.5);
    p.invulnerable = Math.max(p.invulnerable, NINJA.smokeInvuln);
    const stats = this.ninjaStats();
    const waves = sk.waves ?? 2;
    for (let w = 0; w < waves; w++) {
      this.delayed.push({
        t: 0.05 + w * 0.45,
        run: () => {
          fx.disc(x, z, r * (0.8 + w * 0.15), 0x8a80a8, 0.35, 0.8);
          damageArea(this.ctx.enemies.enemies, x, z, r, stats, sk.power, (e) => e.applySlow(NINJA.smokeSlow, 0.5));
        },
      });
    }
    return true;
  }

  private castShadowClone(sk: SkillDef): boolean {
    const p = this.ctx.player;
    p.ninjaCloneT = sk.duration ?? 8;
    p.act(sk.anim, 1.8);
    const fx = this.ctx.effects;
    this.cloneFx(Math.sin(p.facing), Math.cos(p.facing));
    fx.ring(p.pos.x, p.pos.z, 0.5, 3.2, sk.color, 0.5);
    fx.disc(p.pos.x, p.pos.z, 2.2, 0x3a2a5a, 0.4, 0.6);
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: '影分身之術', kind: 'info' });
    return true;
  }

  /* ---------------- 訓獸師 ---------------- */

  /** 馴獸鞭：細長的前方扇形（鞭梢打得比劍遠），附近的野獸會跟著攻擊同一個目標 */
  private castBeastWhip(sk: SkillDef): boolean {
    const p = this.ctx.player;
    const { target, dx, dz } = this.meleeAim(sk.range);
    p.cast(dx, dz);
    p.act(sk.anim, p.wildRoarT > 0 ? 2.4 : 2);
    const facing = Math.atan2(dx, dz);
    const fx = this.ctx.effects;
    fx.arc(p.pos.x, p.pos.z, facing, 0.55, sk.range, sk.color, 0.2, 1.0 + p.groundY);
    // 鞭梢「啪」的一聲：在最遠處閃一下
    fx.ring(p.pos.x + dx * sk.range * 0.85, p.pos.z + dz * sk.range * 0.85, 0.1, 0.7, 0xfff1c4, 0.18);
    damageCone(this.ctx.enemies.enemies, p.pos.x, p.pos.z, dx, dz, sk.range, sk.arc ?? 1.3, p.stats, sk.power);
    // 指揮：身邊沒事做的野獸改咬這個目標
    if (target && this.ctx.minions) for (const m of this.ctx.minions.list) if (m.alive && m.def.beast && !m.target) m.target = target;
    return true;
  }

  private castWildRoar(sk: SkillDef): boolean {
    const mm = this.ctx.minions;
    if (!mm || !mm.list.some((m) => m.alive && m.def.beast)) {
      bus.emit('toast', { text: '身邊沒有野獸，先喚出獵犬、神鷹或巨熊' });
      return false;
    }
    this.ctx.player.act(sk.anim, 1.8);
    this.wildRoar(sk.duration ?? 8);
    return true;
  }

  /** 野性咆哮（技能與道具「牧神潘之笛」共用）：回傳鼓舞到的野獸數 */
  wildRoar(duration: number): number {
    const p = this.ctx.player;
    const fx = this.ctx.effects;
    p.wildRoarT = Math.max(p.wildRoarT, duration);
    fx.pillar(p.pos.x, p.pos.z, 0.9, 0xff9a3c, 0.6);
    fx.ring(p.pos.x, p.pos.z, 0.5, 6, 0xff9a3c, 0.55);
    fx.ring(p.pos.x, p.pos.z, 0.5, 3, 0xffd36b, 0.4);
    const n = this.ctx.minions?.roarAll(duration) ?? 0;
    bus.emit('float:text', { x: p.pos.x, y: 2.6 + p.groundY, z: p.pos.z, text: n ? `野性咆哮 ×${n}` : '野性咆哮', kind: 'info' });
    bus.emit('camera:shake', { power: 0.3 });
    return n;
  }
}
