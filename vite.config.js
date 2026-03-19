import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: false,
    assetsDir: 'assets',
  },
});
