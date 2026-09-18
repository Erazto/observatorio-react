import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./maintenance', import.meta.url)),
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
