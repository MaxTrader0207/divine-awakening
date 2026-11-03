import * as THREE from 'three';

/**
 * 新手指引的方向提示：玩家腳邊一個金色箭頭指向目標，目標位置有一道淡金色光柱。
 * 只有目前步驟在玩家所在區域有目標（TutorialStep.targets）時才顯示。
 * 物件留在 scene 上（不屬於區域），切換區域不會被釋放。
 */
export class GuideArrow {
  readonly group = new THREE.Group();
  private arrow: THREE.Mesh;
  private beam: THREE.Mesh;
  private ring: THREE.Mesh;
  private t = 0;

  constructor() {
    const s = new THREE.Shape();
    const pts: [number, number][] = [
      [0, 0.6],
      [0.5, 0.06],
      [0.22, 0.06],
      [0.22, -0.5],
      [-0.22, -0.5],
      [-0.22, 0.06],
      [-0.5, 0.06],
    ];
    s.moveTo(...pts[0]);
    for (const p of pts.slice(1)) s.lineTo(...p);
    const gold = 0xffd36b;
    this.arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(s).scale(1.5, 1.5, 1).rotateX(-Math.PI / 2), // 平躺，箭頭朝 -z
      new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.arrow.renderOrder = 5;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 6, 16, 1, true).translate(0, 3, 0),
      new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.25, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    this.group.add(this.arrow, this.beam, this.ring);
    this.group.visible = false;
  }

  /**
   * @param target 目標位置（null = 隱藏）
   * @param groundAt 地面高度
   */
  update(dt: number, px: number, pz: number, target: { x: number; z: number } | null, groundAt: (x: number, z: number) => number) {
    this.t += dt;
    if (!target) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const dx = target.x - px;
    const dz = target.z - pz;
    const d = Math.hypot(dx, dz);
    // 箭頭：在玩家前方 2.1~2.5m 來回推，接近目標就淡出
    const near = Math.min(1, Math.max(0, (d - 2.4) / 2));
    this.arrow.visible = near > 0.01;
    if (this.arrow.visible) {
      const ux = dx / d;
      const uz = dz / d;
      const r = 2.1 + (Math.sin(this.t * 5) * 0.5 + 0.5) * 0.45;
      const ax = px + ux * r;
      const az = pz + uz * r;
      this.arrow.position.set(ax, groundAt(ax, az) + 0.06, az);
      this.arrow.rotation.y = Math.atan2(-ux, -uz);
      (this.arrow.material as THREE.MeshBasicMaterial).opacity = 0.92 * near;
    }
    const gy = groundAt(target.x, target.z);
    this.beam.position.set(target.x, gy, target.z);
    this.ring.position.set(target.x, gy + 0.05, target.z);
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(this.t * 3) * 0.06;
    const k = 1 + ((this.t * 0.8) % 1) * 0.5;
    this.ring.scale.set(k, 1, k);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - ((this.t * 0.8) % 1));
  }
}
