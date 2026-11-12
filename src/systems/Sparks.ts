import * as THREE from 'three';

/**
 * 粒子池（v1.109）：命中火花、腳步揚塵、施法手部光點……全部共用一個 THREE.Points（1 個 draw call）。
 * 每顆粒子有位置、速度、重力、壽命、大小、顏色、混合方式（加算發光 / 一般半透明灰塵各一個 Points）。
 */
const MAX = 360;

interface P {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  g: number; drag: number;
  t: number; life: number; size: number;
  r: number; gc: number; b: number;
}

class Pool {
  readonly points: THREE.Points;
  private ps: (P | null)[] = new Array(MAX).fill(null);
  private next = 0;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private siz = new Float32Array(MAX);
  private alp = new Float32Array(MAX);

  constructor(additive: boolean) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alp, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexColors: true,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute float alpha;
        varying vec3 vCol; varying float vA;
        uniform float uScale;
        void main() {
          vCol = color; vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vA;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          float a = vA * (1.0 - r) * (1.0 - r);
          gl_FragColor = vec4(vCol, a);
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
  }

  add(p: P) {
    this.ps[this.next] = p;
    this.next = (this.next + 1) % MAX;
  }

  setScale(px: number) {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = px;
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      const p = this.ps[i];
      if (!p) {
        this.alp[i] = 0;
        continue;
      }
      p.t += dt;
      if (p.t >= p.life) {
        this.ps[i] = null;
        this.alp[i] = 0;
        continue;
      }
      const k = p.t / p.life;
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.gc; this.col[i * 3 + 2] = p.b;
      this.siz[i] = p.size * (1 - k * 0.5);
      this.alp[i] = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
    }
    const g = this.points.geometry;
    for (const n of ['position', 'color', 'size', 'alpha']) g.getAttribute(n).needsUpdate = true;
  }

  clear() {
    this.ps.fill(null);
    this.alp.fill(0);
  }
}

const tmp = new THREE.Color();

export class Sparks {
  private glow = new Pool(true);
  private dust = new Pool(false);
  /** 低畫質減量（0～1） */
  density = 1;

  constructor(scene: THREE.Scene) {
    scene.add(this.glow.points, this.dust.points);
  }

  /** 視窗高度（像素）變了要更新點的大小換算 */
  resize(heightPx: number, fovDeg: number) {
    const s = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.glow.setScale(s);
    this.dust.setScale(s);
  }

  /** 命中火花：往四周（偏向 dir 方向）噴出的發光碎點 */
  hit(x: number, y: number, z: number, color: number, n = 8, power = 1, dirX = 0, dirZ = 0) {
    tmp.setHex(color);
    const cnt = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (2.5 + Math.random() * 4) * power;
      const up = (Math.random() * 0.8 + 0.2) * 3 * power;
      const white = Math.random() < 0.35;
      this.glow.add({
        x, y, z,
        vx: Math.cos(a) * s + dirX * 3 * power, vy: up, vz: Math.sin(a) * s + dirZ * 3 * power,
        g: 9, drag: 4, t: 0, life: 0.3 + Math.random() * 0.3, size: (0.26 + Math.random() * 0.2) * Math.sqrt(power),
        r: white ? 1 : tmp.r, gc: white ? 1 : tmp.g, b: white ? 1 : tmp.b,
      });
    }
  }

  /** 腳步揚塵：地面上慢慢擴散上升的灰塵 */
  footDust(x: number, y: number, z: number, color: number, n = 3) {
    tmp.setHex(color);
    const cnt = Math.max(0, Math.round(n * this.density));
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * Math.PI * 2;
      this.dust.add({
        x: x + Math.cos(a) * 0.15, y: y + 0.05, z: z + Math.sin(a) * 0.15,
        vx: Math.cos(a) * 0.6, vy: 0.5 + Math.random() * 0.4, vz: Math.sin(a) * 0.6,
        g: 0, drag: 2.5, t: 0, life: 0.55 + Math.random() * 0.35, size: 0.5 + Math.random() * 0.3,
        r: tmp.r, gc: tmp.g, b: tmp.b,
      });
    }
  }

  /** 施法光點：在手 / 法杖頂端聚成一團再散開 */
  glowAt(x: number, y: number, z: number, color: number, n = 6, size = 0.18) {
    tmp.setHex(color);
    const cnt = Math.max(1, Math.round(n * this.density));
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.4 + Math.random() * 0.8;
      this.glow.add({
        x, y, z,
        vx: Math.cos(a) * s, vy: 0.3 + Math.random() * 0.8, vz: Math.sin(a) * s,
        g: 0, drag: 3, t: 0, life: 0.3 + Math.random() * 0.25, size: size * (0.7 + Math.random() * 0.6),
        r: tmp.r, gc: tmp.g, b: tmp.b,
      });
    }
  }

  update(dt: number) {
    this.glow.update(dt);
    this.dust.update(dt);
  }

  clear() {
    this.glow.clear();
    this.dust.clear();
  }
}
