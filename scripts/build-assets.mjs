/**
 * 素材管線：把 KayKit（CC0）原始模型精簡後輸出到 src/assets/models/
 * ------------------------------------------------------------
 * 用法：node scripts/build-assets.mjs <素材來源資料夾> [只建這些,逗號分隔]（例如 swordsman,sword_1h）
 *   來源資料夾內要有（git clone 自 github.com/KayKit-Game-Assets）：
 *     KayKit-Character-Pack-Adventures-1.0
 *     KayKit-Character-Pack-Skeletons-1.0
 *     KayKit-Medieval-Hexagon-Pack-1.0
 *     KayKit-Dungeon-Remastered-1.0
 *     converted/Frog_Quaternius.glb  ← Quaternius Easy Animated Enemy Pack 的 Frog.fbx 用 FBX2glTF 轉出（見 CREDITS.md）
 * 做的事：只保留需要的動畫與零件 → 重新取樣動畫 → 去重 → 清除未使用資源 → 輸出 .glb
 * 輸出兩份：
 *   src/assets/models/        meshopt 壓縮（最小，但瀏覽器要用 WebAssembly 解壓）→ 一般版（GitHub Pages、App）
 *   src/assets/models-plain/  只做量化（KHR_mesh_quantization，瀏覽器原生支援）→ 單一 HTML 版
 *     （claude.ai Artifact 等禁止 WebAssembly 的環境，meshopt 模型會全部載入失敗、退回程式模型）
 */
import { NodeIO } from '@gltf-transform/core';
import { cloneDocument, dedup, meshopt, prune, quantize, resample, weld } from '@gltf-transform/functions';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptEncoder } from 'meshoptimizer';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = process.argv[2];
if (!SRC) {
  console.error('用法：node scripts/build-assets.mjs <素材來源資料夾>');
  process.exit(1);
}
const OUT = new URL('../src/assets/models/', import.meta.url).pathname;
const OUT_PLAIN = new URL('../src/assets/models-plain/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_PLAIN, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

function find(dir, name) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      const r = find(p, name);
      if (r) return r;
    } else if (f === name) return p;
  }
  return null;
}

