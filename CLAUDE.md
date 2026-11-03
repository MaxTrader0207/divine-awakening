# 接手說明（給 AI 協作）

每次開新對話繼續開發時，先讀這份，再讀 `docs/ROADMAP.md` 找到目前週次。

## 專案
神格覺醒 Divine Awakening（v1.36 起；曾名古希臘探險 v1.35、戰鬥法師 Battle Mage、最早叫小法師 Little Mage）：手機直式 3D 低多邊形動作 RPG，Three.js + TypeScript + Vite，部署 GitHub Pages：https://maxtrader0207.github.io/divine-awakening/ （GitHub 專案 `MaxTrader0207/divine-awakening`，原名 `little-mage`；localStorage 鍵名仍是 `little-mage.*`，同網域所以改名不影響存檔，不要改鍵名）。
開發者 Max（Wei Studio），一律用**繁體中文**溝通與撰寫註解、UI 文字。

## 必讀
- `docs/ARCHITECTURE.md`：系統、資料流、每幀順序、事件表
- `docs/CONVENTIONS.md`：規範、座標系、新增內容的步驟、效能預算
- `docs/NAMES.md`：地名 / 怪物命名對照（古希臘主題），新增內容沿用同風格
- `docs/CONTENT.md`：新增關卡 / 小怪 / 首領 / 招式 / 敵人造型的步驟與目前內容總表

## 工作方式
1. 先確認 ROADMAP 目前週次與未勾選項目，一次做一週的範圍。
2. 遊戲內容放 `src/data/`，系統放對應資料夾；新系統用 `update(dt)`，在 `Game.tick()` 依 ARCHITECTURE 的順序插入。
3. 系統間溝通用 `bus`（先在 `GameEvents` 登記事件）。
4. 改存檔結構 → `SAVE_VERSION + 1` 並寫遷移。
5. 完成後：`npm test` 通過、`npm run build` 零錯誤 → 手機尺寸（390×844）實測 → 勾 ROADMAP → 寫 CHANGELOG → 版本 +0.1。

## 指令
```bash
npm run dev          # 開發
npm run build        # 型別檢查 + 建置
npm run build:single # 單一 HTML
npm test             # 單元測試
```
`?debug` 開啟 `window.__game`（可呼叫 `__game.player.teleport(x, z)`、`__game.state`）。

