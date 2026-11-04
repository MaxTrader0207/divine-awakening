import { bus } from '@/core/EventBus';
import { BOSS_SKILLS, type BossSkillDef, type BossSkillId } from '@/data/bossSkills';
import type { Enemy } from '@/entities/Enemy';
import type { Player } from '@/entities/Player';
import type { CollisionWorld } from '@/world/Collision';
import type { Effects } from './Effects';
import type { Telegraphs } from './Telegraphs';
import { LEASH } from './EnemyAI';

/**
 * 首領技能控制（招式資料在 data/bossSkills.ts）
 * - 開戰先怒吼（ROAR_TIME 秒，畫面震動），之後每隔 SKILL_CD 秒施放一個招式（依 EnemyDef.bossSkills 輪流），
 *   施放期間 ai = 'boss'，小怪 AI 不動它。
 * - 玩家拉開距離（風箏）超過 FAR_TIME 秒：提早放招，而且優先挑能追上 / 打得到遠處的招式（飛撲、衝撞、落雨、一排）。
 * - 血量低於 50% 進入第二階段：冷卻縮短、招式用 *Enraged 參數加強，並顯示「狂暴」。
 * - 所有傷害都經過紅色預警（Telegraphs），結算時玩家在範圍內才受傷；結算那一下首領會撲出去（Enemy.strike），重擊會震動鏡頭。
 * - 衝撞、飛撲是幾幀內真的移動過去（飛撲有拋物線），不是瞬間移動。
 */
export const SKILL_CD = 5.5;
export const PHASE2_CD_MUL = 0.65;
/** 開戰怒吼長度（秒） */
export const ROAR_TIME = 0.9;
/** 玩家離開攻擊距離多久（秒）就提早放招 */
export const FAR_TIME = 1.6;
/** 衝撞移動時間、飛撲滯空時間（秒） */
const DASH_TIME = 0.26;
const LEAP_AIR = 0.6;
/** 能打到遠處的招式（風箏時優先） */
const REACHING = new Set<BossSkillDef['pattern']>(['leap', 'dash', 'rain', 'line', 'multiLine']);

interface Motion {
  kind: 'dash' | 'leap';
  /** 已經過時間（負數 = 還沒開始） */
  t: number;
  dur: number;
  sx: number;
  sz: number;
  /** 衝撞：方向與長度；飛撲：落點 */
  dir: number;
  len: number;
  tx: number;
  tz: number;
  height: number;
}

interface BossState {
  cd: number;
  next: number;
  enraged: boolean;
  /** 技能結束後回到追擊的倒數 */
  castT: number;
  /** 這次開戰吼過了 */
  roared: boolean;
  /** 玩家在攻擊距離外的累計秒數 */
  farT: number;
  /** 衝撞 / 飛撲的移動 */
  motion: Motion | null;
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

const fresh = (): BossState => ({ cd: 3, next: 0, enraged: false, castT: 0, roared: false, farT: 0, motion: null });

export class BossController {
  private states = new WeakMap<Enemy, BossState>();

  constructor(private ctx: BossContext) {}

