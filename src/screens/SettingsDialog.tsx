import { useState } from 'react';
import { SOURCE_ROLES, SOURCE_ROLE_LABELS, type SourceRole } from '../data/types';
import { useSettings, updateSettings, setBookId, flushSettings, DEFAULT_SETTINGS } from '../state/settingsStore';
import { autoDetectBookId } from '../otzaria/library';
import { setSettingsOpen } from '../state/appStore';
import { toast } from '../components/Toast';
import { Icon } from '../components/Icon';
import manifest from '../../manifest.json';

type Tab = 'appearance' | 'submit' | 'sources' | 'about';

const TABS: { id: Tab; label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'appearance', label: 'מראה', icon: 'font' },
  { id: 'submit', label: 'שליחת תשובות', icon: 'mail' },
  { id: 'sources', label: 'מקורות', icon: 'book-open' },
  { id: 'about', label: 'אודות', icon: 'info' },
];

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
              <Icon name={t.icon} size="1em" /> {t.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'submit' && <SubmitTab />}
          {tab === 'sources' && <SourcesTab detecting={detecting} detectBooks={detectBooks} />}
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
