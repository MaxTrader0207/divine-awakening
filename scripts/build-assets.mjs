/**
 * 素材管線：把 KayKit（CC0）原始模型精簡後輸出到 src/assets/models/
 * ------------------------------------------------------------
 * 用法：node scripts/build-assets.mjs <素材來源資料夾>
 *   來源資料夾內要有（git clone 自 github.com/KayKit-Game-Assets）：
 *     KayKit-Character-Pack-Adventures-1.0
 *     KayKit-Character-Pack-Skeletons-1.0
 *     KayKit-Medieval-Hexagon-Pack-1.0
 *     KayKit-Dungeon-Remastered-1.0
 *     converted/Frog_Quaternius.glb  ← Quaternius Easy Animated Enemy Pack 的 Frog.fbx 用 FBX2glTF 轉出（見 CREDITS.md）
 * 做的事：只保留需要的動畫與零件 → 重新取樣動畫 → 去重 → 清除未使用資源 → 輸出 .glb
 */
import { NodeIO } from '@gltf-transform/core';
import { dedup, meshopt, prune, resample, weld } from '@gltf-transform/functions';
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
mkdirSync(OUT, { recursive: true });
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
const SKEL_ANIMS = ['Idle', 'Walking_D_Skeletons', '1H_Melee_Attack_Chop', 'Hit_A', 'Death_C_Skeletons'];
const SKEL_MAGE_ANIMS = [...SKEL_ANIMS, 'Spellcast_Shoot'];

/** [輸出名, 原始檔名, 保留動畫, 移除的零件] */
const CHARACTERS = [
  ['mage', 'Mage.glb', MAGE_ANIMS, ['Spellbook', 'Spellbook_open', '1H_Wand']],
  ['rogue', 'Rogue.glb', ROGUE_ANIMS, ['Knife_Offhand', '1H_Crossbow', 'Knife', 'Throwable']],
  ['knight', 'Knight.glb', KNIGHT_ANIMS, ['1H_Sword_Offhand', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '2H_Sword']],
  ['barbarian', 'Barbarian.glb', BARB_ANIMS, ['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', 'Mug']],
  ['summoner', 'Rogue_Hooded.glb', SUMMONER_ANIMS, ['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']],
  ['skeleton_minion', 'Skeleton_Minion.glb', SKEL_ANIMS, []],
  ['skeleton_warrior', 'Skeleton_Warrior.glb', SKEL_ANIMS, []],
  ['skeleton_rogue', 'Skeleton_Rogue.glb', SKEL_ANIMS, []],
  ['skeleton_mage', 'Skeleton_Mage.glb', SKEL_MAGE_ANIMS, []],
  ['frog', 'Frog_Quaternius.glb', ['Frog_Idle', 'Frog_Jump', 'Frog_Attack', 'Frog_Death'], []],
];

/** 靜態物件：[輸出名, 原始檔名] */
const PROPS = [
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
async function run(outName, file, keepAnims, dropNodes) {
  const path = find(SRC, file);
  if (!path) {
    console.warn('找不到', file);
    return;
  }
  const doc = await io.read(path);
  const root = doc.getRoot();
  for (const n of root.listNodes()) if (dropNodes?.includes(n.getName())) n.dispose();
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
  await doc.transform(resample({ tolerance: 0.002 }), weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = join(OUT, `${outName}.glb`);
  await io.write(out, doc);
  const kb = statSync(out).size / 1024;
  total += kb;
  console.log(`${basename(out).padEnd(28)} ${kb.toFixed(0).padStart(5)} KB  ${keepAnims ? root.listAnimations().map((a) => a.getName()).join(',') : ''}`);
}

for (const [o, f, a, d] of CHARACTERS) await run(o, f, a, d);
for (const [o, f] of PROPS) await run(o, f, null, null);
console.log(`合計 ${(total / 1024).toFixed(2)} MB`);
