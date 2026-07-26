import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTheme } from '../../src/otzaria/mockSdk';
import type { ThemePayload } from '../../src/otzaria/otzaria_plugin';

type ThemeModule = typeof import('../../src/otzaria/theme');
type SettingsModule = typeof import('../../src/state/settingsStore');

// theme.ts שומר את ה-theme האחרון במודול — טוענים מחדש בכל טסט.
async function freshTheme(): Promise<{ theme: ThemeModule; settings: SettingsModule }> {
  vi.resetModules();
  const settings = await import('../../src/state/settingsStore');
  const theme = await import('../../src/otzaria/theme');
  return { theme, settings };
}

const cssVar = (name: string) => document.documentElement.style.getPropertyValue(name);

beforeEach(() => {
  document.documentElement.removeAttribute('style');
  document.body.className = '';
});

describe('applyTheme — צבעים', () => {
  it('מחיל את כל תפקידי הצבע של Material 3 על משתני CSS', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(createMockTheme('light'));
    expect(cssVar('--color-primary')).toBe('#6750A4');
    expect(cssVar('--color-on-primary')).toBe('#FFFFFF');
    expect(cssVar('--color-surface')).toBe('#FEF7FF');
    expect(cssVar('--color-outline-variant')).toBe('#CAC4D0');
    expect(cssVar('--color-error')).toBe('#B3261E');
  });

  it('גוזר צבעי שקיפות מ-primary/secondary', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(createMockTheme('light'));
    expect(cssVar('--color-primary-subtle')).toBe('rgba(103,80,164,0.12)');
    expect(cssVar('--color-primary-hover')).toBe('rgba(103,80,164,0.08)');
    expect(cssVar('--color-secondary-subtle')).toBe('rgba(98,91,113,0.12)');
  });

  it('משלים primaryContainer/secondaryContainer חסרים', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme({
      mode: 'light',
      colorScheme: { primary: '#112233', secondary: '#445566' },
    } as ThemePayload);
    expect(cssVar('--color-primary-container')).toBe('rgba(17,34,51,0.16)');
    expect(cssVar('--color-secondary-container')).toBe('rgba(68,85,102,0.16)');
  });

  it('משלים surface-container-high מ-highest כשחסר', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme({
      mode: 'light',
      colorScheme: { surfaceContainerHighest: '#ABCDEF' },
    } as ThemePayload);
    expect(cssVar('--color-surface-container-high')).toBe('#ABCDEF');
  });

  it('צבע לא חוקי נשאר כפי שהוא (ללא NaN)', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme({ mode: 'light', colorScheme: { primary: 'zzz' } } as ThemePayload);
    expect(cssVar('--color-primary-subtle')).toBe('zzz');
  });

  it('מוסיף/מסיר את class ה-dark-mode לפי המצב', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(createMockTheme('dark'));
    expect(document.body).toHaveClass('dark-mode');
    theme.applyTheme(createMockTheme('light'));
    expect(document.body).not.toHaveClass('dark-mode');
  });

  it('מחיל line-height מהטיפוגרפיה', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(createMockTheme('light'));
    expect(cssVar('--line-height')).toBe('1.6');
  });

  it('theme חסר (undefined) אינו משנה דבר', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(undefined);
    expect(document.documentElement.getAttribute('style')).toBeNull();
  });

  it('theme בלי colorScheme אינו זורק', async () => {
    const { theme } = await freshTheme();
    expect(() => theme.applyTheme({ mode: 'dark' } as ThemePayload)).not.toThrow();
    expect(document.body).toHaveClass('dark-mode');
  });
});

describe('applyFontPrefs', () => {
  it('מצב ברירת מחדל — Segoe UI', async () => {
    const { theme } = await freshTheme();
    theme.applyFontPrefs('default', 18);
    expect(cssVar('--font-main')).toContain('Segoe UI');
    expect(cssVar('--font-commentators')).toContain('Segoe UI');
    expect(cssVar('--font-size-base')).toBe('18px');
  });

  it('מצב אוצריא ללא theme — נופל ל-Segoe UI', async () => {
    const { theme } = await freshTheme();
    theme.applyFontPrefs('otzaria', 16);
    expect(cssVar('--font-main')).toContain('Segoe UI');
    expect(cssVar('--font-main')).not.toContain('FrankRuhlCLM');
  });

  it('מצב אוצריא לאחר קבלת theme — משתמש בגופן אוצריא', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme(createMockTheme('light'));
    theme.applyFontPrefs('otzaria', 20);
    expect(cssVar('--font-main')).toContain('FrankRuhlCLM');
    expect(cssVar('--font-commentators')).toContain('FrankRuhlCLM');
    expect(cssVar('--font-size-base')).toBe('20px');
  });

  it('גודל 0 אינו מוגדר', async () => {
    const { theme } = await freshTheme();
    theme.applyFontPrefs('default', 0);
    expect(cssVar('--font-size-base')).toBe('');
  });

  it('applyTheme מחיל את העדפות הגופן מההגדרות (ולא את גופן ה-theme ישירות)', async () => {
    const { theme, settings } = await freshTheme();
    settings.updateSettings({ fontMode: 'otzaria', uiFontSize: 22 });
    theme.applyTheme(createMockTheme('dark'));
    expect(cssVar('--font-main')).toContain('FrankRuhlCLM');
    expect(cssVar('--font-size-base')).toBe('22px');

    settings.updateSettings({ fontMode: 'default' });
    theme.applyTheme(createMockTheme('dark'));
    expect(cssVar('--font-main')).toContain('Segoe UI');
  });

  it('גופן פרשנים נגזר מ-commentatorsFontFamily כשקיים', async () => {
    const { theme } = await freshTheme();
    theme.applyTheme({
      mode: 'light',
      typography: { fontFamily: 'Main', commentatorsFontFamily: 'Comm' },
    } as ThemePayload);
    theme.applyFontPrefs('otzaria', 16);
    expect(cssVar('--font-main')).toContain('Main');
    expect(cssVar('--font-commentators')).toContain('Comm');
  });
});
