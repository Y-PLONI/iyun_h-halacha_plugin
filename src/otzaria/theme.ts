import type { ColorScheme, ThemePayload } from './otzaria_plugin';
import { settingsStore } from '../state/settingsStore';
import type { FontMode } from '../data/types';

// ה-theme האחרון שהתקבל — דרוש כשמצב הגופן הוא 'otzaria' (שואב את גופן אוצריא).
let lastTheme: ThemePayload | undefined;

const SEGOE_STACK = "'Segoe UI','Segoe','David',sans-serif";

/** מחיל את העדפות הגופן של המשתמש: מצב גופן (ברירת מחדל/אוצריא) וגודל. */
export function applyFontPrefs(fontMode: FontMode, uiFontSize: number): void {
  const root = document.documentElement;
  const tp = lastTheme?.typography;
  if (fontMode === 'otzaria' && tp?.fontFamily) {
    root.style.setProperty('--font-main', `'${tp.fontFamily}','Segoe UI','David',sans-serif`);
    const cf = tp.commentatorsFontFamily || tp.fontFamily;
    root.style.setProperty('--font-commentators', `'${cf}','Segoe UI','David',serif`);
  } else {
    root.style.setProperty('--font-main', SEGOE_STACK);
    root.style.setProperty('--font-commentators', SEGOE_STACK);
  }
  if (uiFontSize) root.style.setProperty('--font-size-base', `${uiFontSize}px`);
}

function applyFontPrefsFromSettings(): void {
  const s = settingsStore.get().settings;
  applyFontPrefs(s.fontMode, s.uiFontSize);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

// מיפוי תפקיד צבע M3 -> שם משתנה CSS. כל מה שקיים ב-payload מוחל.
const ROLE_TO_VAR: Record<keyof ColorScheme, string> = {
  primary: '--color-primary',
  onPrimary: '--color-on-primary',
  primaryContainer: '--color-primary-container',
  onPrimaryContainer: '--color-on-primary-container',
  secondary: '--color-secondary',
  onSecondary: '--color-on-secondary',
  secondaryContainer: '--color-secondary-container',
  onSecondaryContainer: '--color-on-secondary-container',
  tertiary: '--color-tertiary',
  onTertiary: '--color-on-tertiary',
  tertiaryContainer: '--color-tertiary-container',
  onTertiaryContainer: '--color-on-tertiary-container',
  surface: '--color-surface',
  onSurface: '--color-on-surface',
  onSurfaceVariant: '--color-on-surface-variant',
  surfaceContainerLowest: '--color-surface-container-lowest',
  surfaceContainerLow: '--color-surface-container-low',
  surfaceContainer: '--color-surface-container',
  surfaceContainerHigh: '--color-surface-container-high',
  surfaceContainerHighest: '--color-surface-container-highest',
  error: '--color-error',
  onError: '--color-on-error',
  errorContainer: '--color-error-container',
  onErrorContainer: '--color-on-error-container',
  outline: '--color-outline',
  outlineVariant: '--color-outline-variant',
  inverseSurface: '--color-inverse-surface',
  onInverseSurface: '--color-on-inverse-surface',
  inversePrimary: '--color-inverse-primary',
  shadow: '--color-shadow',
  scrim: '--color-scrim',
  surfaceTint: '--color-surface-tint',
};

/** מחיל theme שמגיע מ-plugin.boot / theme.changed על משתני ה-CSS (Material 3). */
export function applyTheme(theme: ThemePayload | undefined): void {
  if (!theme) return;
  lastTheme = theme;
  const root = document.documentElement;
  const c = theme.colorScheme;
  if (c) {
    for (const [role, varName] of Object.entries(ROLE_TO_VAR)) {
      const val = c[role as keyof ColorScheme];
      if (val) root.style.setProperty(varName, val);
    }
    // צבעי container חסרים — נגזרים מ-primary/secondary בשקיפות
    if (!c.surfaceContainerHigh && c.surfaceContainerHighest) {
      root.style.setProperty('--color-surface-container-high', c.surfaceContainerHighest);
    }
    if (c.primary) {
      root.style.setProperty('--color-primary-subtle', hexToRgba(c.primary, 0.12));
      root.style.setProperty('--color-primary-hover', hexToRgba(c.primary, 0.08));
      if (!c.primaryContainer) root.style.setProperty('--color-primary-container', hexToRgba(c.primary, 0.16));
    }
    if (c.secondary) {
      root.style.setProperty('--color-secondary-subtle', hexToRgba(c.secondary, 0.12));
      if (!c.secondaryContainer) root.style.setProperty('--color-secondary-container', hexToRgba(c.secondary, 0.16));
    }
  }
  if (theme.typography?.lineHeight) {
    root.style.setProperty('--line-height', String(theme.typography.lineHeight));
  }
  // הגופן והגודל נשלטים ע"י העדפות המשתמש (מצב גופן + גודל), לא ישירות מה-theme.
  applyFontPrefsFromSettings();
  document.body.classList.toggle('dark-mode', theme.mode === 'dark');
}
