# 打包成 App（Capacitor）

網頁版就能在手機玩，也能「加到主畫面」（PWA）。要上架 Google Play / App Store 時用 Capacitor 包成原生 App。

## Android（Google Play）

需要：Android Studio（含 Android SDK）、JDK 21。

```bash
npm install
npm run app:sync     # 建置網頁版並複製到 android/
npm run app:open     # 用 Android Studio 開啟 android/ 專案
```

在 Android Studio：
1. 第一次開啟等 Gradle 同步完成。
2. 接上手機（開發者模式 + USB 偵錯）按 ▶ 執行，就能實機測試。
3. 上架：Build → Generate Signed Bundle / APK → Android App Bundle（.aab），建立金鑰並妥善保存。
4. 版本號在 `android/app/build.gradle` 的 `versionCode`（每次上架 +1）與 `versionName`。

App 圖示：用 Android Studio 的 Image Asset 工具，來源用 `public/icons/icon-512.png`。

## iOS（App Store）

需要：Mac、Xcode、Apple Developer 帳號（年費）。

```bash
npm i @capacitor/ios@7
npx cap add ios
npm run build && npx cap sync ios
npx cap open ios
```

## 注意事項

- App 內的雲端存檔一樣連 `server/` 的 API；Capacitor 的網頁來源是 `https://localhost`，
  記得把它加到 `server/wrangler.toml` 的 `ALLOWED_ORIGINS`。
- 每次改完遊戲程式都要 `npm run app:sync` 再重新建置 App。
- 設定：`capacitor.config.ts`（App ID `com.weistudio.littlemage`、名稱「小法師」）。
