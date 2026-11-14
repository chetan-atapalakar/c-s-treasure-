import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate build for the Android app. Does not touch the normal web build.
const renameEntry = {
  name: 'rename-entry',
  enforce: 'post',
  generateBundle(_, bundle) {
    for (const k in bundle) if (bundle[k].fileName === 'index.android.html') bundle[k].fileName = 'index.html';
  },
};

export default defineConfig({
  plugins: [react(), renameEntry],
  base: './',
  build: { outDir: 'dist-android', rollupOptions: { input: 'index.android.html' } },
});
