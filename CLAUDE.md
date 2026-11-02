# 接手說明（給 AI 協作）

每次開新對話繼續開發時，先讀這份，再讀 `docs/ROADMAP.md` 找到目前週次。

## 專案
戰鬥法師 Battle Mage（原名小法師 Little Mage）：手機直式 3D 低多邊形動作 RPG，Three.js + TypeScript + Vite，部署 GitHub Pages。
開發者 Max（Wei Studio），一律用**繁體中文**溝通與撰寫註解、UI 文字。

## 必讀
- `docs/ARCHITECTURE.md`：系統、資料流、每幀順序、事件表
- `docs/CONVENTIONS.md`：規範、座標系、新增內容的步驟、效能預算

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
- 版本 v1.12.0。10 週 MVP 完成，加上 v1.1~v1.12（見 CHANGELOG）。待辦見 ROADMAP「需要你來做的」與「之後可以做」。
- 測試：`npm test`（Vitest 41 個純邏輯案例）；`cd server && npm run db:local && npm run dev` 後 `npm test`（API 整合測試）。
- 瀏覽器測試：網址 `?debug&quality=high&class=mage`，帶 `?class=` 會略過開頭畫面與選職業；用 `__game.debugAdvance(秒, 步長)` 快轉，**不要用 setTimeout 等待**（無 GPU 環境只有 3~4 FPS）。`__inv` 是背包函式。暫停中（`__game.paused`）`frame()` 不呼叫 `tick()`，但 `debugAdvance()` 仍會推進。
- 改數值後重跑 `docs/BALANCE.md` 的模擬並更新表格。
- 美術：KayKit CC0（`src/assets/models/`，由 `scripts/build-assets.mjs` 產生）；青蛙用 Quaternius CC0 模型；史萊姆、寄居蟹（會動的程式模型）、魔像、蝙蝠、蘑菇仍是程式模型。
- 職業在 `data/classes.ts`，技能效果在 `SkillSystem.cast()` 依 `skill.id` 分派。
- 音效是 Web Audio 合成（`audio/Audio.ts`）；背景音樂是 `audio/Music.ts` 合成引擎播 `audio/songs.ts` 曲譜（6 首），區域用 `ZoneDef.music` 指定。`?debug` 下 `await __renderMusic('boss', 30, 1)` 可離線輸出 WAV 試聽。換正式音檔時保留 `play(id)` / `setMusic(id)` / `setBossIntensity(v)`。
