import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/aicursor/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'demo.html'),
        music: resolve(__dirname, 'music.html'),
        movies: resolve(__dirname, 'movies.html')
      }
    }
  }
});