const MAGE_ANIMS = ['Idle', 'Running_A', 'Spellcast_Shoot', 'Spellcast_Long', 'Hit_A', 'Death_A', 'Dodge_Forward', 'Cheer'];
const ROGUE_ANIMS = ['Idle', 'Running_A', '2H_Ranged_Shoot', 'Throw', 'Hit_A', 'Death_A', 'Dodge_Backward', 'Cheer'];
const KNIGHT_ANIMS = ['Idle', 'Running_A', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Chop', 'Block_Attack', '2H_Melee_Attack_Spin', 'Blocking', 'Hit_A', 'Death_A', 'Dodge_Forward', 'Cheer'];
const BARB_ANIMS = ['2H_Melee_Idle', 'Running_A', '2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop', 'Jump_Full_Short', 'Cheer', 'Hit_A', 'Death_A', 'Dodge_Forward'];
const SUMMONER_ANIMS = ['Idle', 'Running_A', 'Spellcast_Shoot', 'Spellcast_Raise', 'Spellcast_Long', 'Hit_A', 'Death_A', 'Dodge_Forward', 'Cheer'];
const SWORDSMAN_ANIMS = ['Idle', 'Running_A', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Stab', '2H_Melee_Attack_Spinning', 'Dodge_Forward', 'Jump_Full_Short', 'Hit_A', 'Death_A', 'Cheer'];
const TAMER_ANIMS = ['Idle', 'Running_A', '1H_Melee_Attack_Slice_Diagonal', 'Spellcast_Raise', 'Spellcast_Long', 'Hit_A', 'Death_A', 'Dodge_Forward', 'Cheer'];
const NINJA_ANIMS = ['Idle', 'Running_A', 'Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Stab', 'Throw', '2H_Melee_Attack_Spinning', 'Dodge_Forward', 'Dodge_Backward', 'Hit_A', 'Death_A', 'Cheer'];
const SKEL_ANIMS = ['Idle', 'Walking_D_Skeletons', '1H_Melee_Attack_Chop', 'Hit_A', 'Death_C_Skeletons'];
const SKEL_MAGE_ANIMS = [...SKEL_ANIMS, 'Spellcast_Shoot'];

/** [輸出名, 原始檔名, 保留動畫, 移除的零件] */
const CHARACTERS = [
  ['mage', 'Mage.glb', MAGE_ANIMS, ['Spellbook', 'Spellbook_open', '1H_Wand']],
  ['rogue', 'Rogue.glb', ROGUE_ANIMS, ['Knife_Offhand', '1H_Crossbow', 'Knife', 'Throwable']],
  ['knight', 'Knight.glb', KNIGHT_ANIMS, ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword']],
  ['barbarian', 'Barbarian.glb', BARB_ANIMS, ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug']],
  ['summoner', 'Rogue_Hooded.glb', SUMMONER_ANIMS, ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']],
  // 劍俠：盜賊模型（披風）拿掉匕首弩，手上另外掛 sword_1h
  ['swordsman', 'Rogue.glb', SWORDSMAN_ANIMS, ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']],
  // 訓獸師：蠻族模型（角盔、披風）拿掉斧頭、盾、酒杯，手上另外掛程式鞭子
  ['tamer', 'Barbarian.glb', TAMER_ANIMS, ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug']],
  // 忍者（v1.88）：連帽盜賊模型留著雙手的匕首（Knife、Knife_Offhand），拿掉弩與投擲物
  ['ninja', 'Rogue_Hooded.glb', NINJA_ANIMS, ['1H_Crossbow', '2H_Crossbow', 'Throwable']],
  ['skeleton_minion', 'Skeleton_Minion.glb', SKEL_ANIMS, []],
  ['skeleton_warrior', 'Skeleton_Warrior.glb', SKEL_ANIMS, []],
  ['skeleton_rogue', 'Skeleton_Rogue.glb', SKEL_ANIMS, []],
  ['skeleton_mage', 'Skeleton_Mage.glb', SKEL_MAGE_ANIMS, []],
  ['frog', 'Frog_Quaternius.glb', ['Frog_Idle', 'Frog_Jump', 'Frog_Attack', 'Frog_Death'], []],
  // v1.96 Gobkit 動物包（CC0，gobkit-free-assets/animal）：原檔只有一條 24fps 動畫，SPLIT 依幀數切成具名動畫
  ['bat', 'Bat.glb', ['Bat_Idle', 'Bat_Attack', 'Bat_Death', 'Bat_Fly'], []],
];

/** 單一動畫軌切成具名動畫：輸出名 → [名稱, 起始幀, 結束幀]（Gobkit：idle 0–29、attack 30–59、dead 60–89、walk 90–119，24fps） */
const SPLIT = {
  bat: [['Bat_Idle', 0, 29], ['Bat_Attack', 30, 59], ['Bat_Death', 60, 89], ['Bat_Fly', 90, 119]],
};
const SPLIT_FPS = 24;

/** 把唯一一條動畫依幀數切開（每段時間從 0 起算，原動畫刪掉） */
function splitClip(doc, segs) {
  const root = doc.getRoot();
  const src = root.listAnimations()[0];
  if (!src) return;
  const buf = root.listBuffers()[0];
  for (const [name, from, to] of segs) {
    const t0 = from / SPLIT_FPS - 1e-4;
    const t1 = to / SPLIT_FPS + 1e-4;
    const anim = doc.createAnimation(name);
    for (const ch of src.listChannels()) {
      const s = ch.getSampler();
      const inp = s.getInput().getArray();
      const out = s.getOutput();
      const k = out.getElementSize();
      const oa = out.getArray();
      const keep = [];
      for (let i = 0; i < inp.length; i++) if (inp[i] >= t0 && inp[i] <= t1) keep.push(i);
      if (!keep.length) {
        // 這段沒有關鍵幀：取段落開頭前最近的一格當靜止姿勢
        let j = 0;
        while (j + 1 < inp.length && inp[j + 1] <= t0) j++;
        keep.push(j);
      }
      const ni = new Float32Array(keep.map((i) => Math.max(0, inp[i] - from / SPLIT_FPS)));
      const no = new Float32Array(keep.length * k);
      keep.forEach((i, n) => no.set(oa.slice(i * k, i * k + k), n * k));
      const ia = doc.createAccessor().setType('SCALAR').setArray(ni).setBuffer(buf);
      const oacc = doc.createAccessor().setType(out.getType()).setArray(no).setBuffer(buf);
      const ns = doc.createAnimationSampler().setInput(ia).setOutput(oacc).setInterpolation(s.getInterpolation());
      anim.addSampler(ns).addChannel(doc.createAnimationChannel().setTargetNode(ch.getTargetNode()).setTargetPath(ch.getTargetPath()).setSampler(ns));
    }
  }
  src.listChannels().forEach((c) => c.dispose());
  src.listSamplers().forEach((s) => s.dispose());
  src.dispose();
}

/** 靜態物件：[輸出名, 原始檔名] */
const PROPS = [
  // 召喚師骷髏的武器（掛在 handslot 骨頭上）
  ['skel_blade', 'Skeleton_Blade.gltf'],
  ['skel_axe', 'Skeleton_Axe.gltf'],
  ['skel_staff', 'Skeleton_Staff.gltf'],
  ['skel_shield_small', 'Skeleton_Shield_Small_A.gltf'],
  ['skel_shield_large', 'Skeleton_Shield_Large_A.gltf'],
  // 劍俠的長劍
  ['sword_1h', 'sword_1handed.gltf'],
  ['building_blacksmith', 'building_blacksmith_blue.gltf'],
  ['building_market', 'building_market_blue.gltf'],
  ['building_tavern', 'building_tavern_blue.gltf'],
  ['building_home_A', 'building_home_A_blue.gltf'],
  ['building_home_B', 'building_home_B_blue.gltf'],
  ['building_church', 'building_church_blue.gltf'],
  ['building_tower', 'building_tower_A_blue.gltf'],
  ['building_well', 'building_well_blue.gltf'],
  ['tree_A', 'tree_single_A.gltf'],
  ['tree_B', 'tree_single_B.gltf'],
  ['trees_medium', 'trees_B_medium.gltf'],
  ['rock_A', 'rock_single_A.gltf'],
  ['rock_C', 'rock_single_C.gltf'],
  ['tent', 'tent.gltf'],
  ['barrel', 'barrel.gltf'],
  ['crate', 'crate_A_big.gltf'],
  ['weaponrack', 'weaponrack.gltf'],
  ['sack', 'sack.gltf'],
  ['fence_wood', 'fence_wood_straight.gltf'],
  ['torch', 'torch_lit.gltf.glb'],
  ['pillar_dungeon', 'pillar_decorated.gltf.glb'],
  ['barrel_large', 'barrel_large.gltf.glb'],
  ['crates_stacked', 'crates_stacked.gltf.glb'],
  ['banner_red', 'banner_patternA_red.gltf.glb'],
  ['chest_gold', 'chest_gold.glb'],
  ['rubble', 'rubble_large.gltf.glb'],
];

let total = 0;
let totalPlain = 0;
async function run(outName, file, keepAnims, dropNodes) {
  const path = find(SRC, file);
  if (!path) {
    console.warn('找不到', file);
    return;
  }
  const doc = await io.read(path);
  const root = doc.getRoot();
  for (const n of root.listNodes()) if (dropNodes?.includes(n.getName())) n.dispose();
  if (SPLIT[outName]) splitClip(doc, SPLIT[outName]);
  // 動畫名稱去掉骨架前綴（FBX 轉出的「FrogArmature|Frog_Idle」→「Frog_Idle」）
  for (const a of root.listAnimations()) a.setName(a.getName().split('|').pop());
  // 動畫要連同 sampler / channel 一起丟掉，prune 才會清掉沒人用的 accessor（否則檔案不會變小）
  if (keepAnims)
    for (const a of root.listAnimations()) {
      if (keepAnims.includes(a.getName())) continue;
      a.listChannels().forEach((c) => c.dispose());
      a.listSamplers().forEach((s) => s.dispose());
      a.dispose();
    }
  await doc.transform(resample({ tolerance: 0.002 }), weld(), dedup(), prune());
  // 免 WebAssembly 版：只量化（頂點座標、法線、UV 轉成整數），GLTFLoader 原生支援
  const plainDoc = cloneDocument(doc);
  await plainDoc.transform(quantize());
  const outPlain = join(OUT_PLAIN, `${outName}.glb`);
  await io.write(outPlain, plainDoc);
  totalPlain += statSync(outPlain).size / 1024;
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = join(OUT, `${outName}.glb`);
  await io.write(out, doc);
  const kb = statSync(out).size / 1024;
  total += kb;
  console.log(`${basename(out).padEnd(28)} ${kb.toFixed(0).padStart(5)} KB  免WASM ${(statSync(outPlain).size / 1024).toFixed(0).padStart(5)} KB  ${keepAnims ? root.listAnimations().map((a) => a.getName()).join(',') : ''}`);
}

const ONLY = process.argv[3]?.split(',');
for (const [o, f, a, d] of CHARACTERS) if (!ONLY || ONLY.includes(o)) await run(o, f, a, d);
for (const [o, f] of PROPS) if (!ONLY || ONLY.includes(o)) await run(o, f, null, null);
console.log(`合計 ${(total / 1024).toFixed(2)} MB（免 WASM 版 ${(totalPlain / 1024).toFixed(2)} MB）`);
