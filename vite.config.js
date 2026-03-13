import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        straw: resolve(__dirname, 'examples/straw.html'),
        liveContactMap: resolve(__dirname, 'examples/live-contact-map.html'),
      },
    },
  },
});
