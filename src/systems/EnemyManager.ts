import * as THREE from 'three';
import type { ZoneDef } from '@/data/types';
import { ENEMIES } from '@/data/enemies';
import { Enemy } from '@/entities/Enemy';

/**
 * EnemyManager：依區域的 spawns 生成敵人、每幀更新、提供查詢。
 * 切換區域時 clear() 會釋放所有敵人。
 */
export class EnemyManager {
  enemies: Enemy[] = [];

  constructor(private scene: THREE.Scene) {}

  spawnForZone(def: ZoneDef) {
    this.clear();
    for (const s of def.spawns ?? []) {
      const ed = ENEMIES[s.enemy];
      if (!ed) {
        console.warn(`[EnemyManager] 找不到敵人資料：${s.enemy}`);
        continue;
      }
      const e = new Enemy(ed, s);
      this.enemies.push(e);
      this.scene.add(e.object);
    }
  }

  clear() {
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
  }

  update(dt: number, camera: THREE.Camera) {
    for (const e of this.enemies) e.update(dt, camera);
  }

  /** 範圍內最近的活著的敵人 */
  nearest(x: number, z: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z) - e.radius;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** 把角色推出敵人身體（敵人視為圓形障礙） */
  pushOut(pos: { x: number; z: number }, radius: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
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
