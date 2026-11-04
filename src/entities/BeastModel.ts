import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BonePose } from './BoneSkeleton';
import { BossLook } from './enemyShapes/bossLook';

/**
 * 程式野獸（訓獸師的夥伴）
 * ------------------------------------------------------------
 * 斯巴達獵犬（hound）：壯實的獵犬，黃褐毛色、黑口鼻、青銅項圈，四腳奔跑、撲咬。
 * 宙斯神鷹（eagle）：白頭金喙的大鷹，飛在半空拍翅，出手時俯衝。
 * 卡呂冬巨熊（bear）：壯碩的棕熊，出手前人立而起、再整個撲下來。
 *
 * 結構（面向 +z）：root → body（身體）／head pivot（頭、耳、口鼻；jaw 下顎）／legs[4] pivot／tail pivot／wings[2] pivot（神鷹）
 * 每個 pivot 內的零件用頂點顏色合併成 1 個網格；一隻野獸只有 1 個材質（受擊閃白只改這個材質）。
 *
 * v1.50 平滑化：零件保留各自的平滑法線（不再轉成平面著色）、分段數提高、
 * 方塊口鼻 / 下顎 / 羽毛改成橢球與膠囊；材質改用首領的 BossLook（柔和高光＋地面遮蔽＋輪廓光）；
 * 腳、頭、下顎、尾巴、翅膀的姿勢每幀緩動，出手不會跳格。
 */
export type BeastKind = 'hound' | 'eagle' | 'bear';

export interface BeastRig {
  kind: BeastKind;
  root: THREE.Group;
  body: THREE.Object3D;
  head: THREE.Group;
  jaw: THREE.Group | null;
  /** 前左、前右、後左、後右（神鷹沒有） */
  legs: THREE.Group[];
  tail: THREE.Group | null;
  /** 左、右翅（神鷹） */
  wings: THREE.Group[];
  /** 眼睛位置（head 內座標） */
  eyePos: THREE.Vector3[];
  /** 飛行高度（神鷹） */
  fly: number;
  materials: THREE.MeshPhongMaterial[];
  /** 高光、地面遮蔽、輪廓光（每幀由 Minion 更新腳底高度） */
  look: BossLook;
  owned: { dispose(): void }[];
}

type Part = [THREE.BufferGeometry, number, number, number, number?, number?, number?, number?, number?, number?, number?];

/** 毛色 */
const C = {
  tan: 0xc08a4e,
  tanDark: 0x8a5a30,
  cream: 0xe8d2a8,
  black: 0x1c1612,
  bronze: 0xd09a3a,
  brown: 0x6a4428,
  brownDark: 0x4a2e1a,
  muzzle: 0xb08a62,
  ivory: 0xf0e6cc,
  white: 0xf6f2ea,
  gold: 0xf2b632,
  feather: 0x5a3a22,
  featherTip: 0xe8c070,
  red: 0xb8382a,
};

/** 零件合併：保留各零件自己的平滑法線（applyMatrix4 會用法線矩陣一起轉換），只加上頂點顏色 */
function merged(parts: Part[], mat: THREE.Material, owned: { dispose(): void }[], shadow = false): THREE.Mesh {
  const tmp = new THREE.Color();
  const geos = parts.map(([g, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color = C.tan]) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const gg = (g.index ? g : g.toNonIndexed()).applyMatrix4(m);
    gg.deleteAttribute('uv');
    if (!gg.index) gg.setIndex([...Array(gg.getAttribute('position').count).keys()]);
    tmp.setHex(color).convertSRGBToLinear();
    const n = gg.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([tmp.r, tmp.g, tmp.b], i * 3);
    gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return gg;
  });
  const geo = mergeGeometries(geos)!;
  geos.forEach((g) => g.dispose());
  owned.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = shadow;
  return mesh;
}

const sph = (r: number, w = 22, h = 14) => new THREE.SphereGeometry(r, w, h);
const cone = (r: number, len: number, seg = 14) => new THREE.ConeGeometry(r, len, seg);
/** 膠囊（沿 y 軸；len 是中段長度） */
const cap = (r: number, len: number, seg = 16) => new THREE.CapsuleGeometry(r, len, 6, seg);
const HALF = Math.PI / 2;

