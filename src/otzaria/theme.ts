import type { ThemePayload } from './otzaria_plugin';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** מחיל theme שמגיע מ-plugin.boot / theme.changed על משתני ה-CSS. */
export function applyTheme(theme: ThemePayload | undefined): void {
  if (!theme) return;
  const root = document.documentElement;
  const c = theme.colorScheme;
  if (c) {
    const map: Record<string, string | undefined> = {
      '--color-primary': c.primary,
      '--color-on-primary': c.onPrimary,
      '--color-secondary': c.secondary,
      '--color-on-secondary': c.onSecondary,
      '--color-surface': c.surface,
      '--color-on-surface': c.onSurface,
      '--color-surface-container-highest': c.surfaceContainerHighest,
      '--color-error': c.error,
      '--color-on-error': c.onError,
      '--color-outline': c.outline,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v) root.style.setProperty(k, v);
    }
    if (c.primary) {
      root.style.setProperty('--color-primary-subtle', hexToRgba(c.primary, 0.12));
      root.style.setProperty('--color-primary-hover', hexToRgba(c.primary, 0.08));
    }
    if (c.secondary) {
      root.style.setProperty('--color-secondary-subtle', hexToRgba(c.secondary, 0.12));
    }
  }
  if (theme.typography) {
    const t = theme.typography;
    if (t.fontFamily) {
      root.style.setProperty('--font-main', `'${t.fontFamily}','Frank Ruhl Libre','David',serif`);
    }
    if (t.fontSize) root.style.setProperty('--font-size-base', `${t.fontSize}px`);
    if (t.lineHeight) root.style.setProperty('--line-height', String(t.lineHeight));
  }
  document.body.classList.toggle('dark-mode', theme.mode === 'dark');
}
