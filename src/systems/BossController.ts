import { bus } from '@/core/EventBus';
import { BOSS_SKILLS, type BossSkillDef, type BossSkillId } from '@/data/bossSkills';
import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { Effects } from './Effects';
import type { Telegraphs } from './Telegraphs';

/**
 * 首領技能控制（招式資料在 data/bossSkills.ts）
 * - 戰鬥中每隔 SKILL_CD 秒施放一個招式（依 EnemyDef.bossSkills 輪流），施放期間 ai = 'boss'，小怪 AI 不動它。
 * - 血量低於 50% 進入第二階段：冷卻縮短、招式用 *Enraged 參數加強，並顯示「狂暴」。
 * - 所有傷害都經過紅色預警（Telegraphs），結算時玩家在範圍內才受傷。
 */
export const SKILL_CD = 5.5;
export const PHASE2_CD_MUL = 0.65;

interface BossState {
  cd: number;
  next: number;
  enraged: boolean;
  /** 技能結束後回到追擊的倒數 */
  castT: number;
}

export interface BossContext {
  player: Player;
  telegraphs: Telegraphs;
  effects: Effects;
  collision: () => CollisionWorld;
  hitPlayer: (e: Enemy, power: number) => void;
  /** 預警範圍內的召喚物也會受傷 */
  hitMinionsInside?: (e: Enemy, power: number, inside: (x: number, z: number, pad?: number) => boolean) => void;
}

export class BossController {
  private states = new WeakMap<Enemy, BossState>();

  constructor(private ctx: BossContext) {}

  update(dt: number, bosses: Enemy[]) {
    for (const e of bosses) {
      if (!e.def.boss || !e.def.bossSkills?.length) continue;
      let st = this.states.get(e);
      if (!st || !e.alive) {
        if (!e.alive) this.states.delete(e);
        else this.states.set(e, (st = { cd: 3, next: 0, enraged: false, castT: 0 }));
        if (!e.alive) continue;
      }
      if (!st) continue;
      // 脫戰 / 回家：重置
      if (e.ai === 'idle' || e.ai === 'wander' || e.ai === 'return') {
        st.cd = 3;
        st.enraged = false;
        st.castT = 0;
        continue;
      }
      if (!st.enraged && e.hp < e.def.stats.maxHp * 0.5) {
        st.enraged = true;
        bus.emit('banner', { text: `${e.def.name} 狂暴了！` });
        this.ctx.effects.ring(e.pos.x, e.pos.z, 1, 6, 0xff3a2a, 0.8);
      }
      if (e.ai === 'boss') {
        st.castT -= dt;
        if (st.castT <= 0) {
          e.ai = 'chase';
          e.windup = 0;
        }
        continue;
      }
      st.cd -= dt;
      if (st.cd > 0 || e.ai === 'attack' || !this.ctx.player.alive) continue;
      const skills = e.def.bossSkills;
      const id = skills[st.next % skills.length];
      st.next++;
      const castTime = this.cast(e, id, st.enraged);
      bus.emit('boss:cast', { skill: id });
      e.ai = 'boss';
      e.windup = castTime; // 施法中身體泛紅
      st.castT = castTime + 0.35;
      st.cd = SKILL_CD * (st.enraged ? PHASE2_CD_MUL : 1) + castTime;
    }
  }

