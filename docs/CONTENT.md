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
| 破關畫面文字 | `src/data/stageClear.ts` | 關卡結局、職業稱號、職業 × 關卡台詞 |

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
5. **破關畫面**（有首領的關卡）：`src/data/stageClear.ts` 補 `STAGE_EPILOGUE`（結局標題、神話尾聲、徽記）與 `CLEAR_QUOTES` 每個職業一句台詞（`stageClear.test.ts` 會檢查）。
6. **文字**：`docs/NAMES.md` 補地名與典故；`CHANGELOG.md`。
7. `npm test` → `npm run build` → 手機尺寸實際走一遍。

不需要改：地圖頁、每日任務、說明頁、小地圖、掉落、解鎖流程（全部讀資料）。

## 新增支線地圖與守護者（v1.58）

10 隻守護者（古希臘魔獸 / 戰神）各住一張支線地圖，隨主線進度開放；打倒有機會收服成夥伴。10 隻已到齊（v1.60）。

1. **id**：`ZoneId` 加 `'side_N'`。
2. **地圖**：複製 `stages/side1-helicon-spring.ts`。`kind: 'field'`、`side: { guardian: '<守護者敵人 id>', unlockAfter: '<主線副本 id>' }`、`lootTier`、`levelRange`（守護者等級可高 3 級）。登記到 `STAGES`（地圖頁會自動排在 unlockAfter 那層後面）。
3. **守護者**：`boss: true`、`element`（10 種屬性選一種，盡量 10 隻都不同）、`bossSkills`（3～4 招）。造型加在 `enemyShapes/guardians.ts`（夥伴也用同一個造型縮小）。
4. **夥伴**：`data/minions.ts` 加一筆（`guardian`、`avatarScale`、`element`、`life` = `CAPTURE.duration`、`max: 1`；近戰範圍用 `splash`，遠程用 `ranged`）；`MinionId` 與 `Minion.ts` 的 `GEAR` 補上。
5. **登記**：`data/companions.ts` 的 `COMPANIONS` 加一筆（名稱、稱號、圖示、屬性、地圖、神話、戰鬥特色）。
6. **破關文字**：`data/stageClear.ts` 補結局與 7 職業台詞（`stageClear.test.ts` 的關卡數 +1）。
7. `npm test`：`companions.test.ts` 會檢查守護者 / 地圖 / 夥伴 / 屬性是否對得上。

## 新增神獸討伐關卡（v1.86）

只有一隻魔王的競技場，`ZoneDef.beast = { order, unlockAfter, icon }`、`kind: 'field'`，不列在野外清單，地圖頁「⚔ 神獸討伐」卡（`Menu.beastCard()`）依 `BEAST_ORDER`（`beast.order`）排序。

1. `data/stages/beastN-*.ts`（可以用 scratchpad 的 `gen/gen_beasts.py` 產生後再改）：一個出生點、`levelRange` = [魔王等級 − 2, 魔王等級]、`lootTier` = `tierForLevel(等級)`。
2. 魔王：`boss: true`、`element`、4 招（`data/bossSkills.ts` 的 `<shape>_*`）、新造型放 `entities/enemyShapes/mythbeasts.ts` 並登記。
3. `stages/index.ts` 的 `STAGES`、`types.ts` 的 `ZoneId`。
4. `data/stageClear.ts`：`STAGE_EPILOGUE` ＋ 7 個職業的 `CLEAR_QUOTES`（`stageClear.test.ts` 的關卡數要加）。
5. 首殺鑽石在 `systems/BeastHunt.ts`（`BEAST`），進度就是 `bossesDefeated`。

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
- 每個關卡至少 5 種小怪（v1.63）。小怪定位（v1.63 用 scratchpad 的 `gen/mobs5.py` 一次補齊，之後直接改 .ts）：群襲（血 ×0.6、快、3 隻一群）、重裝（血 ×1.6、防高、慢）、遠程（`ranged`）、疾行（移速 5）、猛擊（攻 ×1.2、出手慢）、被動（`aggro: 'passive'`）。基準數值取同等級（±3）既有小怪的中位數。

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
5. 首領（`def.boss`）會自動精緻化（`enemyShapes/refine.ts`、`bossLook.ts`）：球、圓柱、圓錐、圓環分段加倍、方塊變圓角、平滑著色＋高光＋地面遮蔽＋輪廓光（外部模型也會重算平滑法線），姿勢與轉身經 `PoseSmoother` 平滑。照小怪的分段數寫就好；想保留尖角的零件（牙、角、火焰）用 4 段以下。動畫的角度不要用 `% (2π)` 這類會突然跳號的寫法，平滑會把跳號當成反向轉一圈。