  update(dt: number, bosses: Enemy[]) {
    for (const e of bosses) {
      if (!e.def.boss || !e.def.bossSkills?.length) continue;
      let st = this.states.get(e);
      if (!st || !e.alive) {
        if (!e.alive) this.states.delete(e);
        else this.states.set(e, (st = fresh()));
        if (!e.alive) continue;
      }
      if (!st) continue;
      // 脫戰 / 回家：重置
      if (e.ai === 'idle' || e.ai === 'wander' || e.ai === 'return') {
        Object.assign(st, fresh(), { next: st.next });
        e.airY = 0;
        continue;
      }
      this.move(e, st, dt);
      // 開戰怒吼：停下來仰身吼一聲（震動鏡頭），讓玩家知道「首領要來了」
      if (!st.roared && e.ai === 'chase') {
        st.roared = true;
        e.ai = 'boss';
        e.windup = ROAR_TIME * 0.8;
        e.facing = Math.atan2(this.ctx.player.pos.x - e.pos.x, this.ctx.player.pos.z - e.pos.z);
        st.castT = ROAR_TIME;
        st.cd = Math.min(st.cd, 1.8);
        bus.emit('boss:roar', { name: e.def.name });
        this.ctx.effects.ring(e.pos.x, e.pos.z, 1, 7, 0xffd36b, 0.7);
        continue;
      }
      if (!st.enraged && e.hp < e.def.stats.maxHp * 0.5) {
        st.enraged = true;
        bus.emit('banner', { text: `${e.def.name} 狂暴了！` });
        this.ctx.effects.ring(e.pos.x, e.pos.z, 1, 6, 0xff3a2a, 0.8);
      }
      if (e.ai === 'boss') {
        st.castT -= dt;
        if (st.castT <= 0 && !st.motion) {
          e.ai = 'chase';
          e.windup = 0;
        }
        continue;
      }
      // 風箏偵測：玩家一直在攻擊距離外 → 提早放招
      const p = this.ctx.player;
      const far = this.isFar(e);
      st.farT = far ? st.farT + dt : Math.max(0, st.farT - dt * 2);
      if (st.farT > FAR_TIME && st.cd > 0.5) st.cd = 0.5;
      st.cd -= dt;
      if (st.cd > 0 || e.ai === 'attack' || !p.alive) continue;
      const id = this.pick(e, st, far);
      const castTime = this.cast(e, st, id, st.enraged);
      bus.emit('boss:cast', { skill: id });
      e.ai = 'boss';
      e.windup = BOSS_SKILLS[id].windup; // 施法中身體泛紅、蓄力；預警結算時放開（Enemy.strike）
      st.castT = castTime + 0.35;
      st.farT = 0;
      st.cd = SKILL_CD * (st.enraged ? PHASE2_CD_MUL : 1) + castTime;
    }
  }

  /** 玩家在普攻距離外（再多 2.5 公尺） */
  private isFar(e: Enemy) {
    const p = this.ctx.player;
    const reach = (e.def.attack?.range ?? 1.2) + p.radius + e.radius * 0.5;
    return Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) > reach + 2.5;
  }

  /** 挑招式：平常依序輪流；玩家在遠處時往後找第一個「打得到遠處」的招式 */
  private pick(e: Enemy, st: BossState, far: boolean): BossSkillId {
    const skills = e.def.bossSkills!;
    let k = 0;
    if (far) {
      for (let i = 0; i < skills.length; i++) {
        if (REACHING.has(BOSS_SKILLS[skills[(st.next + i) % skills.length]].pattern)) {
          k = i;
          break;
        }
      }
    }
    const id = skills[(st.next + k) % skills.length];
    // 被跳過的招式留到下一輪（輪替順序不亂）
    if (k === 0) st.next++;
    return id;
  }

  /** 衝撞、飛撲的實際移動（每幀） */
  private move(e: Enemy, st: BossState, dt: number) {
    const m = st.motion;
    if (!m) return;
    m.t += dt;
    if (m.t < 0) return;
    const u = Math.min(1, m.t / m.dur);
    e.moving = 1;
    if (m.kind === 'dash') {
      // 分段碰撞，不會穿牆；不會衝出脫戰範圍，否則首領會回家補滿血
      const col = this.ctx.collision();
      const maxHome = LEASH * 2 - 3;
      const want = m.len * (1 - (1 - u) * (1 - u)); // 快衝、尾段減速
      const done = Math.hypot(e.pos.x - m.sx, e.pos.z - m.sz);
      const steps = 6;
      const seg = Math.max(0, want - done) / steps;
      for (let i = 0; i < steps && seg > 0; i++) {
        const nx = e.pos.x + Math.sin(m.dir) * seg;
        const nz = e.pos.z + Math.cos(m.dir) * seg;
        if (Math.hypot(nx - e.home.x, nz - e.home.z) > maxHome) {
          m.t = m.dur;
          break;
        }
        const bx = e.pos.x;
        const bz = e.pos.z;
        e.pos.x = nx;
        e.pos.z = nz;
        col.resolve(e.pos, e.radius);
        // 撞牆：停下
        if (Math.hypot(e.pos.x - bx, e.pos.z - bz) < seg * 0.3) {
          m.t = m.dur;
          break;
        }
      }
      if (m.t >= m.dur) {
        st.motion = null;
        this.ctx.effects.ring(e.pos.x, e.pos.z, 0.5, 3, 0xffe2b0, 0.4);
        bus.emit('camera:shake', { power: 0.35 });
      }
      return;
    }
    // 飛撲：拋物線（起跳快、落下快），落地由預警結算處理
    const k = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    e.pos.x = m.sx + (m.tx - m.sx) * k;
    e.pos.z = m.sz + (m.tz - m.sz) * k;
    e.airY = 4 * m.height * u * (1 - u);
    if (u >= 1) {
      e.airY = 0;
      st.motion = null;
    }
  }

