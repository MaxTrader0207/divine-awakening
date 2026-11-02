# 小法師 Little Mage

手機直式、3D 低多邊形、俯視角的單機動作 RPG。
主城 → 野外 → 三層副本（擊敗首領解鎖下一層），法師職業，搖桿 + Q/W/E/R 技能 + AUTO 自動戰鬥。

- 引擎：**Three.js**（WebGL）＋ **TypeScript** ＋ **Vite**
- 平台：手機瀏覽器（直式），桌機會以手機比例置中顯示
- 部署：GitHub Pages（推到 `main` 自動部署）
- 開發商：Wei Studio

## 快速開始

```bash
npm install
npm run dev          # 開發伺服器（--host：同 Wi-Fi 的手機可用 http://<電腦IP>:5173 測試）
npm run build        # 型別檢查 + 建置到 dist/
npm run build:single # 建置成單一 HTML（dist-single/index.html），方便分享
npm run preview      # 預覽 dist/
```

網址加上 `?debug` 會開放主控台的 `window.__game`（開發模式預設開啟）。

## 操作

| 動作 | 手機 | 電腦（測試用） |
|---|---|---|
| 移動 | 左下搖桿 | WASD / 方向鍵 |
| 普攻 | 右下大按鈕 | J / 空白鍵 |
| 技能 Q W E R | 右下技能按鈕 | U I O P |
| 紅 / 藍藥水 | 左側 1 / 2 | 1 / 2 |
| AUTO | AUTO 按鈕 | T |
| 選單 | 右上「選單」 | M / Esc |
| 鏡頭縮放 | 右上 + / − | — |

## 文件

| 文件 | 內容 |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 系統架構、資料流、每幀更新順序、檔案地圖 |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | 程式規範、命名、座標系、新增內容的步驟 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 10 週 MVP 進度表與每週驗收條件 |
| [CHANGELOG.md](CHANGELOG.md) | 版本紀錄 |
| [CLAUDE.md](CLAUDE.md) | 給 AI 協作的接手說明（每次開新對話先讀） |

## 目前進度

**v0.1.0 — 第 1 週：專案骨架與移動 ✅**（詳見 ROADMAP）
