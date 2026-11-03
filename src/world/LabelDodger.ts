import * as THREE from 'three';

/**
 * 地上的地點標籤（傳送點、商店招牌）避開 HUD 按鈕
 * ------------------------------------------------------------
 * 每幀把標籤投影到螢幕；如果會被技能、搖桿、藥水、左上 / 右上面板蓋住，
 * 就把標籤往上抬到按鈕上方（平滑移動，最多抬 5 公尺），沒被蓋住時慢慢回到原位。
 * 只處理標記了 userData.dodge 的 Sprite（Zone / Props 建立時標記）。
 */
const OCCLUDERS = '.skills .act, .auto-btn, .potions .act, .joystick, .top-left, .top-right';
const MAX_LIFT = 5;

interface Tracked {
  sprite: THREE.Sprite;
  baseY: number;
  lift: number;
}

export class LabelDodger {
  private tracked: Tracked[] = [];
  private rects: DOMRect[] = [];
  private rectTimer = 0;
  private v = new THREE.Vector3();
  private root: THREE.Object3D | null = null;

  constructor(private container: HTMLElement) {}

  /** 換區域時重新收集標籤 */
  setRoot(root: THREE.Object3D) {
    this.root = root;
    this.tracked = [];
    root.traverse((o) => {
      const s = o as THREE.Sprite;
      if (s.isSprite && s.userData.dodge) this.tracked.push({ sprite: s, baseY: s.position.y, lift: 0 });
    });
  }

  update(dt: number, camera: THREE.PerspectiveCamera) {
    if (!this.root || !this.tracked.length) return;
    // HUD 位置很少變（搖桿除外），每 0.3 秒重新量一次
    this.rectTimer -= dt;
    if (this.rectTimer <= 0) {
      this.rectTimer = 0.3;
      this.rects = [...document.querySelectorAll<HTMLElement>(OCCLUDERS)].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect());
    }
    const box = this.container.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // 鏡頭往下看的角度：世界 y 方向在螢幕上的縮短比例
    camera.getWorldDirection(this.v);
    const cosPitch = Math.max(0.3, Math.sqrt(1 - this.v.y * this.v.y));
    for (const t of this.tracked) {
      const s = t.sprite;
      s.position.y = t.baseY; // 先用原位計算
      s.updateWorldMatrix(true, false);
      this.v.setFromMatrixPosition(s.matrixWorld);
      const dist = this.v.distanceTo(camera.position);
      this.v.project(camera);
      let want = 0;
      if (this.v.z < 1 && Math.abs(this.v.x) < 1.2 && Math.abs(this.v.y) < 1.2) {
        const ppu = h / (2 * tanHalf * dist); // 每公尺幾個像素
        const cx = box.left + (this.v.x * 0.5 + 0.5) * w;
        const cy = box.top + (-this.v.y * 0.5 + 0.5) * h;
        const hw = (s.scale.x * ppu) / 2;
        const hh = (s.scale.y * ppu) / 2;
        // 找需要往上抬多少像素才不會跟任何面板重疊
        let need = 0;
        for (let iter = 0; iter < 3; iter++) {
          let moved = false;
          const top = cy - need - hh;
          const bottom = cy - need + hh;
          for (const r of this.rects) {
            if (cx + hw < r.left - 4 || cx - hw > r.right + 4 || bottom < r.top - 4 || top > r.bottom + 4) continue;
            need = Math.max(need, cy + hh - r.top + 6);
            moved = true;
          }
          if (!moved) break;
        }
        want = Math.min(MAX_LIFT, need / (ppu * cosPitch));
      }
      t.lift += (want - t.lift) * Math.min(1, dt * 8);
      s.position.y = t.baseY + t.lift;
    }
  }
}
