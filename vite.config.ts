/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

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
  plugins: mode === 'single' ? [viteSingleFile()] : [],
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
