import { useEffect, useState } from 'react';
import type { BootPayload, ThemePayload } from './otzaria/sdk';
import { hasOtzaria, onOtzaria, offOtzaria, callOtzariaSafe } from './otzaria/sdk';
import { applyTheme, applyFontPrefs } from './otzaria/theme';
import { loadSettings, settingsStore } from './state/settingsStore';
import { loadAnswers, saveAnswersNow } from './state/answersStore';
import { loadExams } from './data/localData';
import { setBooted, setIsNarrow, useDataVersion } from './state/appStore';
import { loadStoredRemote } from './data/remoteUpdate';
import { initReminders } from './state/reminders';
import { AppShell } from './components/AppShell';
import { ToastHost } from './components/Toast';

const NARROW_BREAKPOINT = 760;

export function App() {
  const [ready, setReady] = useState(false);
  const dataVersion = useDataVersion();

  useEffect(() => {
    let alive = true;

    const init = async (boot?: BootPayload) => {
      if (boot?.theme) {
        applyTheme(boot.theme);
      } else if (hasOtzaria()) {
        // נפילה: אם פספסנו את אירוע ה-boot (bundle כבד נטען אחרי שה-host שידר) —
        // מושכים את ה-theme ישירות כדי לא ליפול לצבעי ברירת המחדל.
        const t = await callOtzariaSafe<ThemePayload | undefined>('app.getTheme', {}, undefined);
        if (t) applyTheme(t);
      }
      await Promise.all([loadSettings(), loadAnswers(), loadExams()]);
      // מיישמים נתונים מרוחקים שנשמרו מעדכון קודם (דורס bundled, מוסיף גליונות)
      await loadStoredRemote();
      if (!alive) return;
      // לאחר טעינת ההגדרות — מחילים את העדפות הגופן השמורות (מצב + גודל)
      const s = settingsStore.get().settings;
      applyFontPrefs(s.fontMode, s.uiFontSize);
      setBooted();
      setReady(true);
      // תיאום תזכורות (שולחן עבודה + לוח שנה) לפי המצב הנוכחי
      initReminders();
    };

    const onBoot = (detail: unknown) => void init(detail as BootPayload);
    const onTheme = (detail: unknown) => applyTheme(detail as ThemePayload);

    if (hasOtzaria()) {
      onOtzaria('plugin.boot', onBoot);
      onOtzaria('theme.changed', onTheme);
      // החלת theme מיידית, ללא תלות בתזמון אירוע ה-boot (מונע הבזק צבעי ברירת מחדל)
      void callOtzariaSafe<ThemePayload | undefined>('app.getTheme', {}, undefined).then((t) => {
        if (alive && t) applyTheme(t);
      });
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

  // החלת העדפות גופן בכל שינוי הגדרות (מצב גופן / גודל)
  useEffect(() => {
    return settingsStore.subscribe(() => {
      const s = settingsStore.get().settings;
      applyFontPrefs(s.fontMode, s.uiFontSize);
    });
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
      <AppShell key={dataVersion} />
      <ToastHost />
    </>
  );
}
