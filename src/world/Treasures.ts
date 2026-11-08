import * as THREE from 'three';
import { buildProp } from './Props';

/**
 * 寶箱探索點（v1.92）：Dressing.pickTreasures() 挑位置（離道路遠、走得到的角落），玩家走近就打開。
 * 打開的寶箱在 TREASURE.respawnMs 後才會再出現；開啟時間記在存檔 GameState.treasures（v1.95，以前只在記憶體，重新整理網頁就能再刷）。
 * 獎勵由 Game.updateTreasures() 發（金幣＋一件裝備＋藥水 / 道具）。
 */
export const TREASURE = {
  /** 走到多近打開（公尺） */
  openRange: 1.9,
  /** 同一個寶箱多久後重新出現 */
  respawnMs: 10 * 60 * 1000,
};


interface Chest {
  key: string;
  x: number;
  z: number;
  obj: THREE.Object3D;
  glow: THREE.Mesh;
  opened: boolean;
  /** 打開動畫經過時間 */
  t: number;
}

export class Treasures {
  readonly group = new THREE.Group();
  private chests: Chest[] = [];
  private time = 0;

  constructor(zoneId: string, spots: { x: number; z: number }[], heightAt: (x: number, z: number) => number, private opened: Record<string, number>) {
    const now = Date.now();
    // 過期的紀錄順便清掉，存檔不會越長越大
    for (const [k, at] of Object.entries(opened)) if (now - at >= TREASURE.respawnMs || at > now + 60_000) delete opened[k];
    spots.forEach((s, i) => {
      const key = `${zoneId}:${i}`;
      const at = opened[key];
      if (at !== undefined && now - at < TREASURE.respawnMs) return;
      const obj = buildProp({ kind: 'decor', x: s.x, z: s.z, h: 1.1, model: 'chest_gold', solid: false, rot: Math.atan2(-s.x, -s.z) });
      obj.position.y = heightAt(s.x, s.z);
      obj.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      // 地上一圈金光，遠遠就看得到
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.25, 28),
        new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(s.x, obj.position.y + 0.05, s.z);
      this.group.add(obj, glow);
      this.chests.push({ key, x: s.x, z: s.z, obj, glow, opened: false, t: 0 });
    });
  }

  get count() {
    return this.chests.filter((c) => !c.opened).length;
  }

  /** 還沒打開的寶箱（小地圖、AUTO 用） */
  remaining(): { x: number; z: number }[] {
    return this.chests.filter((c) => !c.opened).map((c) => ({ x: c.x, z: c.z }));
  }

  /** 每幀：玩家走近就打開，回傳這一幀打開的寶箱位置 */
  update(dt: number, px: number, pz: number, alive: boolean): { x: number; z: number }[] {
    this.time += dt;
    const out: { x: number; z: number }[] = [];
    for (const c of this.chests) {
      const m = c.glow.material as THREE.MeshBasicMaterial;
      if (!c.opened) {
        m.opacity = 0.45 + Math.sin(this.time * 3 + c.x) * 0.2;
        c.glow.scale.setScalar(1 + Math.sin(this.time * 3 + c.x) * 0.06);
        if (alive && Math.hypot(px - c.x, pz - c.z) < TREASURE.openRange) {
          c.opened = true;
          this.opened[c.key] = Date.now();
          out.push({ x: c.x, z: c.z });
        }
        continue;
      }
      // 打開：彈起、轉一圈、縮小消失，金光擴散淡出
      if (c.t > 1.2) continue;
      c.t += dt;
      const u = Math.min(1, c.t / 1.2);
      c.obj.position.y += Math.sin(u * Math.PI) * dt * 2.2;
      c.obj.rotation.y += dt * 9 * (1 - u);
      c.obj.scale.setScalar(Math.max(0.01, 1 - u * u));
      c.glow.scale.setScalar(1 + u * 2.5);
      m.opacity = 0.6 * (1 - u);
      if (u >= 1) c.obj.visible = c.glow.visible = false;
    }
    return out;
  }
}
