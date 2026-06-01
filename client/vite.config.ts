import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@SkillSeal/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  css: {
    // Force PostCSS (Tailwind) — disable lightningcss which doesn't understand @apply
    transformer: 'postcss',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:5000', ws: true, changeOrigin: true },
    },
  },
  build: {
    minify: 'esbuild',
    cssMinify: 'esbuild',   // use esbuild for CSS too, not lightningcss
    rollupOptions: { output: {} },
    sourcemap: mode === 'production' ? 'hidden' : true,
  },
}));