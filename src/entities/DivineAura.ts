import * as THREE from 'three';
import type { DivinePalette, OrnamentKind } from '@/data/divineForm';

/**
 * 神裝形態的特效（v1.99，資料在 data/divineForm.ts）：掛在 Player.object 底下（跟著角色轉向）。
 *   - 腳下：旋轉的神紋法陣（完整套裝多一圈外環）
 *   - 身上：往上飄的光點（Points，一個 draw call）
 *   - 背後：職業專屬飾物（OrnamentKind）
 * 全部用 MeshBasicMaterial＋加算混合、不寫深度、不投影，約 4～6 個 draw call。
 */
const H = 2.9; // 角色身高（跟 Player 的 HERO_HEIGHT 一樣）

function glowMat(color: number, opacity = 0.85): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}

/** 把同一種材質的多個幾何合併成一個網格 */
function merged(parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[], mat: THREE.Material): THREE.Mesh {
  const geos = parts.map(({ geo, m }) => {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    return g;
  });
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o);
    o += g.attributes.position.count * 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(out, mat);
  mesh.frustumCulled = false;
  return mesh;
}

const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

export class DivineAura {
  readonly group = new THREE.Group();
  private circle = new THREE.Group();
  private outer: THREE.Object3D | null = null;
  private ornament = new THREE.Group();
  private spin: THREE.Object3D[] = [];
  private bobs: { o: THREE.Object3D; y: number; ph: number }[] = [];
  private motes: THREE.Points;
  private moteSeed: Float32Array;
  private mats: THREE.Material[] = [];
  private t = 0;
  /** 出現時的淡入（0 → 1） */
  private fade = 0;