## 目前的內容

### 關卡

| 關卡 | 檔案 | 等級 | 小怪 | 首領 | 招式 |
|---|---|---|---|---|---|
| 雅典城 | `town.ts` | 安全區 | — | — | — |
| 阿卡迪亞草原 | `grassland.ts` | 1-10 | 斯巴達訓練木樁、潘神軟泥、德律阿得菇、阿卡迪亞小野豬、牧神蝙蝠、草原錦蛇 | — | — |
| 第一層・波賽頓海岸 | `dungeon1-poseidon-coast.ts` | 1-5，防禦 0 | 卡基諾斯幼蟹、寧芙潮蛙、海沫軟泥、淺灘海鰻、珊瑚礁石怪 | 巨蟹卡基諾斯 | 巨鉗重擊、衝撞 |
| 第二層・賽蓮海蝕洞 | `dungeon2-siren-grotto.ts` | 5-10，防禦 18 | 特里同珊瑚泥、斯廷法利斯蝠鳥、海蝕洞寄居蟹、賽蓮侍女、洞窟海鰻 | 青銅巨人塔洛斯 | 震地、潮水落下 |
| 第三層・赫菲斯托斯熔爐 | `dungeon3-hephaestus-forge.ts` | 10-15，防禦 40 | 火神熔泥、奇美拉火蛙、青銅自動人偶、熔爐火犬、熔爐獨眼學徒 | 堤豐巨蛙 | 飛撲砸地、熔岩噴吐 |
| 多多納聖林 | `dodona-grove.ts` | 11-25（需 Lv.11） | 龍牙兵、冥河盜骸、龍牙重裝兵、黑卡蒂亡巫、多多納林狼 | 龍牙將軍（菁英） | 衝撞、震地 |
| 德爾斐山徑 | `field-delphi-path.ts` | 9-14（需 Lv.8，掉落 3～4 階） | 皮同幼蛇、帕納索斯野豬、德爾斐鳥妖、帕納索斯石像、神諭洞蝠 | 巨蟒皮同（菁英，土） | 毒液噴吐、衝撞、震地 |
| 馬拉松古戰場 | `field-marathon.ts` | 12-18（需 Lv.12，掉落 3～4 階） | 雅典重裝亡魂、波斯亡魂弓手、馬拉松野牛、戰場野狗、斯廷法利斯怪鳥 | 馬拉松公牛（菁英，火） | 狂牛衝撞、熔岩噴吐、震地 |
| 特洛伊海灘 | `field-troy-beach.ts` | 15-21（需 Lv.15，掉落 3～4 階） | 特洛伊沙蟹、特洛伊亡兵、拉奧孔海蛇、特洛伊祭司亡魂、特洛伊城牆石衛 | 特洛伊海怪（菁英，水） | 巨浪、潮水落下、巨尾 |
| 支線・赫利孔山靈泉 | `side1-helicon-spring.ts` | 10-13（擊敗第二層後開放） | 赫利孔風妖、聖山野羚、靈泉水精、赫利孔山豬、泉邊蛇 | 守護者・天馬珀伽索斯（⚡雷，可收服） | 天雷蹄音、閃電奔馳、雷翼風暴、天馬俯衝 |
| 支線・伊達山之巔 | `side2-ida-summit.ts` | 21-25（擊敗第四層後開放） | 伊達山風妖、伊達山野豬、伊達山狼、山巔石像、岩洞蝙蝠 | 守護者・宙斯神鷹埃托斯（🌪風，可收服） | 神鷹狂風、羽刃齊射、神鷹撲擊、天穹旋風 |
| 支線・科爾基斯聖林 | `side3-colchis-grove.ts` | 31-35（擊敗第六層後開放） | 聖林守蛇、銅蹄火牛、科爾基斯獵犬、龍牙戰士、聖林鳥妖 | 守護者・金羊克律索瑪羅斯（☀光，可收服） | 金角衝撞、金羊毛光輝、日輪墜落、聖蹄震地 |
| 支線・埃蓋海底宮殿 | `side4-aegae-palace.ts` | 41-45（擊敗第八層後開放） | 海宮巨蟹、深海鰻蛇、海宮水母、黃金宮衛像、海妖塞壬 | 守護者・海馬希波坎普斯（💧水，可收服） | 怒濤直擊、海潮奔騰、漩渦、海神驟雨 |
| 支線・羅德島日神殿 | `side5-rhodes-sun-temple.ts` | 51-55（第十層後） | 青銅巨像衛兵、日炎鳥妖、太陽神的火犬、日神祭司亡魂、赫利俄斯聖牛 | 守護者・不死鳥菲尼克斯（🔥火） | 烈焰吐息、焚天火羽、炎鳥俯衝、浴火重生 |
| 支線・色雷斯冰峰 | `side6-thracian-peak.ts` | 61-65（第十二層後） | 色雷斯雪狼、北風之子、冰晶石像、色雷斯雪豬、冰窟蝙蝠 | 守護者・北風神波瑞阿斯（❄冰） | 凜冬之息、北風暴雪、寒風突襲、霜之放射 |
| 支線・埃特納山麓 | `side7-etna-foothills.ts` | 71-75（第十四層後） | 熔岩石巨人、埃特納鍛工、熔岩獵犬、岩漿軟泥、火山灰鳥妖 | 守護者・百臂巨人布里阿瑞俄斯（⛰土） | 百臂連拳、大地震裂、投石如雨、巨人踏擊 |
| 支線・希俄斯島獵場 | `side8-chios-hunting-ground.ts` | 81-85（第十六層後） | 毒蠍幼體、俄里翁的獵犬、林間毒蛇、希俄斯野豬、獵場鷹妖 | 守護者・天蠍斯科爾皮俄斯（☠毒） | 毒尾突刺、毒霧噴灑、鑽地突襲、劇毒瘴氣 |
| 支線・斯巴達恐懼神殿 | `side9-sparta-phobos-shrine.ts` | 91-95（第十八層後） | 斯巴達亡魂戰士、恐懼之影、斯巴達斥候亡魂、恐懼石像、恐懼祭司亡魂 | 守護者・恐懼之神福波斯（🌑暗） | 恐懼收割、戰慄放射、暗影突進、夜幕降臨 |
| 支線・阿瑞斯之丘 | `side10-areopagus.ts` | 101-105（第二十層後） | 戰神亡靈戰士、阿瑞斯野豬、阿瑞斯戰犬、戰神祭司亡魂、戰神火牛 | 守護者・戰神阿瑞斯（⚙金） | 戰神之槍、戰車衝鋒、萬槍齊發、戰神怒吼 |
| 第四層・勒拿沼澤 | `dungeon4-lerna-swamp.ts` | 16-20，防禦 55 | 勒拿水蛇、勒拿毒蟾、艾洛鷹身女妖、沼澤毒泥、沼澤鉗蟹 | 九頭蛇許德拉 | 毒液噴吐、九頭齊咬、毒霧落下 |
| 第五層・克諾索斯迷宮 | `dungeon5-knossos-labyrinth.ts` | 21-25，防禦 75 | 代達洛斯機關兵、克里特狂牛、雅典祭品亡魂、迷宮蝙蝠、代達洛斯學徒亡魂 | 米諾陶洛斯 | 雙刃斧橫掃、狂牛衝撞、迷宮落石 |
| 第六層・塔爾塔洛斯深淵 | `dungeon6-tartarus-abyss.ts` | 26-30，防禦 95 | 冥界獵犬、刻爾死靈、百臂巨人獄卒、冥河擺渡亡魂、復仇女神侍從 | 刻耳柏洛斯 | 三頭冥火、冥犬撲擊、冥火落雨 |
| 第七層・涅墨亞山谷 | `dungeon7-nemean-valley.ts` | 31-35，防禦 115 | 涅墨亞山狼、厄律曼托斯野豬、俄庫珀忒鷹身女妖、涅墨亞幼獅、山谷毒蛇 | 涅墨亞獅 | 獅爪撕裂、金鬃猛撲、震天獅吼 |
| 第八層・戈爾貢之島 | `dungeon8-gorgon-isle.ts` | 36-40，防禦 135 | 戈爾貢毒蛇、石化戰士、格賴埃灰巫、戈爾貢夜蝠、石化巨蟹 | 梅杜莎 | 石化凝視、蛇髮亂舞、毒蛇箭雨 |
| 第九層・獨眼巨人洞窟 | `dungeon9-cyclops-cave.ts` | 41-45，防禦 155 | 西西里巨角公羊、獨眼巨人鍛工、萊斯特律戈涅斯巨人、洞窟蝙蝠群、獨眼巨人的牧犬 | 獨眼巨人波呂斐摩斯 | 巨棒橫掃、投擲巨石、撼地重踏 |
| 第十層・底比斯荒原 | `dungeon10-thebes-wastes.ts` | 46-50，防禦 175 | 透墨索斯狐、伊斯墨諾斯龍蛇、安菲翁石衛、底比斯沙妖、七將攻底比斯亡魂 | 斯芬克斯 | 獅爪重擊、展翼俯衝、謎語封印 |
| 第十一層・赫斯珀里得斯聖園 | `dungeon11-hesperides-garden.ts` | 51-55，防禦 195 | 科爾基斯青銅牛、塞壬歌姬、阿特拉斯泰坦衛兵、聖園守蛇、金蘋果鹿 | 巨龍拉冬 | 金焰吐息、龍尾橫掃、金蘋果流星 |
| 第十二層・冥王黑帝斯的國度 | `dungeon12-realm-of-hades.ts` | 56-60，防禦 215 | 冥府亡靈戰士、厄里倪厄斯、拉彌亞、冥府獵犬、冥河蝙蝠 | 奇美拉 | 獅首烈焰、三首衝撞、三首齊噴 |
| 第十三層・卡呂冬森林 | `dungeon13-calydon-forest.ts` | 61-65，防禦 235 | 卡呂冬灰狼、庫瑞忒斯亡魂、卡呂冬母野豬、森林鳥妖、卡呂冬古木魔像 | 卡呂冬野豬 | 獠牙突進、獠牙橫挑、斷木落石 |
| 第十四層・墨西拿海峽 | `dungeon14-messina-strait.ts` | 66-70，防禦 255 | 斯庫拉海犬、漩渦巨蟹、墨西拿海蛇、海峽塞壬、漩渦水母 | 斯庫拉 | 六犬齊咬、觸手鞭擊、卡律布狄斯漩渦 |
| 第十五層・希柏里爾雪原 | `dungeon15-hyperborean-snowfield.ts` | 71-75，防禦 275 | 阿里瑪斯波伊獨眼人、幼獅鷲、希柏里爾雪狼、冰晶魔像、北境雪妖 | 獅鷲 | 鷹王俯衝、金爪撕裂、羽刃狂風 |
| 第十六層・刻律涅山 | `dungeon16-ceryneian-mountain.ts` | 76-80，防禦 295 | 刻律涅牝鹿、阿蒂蜜絲獵魂、阿卡迪亞山貓、山林野豬、月夜蝙蝠 | 刻律涅金角鹿 | 金角衝刺、銅蹄踏地、月神箭雨 |
| 第十七層・阿爾戈斯牧場 | `dungeon17-argos-pasture.ts` | 81-85，防禦 315 | 伊俄白牛、赫拉牛虻、百眼守望者、牧場守犬、赫拉的孔雀妖 | 百眼巨人阿爾戈斯 | 百眼凝視、牧杖橫掃、不眠之眼 |
| 第十八層・厄律提亞島 | `dungeon18-erytheia-isle.ts` | 86-90，防禦 335 | 厄律提亞守犬、革律翁紅牛、巨人牧工、巨人戰士亡魂、夕陽鳥妖 | 三身巨人革律翁 | 三身擲矛、六臂橫掃、巨人踐踏 |
| 第十九層・衣索比亞海岸 | `dungeon19-aethiopian-coast.ts` | 91-95，防禦 355 | 刻托斯幼獸、涅瑞伊得斯怨靈、衣索比亞礁蟹、深海水母、珊瑚巨像 | 海怪刻托斯 | 滔天巨浪、巨尾拍海、噴潮水柱 |
| 第二十層・佩利翁山 | `dungeon20-pelion-mountain.ts` | 96-100，防禦 375 | 半人馬掠奪者、拉庇泰亡魂、佩利翁山獅、佩利翁野豬、山巔鷹妖 | 半人馬涅索斯 | 連珠箭、馬蹄踐踏、毒血之雨 |
| 第二十一層・萬怪之母的巢穴 | `dungeon21-echidna-lair.ts` | 101-105，防禦 395 | 蛇母幼蛇、奇美拉幼獸、恩普薩、奧特洛斯幼犬、巢穴蝙蝠 | 萬怪之母厄喀德那 | 萬怪之吼、雙尾毒牙、蛇身絞纏 |
| 第二十二層・俄特律斯山 | `dungeon22-othrys-battlefield.ts` | 106-110，防禦 415 | 泰坦戰士、雷霆獨眼巨人、塔爾塔洛斯翼龍、泰坦亡靈將、風暴鷹身女妖 | 塔爾塔洛斯獄龍坎佩 | 五十獸首、蠍尾毒刺、塔爾塔洛斯獄火、獄龍降臨 |

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
| `gorgon_gaze` | 石化凝視 | cone | 梅杜莎、拉彌亞 |
| `snake_hair` | 蛇髮亂舞 | spokes | 梅杜莎 |
| `gorgon_arrows` | 毒蛇箭雨 | multiLine | 梅杜莎 |
| `club_sweep` | 巨棒橫掃 | cone | 獨眼巨人波呂斐摩斯 |
| `boulder_toss` | 投擲巨石 | rain | 獨眼巨人波呂斐摩斯 |
| `cyclops_stomp` | 撼地重踏 | line | 獨眼巨人波呂斐摩斯 |
| `sphinx_swipe` | 獅爪重擊 | cone | 斯芬克斯 |
| `sphinx_dive` | 展翼俯衝 | leap | 斯芬克斯 |
| `riddle_seal` | 謎語封印 | spokes | 斯芬克斯 |
| `dragon_breath` | 金焰吐息 | line | 巨龍拉冬 |
| `dragon_tail` | 龍尾橫掃 | nova | 巨龍拉冬 |
| `golden_meteor` | 金蘋果流星 | rain | 巨龍拉冬 |
| `chimera_flame` | 獅首烈焰 | cone | 奇美拉 |
| `chimera_charge` | 三首衝撞 | dash | 奇美拉 |
| `chimera_rain` | 三首齊噴 | multiLine | 奇美拉 |
| `boar_gore` | 獠牙突進 | dash | None |
| `boar_tusk_sweep` | 獠牙橫挑 | cone | None |
| `boar_quake` | 斷木落石 | rain | None |
| `scylla_dogs` | 六犬齊咬 | spokes | 斯庫拉 |
| `scylla_tentacles` | 觸手鞭擊 | multiLine | 斯庫拉 |
| `charybdis_whirl` | 卡律布狄斯漩渦 | nova | 斯庫拉 |
| `griffin_dive` | 鷹王俯衝 | leap | 獅鷲 |
| `griffin_talon` | 金爪撕裂 | cone | 獅鷲 |
| `griffin_gale` | 羽刃狂風 | line | 獅鷲 |
| `hind_charge` | 金角衝刺 | dash | 刻律涅金角鹿 |
| `hind_stomp` | 銅蹄踏地 | nova | 刻律涅金角鹿 |
| `hind_moonfall` | 月神箭雨 | rain | 刻律涅金角鹿 |
| `argus_gaze` | 百眼凝視 | spokes | 百眼巨人阿爾戈斯 |
| `argus_club` | 牧杖橫掃 | cone | 百眼巨人阿爾戈斯 |
| `argus_watch` | 不眠之眼 | rain | 百眼巨人阿爾戈斯 |
| `geryon_spears` | 三身擲矛 | multiLine | 三身巨人革律翁 |
| `geryon_sweep` | 六臂橫掃 | cone | 三身巨人革律翁 |
| `geryon_leap` | 巨人踐踏 | leap | 三身巨人革律翁 |
| `cetus_wave` | 滔天巨浪 | line | 海怪刻托斯 |
| `cetus_tail` | 巨尾拍海 | nova | 海怪刻托斯 |
| `cetus_spout` | 噴潮水柱 | rain | 海怪刻托斯 |
| `nessus_volley` | 連珠箭 | multiLine | 半人馬涅索斯 |
| `nessus_trample` | 馬蹄踐踏 | dash | 半人馬涅索斯 |
| `nessus_blood` | 毒血之雨 | rain | 半人馬涅索斯 |
| `echidna_brood` | 萬怪之吼 | spokes | 萬怪之母厄喀德那 |
| `echidna_venom` | 雙尾毒牙 | multiLine | 萬怪之母厄喀德那 |
| `echidna_coil` | 蛇身絞纏 | nova | 萬怪之母厄喀德那 |
| `kampe_heads` | 五十獸首 | spokes | 塔爾塔洛斯獄龍坎佩 |
| `kampe_sting` | 蠍尾毒刺 | line | 塔爾塔洛斯獄龍坎佩 |
| `kampe_hellfire` | 塔爾塔洛斯獄火 | rain | 塔爾塔洛斯獄龍坎佩 |
| `kampe_leap` | 獄龍降臨 | leap | 塔爾塔洛斯獄龍坎佩 |

