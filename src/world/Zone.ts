import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PlatformDef, PortalDef, ZoneDef } from '@/data/types';

/** 石階長度（公尺） */
const RAMP = 3.5;
import { CollisionWorld } from './Collision';
import { buildProp, PROP_DEFAULTS, mat } from './Props';
import { makeLabelSprite } from './Label';
import { Critters } from './Critters';

/**
 * Zone：一個已載入的區域（場景物件 + 碰撞 + 傳送點）。
 * 由 ZoneManager 建立與銷毀；切換區域時整個 group 會被 dispose。
 */
export class Zone {
  readonly def: ZoneDef;
  readonly group = new THREE.Group();
  readonly collision = new CollisionWorld();
  private animated: { obj: THREE.Object3D; kind: 'spin' | 'pulse'; phase: number }[] = [];
  /** 城裡的小動物（ZoneDef.critters） */
  critters: Critters | null = null;
  private critterEnv = { collision: this.collision, heightAt: (x: number, z: number) => this.heightAt(x, z), bounds: this.collision.bounds };
  private t = 0;

  constructor(def: ZoneDef) {
    this.def = def;
    this.build();
  }

  private build() {
    const { def } = this;
    const { w, d } = def.size;
    this.collision.bounds = { minX: -w / 2, maxX: w / 2, minZ: -d / 2, maxZ: d / 2 };

    // 地面：比可走範圍大一圈，避免鏡頭看到邊界外的虛空
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(w + 60, d + 60), mat(darken(def.groundColor, 0.88)));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);

    const playable = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(def.groundColor));
    playable.rotation.x = -Math.PI / 2;
    playable.receiveShadow = true;
    this.group.add(playable);

    // 色塊：道路、沙地、水
    def.patches.forEach((p, i) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(p.w, p.d),
        p.water ? new THREE.MeshLambertMaterial({ color: p.color, transparent: true, opacity: 0.92 }) : mat(p.color),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.01 + i * 0.004, p.z);
      m.receiveShadow = true;
      this.group.add(m);
      if (p.water) {
        this.collision.addBox(p.x, p.z, p.w, p.d);
        this.animated.push({ obj: m, kind: 'pulse', phase: i });
      }
    });

    for (const pf of def.platforms ?? []) this.buildPlatform(pf);

    // 靜態物件與碰撞（放在高台上的物件會自動墊高）
    for (const p of def.props) {
      const obj = buildProp(p);
      obj.position.y = this.heightAt(p.x, p.z);
      this.group.add(obj);
      const pd = PROP_DEFAULTS[p.kind];
      if (!(p.solid ?? pd.solid)) continue;
      const pw = p.w ?? pd.w;
      const pdd = p.d ?? pd.d;
      if (pd.round) this.collision.addCircle(p.x, p.z, Math.max(pw, pdd) * 0.45);
      else if (p.rot && Math.abs(Math.sin(p.rot)) > 0.7) this.collision.addBox(p.x, p.z, pdd, pw);
      else this.collision.addBox(p.x, p.z, pw, pdd);
    }

    for (const portal of def.portals) this.group.add(this.buildPortal(portal));
    this.mergeStatic();
    if (def.critters?.length) {
      this.critterEnv.bounds = this.collision.bounds;
      this.critters = new Critters(def.critters, this.critterEnv);
      this.group.add(this.critters.mesh);
    }
    if (def.mist) this.buildMist();
    for (const t of def.triggers ?? []) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(t.radius - 0.18, t.radius, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.85, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(t.x, 0.04, t.z);
      this.group.add(ring);
      this.animated.push({ obj: ring, kind: 'pulse', phase: 2 });
    }
  }

  /**
   * 效能：把不會動、使用共用材質的靜態網格依材質合併成一個網格。
   * 場景物件（房子、樹、石頭、高台、石柱…）原本每個零件一個 draw call，合併後每種顏色一個。
   */
  private mergeStatic() {
    this.group.updateMatrixWorld(true);
    const animated = new Set(this.animated.map((a) => a.obj));
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const remove: THREE.Mesh[] = [];
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || animated.has(m) || Array.isArray(m.material)) return;
      const mat = m.material as THREE.Material;
      if (!mat.userData.shared) return;
      const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      // 量化（meshopt）的屬性轉回 Float32，才能跟其他網格合併
      const g = new THREE.BufferGeometry();
      const textured = !!(mat as THREE.MeshLambertMaterial).map;
      for (const name of textured ? ['position', 'normal', 'uv'] : ['position', 'normal']) {
        const a = src.getAttribute(name) as THREE.BufferAttribute | undefined;
        if (!a) continue;
        const out = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
        g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
      }
      src.dispose();
      g.applyMatrix4(m.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (textured && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      let list = byMat.get(mat);
      if (!list) byMat.set(mat, (list = []));
      list.push(g);
      remove.push(m);
    });
    for (const m of remove) {
      if (!m.geometry.userData.shared) m.geometry.dispose(); // 模型庫的幾何是共用的，不能釋放
      m.removeFromParent();
    }
    for (const [mat, geos] of byMat) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  /** 飄動的霧：幾片大型半透明貼圖，緩慢漂移（只是氛圍，不影響玩法） */
  private mist: THREE.Mesh[] = [];
  private buildMist() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const matl = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: this.def.fogColor, opacity: 0.55 });
    const { w, d } = this.def.size;
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), matl);
      m.rotation.x = -Math.PI / 2;
      m.position.set((Math.random() - 0.5) * w, 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * d);
      m.userData.speed = 0.4 + Math.random() * 0.6;
      m.renderOrder = 6;
      this.group.add(m);
      this.mist.push(m);
    }
  }

  /** 地面高度（高台、石階）；角色、敵人、特效都用它決定 y */
  heightAt(x: number, z: number): number {
    let y = 0;
    for (const pf of this.def.platforms ?? []) {
      const hw = pf.w / 2;
      const hd = pf.d / 2;
      if (x >= pf.x - hw && x <= pf.x + hw && z >= pf.z - hd && z <= pf.z + hd) y = Math.max(y, pf.h);
      else if (pf.stairs) {
        const s = pf.stairs;
        const z0 = pf.z + hd;
        if (Math.abs(x - s.x) <= s.width / 2 && z > z0 && z < z0 + RAMP) y = Math.max(y, pf.h * (1 - (z - z0) / RAMP));
      }
    }
    return y;
  }

  private buildPlatform(pf: PlatformDef) {
    const color = pf.color ?? this.def.groundColor;
    const top = new THREE.Mesh(new THREE.BoxGeometry(pf.w, pf.h, pf.d), [
      mat(darkenHex(color, 0.7)), mat(darkenHex(color, 0.7)), mat(color), mat(darkenHex(color, 0.6)), mat(darkenHex(color, 0.75)), mat(darkenHex(color, 0.75)),
    ]);
    top.position.set(pf.x, pf.h / 2, pf.z);
    top.receiveShadow = true;
    top.castShadow = true;
    this.group.add(top);
    // 峭壁邊緣的石塊裝飾
    const rim = mat(darkenHex(color, 0.55));
    for (let i = 0; i < Math.floor(pf.w / 2.2); i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + (i % 3) * 0.15, 0), rim);
      r.position.set(pf.x - pf.w / 2 + 1 + i * 2.2, 0.3, pf.z - pf.d / 2 - 0.2);
      r.castShadow = true;
      this.group.add(r);
    }

    const hw = pf.w / 2;
    const hd = pf.d / 2;
    const T = 0.5;
    // 北、西、東三邊整段擋住
    this.collision.addBox(pf.x, pf.z - hd, pf.w + T, T);
    this.collision.addBox(pf.x - hw, pf.z, T, pf.d + T);
    this.collision.addBox(pf.x + hw, pf.z, T, pf.d + T);
    // 南邊：留出石階缺口
    if (pf.stairs) {
      const s = pf.stairs;
      const gapL = s.x - s.width / 2;
      const gapR = s.x + s.width / 2;
      const leftW = gapL - (pf.x - hw);
      const rightW = pf.x + hw - gapR;
      if (leftW > 0) this.collision.addBox(pf.x - hw + leftW / 2, pf.z + hd, leftW, T);
      if (rightW > 0) this.collision.addBox(gapR + rightW / 2, pf.z + hd, rightW, T);
      // 石階兩側的矮牆
      this.collision.addBox(gapL - 0.2, pf.z + hd + RAMP / 2, 0.4, RAMP);
      this.collision.addBox(gapR + 0.2, pf.z + hd + RAMP / 2, 0.4, RAMP);
      const steps = 6;
      const stepD = RAMP / steps;
      for (let i = 0; i < steps; i++) {
        const sh = pf.h * (1 - i / steps);
        const st = new THREE.Mesh(new THREE.BoxGeometry(s.width, sh, stepD), mat(0xe9e2d0));
        st.position.set(s.x, sh / 2, pf.z + hd + stepD * (i + 0.5));
        st.receiveShadow = true;
        st.castShadow = true;
        this.group.add(st);
      }
      for (const sx of [gapL - 0.2, gapR + 0.2]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, pf.h * 0.9, RAMP), mat(0xcfc6b0));
        wall.position.set(sx, pf.h * 0.45, pf.z + hd + RAMP / 2);
        wall.castShadow = true;
        this.group.add(wall);
      }
    } else this.collision.addBox(pf.x, pf.z + hd, pf.w + T, T);
  }

  private buildPortal(p: PortalDef): THREE.Object3D {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    if (p.style === 'stone') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(p.radius, p.radius + 0.2, 0.3, 8), mat(0xc9c2b4));
      base.position.y = 0.15;
      base.receiveShadow = true;
      g.add(base);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshLambertMaterial({ color: 0x6fe3ff, emissive: 0x2a9fd0, flatShading: true }),
      );
      crystal.position.y = 1.8;
      crystal.scale.y = 1.6;
      crystal.castShadow = true;
      g.add(crystal);
      this.animated.push({ obj: crystal, kind: 'spin', phase: 0 });
    } else {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(p.radius, p.radius, 3.2, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.position.y = 1.6;
      g.add(beam);
      this.animated.push({ obj: beam, kind: 'pulse', phase: 1 });
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.radius - 0.25, p.radius, 32),
      new THREE.MeshBasicMaterial({ color: 0xbff6ff, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.32;
    g.add(ring);

    const label = makeLabelSprite(p.label, { fontSize: 40, color: '#fff7d6', bg: 'rgba(30,36,52,0.72)', scale: 1.1 });
    label.userData.dodge = true; // 被 HUD 按鈕蓋住時自動往上抬（LabelDodger）
    label.position.y = p.style === 'stone' ? 3.6 : 3.8;
    g.add(label);
    return g;
  }

  /** px / pz：玩家位置（小動物會對玩家有反應） */
  update(dt: number, px = 0, pz = 0) {
    this.t += dt;
    this.critters?.update(dt, px, pz, this.critterEnv);
    const hw = this.def.size.w / 2 + 7;
    for (const m of this.mist) {
      m.position.x += m.userData.speed * dt;
      if (m.position.x > hw) m.position.x = -hw;
    }
    for (const a of this.animated) {
      if (a.kind === 'spin') {
        a.obj.rotation.y += dt * 1.2;
        a.obj.position.y = 1.8 + Math.sin(this.t * 2) * 0.15;
      } else {
        const m = (a.obj as THREE.Mesh).material as THREE.Material & { opacity: number };
        m.opacity = (a.phase === 1 ? 0.22 : 0.85) + Math.sin(this.t * 2 + a.phase) * 0.06;
      }
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
      // 共用材質（mat()）不 dispose；Sprite / 個別材質才 dispose
      const material = (m as { material?: THREE.Material | THREE.Material[] }).material;
      if (material && !Array.isArray(material) && !material.userData.shared) {
        const map = (material as THREE.SpriteMaterial).map;
        map?.dispose();
        material.dispose();
      }
    });
    this.group.removeFromParent();
  }
}

function darkenHex(hex: number, f: number): number {
  return new THREE.Color(hex).multiplyScalar(f).getHex();
}

function darken(hex: number, f: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}