  constructor(kind: OrnamentKind, pal: DivinePalette, full: boolean) {
    const glow = glowMat(pal.glow, 0.75);
    const accent = glowMat(pal.accent, 0.9);
    this.mats.push(glow, accent);

    // ---- 腳下的神紋法陣 ----
    const ring: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [
      { geo: new THREE.RingGeometry(0.95, 1.02, 48), m: M(0, 0, 0, -Math.PI / 2) },
      { geo: new THREE.RingGeometry(0.7, 0.74, 40), m: M(0, 0, 0, -Math.PI / 2) },
    ];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ring.push({ geo: new THREE.PlaneGeometry(0.05, i % 3 ? 0.14 : 0.24), m: M(Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86, -Math.PI / 2, 0, -a + Math.PI / 2) });
    }
    // 內圈的三角神紋
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2;
      const a1 = ((i + 1) / 3) * Math.PI * 2;
      const [x0, z0, x1, z1] = [Math.cos(a0) * 0.7, Math.sin(a0) * 0.7, Math.cos(a1) * 0.7, Math.sin(a1) * 0.7];
      const len = Math.hypot(x1 - x0, z1 - z0);
      ring.push({ geo: new THREE.PlaneGeometry(len, 0.035), m: M((x0 + x1) / 2, 0, (z0 + z1) / 2, -Math.PI / 2, 0, -Math.atan2(z1 - z0, x1 - x0)) });
    }
    const circleMesh = merged(ring, glow);
    circleMesh.position.y = 0.05;
    this.circle.add(circleMesh);
    if (full) {
      // 完整套裝：外圈多一層反方向轉的點綴環
      const parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [{ geo: new THREE.RingGeometry(1.22, 1.26, 56), m: M(0, 0, 0, -Math.PI / 2) }];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        parts.push({ geo: new THREE.CircleGeometry(0.06, 4), m: M(Math.cos(a) * 1.24, 0, Math.sin(a) * 1.24, -Math.PI / 2) });
      }
      const o = merged(parts, accent);
      o.position.y = 0.06;
      this.outer = o;
      this.group.add(o);
    }
    this.group.add(this.circle);

    // ---- 往上飄的光點 ----
    const n = full ? 26 : 16;
    this.moteSeed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      this.moteSeed[i * 3] = Math.random() * Math.PI * 2; // 角度
      this.moteSeed[i * 3 + 1] = Math.random(); // 起始高度
      this.moteSeed[i * 3 + 2] = 0.35 + Math.random() * 0.55; // 半徑
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pm = new THREE.PointsMaterial({ color: pal.glow, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mats.push(pm);
    this.motes = new THREE.Points(pg, pm);
    this.motes.frustumCulled = false;
    this.group.add(this.motes);

    // ---- 職業飾物 ----
    this.buildOrnament(kind, glow, accent);
    this.group.add(this.ornament);
    this.group.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
    this.setOpacity(0);
  }

  private buildOrnament(kind: OrnamentKind, glow: THREE.Material, accent: THREE.Material) {
    const o = this.ornament;
    const back = -0.42;
    switch (kind) {
      case 'runeRing': {
        // 法師：頭後方豎立的符文環＋6 顆符文寶石
        const g = new THREE.Group();
        g.position.set(0, H * 0.82, back);
        const parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [{ geo: new THREE.TorusGeometry(0.62, 0.025, 6, 40), m: M() }, { geo: new THREE.TorusGeometry(0.5, 0.012, 4, 36), m: M() }];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          parts.push({ geo: new THREE.OctahedronGeometry(0.075, 0), m: M(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0) });
        }
        g.add(merged(parts, accent));
        o.add(g);
        this.spin.push(g);
        break;
      }
      case 'wings': {
        // 弓手：背後一對光羽（每邊 6 根羽毛）
        for (const sx of [-1, 1]) {
          const w = new THREE.Group();
          w.position.set(sx * 0.15, H * 0.62, back);
          const parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [];
          for (let i = 0; i < 6; i++) {
            const len = 0.5 + i * 0.12;
            const a = 0.35 + i * 0.2;
            parts.push({ geo: new THREE.PlaneGeometry(0.13, len), m: M(sx * (0.18 + i * 0.1), 0.15 + i * 0.05, -0.02 * i, 0, 0, sx * -a).multiply(M(0, len / 2)) });
          }
          w.add(merged(parts, glow));
          o.add(w);
          this.bobs.push({ o: w, y: w.position.y, ph: sx });
          w.userData.side = sx;
        }
        break;
      }
      case 'halo': {
        // 騎士：頭上的聖環＋背後的十字光
        const halo = merged([{ geo: new THREE.TorusGeometry(0.34, 0.03, 6, 36), m: M(0, 0, 0, Math.PI / 2) }], accent);
        halo.position.set(0, H * 1.02, -0.05);
        o.add(halo);
        this.bobs.push({ o: halo, y: halo.position.y, ph: 0 });
        const cross = merged(
          [
            { geo: new THREE.PlaneGeometry(0.06, 1.1), m: M() },
            { geo: new THREE.PlaneGeometry(0.7, 0.06), m: M(0, 0.18) },
            { geo: new THREE.RingGeometry(0.3, 0.34, 32), m: M(0, 0.18) },
          ],
          glow,
        );
        cross.position.set(0, H * 0.72, back);
        o.add(cross);
        break;
      }
      case 'flameCrown': {
        // 狂戰士：肩後一圈往上竄的怒焰
        const g = new THREE.Group();
        g.position.set(0, H * 0.7, back - 0.05);
        g.scale.setScalar(1.35);
        g.rotation.x = -0.35;
        const parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [];
        for (let i = 0; i < 7; i++) {
          const a = ((i - 3) / 3) * 1.1;
          const len = 0.55 + (3 - Math.abs(i - 3)) * 0.14;
          parts.push({ geo: new THREE.ConeGeometry(0.09, len, 4), m: M(Math.sin(a) * 0.45, Math.cos(a) * 0.3 + len / 2, 0, 0, 0, -a * 0.6) });
        }
        g.add(merged(parts, glow));
        o.add(g);
        g.userData.flame = true;
        this.bobs.push({ o: g, y: g.position.y, ph: 2 });
        break;
      }
      case 'soulWisps': {
        // 召喚師：三團繞身旋轉的魂火
        const g = new THREE.Group();
        g.position.y = H * 0.55;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const w = merged(
            [
              { geo: new THREE.SphereGeometry(0.16, 8, 6), m: M() },
              { geo: new THREE.ConeGeometry(0.12, 0.42, 6), m: M(0, 0.26) },
            ],
            i === 0 ? accent : glow,
          );
          w.position.set(Math.cos(a) * 0.95, Math.sin(a * 2) * 0.15, Math.sin(a) * 0.95);
          g.add(w);
        }
        o.add(g);
        this.spin.push(g);
        g.userData.orbit = true;
        break;
      }
      case 'floatingSwords': {
        // 劍俠：背後扇形排開的三把光劍
        const g = new THREE.Group();
        g.position.set(0, H * 0.68, back - 0.1);
        g.scale.setScalar(1.3);
        g.rotation.x = -0.55;
        for (let i = 0; i < 3; i++) {
          const a = (i - 1) * 0.6;
          const sw = merged(
            [
              { geo: new THREE.BoxGeometry(0.06, 0.95, 0.015), m: M(0, 0.5) },
              { geo: new THREE.ConeGeometry(0.045, 0.14, 4), m: M(0, 1.04) },
              { geo: new THREE.BoxGeometry(0.24, 0.04, 0.04), m: M(0, 0.02) },
            ],
            i === 1 ? accent : glow,
          );
          sw.rotation.z = a;
          sw.position.set(Math.sin(-a) * 0.12, 0, 0);
          g.add(sw);
          this.bobs.push({ o: sw, y: 0, ph: i });
        }
        o.add(g);
        break;
      }
      case 'spiritMoon': {
        // 訓獸師：背後的月輪＋兩顆繞行的獸魂
        const moon = merged([{ geo: new THREE.RingGeometry(0.42, 0.56, 40, 1, 0.6, Math.PI * 1.55), m: M() }], accent);
        moon.position.set(0, H * 0.8, back);
        o.add(moon);
        this.bobs.push({ o: moon, y: moon.position.y, ph: 1 });
        const g = new THREE.Group();
        g.position.y = H * 0.45;
        for (const a of [0, Math.PI]) {
          const w = merged([{ geo: new THREE.SphereGeometry(0.09, 8, 6), m: M() }, { geo: new THREE.ConeGeometry(0.05, 0.16, 4), m: M(0.06, 0.1, 0, 0, 0, -0.4) }, { geo: new THREE.ConeGeometry(0.05, 0.16, 4), m: M(-0.06, 0.1, 0, 0, 0, 0.4) }], glow);
          w.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
          g.add(w);
        }
        o.add(g);
        this.spin.push(g);
        g.userData.orbit = true;
        break;
      }
      case 'shadowShuriken': {
        // 忍者：背後的新月＋四枚繞行的手裏劍
        const moon = merged([{ geo: new THREE.RingGeometry(0.4, 0.5, 40, 1, -0.4, Math.PI * 1.25), m: M() }], glow);
        moon.position.set(0, H * 0.78, back);
        o.add(moon);
        const g = new THREE.Group();
        g.position.y = H * 0.5;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const parts: { geo: THREE.BufferGeometry; m: THREE.Matrix4 }[] = [];
          for (let k = 0; k < 4; k++) parts.push({ geo: new THREE.ConeGeometry(0.045, 0.2, 3), m: M(0, 0, 0, Math.PI / 2, 0, (k * Math.PI) / 2).multiply(M(0, 0.1)) });
          const s = merged(parts, accent);
          s.position.set(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8);
          s.userData.shuriken = true;
          g.add(s);
        }
        o.add(g);
        this.spin.push(g);
        g.userData.orbit = true;
        break;
      }
    }
  }

  private setOpacity(k: number) {
    for (const m of this.mats) {
      const base = (m.userData.base as number | undefined) ?? (m as THREE.MeshBasicMaterial).opacity;
      m.userData.base = base;
      (m as THREE.MeshBasicMaterial).opacity = base * k;
    }
  }

  update(dt: number, moving: boolean) {
    this.t += dt;
    const t = this.t;
    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt * 1.5);
      this.setOpacity(this.fade);
    }
    // 法陣：慢慢轉、呼吸般縮放；跑步時淡一點
    this.circle.rotation.y = t * 0.6;
    const breathe = 1 + Math.sin(t * 2.2) * 0.04;
    this.circle.scale.setScalar(breathe);
    if (this.outer) this.outer.rotation.y = -t * 0.35;
    // 光點：螺旋往上飄
    const pos = this.motes.geometry.attributes.position as THREE.BufferAttribute;
    const s = this.moteSeed;
    for (let i = 0; i < pos.count; i++) {
      const u = (s[i * 3 + 1] + t * 0.28) % 1;
      const a = s[i * 3] + t * 0.8 + u * 2;
      const r = s[i * 3 + 2] * (1 - u * 0.4);
      pos.setXYZ(i, Math.cos(a) * r, u * H * 1.05, Math.sin(a) * r);
    }
    pos.needsUpdate = true;
    (this.motes.material as THREE.PointsMaterial).size = 0.13 * (moving ? 0.8 : 1);
    // 飾物
    for (const g of this.spin) {
      if (g.userData.orbit) {
        g.rotation.y = t * 1.6;
        for (const c of g.children) if (c.userData.shuriken) c.rotation.y = -t * 12;
      } else g.rotation.z = t * 0.5;
    }
    for (const b of this.bobs) {
      b.o.position.y = b.y + Math.sin(t * 2 + b.ph) * 0.05;
      if (b.o.userData.side) b.o.rotation.y = b.o.userData.side * (0.25 + Math.sin(t * 3) * 0.12); // 光羽輕輕拍動
      if (b.o.userData.flame) b.o.scale.y = 1 + Math.sin(t * 9) * 0.08;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const m of this.mats) m.dispose();
  }
}