function pivot(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** 四腳獸的一條腿（pivot 在肩 / 髖，往下長）：一整段車削曲面，大腿粗、膝蓋微凸、腳踝細，不會有關節接縫 */
function leg(len: number, r: number, color: number, paw: number, claw?: number): Part[] {
  const y0 = -len + r * 0.55;
  const prof: [number, number][] = [
    [0.01, y0 - 0.35 * r],
    [0.55 * r, y0 - 0.2 * r],
    [0.68 * r, y0 + 0.12 * r],
    [0.7 * r, -0.66 * len],
    [0.84 * r, -0.52 * len],
    [0.92 * r, -0.36 * len],
    [1.02 * r, -0.12 * len],
    [0.96 * r, 0.25 * r],
    [0.62 * r, 0.7 * r],
    [0.01, 0.86 * r],
  ];
  const lathe = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18);
  const parts: Part[] = [
    [lathe, 0, 0, 0, 0, 0, 0, 1, 1, 1.08, color],
    [sph(r * 1.05, 16, 10), 0, -len + r * 0.5, r * 0.4, 0, 0, 0, 1, 0.6, 1.4, paw],
  ];
  if (claw !== undefined) for (const cx of [-0.5, 0, 0.5]) parts.push([cone(r * 0.16, r * 0.6, 8), cx * r, -len + r * 0.25, r * 1.6, HALF, 0, 0, 1, 1, 1, claw]);
  return parts;
}

export function buildBeast(kind: BeastKind, height: number, glow: number): BeastRig {
  const owned: { dispose(): void }[] = [];
  const look = new BossLook(kind === 'eagle' ? 0xfff0c0 : kind === 'bear' ? 0xe0b07a : 0xf0c890);
  const mat = new THREE.MeshPhongMaterial({
    vertexColors: true,
    specular: 0x2a2620,
    shininess: 18,
    emissive: new THREE.Color(glow * 0.5, glow * 0.38, glow * 0.12),
  });
  look.apply(mat);
  owned.push(mat);
  const root = new THREE.Group();
  const rig: BeastRig = { kind, root, body: root, head: new THREE.Group(), jaw: null, legs: [], tail: null, wings: [], eyePos: [], fly: 0, materials: [mat], look, owned };
  if (kind === 'hound') buildHound(rig, height / 1.15, mat);
  else if (kind === 'bear') buildBear(rig, height / 1.9, mat);
  else buildEagle(rig, height / 0.9, mat);
  return rig;
}

