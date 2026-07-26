import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SendDialog } from '../../src/components/SendDialog';
import { ToastHost } from '../../src/components/Toast';
import { getExamMeta } from '../../src/data/localData';
import { settingsStore } from '../../src/state/settingsStore';
import { defaultHandlers, installFakeHost, type FakeHost } from '../helpers/host';
import { prepareExams, realWeek, resetStores, seedAnswer } from '../helpers/app';
import { readZipFromBlob } from '../helpers/zip';

let host: FakeHost;
let downloaded: { name: string; blob: Blob }[];

beforeAll(async () => {
  await prepareExams();
});

beforeEach(() => {
  host = installFakeHost(defaultHandlers());
  resetStores({ name: 'ישראל ישראלי', personalCode: '777', kollel: 'כולל א' });
  downloaded = [];
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
    blobs.push(b as Blob);
    return `blob:${blobs.length}`;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloaded.push({ name: this.download, blob: blobs[blobs.length - 1] });
  });
});

const week = () => realWeek('issue-0240-w1');
const exam = () => getExamMeta('issue-0240');

function renderDialog(onClose = vi.fn()) {
  const utils = render(
    <>
      <ToastHost />
      <SendDialog week={week()} exam={exam()} onClose={onClose} />
    </>,
  );
  return { ...utils, onClose };
}

