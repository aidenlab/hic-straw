import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'HicStraw',
      fileName: (format) => `hic-straw.${format === 'es' ? 'esm' : 'cjs'}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        esModule: true,
        exports: 'named',
      },
    },
    sourcemap: true,
  },
});
