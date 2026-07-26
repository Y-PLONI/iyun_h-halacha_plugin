import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsDialog } from '../../src/screens/SettingsDialog';
import { ToastHost } from '../../src/components/Toast';
import { appStore } from '../../src/state/appStore';
import { DEFAULT_SETTINGS, settingsStore } from '../../src/state/settingsStore';
import { SOURCE_ROLE_LABELS } from '../../src/data/types';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import { resetStores } from '../helpers/app';
import manifest from '../../manifest.json';

let host: FakeHost;

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
  resetStores();
  appStore.set({ settingsOpen: true });
});

const renderDialog = () =>
  render(
    <>
      <ToastHost />
      <SettingsDialog />
    </>,
  );

const settings = () => settingsStore.get().settings;

describe('SettingsDialog — מסגרת', () => {
  it('מציג חמש כרטיסיות, מראה פעילה כברירת מחדל', () => {
    renderDialog();
    for (const label of ['מראה', 'שליחה', 'מקורות', 'התראות', 'אודות']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'מראה' })).toHaveClass('active');
  });

  it('סגירה שומרת את ההגדרות ומסתירה את החלון', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'סגור' }));
    expect(appStore.get().settingsOpen).toBe(false);
    await waitFor(() =>
      expect(host.callsTo('storage.set').some((c) => c.payload.key === 'settings:v1')).toBe(true),
    );
  });

  it('לחיצה על הרקע סוגרת, לחיצה על הפאנל לא', () => {
    const { container } = renderDialog();
    fireEvent.click(container.querySelector('.overlay-panel')!);
    expect(appStore.get().settingsOpen).toBe(true);
    fireEvent.click(container.querySelector('.overlay-scrim')!);
    expect(appStore.get().settingsOpen).toBe(false);
  });
});

describe('כרטיסיית מראה', () => {
  it('מחליפה מצב גופן', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'כמו אוצריא' }));
    expect(settings().fontMode).toBe('otzaria');
    fireEvent.click(screen.getByRole('button', { name: 'ברירת מחדל' }));
    expect(settings().fontMode).toBe('default');
  });

  it('מסמנת את המצב הפעיל', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'ברירת מחדל' })).toHaveClass('active');
  });

  it('מחוון גודל הגופן מעדכן את ההגדרות ואת התווית', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '22' } });
    expect(settings().uiFontSize).toBe(22);
    expect(screen.getByText('גודל גופן · 22px')).toBeInTheDocument();
  });

  it('כפתור איפוס מחזיר לגודל ברירת המחדל', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: 'איפוס' }));
    expect(settings().uiFontSize).toBe(DEFAULT_SETTINGS.uiFontSize);
  });

  it('טווח המחוון 12–26', () => {
    renderDialog();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '12');
    expect(slider).toHaveAttribute('max', '26');
  });
});

describe('כרטיסיית שליחה', () => {
  beforeEach(() => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'שליחה' }));
  });

  it('מעדכנת שם, קוד אישי וכולל', () => {
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'ישראל' } });
    fireEvent.change(inputs[1], { target: { value: '123' } });
    fireEvent.change(inputs[2], { target: { value: 'כולל' } });
    expect(settings()).toMatchObject({ name: 'ישראל', personalCode: '123', kollel: 'כולל' });
  });

  it('מעדכנת כתובות מייל', () => {
    const emails = screen.getAllByRole('textbox').slice(3);
    fireEvent.change(emails[0], { target: { value: 'me@example.com' } });
    fireEvent.change(emails[1], { target: { value: 'target@example.com' } });
    expect(settings().senderEmail).toBe('me@example.com');
    expect(settings().recipientEmail).toBe('target@example.com');
  });

  it('מציגה את כתובת היעד הנוכחית', () => {
    expect(screen.getByDisplayValue(DEFAULT_SETTINGS.recipientEmail)).toBeInTheDocument();
  });
});

