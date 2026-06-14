'use strict';

/* ══ STORAGE ══ */
async function stSet(k, v) {
  try { await Otzaria.call('storage.set', {key: k, value: JSON.stringify(v)}); }
  catch(e) { try { localStorage.setItem('_otzw_' + k, JSON.stringify(v)); } catch(ee) {} }
}
async function stGet(k) {
  try {
    const {data} = await Otzaria.call('storage.get', {key: k});
    if (data?.value) return JSON.parse(data.value);
  } catch(e) {}
  try { const v = localStorage.getItem('_otzw_' + k); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}

/* ══ SAVE / LOAD ══ */
function schedSave() {
  document.getElementById('sbs').textContent = '● לא שמור';
  clearTimeout(autoSave);
  autoSave = setTimeout(saveDoc, 2500);
}

async function saveDoc() {
  _saveCurrentDocState();
  await stSet('wdocs', docs.map(d => ({title: d.title, content: d.content, fn: d.fn, en: d.en})));
  await stSet('wdocIdx', docIdx);
  await stSet('wmacros', macros);
  await stSet('warchive', archive);
  await stSet('wcomments', {list: comments, count: cmCount});
  await stSet('wkeybindings', window._customKeys || {});
  document.getElementById('sbs').textContent = '✓ שמור';
}

async function loadAll() {
  const saved = await stGet('wdocs');
  const savedIdx = await stGet('wdocIdx') || 0;
  if (saved && Array.isArray(saved) && saved.length) {
    docs = saved.map((d, i) => ({id: i, title: d.title || 'מסמך חדש', content: d.content || '<p><br></p>', scroll: 0, fn: d.fn || 0, en: d.en || 0}));
    _docIdCtr = docs.length;
    docIdx = Math.min(savedIdx, docs.length - 1);
  } else {
    const d = await stGet('wdoc');
    if (d?.content) { docs = [{id: 0, title: d.title || 'מסמך חדש', content: d.content, scroll: 0, fn: 0, en: 0}]; }
  }
  _loadDocState(docIdx);
  const m = await stGet('wmacros'); if (Array.isArray(m)) macros = m;
  const a = await stGet('warchive'); if (Array.isArray(a)) archive = a;
  const cm = await stGet('wcomments');
  if (cm && Array.isArray(cm.list)) { comments = cm.list; cmCount = cm.count || cm.list.length; updCommentPanel(); }
  const kb = await stGet('wkeybindings');
  if (kb && typeof kb === 'object') window._customKeys = kb;
}

/* ══ MULTI-DOC TABS ══ */
function swDoc(idx) {
  if (idx === docIdx) return;
  _saveCurrentDocState();
  docIdx = idx;
  _loadDocState(idx);
}

function _saveCurrentDocState() {
  if (!docs[docIdx]) return;
  docs[docIdx].content = document.getElementById('dp').innerHTML;
  docs[docIdx].title = document.getElementById('doc-title').value;
  docs[docIdx].scroll = document.getElementById('dw').scrollTop;
  docs[docIdx].fn = fnCount;
  docs[docIdx].en = enCount;
}

function _loadDocState(idx) {
  const d = docs[idx];
  if (!d) return;
  document.getElementById('dp').innerHTML = d.content || '<p><br></p>';
  document.getElementById('doc-title').value = d.title || 'מסמך חדש';
  fnCount = d.fn || 0;
  enCount = d.en || 0;
  setTimeout(() => { document.getElementById('dw').scrollTop = d.scroll || 0; }, 50);
  _rebuildDocTabs();
  updCount(); updNav(); schedRepaginate();
}

function newDocTab() {
  _saveCurrentDocState();
  const id = _docIdCtr++;
  docs.push({id, title: 'מסמך חדש', content: '<p><br></p>', scroll: 0, fn: 0, en: 0});
  docIdx = docs.length - 1;
  _loadDocState(docIdx);
}

function closeDoc(idx) {
  if (docs.length === 1) {
    docs[0] = {id: 0, title: 'מסמך חדש', content: '<p><br></p>', scroll: 0, fn: 0, en: 0};
    docIdx = 0; _loadDocState(0); return;
  }
  docs.splice(idx, 1);
  if (docIdx >= docs.length) docIdx = docs.length - 1;
  else if (docIdx > idx) docIdx--;
  _loadDocState(docIdx);
}

function _rebuildDocTabs() {
  const bar = document.getElementById('doc-tabbar');
  if (!bar) return;
  const newBtn = bar.querySelector('.dt-new');
  bar.querySelectorAll('.doc-tab').forEach(t => t.remove());
  docs.forEach((d, i) => {
    const tab = document.createElement('div');
    tab.className = 'doc-tab' + (i === docIdx ? ' on' : '');
    tab.id = 'dt-' + i;
    tab.onclick = () => swDoc(i);
    tab.title = d.title;
    tab.innerHTML = `<span class="dt-title">${(d.title || 'מסמך חדש').replace(/</g, '&lt;')}</span><button class="dt-x" onclick="event.stopPropagation();closeDoc(${i})" title="סגור">&times;</button>`;
    bar.insertBefore(tab, newBtn);
  });
}
