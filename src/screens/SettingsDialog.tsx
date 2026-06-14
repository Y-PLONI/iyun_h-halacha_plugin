import { useState } from 'react';
import { SOURCE_ROLES, SOURCE_ROLE_LABELS, type SourceRole } from '../data/types';
import { useSettings, updateSettings, setBookId, flushSettings, DEFAULT_SETTINGS } from '../state/settingsStore';
import { autoDetectBookId } from '../otzaria/library';
import { setSettingsOpen } from '../state/appStore';
import { toast } from '../components/Toast';

export function SettingsDialog() {
  const settings = useSettings();
  const [detecting, setDetecting] = useState(false);

  const close = () => {
    void flushSettings();
    setSettingsOpen(false);
  };

  const detectBooks = async () => {
    setDetecting(true);
    let found = 0;
    for (const role of SOURCE_ROLES) {
      const wanted = DEFAULT_SETTINGS.bookIds[role];
      const id = await autoDetectBookId(wanted);
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
        <h2>הגדרות</h2>

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
          <input
            className="input"
            type="email"
            value={settings.senderEmail}
            onChange={(e) => updateSettings({ senderEmail: e.target.value })}
          />
        </div>
        <div className="field">
          <label>מייל יעד לשליחת תשובות</label>
          <input
            className="input"
            type="email"
            value={settings.recipientEmail}
            onChange={(e) => updateSettings({ recipientEmail: e.target.value })}
          />
        </div>

        <div className="section-title">שמות ספרים באוצריא</div>
        <p className="hint">אם טעינת מקורות נכשלת, התאם כאן את שם הספר כפי שמופיע בספרייה.</p>
        <button className="btn-secondary" onClick={() => void detectBooks()} disabled={detecting}>
          {detecting ? 'מזהה…' : '🔍 זהה ספרים אוטומטית'}
        </button>
        {SOURCE_ROLES.map((role: SourceRole) => (
          <div className="field" key={role} style={{ marginTop: 10 }}>
            <label>{SOURCE_ROLE_LABELS[role]}</label>
            <input className="input" value={settings.bookIds[role]} onChange={(e) => setBookId(role, e.target.value)} />
          </div>
        ))}

        <div className="section-title">כללי</div>
        <div className="field">
          <label>השהיית שמירה אוטומטית (מילישניות)</label>
          <input
            className="input"
            type="number"
            min={300}
            max={10000}
            value={settings.autosaveMs}
            onChange={(e) => updateSettings({ autosaveMs: Number(e.target.value) || 1500 })}
          />
        </div>

        <div className="row">
          <button className="btn-primary" onClick={close}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
