# 素材來源

所有外部美術素材皆為 **CC0（公眾領域）**，可商用、不需署名（以下為禮貌性標註）。

| 素材包 | 作者 | 授權 | 使用於 |
|---|---|---|---|
| KayKit : Adventurers Character Pack 1.0 | Kay Lousberg（kaylousberg.com） | CC0 | 法師、弓手（Rogue）、騎士（Knight）角色與動畫 |
| KayKit Character Pack : Skeletons 1.0 | Kay Lousberg | CC0 | 迷霧森林骷髏敵人與動畫 |
| KayKit : Medieval Hexagon Pack 1.0 | Kay Lousberg | CC0 | 主城建築、樹、石頭、柵欄、帳篷、木桶、木箱 |
| KayKit : Dungeon Remastered 1.0 | Kay Lousberg | CC0 | 火把、旗幟、寶箱、碎石、桶子、箱堆 |

原始檔：github.com/KayKit-Game-Assets（各素材包的 LICENSE.txt）。

## 重新產生模型

```bash
# 1. 取得素材（放在專案外的任意資料夾）
git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0
git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0
git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0

# 2. 精簡（只留需要的動畫與零件、meshopt 壓縮）後輸出到 src/assets/models/
node scripts/build-assets.mjs <素材資料夾>
```

要加新模型：在 `scripts/build-assets.mjs` 的 `CHARACTERS` 或 `PROPS` 加一行，重跑腳本，
再在資料檔用 `model: '<id>'` 引用（場景物件見 `world/Props.ts`，敵人見 `EnemyDef.model`）。

音效與音樂目前為程式即時合成（`audio/Audio.ts`），沒有外部音檔。

## Quaternius — Easy Animated Enemy Pack（Frog）
- 作者：Quaternius（https://quaternius.com）
- 授權：CC0 1.0（公眾領域）
- 使用：`frog.glb`（泡咪潮蛙、火山蛙、熔心巨蛙）。原檔為 FBX，用 FBX2glTF 轉成 glb 後經 `scripts/build-assets.mjs` 壓縮。

## 背景音樂
- 6 首背景音樂（艾爾芙的午後、草原小冒險、霧中小徑、古道探險、巨影來襲、勝利）為本專案原創，以 Web Audio 即時合成（`src/audio/songs.ts`），無第三方音檔。
