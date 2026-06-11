import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './'  → assets are referenced with relative paths, required because the
// Otzaria host loads index.html from the plugin directory (not from a web root).
// publicDir 'public' → everything under public/ (including data/*) is copied to
// dist/ as-is, so the standalone data files ship alongside the bundle.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
});
