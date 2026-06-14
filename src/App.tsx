import { useEffect, useState } from 'react';
import type { BootPayload, ThemePayload } from './otzaria/sdk';
import { hasOtzaria, onOtzaria, offOtzaria } from './otzaria/sdk';
import { applyTheme } from './otzaria/theme';
import { loadSettings } from './state/settingsStore';
import { loadAnswers, saveAnswersNow } from './state/answersStore';
import { setBooted, setIsNarrow } from './state/appStore';
import { AppShell } from './components/AppShell';
import { ToastHost } from './components/Toast';

const NARROW_BREAKPOINT = 760;

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const init = async (boot?: BootPayload) => {
      if (boot?.theme) applyTheme(boot.theme);
      await Promise.all([loadSettings(), loadAnswers()]);
      if (!alive) return;
      setBooted();
      setReady(true);
    };

    const onBoot = (detail: unknown) => void init(detail as BootPayload);
    const onTheme = (detail: unknown) => applyTheme(detail as ThemePayload);

    if (hasOtzaria()) {
      onOtzaria('plugin.boot', onBoot);
      onOtzaria('theme.changed', onTheme);
      // אם boot כבר נשלח לפני שנרשמנו — מאתחלים בכל זאת אחרי tick קצר
      const fallback = setTimeout(() => {
        if (alive && !ready) void init();
      }, 1500);
      return () => {
        alive = false;
        clearTimeout(fallback);
        offOtzaria('plugin.boot', onBoot);
        offOtzaria('theme.changed', onTheme);
      };
    }

    // dev: ה-mock משדר plugin.boot
    onOtzaria('plugin.boot', onBoot);
    onOtzaria('theme.changed', onTheme);
    void init();
    return () => {
      alive = false;
      offOtzaria('plugin.boot', onBoot);
      offOtzaria('theme.changed', onTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // responsive
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // שמירה לפני סגירה
  useEffect(() => {
    const onBeforeUnload = () => {
      void saveAnswersNow();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  if (!ready) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="spinner" />
        <p>טוען…</p>
      </div>
    );
  }

  return (
    <>
      <AppShell />
      <ToastHost />
    </>
  );
}
