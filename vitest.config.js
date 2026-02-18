import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js', 'test/testBufferedFile.js', 'test/throttleTest.js'],
    exclude: ['test/old/**'],
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
