import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    vue(),
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 只压缩大于 10KB 的文件
      deleteOriginFile: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分块策略
        manualChunks: {
          // Vue 核心和 Element Plus
          'vendor': ['vue', 'vue-router', 'pinia', 'element-plus'],
          // Socket.io
          'socket': ['socket.io-client'],
          // Axios
          'http': ['axios'],
        },
        // 为每个 chunk 文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]',
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 设置 chunk 大小警告的限制（KB）
    chunkSizeWarningLimit: 500,
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        // 删除 console
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 构建 target
    target: 'es2015',
    // Source map 选项
    sourcemap: false,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', 'axios', 'socket.io-client'],
  },
});
