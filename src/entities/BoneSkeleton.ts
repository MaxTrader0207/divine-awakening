import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Assets } from '@/assets/Assets';

/**
 * 程式骷髏（召喚師的骷髏用）
 * ------------------------------------------------------------
 * KayKit 骷髏是Q版大頭，在遊戲的斜俯視鏡頭下只看得到一顆白色圓頭，看不出是骷髏。
 * 這裡改成「骨架感」強的骷髏：細長的手腳骨與關節、一根根肋骨、
 * 有黑色眼窩 / 鼻孔 / 牙齒的頭骨，每個關節都會動。
 *
 * 結構（面向 +z）：
 *   root
 *   ├─ torso（脊椎、肋骨、胸骨、骨盆、鎖骨）── 1 個網格
 *   ├─ head pivot（頭骨、下顎、牙齒 ＋ 黑色眼窩 / 鼻孔 ＋ 帽子 / 頭盔）
 *   ├─ armL / armR pivot（上臂、手肘、前臂、手；右手拿武器、左手可拿盾）
 *   └─ legL / legR pivot（大腿、膝蓋、小腿、腳）
 * 每個 pivot 內的零件合併成一個網格（每副骷髏約 8~10 個 draw call）。
 */
export type BoneStyle = 'soldier' | 'mage' | 'guard';

export interface BoneRig {
  root: THREE.Group;
  head: THREE.Group;
  torso: THREE.Object3D;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  /** 眼睛的世界位置參考點（head 內的區域座標） */
  eyePos: THREE.Vector3[];
  /** 武器（杖頂光球掛在這上面） */
  weapon: THREE.Object3D | null;
  /** 法杖頂端（head 以外，掛在 weapon 內的區域座標） */
  staffTip: THREE.Vector3 | null;
  /** 會受擊閃白的材質 */
  materials: THREE.MeshLambertMaterial[];
  /** 自己建立、要釋放的資源 */
  owned: { dispose(): void }[];
}

/** 一個零件：幾何＋擺放位置 */
type Part = [THREE.BufferGeometry, number, number, number, number?, number?, number?, number?, number?, number?, number?];

/** 骨頭、眼窩、帽子、鐵盔的顏色（同一個網格內用頂點顏色區分，省 draw call） */
const C = { bone: 0xf3eedf, dark: 0x1c1428, hat: 0x5b3a92, iron: 0x6d7280 };

/**
 * 把零件合併成一個網格：位置、旋轉、縮放先烘進頂點，每個零件可以有自己的顏色（第 11 個欄位，預設骨頭色）。
 * 一個關節群組只有 1 個 draw call。
 */
function merged(parts: Part[], mat: THREE.Material, owned: { dispose(): void }[], shadow = false): THREE.Mesh {
  const tmp = new THREE.Color();
  const geos = parts.map(([g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color = C.bone]) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const gg = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    gg.deleteAttribute('uv');
    g.dispose();
    tmp.setHex(color).convertSRGBToLinear();
    const n = gg.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([tmp.r, tmp.g, tmp.b], i * 3);
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return gg;
  });
  const geo = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  geo.computeVertexNormals();
  owned.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = shadow;
  return mesh;
}

const cyl = (r0: number, r1: number, len: number, seg = 6) => new THREE.CylinderGeometry(r0, r1, len, seg);
const sph = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);

/** 掛一件 KayKit 武器，長邊縮放到 length 公尺；回傳包裝群組（握把在原點、沿 +y） */
function weaponModel(id: string, length: number, owned: { dispose(): void }[], glow: number): THREE.Object3D | null {
  const w = Assets.cloneStatic(id);
  if (!w) return null;
  const size = Assets.size(id);
  const long = Math.max(size.x, size.y, size.z) || 1;
  w.scale.setScalar(length / long);
  w.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = false; // 武器不投影子（省 draw call）
    const mat = (m.material as THREE.MeshLambertMaterial).clone();
    mat.emissive = new THREE.Color(glow * 0.35, glow * 0.1, glow * 0.55);
    m.material = mat;
    owned.push(mat);
  });
  const g = new THREE.Group();
  g.add(w);
  return g;
}

