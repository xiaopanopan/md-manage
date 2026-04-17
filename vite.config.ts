import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // 主进程入口
        entry: 'electron/main.ts',
        onstart(options) {
          // 清除 VSCode 继承的 ELECTRON_RUN_AS_NODE 环境变量
          // 否则 Electron 会以 Node.js 模式启动，无法访问 electron API
          const env = { ...process.env };
          delete env.ELECTRON_RUN_AS_NODE;
          options.startup(['.', '--no-sandbox'], { env });
        },
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Preload 脚本
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  base: './',
  build: {
    outDir: 'dist/renderer',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
  },
});
