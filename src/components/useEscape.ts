// סגירת פאנל/דיאלוג בלחיצה על Escape (הנחיות אוצריא: פאנל הגדרות נסגר גם ב-Escape).

import { useEffect, useRef } from 'react';

export function useEscape(onEscape: () => void, enabled = true): void {
  // ref כדי שלא נרשם מאזין מחדש בכל רינדור וכדי שנקרא תמיד ה-callback העדכני
  const cb = useRef(onEscape);
  cb.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) cb.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