export function buildBoneSkeleton(style: BoneStyle, height: number, glow: number): BoneRig {
  const owned: { dispose(): void }[] = [];
  const u = height / 2.1; // 以 2.1m 的斯巴達亡靈為基準
  // 一副骷髏只用一個材質（頂點顏色）：受擊閃白只要改這個材質的 emissive
  const bone = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow * 0.3, glow * 0.1, glow * 0.45), flatShading: true });
  owned.push(bone);
  const materials = [bone];
  const root = new THREE.Group();

  /* ---------- 軀幹：脊椎、肋骨、胸骨、骨盆、鎖骨 ---------- */
  const torsoParts: Part[] = [];
  // 脊椎（一節一節）
  for (let i = 0; i < 7; i++) torsoParts.push([sph(0.052 * u, 6, 4), 0, (0.86 + i * 0.09) * u, -0.07 * u, 0, 0, 0, 1, 0.75, 1]);
  torsoParts.push([cyl(0.03 * u, 0.03 * u, 0.62 * u), 0, 1.15 * u, -0.07 * u]);
  // 肋骨：水平的弧（從上往下看得到一根根），開口在背後的脊椎
  for (let i = 0; i < 5; i++) {
    const r = (0.215 - Math.abs(i - 1.2) * 0.018) * u;
    const y = (1.42 - i * 0.085) * u;
    torsoParts.push([new THREE.TorusGeometry(r, 0.024 * u, 4, 14, Math.PI * 1.55), 0, y, 0.02 * u, Math.PI / 2, 0, -Math.PI / 2 - Math.PI * 0.775 + Math.PI, 1, 0.82, 1]);
  }
  // 胸骨
  torsoParts.push([box(0.06 * u, 0.36 * u, 0.04 * u), 0, 1.27 * u, 0.22 * u]);
  // 鎖骨（肩膀）
  torsoParts.push([cyl(0.032 * u, 0.032 * u, 0.56 * u), 0, 1.5 * u, 0.02 * u, 0, 0, Math.PI / 2]);
  // 骨盆
  torsoParts.push([new THREE.TorusGeometry(0.14 * u, 0.045 * u, 5, 10, Math.PI), 0, 0.8 * u, 0, Math.PI / 2, 0, Math.PI, 1, 0.7, 1]);
  torsoParts.push([box(0.3 * u, 0.08 * u, 0.12 * u), 0, 0.79 * u, -0.05 * u]);
  const torsoExtra: Part[] = [];
  if (style === 'guard') {
    // 肩甲
    torsoExtra.push([new THREE.SphereGeometry(0.14 * u, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), -0.3 * u, 1.48 * u, 0.02 * u, 0, 0, 0.35, 1, 1, 1, C.iron]);
    torsoExtra.push([new THREE.SphereGeometry(0.14 * u, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.3 * u, 1.48 * u, 0.02 * u, 0, 0, -0.35, 1, 1, 1, C.iron]);
  }
  const torso = merged([...torsoParts, ...torsoExtra], bone, owned, true);
  root.add(torso);

  /* ---------- 頭 ---------- */
  const head = new THREE.Group();
  head.position.set(0, 1.56 * u, 0.02 * u);
  root.add(head);
  const skullR = 0.27 * u;
  // 眼窩要凸出頭骨表面（頭骨前緣約 z = 0.28u），否則會被頭骨擋住
  const eyePos = [-1, 1].map((s) => new THREE.Vector3(s * 0.105 * u, 0.25 * u, 0.3 * u));
  const headParts: Part[] = [
    [cyl(0.035 * u, 0.04 * u, 0.12 * u), 0, 0, -0.04 * u], // 脖子
    [sph(skullR, 12, 9), 0, 0.27 * u, 0, 0, 0, 0, 1, 0.95, 1.05],
    // 臉頰 / 上顎
    [box(0.36 * u, 0.12 * u, 0.26 * u), 0, 0.12 * u, 0.06 * u],
    // 下顎
    [box(0.3 * u, 0.07 * u, 0.24 * u), 0, 0.03 * u, 0.08 * u],
    // 黑色眼窩、鼻孔
    [sph(0.1 * u, 7, 5), eyePos[0].x, eyePos[0].y, eyePos[0].z - 0.05 * u, 0, 0, 0, 1, 1.15, 0.6, C.dark],
    [sph(0.1 * u, 7, 5), eyePos[1].x, eyePos[1].y, eyePos[1].z - 0.05 * u, 0, 0, 0, 1, 1.15, 0.6, C.dark],
    [new THREE.ConeGeometry(0.04 * u, 0.08 * u, 3), 0, 0.165 * u, 0.275 * u, Math.PI, 0, 0, 1, 1, 1, C.dark],
  ];
  // 牙齒
  for (let i = 0; i < 6; i++) headParts.push([box(0.035 * u, 0.05 * u, 0.03 * u), (-0.11 + i * 0.044) * u, 0.075 * u, 0.2 * u]);
  // 帽子 / 頭盔
  if (style === 'mage') {
    headParts.push([new THREE.CylinderGeometry(0.36 * u, 0.36 * u, 0.03 * u, 12), 0, 0.42 * u, -0.01 * u, 0, 0, 0, 1, 1, 1, C.hat]);
    headParts.push([new THREE.ConeGeometry(0.22 * u, 0.55 * u, 10), 0, 0.68 * u, -0.06 * u, -0.25, 0, 0, 1, 1, 1, C.hat]);
  } else if (style === 'guard') {
    headParts.push([new THREE.SphereGeometry(skullR * 1.08, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.3 * u, -0.01 * u, 0, 0, 0, 1, 1, 1, C.iron]);
    headParts.push([box(0.06 * u, 0.24 * u, 0.06 * u), 0, 0.26 * u, 0.28 * u, 0, 0, 0, 1, 1, 1, C.iron]); // 護鼻
    headParts.push([new THREE.ConeGeometry(0.06 * u, 0.32 * u, 6), -0.3 * u, 0.52 * u, 0, 0, 0, 0.9, 1, 1, 1, C.iron]); // 角
    headParts.push([new THREE.ConeGeometry(0.06 * u, 0.32 * u, 6), 0.3 * u, 0.52 * u, 0, 0, 0, -0.9, 1, 1, 1, C.iron]);
  }
  head.add(merged(headParts, bone, owned, true));

  /* ---------- 手臂（pivot 在肩膀；手肘微彎，前臂往前） ---------- */
  const arm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.29 * u, 1.48 * u, 0.02 * u);
    root.add(g);
    g.add(
      merged(
        [
          [sph(0.05 * u, 6, 4), 0, 0, 0],
          [cyl(0.032 * u, 0.026 * u, 0.32 * u), 0, -0.16 * u, 0],
          [sph(0.04 * u, 6, 4), 0, -0.33 * u, 0],
          [cyl(0.026 * u, 0.022 * u, 0.3 * u), 0, -0.45 * u, 0.1 * u, 0.6, 0, 0],
          // 手掌＋指骨
          [box(0.07 * u, 0.06 * u, 0.08 * u), 0, -0.56 * u, 0.2 * u],
          [box(0.012 * u, 0.06 * u, 0.012 * u), -0.022 * u, -0.6 * u, 0.24 * u],
          [box(0.012 * u, 0.06 * u, 0.012 * u), 0.0, -0.61 * u, 0.245 * u],
          [box(0.012 * u, 0.06 * u, 0.012 * u), 0.022 * u, -0.6 * u, 0.24 * u],
        ],
        bone,
        owned,
      ),
    );
    return g;
  };
  const armL = arm(-1);
  const armR = arm(1);
  const handPos = new THREE.Vector3(0, -0.56 * u, 0.21 * u);

  /* ---------- 腿（pivot 在髖關節） ---------- */
  const leg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.12 * u, 0.8 * u, 0);
    root.add(g);
    g.add(
      merged(
        [
          [sph(0.055 * u, 6, 4), 0, 0, 0],
          [cyl(0.036 * u, 0.03 * u, 0.36 * u), 0, -0.19 * u, 0],
          [sph(0.05 * u, 6, 4), 0, -0.38 * u, 0.01 * u], // 膝蓋
          [cyl(0.03 * u, 0.025 * u, 0.36 * u), 0, -0.57 * u, 0],
          [box(0.1 * u, 0.05 * u, 0.2 * u), 0, -0.77 * u, 0.05 * u], // 腳
        ],
        bone,
        owned,
      ),
    );
    return g;
  };
  const legL = leg(-1);
  const legR = leg(1);

  /* ---------- 武器 ---------- */
  let weapon: THREE.Object3D | null = null;
  let staffTip: THREE.Vector3 | null = null;
  const W = { soldier: ['skel_blade', 0.95], mage: ['skel_staff', 1.75], guard: ['skel_axe', 1.15] } as const;
  const [wid, wlen] = W[style];
  weapon = weaponModel(wid, wlen * u, owned, glow);
  if (weapon) {
    weapon.position.copy(handPos);
    // 握把在手上、刀身朝前上方（站姿）；揮砍時整隻手臂一起轉
    weapon.rotation.x = style === 'mage' ? 0.15 : 1.1;
    if (style === 'mage') weapon.position.y -= wlen * u * 0.35; // 杖握在中段
    armR.add(weapon);
    if (style === 'mage') staffTip = new THREE.Vector3(0, wlen * u, 0);
  } else {
    // 沒有武器模型：用骨頭色的棍子
    const stick = merged([[cyl(0.03 * u, 0.03 * u, wlen * u), 0, (wlen * u) / 2, 0]], bone, owned);
    weapon = new THREE.Group();
    weapon.add(stick);
    weapon.position.copy(handPos);
    weapon.rotation.x = style === 'mage' ? 0.15 : 1.1;
    armR.add(weapon);
    if (style === 'mage') staffTip = new THREE.Vector3(0, wlen * u, 0);
  }
  if (style === 'guard') {
    const shield = weaponModel('skel_shield_large', 0.85 * u, owned, glow);
    if (shield) {
      // 大盾掛在左前臂外側
      shield.position.set(-0.08 * u, -0.45 * u, 0.12 * u);
      shield.rotation.set(0, -Math.PI / 2 + 0.25, 0);
      armL.add(shield);
    }
  }

  return { root, head, torso, armL, armR, legL, legR, eyePos, weapon, staffTip, materials, owned };
}

