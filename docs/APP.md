# 打包成 App：Android App Bundle（.aab）

v1.112 起專案是 **Capacitor 8**（targetSdk 36 / Android 16），可以直接產出上架 Google Play 用的 `.aab`。
網頁版（GitHub Pages、PWA、單一 HTML）完全不受影響，同一份程式碼。

## 架構

```
src/（遊戲本體，Three.js + TypeScript）
  └─ platform/native.ts   ← 唯一碰 @capacitor/* 的檔案：全螢幕、返回鍵、切到背景存檔（網頁版自動略過）
npm run build → dist/     ← 網頁版
npx cap sync android      ← 把 dist/ 複製進 android/app/src/main/assets/public
android/（原生外殼）
  ├─ variables.gradle     ← minSdk 24、compileSdk / targetSdk 36
  ├─ app/build.gradle     ← 版本號讀 package.json、簽章讀 keystore.properties 或環境變數
  └─ app/src/main/…       ← MainActivity（螢幕恆亮）、Manifest、圖示、啟動畫面
./gradlew bundleRelease → android/app/build/outputs/bundle/release/app-release.aab
```

| 項目 | App 版的行為 |
|---|---|
| 畫面 | **只有橫式**（v1.113，Manifest 鎖 `sensorLandscape`，左右橫放都可以）；全螢幕（隱藏狀態列、導覽列），edge-to-edge；劉海 / 手勢條靠 `style.css` 的 `env(safe-area-inset-*)` 避開 |
| 返回鍵 / 手勢 | 關選單 → 暫停 → 再按一次縮到背景（`Game.handleBack()`） |
| 切到背景 | 立刻存檔並暫停；回來時重新隱藏系統列 |
| 螢幕 | 遊戲中恆亮（AUTO 掛機不會黑屏） |
| 離線 | 檔案全部包在 App 裡，不註冊 Service Worker（避免更新後還跑舊快取） |
| 存檔 | WebView 的 localStorage（鍵名仍是 `little-mage.*`）；雲端存檔照常，來源是 `https://localhost`（已在 `server/wrangler.toml` 的 `ALLOWED_ORIGINS`） |
| 震動 | `navigator.vibrate`（Manifest 已加 `VIBRATE` 權限） |
| 版本號 | `versionName` = package.json 的版本；`versionCode` = 主×1000000＋次×1000＋修（1.112.0 → 1112000） |

## 方法一：GitHub Actions 建置（不用裝 Android Studio）

`.github/workflows/android.yml`：推 `v` 開頭的標籤，或到 GitHub → Actions → **Build Android** → Run workflow。
完成後在該次執行的 Artifacts 下載 `divine-awakening-aab`（上架用）與 `divine-awakening-debug-apk`（直接裝到手機測試）。

### 簽章金鑰（只做一次，檔案與密碼請備份，遺失要找 Google 重設）

```bash
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 upload-keystore.jks   # macOS：base64 -i upload-keystore.jks
```

Repo → Settings → Secrets and variables → Actions 新增四個 secret：
`ANDROID_KEYSTORE_BASE64`（上面輸出的文字）、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`（`upload`）、`ANDROID_KEY_PASSWORD`。
沒設定也能建置，但 `.aab` 是未簽章的，Play 不收。

## 方法二：本機建置

需要：Node 22、JDK 21、Android Studio Otter（2025.2.1）以上（含 Android SDK 36）。

```bash
npm install
cp android/keystore.properties.example android/keystore.properties   # 填密碼，金鑰檔放 android/
npm run app:aab      # 建置網頁版 → 同步 → 產生 .aab
npm run app:apk      # debug .apk（android/app/build/outputs/apk/debug/）
npm run app:open     # 用 Android Studio 開啟，接手機按 ▶ 實機偵錯
```

`android/keystore.properties`、`*.jks` 已列入 `.gitignore`，不要提交。

## 上架 Google Play 檢查表

- [ ] Play Console 開發者帳號（一次性 25 美元）。**2023/11/13 之後建立的個人帳號**：要先跑封閉測試，至少 12 位測試者連續加入 14 天，才能申請正式發布。
- [ ] 建立 App（套件名稱 `com.weistudio.divineawakening`，**上架後不能改**）。
- [ ] 第一次上傳時開啟 Play App Signing（Google 保管正式金鑰，你手上的是上傳金鑰）。
- [ ] 商店資料：圖示 `store/play-icon-512.png`、主題圖片 1024×500、手機截圖至少 2 張（橫式 1920×1080 建議 4～8 張）、簡短說明（80 字內）、完整說明。
- [ ] 隱私權政策網址（有雲端存檔與排行榜就必填；可以放在 GitHub Pages）。
- [ ] 資料安全表單：雲端存檔會上傳「遊戲進度、玩家暱稱、裝置產生的識別碼」，照 `server/README.md` 實際收集的項目填。
- [ ] 內容分級問卷（奇幻暴力）、目標年齡層（建議 13 歲以上，避開兒童政策）、廣告聲明（無廣告）、App 內購（目前無）。
- [ ] 雲端 API：`server/wrangler.toml` 的 `database_id` 填好並部署（`deploy-api.yml`），否則 App 內雲端存檔連不到。
- [ ] 實機測試：`docs/DEVICE_TEST.md` 全部項目用 debug .apk 跑一次，另外加測「返回鍵、切到背景再回來、來電中斷、轉向、劉海機型、Android 7～8 舊機」。

### 套件名稱出現的位置（v1.112 已由 `littlemage` 改為 `divineawakening`；上架後不能再改）

`capacitor.config.ts` 的 `appId`、`android/app/build.gradle` 的 `namespace` 與 `applicationId`、`strings.xml` 的 `package_name` / `custom_url_scheme`、
`MainActivity.java` 的 package 與資料夾路徑。存檔鍵名不用動。

## 之後可以做（App 專屬）

- 存檔鏡射到 `@capacitor/preferences`（系統清 WebView 資料時多一層保險；目前靠 Android 自動備份＋雲端存檔）。
- Google Play Games 登入 / 成就、App 內評分、Play 內購（要加 Play Billing Library 8 以上）。
- 首包再縮小：模型改成進地圖才載入（目前 `.aab` 內網頁資源約 8 MB，不急）。

## iOS（App Store）

需要：Mac、Xcode 26、Apple Developer 帳號（年費）。

```bash
npm i @capacitor/ios@8
npx cap add ios
npm run build && npx cap sync ios
npx cap open ios
```

`src/platform/native.ts` 已經是跨平台寫法（iOS 沒有返回鍵，其餘相同）。

## 注意事項

- 每次改完遊戲程式都要 `npm run app:sync`（或直接 `npm run app:aab`）再重新建置 App。
- 每年 8 月底 Google 會提高 targetSdk 門檻（2026/8/31 起是 API 36）；屆時升級 Capacitor 大版本並改 `android/variables.gradle`。
- 除了 `src/platform/native.ts`，其他檔案不要 import `@capacitor/*`（單一 HTML 版與 claude.ai 預覽要能照常跑）。
