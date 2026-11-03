# 系統架構

## 設計原則

1. **資料驅動**：地圖、敵人、技能、裝備都是 `src/data/` 的純資料。加內容 = 改資料，不改系統。
2. **系統之間用事件溝通**：`core/EventBus.ts` 的型別化事件，避免系統互相 import 糾纏。
3. **Game 只做組裝與調度**：每個功能一個類別，Game 建立它們、依序呼叫 `update(dt)`。
4. **狀態與表現分離**：`GameState` 只存可序列化的進度（會存檔）；Three.js 物件屬於表現層。
5. **規則寫成純函式**：傷害、成長、背包、強化、掉落、預警判定都可單元測試（`*.test.ts`）。
6. **不用物理引擎**：xz 平面的「圓 vs 圓 / 圓 vs 矩形」碰撞＋高度查詢（高台）。
7. **程式產生的低多邊形模型**：外觀集中在 `world/Props.ts` 與 `entities/*`，換成 glTF 時只改這兩處。
8. **邏輯與渲染分開**：`tick(dt)` 推進邏輯、`render` 畫面；`debugAdvance()` 可快轉做自動化測試與平衡模擬。

## 資料夾地圖

```
src/
├─ main.ts                    進入點：載入模型 → 開頭畫面（選存檔）→ 選職業（空欄位）→ 建立 Game、註冊 PWA
├─ core/
│  ├─ Game.ts                 組裝所有系統、主迴圈、區域切換、死亡復活、擊殺獎勵、存檔時機
│  ├─ EventBus.ts             型別化事件匯流排（GameEvents 登記所有事件）
│  ├─ GameState.ts            存檔結構 v2、新遊戲預設、副本解鎖判斷
│  └─ SaveSystem.ts           10 格存檔 SaveSlots、LocalSave（使用中欄位）、版本遷移
├─ data/                      ★ 遊戲內容（純資料）
│  ├─ types.ts                所有資料型別
│  ├─ zones.ts                主城、阿卡迪亞草原、三層副本（地形、高台、生怪、傳送、商店入口）
│  ├─ enemies.ts              木樁 + 8 種小怪 + 3 首領
│  ├─ items.ts                裝備底材（6 欄 × 3 階）、稀有度、強化、價格、屬性顯示
│  ├─ classes.ts              職業（法師、弓手、騎士、狂戰士、召喚師）、怒氣規則 RAGE
│  ├─ minions.ts              召喚物（斯巴達亡靈、提瑞西阿斯亡靈、埃阿斯亡靈）：屬性倍率、存在時間、上限、嘲諷：屬性、成長、技能表、模型動畫、武器名稱
│  └─ player.ts               經驗曲線、statsForLevel(level, class)
├─ input/                     InputManager（鍵盤 + 搖桿 + 按住）、VirtualJoystick
├─ entities/
│  ├─ Player.ts               小法師：模型、移動、施法 / 受傷 / 倒地動畫、無敵、地面高度
│  ├─ Enemy.ts                敵人：程式造型或骷髏骨架模型、HP、閃白 / 緩速 / 前搖變色、血條、死亡重生
│  ├─ Minion.ts               召喚物：眼火、法陣、靈魂火焰、HP、綠色血條、出現 / 倒下動畫
│  ├─ BoneSkeleton.ts         程式骷髏（召喚物外觀）：骨頭、肋骨、頭骨、帽子 / 頭盔、武器，關節動畫（走、劈、施法、受擊）
│  └─ CharacterRig.ts         骨架動畫：循環層（待機/跑）＋單次層（攻擊/受擊）＋死亡
├─ systems/
│  ├─ Combat.ts               傷害公式（純函式）
│  ├─ Damage.ts               傷害結算入口（發 combat:hit / enemy:killed）
│  ├─ SkillSystem.ts          普攻 + Q/W/E/R、冷卻、MP、藥水（三職業的技能效果）
│  ├─ ProjectileSystem.ts     投射物（追蹤、範圍爆炸）物件池
│  ├─ Effects.ts              地面特效池（光圈、圓盤、光柱）
│  ├─ TargetSelector.ts       鎖定目標、腳下紅圈
│  ├─ EnemyManager.ts         生怪（數量、散佈）、AI 更新、互相推擠、查詢
│  ├─ EnemyAI.ts              小怪狀態機 idle / wander / chase / attack / return；被嘲諷時改打召喚物
│  ├─ MinionManager.ts        召喚物 AI：跟隨、選目標、攻擊、嘲諷、冥府骨爆
│  ├─ BossController.ts       首領技能輪替、二階段狂暴
│  ├─ Telegraphs.ts           紅色範圍預警（圓 / 扇形 / 長方形）與判定
│  ├─ AutoBattle.ts           AUTO：喝藥、閃預警、撿東西、選目標、技能優先序、沿牆繞路
│  ├─ Progression.ts          經驗（等級差修正）、升級、金幣（純函式）
│  ├─ Inventory.ts            背包、裝備、屬性計算、賣出、強化（純函式）
│  ├─ LootTable.ts            掉落擲骰（純函式）
│  ├─ LootSystem.ts           地上掉落物、自動拾取
│  ├─ DailyQuests.ts          每日任務（純函式）
│  └─ Quality.ts              畫質分級與自動降級
├─ audio/
│  ├─ Audio.ts                Web Audio 合成音效、音樂匯流排、選曲（區域 / 魔王戰 / 勝利）
│  ├─ Music.ts                背景音樂引擎：16 分音符排程、樂器合成、鼓組、淡入淡出、魔王二階段、離線輸出
│  └─ songs.ts                曲譜資料（和弦、旋律、貝斯、鼓組、段落）
├─ assets/
│  ├─ Assets.ts               載入 KayKit 模型（meshopt）、Lambert 材質、靜態複製 / 骨架複製、蒙皮網格合併
│  ├─ models/*.glb            meshopt 壓縮版（一般建置），由 scripts/build-assets.mjs 產生
│  └─ models-plain/*.glb      只量化、免 WebAssembly 版（單一 HTML / Artifact 用）
├─ net/Cloud.ts               雲端存檔與排行榜用戶端（逾時、離線、轉移碼）
├─ camera/CameraRig.ts        斜俯視跟隨、縮放 80%~150%、跟隨地面高度
├─ world/
│  ├─ ZoneManager.ts          載入 / 卸載區域、天空與霧、傳送點、商店入口
│  ├─ Zone.ts                 依 ZoneDef 建場景、高台與石階、碰撞、heightAt()
│  ├─ Props.ts                低多邊形物件工廠（含首領石圈、水晶）＋ 碰撞尺寸
│  ├─ Collision.ts            2D 碰撞世界
│  └─ Label.ts                Canvas 文字 Sprite
└─ ui/
   ├─ Hud.ts                  狀態框、小地圖、貨幣、提示、橫幅、撿寶訊息、首領血條、冷卻遮罩、AUTO
   ├─ Menu.ts                 選單殼與「地圖 / 設定」分頁
   ├─ InventoryTabs.ts        「裝備 / 強化 / 商城」分頁
   ├─ CloudTabs.ts            雲端存檔卡片、「排行」分頁
   ├─ PauseScreen.ts          暫停畫面：繼續、存檔、設定、裝備、地圖、回到開頭畫面
   ├─ TitleScreen.ts          開頭畫面：繼續遊戲、10 格存檔（選擇 / 新遊戲 / 刪除）
   ├─ DamageNumbers.ts        傷害數字與漂浮文字（DOM 物件池）
   ├─ Minimap.ts、dom.ts、style.css
public/                       manifest.webmanifest、sw.js、icons/（PWA）
server/                       Cloudflare Worker + D1（雲端 API，獨立 npm 專案）
android/                      Capacitor Android 專案
scripts/build-assets.mjs      素材管線
```

