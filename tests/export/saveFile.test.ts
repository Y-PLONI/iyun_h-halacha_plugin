import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeOutcome, saveBlobAs } from '../../src/export/saveFile';
import { installFakeHost, type FakeHost } from '../helpers/host';

let host: FakeHost | null = null;

beforeEach(() => {
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  host?.uninstall();
  host = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const blob = () => new Blob(['x'], { type: 'application/octet-stream' });

describe('saveBlobAs', () => {
  it('מחוץ לאוצריא: הורדה דרך הדפדפן', async () => {
    const out = await saveBlobAs(blob(), 'a.docx');
    expect(out).toEqual({ filename: 'a.docx', status: 'downloaded' });
  });

  it('בתוך אוצריא: begin → PUT → commit עם שם וסיומת, ומחזיר saved', async () => {
    host = installFakeHost({
      'fs.beginBinaryWrite': { writeToken: 'T', uploadUrl: 'http://127.0.0.1:1/up' },
      'fs.commitUserFileWrite': { cancelled: false, name: 'שמור.docx' },
    });
    const fetchMock = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await saveBlobAs(blob(), 'תשובות גליון 1.docx', 'כותרת');

    expect(out).toEqual({ filename: 'שמור.docx', status: 'saved' });
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:1/up', expect.objectContaining({ method: 'PUT' }));
    expect(host.callsTo('fs.beginBinaryWrite')[0].payload).toMatchObject({ purpose: 'user-file', expectedSize: 1 });
    expect(host.callsTo('fs.commitUserFileWrite')[0].payload).toMatchObject({
      writeToken: 'T',
      suggestedName: 'תשובות גליון 1',
      extension: 'docx',
      title: 'כותרת',
    });
  });

  it('ביטול הדיאלוג מוחזר כ-cancelled', async () => {
    host = installFakeHost({
      'fs.beginBinaryWrite': { writeToken: 'T', uploadUrl: 'http://127.0.0.1:1/up' },
      'fs.commitUserFileWrite': { cancelled: true },
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 204 })));
    const out = await saveBlobAs(blob(), 'a.docx');
    expect(out.status).toBe('cancelled');
  });

  it('כשהמסלול אינו נתמך (error.unsupported) — נופל להורדה דרך הדפדפן', async () => {
    host = installFakeHost({});
    host.fail('fs.beginBinaryWrite', 'error.unsupported');
    const out = await saveBlobAs(blob(), 'a.docx');
    expect(out.status).toBe('downloaded');
  });

  it('כשהמתודה אינה מוכרת ל-host הישן (error.unknown_method) — נופל להורדה', async () => {
    host = installFakeHost({});
    const out = await saveBlobAs(blob(), 'a.docx');
    expect(out.status).toBe('downloaded');
  });

  it('שגיאת הרשאה ב-begin נזרקת ואינה מדווחת כהורדה', async () => {
    host = installFakeHost({});
    host.fail('fs.beginBinaryWrite', 'error.permission_denied');
    await expect(saveBlobAs(blob(), 'a.docx')).rejects.toThrow('error.permission_denied');
  });

  it('תשובת begin לא תקינה נזרקת ואינה מדווחת כהורדה', async () => {
    host = installFakeHost({ 'fs.beginBinaryWrite': {} });
    await expect(saveBlobAs(blob(), 'a.docx')).rejects.toThrow('error.invalid_response');
  });

  it('כשל בהעלאה: מבטל את ההעלאה וזורק שגיאה (בלי נפילה שקטה)', async () => {
    host = installFakeHost({
      'fs.beginBinaryWrite': { writeToken: 'T', uploadUrl: 'http://127.0.0.1:1/up' },
      'fs.abortBinaryWrite': true,
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 413 })));
    await expect(saveBlobAs(blob(), 'a.docx')).rejects.toThrow('413');
    expect(host.callsTo('fs.abortBinaryWrite')).toHaveLength(1);
    expect(host.callsTo('fs.commitUserFileWrite')).toHaveLength(0);
  });
});

describe('describeOutcome', () => {
  it('מנסח הודעה לפי הסטטוס', () => {
    expect(describeOutcome({ filename: 'a.docx', status: 'saved' })).toBe('הקובץ נשמר: a.docx');
    expect(describeOutcome({ filename: 'a.docx', status: 'cancelled' })).toBe('השמירה בוטלה');
    expect(describeOutcome({ filename: 'a.docx', status: 'downloaded' })).toBe('a.docx ירד למחשב');
  });
});