  /**
   * 施放招式，回傳施法（預警）時間。招式參數在 data/bossSkills.ts，這裡只依 pattern 執行。
   * 新的 pattern：在這個 switch 加一個 case（並在 BossSkillDef 加對應型別）。
   */
  private cast(e: Enemy, st: BossState, id: BossSkillId, enraged: boolean): number {
    const { player: p, telegraphs: tg, effects: fx } = this.ctx;
    const sk: BossSkillDef = BOSS_SKILLS[id];
    const dir = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
    e.facing = dir;
    // 結算的第一下：首領撲出去（多段招式只撲一次）；重擊震動鏡頭
    let struck = false;
    const STRIKE: Record<BossSkillDef['pattern'], [number, number]> = {
      cone: [1.4, 0.3], dash: [1.2, 0], nova: [1.1, 0.5], rain: [0.7, 0.15], leap: [0.9, 0.7],
      line: [0.9, 0], spokes: [1.3, 0.3], multiLine: [1, 0],
    };
    const release = () => {
      if (struck || !e.alive) return;
      struck = true;
      const [power, shake] = STRIKE[sk.pattern];
      e.windup = 0;
      e.strike(power);
      if (shake > 0) bus.emit('camera:shake', { power: shake });
    };
    const hit = (inside: (x: number, z: number, pad?: number) => boolean) => {
      release();
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
          if (!e.alive) return;
          // 衝到終點（幾幀內移動過去，見 move()）
          st.motion = { kind: 'dash', t: 0, dur: DASH_TIME, sx: e.pos.x, sz: e.pos.z, dir, len: sk.length, tx: 0, tz: 0, height: 0 };
          fx.ring(sx, sz, 0.5, 2.5, sk.color, 0.35);
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
        // 落點：預警圈中心（玩家位置）往首領這邊退一個身位，落在玩家面前而不是壓在身上
        const d0 = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        const back = Math.min(d0, e.radius * 0.9 + p.radius);
        const tx = p.pos.x - Math.sin(dir) * back;
        const tz = p.pos.z - Math.cos(dir) * back;
        const cx = p.pos.x;
        const cz = p.pos.z;
        // 先蹲低蓄力，預警最後 LEAP_AIR 秒跳起來，落地正好是結算
        const air = Math.min(LEAP_AIR, t * 0.6);
        st.motion = {
          kind: 'leap', t: -(t - air), dur: air, sx: e.pos.x, sz: e.pos.z, dir, len: 0, tx, tz,
          height: 1.6 + e.def.scale * 0.7,
        };
        tg.add({ kind: 'circle', x: cx, z: cz, r: sk.radius }, t, (inside) => {
          st.motion = null;
          e.airY = 0;
          if (!e.alive) return;
          e.pos.x = tx;
          e.pos.z = tz;
          this.ctx.collision().resolve(e.pos, e.radius);
          hit(inside);
          fx.ring(cx, cz, 1, sk.radius * 1.2, sk.color, 0.5);
          fx.disc(cx, cz, sk.radius, sk.discColor ?? sk.color, 0.4, 0.6);
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
