# 內容擴充指南（關卡・小怪・首領・招式・造型）

v1.29 起，遊戲內容依「關卡」組織：**一個關卡一個檔案**，裡面放地圖和這張地圖的所有敵人。
世界地圖、副本順序、每日任務的區域、說明頁、小地圖的首領標記，全部由登記表自動產生。
改完跑 `npm test`：`src/data/content.test.ts` 會檢查有沒有漏接（包括「從入口走得到首領與傳送點」，牆、水、高台不會把路堵死），失敗訊息會告訴你要改哪裡。

## 資料放在哪裡

| 內容 | 位置 | 說明 |
|---|---|---|
| 關卡（地圖＋敵人） | `src/data/stages/*.ts` | 一個關卡一個檔案，匯出 `StageDef = { zone, enemies }` |
| 關卡登記表 | `src/data/stages/index.ts` 的 `STAGES` | 唯一需要手動排序的清單；`ZONES`、`ENEMIES`、`DUNGEON_ORDER`、`FIELD_ORDER`、`WORLD_FIELDS` 自動產生 |
| 版面小工具 | `src/data/stages/helpers.ts` | `row()` 一排物件、`pillarRing()` 首領石圈、`scatterTrees()` 樹林、`melee()` 近戰參數 |
| 首領招式 | `src/data/bossSkills.ts` | 招式＝模板（pattern）＋參數，首領用 id 引用 |
| 招式執行 | `src/systems/BossController.ts` | 依 pattern 執行；只有新 pattern 才要改 |
| 敵人程式模型 | `src/entities/enemyShapes/` | 一種造型一個建造函式，`index.ts` 登記 |
| 外部骨架模型 | `src/entities/enemyShapes/rigs.ts` | KayKit / Quaternius 模型的動畫名稱、身高、換色 |
| 命名典故 | `docs/NAMES.md` | 古希臘主題，新內容沿用 |

舊的 `@/data/zones`、`@/data/enemies` 仍可 import（轉接到 stages）。

## 新增關卡（副本或野外）

1. **id**：`src/data/types.ts` 的 `ZoneId` 加上新 id（例如 `'dungeon_4'`）。
2. **檔案**：複製一個相近的關卡檔（副本參考 `dungeon2-siren-grotto.ts`，野外參考 `dodona-grove.ts`），改：
   - `zone`：`id`、`name`（地名）、`subtitle`、`region`、`levelRange`、`size`、顏色、`patches`（地面色塊 / 水）、`platforms`（首領高台）、`props`、`portals`、`spawn`、`spawns`、`tips`、`music`。
   - 副本：`dungeon: { floor, enemyDefense, unlockAfter }`。層數從 1 連續，`unlockAfter` 是上一層的 id。
   - 掉落階級：預設 = 層數（最高 4）；要不同就填 `lootTier`。
   - 野外有進入等級就填 `minLevel`（地圖頁會自動上鎖）。
   - `enemies`：這張地圖的小怪與首領（見下節）。
3. **登記**：在 `stages/index.ts` 的 `STAGES` 加進去（位置 = 地圖頁、每日任務的順序）。
4. **入口**：副本自動出現在地圖頁 / 傳送石，不用改；野外要在相鄰地圖的 `portals` 加一個傳送點，並在新地圖加回程傳送點。
5. **文字**：`docs/NAMES.md` 補地名與典故；`CHANGELOG.md`。
6. `npm test` → `npm run build` → 手機尺寸實際走一遍。

不需要改：地圖頁、每日任務、說明頁、小地圖、掉落、解鎖流程（全部讀資料）。

## 新增小怪

在關卡檔的 `enemies` 加一筆 `EnemyDef`：

```ts
lerna_snake: {
  id: 'lerna_snake', name: '勒拿水蛇', level: 17, aggro: 'aggressive', shape: 'slime',
  radius: 0.6, respawn: 12, scale: 1.1, color: 0x3a8a5a,
  stats: { maxHp: 1500, atk: 150, def: 60, moveSpeed: 3 },
  attack: melee(1.3, 0.5, 1.6),
  exp: 260, gold: [40, 60],
},
```