describe('כרטיסיית מקורות', () => {
  beforeEach(() => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'מקורות' }));
  });

  it('מציגה שדה לכל אחד מארבעת התפקידים', () => {
    for (const label of Object.values(SOURCE_ROLE_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const name of Object.values(DEFAULT_SETTINGS.bookIds)) {
      expect(screen.getByDisplayValue(name)).toBeInTheDocument();
    }
  });

  it('עריכת שם ספר מעדכנת את ההגדרות', () => {
    fireEvent.change(screen.getByDisplayValue('משנה ברורה'), { target: { value: 'מ"ב חדש' } });
    expect(settings().bookIds.mishnaBerurah).toBe('מ"ב חדש');
  });

  it('זיהוי אוטומטי מעדכן את כל הספרים שנמצאו', async () => {
    host.on('library.findBooks', (p) => [
      { title: String(p.query), bookId: `${String(p.query)} (מזוהה)`, topics: [] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /זהה ספרים אוטומטית/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('זוהו 4 ספרים'));
    expect(settings().bookIds.mishnaBerurah).toBe('משנה ברורה (מזוהה)');
  });

  it('כשלא נמצאו ספרים — מציג הודעה מתאימה', async () => {
    host.on('library.findBooks', () => []);
    fireEvent.click(screen.getByRole('button', { name: /זהה ספרים אוטומטית/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('לא זוהו ספרים'));
  });

  it('מעדכנת השהיית שמירה, ונופלת ל-1500 בקלט ריק', () => {
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3000' } });
    expect(settings().autosaveMs).toBe(3000);
    fireEvent.change(input, { target: { value: '' } });
    expect(settings().autosaveMs).toBe(1500);
  });
});

describe('כרטיסיית התראות', () => {
  beforeEach(() => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'התראות' }));
  });

  it('מפעילה ומכבה את התזכורות', () => {
    const toggle = screen.getAllByRole('checkbox')[0];
    fireEvent.click(toggle);
    expect(settings().remindersEnabled).toBe(true);
    fireEvent.click(toggle);
    expect(settings().remindersEnabled).toBe(false);
  });

  it('יום ושעה מנוטרלים כשהתזכורות כבויות, ופעילים כשדולקות', () => {
    expect(screen.getByRole('combobox')).toBeDisabled();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByRole('combobox')).toBeEnabled();
  });

  it('בחירת יום בשבוע ושעה מעדכנת הגדרות', () => {
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(settings().reminderWeekday).toBe(2);
    const time = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(time, { target: { value: '06:30' } });
    expect(settings().reminderTime).toBe('06:30');
  });

  it('שעה ריקה נופלת ל-20:00', () => {
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    const time = document.querySelector('input[type="time"]') as HTMLInputElement;
    fireEvent.change(time, { target: { value: '' } });
    expect(settings().reminderTime).toBe('20:00');
  });

  it('בורר יום כולל את שבעת ימי השבוע', () => {
    const options = (screen.getByRole('combobox') as HTMLSelectElement).options;
    expect(options).toHaveLength(7);
    expect(options[0].textContent).toBe('יום ראשון');
    expect(options[6].textContent).toBe('יום שבת');
  });

  it('מתגי הערוצים (שולחן עבודה / לוח שנה) מתעדכנים', () => {
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    const [, desktop, calendar] = screen.getAllByRole('checkbox');
    fireEvent.click(desktop);
    expect(settings().desktopNotifications).toBe(false);
    fireEvent.click(calendar);
    expect(settings().calendarReminders).toBe(false);
  });

  it('בתוך אוצריא עם הרשאה — מציג אישור', async () => {
    await waitFor(() =>
      expect(screen.getByText('הרשאת התראות מערכת פעילה ✓')).toBeInTheDocument(),
    );
  });
});

describe('כרטיסיית התראות — ללא הרשאה / מחוץ לאוצריא', () => {
  it('מציג כפתור בקשת הרשאה, והבקשה מעדכנת את המצב', async () => {
    host.on('notifications.checkPermissions', { granted: false, initialized: true });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'התראות' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    const btn = await waitFor(() => screen.getByRole('button', { name: /אפשר התראות מערכת/ }));
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('הרשאת התראות אושרה'));
    expect(host.callsTo('notifications.requestPermissions')).toHaveLength(1);
  });

  it('דחיית ההרשאה מציגה הודעה', async () => {
    host.on('notifications.checkPermissions', { granted: false, initialized: true });
    host.on('notifications.requestPermissions', { granted: false });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'התראות' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(await waitFor(() => screen.getByRole('button', { name: /אפשר התראות מערכת/ })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('נדחתה'));
  });

  it('מחוץ לאוצריא — מציג הבהרה שההתראות אינן זמינות', () => {
    host.uninstall();
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'התראות' }));
    expect(
      screen.getByText('התראות ולוח שנה זמינים רק כשהתוסף רץ בתוך אוצריא.'),
    ).toBeInTheDocument();
  });
});

describe('כרטיסיית אודות', () => {
  it('מציגה את פרטי ה-manifest', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'אודות' }));
    expect(screen.getByText(manifest.name)).toBeInTheDocument();
    expect(screen.getByText(`גרסה ${manifest.version}`)).toBeInTheDocument();
    expect(screen.getByText(manifest.description)).toBeInTheDocument();
    expect(screen.getByText(manifest.author)).toBeInTheDocument();
    expect(screen.getByText(manifest.id)).toBeInTheDocument();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
