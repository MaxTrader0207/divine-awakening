# 小法師 Little Mage

手機直式、3D 低多邊形、俯視角的單機動作 RPG。
主城 → 新手草原 → 三層副本（擊敗首領解鎖下一層），法師職業，搖桿 + Q/W/E/R 技能 + AUTO 自動戰鬥，
掉寶、裝備、強化、商店、首領紅色預警、每日任務、雲端存檔與排行榜。兩個職業：法師、弓手。

- 引擎：**Three.js**（WebGL）＋ **TypeScript** ＋ **Vite**
- 平台：手機瀏覽器（直式），桌機會以手機比例置中顯示
- 部署：GitHub Pages（推到 `main` 自動部署）；支援 PWA（加到主畫面、離線）
- 開發商：Wei Studio

## 快速開始

```bash
npm install
npm run dev          # 開發伺服器（--host：同 Wi-Fi 的手機可用 http://<電腦IP>:5173 測試）
npm run build        # 型別檢查 + 建置到 dist/
npm run build:single # 建置成單一 HTML（dist-single/index.html），方便分享
npm run preview      # 預覽 dist/
npm test             # 單元測試（Vitest）
npm run app:sync     # 建置並同步到 Android 專案（見 docs/APP.md）
```

網址參數：`?debug`（主控台 `__game`）、`?quality=high|medium|low`、`?class=mage|archer`（略過選職業）、`?api=<網址>`（指定雲端 API）。

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
| [docs/ROADMAP.md](docs/ROADMAP.md) | 10 週 MVP 進度表、MVP 之後的建議 |
| [docs/BALANCE.md](docs/BALANCE.md) | 數值表、首領戰與全流程模擬結果 |
| [docs/APP.md](docs/APP.md) | 打包成 Android / iOS App |
| [server/README.md](server/README.md) | 雲端 API 部署與測試 |
| [CREDITS.md](CREDITS.md) | 美術素材來源（KayKit CC0）與重新產生模型 |
| [CHANGELOG.md](CHANGELOG.md) | 版本紀錄 |
| [CLAUDE.md](CLAUDE.md) | 給 AI 協作的接手說明（每次開新對話先讀） |

## 內容

| 區域 | 建議等級 | 特色 |
|---|---|---|
| 主城艾爾芙 | — | 安全區、武器店 / 防具店 / 道具店 / 強化屋、傳送石 |
| 新手草原 | 1-10 | 史萊姆、蘑菇、三根訓練木樁（防禦 0 / 18 / 40） |
| 第一層 海岸古道 | 1-5 | 寄居蟹、泡咪潮蛙（被動），首領巨鉗蟹王 |
| 第二層 珊瑚洞窟 | 5-10 | 防禦 18，首領潮汐古魔像 |
| 第三層 熔心火山口 | 10-15 | 防禦 40，首領熔心巨蛙 |
| 迷霧森林（野外） | 11-25 | 骷髏群（含遠程法師）、菁英首領骷髏騎士長、第 4 階裝備 |

## 目前進度

**v1.7.0** — 10 週 MVP ＋ 正式美術、畫質設定、迷霧森林、每日任務、雲端存檔與排行榜、弓手、App 專案。
每個版本見 [CHANGELOG](CHANGELOG.md)，待辦見 [ROADMAP](docs/ROADMAP.md)。

git 標籤 `v0.1.0`～`v1.7.0`，可以 `git checkout <標籤>` 回到任何版本。
