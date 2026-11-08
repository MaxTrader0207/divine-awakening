/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * 離線遊玩（v1.85）：建置完成後把 dist/ 裡所有檔案列進 sw.js 的預先快取清單，
 * 版本號＝遊戲版本＋檔案清單雜湊（每次發版自動換快取，不用手動改 sw.js）。
 */
function precacheSW() {
  let outDir = 'dist';
  return {
    name: 'precache-sw',
    apply: 'build' as const,
    configResolved(c: { build: { outDir: string } }) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const list = files.filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha1').update(list.join('|')).digest('hex').slice(0, 8);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace('__SW_VERSION__', `${pkg.version}-${hash}`)
        .replace('[/*__PRECACHE__*/]', JSON.stringify(['./', ...list.map((f) => `./${f}`)]));
      writeFileSync(swPath, sw);
    },
  };
}

// mode "single"：把整個遊戲打包成單一 HTML（方便分享、預覽）
// 一般 build：輸出到 dist/，相對路徑，可直接放 GitHub Pages
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      // 單一 HTML 版用免 WebAssembly 的模型（見 src/assets/Assets.ts）
      '@models': fileURLToPath(new URL(mode === 'single' ? './src/assets/models-plain' : './src/assets/models', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [precacheSW()],
  test: {
    // server/ 是 Cloudflare Worker 的整合測試，需要另外啟動本機 API，不在這裡跑
    exclude: ['node_modules/**', 'server/**', 'dist/**'],
  },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
}));