- `id` 全遊戲唯一，要和 key 一樣；`name` 全遊戲唯一。
- `aggro`：`aggressive` 主動攻擊 / `passive` 被打才反擊 / `none` 不攻擊。
- `shape`：用既有造型（見下表），或新增造型；`color` 是主色（造型會自動算暗色、亮色）。
- 想用骨架模型：`model: 'skeleton_minion'` 等（要在 `rigs.ts` 有登記）。
- 遠程：`ranged: true`，`attack.range` 填施法距離。
- 等級要在關卡 `levelRange` 內；副本小怪的 `stats.def` 要等於該層的 `enemyDefense`（測試會檢查）。
- 在 `zone.spawns` 放出生點：`{ enemy: 'lerna_snake', x, z, count: 3, spread: 4 }`。
- 數值基準見 `docs/BALANCE.md`（同等級法師普攻 3~6 下打倒小怪）。

## 新增首領

和小怪一樣寫在 `enemies`，另外：

```ts
hydra: {
  ..., boss: true, respawn: 90, scale: 2.6,
  exp: 5200, gold: [2000, 2600], gems: 14,
  bossSkills: ['ground_slam', 'tide_rain', 'charge'],
},
```

- 每個副本**剛好一個**首領（測試會檢查）；野外可以有菁英首領（例如龍牙將軍）。
- `bossSkills` 輪流施放；血量低於 50% 狂暴（冷卻 ×0.65、招式用 *Enraged 參數）。
- 首領等級可以比關卡上限高 3 級。
- 首領的名字會自動出現在地圖頁、說明頁、小地圖（紅點）。
- 首領放在高台石圈：`{ enemy: 'hydra', x: 0, z: -21 }`，石圈用 `stonering` ＋ `pillarRing()`。

## 新增首領招式

### 只是參數不同（最常見）
在 `data/bossSkills.ts` 的 `BOSS_SKILLS` 加一筆，選一個模板：

| pattern | 效果 | 主要參數 |
|---|---|---|
| `cone` | 前方扇形 | `range`、`angle`（度）、`angleEnraged` |
| `dash` | 直線衝撞，衝到終點（會被牆擋） | `length`、`width` |
| `nova` | 以自己為中心的圓 | `radius`、`radiusEnraged`、`discColor` |
| `rain` | 玩家附近隨機落下多個圓（第一個在腳下） | `count`、`countEnraged`、`radius`、`spread`、`stagger` |
| `leap` | 跳到玩家位置砸地 | `radius`、`discColor` |
| `line` | 往玩家方向一排圓依序爆開 | `count`、`countEnraged`、`start`、`spacing`、`radius`、`stagger` |
| `spokes` | 以自己為中心平均分布的多道窄扇形（之間是安全區） | `count`、`countEnraged`、`range`、`angle` |
| `multiLine` | 同時好幾排 line（角度相對玩家方向） | `angles`、`anglesEnraged`、`count`、`start`、`spacing`、`radius`、`stagger` |

共通參數：`name`、`desc`、`windup`（預警秒數，至少 0.9；遠程職業難躲的招給長一點）、`power`（傷害倍率，一般 1.2~2.2）、`color`。

### 全新的動作
1. `bossSkills.ts` 的 `BossSkillDef` 加一個 pattern 型別。
2. `systems/BossController.ts` 的 `cast()` 加一個 `case`：用 `tg.add()` 畫預警，結算時呼叫 `hit(inside)`。
3. 一定要有預警（紅色範圍）——玩家要有機會躲開。

## 新增敵人造型

1. `src/entities/enemyShapes/` 新增檔案（參考 `crab.ts`）：

```ts
export const serpent: ShapeBuild = (b) => {
  b.add(new THREE.SphereGeometry(0.5, 8, 6), b.color, 0, 0.5);       // 直接掛 body：會合併成 1 個網格
  const head = b.group(0, 1, 0.4);                                    // 會動的部位：先建 pivot
  b.add(new THREE.ConeGeometry(0.2, 0.5, 6), b.dark, 0, 0, 0.2, head);
  b.eyes(1.1, 0.6);
  return {
    height: 1.4,
    animate: ({ t, moving, winding, lean, body }) => {
      head.rotation.x = winding ? -0.6 : Math.sin(t * 3) * 0.1;
      body.rotation.x = lean;
    },
  };
};
```

2. `enemyShapes/index.ts` 的 `ENEMY_SHAPES` 登記；`data/types.ts` 的 `EnemyShape` 加名稱。
3. 可用的工具：`b.add()`（零件）、`b.glow()`（發光零件）、`b.group()`（會動的 pivot）、`b.eyes()`、`b.color / b.dark / b.light`、`b.boss`（首領版可以加裝飾）。
4. 效能：直接掛在 body 上的零件會合併成 1 個 draw call；pivot 下的零件各自一個，盡量少。