/* ---------------- 斯巴達獵犬 ---------------- */
function buildHound(r: BeastRig, u: number, mat: THREE.Material) {
  const { root, owned } = r;
  // 比例：胸深、腿短而粗、頭大（像獒犬），從斜上方看才不會像鹿
  const body = merged(
    [
      // 軀幹：橫放的膠囊＋前胸
      [cap(0.22 * u, 0.36 * u), 0, 0.57 * u, -0.02 * u, HALF, 0, 0, 1.08, 1, 1.05, C.tan],
      [sph(0.26 * u), 0, 0.56 * u, 0.2 * u, 0, 0, 0, 1.02, 1.08, 1.05, C.tan],
      [sph(0.17 * u), 0, 0.44 * u, 0.24 * u, 0, 0, 0, 1, 0.7, 1.1, C.cream],
      [sph(0.18 * u), 0, 0.42 * u, -0.08 * u, 0, 0, 0, 0.95, 0.55, 1.6, C.cream],
      // 背上深色鞍斑（貼在背上的扁橢球）
      [sph(0.2 * u), 0, 0.675 * u, -0.06 * u, 0, 0, 0, 1.1, 0.42, 1.7, C.tanDark],
      // 脖子
      [cap(0.14 * u, 0.16 * u), 0, 0.73 * u, 0.4 * u, -0.8, 0, 0, 1.05, 1, 1, C.tan],
      // 青銅項圈＋小鈴
      [new THREE.TorusGeometry(0.155 * u, 0.032 * u, 10, 28), 0, 0.77 * u, 0.45 * u, 0.9, 0, 0, 1, 1, 1, C.bronze],
      [sph(0.045 * u, 12, 8), 0, 0.67 * u, 0.55 * u, 0, 0, 0, 1, 1, 1, C.bronze],
    ],
    mat,
    owned,
    true,
  );
  root.add(body);
  r.body = body;
  // 頭
  const head = pivot(root, 0, 0.86 * u, 0.55 * u);
  head.add(
    merged(
      [
        [sph(0.18 * u), 0, 0.02 * u, 0, 0, 0, 0, 1, 0.92, 1.05, C.tan],
        // 口鼻：往前的膠囊，前端黑色
        [cap(0.085 * u, 0.12 * u), 0, -0.035 * u, 0.2 * u, HALF + 0.1, 0, 0, 1.05, 0.82, 1, C.tan],
        [sph(0.08 * u, 16, 10), 0, -0.03 * u, 0.3 * u, 0.1, 0, 0, 1, 0.78, 0.9, C.black],
        [sph(0.045 * u, 12, 8), 0, 0.015 * u, 0.36 * u, 0, 0, 0, 1.2, 0.85, 1, C.black],
        // 立耳（深色，從上面看得到）
        [cone(0.08 * u, 0.2 * u), -0.11 * u, 0.18 * u, -0.04 * u, -0.25, 0, 0.4, 1, 1, 0.5, C.tanDark],
        [cone(0.08 * u, 0.2 * u), 0.11 * u, 0.18 * u, -0.04 * u, -0.25, 0, -0.4, 1, 1, 0.5, C.tanDark],
        // 眼、眉上的淺色點
        [sph(0.032 * u, 12, 8), -0.085 * u, 0.07 * u, 0.13 * u, 0, 0, 0, 1, 1, 1, C.black],
        [sph(0.032 * u, 12, 8), 0.085 * u, 0.07 * u, 0.13 * u, 0, 0, 0, 1, 1, 1, C.black],
        [sph(0.03 * u, 10, 6), -0.08 * u, 0.12 * u, 0.12 * u, 0, 0, 0, 1, 0.6, 1, C.cream],
        [sph(0.03 * u, 10, 6), 0.08 * u, 0.12 * u, 0.12 * u, 0, 0, 0, 1, 0.6, 1, C.cream],
      ],
      mat,
      owned,
    ),
  );
  const jaw = pivot(head, 0, -0.09 * u, 0.1 * u);
  jaw.add(
    merged(
      [
        [cap(0.05 * u, 0.15 * u), 0, -0.01 * u, 0.11 * u, HALF, 0, 0, 1.35, 0.6, 1, C.tanDark],
        [sph(0.05 * u, 12, 8), 0, 0.015 * u, 0.17 * u, 0, 0, 0, 1, 0.3, 1.5, C.red],
        [cone(0.014 * u, 0.04 * u, 8), -0.05 * u, 0.03 * u, 0.2 * u, 0, 0, 0, 1, 1, 1, C.ivory],
        [cone(0.014 * u, 0.04 * u, 8), 0.05 * u, 0.03 * u, 0.2 * u, 0, 0, 0, 1, 1, 1, C.ivory],
      ],
      mat,
      owned,
    ),
  );
  r.head = head;
  r.jaw = jaw;
  r.eyePos = [new THREE.Vector3(-0.085 * u, 0.07 * u, 0.15 * u), new THREE.Vector3(0.085 * u, 0.07 * u, 0.15 * u)];
  // 腳：短而粗
  const L = 0.5 * u;
  for (const [x, z] of [
    [-0.15, 0.27],
    [0.15, 0.27],
    [-0.15, -0.3],
    [0.15, -0.3],
  ]) {
    const p = pivot(root, x * u, 0.52 * u, z * u);
    p.add(merged(leg(L, 0.075 * u, C.tan, C.cream), mat, owned));
    r.legs.push(p);
  }
  // 尾巴（往上翹，圓頭漸細）
  const tail = pivot(root, 0, 0.66 * u, -0.48 * u);
  tail.add(
    merged(
      [
        [cone(0.055 * u, 0.4 * u), 0, 0.14 * u, -0.14 * u, -0.75, 0, 0, 1, 1, 1, C.tanDark],
        [sph(0.055 * u, 12, 8), 0, 0, 0, 0, 0, 0, 1, 1, 1, C.tanDark],
      ],
      mat,
      owned,
    ),
  );
  r.tail = tail;
}

