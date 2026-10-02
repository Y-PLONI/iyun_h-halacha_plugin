import { offOtzaria, onOtzaria } from '../otzaria/sdk';

const REFOCUS_DELAY_MS = 60;

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'number', 'password']);

interface Snapshot {
  el: HTMLElement;
  range: Range | null;
  start: number | null;
  end: number | null;
}

function isTextField(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isEditable(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) {
    return !el.readOnly && !el.disabled && TEXT_INPUT_TYPES.has(el.type);
  }
  if (el.isContentEditable === true) return true;
  const attr = el.getAttribute('contenteditable');
  return attr === '' || attr === 'true' || attr === 'plaintext-only';
}

function capture(): Snapshot | null {
  const el = document.activeElement;
  if (!isEditable(el)) return null;
  if (isTextField(el)) {
    return { el, range: null, start: el.selectionStart, end: el.selectionEnd };
  }
  const selection = window.getSelection();
  const inside =
    selection !== null && selection.rangeCount > 0 && selection.anchorNode !== null && el.contains(selection.anchorNode);
  return { el, range: inside ? selection.getRangeAt(0).cloneRange() : null, start: null, end: null };
}

function restore(snapshot: Snapshot): void {
  const { el } = snapshot;
  if (!el.isConnected) return;
  el.blur();
  el.focus({ preventScroll: true });
  if (isTextField(el)) {
    if (snapshot.start !== null && snapshot.end !== null) {
      try {
        el.setSelectionRange(snapshot.start, snapshot.end);
      } catch {
        return;
      }
    }
    return;
  }
  if (snapshot.range) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(snapshot.range);
    }
  }
}

function pick(current: Snapshot | null, remembered: Snapshot | null): Snapshot | null {
  if (!current) return remembered;
  if (!remembered || remembered.el !== current.el) return current;
  return {
    el: current.el,
    range: current.range ?? remembered.range,
    start: current.start ?? remembered.start,
    end: current.end ?? remembered.end,
  };
}

export function installFocusRestore(): () => void {
  let remembered: Snapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const run = () => {
    timer = null;
    const snapshot = pick(capture(), remembered);
    remembered = null;
    if (snapshot) restore(snapshot);
  };

  const schedule = () => {
    cancel();
    timer = setTimeout(run, REFOCUS_DELAY_MS);
  };

  const onSuspended = () => {
    cancel();
    remembered = pick(capture(), remembered);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule();
  };

  onOtzaria('plugin.suspended', onSuspended);
  onOtzaria('plugin.resumed', schedule);
  window.addEventListener('focus', schedule);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancel();
    remembered = null;
    offOtzaria('plugin.suspended', onSuspended);
    offOtzaria('plugin.resumed', schedule);
    window.removeEventListener('focus', schedule);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
