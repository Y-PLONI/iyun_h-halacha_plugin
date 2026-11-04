import { offOtzaria, onOtzaria } from '../otzaria/sdk';

const REFOCUS_DELAY_MS = 60;

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'number', 'password']);

interface Snapshot {
  el: HTMLElement;
  range: Range | null;
  start: number | null;
  end: number | null;
  direction: 'forward' | 'backward' | 'none' | null;
  backward: boolean;
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
    return {
      el,
      range: null,
      start: el.selectionStart,
      end: el.selectionEnd,
      direction: el.selectionDirection,
      backward: false,
    };
  }
  const selection = window.getSelection();
  const inside =
    selection !== null && selection.rangeCount > 0 &&
    selection.anchorNode !== null && selection.focusNode !== null &&
    el.contains(selection.anchorNode) && el.contains(selection.focusNode);
  const range = inside ? selection.getRangeAt(0).cloneRange() : null;
  const backward = !!range && !range.collapsed &&
    selection!.anchorNode === range.endContainer && selection!.anchorOffset === range.endOffset;
  return { el, range, start: null, end: null, direction: null, backward };
}

function restore(snapshot: Snapshot): void {
  const { el } = snapshot;
  if (!el.isConnected || !isEditable(el)) return;
  el.blur();
  el.focus({ preventScroll: true });
  if (isTextField(el)) {
    if (snapshot.start !== null && snapshot.end !== null) {
      try {
        el.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction ?? 'none');
      } catch {
        return;
      }
    }
    return;
  }
  if (snapshot.range && el.contains(snapshot.range.startContainer) && el.contains(snapshot.range.endContainer)) {
    const selection = window.getSelection();
    if (selection) {
      const range = snapshot.range;
      if (snapshot.backward) {
        selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
      } else {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
}

function pick(current: Snapshot | null, remembered: Snapshot | null): Snapshot | null {
  if (!current) {
    const active = document.activeElement;
    return !active || active === document.body || active === document.documentElement ? remembered : null;
  }
  if (!remembered || remembered.el !== current.el) return current;
  return {
    el: current.el,
    range: current.range ?? remembered.range,
    start: current.start ?? remembered.start,
    end: current.end ?? remembered.end,
    direction: current.direction ?? remembered.direction,
    backward: current.range ? current.backward : remembered.backward,
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
    else onSuspended();
  };

  onOtzaria('plugin.suspended', onSuspended);
  onOtzaria('plugin.resumed', schedule);
  window.addEventListener('focus', schedule);
  window.addEventListener('blur', onSuspended);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    cancel();
    remembered = null;
    offOtzaria('plugin.suspended', onSuspended);
    offOtzaria('plugin.resumed', schedule);
    window.removeEventListener('focus', schedule);
    window.removeEventListener('blur', onSuspended);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