/* ---------------- 卡呂冬巨熊 ---------------- */
function buildBear(r: BeastRig, u: number, mat: THREE.Material) {
  const { root, owned } = r;
  const body = merged(
    [
      [sph(0.55 * u, 28, 18), 0, 1.0 * u, -0.12 * u, 0, 0, 0, 1, 0.95, 1.35, C.brown],
      // 肩峰（灰熊的駝背）
      [sph(0.38 * u), 0, 1.36 * u, 0.25 * u, 0, 0, 0, 1.15, 0.8, 1.1, C.brownDark],
      [sph(0.4 * u), 0, 1.05 * u, 0.42 * u, 0, 0, 0, 1.05, 1, 0.9, C.brown],
      // 肚子顏色淺一點
      [sph(0.35 * u), 0, 0.82 * u, 0.1 * u, 0, 0, 0, 1.1, 0.7, 1.4, C.muzzle],
      // 短尾
      [sph(0.1 * u, 12, 8), 0, 1.15 * u, -0.85 * u, 0, 0, 0, 1, 1, 1, C.brownDark],
    ],
    mat,
    owned,
    true,
  );
  root.add(body);
  r.body = body;
  const head = pivot(root, 0, 1.38 * u, 0.82 * u);
  head.add(
    merged(
      [
        [sph(0.3 * u, 24, 16), 0, 0, 0, 0, 0, 0, 1, 0.9, 1, C.brown],
        [sph(0.16 * u), 0, -0.07 * u, 0.26 * u, 0, 0, 0, 1, 0.8, 1.1, C.muzzle],
        [sph(0.06 * u, 12, 8), 0, -0.02 * u, 0.42 * u, 0, 0, 0, 1.2, 0.8, 1, C.black],
        // 圓耳（外圈深色、內側淺色）
        [sph(0.09 * u, 14, 10), -0.21 * u, 0.22 * u, -0.04 * u, 0, 0, 0, 1, 1, 0.55, C.brownDark],
        [sph(0.09 * u, 14, 10), 0.21 * u, 0.22 * u, -0.04 * u, 0, 0, 0, 1, 1, 0.55, C.brownDark],
        [sph(0.05 * u, 12, 8), -0.21 * u, 0.215 * u, -0.005 * u, 0, 0, 0, 1, 1, 0.4, C.muzzle],
        [sph(0.05 * u, 12, 8), 0.21 * u, 0.215 * u, -0.005 * u, 0, 0, 0, 1, 1, 0.4, C.muzzle],
        [sph(0.035 * u, 10, 8), -0.12 * u, 0.08 * u, 0.24 * u, 0, 0, 0, 1, 1, 1, C.black],
        [sph(0.035 * u, 10, 8), 0.12 * u, 0.08 * u, 0.24 * u, 0, 0, 0, 1, 1, 1, C.black],
      ],
      mat,
      owned,
    ),
  );
  const jaw = pivot(head, 0, -0.15 * u, 0.15 * u);
  jaw.add(
    merged(
      [
        [cap(0.06 * u, 0.14 * u), 0, -0.02 * u, 0.1 * u, HALF, 0, 0, 1.6, 0.6, 1, C.muzzle],
        [cone(0.025 * u, 0.07 * u, 8), -0.07 * u, 0.04 * u, 0.2 * u, 0, 0, 0, 1, 1, 1, C.ivory],
        [cone(0.025 * u, 0.07 * u, 8), 0.07 * u, 0.04 * u, 0.2 * u, 0, 0, 0, 1, 1, 1, C.ivory],
      ],
      mat,
      owned,
    ),
  );
  r.head = head;
  r.jaw = jaw;
  r.eyePos = [new THREE.Vector3(-0.12 * u, 0.08 * u, 0.26 * u), new THREE.Vector3(0.12 * u, 0.08 * u, 0.26 * u)];
  const L = 0.8 * u;
  for (const [x, z] of [
    [-0.32, 0.45],
    [0.32, 0.45],
    [-0.32, -0.55],
    [0.32, -0.55],
  ]) {
    const p = pivot(root, x * u, 0.82 * u, z * u);
    p.add(merged(leg(L, 0.16 * u, C.brown, C.brownDark, C.ivory), mat, owned));
    r.legs.push(p);
  }
}