/** 骷髏動作狀態 */
export interface BonePose {
  t: number;
  /** 走路相位 */
  walk: number;
  moving: number;
  /** 攻擊：剩餘秒數與總長（0 = 沒在攻擊） */
  swingT: number;
  swingTotal: number;
  /** 前搖佔攻擊總長的比例 */
  windupFrac: number;
  /** 受擊後仰 */
  hitT: number;
  /** 施法（雙手舉起） */
  cast: boolean;
}

/** 每幀擺姿勢 */
export function poseBones(r: BoneRig, p: BonePose, dt: number, style: BoneStyle) {
  // 走路：手腳交替擺動
  const walkAmt = Math.min(1, p.moving);
  if (walkAmt > 0.05) p.walk += dt * 9;
  const sw = Math.sin(p.walk) * walkAmt;
  r.legL.rotation.x = sw * 0.65;
  r.legR.rotation.x = -sw * 0.65;
  r.armL.rotation.x = -sw * 0.45;
  let armR = sw * 0.45;
  r.armL.rotation.z = -0.08;
  r.armR.rotation.z = 0.08;
  // 待機：上下輕晃、頭微微歪、下巴開合的感覺用頭點
  const idle = 1 - walkAmt;
  r.root.position.y = Math.abs(Math.sin(p.walk)) * 0.04 * walkAmt + Math.sin(p.t * 2.2) * 0.015 * idle;
  r.head.rotation.z = Math.sin(p.t * 1.3) * 0.08 * idle;
  // 頭微微仰起：鏡頭是從高處斜看下來，仰頭臉才會朝向鏡頭（看得到眼窩和牙齒）
  r.head.rotation.x = -0.18 + Math.sin(p.t * 5.5) * 0.04;

  // 攻擊
  if (p.swingT > 0) {
    p.swingT = Math.max(0, p.swingT - dt);
    const k = 1 - p.swingT / p.swingTotal; // 0 → 1
    if (p.cast) {
      // 提瑞西阿斯亡靈：雙手舉杖
      const up = k < p.windupFrac ? k / p.windupFrac : 1 - (k - p.windupFrac) / (1 - p.windupFrac);
      armR = -2.3 * up;
      r.armL.rotation.x = -2.1 * up;
      r.armL.rotation.z = -0.4 * up;
    } else if (k < p.windupFrac) {
      // 舉起
      armR = -2.6 * (k / p.windupFrac);
      r.root.rotation.x = -0.12 * (k / p.windupFrac);
    } else {
      // 劈下
      const d = (k - p.windupFrac) / (1 - p.windupFrac);
      armR = -2.6 + 3.4 * Math.min(1, d * 2.5) - Math.max(0, d - 0.4) * 0.8;
      r.root.rotation.x = 0.18 * Math.sin(Math.min(1, d * 2) * Math.PI);
    }
  } else r.root.rotation.x *= 0.8;
  r.armR.rotation.x = armR;
  if (style === 'guard') r.armL.rotation.x = Math.min(r.armL.rotation.x, -0.5); // 巨衛舉盾

  // 受擊後仰
  if (p.hitT > 0) {
    p.hitT = Math.max(0, p.hitT - dt);
    r.torso.rotation.x = -0.25 * (p.hitT / 0.25);
    r.head.rotation.x -= 0.3 * (p.hitT / 0.25);
  } else r.torso.rotation.x = 0;
}
