import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig({
  base: './',
  plugins: [react(), webviewCompatScript()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
  },
});