/* ---------------- 宙斯神鷹 ---------------- */
function buildEagle(r: BeastRig, u: number, mat: THREE.Material) {
  const { root, owned } = r;
  r.fly = 1.9 * u;
  const parts: Part[] = [
    [sph(0.2 * u), 0, 0, 0, 0, 0, 0, 1, 0.95, 1.9, C.feather],
    [sph(0.15 * u), 0, -0.04 * u, 0.12 * u, 0, 0, 0, 1, 0.9, 1.4, C.featherTip],
    // 收起的金色爪
    [cone(0.04 * u, 0.16 * u, 10), -0.07 * u, -0.2 * u, 0.02 * u, 2.6, 0, 0, 1, 1, 1, C.gold],
    [cone(0.04 * u, 0.16 * u, 10), 0.07 * u, -0.2 * u, 0.02 * u, 2.6, 0, 0, 1, 1, 1, C.gold],
  ];
  // 扇形尾羽：5 片扁長橢球，白色、末端褐色
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.2;
    parts.push([sph(0.08 * u, 14, 8), Math.sin(a) * 0.3 * u, 0.02 * u, -0.34 * u - Math.cos(a) * 0.14 * u, 0.12, a, 0, 1.1, 0.18, 2.6, C.white]);
    parts.push([sph(0.065 * u, 12, 6), Math.sin(a) * 0.5 * u, 0.03 * u, -0.34 * u - Math.cos(a) * 0.3 * u, 0.12, a, 0, 1.2, 0.2, 1.2, C.feather]);
  }
  const body = merged(parts, mat, owned, true);
  root.add(body);
  r.body = body;
  const head = pivot(root, 0, 0.1 * u, 0.36 * u);
  head.add(
    merged(
      [
        [sph(0.13 * u), 0, 0, 0, 0, 0, 0, 1, 1, 1.1, C.white],
        // 彎鉤金喙：前段圓錐＋往下勾的尖端
        [cone(0.055 * u, 0.15 * u), 0, -0.01 * u, 0.15 * u, HALF + 0.3, 0, 0, 1, 1, 0.8, C.gold],
        [sph(0.05 * u, 12, 8), 0, -0.005 * u, 0.1 * u, 0, 0, 0, 1, 0.85, 1, C.gold],
        [sph(0.022 * u, 10, 8), -0.07 * u, 0.03 * u, 0.08 * u, 0, 0, 0, 1, 1, 1, C.black],
        [sph(0.022 * u, 10, 8), 0.07 * u, 0.03 * u, 0.08 * u, 0, 0, 0, 1, 1, 1, C.black],
      ],
      mat,
      owned,
    ),
  );
  r.head = head;
  r.eyePos = [new THREE.Vector3(-0.07 * u, 0.03 * u, 0.1 * u), new THREE.Vector3(0.07 * u, 0.03 * u, 0.1 * u)];
  // 翅膀：內側（深褐扁橢球）＋外側 6 片長羽（羽尖金色），pivot 在肩
  for (const side of [-1, 1]) {
    const w = pivot(root, side * 0.14 * u, 0.06 * u, 0.06 * u);
    const wp: Part[] = [[sph(0.3 * u, 22, 10), side * 0.3 * u, 0, -0.02 * u, 0, 0, 0, 1, 0.12, 0.62, C.feather]];
    for (let i = 0; i < 6; i++) {
      const x = (0.5 + i * 0.085) * u;
      const len = (0.21 - i * 0.017) * u;
      // 寬到彼此重疊，看起來是一整片羽翼而不是一顆顆
      wp.push([sph(len, 16, 8), side * x, 0.004 * u * i, -0.04 * u - len * 0.5 - i * 0.012 * u, 0, side * -0.11 * i, 0, 0.5, 0.09, 1, i >= 4 ? C.featherTip : C.feather]);
    }
    w.add(merged(wp, mat, owned));
    r.wings.push(w);
  }
}