## 每幀更新順序

```
frame():  Timer.update → （暫停中：pausedFrame() 只處理繼續鍵）否則 tick(dt，上限 0.05 秒) → render
tick(dt):
  InputManager.update
  選單開關
  SkillSystem.update        冷卻、延遲技能（烈焰爆發）
  反擊計時、死亡倒數、自然回復
  ── 可操作時 ──
  handleActions             普攻（按住連發）、技能、藥水、AUTO 開關、被打自動反擊
  AutoBattle.update         決定 AUTO 移動方向與施法
  Player.update             移動（手動優先，否則 AUTO）+ 敵人推擠 + 地形碰撞
  ZoneManager.checkPortals / checkTriggers
  ── 世界 ──
  Player 地面高度
  EnemyManager.update       AI → 動畫 → 互相推擠
  MinionManager.update      召喚物 AI、存在時間、動畫
  BossController.update     首領技能
  Telegraphs.update         預警長滿 → 結算
  Effects / LootSystem / ProjectileSystem / TargetSelector / Zone 動畫
  CameraRig、太陽光跟隨、DamageNumbers
  首領血條、音樂切換、HUD
  InputManager.endFrame、每 10 秒自動存檔
```

## 事件一覽

| 事件 | 發出者 | 主要接收者 |
|---|---|---|
| `zone:request` / `zone:enter` | ZoneManager、Menu / Game | Game / — |
| `menu:open` | Hud、傳送石、商店入口 | Menu、Audio |
| `camera:zoom` | Hud | Game |
| `toast` / `banner` / `float:text` | 任何系統 | Hud / DamageNumbers |
| `combat:hit` | Damage、Game.hitPlayer | DamageNumbers、Hud（受傷紅框）、Audio |
| `enemy:killed` | Damage | Game（經驗金幣、首領解鎖）、LootSystem、Audio |
| `player:hurt` / `player:died` / `player:levelup` | Game | Game（反擊、復活）、Audio |
| `player:changed` / `wallet:changed` | 任何系統 | Hud |
| `skill:cast` | SkillSystem | Audio |
| `loot:picked` | LootSystem | Hud（撿寶訊息）、Audio |
| `boss:cast` / `boss:defeated` | BossController / Game | Audio / — |
| `settings:changed` | Menu | Audio |
| `save:request` / `save:written` | 任何系統 / Game | Game / — |

