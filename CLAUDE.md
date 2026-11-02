# 接手說明（給 AI 協作）

每次開新對話繼續開發時，先讀這份，再讀 `docs/ROADMAP.md` 找到目前週次。

## 專案
小法師 Little Mage：手機直式 3D 低多邊形動作 RPG，Three.js + TypeScript + Vite，部署 GitHub Pages。
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
- 版本 v0.2.0，第 1、2 週完成。下一步：第 3 週技能系統（SkillSystem：Q 火球、W 冰霜新星、E 烈焰爆發、R 閃現，冷卻遮罩、MP 消耗）。
- 普攻已完成（`Game.basicAttack` → `ProjectileSystem`）。技能 Q/W/E/R 與 AUTO 按鈕仍只顯示「第 N 週實作」提示（`Game.handleActions`）。
- 自動化測試：`npm test`（Vitest，純邏輯）；瀏覽器測試用 `?debug` + `__game.debugAdvance(秒)` 快轉，不要用 setTimeout 等待（無 GPU 環境只有 3~4 FPS）。
- 選單的裝備 / 強化 / 商城分頁是佔位（`Menu.PLANNED`）。
