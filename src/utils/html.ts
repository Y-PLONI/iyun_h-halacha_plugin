// ניקוי HTML של תשובות. מאפשר רק תגיות בטוחות, ללא script/style/אירועים.

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'OL', 'UL', 'LI', 'BLOCKQUOTE', 'DIV']);
// נורמליזציה: b->strong, i->em
const TAG_REMAP: Record<string, string> = { B: 'STRONG', I: 'EM', DIV: 'P' };

export function sanitizeAnswerHtml(dirty: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = dirty;
  cleanNode(tmp);
  return tmp.innerHTML;
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      // שומרים את הטקסט הפנימי, מסירים את העטיפה
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }
    // הסרת כל המאפיינים (כולל on*, style, class)
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    // remap
    const remap = TAG_REMAP[tag];
    if (remap && remap !== tag) {
      const replacement = document.createElement(remap);
      while (el.firstChild) replacement.appendChild(el.firstChild);
      el.replaceWith(replacement);
      cleanNode(replacement);
      continue;
    }
    cleanNode(el);
  }
}

// ── ניקוי HTML של מקורות מאוצריא (getBookContent מחזיר HTML) ──
// משמרים מבנה (כותרות/הדגשות) ומסירים סקריפטים/אירועים/מאפיינים.
const SOURCE_ALLOWED = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM',
  'U', 'BR', 'SUP', 'SUB', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'SMALL', 'BIG', 'SECTION', 'A',
]);

export function sanitizeSourceHtml(dirty: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = dirty;
  cleanSourceNode(tmp);
  return tmp.innerHTML;
}

function cleanSourceNode(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'LINK' || tag === 'META') {
      el.remove();
      continue;
    }
    if (!SOURCE_ALLOWED.has(tag)) {
      // תג לא מוכר — משמרים את התוכן, מסירים את העטיפה
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    cleanSourceNode(el);
  }
}

export function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // המרת <br> ובלוקים לשורות
  tmp.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  tmp.querySelectorAll('p, li, blockquote, div').forEach((el) => {
    el.append('\n');
  });
  const text = tmp.textContent ?? '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