describe('SendDialog — מילוי אוטומטי', () => {
  it('ממלא שם, קוד וכולל מההגדרות', () => {
    renderDialog();
    expect(screen.getByText('שם פרטי ומשפחה')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ישראל ישראלי')).toBeInTheDocument();
    expect(screen.getByDisplayValue('777')).toBeInTheDocument();
    expect(screen.getByDisplayValue('כולל א')).toBeInTheDocument();
  });

  it('מציג את מספר הגליון, הגימטריה ומספר הפרשיות', () => {
    renderDialog();
    const hint = screen.getByText(/גליון 240/);
    expect(hint).toHaveTextContent('ר"מ');
    expect(hint).toHaveTextContent(`${exam()!.parshiot.length} פרשיות`);
    expect(hint).toHaveTextContent(`פרשת ${week().parasha}`);
  });

  it('מונה שבועות שהושלמו בגליון', () => {
    seedAnswer('issue-0240-w1', { status: 'completed' });
    seedAnswer('issue-0240-w2', { status: 'completed' });
    seedAnswer('issue-0240-w3', { status: 'draft' });
    renderDialog();
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
  });

  it('ללא שבועות שהושלמו — השדה ריק', () => {
    renderDialog();
    expect(screen.getByRole('spinbutton')).toHaveValue(null);
  });

  it('ללא גליון — שדות הגליון ריקים ואינו קורס', () => {
    render(<SendDialog week={week()} exam={null} onClose={vi.fn()} />);
    expect(screen.getByText(/פרשת/)).toBeInTheDocument();
  });
});

describe('SendDialog — שליחה', () => {
  it('מוריד את קובץ התשובות ואת טופס הסימון, ופותח מייל', async () => {
    seedAnswer('issue-0240-w1', { answerHtml: '<p>תשובתי</p>', answerText: 'תשובתי', status: 'completed' });
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));

    await waitFor(() => expect(downloaded).toHaveLength(2));
    expect(downloaded[0].name).toContain('תשובות עיון ההלכה');
    expect(downloaded[1].name).toBe('טופס סימון תשובות - גליון 240.docx');

    const answersDoc = (await readZipFromBlob(downloaded[0].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(answersDoc.text).toContain('תשובתי');
    const formDoc = (await readZipFromBlob(downloaded[1].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(formDoc.text).toContain('ישראל ישראלי');
    expect(formDoc.text).not.toMatch(/\{\{[A-Z]+\}\}/);

    await waitFor(() => expect(host.callsTo('feedback.sendEmail')).toHaveLength(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('נושא המייל כולל שם, קוד, פרשה וגליון', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(host.callsTo('feedback.sendEmail')).toHaveLength(1));
    const { subject, to, body } = host.callsTo('feedback.sendEmail')[0].payload as Record<string, string>;
    expect(subject).toContain('ישראל ישראלי');
    expect(subject).toContain('קוד: 777');
    expect(subject).toContain(`פרשת ${week().parasha}`);
    expect(subject).toContain('גליון 240');
    expect(to).toBe(settingsStore.get().settings.recipientEmail);
    expect(body).toContain('לצירוף:');
    expect(body).toContain('תשובות עיון ההלכה');
    expect(body).toContain('טופס סימון תשובות');
  });

  it('שומר שם/קוד/כולל שנערכו בדיאלוג להגדרות', async () => {
    renderDialog();
    fireEvent.change(screen.getByDisplayValue('ישראל ישראלי'), { target: { value: '  משה כהן  ' } });
    fireEvent.change(screen.getByDisplayValue('777'), { target: { value: ' 888 ' } });
    fireEvent.change(screen.getByDisplayValue('כולל א'), { target: { value: 'כולל ב' } });
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(settingsStore.get().settings.name).toBe('משה כהן'));
    expect(settingsStore.get().settings.personalCode).toBe('888');
    expect(settingsStore.get().settings.kollel).toBe('כולל ב');
  });

  it('מסמן פלפולא בטופס לפי התיבה', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(downloaded).toHaveLength(2));
    const formDoc = (await readZipFromBlob(downloaded[1].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(formDoc.text).toContain('☒ כן');
  });

  it('מעביר צורת תשלום ומספר שבועות לטופס', async () => {
    renderDialog();
    fireEvent.change(screen.getByPlaceholderText('לדוגמה: נדרים פלוס'), { target: { value: 'נדרים פלוס' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(downloaded).toHaveLength(2));
    const formDoc = (await readZipFromBlob(downloaded[1].blob)).find((e) => e.name === 'word/document.xml')!;
    expect(formDoc.text).toContain('נדרים פלוס');
    expect(formDoc.text).toContain('>3<');
  });

  it('שומר את התשובות לפני השליחה', async () => {
    const { updateAnswerContent } = await import('../../src/state/answersStore');
    updateAnswerContent(week(), '<p>טיוטה</p>', 'טיוטה');
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() =>
      expect(host.callsTo('storage.set').some((c) => c.payload.key === 'answers:v2')).toBe(true),
    );
  });

  it('מציג הודעה על מספר הקבצים שירדו', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 קבצים ירדו'));
  });

  it('כשל בהפקת טופס הסימון אינו מונע שליחה', async () => {
    const formDocx = await import('../../src/export/formDocx');
    vi.spyOn(formDocx, 'buildAnswerFormDocx').mockImplementation(() => {
      throw new Error('תבנית פגומה');
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(host.callsTo('feedback.sendEmail')).toHaveLength(1));
    expect(downloaded).toHaveLength(1);
  });

  it('כשל בייצוא התשובות אינו מונע שליחה', async () => {
    const ooxml = await import('../../src/export/ooxml');
    vi.spyOn(ooxml, 'htmlToOoxml').mockImplementation(() => {
      throw new Error('המרה נכשלה');
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(host.callsTo('feedback.sendEmail')).toHaveLength(1));
    const body = String(host.callsTo('feedback.sendEmail')[0].payload.body);
    expect(body).not.toContain('קובץ התשובות שירד');
  });
});

describe('SendDialog — סגירה ונגישות', () => {
  it('כפתור הסגירה וכפתור הביטול קוראים ל-onClose', () => {
    const first = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'סגור' }));
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();

    const second = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }));
    expect(second.onClose).toHaveBeenCalled();
  });

  it('לחיצה על הרקע סוגרת, לחיצה על הפאנל לא', () => {
    const { container, onClose } = renderDialog();
    fireEvent.click(container.querySelector('.overlay-panel')!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('.overlay-scrim')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('בזמן שליחה הכפתורים מנוטרלים', async () => {
    let release: (v: unknown) => void = () => {};
    host.on('feedback.sendEmail', () => {
      // מעכב את השליחה כדי לבדוק את מצב "שולח…"
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /שלח/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /שולח…/ })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'ביטול' })).toBeDisabled();
    release(true);
  });
});
