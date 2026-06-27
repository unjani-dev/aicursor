import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.js'),
        content: resolve(__dirname, 'content.js'),
        offscreen: resolve(__dirname, 'offscreen.html'),
        popup: resolve(__dirname, 'popup.html'),
        permission: resolve(__dirname, 'permission.html') // File baru untuk izin
      },
      output: { 
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'content.css', dest: '.' },
        { src: 'icons/*', dest: 'icons' },
        { src: '../../node_modules/@mediapipe/tasks-vision/wasm/*', dest: 'wasm' },
        { src: 'public/models/*', dest: 'models' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@ai-cursor/core-vision': resolve(__dirname, '../../packages/core-vision/src'),
      '@ai-cursor/gesture-engine': resolve(__dirname, '../../packages/gesture-engine/src'),
      '@ai-cursor/input-mapper': resolve(__dirname, '../../packages/input-mapper/src')
    }
  }
});