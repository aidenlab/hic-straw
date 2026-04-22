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
      // Don't bundle hdf5-indexed-reader (or its transitive deps like node-fetch)
      // into the library — consumers install it themselves. This avoids dragging
      // Node-only modules (node:http, node:fs, etc.) into browser builds.
      external: [
        /^hdf5-indexed-reader(\/|$)/,
        'node-fetch',
      ],
      output: {
        esModule: true,
        exports: 'named',
      },
    },
    sourcemap: true,
  },
});
