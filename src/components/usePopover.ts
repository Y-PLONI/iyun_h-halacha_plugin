// hook משותף לתפריטים נפתחים (popover): מצב פתיחה, סגירה בלחיצה מחוץ לתפריט,
// וסגירה ב-Escape. ה-ref מוצמד לעוטף עם המחלקה popover-anchor.

import { useEffect, useRef, useState } from 'react';

export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref, toggle: () => setOpen((o) => !o), close: () => setOpen(false) };
}
