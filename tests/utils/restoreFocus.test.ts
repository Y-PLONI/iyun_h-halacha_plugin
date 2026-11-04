import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFocusRestore } from '../../src/utils/restoreFocus';
import { installFakeHost, type FakeHost } from '../helpers/host';

let host: FakeHost;
let dispose: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  host = installFakeHost({});
  dispose = installFocusRestore();
});

afterEach(() => {
  dispose?.();
  dispose = null;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function makeEditor(text = 'שלום עולם'): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('contenteditable', 'true');
  el.tabIndex = 0;
  el.textContent = text;
  document.body.append(el);
  return el;
}

function makeInput(value = 'שלום עולם', type = 'text'): HTMLInputElement {
  const el = document.createElement('input');
  el.type = type;
  el.value = value;
  document.body.append(el);
  return el;
}

function placeCaret(el: HTMLElement, start: number, end = start): void {
  const node = el.firstChild as Text;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

function tick(ms = 100): void {
  vi.advanceTimersByTime(ms);
}

describe('installFocusRestore — חזרה לטאב', () => {
  it('respects a button focused during the resume delay', () => {
    const el = makeInput();
    const button = document.createElement('button');
    document.body.append(button);
    el.focus();
    host.emit('plugin.suspended', null);
    el.blur();
    host.emit('plugin.resumed', null);
    button.focus();
    tick();
    expect(document.activeElement).toBe(button);
  });

  it.each(['readOnly', 'disabled'] as const)('does not restore an input that becomes %s while suspended', (property) => {
    const el = makeInput();
    el.focus();
    host.emit('plugin.suspended', null);
    el.blur();
    el[property] = true;
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.resumed', null);
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('does not restore an editor that becomes noneditable', () => {
    const el = makeEditor();
    el.focus();
    host.emit('plugin.suspended', null);
    el.blur();
    el.setAttribute('contenteditable', 'false');
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.resumed', null);
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea'])('preserves backward selection in %s', (tag) => {
    const el = document.createElement(tag) as HTMLInputElement | HTMLTextAreaElement;
    el.value = 'abcdef';
    document.body.append(el);
    el.focus();
    el.setSelectionRange(1, 4, 'backward');
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    expect(el.selectionStart).toBe(1);
    expect(el.selectionEnd).toBe(4);
    expect(el.selectionDirection).toBe('backward');
  });

  it('preserves backward selection in the editor', () => {
    const el = makeEditor('abcdef');
    el.focus();
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(el.firstChild!, 4, el.firstChild!, 1);
    host.emit('plugin.suspended', null);
    selection.removeAllRanges();
    host.emit('plugin.resumed', null);
    tick();
    expect(selection.anchorOffset).toBe(4);
    expect(selection.focusOffset).toBe(1);
  });

  it('remembers focus on window blur without the host lifecycle events', () => {
    const el = makeInput();
    el.focus();
    window.dispatchEvent(new Event('blur'));
    el.blur();
    window.dispatchEvent(new Event('focus'));
    tick();
    expect(document.activeElement).toBe(el);
  });

  it('מבצע blur ו-focus מחדש לעורך שהיה במיקוד בעת plugin.resumed', () => {
    const el = makeEditor();
    el.focus();
    const blur = vi.spyOn(el, 'blur');
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    expect(focus).not.toHaveBeenCalled();
    tick();
    expect(blur).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(el);
  });

  it('מחזיר את מיקום הסמן בעורך אחרי החזרה', () => {
    const el = makeEditor('אבגדהוז');
    el.focus();
    placeCaret(el, 3);
    host.emit('plugin.suspended', null);
    window.getSelection()!.removeAllRanges();
    host.emit('plugin.resumed', null);
    tick();
    const selection = window.getSelection()!;
    expect(selection.rangeCount).toBe(1);
    expect(selection.anchorNode).toBe(el.firstChild);
    expect(selection.anchorOffset).toBe(3);
    expect(selection.isCollapsed).toBe(true);
  });

  it('משמר בחירה של טווח טקסט בעורך', () => {
    const el = makeEditor('אבגדהוז');
    el.focus();
    placeCaret(el, 1, 4);
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    const range = window.getSelection()!.getRangeAt(0);
    expect(range.startOffset).toBe(1);
    expect(range.endOffset).toBe(4);
  });

  it('מחזיר מיקוד לעורך שאיבד מיקוד בזמן ההשהיה', () => {
    const el = makeEditor();
    el.focus();
    placeCaret(el, 2);
    host.emit('plugin.suspended', null);
    el.blur();
    expect(document.activeElement).toBe(document.body);
    host.emit('plugin.resumed', null);
    tick();
    expect(document.activeElement).toBe(el);
    expect(window.getSelection()!.anchorOffset).toBe(2);
  });

  it('משמר בחירה בשדה input', () => {
    const el = makeInput('אבגדהוז');
    el.focus();
    el.setSelectionRange(2, 5);
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    expect(document.activeElement).toBe(el);
    expect(el.selectionStart).toBe(2);
    expect(el.selectionEnd).toBe(5);
    expect(el.value).toBe('אבגדהוז');
  });

  it('משמר בחירה בשדה textarea', () => {
    const el = document.createElement('textarea');
    el.value = 'שורה ראשונה\nשורה שנייה';
    document.body.append(el);
    el.focus();
    el.setSelectionRange(4, 9);
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    expect(document.activeElement).toBe(el);
    expect(el.selectionStart).toBe(4);
    expect(el.selectionEnd).toBe(9);
  });

  it('אינו נוגע בתוכן העורך', () => {
    const el = makeEditor('תוכן קיים');
    el.focus();
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    expect(el.textContent).toBe('תוכן קיים');
  });

  it('אירוע focus של החלון מחזיר מיקוד לעורך', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    window.dispatchEvent(new Event('focus'));
    tick();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('visibilitychange לנראה מחזיר מיקוד', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    tick();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('visibilitychange להסתר אינו מחזיר מיקוד', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('מאחד אירועים רצופים לביצוע יחיד', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    host.emit('plugin.resumed', null);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    tick();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('plugin.suspended מבטל חזרה מתוזמנת', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.resumed', null);
    host.emit('plugin.suspended', null);
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('אינו מפעיל מיקוד אם לא היה שדה עריכה במיקוד', () => {
    const el = makeEditor();
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    const focus = vi.spyOn(el, 'focus');
    tick();
    expect(focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('אינו נוגע באלמנט שאינו שדה עריכה', () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const blur = vi.spyOn(button, 'blur');
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    expect(blur).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
  });

  it.each(['checkbox', 'radio', 'button', 'file', 'range', 'color'])('מתעלם מ-input מסוג %s', (type) => {
    const el = makeInput('', type);
    el.focus();
    const blur = vi.spyOn(el, 'blur');
    host.emit('plugin.resumed', null);
    tick();
    expect(blur).not.toHaveBeenCalled();
  });

  it('מתעלם משדה readOnly', () => {
    const el = makeInput('טקסט');
    el.readOnly = true;
    el.focus();
    const blur = vi.spyOn(el, 'blur');
    host.emit('plugin.resumed', null);
    tick();
    expect(blur).not.toHaveBeenCalled();
  });

  it('מתעלם מ-contenteditable="false"', () => {
    const el = document.createElement('div');
    el.setAttribute('contenteditable', 'false');
    el.tabIndex = 0;
    document.body.append(el);
    el.focus();
    const blur = vi.spyOn(el, 'blur');
    host.emit('plugin.resumed', null);
    tick();
    expect(blur).not.toHaveBeenCalled();
  });

  it('אינו נכשל כשהאלמנט הוסר מה-DOM בזמן ההשהיה', () => {
    const el = makeEditor();
    el.focus();
    host.emit('plugin.suspended', null);
    el.remove();
    host.emit('plugin.resumed', null);
    expect(() => tick()).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });

  it('אינו נכשל כש-setSelectionRange זורק (input מסוג number)', () => {
    const el = makeInput('42', 'number');
    el.focus();
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    expect(() => tick()).not.toThrow();
    expect(document.activeElement).toBe(el);
  });

  it('מחזיר מיקוד לשדה שבמיקוד כעת גם אם נשמר שדה אחר בהשהיה', () => {
    const first = makeInput('ראשון');
    const second = makeInput('שני');
    first.focus();
    host.emit('plugin.suspended', null);
    second.focus();
    host.emit('plugin.resumed', null);
    tick();
    expect(document.activeElement).toBe(second);
  });

  it('השהיה חוזרת ללא חזרה אינה משאירה מצב שנשמר לחזרה מאוחרת', () => {
    const el = makeEditor();
    el.focus();
    host.emit('plugin.suspended', null);
    host.emit('plugin.resumed', null);
    tick();
    el.blur();
    const focus = vi.spyOn(el, 'focus');
    window.dispatchEvent(new Event('focus'));
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('ההקלדה אחרי החזרה מגיעה לעורך', () => {
    const el = makeEditor('');
    el.focus();
    host.emit('plugin.suspended', null);
    el.blur();
    host.emit('plugin.resumed', null);
    tick();
    const received: string[] = [];
    el.addEventListener('keydown', (e) => received.push((e as KeyboardEvent).key));
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'א', bubbles: true }));
    expect(received).toEqual(['א']);
  });
});

describe('installFocusRestore — רישום וניקוי', () => {
  it('נרשם לאירועי השהיה וחזרה של אוצריא', () => {
    expect(host.listenerCount('plugin.suspended')).toBe(1);
    expect(host.listenerCount('plugin.resumed')).toBe(1);
  });

  it('הניקוי מסיר את כל המאזינים', () => {
    dispose!();
    dispose = null;
    expect(host.listenerCount('plugin.suspended')).toBe(0);
    expect(host.listenerCount('plugin.resumed')).toBe(0);
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.resumed', null);
    window.dispatchEvent(new Event('focus'));
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('הניקוי מבטל חזרה מתוזמנת', () => {
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    host.emit('plugin.resumed', null);
    dispose!();
    dispose = null;
    tick();
    expect(focus).not.toHaveBeenCalled();
  });

  it('ניקוי כפול אינו זורק', () => {
    const cleanup = dispose!;
    dispose = null;
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });

  it('עובד גם כשאין SDK של אוצריא, דרך אירועי החלון', () => {
    dispose!();
    host.uninstall();
    dispose = installFocusRestore();
    const el = makeEditor();
    el.focus();
    const focus = vi.spyOn(el, 'focus');
    window.dispatchEvent(new Event('focus'));
    tick();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