## 目前狀態
- 版本 v1.38.0。10 週 MVP 完成，加上 v1.1~v1.38（見 CHANGELOG）。待辦見 ROADMAP「需要你來做的」與「之後可以做」。
- 測試：`npm test`（Vitest 85 個純邏輯案例）；`cd server && npm run db:local && npm run dev` 後 `npm test`（API 整合測試）。
- 瀏覽器測試：網址 `?debug&quality=high&class=mage`，帶 `?class=` 會略過開頭畫面與選職業；用 `__game.debugAdvance(秒, 步長)` 快轉，**不要用 setTimeout 等待**（無 GPU 環境只有 3~4 FPS）。`__inv` 是背包函式。暫停中（`__game.paused`）`frame()` 不呼叫 `tick()`，但 `debugAdvance()` 仍會推進。
- 改數值後重跑 `docs/BALANCE.md` 的模擬並更新表格。
- 美術：KayKit CC0（`src/assets/models/` meshopt 版給一般建置、`src/assets/models-plain/` 免 WebAssembly 版給單一 HTML——claude.ai Artifact 禁止 WebAssembly，meshopt 模型會全部載入失敗；兩者都由 `scripts/build-assets.mjs` 產生，`@models` 別名在 vite.config.ts 依模式切換）；青蛙用 Quaternius CC0 模型；史萊姆、寄居蟹（會動的程式模型）、魔像、蝙蝠、蘑菇仍是程式模型。
- 角色模型驗證：用 `__game.paused = true` 後把鏡頭移到角色正前方（眼睛高度）拍全身，俯視鏡頭會被頭和帽子擋住看不出缺件。`Assets.mergeSkinned()` 合併蒙皮網格前要把各部位換算到同一個骨架空間（量化會把縮放折進各自的 inverseBindMatrices），否則身體會消失。
- 職業（法師、弓手、騎士、狂戰士、召喚師、劍俠）在 `data/classes.ts`，技能效果在 `SkillSystem.cast()` 依 `skill.id` 分派。近戰判定 `Damage.inCone()`；AUTO 普攻射程 < 4 視為近戰（走到「射程＋敵人體型」內、用 `auto: 'gap'` 技能貼近、`auto: 'guard'` 開防禦、`auto: 'burst'` 開爆發）。狂戰士 `resource: 'rage'`：怒氣存在 `player.mp`，上限固定 `RAGE.max`，增減在 `Game`（combat:hit 監聽、regen）。劍俠（v1.37）：模型是盜賊模型 `swordsman`（貼圖換成藍色＋右手掛 `sword_1h`，細長是靠 `prop.thin` / `grip` 縮放，`node scripts/build-assets.mjs /home/claude/assets-src swordsman,sword_1h` 只重建這兩個），快劍三連段（第三下突刺）、`player.swordIntentT`（人劍合一，數值在 `SkillSystem` 的 `SWORD`）。新增職業要補：`classes.ts`、`gear.ts`（CLASS_GEAR 90 件）、`consumables.ts`（15 種）、`stageClear.ts`（稱號＋13 句台詞）、`Hud.ts` 的 `CLASS_TINT`、`manual.ts` 的 `SKILL_HELP`，型別會提示漏掉的 Record。召喚師的骷髏：資料 `data/minions.ts`、實體 `entities/Minion.ts`、AI `systems/MinionManager.ts`；小怪被骷髏打會改打骷髏（`Enemy.aggroMinion`，EnemyAI 依此選目標），敵人打骷髏走 `Game.hitMinion()`。骷髏外觀是程式骷髏 `entities/BoneSkeleton.ts`（細骨頭、肋骨、有眼窩牙齒的頭骨、關節動畫；每個關節群組用頂點顏色合併成 1 個網格），不用 KayKit 骷髏模型（Q 版大頭在斜俯視鏡頭下像柱子）；眼火、法陣、靈魂火焰、出場 / 倒下特效在 `Minion.ts`。截圖驗證外觀時要先 `__game.paused = true`，否則 AI 會在截圖前把骷髏轉向。
- 雅典城佈置：古希臘物件在 `world/GreekProps.ts`（新 PropKind，只用 `mat()` 共用顏色，會被 mergeStatic 合併）；小動物在 `world/Critters.ts`，資料寫在 `ZoneDef.critters`（kind、位置、活動範圍 area、花色 variant）。所有動物合成 1 個網格，每幀在 CPU 換算頂點（約 1.7 萬頂點、0.2ms）；新增動物種類＝加一個 build 函式＋行為分支。`__game.zones.current.critters.debug()` 看狀態。城裡 draw call 約 80~106（全景 116）。
- 新手指引：步驟資料 `data/tutorial.ts`、邏輯 `systems/Tutorial.ts`（`GameState.tutorial`，存檔 v5），Game 監聽事件呼叫 `game.tutorial(ev)` 發獎勵；HUD 左上卡片（縮放鈕下方，寬度扣掉右側三顆按鈕）、地上金色箭頭 `world/GuideArrow.ts`（步驟的 `targets` 依區域）、選單「指引」分頁 `ui/GuideTab.ts`＋說明文字 `data/manual.ts`（新增技能要補 `SKILL_HELP`）。測試時可用 `__game.tutorial({ type: 'move', meters: 12 })` 直接推進。
- HUD（v1.24 排版）：左上 `.top-left` 是 flex 直排（狀態框 → 增益列 → 指引），不要再用寫死的 top 疊元件；上方中央只有一個插槽（首領血條在 136px、提示在 172px，首領戰與戰鬥中不顯示提示）；一般訊息走 `toast` 佇列（最多 2 則、同文合併），獎勵訊息用 `bus.emit('toast', { text, kind: 'reward' })` 進左側清單。搖桿是浮動式（`.joy-zone` 感應區）。介面大小用 CSS 變數 `--ui`（各角落 transform scale），左手模式是 `.hud.lefty` / `html.lefty`。鏡頭遠近：雙指開合、滾輪、設定滑桿（畫面上不再有 − / +）。地點標籤 Sprite 設 `userData.dodge = true` 就會自動避開 HUD（`world/LabelDodger.ts`）。按鈕統一用 `--sc` 主題色（技能取 `skill.color`）。漂浮文字的 class 是 `.ftxt`（不要用 `.txt`，那是輸入框樣式）。存檔 v7（設定 `vibration`）。左上狀態框是按鈕（點了開「裝備」）：職業頭像（`CLASS_TINT` 底色，外圈 conic-gradient 是經驗進度 `--exp`）、HP 條有受傷殘影（`<u>` 延遲縮短）。
- 裝備：標準裝 id `${slot}_t${tier}` 全職業共用，`applyClassGear(職業)` 啟動時改寫名稱 / 圖示 / `SLOT_NAMES`；★神話裝 id `${職業}_${slot}_${01~15}`（`NAMED_TIERS` 決定每件的階級），名稱在 `data/gear.ts`，屬性由 profile 自動算（同階標準裝戰力 ×1.08）。`rollDrop(tier, boss, rng, 職業)` 有 35%（首領 60%）掉神話裝。道具在 `data/consumables.ts`：共用 `CONSUMABLES` 15 種＋`CLASS_CONSUMABLES` 每職業 15 種（id `${職業}_xxx`），`consumablesFor(職業)` 取可用清單；每種上限 `MAX_STACK` 99、不佔背包。效果類型 heal / regen / buff（atk、def、speed、crit、pen、critDmg、cdr、leech）/ town / boost / cdReset / invuln / nova / summon / shield，全在 `Game.useConsumable()`；暫時增益 `cbuff` 在 `recalcStats()`、`hitPlayer()`、`skills.update(dt×(1+cdr))`、combat:hit（吸血）套用。背包 `INVENTORY_SIZE` 100 格，裝備頁下半部可切「裝備 / 道具」、依欄位或★神話篩選。
- 內容架構（v1.29）：關卡在 `data/stages/`（一檔一關卡＝地圖＋敵人，`STAGES` 登記），首領招式在 `data/bossSkills.ts`（pattern＋參數），敵人程式模型在 `entities/enemyShapes/`。地圖頁、每日任務區域、說明頁、首領名稱都從資料自動產生，不要再寫死關卡 id。`src/data/content.test.ts` 會檢查一致性（含 `world/zoneCollision.ts` 的可達性 BFS）。目前 12 層副本（Lv.1-60，滿級）：波賽頓海岸、賽蓮海蝕洞、赫菲斯托斯熔爐、勒拿沼澤、克諾索斯迷宮、塔爾塔洛斯深淵、涅墨亞山谷、戈爾貢之島、獨眼巨人洞窟、底比斯荒原、赫斯珀里得斯聖園、冥王黑帝斯的國度。裝備 6 階：`lootTierOf()` 第一～三層 1~3 階、四～六層 4 階、七～九層 5 階、十～十二層 6 階；型別 `Tier`、`MAX_TIER`、`TIERS` 在 `data/gear.ts`，`tierForLevel()` 在 `items.ts`。
- 破關畫面（v1.34）：首領戰紀錄 `Game.bossFight`（開戰計時、被招式打中、用藥）→ 擊敗時 `onBossDefeated()` 用 `systems/StageClear.ts` 的 `finishClear()` 算評價 S/A/B/C、更新 `GameState.clears`（存檔 v9）→ `clearSeq` 1.5 秒慢動作（`frame()` 裡 tick×0.3）＋ `CameraRig.setCinematic()` 繞到角色前上方 → `ui/StageClearScreen.ts`（卡片在下方、上方透出 3D 特寫；開著時 `showcaseFrame()` 只更新角色動畫 / 特效 / 鏡頭，敵人與名牌 Sprite 暫時隱藏，AUTO 中 8 秒自動關）。文字在 `data/stageClear.ts`（關卡結局、職業稱號 / 顏色、職業 × 關卡台詞），新增關卡要補。測試可直接呼叫 `__game['onBossDefeated'](名稱, exp, gold, gems)`；無 GPU 環境鏡頭過渡很慢，截圖要等 10 秒以上。
- 音效是 Web Audio 合成（`audio/Audio.ts`）；背景音樂是 `audio/Music.ts` 合成引擎播 `audio/songs.ts` 曲譜（6 首），區域用 `ZoneDef.music` 指定。`?debug` 下 `await __renderMusic('boss', 30, 1)` 可離線輸出 WAV 試聽。換正式音檔時保留 `play(id)` / `setMusic(id)` / `setBossIntensity(v)`。