export function poseBeast(r: BeastRig, p: BonePose, dt: number) {
  const walkAmt = Math.min(1, p.moving);
  const idle = 1 - walkAmt;
  const speed = r.kind === 'bear' ? 7 : r.kind === 'hound' ? 13 : 0;
  if (walkAmt > 0.05) p.walk += dt * speed;
  const s = Math.sin(p.walk);
  const c = Math.cos(p.walk);
  // 攻擊進度：0 蓄力 → 1 出手完（沒在攻擊 = -1）
  let atk = -1;
  if (p.swingT > 0) {
    p.swingT = Math.max(0, p.swingT - dt);
    atk = 1 - p.swingT / p.swingTotal;
  }
  const wind = atk < 0 ? 0 : atk < p.windupFrac ? atk / p.windupFrac : 1 - Math.min(1, ((atk - p.windupFrac) / (1 - p.windupFrac)) * 1.4);
  const strike = atk < p.windupFrac || atk < 0 ? 0 : Math.sin(Math.min(1, (atk - p.windupFrac) / (1 - p.windupFrac)) * Math.PI);

  if (r.kind === 'eagle') {
    // 拍翅：平常慢拍＋滑翔，移動中拍得快
    const flap = p.t * (6 + walkAmt * 4);
    const dive = strike;
    const fold = Math.max(wind * 0.6, dive);
    const aw = 1 - Math.exp(-dt * 24);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      ease(r.wings[i].rotation, 'z', side * (Math.sin(flap) * 0.55 * (1 - fold) + 0.1 - fold * 0.9), aw);
      ease(r.wings[i].rotation, 'y', side * fold * 0.5, aw);
    }
    r.root.position.y = r.fly + Math.sin(flap - 0.6) * 0.08 - dive * r.fly * 0.6 + wind * 0.25;
    r.root.rotation.x = dive * 0.75 - wind * 0.3 + walkAmt * 0.12;
    r.root.position.z = dive * 0.6;
    const ah = 1 - Math.exp(-dt * 10);
    ease(r.head.rotation, 'x', -0.15 + dive * -0.3 + Math.sin(p.t * 2) * 0.05 * idle, ah);
    ease(r.head.rotation, 'y', Math.sin(p.t * 0.9) * 0.4 * idle, ah);
  } else {
    const bear = r.kind === 'bear';
    // 四腳：對角步態（前左＋後右同相）
    const amp = bear ? 0.45 : 0.75;
    const ph = [s, -s, -s, s];
    const legT = ph.map((v) => v * amp * walkAmt);
    const bob = Math.abs(c) * (bear ? 0.05 : 0.07) * walkAmt;
    // 待機呼吸
    const breathe = Math.sin(p.t * (bear ? 1.6 : 2.4)) * 0.012 * idle;
    let rx = (bear ? 0 : -0.04 * walkAmt) + Math.sin(p.walk * 2) * 0.03 * walkAmt;
    let y = bob + breathe;
    let z = 0;
    let head = Math.sin(p.t * 1.7) * 0.06 * idle - walkAmt * 0.08;
    let jaw = 0.05 + Math.max(0, Math.sin(p.t * (bear ? 0.8 : 3))) * (bear ? 0.05 : 0.12) * idle;
    if (atk >= 0) {
      if (bear) {
        // 人立而起 → 撲下
        rx = -0.75 * wind + 0.25 * strike;
        y = 0.1 * wind;
        z = 0.35 * strike;
        legT[0] = -1.6 * wind + 0.6 * strike;
        legT[1] = -1.4 * wind + 0.6 * strike;
        head = -0.3 * wind + 0.3 * strike;
        jaw = 0.5 * Math.max(wind, strike);
      } else {
        // 壓低蓄力 → 往前撲咬
        rx = 0.12 * wind - 0.15 * strike;
        y = -0.12 * wind + 0.12 * strike;
        z = -0.12 * wind + 0.55 * strike;
        legT[0] = legT[1] = -0.9 * strike + 0.3 * wind;
        legT[2] = legT[3] = 0.6 * strike - 0.2 * wind;
        head = 0.2 * wind - 0.15 * strike;
        jaw = 0.65 * Math.max(strike, wind * 0.4);
      }
    }
    // 受擊：縮一下
    if (p.hitT > 0) {
      p.hitT = Math.max(0, p.hitT - dt);
      rx -= 0.18 * (p.hitT / 0.25);
      z -= 0.08 * (p.hitT / 0.25);
    }
    // 平滑（出手瞬間不會跳格）
    const a = 1 - Math.exp(-dt * 22);
    r.root.rotation.x += (rx - r.root.rotation.x) * a;
    r.root.position.y += (y - r.root.position.y) * a;
    r.root.position.z += (z - r.root.position.z) * a;
    // 腳、頭、下顎、尾巴也緩動（腳快、頭慢一點，看起來比較有重量）
    const al = 1 - Math.exp(-dt * 20);
    const ah = 1 - Math.exp(-dt * 12);
    for (let i = 0; i < 4; i++) ease(r.legs[i].rotation, 'x', legT[i], al);
    ease(r.head.rotation, 'x', head, ah);
    ease(r.head.rotation, 'y', Math.sin(p.t * 0.7) * 0.25 * idle, ah);
    if (r.jaw) ease(r.jaw.rotation, 'x', jaw, al);
    if (r.tail) {
      ease(r.tail.rotation, 'y', Math.sin(p.t * (8 + walkAmt * 6)) * (0.35 + 0.2 * idle), al);
      ease(r.tail.rotation, 'x', -0.1 * walkAmt, ah);
    }
  }
}

/** 往目標值緩動（指數平滑，與幀率無關） */
function ease(rot: THREE.Euler, axis: 'x' | 'y' | 'z', target: number, a: number) {
  rot[axis] += (target - rot[axis]) * a;
}
