import * as THREE from 'three';
import type { ZoneDef } from '@/data/types';
import { ENEMIES } from '@/data/enemies';
import { Enemy } from '@/entities/Enemy';
import { updateEnemyAI, type AiContext } from './EnemyAI';

/**
 * EnemyManager：依區域的 spawns 生成敵人、每幀更新 AI 與動畫、提供查詢。
 * 切換區域時 clear() 會釋放所有敵人。
 */
export class EnemyManager {
  enemies: Enemy[] = [];
  /** 地面高度查詢（高台），由 Game 指向目前 Zone */
  heightAt: (x: number, z: number) => number = () => 0;

  constructor(private scene: THREE.Scene) {}

  spawnForZone(def: ZoneDef) {
    this.clear();
    for (const s of def.spawns ?? []) {
      const ed = ENEMIES[s.enemy];
      if (!ed) {
        console.warn(`[EnemyManager] 找不到敵人資料：${s.enemy}`);
        continue;
      }
      const n = s.count ?? 1;
      for (let i = 0; i < n; i++) {
        // 初次生成時均勻散開（黃金角），之後重生才隨機
        const r = n > 1 ? (s.spread ?? 0) * Math.sqrt((i + 0.5) / n) : 0;
        const a = i * 2.39996;
        const e = new Enemy(ed, { ...s, x: s.x + Math.cos(a) * r, z: s.z + Math.sin(a) * r, count: 1, spread: s.spread ?? 0 });
        e.groundY = this.heightAt(e.pos.x, e.pos.z);
        this.enemies.push(e);
        this.scene.add(e.object);
      }
    }
  }

  /**
   * 生成一隻不會重生的敵人（無盡試煉塔，v1.70）：生命、攻擊倍率與防禦另外指定。
   */
  spawnOne(id: string, x: number, z: number, opts: { hpMul?: number; atkMul?: number; def?: number; tag?: string } = {}): Enemy | null {
    const ed = ENEMIES[id];
    if (!ed) return null;
    const e = new Enemy(ed, { enemy: id, x, z, count: 1, spread: 0, respawn: 1e9, def: opts.def, tag: opts.tag });
    e.maxHp = ed.stats.maxHp * (opts.hpMul ?? 1);
    e.hp = e.maxHp;
    e.atkMul = opts.atkMul ?? 1;
    e.groundY = this.heightAt(e.pos.x, e.pos.z);
    this.enemies.push(e);
    this.scene.add(e.object);
    return e;
  }

  clear() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
  }

  update(dt: number, camera: THREE.Camera, ai?: AiContext) {
    for (const e of this.enemies) {
      if (ai) updateEnemyAI(e, dt, ai);
      if (e.alive) e.groundY += (this.heightAt(e.pos.x, e.pos.z) - e.groundY) * Math.min(1, dt * 12);
      e.update(dt, camera);
    }
    this.separate();
  }

  /** 敵人之間互相推開，避免疊在一起 */
  private separate() {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const min = (a.radius + b.radius) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          // 首領不被小怪推動
          const wa = a.def.boss ? 0 : b.def.boss ? 2 : 1;
          const wb = b.def.boss ? 0 : a.def.boss ? 2 : 1;
          a.pos.x -= (dx / d) * push * wa;
          a.pos.z -= (dz / d) * push * wa;
          b.pos.x += (dx / d) * push * wb;
          b.pos.z += (dz / d) * push * wb;
        }
      }
    }
  }

  /** 範圍內最近的活著的敵人（排除脫戰回家中的；includeDummies = false 時排除木樁，給 AUTO 用） */
  nearest(x: number, z: number, range: number, includeDummies = true): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      if (!e.alive || e.ai === 'return') continue;
      if (!includeDummies && e.def.aggro === 'none') continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** 戰鬥中的首領（HUD 上方血條） */
  engagedBoss(): Enemy | null {
    return this.enemies.find((e) => e.def.boss && e.engaged) ?? null;
  }

  /** 把角色推出敵人身體（敵人視為圓形障礙） */
  pushOut(pos: { x: number; z: number }, radius: number) {
    for (const e of this.enemies) {
      if (!e.alive || e.def.shape === 'bat') continue;
      const dx = pos.x - e.pos.x;
      const dz = pos.z - e.pos.z;
      const min = e.radius + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.0001;
        pos.x = e.pos.x + (dx / d) * min;
        pos.z = e.pos.z + (dz / d) * min;
      }
    }
  }
}
