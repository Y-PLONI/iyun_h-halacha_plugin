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

// המעבר נעשה עם סמן על הצאצאים החיים (ולא על snapshot), כדי שצאצאים שהועלו למעלה
// בעקבות פירוק עטיפה לא-מותרת ייבדקו אף הם. אחרת עטיפה כמו <span><img onerror=…>
// הייתה מבריחה את הצאצא מהניקוי.
function cleanNode(node: Node): void {
  let child: ChildNode | null = node.firstChild;
  while (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      child = child.nextSibling;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      const next = child.nextSibling;
      child.remove();
      child = next;
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (!ALLOWED_TAGS.has(tag)) {
      // שומרים את הטקסט הפנימי, מסירים את העטיפה
      const nextAfter = el.nextSibling;
      const firstHoisted = el.firstChild;
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      child = firstHoisted ?? nextAfter;
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
      child = replacement.nextSibling;
      continue;
    }
    cleanNode(el);
    child = el.nextSibling;
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

// כמו cleanNode — סמן על הצאצאים החיים, כדי שצאצא שהועלה בעקבות פירוק עטיפה
// לא-מוכרת (למשל <font><script>) ייבדק וינוקה גם הוא.
function cleanSourceNode(node: Node): void {
  let child: ChildNode | null = node.firstChild;
  while (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      child = child.nextSibling;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      const next = child.nextSibling;
      child.remove();
      child = next;
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'LINK' || tag === 'META') {
      const next = el.nextSibling;
      el.remove();
      child = next;
      continue;
    }
    if (!SOURCE_ALLOWED.has(tag)) {
      // תג לא מוכר — משמרים את התוכן, מסירים את העטיפה
      const nextAfter = el.nextSibling;
      const firstHoisted = el.firstChild;
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      child = firstHoisted ?? nextAfter;
      continue;
    }
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    cleanSourceNode(el);
    child = el.nextSibling;
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
