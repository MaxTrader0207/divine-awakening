/**
 * 2D（xz 平面）碰撞：角色是圓，障礙物是圓或軸對齊矩形。
 * 簡單、可預期、手機上便宜。不使用物理引擎。
 */
export interface CircleCollider {
  type: 'circle';
  x: number;
  z: number;
  r: number;
}

export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type Collider = CircleCollider | BoxCollider;

export class CollisionWorld {
  colliders: Collider[] = [];
  bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };

  clear() {
    this.colliders = [];
  }

  addCircle(x: number, z: number, r: number) {
    this.colliders.push({ type: 'circle', x, z, r });
  }

  addBox(cx: number, cz: number, w: number, d: number) {
    this.colliders.push({ type: 'box', minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  /** 把圓形角色推出所有障礙物與邊界，就地修改 pos */
  resolve(pos: { x: number; z: number }, radius: number) {
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.colliders) {
        if (c.type === 'circle') {
          const dx = pos.x - c.x;
          const dz = pos.z - c.z;
          const min = c.r + radius;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.0001;
            pos.x = c.x + (dx / d) * min;
            pos.z = c.z + (dz / d) * min;
          }
        } else {
          const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
          const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
          const dx = pos.x - nx;
          const dz = pos.z - nz;
          const d2 = dx * dx + dz * dz;
          if (d2 < radius * radius) {
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2);
              pos.x = nx + (dx / d) * radius;
              pos.z = nz + (dz / d) * radius;
            } else {
              // 圓心在矩形內：往最近的邊推出
              const pushes = [
                { v: pos.x - c.minX + radius, ax: 'x', s: -1 },
                { v: c.maxX - pos.x + radius, ax: 'x', s: 1 },
                { v: pos.z - c.minZ + radius, ax: 'z', s: -1 },
                { v: c.maxZ - pos.z + radius, ax: 'z', s: 1 },
              ].sort((a, b) => a.v - b.v)[0];
              if (pushes.ax === 'x') pos.x += pushes.s * pushes.v;
              else pos.z += pushes.s * pushes.v;
            }
          }
        }
      }
    }
    const b = this.bounds;
    pos.x = Math.max(b.minX + radius, Math.min(b.maxX - radius, pos.x));
    pos.z = Math.max(b.minZ + radius, Math.min(b.maxZ - radius, pos.z));
  }
}
