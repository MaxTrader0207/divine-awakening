import * as THREE from 'three';

/**
 * 隨動披風 / 圍巾（v1.110）
 * ------------------------------------------------------------
 * 一條掛在胸口骨頭後方的布：中心線是 Verlet 質點鏈（重力、空氣阻力、長度限制），
 * 每幀依角色面向展開成一條帶狀網格（上窄下寬或等寬），不會穿進身體（質點被推到身體後方的平面外）。
 * 跑起來往後飄、停下來慢慢垂下、轉身時甩動。世界座標模擬，網格本身放在場景根層（不跟著角色旋轉）。
 */
export interface CapeDef {
  color: number;
  /** 總長（公尺） */
  length: number;
  /** 上緣寬、下緣寬（公尺） */
  width: number;
  widthBottom?: number;
  /** 掛點：胸口骨頭往上 / 往後（公尺） */
  up?: number;
  back?: number;
  /** 掛點左右偏移（圍巾尾巴掛在一側） */
  side?: number;
  /** 段數 */
  segments?: number;
  /** 下緣鋸齒（破布、毛皮） */
  ragged?: boolean;
  /** 尾端顏色（漸層） */
  tip?: number;
}

const G = 9.8;
const tmpV = new THREE.Vector3();

export class Cape {
  readonly mesh: THREE.Mesh;
  private n: number;
  private seg: number;
  private p: THREE.Vector3[] = [];
  private prev: THREE.Vector3[] = [];
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private ready = false;
  private time = Math.random() * 10;

  constructor(private def: CapeDef, private anchorBone: THREE.Object3D) {
    this.n = (def.segments ?? 7) + 1;
    this.seg = def.length / (this.n - 1);
    for (let i = 0; i < this.n; i++) {
      this.p.push(new THREE.Vector3());
      this.prev.push(new THREE.Vector3());
    }
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 2 * 3);
    const col = new Float32Array(this.n * 2 * 3);
    const idx: number[] = [];
    const c0 = new THREE.Color(def.color);
    const c1 = new THREE.Color(def.tip ?? def.color);
    for (let i = 0; i < this.n; i++) {
      const k = i / (this.n - 1);
      const c = c0.clone().lerp(c1, k).multiplyScalar(1 - 0.12 * k);
      for (let s = 0; s < 2; s++) col.set([c.r, c.g, c.b], (i * 2 + s) * 3);
      if (i < this.n - 1) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geo.setIndex(idx);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.name = 'cape';
  }

  /** 神裝形態：布換成套裝配色 */
  setColor(color: number | null) {
    const c0 = new THREE.Color(color ?? this.def.color);
    const c1 = new THREE.Color(color ?? this.def.tip ?? this.def.color);
    if (color != null) c1.lerp(new THREE.Color(0xffffff), 0.25);
    const col = this.geo.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < this.n; i++) {
      const k = i / (this.n - 1);
      const c = c0.clone().lerp(c1, k).multiplyScalar(1 - 0.12 * k);
      for (let s = 0; s < 2; s++) col.setXYZ(i * 2 + s, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  /** facing：角色面向（0 = +z）；speed：目前移動速度（公尺 / 秒） */
  update(dt: number, facing: number, speed: number, visible: boolean) {
    this.mesh.visible = visible;
    if (!visible) {
      this.ready = false;
      return;
    }
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    const d = this.def;
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    const rx = fz; // 角色右手邊
    const rz = -fx;
    // 掛點：胸口骨頭的世界位置，往上 / 往後 / 往側邊
    this.anchorBone.getWorldPosition(tmpV);
    const ax = tmpV.x - fx * (d.back ?? 0.2) + rx * (d.side ?? 0);
    const ay = tmpV.y + (d.up ?? 0.1);
    const az = tmpV.z - fz * (d.back ?? 0.2) + rz * (d.side ?? 0);
    if (!this.ready) {
      for (let i = 0; i < this.n; i++) {
        this.p[i].set(ax - fx * 0.05 * i, ay - this.seg * i, az - fz * 0.05 * i);
        this.prev[i].copy(this.p[i]);
      }
      this.ready = true;
    }
    // Verlet：慣性 + 重力 + 微風
    const damp = Math.exp(-dt * 2.2);
    const flutter = 0.6 + Math.min(1, speed / 6) * 1.6;
    for (let i = 1; i < this.n; i++) {
      const q = this.p[i];
      const o = this.prev[i];
      const vx = (q.x - o.x) * damp;
      const vy = (q.y - o.y) * damp;
      const vz = (q.z - o.z) * damp;
      o.copy(q);
      const k = i / (this.n - 1);
      const narrow = d.width < 0.2 ? 2.4 : 1; // 圍巾比披風飄得厲害
      const wob = Math.sin(this.time * 7 + i * 0.9 + (d.side ?? 0) * 20) * 0.35 * flutter * k * narrow;
      q.x += vx + (rx * wob - fx * 0.15 * flutter * narrow) * dt * dt * 8;
      q.y += vy - G * dt * dt;
      q.z += vz + (rz * wob - fz * 0.15 * flutter * narrow) * dt * dt * 8;
    }
    this.p[0].set(ax, ay, az);
    // 長度限制（幾次迭代）＋不穿進身體：每個點都要在掛點後方平面之後
    for (let it = 0; it < 3; it++) {
      for (let i = 1; i < this.n; i++) {
        const a = this.p[i - 1];
        const b = this.p[i];
        tmpV.subVectors(b, a);
        const len = tmpV.length() || 1e-6;
        const diff = (len - this.seg) / len;
        if (i === 1) b.addScaledVector(tmpV, -diff);
        else {
          a.addScaledVector(tmpV, diff * 0.5);
          b.addScaledVector(tmpV, -diff * 0.5);
        }
      }
      for (let i = 1; i < this.n; i++) {
        const b = this.p[i];
        const front = (b.x - ax) * fx + (b.z - az) * fz;
        const limit = -0.04 - i * 0.015;
        if (front > limit) {
          b.x -= fx * (front - limit);
          b.z -= fz * (front - limit);
        }
        if (b.y < 0.05) b.y = 0.05;
      }
    }
    // 展開成帶狀：寬度沿著角色左右方向
    const w0 = d.width / 2;
    const w1 = (d.widthBottom ?? d.width) / 2;
    for (let i = 0; i < this.n; i++) {
      const k = i / (this.n - 1);
      let w = w0 + (w1 - w0) * Math.min(1, k * 1.4);
      const q = this.p[i];
      let yL = q.y;
      let yR = q.y;
      if (d.ragged && i === this.n - 1) {
        yL -= 0.06;
        yR += 0.03;
        w *= 0.92;
      }
      this.pos.set([q.x - rx * w, yL, q.z - rz * w], i * 6);
      this.pos.set([q.x + rx * w, yR, q.z + rz * w], i * 6 + 3);
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
