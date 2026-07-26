// עקביות חבילת התוסף: manifest, הרשאות מול המתודות שבשימוש, ונתוני הגליונות.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../manifest.json';
import { examsManifest, schedule } from '../src/data/localData';

const root = join(import.meta.dirname, '..');
const srcFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? srcFiles(join(dir, e.name)) : e.name.match(/\.tsx?$/) ? [join(dir, e.name)] : [],
  );

const allSource = srcFiles(join(root, 'src'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

/** ההרשאה הנדרשת לכל מתודת host שהתוסף קורא לה. */
const METHOD_PERMISSIONS: Record<string, string> = {
  'app.getTheme': 'app.info.read',
  'app.getGrantedPermissions': 'app.info.read',
  'library.findBooks': 'library.books.read',
  'library.getBookToc': 'library.books.read',
  'library.getBookContent': 'library.content.read',
  'reader.openBook': 'reader.open',
  'reader.openBookAtRef': 'reader.open',
  'storage.get': 'plugin.storage.read',
  'storage.list': 'plugin.storage.read',
  'storage.set': 'plugin.storage.write',
  'storage.remove': 'plugin.storage.write',
  'ui.showMessage': 'ui.feedback',
  'ui.showError': 'ui.feedback',
  'ui.showSuccess': 'ui.feedback',
  'feedback.sendEmail': 'feedback.send_email',
  'notifications.showInApp': 'notifications.send',
  'notifications.checkPermissions': 'notifications.system',
  'notifications.requestPermissions': 'notifications.system',
  'notifications.sendSystem': 'notifications.system',
  'notifications.scheduleSystem': 'notifications.system',
  'notifications.cancelAll': 'notifications.system',
  'publishedData.upsert': 'published_data.write',
  'publishedData.remove': 'published_data.write',
  'publishedData.listOwn': 'published_data.write',
};

describe('manifest', () => {
  it('כולל את כל שדות החובה', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.id).toBe('com.chadbedera.iyun-halacha');
    expect(manifest.type).toBe('webapp');
    expect(manifest.entrypoint).toBe('index.html');
    expect(manifest.icon).toBe('icon/icon.png');
    expect(manifest.name).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.author).toBeTruthy();
  });

  it('גרסה בפורמט semver', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.minAppVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('מגדיר כרטיסיית כלים מוצמדת עם אייקון', () => {
    expect(manifest.contributes.toolTab).toMatchObject({
      title: expect.any(String),
      order: expect.any(Number),
      defaultPinned: true,
      iconName: expect.any(String),
    });
  });

  it('אין הרשאות כפולות', () => {
    expect(new Set(manifest.permissions).size).toBe(manifest.permissions.length);
  });

  it('כל מתודה שבשימוש בקוד מכוסה בהרשאה ב-manifest', () => {
    const used = new Set(
      [...allSource.matchAll(/callOtzaria(?:Safe)?<[^>]*>?\(\s*'([\w.]+)'/g)].map((m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(5);
    for (const method of used) {
      const needed = METHOD_PERMISSIONS[method];
      expect(needed, `אין מיפוי הרשאה למתודה ${method}`).toBeTruthy();
      expect(manifest.permissions, `${method} דורש ${needed}`).toContain(needed);
    }
  });

  it('מצהיר על מנוי לאירוע theme.changed שהקוד מאזין לו', () => {
    expect(manifest.permissions).toContain('events.subscribe:theme.changed');
    expect(allSource).toContain("onOtzaria('theme.changed'");
  });

  it('אין הרשאות מיותרות (כל הרשאה מנוצלת בקוד)', () => {
    const usedPermissions = new Set(Object.values(METHOD_PERMISSIONS));
    for (const perm of manifest.permissions) {
      if (perm.startsWith('events.subscribe:')) continue;
      expect(usedPermissions, `ההרשאה ${perm} אינה בשימוש`).toContain(perm);
    }
  });
});

describe('נתוני הגליונות', () => {
  it('לכל גליון ב-manifest יש מסמך Word ב-exams-src', () => {
    const files = new Set(readdirSync(join(root, 'exams-src')).filter((f) => f.endsWith('.docx')));
    for (const exam of examsManifest.exams) {
      expect(files, exam.issueId).toContain(`${exam.issueId}.docx`);
    }
  });

  it('defaultIssueId הוא הגליון החדש ביותר', () => {
    const newest = [...examsManifest.exams].sort((a, b) => b.issueNumber - a.issueNumber)[0];
    expect(schedule.defaultIssueId).toBe(newest.issueId);
  });

  it('מספר הפרשיות ב-manifest תואם למספר השבועות', () => {
    for (const exam of examsManifest.exams) {
      expect(exam.parshiot.length, exam.issueId).toBe(exam.weeksInIssue);
    }
  });

  it('כל הגליונות מסומנים בסטטוס רישוי תקף', () => {
    for (const exam of examsManifest.exams) {
      expect(['authorized', 'private', 'userProvided']).toContain(exam.licenseStatus);
    }
  });

  it('כל תקופה מפנה לגליון שקיים ב-manifest', () => {
    const ids = new Set(examsManifest.exams.map((e) => e.issueId));
    for (const period of schedule.periods) {
      for (const id of period.issueIds) expect(ids, period.periodId).toContain(id);
    }
  });

  it('טווחי התאריכים של התקופות תקפים ומסודרים כרונולוגית', () => {
    // תקופות עשויות להשתפל זו על זו (גליון מתחיל לפני שהקודם מסתיים), אך הסדר עולה.
    const starts = schedule.periods.map((p) => new Date(p.gregorianRange.start).getTime());
    for (const period of schedule.periods) {
      expect(new Date(period.gregorianRange.start).getTime(), period.periodId).toBeLessThan(
        new Date(period.gregorianRange.end).getTime(),
      );
    }
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('טווח תאריכים שמוגדר בשבוע — תקף (רוב השבועות אינם מגדירים)', () => {
    for (const week of schedule.periods.flatMap((p) => p.weeks)) {
      const { start, end } = week.gregorianDateRange;
      if (!start || !end) continue;
      expect(new Date(start).getTime(), week.weekId).toBeLessThanOrEqual(new Date(end).getTime());
    }
  });
});

describe('בנייה לאריזה', () => {
  it('index.html טוען את ה-entry ומגדיר rtl', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    expect(html).toContain('src/main.tsx');
    expect(html).toContain('id="root"');
    expect(html).toMatch(/dir="rtl"/);
  });

  it('vite מוגדר ל-base יחסי (נדרש לטעינה מ-file://)', () => {
    const config = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    expect(config).toContain("base: './'");
  });
});
