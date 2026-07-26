import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// הטסטים רצים על אותה תצורת Vite של האפליקציה (docxBase64, react, define:global),
// כדי שייבוא .docx ו-mammoth יתנהגו בטסטים בדיוק כמו בבנייה.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      clearMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
      testTimeout: 20000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/icons/**'],
      },
    },
  }),
);
