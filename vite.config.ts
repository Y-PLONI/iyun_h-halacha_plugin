import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// base: './'  → assets are referenced with relative paths, required because the
// Otzaria host loads index.html from the plugin directory (not from a web root).
//
// webviewCompatScript → converts the output <script type="module" crossorigin>
// to a plain <script defer> (and removes crossorigin from <link> tags).
// When a WebView loads from file://, Chromium-based engines (Android WebView,
// WebView2 on Windows) treat every file:// URL as a null/opaque origin, which
// causes any CORS module-script fetch to fail silently — the page stays blank.
// A deferred classic script has no CORS requirements and loads reliably.
// main.tsx wraps createRoot in a DOMContentLoaded guard so it works even when
// the script tag moves before <body> (the defer attribute makes this a no-op
// in practice, but it is robust insurance).
function webviewCompatScript(): Plugin {
  return {
    name: 'webview-compat-script',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return (
          html
            // <script type="module" crossorigin …> → <script defer …>
            .replace(/<script type="module" crossorigin/g, '<script defer')
            // strip crossorigin from stylesheet links
            .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"')
            // drop <link rel="modulepreload"> lines entirely (not needed for classic scripts)
            .replace(/\s*<link rel="modulepreload"[^>]*>\n?/g, '')
        );
      },
    },
  };
}

// copyPluginAssets → מעתיק manifest.json ו-icon/ אל תיקיית הבנייה בסיום כל build,
// כך ש-dist/ היא תמיד תיקיית תוסף שלמה (manifest + entrypoint + icon + data) שאוצריא
// יכול לטעון/לארוז. בלי זה, `vite build` לבדו (emptyOutDir מוחק ובונה מחדש) מייצר
// dist/ ללא manifest, ואוצריא נכשל בטעינה: "manifest.json לא נמצא בתיקיית התוסף".
// data/ מועתק ממילא דרך public/, ולכן כאן רק manifest+icon.
function copyPluginAssets(): Plugin {
  let root = '';
  let outDir = 'dist';
  return {
    name: 'copy-plugin-assets',
    apply: 'build',
    configResolved(config: ResolvedConfig) {
      root = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      const dist = join(root, outDir);
      const manifest = join(root, 'manifest.json');
      if (existsSync(manifest)) {
        copyFileSync(manifest, join(dist, 'manifest.json'));
      }
      const icon = join(root, 'icon');
      if (existsSync(icon)) {
        mkdirSync(join(dist, 'icon'), { recursive: true });
        cpSync(icon, join(dist, 'icon'), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), webviewCompatScript(), copyPluginAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
});
