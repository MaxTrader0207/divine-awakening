import { bus } from '@/core/EventBus';
import type { BossSkillId } from '@/data/types';
import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { Effects } from './Effects';
import type { Telegraphs } from './Telegraphs';

/**
 * 首領技能控制
 * - 戰鬥中每隔 SKILL_CD 秒施放一個技能（輪流），施放期間 ai = 'boss'，小怪 AI 不動它。
 * - 血量低於 50% 進入第二階段：冷卻縮短、部分技能加強，並顯示「狂暴」。
 * - 所有傷害都經過紅色預警（Telegraphs），結算時玩家在範圍內才受傷。
 *
 *  巨鉗蟹王  claw_slam 前方扇形重擊       charge 直線衝撞
 *  潮汐古魔像 ground_slam 自身周圍震地     tide_rain 潮水落下（多個圓）
 *  熔心巨蛙  leap 跳到玩家位置砸地         lava_spit 一排熔岩彈
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

  /** 施放技能，回傳施法（預警）時間 */
  private cast(e: Enemy, id: BossSkillId, enraged: boolean): number {
    const { player: p, telegraphs: tg, effects: fx } = this.ctx;
    const dir = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    e.facing = dir;
    const hit = (power: number) => (inside: (x: number, z: number, pad?: number) => boolean) => {
      if (inside(p.pos.x, p.pos.z, p.radius)) this.ctx.hitPlayer(e, power);
      this.ctx.hitMinionsInside?.(e, power, inside);
    };
    switch (id) {
      case 'claw_slam': {
        const t = 1.0;
        tg.add({ kind: 'cone', x: e.pos.x, z: e.pos.z, dir, angle: (enraged ? 140 : 100) * (Math.PI / 180), r: 6 }, t, (inside) => {
          hit(1.8)(inside);
          fx.ring(e.pos.x + Math.sin(dir) * 3, e.pos.z + Math.cos(dir) * 3, 0.5, 3, 0xffb36b, 0.4);
        });
        return t;
      }
      case 'charge': {
        const t = 1.1;
        const length = 12;
        const sx = e.pos.x;
        const sz = e.pos.z;
        tg.add({ kind: 'rect', x: sx, z: sz, dir, length, width: 2.8 }, t, (inside) => {
          hit(2)(inside);
          // 衝到終點（分段碰撞，不會穿牆）
          const col = this.ctx.collision();
          for (let i = 0; i < 24; i++) {
            e.pos.x += (Math.sin(dir) * length) / 24;
            e.pos.z += (Math.cos(dir) * length) / 24;
            col.resolve(e.pos, e.radius);
          }
          fx.ring(e.pos.x, e.pos.z, 0.5, 3, 0xffb36b, 0.4);
        });
        return t;
      }
      case 'ground_slam': {
        const t = 1.2;
        const r = enraged ? 7 : 5.5;
        tg.add({ kind: 'circle', x: e.pos.x, z: e.pos.z, r }, t, (inside) => {
          hit(2)(inside);
          fx.ring(e.pos.x, e.pos.z, 1, r, 0x8fe3ff, 0.5);
          fx.disc(e.pos.x, e.pos.z, r, 0x4fb8ff, 0.4, 0.4);
        });
        return t;
      }
      case 'tide_rain': {
        const t = 1.4;
        const n = enraged ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? 0 : 2 + Math.random() * 5;
          const x = p.pos.x + Math.cos(a) * d;
          const z = p.pos.z + Math.sin(a) * d;
          tg.add({ kind: 'circle', x, z, r: 2.2 }, t + i * 0.12, (inside) => {
            hit(1.5)(inside);
            fx.disc(x, z, 2.2, 0x4fb8ff, 0.4, 0.6);
            fx.pillar(x, z, 0.8, 0x8fe3ff, 0.4);
          });
        }
        return t;
      }
      case 'leap': {
        // 跳到玩家位置：遠程職業躲不掉距離，所以預警給長一點、傷害低一點（v1.16）
        const t = 1.5;
        const tx = p.pos.x;
        const tz = p.pos.z;
        const r = 3.4;
        tg.add({ kind: 'circle', x: tx, z: tz, r }, t, (inside) => {
          e.pos.x = tx;
          e.pos.z = tz;
          this.ctx.collision().resolve(e.pos, e.radius);
          hit(1.8)(inside);
          fx.ring(tx, tz, 1, r * 1.2, 0xff8a3c, 0.5);
          fx.disc(tx, tz, r, 0xff5a1a, 0.4, 0.6);
        });
        return t;
      }
      case 'lava_spit': {
        const t = 0.9;
        const n = enraged ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const d = 2.5 + i * 2.2;
          const x = e.pos.x + Math.sin(dir) * d;
          const z = e.pos.z + Math.cos(dir) * d;
          tg.add({ kind: 'circle', x, z, r: 1.7 }, t + i * 0.15, (inside) => {
            hit(1.2)(inside);
            fx.disc(x, z, 1.7, 0xff5a1a, 0.35, 0.7);
          });
        }
        return t + n * 0.15;
      }
    }
  }
}
