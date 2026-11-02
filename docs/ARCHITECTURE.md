# 系統架構

## 設計原則

1. **資料驅動**：地圖、技能、怪物、裝備都是 `src/data/` 裡的純資料。加內容 = 改資料，不改系統程式。
2. **系統之間用事件溝通**：透過 `core/EventBus.ts` 的型別化事件，避免系統互相 import 造成糾纏。
3. **Game 只做組裝與調度**：每個功能是一個獨立類別，Game 負責建立它們、依序呼叫 `update(dt)`。
4. **狀態與表現分離**：`GameState` 只存可序列化的進度資料（會存檔）；Three.js 物件屬於表現層，不存檔。
5. **不用物理引擎**：碰撞是 xz 平面的「圓 vs 圓 / 圓 vs 矩形」，簡單、可預期、手機上便宜。
6. **灰盒優先**：美術用程式產生的低多邊形方塊，玩法確定後（第 8 週）再替換成 glTF 模型。

## 資料夾地圖

```
src/
├─ main.ts                進入點：找 DOM、建立 Game、啟動
├─ env.d.ts               全域型別（__APP_VERSION__）
├─ core/
│  ├─ Game.ts             組裝所有系統、主迴圈、區域切換、存檔時機
│  ├─ EventBus.ts         型別化事件匯流排（GameEvents 介面登記所有事件）
│  ├─ GameState.ts        存檔資料結構、新遊戲預設值、解鎖判斷
│  └─ SaveSystem.ts       SaveBackend 介面 + LocalSave（localStorage）+ 版本遷移
├─ data/                  ★ 遊戲內容（純資料）
│  ├─ types.ts            所有資料型別：ZoneDef、PropDef、SkillDef、ItemDef、EnemyDef、Stats
│  ├─ zones.ts            5 個區域：主城、新手草原、副本 1~3；世界地圖清單
│  └─ player.ts           基礎屬性、升級成長、經驗曲線、法師技能表
├─ input/
│  ├─ InputManager.ts     鍵盤 + 搖桿 + 按鈕 → move 向量與 action 事件
│  └─ VirtualJoystick.ts  觸控搖桿
├─ entities/
│  └─ Player.ts           小法師：模型、移動、朝向、走路動畫、屬性
├─ camera/
│  └─ CameraRig.ts        斜俯視跟隨、縮放 80%~150%
├─ world/
│  ├─ ZoneManager.ts      載入/卸載區域、天空與霧、傳送點偵測
│  ├─ Zone.ts             依 ZoneDef 建出場景、碰撞、傳送點；dispose
│  ├─ Props.ts            灰盒物件工廠（房子、樹、石頭…）＋ 預設碰撞尺寸
│  ├─ Collision.ts        2D 碰撞世界
│  └─ Label.ts            Canvas 文字 Sprite（招牌、傳送點名稱）
└─ ui/
   ├─ Hud.ts              狀態框、小地圖、貨幣、提示、橫幅、藥水、技能按鈕
   ├─ Minimap.ts          小地圖（靜態層快取 + 玩家箭頭）
   ├─ Menu.ts             選單：裝備 / 強化 / 商城 / 地圖 / 設定
   ├─ dom.ts              h() 極簡 DOM 建構
   └─ style.css           全部 UI 樣式（:root 變數）
```

## 每幀更新順序（Game.frame）

```
Timer.update → dt（上限 0.05 秒）
InputManager.update        讀鍵盤/搖桿 → move 向量
選單開關判斷
handleActions              技能、藥水、AUTO 按鈕（消耗 action）
Player.update              移動 + 碰撞 + 動畫
ZoneManager.checkPortals   踏入傳送點 → 發出 zone:request 或 menu:open
ZoneManager.update         場景動畫（水面、水晶）
CameraRig.update           平滑跟隨
followSun                  陰影光源跟著玩家
Hud.update                 小地圖、提示輪播、FPS
render
InputManager.endFrame      清除未消耗的 action
每 10 秒 autosave
```

**之後加入的系統插入位置**（照順序）：
`handleActions` → `SkillSystem` → `Player.update` → `EnemyAI` → `Projectiles` → `CombatSystem`（傷害結算）→ `LootSystem` → `checkPortals` …

## 事件一覽（core/EventBus.ts）

| 事件 | 發出者 | 接收者 | 用途 |
|---|---|---|---|
| `zone:request` | ZoneManager、Menu | Game | 要求切換區域（淡出 → 載入 → 淡入） |
| `zone:enter` | Game | （未來：音樂、任務） | 區域載入完成 |
| `menu:open` | Hud、ZoneManager（傳送石） | Menu | 開啟選單到指定分頁 |
| `camera:zoom` | Hud | Game | 縮放 ±10% |
| `toast` / `banner` | 任何系統 | Hud | 短訊息 / 進入區域大字 |
| `save:request` / `save:written` | 任何系統 / Game | Game / — | 立即存檔 |
| `player:changed` / `wallet:changed` | （第 2 週起） | Hud | 數值變動刷新 HUD |

## 存檔

- `GameState` 透過 `SaveBackend` 介面存取，目前實作 `LocalSave`（localStorage，key `little-mage.save.v1`）。
- 存檔時機：每 10 秒、切換區域後、分頁隱藏 / 關閉時。
- 讀寫全部 try/catch；無痕模式下可玩但不保存。
- **改存檔結構時**：`SAVE_VERSION + 1`，在 `SaveSystem.migrate()` 補舊版遷移。
- 之後要雲端存檔：寫一個 `CloudSave implements SaveBackend`（Cloudflare Workers + D1），在 Game 替換即可。

## 戰鬥系統預定設計（第 2~5 週）

```
傷害 = max(1, atk × 技能倍率 − 目標防禦 × (1 − 穿透)) × (爆擊 ? critDmg : 1) × 浮動(0.9~1.1)
```

- `Stats` 已在 `data/types.ts` 定義（maxHp、maxMp、atk、def、pen、moveSpeed、critRate、critDmg）。
- 副本的 `enemyDefense`（0 / 18 / 40）直接套用到該層怪物，讓「堆穿透」成為裝備選擇的理由。
- 怪物 AI 狀態機：`Idle → Patrol → (Aggro | Retaliate) → Attack → Return`；`aggro: 'passive'` 的怪只在受擊後進入 Retaliate。
- 玩家「被攻擊時自動反擊最近敵人」與 AUTO 共用同一個 `TargetSelector`。
