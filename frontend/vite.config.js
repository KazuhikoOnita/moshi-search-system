import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: 'localhost',
    middlewareMode: false,
    hmr: {
      overlay: false,
    },
    // URI malformed問題を回避する設定
    fs: {
      strict: false,
    },
    // リクエストのデコードを無効化
    middlewareMode: false,
    // プロキシでAPIコールを処理
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})