## 目前的內容

### 關卡

| 關卡 | 檔案 | 等級 | 小怪 | 首領 | 招式 |
|---|---|---|---|---|---|
| 雅典城 | `town.ts` | 安全區 | — | — | — |
| 阿卡迪亞草原 | `grassland.ts` | 1-10 | 潘神軟泥、德律阿得菇、斯巴達訓練木樁 | — | — |
| 第一層・波賽頓海岸 | `dungeon1-poseidon-coast.ts` | 1-5，防禦 0 | 卡基諾斯幼蟹、寧芙潮蛙 | 巨蟹卡基諾斯 | 巨鉗重擊、衝撞 |
| 第二層・賽蓮海蝕洞 | `dungeon2-siren-grotto.ts` | 5-10，防禦 18 | 特里同珊瑚泥、斯廷法利斯蝠鳥 | 青銅巨人塔洛斯 | 震地、潮水落下 |
| 第三層・赫菲斯托斯熔爐 | `dungeon3-hephaestus-forge.ts` | 10-15，防禦 40 | 火神熔泥、奇美拉火蛙 | 堤豐巨蛙 | 飛撲砸地、熔岩噴吐 |
| 多多納聖林 | `dodona-grove.ts` | 11-25（需 Lv.11） | 龍牙兵、冥河盜骸、龍牙重裝兵、黑卡蒂亡巫 | 龍牙將軍（菁英） | 衝撞、震地 |
| 第四層・勒拿沼澤 | `dungeon4-lerna-swamp.ts` | 16-20，防禦 55 | 勒拿水蛇、勒拿毒蟾、艾洛鷹身女妖 | 九頭蛇許德拉 | 毒液噴吐、九頭齊咬、毒霧落下 |
| 第五層・克諾索斯迷宮 | `dungeon5-knossos-labyrinth.ts` | 21-25，防禦 75 | 代達洛斯機關兵、克里特狂牛、雅典祭品亡魂 | 米諾陶洛斯 | 雙刃斧橫掃、狂牛衝撞、迷宮落石 |
| 第六層・塔爾塔洛斯深淵 | `dungeon6-tartarus-abyss.ts` | 26-30，防禦 95 | 冥界獵犬、刻爾死靈、百臂巨人獄卒 | 刻耳柏洛斯 | 三頭冥火、冥犬撲擊、冥火落雨 |
| 第七層・涅墨亞山谷 | `dungeon7-nemean-valley.ts` | 31-35，防禦 115 | 涅墨亞山狼、厄律曼托斯野豬、俄庫珀忒鷹身女妖 | 涅墨亞獅 | 獅爪撕裂、金鬃猛撲、震天獅吼 |
| 第八層・戈爾貢之島 | `dungeon8-gorgon-isle.ts` | 36-40，防禦 135 | 戈爾貢毒蛇、石化戰士、格賴埃灰巫 | 梅杜莎 | 石化凝視、蛇髮亂舞、毒蛇箭雨 |
| 第九層・獨眼巨人洞窟 | `dungeon9-cyclops-cave.ts` | 41-45，防禦 155 | 西西里巨角公羊、獨眼巨人鍛工、萊斯特律戈涅斯巨人 | 獨眼巨人波呂斐摩斯 | 巨棒橫掃、投擲巨石、撼地重踏 |

### 首領招式庫