## 戰鬥

```
raw  = atk × 技能倍率
基礎 = max(raw × 10%, raw − 防禦 × (1 − 穿透))
最終 = round(基礎 × 浮動(0.9~1.1) × (爆擊 ? critDmg : 1))，至少 1
```

- 敵人打玩家用同一個公式（敵人穿透 0、爆擊 5%）。
- 首領技能傷害 = 公式 × 技能倍率（1.4~2.2），只有預警結算時站在範圍內才會受傷。
- AUTO 只會察覺 65% 的預警（`AUTO_DODGE_CHANCE`），手動操作可以全部閃掉。

## 存檔（v4）

- v2 背包與裝備、v3 每日任務（`daily`）、v4 職業（`heroClass`）。舊存檔讀入時自動遷移。


- 多存檔：`SaveSlots` 管 10 格（localStorage `little-mage.save.slot1`~`slot10`；v1.19 前是 5 格，鍵名相同所以舊存檔直接沿用），使用中欄位記在 `little-mage.activeSlot`。選單「存檔」分頁可立即存檔、另存、讀取（切換欄位會重新載入頁面）、在空格開新遊戲、刪除。
- 開頭畫面：每次打開遊戲先顯示；從選單「讀取 / 開新遊戲」切換時用 sessionStorage 旗標略過一次；網址帶 `?class=` 時略過（測試用）。
- 舊版單一存檔 `little-mage.save.v1` 第一次啟動時自動搬到第 1 格。
- `GameState` 經 `SaveBackend` 存取，`LocalSave` 讀寫使用中的那一格；雲端存檔上傳 / 下載的也是使用中的那一格。
- 物品只存「底材 id、稀有度、強化等級」，屬性即時計算 → 調整平衡不會讓舊存檔失真。
- v1 → v2 遷移：補背包欄位與新手法杖。
- 時機：每 10 秒、切換區域、撿到 / 買賣 / 強化裝備、死亡復活、分頁隱藏。
- 雲端存檔：實作 `CloudSave implements SaveBackend`（Cloudflare Workers + D1）即可替換。

## 背景音樂

| 曲子 id | 曲名 | 用在 | 速度 | 特色 |
|---|---|---|---|---|
| `town` | 雅典的午後 | 主城 | 96 | C 大調、木管旋律、撥弦琶音、沙鈴 |
| `grassland` | 阿卡迪亞小冒險 | 阿卡迪亞草原 | 128 | G 大調、8-bit 方波旋律、跳躍貝斯 |
| `forest` | 聖林小徑 | 多多納聖林 | 112 | D 多利安、木管＋鈴聲 16 分琶音，輕快帶點神秘 |
| `dungeon` | 神殿探險 | 三層副本 | 120 | A 小調冒險感、推進貝斯 |
| `boss` | 巨影來襲 | 首領進入戰鬥 | 152 | E 弗里吉安、16 分音符降二度低音、太鼓、銅管重音；血量 < 50% 加 16 分踩鈸、弦樂顫音、更多銅管 |
| `victory` | 勝利 | 擊敗首領（不循環） | 132 | 播完自動回到區域音樂 |

- `Game.tick()`：有交戰中的首領 → `setMusic('boss')`＋`setBossIntensity(血量<50% ? 1 : 0)`；否則播 `ZoneDef.music`（沒填依 kind）。
- 換曲：一般 0.7 秒淡出淡入；進魔王戰 0.25 秒快速切換。
- 排程落後（手機卡頓）時跳過錯過的拍子，保持節拍。

## 暫停

- `Game.setPaused(v)`：暫停時 `frame()` 不呼叫 `tick()`，所以敵人、首領技能、預警、冷卻、自動回復、AUTO、遊戲時間、自動存檔計時全部停住；畫面照常渲染。
- 進入暫停會先存檔；音樂轉小聲（30%），音效除了 UI 按鈕都靜音。
- 觸發：HUD 右上「暫停」鈕（`pause:toggle` 事件）、電腦按 Esc、切到別的 App / 分頁（`visibilitychange` hidden）自動暫停。換地圖中、倒地時不能暫停。
- 暫停中可以開選單（存檔、設定、裝備、地圖）；選單開著時暫停畫面隱藏，關掉後回到暫停畫面。
- 選單本身不會暫停世界（沿用原設計）。
