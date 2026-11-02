# 小法師 雲端 API（Cloudflare Workers + D1）

雲端存檔與排行榜的後端。遊戲在連不上這個 API 時會照常使用本機存檔。

## 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/health` | 健康檢查 |
| POST | `/api/register` | `{ name }` → `{ id, token, name }`（token 只回傳這一次） |
| GET | `/api/save` | 取得雲端存檔（需登入） |
| PUT | `/api/save` | `{ data, baseUpdatedAt?, force? }`，雲端較新時回 409 |
| POST | `/api/score` | `{ level, bosses, kills, playTime }` → `{ rank }` |
| GET | `/api/leaderboard?by=level\|kills` | 前 50 名 |

登入：`Authorization: Bearer <id>.<token>`（遊戲裡叫「轉移碼」）。資料庫只存 token 的 SHA-256。
限制：存檔最大 256 KB、同一帳號 4 秒內不能重複上傳、成績有基本合理性檢查。

## 第一次部署（約 5 分鐘）

```bash
cd server
npm install
npx wrangler login                      # 開瀏覽器登入你的 Cloudflare 帳號
npx wrangler d1 create little-mage      # 建立資料庫，複製輸出的 database_id
# 把 database_id 貼到 wrangler.toml 的 [[d1_databases]]
npm run db:remote                       # 建立資料表
npm run deploy                          # 部署，網址是 https://little-mage-api.<你的子網域>.workers.dev
```

部署後的網址如果不是 `https://little-mage-api.maxwei6699.workers.dev`，
在遊戲專案根目錄建立 `.env.production`：

```
VITE_API_BASE=https://little-mage-api.<你的子網域>.workers.dev
```

並把 GitHub Pages 的網址加進 `wrangler.toml` 的 `ALLOWED_ORIGINS`（預設已有 `https://maxtrader0207.github.io`）。

## 本機開發與測試

```bash
npm run db:local     # 建立本機資料庫（.wrangler/ 底下）
npm run dev          # http://127.0.0.1:8787
npm test             # 另開終端機：整合測試（註冊、存檔、衝突、限流、防作弊、排行榜）
```

遊戲接本機 API：開 `http://localhost:5173/?api=http://127.0.0.1:8787`。

## 用 GitHub Actions 自動部署（選用）

到 Cloudflare 建立 API Token（範本「Edit Cloudflare Workers」＋ D1 編輯權限），
放到 GitHub repo 的 Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
之後在 Actions 頁面手動執行「Deploy API」即可（`.github/workflows/deploy-api.yml`）。