  /**
   * 施放招式，回傳施法（預警）時間。招式參數在 data/bossSkills.ts，這裡只依 pattern 執行。
   * 新的 pattern：在這個 switch 加一個 case（並在 BossSkillDef 加對應型別）。
   */
  private cast(e: Enemy, id: BossSkillId, enraged: boolean): number {
    const { player: p, telegraphs: tg, effects: fx } = this.ctx;
    const sk: BossSkillDef = BOSS_SKILLS[id];
    const dir = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    e.facing = dir;
    const hit = (inside: (x: number, z: number, pad?: number) => boolean) => {
      if (inside(p.pos.x, p.pos.z, p.radius)) this.ctx.hitPlayer(e, sk.power);
      this.ctx.hitMinionsInside?.(e, sk.power, inside);
    };
    const t = sk.windup;
    switch (sk.pattern) {
      case 'cone': {
        const angle = (enraged ? (sk.angleEnraged ?? sk.angle) : sk.angle) * (Math.PI / 180);
        tg.add({ kind: 'cone', x: e.pos.x, z: e.pos.z, dir, angle, r: sk.range }, t, (inside) => {
          hit(inside);
          fx.ring(e.pos.x + Math.sin(dir) * sk.range * 0.5, e.pos.z + Math.cos(dir) * sk.range * 0.5, 0.5, 3, sk.color, 0.4);
        });
        return t;
      }
      case 'dash': {
        const sx = e.pos.x;
        const sz = e.pos.z;
        tg.add({ kind: 'rect', x: sx, z: sz, dir, length: sk.length, width: sk.width }, t, (inside) => {
          hit(inside);
          // 衝到終點（分段碰撞，不會穿牆）
          const col = this.ctx.collision();
          for (let i = 0; i < 24; i++) {
            e.pos.x += (Math.sin(dir) * sk.length) / 24;
            e.pos.z += (Math.cos(dir) * sk.length) / 24;
            col.resolve(e.pos, e.radius);
          }
          fx.ring(e.pos.x, e.pos.z, 0.5, 3, sk.color, 0.4);
        });
        return t;
      }
      case 'nova': {
        const r = enraged ? (sk.radiusEnraged ?? sk.radius) : sk.radius;
        tg.add({ kind: 'circle', x: e.pos.x, z: e.pos.z, r }, t, (inside) => {
          hit(inside);
          fx.ring(e.pos.x, e.pos.z, 1, r, sk.color, 0.5);
          fx.disc(e.pos.x, e.pos.z, r, sk.discColor ?? sk.color, 0.4, 0.4);
        });
        return t;
      }
      case 'rain': {
        const n = enraged ? (sk.countEnraged ?? sk.count) : sk.count;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? 0 : 2 + Math.random() * sk.spread;
          const x = p.pos.x + Math.cos(a) * d;
          const z = p.pos.z + Math.sin(a) * d;
          tg.add({ kind: 'circle', x, z, r: sk.radius }, t + i * sk.stagger, (inside) => {
            hit(inside);
            fx.disc(x, z, sk.radius, sk.color, 0.4, 0.6);
            fx.pillar(x, z, 0.8, sk.pillarColor ?? sk.color, 0.4);
          });
        }
        return t;
      }
      case 'leap': {
        const tx = p.pos.x;
        const tz = p.pos.z;
        tg.add({ kind: 'circle', x: tx, z: tz, r: sk.radius }, t, (inside) => {
          e.pos.x = tx;
          e.pos.z = tz;
          this.ctx.collision().resolve(e.pos, e.radius);
          hit(inside);
          fx.ring(tx, tz, 1, sk.radius * 1.2, sk.color, 0.5);
          fx.disc(tx, tz, sk.radius, sk.discColor ?? sk.color, 0.4, 0.6);
        });
        return t;
      }
      case 'line': {
        const n = enraged ? (sk.countEnraged ?? sk.count) : sk.count;
        for (let i = 0; i < n; i++) {
          const d = sk.start + i * sk.spacing;
          const x = e.pos.x + Math.sin(dir) * d;
          const z = e.pos.z + Math.cos(dir) * d;
          tg.add({ kind: 'circle', x, z, r: sk.radius }, t + i * sk.stagger, (inside) => {
            hit(inside);
            fx.disc(x, z, sk.radius, sk.color, 0.35, 0.7);
          });
        }
        return t + n * sk.stagger;
      }
      case 'spokes': {
        const n = enraged ? (sk.countEnraged ?? sk.count) : sk.count;
        const angle = sk.angle * (Math.PI / 180);
        for (let i = 0; i < n; i++) {
          const a = dir + (i / n) * Math.PI * 2;
          tg.add({ kind: 'cone', x: e.pos.x, z: e.pos.z, dir: a, angle, r: sk.range }, t, (inside) => {
            hit(inside);
            fx.ring(e.pos.x + Math.sin(a) * sk.range * 0.6, e.pos.z + Math.cos(a) * sk.range * 0.6, 0.4, 2, sk.color, 0.4);
          });
        }
        return t;
      }
      case 'multiLine': {
        const angles = enraged ? (sk.anglesEnraged ?? sk.angles) : sk.angles;
        for (const deg of angles) {
          const a = dir + deg * (Math.PI / 180);
          for (let i = 0; i < sk.count; i++) {
            const d = sk.start + i * sk.spacing;
            const x = e.pos.x + Math.sin(a) * d;
            const z = e.pos.z + Math.cos(a) * d;
            tg.add({ kind: 'circle', x, z, r: sk.radius }, t + i * sk.stagger, (inside) => {
              hit(inside);
              fx.disc(x, z, sk.radius, sk.color, 0.35, 0.7);
            });
          }
        }
        return t + sk.count * sk.stagger;
      }
    }
  }
}
