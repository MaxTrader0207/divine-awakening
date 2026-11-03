import { describe, expect, it } from 'vitest';
import { Critters } from './Critters';
import { CollisionWorld } from './Collision';
import { ZONES } from '@/data/zones';

function env() {
  const collision = new CollisionWorld();
  collision.bounds = { minX: -28, maxX: 28, minZ: -32, maxZ: 32 };
  collision.addBox(0, 0, 4, 4); // 中間一棟房子
  return { collision, heightAt: () => 0, bounds: collision.bounds };
}

function run(c: Critters, e: ReturnType<typeof env>, seconds: number, px: number, pz: number) {
  for (let t = 0; t < seconds; t += 1 / 30) c.update(1 / 30, px, pz, e);
}

describe('城裡的小動物', () => {
  it('雞舍裡的雞不會跑出活動範圍，也不會穿牆', () => {
    const e = env();
    const area = { x: 10, z: 10, w: 4, d: 4 };
    const c = new Critters(
      [
        { kind: 'chicken', x: 10, z: 10, area },
        { kind: 'chick', x: 10.5, z: 10, area },
        { kind: 'cat', x: 4, z: 0 },
        { kind: 'dog', x: -5, z: 0 },
      ],
      e,
    );
    for (let i = 0; i < 6; i++) {
      run(c, e, 10, 10 + Math.sin(i) * 3, 10 + Math.cos(i) * 3); // 玩家在附近繞，會把雞嚇跑
      for (const d of c.debug()) {
        expect(Number.isFinite(d.x) && Number.isFinite(d.z)).toBe(true);
        if (d.kind === 'chicken' || d.kind === 'chick') {
          expect(d.x).toBeGreaterThanOrEqual(8);
          expect(d.x).toBeLessThanOrEqual(12);
        }
        // 不在房子裡
        expect(Math.abs(d.x) < 2 && Math.abs(d.z) < 2).toBe(false);
      }
    }
  });

  it('玩家靠近時鴿子會飛走，之後降落在離玩家較遠的地方', () => {
    const e = env();
    const c = new Critters([{ kind: 'pigeon', x: 8, z: 8, area: { x: 8, z: 8, w: 20, d: 20 } }], e);
    run(c, e, 0.5, 8.5, 8);
    expect(c.debug()[0].state).toBe('fly');
    run(c, e, 6, 30, 30); // 玩家離開
    const d = c.debug()[0];
    expect(d.y).toBe(0);
    expect(Math.hypot(d.x - 8.5, d.z - 8)).toBeGreaterThan(5);
  });

  it('雅典城的動物資料都放在可走的位置', () => {
    const town = ZONES.town;
    expect(town.critters?.length).toBeGreaterThan(10);
    for (const cr of town.critters ?? []) {
      expect(Math.abs(cr.x)).toBeLessThan(town.size.w / 2);
      expect(Math.abs(cr.z)).toBeLessThan(town.size.d / 2);
    }
  });
});
