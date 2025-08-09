import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Enables Jest-like global test functions (test, expect)
    environment: 'jsdom', // Simulates a browser for component tests
    setupFiles: './src/setupTests.js', // Equivalent to Jest's setup file
  },
  base: '',
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
      },
    },
  },
  server: {
    host: 'localhost',
    port: 3000,
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
  },
});