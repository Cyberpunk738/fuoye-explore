import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        explorer: fileURLToPath(new URL('./index.html', import.meta.url)),
        review: fileURLToPath(new URL('./review.html', import.meta.url)),
      },
    },
  },
});
