# 開發規範

## 程式

- TypeScript `strict`，不允許 `any`；`npm run build` 必須零錯誤才能提交。
- 匯入一律使用 `@/` 別名（`import { bus } from '@/core/EventBus'`）。
- 一個檔案一個主要類別，檔名 = 類別名（PascalCase）；純資料或工具檔用 camelCase。
- 註解、UI 文字使用**繁體中文**；識別字（變數、函式、型別）用英文。
- 系統類別都提供 `update(dt: number)`，`dt` 單位是秒。
- 不在系統之間直接互相呼叫；需要溝通時在 `GameEvents` 新增事件。
- UI 不用框架，用 `ui/dom.ts` 的 `h()` 建 DOM；樣式寫在 `ui/style.css`，顏色用 `:root` 變數。
- 手機優先：按鈕用 `pointerdown`（不用 `click`），觸控目標至少 40px。

## 座標系與單位

| 項目 | 規定 |
|---|---|
| x | 向右 = 東 |
| z | 向下 = 南（攝影機在南邊往北看，所以畫面「上」= −z） |
| y | 向上 |
| 長度 | 公尺；角色半徑 0.55、移動速度 6.5 m/s |
| 角度 | 弧度；`facing = 0` 朝 +z（南） |
| 時間 | 秒 |

## 命名

| 種類 | 規則 | 範例 |
|---|---|---|
| 區域 id | snake_case | `dungeon_1`、`grassland` |
| 技能 / 物品 / 怪物 id | snake_case | `fireball`、`tide_gloves`、`giant_crab_king` |
| 事件名稱 | `領域:動作` | `zone:enter`、`menu:open` |
| CSS class | kebab-case | `status-card`、`zone-banner` |

## 新增內容的步驟

### 新增關卡、小怪、首領、招式、敵人造型
見 **`docs/CONTENT.md`**（一個關卡一個檔案在 `data/stages/`，招式在 `data/bossSkills.ts`，造型在 `entities/enemyShapes/`；`npm test` 的內容一致性檢查會抓出漏接）。

### 新增場景物件種類
1. `PropKind` 加上新 kind。
2. `world/Props.ts` 的 `PROP_DEFAULTS` 加尺寸與是否阻擋，`buildProp()` 加外觀。
3. 小地圖顏色在 `ui/Minimap.ts` 視需要調整。

### 新增事件
1. `core/EventBus.ts` 的 `GameEvents` 加一行：`'名稱': payload 型別`。
2. 發出：`bus.emit('名稱', {...})`；接收：`bus.on('名稱', fn)`（回傳值可取消訂閱）。

### 新增裝備 / 道具
裝備命名在 `data/gear.ts`（各職業標準裝前綴、每欄位 10 件神話裝），屬性在 `data/items.ts` 自動算；道具在 `data/consumables.ts`。

### 改存檔欄位
1. 改 `GameState` 介面與 `newGameState()`。
2. `SAVE_VERSION + 1`。
3. `SaveSystem.migrate()` 補舊存檔的預設值。

## 效能預算（中階 Android 手機）

| 項目 | 上限 |
|---|---|
| FPS | 穩定 60（最低 45） |
| Draw calls | < 150 |
| 同畫面敵人 | < 30 |
| 陰影貼圖 | 1024²，只有太陽一盞燈投影 |
| devicePixelRatio | 上限 2 |
| 首次載入（gzip） | < 2 MB（不含音樂） |

在設定開「顯示 FPS」即可在手機上檢查。

## Git

- 分支：`main` = 可玩版本（自動部署）；功能在 `week-N/功能名` 分支開發，完成後合併。
- Commit 訊息：`[W2] 新增傷害公式與受擊飄字`（W = 週次）。
- 每週結束：更新 `CHANGELOG.md`、勾選 `docs/ROADMAP.md`、`package.json` 版本 +0.1。
