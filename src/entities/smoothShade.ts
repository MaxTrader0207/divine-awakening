import * as THREE from 'three';

/**
 * 依「摺角」重算平滑法線（v1.50，訓獸師）
 * ------------------------------------------------------------
 * KayKit 模型是平面著色（每個面各自的法線），鬍子、熊頭帽在近看時一格一格的。
 * 這裡把同一位置的頂點、夾角小於 creaseDeg 的相鄰面法線平均起來：
 * 圓弧的地方變平滑，真正的稜角（帽緣、靴底、皮帶邊）仍保持銳利。
 * 只改 normal 屬性，不合併頂點（UV、蒙皮權重都不動），蒙皮網格也能用。
 */
export function smoothByCrease(src: THREE.BufferGeometry, creaseDeg = 55): THREE.BufferGeometry {
  const geo = src.index ? src.toNonIndexed() : src.clone();
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const n = pos.count;
  const tris = Math.floor(n / 3);
  // 面法線（未正規化 = 依面積加權）
  const fn = new Float32Array(tris * 3);
  const fu = new Float32Array(tris * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    c.sub(b);
    a.sub(b);
    c.cross(a);
    fn.set([c.x, c.y, c.z], t * 3);
    const len = c.length() || 1;
    fu.set([c.x / len, c.y / len, c.z / len], t * 3);
  }
  // 同位置的頂點分組（量化到 1e-4）
  const groups = new Map<string, number[]>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < n; i++) {
    const k = key(i);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(i);
  }
  const cosLim = Math.cos((creaseDeg * Math.PI) / 180);
  const out = new Float32Array(n * 3);
  for (const list of groups.values()) {
    for (const i of list) {
      const ti = Math.floor(i / 3);
      let x = 0;
      let y = 0;
      let z = 0;
      for (const j of list) {
        const tj = Math.floor(j / 3);
        const d = fu[ti * 3] * fu[tj * 3] + fu[ti * 3 + 1] * fu[tj * 3 + 1] + fu[ti * 3 + 2] * fu[tj * 3 + 2];
        if (d < cosLim) continue;
        x += fn[tj * 3];
        y += fn[tj * 3 + 1];
        z += fn[tj * 3 + 2];
      }
      const len = Math.hypot(x, y, z) || 1;
      out.set([x / len, y / len, z / len], i * 3);
    }
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return geo;
}