### 敵人造型

| shape | 檔案 | 說明 | 使用者 |
|---|---|---|---|
| `dummy` | `basic.ts` | 訓練木樁 | 斯巴達訓練木樁 |
| `slime` | `basic.ts` | 軟泥（跳躍＋擠壓） | 潘神軟泥、特里同珊瑚泥、火神熔泥 |
| `mushroom` | `basic.ts` | 蘑菇 | 德律阿得菇 |
| `crab` | `crab.ts` | 螃蟹（6 腳、雙鉗動畫；首領版尖刺皇冠） | 卡基諾斯幼蟹、巨蟹卡基諾斯、漩渦巨蟹、衣索比亞礁蟹 |
| `frog` | `basic.ts`＋`rigs.ts` | 青蛙（Quaternius 模型，依顏色換色） | 寧芙潮蛙、奇美拉火蛙、堤豐巨蛙、勒拿毒蟾 |
| `bat` | `basic.ts` | 蝠鳥（翅膀拍動、懸浮） | 斯廷法利斯蝠鳥、刻爾死靈、赫拉牛虻 |
| `skeleton` | `basic.ts`＋`rigs.ts` | 骷髏（KayKit 模型） | 龍牙兵系列、黑卡蒂亡巫、龍牙將軍、雅典祭品亡魂、格賴埃灰巫、冥府亡靈戰士、庫瑞忒斯亡魂、阿蒂蜜絲獵魂、拉庇泰亡魂 |
| `golem` | `basic.ts` | 魔像（發光核心） | 青銅巨人塔洛斯、代達洛斯機關兵、百臂巨人獄卒、石化戰士、萊斯特律戈涅斯巨人、安菲翁石衛、阿特拉斯泰坦衛兵、巨人牧工、泰坦戰士 |
| `serpent` | `beasts.ts` | 盤繞的蛇（頸部擺動、張嘴） | 勒拿水蛇、戈爾貢毒蛇、伊斯墨諾斯龍蛇、墨西拿海蛇、刻托斯幼獸、蛇母幼蛇 |
| `hydra` | `beasts.ts` | 七頸九頭蛇（中間頭紅眼） | 九頭蛇許德拉 |
| `harpy` | `beasts.ts` | 鷹身女妖（飛行、拍翅） | 艾洛鷹身女妖、俄庫珀忒鷹身女妖、塞壬歌姬、厄里倪厄斯、涅瑞伊得斯怨靈 |
| `bull` | `beasts.ts` | 公牛（前搖低頭） | 克里特狂牛、西西里巨角公羊、科爾基斯青銅牛、伊俄白牛、革律翁紅牛 |
| `minotaur` | `beasts.ts` | 牛頭人（前搖舉起雙刃斧） | 米諾陶洛斯 |
| `hound` | `beasts.ts` | 獵犬（首領版三頭、冥火、蛇尾） | 冥界獵犬、刻耳柏洛斯、涅墨亞山狼、透墨索斯狐、卡呂冬灰狼、斯庫拉海犬、希柏里爾雪狼、厄律提亞守犬 |
| `boar` | `legends.ts` | 野豬（獠牙、背鬃，前搖刨地；首領版長獠牙、火焰背鬃） | 厄律曼托斯野豬、卡呂冬母野豬、卡呂冬野豬 |
| `lion` | `legends.ts` | 獅子（鬃毛，前搖伏低張嘴；首領版金紋） | 涅墨亞獅、阿卡迪亞山貓、佩利翁山獅 |
| `gorgon` | `legends.ts` | 蛇尾人身、蛇髮蠕動（首領版蛇髮更多、拿弓） | 梅杜莎、拉彌亞、恩普薩 |
| `cyclops` | `legends.ts` | 獨眼巨人（巨棒，前搖高舉；首領版羊皮披肩） | 獨眼巨人鍛工、獨眼巨人波呂斐摩斯、阿里瑪斯波伊獨眼人、雷霆獨眼巨人 |
| `sphinx` | `monsters.ts` | 獅身人面鷹翼（前搖展翼） | 斯芬克斯 |
| `dragon` | `monsters.ts` | 長身四足巨龍（背刺、長頸，前搖抬頭張嘴） | 巨龍拉冬、塔爾塔洛斯翼龍 |
| `chimera` | `monsters.ts` | 獅身＋背上山羊頭＋蛇尾（三顆頭都會動） | 奇美拉、奇美拉幼獸 |
| `scylla` | `wilds.ts` | 海妖上半身＋腰間六犬頭＋觸手（前搖犬頭抬起張嘴） | 斯庫拉 |
| `griffin` | `wilds.ts` | 獅身鷹首、金爪、大翅膀（前搖展翼） | 幼獅鷲、獅鷲 |
| `hind` | `wilds.ts` | 細長的鹿、金色分岔鹿角、銅蹄（前搖低頭頂角；首領版鹿角發光） | 刻律涅牝鹿、刻律涅金角鹿 |
| `cetus` | `wilds.ts` | 無腳長身海獸、巨顎、背鰭尾鰭（身體一節節擺動） | 海怪刻托斯 |
| `centaur` | `wilds.ts` | 馬身＋人上身＋長弓（前搖拉弓） | 半人馬掠奪者、半人馬涅索斯 |
| `argus` | `primordials.ts` | 瘦高巨人、全身會眨的眼睛、牧杖（前搖高舉牧杖） | 百眼守望者、百眼巨人阿爾戈斯 |
| `geryon` | `primordials.ts` | 一個腰上三個身體、三顆羽盔頭、兩支長矛＋圓盾 | 三身巨人革律翁 |
| `echidna` | `primordials.ts` | 女身＋盤地蛇身＋兩條蛇頭尾巴、頭上有角 | 萬怪之母厄喀德那 |
| `kampe` | `primordials.ts` | 龍身四足、腰間一圈獸首、蛇髮、蠍尾、黑翼（最終首領） | 塔爾塔洛斯獄龍坎佩 |
