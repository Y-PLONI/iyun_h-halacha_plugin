import { useEffect, useState } from 'react';
import { SOURCE_ROLES, SOURCE_ROLE_LABELS, type SourceRole } from '../data/types';
import { useSettings, updateSettings, setBookId, flushSettings, DEFAULT_SETTINGS } from '../state/settingsStore';
import { autoDetectBookId } from '../otzaria/library';
import { setSettingsOpen } from '../state/appStore';
import { toast } from '../components/Toast';
import { Icon } from '../components/Icon';
import {
  checkNotificationPermissions,
  notificationsAvailable,
  requestNotificationPermissions,
} from '../otzaria/notifications';
import manifest from '../../manifest.json';

type Tab = 'appearance' | 'submit' | 'sources' | 'reminders' | 'about';

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'appearance', label: 'מראה', icon: 'font' },
  { id: 'submit', label: 'שליחה', icon: 'mail' },
  { id: 'sources', label: 'מקורות', icon: 'book-open' },
  { id: 'reminders', label: 'התראות', icon: 'alert' },
  { id: 'about', label: 'אודות', icon: 'info' },
];

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function SettingsDialog() {
  const [tab, setTab] = useState<Tab>('appearance');
  const [detecting, setDetecting] = useState(false);

  const close = () => {
    void flushSettings();
    setSettingsOpen(false);
  };

  const detectBooks = async () => {
    setDetecting(true);
    let found = 0;
    for (const role of SOURCE_ROLES) {
      const id = await autoDetectBookId(DEFAULT_SETTINGS.bookIds[role]);
      if (id) {
        setBookId(role, id);
        found++;
      }
    }
    setDetecting(false);
    toast(found ? `זוהו ${found} ספרים אוטומטית` : 'לא זוהו ספרים — ודא שהם מותקנים באוצריא');
  };

  return (
    <div className="overlay-scrim" onClick={close}>
      <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h2>הגדרות</h2>
          <button className="icon-btn square" title="סגור" aria-label="סגור" onClick={close}>
            <Icon name="dismiss" />
          </button>
        </div>

        <div className="settings-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`settings-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size="1.4em" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'submit' && <SubmitTab />}
          {tab === 'sources' && <SourcesTab detecting={detecting} detectBooks={detectBooks} />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const settings = useSettings();
  return (
    <>
      <div className="field">
        <label>גופן</label>
        <div className="segmented">
          <button
            className={`seg${settings.fontMode === 'default' ? ' active' : ''}`}
            onClick={() => updateSettings({ fontMode: 'default' })}
          >
            ברירת מחדל
          </button>
          <button
            className={`seg${settings.fontMode === 'otzaria' ? ' active' : ''}`}
            onClick={() => updateSettings({ fontMode: 'otzaria' })}
          >
            כמו אוצריא
          </button>
        </div>
        <p className="hint">"ברירת מחדל" — הגופן המובנה בתוסף (Segoe UI). "כמו אוצריא" — הגופן שנבחר בהגדרות אוצריא.</p>
      </div>

      <div className="field">
        <label>גודל גופן · {settings.uiFontSize}px</label>
        <div className="size-row">
          <input
            type="range"
            min={12}
            max={26}
            step={1}
            value={settings.uiFontSize}
            onChange={(e) => updateSettings({ uiFontSize: Number(e.target.value) })}
          />
          <button className="btn-chip" onClick={() => updateSettings({ uiFontSize: DEFAULT_SETTINGS.uiFontSize })}>
            איפוס
          </button>
        </div>
        <p className="preview-text">דוגמת טקסט · אבגדהוז · עיון ההלכה</p>
      </div>
    </>
  );
}

function SubmitTab() {
  const settings = useSettings();
  return (
    <>
      <div className="field">
        <label>שם</label>
        <input className="input" value={settings.name} onChange={(e) => updateSettings({ name: e.target.value })} />
      </div>
      <div className="field">
        <label>קוד אישי</label>
        <input className="input" value={settings.personalCode} onChange={(e) => updateSettings({ personalCode: e.target.value })} />
      </div>
      <div className="field">
        <label>כולל</label>
        <input className="input" value={settings.kollel} onChange={(e) => updateSettings({ kollel: e.target.value })} />
      </div>
      <div className="field">
        <label>המייל שלי (שולח)</label>
        <input className="input" type="email" value={settings.senderEmail} onChange={(e) => updateSettings({ senderEmail: e.target.value })} />
      </div>
      <div className="field">
        <label>מייל יעד לשליחת תשובות</label>
        <input className="input" type="email" value={settings.recipientEmail} onChange={(e) => updateSettings({ recipientEmail: e.target.value })} />
      </div>
    </>
  );
}

function SourcesTab({ detecting, detectBooks }: { detecting: boolean; detectBooks: () => void }) {
  const settings = useSettings();
  return (
    <>
      <p className="hint">אם טעינת מקורות נכשלת, התאם כאן את שם הספר כפי שמופיע בספריית אוצריא.</p>
      <button className="btn-secondary" onClick={() => void detectBooks()} disabled={detecting}>
        <Icon name="search" size="1em" /> {detecting ? 'מזהה…' : 'זהה ספרים אוטומטית'}
      </button>
      {SOURCE_ROLES.map((role: SourceRole) => (
        <div className="field" key={role} style={{ marginTop: 10 }}>
          <label>{SOURCE_ROLE_LABELS[role]}</label>
          <input className="input" value={settings.bookIds[role]} onChange={(e) => setBookId(role, e.target.value)} />
        </div>
      ))}

      <div className="section-title">שמירה אוטומטית</div>
      <div className="field">
        <label>השהיית שמירה (מילישניות)</label>
        <input
          className="input"
          type="number"
          min={300}
          max={10000}
          value={settings.autosaveMs}
          onChange={(e) => updateSettings({ autosaveMs: Number(e.target.value) || 1500 })}
        />
      </div>
    </>
  );
}

function RemindersTab() {
  const settings = useSettings();
  const inOtzaria = notificationsAvailable();
  const [perm, setPerm] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!inOtzaria) return;
    void checkNotificationPermissions().then((p) => setPerm(p.granted));
  }, [inOtzaria]);

  const requestPerm = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermissions();
    setPerm(granted);
    setRequesting(false);
    toast(granted ? 'הרשאת התראות אושרה' : 'הרשאת התראות נדחתה — ניתן לאשר בהגדרות המערכת');
  };

  return (
    <>
      {!inOtzaria && (
        <p className="hint">התראות ולוח שנה זמינים רק כשהתוסף רץ בתוך אוצריא.</p>
      )}
      <p className="hint">
        תזכורת שבועית קבועה על שבועות שטרם הושלמו (אי לימוד/כתיבת תשובות). התזכורת נשלחת רק כל
        עוד יש שבוע פעיל שתשובתו לא סומנה כ"הושלם".
      </p>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.remindersEnabled}
          onChange={(e) => updateSettings({ remindersEnabled: e.target.checked })}
        />
        <span>הפעל תזכורות</span>
      </label>

      <div className="field" style={{ marginTop: 12, opacity: settings.remindersEnabled ? 1 : 0.5 }}>
        <label>יום בשבוע</label>
        <select
          className="input"
          value={settings.reminderWeekday}
          disabled={!settings.remindersEnabled}
          onChange={(e) => updateSettings({ reminderWeekday: Number(e.target.value) })}
        >
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>
              יום {d}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ opacity: settings.remindersEnabled ? 1 : 0.5 }}>
        <label>שעה</label>
        <input
          className="input"
          type="time"
          style={{ width: 'auto', minWidth: 140 }}
          value={settings.reminderTime}
          disabled={!settings.remindersEnabled}
          onChange={(e) => updateSettings({ reminderTime: e.target.value || '20:00' })}
        />
      </div>

      <div className="section-title">ערוצים</div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.desktopNotifications}
          disabled={!settings.remindersEnabled}
          onChange={(e) => updateSettings({ desktopNotifications: e.target.checked })}
        />
        <Icon name="alert" size="1em" />
        <span>התראת שולחן עבודה</span>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.calendarReminders}
          disabled={!settings.remindersEnabled}
          onChange={(e) => updateSettings({ calendarReminders: e.target.checked })}
        />
        <Icon name="calendar" size="1em" />
        <span>אירוע בלוח השנה של אוצריא</span>
      </label>

      {inOtzaria && settings.remindersEnabled && settings.desktopNotifications && perm === false && (
        <div className="row">
          <button className="btn-secondary" onClick={() => void requestPerm()} disabled={requesting}>
            <Icon name="alert" size="1em" /> {requesting ? 'מבקש…' : 'אפשר התראות מערכת'}
          </button>
        </div>
      )}
      {inOtzaria && perm === true && (
        <p className="hint" style={{ marginTop: 10 }}>הרשאת התראות מערכת פעילה ✓</p>
      )}
    </>
  );
}

function AboutTab() {
  return (
    <div className="about">
      <p className="about-name">{manifest.name}</p>
      <p className="about-ver">גרסה {manifest.version}</p>
      <p className="about-desc">{manifest.description}</p>
      <div className="about-meta">
        <div><span>מפתח</span><b>{manifest.author}</b></div>
        <div><span>מזהה</span><b dir="ltr">{manifest.id}</b></div>
      </div>
      <p className="hint">תוסף לניהול הספקי עיון ההלכה: צפייה במבחן, כתיבת תשובות, עיון במקורות וייצוא ל-Word.</p>
    </div>
  );
}