| id | 名稱 | pattern | 使用者 |
|---|---|---|---|
| `claw_slam` | 巨鉗重擊 | cone | 巨蟹卡基諾斯 |
| `charge` | 衝撞 | dash | 巨蟹卡基諾斯、龍牙將軍 |
| `ground_slam` | 震地 | nova | 青銅巨人塔洛斯、龍牙將軍 |
| `tide_rain` | 潮水落下 | rain | 青銅巨人塔洛斯 |
| `leap` | 飛撲砸地 | leap | 堤豐巨蛙 |
| `lava_spit` | 熔岩噴吐 | line | 堤豐巨蛙 |
| `venom_spit` | 毒液噴吐 | line | 九頭蛇許德拉 |
| `hydra_heads` | 九頭齊咬 | spokes | 九頭蛇許德拉 |
| `poison_rain` | 毒霧落下 | rain | 九頭蛇許德拉 |
| `labrys_sweep` | 雙刃斧橫掃 | cone | 米諾陶洛斯 |
| `bull_rush` | 狂牛衝撞 | dash | 米諾陶洛斯 |
| `labyrinth_quake` | 迷宮落石 | rain | 米諾陶洛斯 |
| `hellfire_breath` | 三頭冥火 | multiLine | 刻耳柏洛斯 |
| `cerberus_pounce` | 冥犬撲擊 | leap | 刻耳柏洛斯 |
| `underworld_flames` | 冥火落雨 | rain | 刻耳柏洛斯 |
| `lion_claw` | 獅爪撕裂 | cone | 涅墨亞獅 |
| `lion_pounce` | 金鬃猛撲 | leap | 涅墨亞獅 |
| `lion_roar` | 震天獅吼 | nova | 涅墨亞獅 |
| `gorgon_gaze` | 石化凝視 | cone | 梅杜莎 |
| `snake_hair` | 蛇髮亂舞 | spokes | 梅杜莎 |
| `gorgon_arrows` | 毒蛇箭雨 | multiLine | 梅杜莎 |
| `club_sweep` | 巨棒橫掃 | cone | 獨眼巨人波呂斐摩斯 |
| `boulder_toss` | 投擲巨石 | rain | 獨眼巨人波呂斐摩斯 |
| `cyclops_stomp` | 撼地重踏 | line | 獨眼巨人波呂斐摩斯 |

### 敵人造型

| shape | 檔案 | 說明 | 使用者 |
|---|---|---|---|
| `dummy` | `basic.ts` | 訓練木樁 | 斯巴達訓練木樁 |
| `slime` | `basic.ts` | 軟泥（跳躍＋擠壓） | 潘神軟泥、特里同珊瑚泥、火神熔泥 |
| `mushroom` | `basic.ts` | 蘑菇 | 德律阿得菇 |
| `crab` | `crab.ts` | 螃蟹（6 腳、雙鉗動畫；首領版尖刺皇冠） | 卡基諾斯幼蟹、巨蟹卡基諾斯 |
| `frog` | `basic.ts`＋`rigs.ts` | 青蛙（Quaternius 模型，依顏色換色） | 寧芙潮蛙、奇美拉火蛙、堤豐巨蛙、勒拿毒蟾 |
| `bat` | `basic.ts` | 蝠鳥（翅膀拍動、懸浮） | 斯廷法利斯蝠鳥、刻爾死靈 |
| `skeleton` | `basic.ts`＋`rigs.ts` | 骷髏（KayKit 模型） | 龍牙兵系列、黑卡蒂亡巫、龍牙將軍、雅典祭品亡魂、格賴埃灰巫 |
| `golem` | `basic.ts` | 魔像（發光核心） | 青銅巨人塔洛斯、代達洛斯機關兵、百臂巨人獄卒、石化戰士、萊斯特律戈涅斯巨人 |
| `serpent` | `beasts.ts` | 盤繞的蛇（頸部擺動、張嘴） | 勒拿水蛇、戈爾貢毒蛇 |
| `hydra` | `beasts.ts` | 七頸九頭蛇（中間頭紅眼） | 九頭蛇許德拉 |
| `harpy` | `beasts.ts` | 鷹身女妖（飛行、拍翅） | 艾洛鷹身女妖、俄庫珀忒鷹身女妖 |
| `bull` | `beasts.ts` | 公牛（前搖低頭） | 克里特狂牛、西西里巨角公羊 |
| `minotaur` | `beasts.ts` | 牛頭人（前搖舉起雙刃斧） | 米諾陶洛斯 |
| `hound` | `beasts.ts` | 獵犬（首領版三頭、冥火、蛇尾） | 冥界獵犬、刻耳柏洛斯、涅墨亞山狼 |
| `boar` | `legends.ts` | 野豬（獠牙、背鬃，前搖刨地） | 厄律曼托斯野豬 |
| `lion` | `legends.ts` | 獅子（鬃毛，前搖伏低張嘴；首領版金紋） | 涅墨亞獅 |
| `gorgon` | `legends.ts` | 蛇尾人身、蛇髮蠕動（首領版蛇髮更多、拿弓） | 梅杜莎 |
| `cyclops` | `legends.ts` | 獨眼巨人（巨棒，前搖高舉；首領版羊皮披肩） | 獨眼巨人鍛工、獨眼巨人波呂斐摩斯 |
