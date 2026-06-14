'use strict';
/* ── DEFAULT COLORS (Word-blue) — set before CSS renders ── */
(function(){var r=document.documentElement,s=function(n,v){r.style.setProperty(n,v);};
s('--color-primary','#2b579a');s('--color-on-primary','#ffffff');
s('--color-secondary','#1a4480');s('--color-on-secondary','#ffffff');
s('--color-surface','#f3f3f3');s('--color-on-surface','#1c1b1f');
s('--color-surface-container-highest','#e6e0e9');
s('--color-error','#c00000');s('--color-on-error','#ffffff');
s('--color-outline','#d1d1d1');
s('--color-primary-subtle','rgba(43,87,154,.13)');
s('--color-secondary-subtle','rgba(43,87,154,.28)');
s('--canvas','#d2d2d2');
s('--color-white','#ffffff');s('--color-page-bg','#ffffff');
s('--color-text-primary','#333333');s('--color-text-secondary','#555555');
s('--color-text-muted','#888888');s('--color-text-lighter','#bbbbbb');
s('--color-border-mid','#b0b0b0');s('--color-border-light','#e8e8e8');
s('--color-bg-light','#f0f0f0');s('--color-bg-subtle','#f8f8f8');
s('--color-h2','#2e74b5');s('--color-h3','#1f3763');
s('--color-yellow-hl','#fff176');s('--color-orange-hl','#ff9800');
s('--color-alt-tip-bg','#ffe066');s('--color-alt-tip-border','#c8a800');
s('--color-otz-tab','#ffe566');s('--color-comment-bg','#fffde7');
s('--color-tc-ins-text','#006600');s('--color-tc-ins-border','#009900');
s('--color-tc-del-text','#aa0000');s('--color-error-light','#ff6b6b');
s('--color-dark-accent','#aaaadd');
s('--color-on-primary-15','rgba(255,255,255,.15)');s('--color-on-primary-20','rgba(255,255,255,.20)');
s('--color-on-primary-35','rgba(255,255,255,.35)');s('--color-on-primary-55','rgba(255,255,255,.55)');
s('--color-on-primary-60','rgba(255,255,255,.60)');s('--color-on-primary-65','rgba(255,255,255,.65)');
s('--color-on-primary-70','rgba(255,255,255,.70)');s('--color-on-primary-75','rgba(255,255,255,.75)');
s('--color-on-primary-88','rgba(255,255,255,.88)');
s('--color-shadow-sm','rgba(0,0,0,.18)');s('--color-shadow-md','rgba(0,0,0,.20)');
s('--color-shadow-lg','rgba(0,0,0,.28)');s('--color-shadow-xl','rgba(0,0,0,.40)');
s('--color-scrim','rgba(0,0,0,.35)');
s('--color-doc-tab-bg','rgba(0,0,0,.07)');s('--color-doc-tab-hover','rgba(0,0,0,.13)');
s('--color-focus-ring','rgba(43,87,154,.22)');
s('--color-border-hover','rgba(43,87,154,.35)');
s('--color-border-active','rgba(43,87,154,.60)');
s('--color-rec-bg','rgba(200,0,0,.85)');s('--color-slider-track','rgba(255,255,255,.35)');
s('--color-watermark','rgba(150,150,150,.18)');
s('--color-comment-ref','rgba(255,200,0,.30)');s('--color-comment-ref-hover','rgba(255,200,0,.55)');
s('--color-comment-ref-border','rgba(255,180,0,.70)');
s('--color-tc-ins-bg','rgba(0,160,0,.12)');s('--color-tc-del-bg','rgba(200,0,0,.08)');
s('--color-dark-canvas','#252525');s('--color-dark-surface','#2b2b2b');
s('--color-dark-surface-high','#3a3a3a');s('--color-dark-border','#444444');
s('--color-dark-deep','#1e1e1e');s('--color-dark-text','#e0e0e0');
s('--color-dark-text-dim','#cccccc');s('--color-dark-text-head','#dddddd');
s('--tag-chidush-bg','#e8f0fe');s('--tag-chidush-color','#1a56db');
s('--tag-kushia-bg','#fde8e8');s('--tag-kushia-color','#c81e1e');
s('--tag-tiruts-bg','#def7ec');s('--tag-tiruts-color','#057a55');
s('--tag-makor-bg','#fef3c7');s('--tag-makor-color','#92400e');
s('--tag-chashuv-bg','#edebfe');s('--tag-chashuv-color','#5521b5');
s('--tag-liun-bg','#f3f4f6');s('--tag-liun-color','#374151');
s('--sticky-yellow-bg','#fff9c4');s('--sticky-blue-bg','#bbdefb');
s('--sticky-green-bg','#c8e6c9');s('--sticky-pink-bg','#f8bbd0');
s('--sticky-shadow','rgba(0,0,0,.22)');s('--sticky-hd-overlay','rgba(0,0,0,.08)');
}());
let zoom=100,autoSave,countTimer,navTimer;
let macros=[],archive=[],navMode='h';
let fhlList=[],fhlIdx=0,savedRange=null;
let fnCount=0,enCount=0;
let isReadMode=false,isPainting=false,paintData=null;
let isRecording=false,recActions=[],recName='',recBuf='';
let _skipPasteRecord=false;
let stickies=[],_stickyIdCtr=1,stickiesVisible=true;
let clips=[],_clipIdCtr=1;
const _tagTypes={chidush:{label:'📌 חידוש',cls:'tag-chidush'},kushia:{label:'❓ קושיה',cls:'tag-kushia'},tiruts:{label:'✅ תירוץ',cls:'tag-tiruts'},makor:{label:'📖 מקור',cls:'tag-makor'},chashuv:{label:'⭐ חשוב',cls:'tag-chashuv'},liun:{label:'☐ לעיון',cls:'tag-liun'}};

/* ── CUSTOM UNDO/REDO STACK ── */
let _undoStack=[],_redoStack=[];
let _lastSnapshotHTML='',_typingTimer=null;

function saveSnapshot(){
  const html=_getDocHTML();
  if(html===_lastSnapshotHTML)return;
  _undoStack.push(_lastSnapshotHTML||html);
  _lastSnapshotHTML=html;
  _redoStack=[];
  if(_undoStack.length>30)_undoStack.shift();
}

// Called on typing — throttled so rapid keystrokes count as one undo step
function _schedSnapshot(){
  clearTimeout(_typingTimer);
  _typingTimer=setTimeout(()=>{saveSnapshot();},800);
}

function doUndo(){
  if(!_undoStack.length)return;
  clearTimeout(_typingTimer);
  const cur=_getDocHTML();
  _redoStack.push(cur);
  const prev=_undoStack.pop();
  _lastSnapshotHTML=prev;
  _setDocHTML(prev);
  schedRepaginate(true);schedSave();
}
function doRedo(){
  if(!_redoStack.length)return;
  clearTimeout(_typingTimer);
  const cur=_getDocHTML();
  _undoStack.push(cur);
  const next=_redoStack.pop();
  _lastSnapshotHTML=next;
  _setDocHTML(next);
  schedRepaginate(true);schedSave();
}

/* ── MULTI-DOC TABS ── */
let docs=[{id:0,title:'מסמך חדש',content:'<p><br></p>',scroll:0,fn:0,en:0}],docIdx=0,_docIdCtr=1;

function swDoc(idx){
  if(idx===docIdx)return;
  _saveCurrentDocState();
  docIdx=idx;
  _loadDocState(idx);
}
function _saveCurrentDocState(){
  if(!docs[docIdx])return;
  docs[docIdx].content=_getDocHTML();
  docs[docIdx].title=document.getElementById('doc-title').value;
  docs[docIdx].scroll=document.getElementById('dw').scrollTop;
  docs[docIdx].fn=fnCount;docs[docIdx].en=enCount;
}
function _loadDocState(idx){
  const d=docs[idx];
  if(!d)return;
  _setDocHTML(d.content||'<p><br></p>');
  document.getElementById('doc-title').value=d.title||'מסמך חדש';
  fnCount=d.fn||0;enCount=d.en||0;
  setTimeout(()=>{document.getElementById('dw').scrollTop=d.scroll||0;},50);
  _rebuildDocTabs();
  updCount();updNav();schedRepaginate();
}
function newDocTab(){
  _saveCurrentDocState();
  const id=_docIdCtr++;
  docs.push({id,title:'מסמך חדש',content:'<p><br></p>',scroll:0,fn:0,en:0});
  docIdx=docs.length-1;
  _loadDocState(docIdx);
  _applyDefaultsToPage(activePage());
}
function closeDoc(idx){
  if(docs.length===1){
    docs[0]={id:0,title:'מסמך חדש',content:'<p><br></p>',scroll:0,fn:0,en:0};
    docIdx=0;_loadDocState(0);return;
  }
  docs.splice(idx,1);
  if(docIdx>=docs.length)docIdx=docs.length-1;
  else if(docIdx>idx)docIdx--;
  _loadDocState(docIdx);
}
function _rebuildDocTabs(){
  const bar=document.getElementById('doc-tabbar');
  if(!bar)return;
  const newBtn=bar.querySelector('.dt-new');
  bar.querySelectorAll('.doc-tab').forEach(t=>t.remove());
  docs.forEach((d,i)=>{
    const tab=document.createElement('div');
    tab.className='doc-tab'+(i===docIdx?' on':'');
    tab.id='dt-'+i;
    tab.onclick=()=>swDoc(i);
    tab.title=d.title;
    tab.innerHTML=`<span class="dt-title">${(d.title||'מסמך חדש').replace(/</g,'&lt;')}</span><button class="dt-x" onclick="event.stopPropagation();closeDoc(${i})" title="סגור">&times;</button>`;
    bar.insertBefore(tab,newBtn);
  });
  // Sync title input to tab
  const dt=document.getElementById('doc-title');
  if(dt)dt.onchange=()=>{if(docs[docIdx])docs[docIdx].title=dt.value;_rebuildDocTabs();schedSave();};
}

/* ══ PAGE HELPERS ══ */
function activePage(){
  const a=document.activeElement;
  if(a&&a.classList.contains('page'))return a;
  return document.querySelector('.page');
}
function _newPage(html){
  const pg=document.createElement('div');
  pg.className='page';
  pg.contentEditable='true';
  pg.dir='rtl';
  pg.setAttribute('spellcheck','true');
  pg.innerHTML=html||'<p><br></p>';
  _enablePageDrag(pg);
  return pg;
}
function _enablePageDrag(pg){
  pg.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
  pg.addEventListener('drop',e=>{
    e.preventDefault();
    const html=e.dataTransfer.getData('text/html');
    const txt=e.dataTransfer.getData('text/plain');
    if(!html&&!txt)return;
    const range=document.caretRangeFromPoint?document.caretRangeFromPoint(e.clientX,e.clientY):null;
    if(range){const s=window.getSelection();s.removeAllRanges();s.addRange(range);}
    saveSnapshot();
    if(html)document.execCommand('insertHTML',false,html);
    else document.execCommand('insertText',false,txt);
    schedSave();
  });
}
function _getDocHTML(){
  return [...document.querySelectorAll('.page')]
    .map(p=>{
      const cl=p.cloneNode(true);
      cl.querySelectorAll('.fn-exit').forEach(e=>e.remove());
      cl.querySelectorAll('mark.spell-err').forEach(m=>{while(m.firstChild)m.parentNode.insertBefore(m.firstChild,m);m.remove();});
      return cl.innerHTML;
    }).join('\n<!-- PAGE_BREAK -->\n');
}
function _setDocHTML(html){
  const dp=document.getElementById('dp');
  dp.querySelectorAll('.page').forEach(p=>p.remove());
  const parts=(html||'').split('\n<!-- PAGE_BREAK -->\n');
  parts.forEach(part=>{
    dp.appendChild(_newPage(part||'<p><br></p>'));
  });
  if(!dp.querySelector('.page'))dp.appendChild(_newPage());
}
function _getDocText(){
  return [...document.querySelectorAll('.page')].map(p=>p.innerText||'').join('\n');
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded',()=>{
  // ?reset clears all saved plugin data and reloads clean
  if(location.search.includes('reset')){
    Object.keys(localStorage).filter(k=>k.startsWith('_otzw_')).forEach(k=>localStorage.removeItem(k));
    history.replaceState(null,'',location.pathname);
    location.reload();return;
  }

  const dp=document.getElementById('dp');
  try{document.execCommand('defaultParagraphSeparator',false,'p');}catch(e){}
  try{document.execCommand('styleWithCSS',false,true);}catch(e){}
  document.querySelectorAll('.page').forEach(_enablePageDrag);

  document.addEventListener('selectionchange',()=>{
    const s=window.getSelection();
    if(s&&s.rangeCount>0&&dp.contains(s.focusNode)){
      try{savedRange=s.getRangeAt(0).cloneRange();}catch(e){}
    }
    updFmt();
  });

  dp.addEventListener('beforeinput',e=>{
    // Save snapshot for structural changes; throttle for plain typing
    switch(e.inputType){
      case 'insertText':
        _schedSnapshot();
        if(isRecording&&e.data)recBuf+=e.data;
        break;
      case 'insertParagraph':
      case 'insertLineBreak':
        saveSnapshot();
        if(isRecording){recFlush();recPush({t:e.inputType==='insertParagraph'?'nl':'lb'});}
        break;
      case 'deleteContentBackward':
      case 'deleteWordBackward':
        saveSnapshot();
        if(isRecording){recFlush();recPush({t:'del',d:'b'});}
        break;
      case 'deleteContentForward':
      case 'deleteWordForward':
        saveSnapshot();
        if(isRecording){recFlush();recPush({t:'del',d:'f'});}
        break;
      default:
        _schedSnapshot();
        break;
    }
  });

  dp.addEventListener('paste',e=>{
    saveSnapshot();
    const html=e.clipboardData?.getData('text/html')||'';
    const txt=e.clipboardData?.getData('text/plain')||'';
    // If clipboard has no HTML but plain text looks like Otzaria/HTML markup, insert as HTML
    if(!html && txt && /<[a-zA-Z][^>]*>/.test(txt)){
      e.preventDefault();
      const cleaned=_otzHtmlToHtml(txt);
      if(isRecording&&!_skipPasteRecord){recFlush();recPush({t:'paste_html',html:cleaned});}
      document.execCommand('insertHTML',false,cleaned);
      schedSave();
      return;
    }
    if(!isRecording||_skipPasteRecord)return;
    recFlush();
    if(html)recPush({t:'paste_html',html:html});
    else if(txt)recPush({t:'paste_txt',v:txt});
  });

  dp.addEventListener('keydown',e=>{
    // Tab in table — move to next cell
    if(e.key==='Tab'){
      const cell=e.target.closest?.('td,th')||e.target.closest?.('td')||
                 window.getSelection()?.focusNode?.parentElement?.closest('td,th');
      if(cell){
        e.preventDefault();
        const cells=[...cell.closest('table').querySelectorAll('td,th')];
        const idx=cells.indexOf(cell);
        const next=cells[e.shiftKey?idx-1:idx+1];
        if(next){next.focus();const r=document.createRange();r.selectNodeContents(next);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
        else if(!e.shiftKey){ex('insertParagraph');}
      }
    }
  });

  // Format painter apply — on mouseup so the click selection is already set
  dp.addEventListener('mouseup',e=>{
    if(!isPainting||!paintData)return;
    const d=paintData;
    isPainting=false;paintData=null;
    document.getElementById('fp-btn')?.classList.remove('on');
    document.body.classList.remove('cursor-paint');
    saveSnapshot();
    activePage()?.focus();
    if(d.bold!==document.queryCommandState('bold'))document.execCommand('bold',false,null);
    if(d.italic!==document.queryCommandState('italic'))document.execCommand('italic',false,null);
    if(d.underline!==document.queryCommandState('underline'))document.execCommand('underline',false,null);
    if(d.strike!==document.queryCommandState('strikeThrough'))document.execCommand('strikeThrough',false,null);
    if(d.color&&d.color!=='rgb(0, 0, 0)')document.execCommand('foreColor',false,d.color);
    if(d.fontName)try{document.execCommand('fontName',false,d.fontName);}catch(e){}
    if(d.fontSize)try{document.execCommand('fontSize',false,d.fontSize);}catch(e){}
    schedSave();
  });

  // Links in contenteditable don't fire by default — handle them manually
  dp.addEventListener('click',e=>{
    // Footnote ref click — scroll to footnote in fn-area
    const sup=e.target.closest('sup.fn-ref');
    if(sup){
      e.preventDefault();e.stopPropagation();
      const pg=sup.closest('.page');
      if(pg){const ar=pg.querySelector('.fn-area');if(ar)ar.scrollIntoView({behavior:'smooth',block:'start'});}
      return;
    }
    const a=e.target.closest('a[href]');
    if(!a)return;
    e.preventDefault();
    const href=a.getAttribute('href')||'';
    if(href.startsWith('#')){
      // Internal anchor — scroll to target element
      const target=document.getElementById(href.slice(1))||document.querySelector('[name="'+href.slice(1)+'"]');
      if(target)target.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    // External / Otzaria link
    try{Otzaria.call('reader.openBook',{bookId:href});}catch(ex){window.open(href,'_blank','noopener');}
  });

  // Close context menu on click
  document.addEventListener('click',()=>hideCtx(),true);

  try{
    Otzaria.on('plugin.boot',d=>{if(d?.theme)applyOtzTheme(d.theme);});
    Otzaria.on('theme.changed',d=>{applyOtzTheme(d);});
  }catch(e){}

  loadAll();
  loadSystemFonts();
  try {
    Otzaria.call('reader.addContextMenuItem', {
      id: 'word-editor-open',
      label: 'פתח לעריכה בוורד לאוצריא',
      icon: 'document_edit_24_regular'
    }).catch(()=>{});
  } catch(e) {}
  updCount();
  updNav();
  // Baseline snapshot so first undo doesn't go to empty doc
  setTimeout(()=>{_lastSnapshotHTML=_getDocHTML();},200);
  // Auto-save every 3 minutes + before unload
  setInterval(saveDoc, 3 * 60 * 1000);
  window.addEventListener('beforeunload', ()=>{ _saveCurrentDocState(); saveDoc(); });

  // Pinch-to-zoom (touch screen)
  let _pinchDist=0;
  document.addEventListener('touchstart',e=>{
    if(e.touches.length===2)
      _pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(e.touches.length!==2)return;
    e.preventDefault();
    const dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    const delta=dist-_pinchDist;
    if(Math.abs(delta)>3){setZoom(zoom+delta*0.15);_pinchDist=dist;}
  },{passive:false});
  // Sync doc-title changes to tab label
  document.getElementById('doc-title').addEventListener('change',()=>{
    if(docs[docIdx])docs[docIdx].title=document.getElementById('doc-title').value;
    _rebuildDocTabs();schedSave();
  });
});

/* ── SELECTION ── */
function restoreSel(){
  if(!savedRange)return;
  activePage().focus();
  const s=window.getSelection();s.removeAllRanges();
  try{s.addRange(savedRange);}catch(e){}
}

/* ── EXEC ── */
function ex(cmd,val){
  restoreSel();
  activePage().focus();
  try{document.execCommand(cmd,false,val??null);}catch(e){}
}
function selectAllPages(){
  const pages=[...document.querySelectorAll('.page')];
  if(!pages.length)return;
  const first=pages[0],last=pages[pages.length-1];
  const range=document.createRange();
  range.setStart(first,0);
  range.setEnd(last,last.childNodes.length);
  const sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/* ── FORMAT ── */
function fmt(cmd){
  recFlush();
  saveSnapshot();
  ex(cmd);
  if(isRecording){
    let on;try{on=document.queryCommandState(cmd);}catch(e){}
    recPush({t:'fmt',cmd:cmd,on:on});
  }
  updFmt();schedSave();
}

/* ── FONT PICKER ── */
let _fontCatalog=[]; // [{label, value}]
let _curMargins='normal';
let _userDefaults={font:'',size:'',lineHeight:'',margins:'normal'};
function openFontPicker(){
  const inp=document.getElementById('sf');
  const dd=document.getElementById('fp-dd');
  if(!inp||!dd)return;
  if(!dd.children.length&&_fontCatalog.length)_renderFontDD(_fontCatalog);
  const r=inp.getBoundingClientRect();
  dd.style.top=(r.bottom+2)+'px';
  dd.style.right=(window.innerWidth-r.right)+'px';
  dd.style.left='auto';
  // Prevent any click inside the dropdown from stealing focus from the input
  if(!dd._mousedownBound){
    dd.addEventListener('mousedown',e=>e.preventDefault());
    dd._mousedownBound=true;
  }
  dd.classList.add('open');
  const cur=inp.value.trim().toLowerCase();
  if(cur){
    const match=[...dd.children].find(el=>el.dataset.n?.toLowerCase()===cur);
    if(match){match.scrollIntoView({block:'nearest'});match.classList.add('fp-focus');}
  }
}
function fpKeyDown(e){
  const dd=document.getElementById('fp-dd');
  if(!dd||!dd.classList.contains('open'))return;
  const visible=[...dd.children].filter(el=>el.style.display!=='none');
  if(!visible.length)return;
  const cur=dd.querySelector('.fp-focus');
  let idx=cur?visible.indexOf(cur):-1;
  if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,visible.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0);}
  else if(e.key==='Enter'){
    e.preventDefault();
    if(cur)_pickFont({label:cur.dataset.n,value:cur.style.fontFamily||`'${cur.dataset.n}',sans-serif`});
    return;
  }else if(e.key==='Escape'){e.preventDefault();closeFontPicker();return;}
  else return;
  cur?.classList.remove('fp-focus');
  if(idx>=0&&visible[idx]){
    visible[idx].classList.add('fp-focus');
    visible[idx].scrollIntoView({block:'nearest'});
    const inp=document.getElementById('sf');
    if(inp)inp.value=visible[idx].dataset.n;
  }
}
function closeFontPicker(){
  document.getElementById('fp-dd')?.classList.remove('open');
}
function filterFontPicker(q){
  const inp=document.getElementById('sf');
  const dd=document.getElementById('fp-dd');
  if(!dd)return;
  if(!dd.children.length&&_fontCatalog.length)_renderFontDD(_fontCatalog);
  const r=inp?.getBoundingClientRect();
  if(r){dd.style.top=(r.bottom+2)+'px';dd.style.right=(window.innerWidth-r.right)+'px';dd.style.left='auto';}
  dd.classList.add('open');
  const lower=q.toLowerCase();
  [...dd.children].forEach(item=>{item.style.display=item.dataset.n?.toLowerCase().includes(lower)?'':'none';});
}
function _renderFontDD(list){
  const dd=document.getElementById('fp-dd');
  if(!dd)return;
  dd.innerHTML='';
  list.forEach(f=>{
    const div=document.createElement('div');
    div.className='fp-item';
    div.dataset.n=f.label;
    div.textContent=f.label;
    div.style.fontFamily=f.value;
    div.addEventListener('mousedown',e=>{e.preventDefault();_pickFont(f);});
    dd.appendChild(div);
  });
}
function _pickFont(f){
  const inp=document.getElementById('sf');
  if(inp){inp.value=f.label;}
  document.getElementById('fp-dd')?.querySelectorAll('.fp-focus').forEach(el=>el.classList.remove('fp-focus'));
  closeFontPicker();
  applyFont(f.value);
}
function applyFont(name){
  recFlush();saveSnapshot();if(isRecording)recPush({t:'font',name:name});
  // Use a unique marker so we can replace <font face> with a proper CSS span
  // (execCommand fontName with CSS font stacks is unreliable in WebView2)
  const marker='_ff_'+Date.now();
  try{document.execCommand('styleWithCSS',false,false);}catch(e){}
  ex('fontName',marker);
  activePage().querySelectorAll(`font[face="${marker}"]`).forEach(el=>{
    const sp=document.createElement('span');
    sp.style.fontFamily=name;
    while(el.firstChild)sp.appendChild(el.firstChild);
    el.parentNode.replaceChild(sp,el);
  });
  try{document.execCommand('styleWithCSS',false,true);}catch(e){}
  const fdFn=document.getElementById('fd-fn');
  if(fdFn)try{fdFn.value=name;}catch(e){}
  schedSave();
}

function applySize(pt){
  if(!pt||isNaN(pt))return;
  saveSnapshot();
  if(isRecording){recFlush();recPush({t:'size',pt:pt});}
  restoreSel();
  const dp=activePage();dp.focus();
  try{document.execCommand('fontSize',false,'7');}catch(e){}
  dp.querySelectorAll('font[size="7"]').forEach(el=>{
    const sp=document.createElement('span');sp.style.fontSize=pt+'pt';
    while(el.firstChild)sp.appendChild(el.firstChild);
    el.parentNode.replaceChild(sp,el);
  });
  schedSave();
}

function growFont(d){
  const dp=document.getElementById('dp');
  const s=window.getSelection();
  const el=s?.focusNode?(s.focusNode.nodeType===3?s.focusNode.parentElement:s.focusNode):dp;
  const px=parseFloat(window.getComputedStyle(el).fontSize)||16;
  const pt=Math.round(px*0.75);
  const pts=[8,9,10,11,12,14,16,18,20,24,28,36,48,72];
  let i=pts.findIndex(v=>v>=pt);
  if(i===-1)i=pts.length-1;
  else if(d<0&&pts[i]===pt)i--;
  i=Math.max(0,Math.min(pts.length-1,i+d));
  applySize(pts[i]);
  document.getElementById('ss').value=pts[i];
}

function applyColor(c){recFlush();saveSnapshot();if(isRecording)recPush({t:'color',c:c});document.getElementById('bc').style.background=c;ex('foreColor',c);schedSave();}
function applyHL(c){recFlush();saveSnapshot();if(isRecording)recPush({t:'hl',c:c});document.getElementById('bh').style.background=c;ex('backColor',c);schedSave();}

function sa(dir){
  recFlush();
  saveSnapshot();
  if(isRecording)recPush({t:'align',dir:dir});
  const m={Right:'justifyRight',Left:'justifyLeft',Center:'justifyCenter',Full:'justifyFull'};
  ex(m[dir]);updFmt();schedSave();
}

/* Word styles from normal.dotm */
const _wStyles={
  alef:     {block:'div',cls:'ws-alef',   inline:false,desc:'א — כותרת ראשית'},
  bet:      {block:'div',cls:'ws-bet',    inline:false,desc:'ב — פרק חדש'},
  gimel:    {block:'div',cls:'ws-gimel',  inline:false,desc:'ג — כותרת משנית'},
  shefa:    {block:'p',  cls:'ws-shefa',  inline:false,desc:'כתב שפע'},
  iyun:     {block:'p',  cls:'ws-iyun',   inline:false,desc:'כותרת עיון ההלכה'},
  zitut:    {block:'div',cls:'ws-zitut',  inline:false,desc:'ציטוט חוברות'},
  sikum:    {block:'p',  cls:'ws-sikum',  inline:false,desc:'סיכום הדף'},
  listpara: {block:'p',  cls:'ws-listpara',inline:false,desc:'פסקת רשימה'},
  quote:    {block:'div',cls:'ws-quote',  inline:false,desc:'ציטוט'},
  'intense-quote':{block:'div',cls:'ws-intense-quote',inline:false,desc:'ציטוט חזק'},
  red:      {block:null, cls:'ws-red',    inline:true, desc:'אדום — מילות מבנה'},
};
function applyWStyle(name){
  const s=_wStyles[name];if(!s)return;
  saveSnapshot();
  if(isRecording){recFlush();recPush({t:'wstyle',name});}
  if(s.inline){
    // Wrap selection in span with class
    restoreSel();
    const sel=window.getSelection();
    if(sel&&sel.rangeCount&&!sel.isCollapsed){
      try{
        const range=sel.getRangeAt(0);
        const sp=document.createElement('span');sp.className=s.cls;
        range.surroundContents(sp);
      }catch(e){ex('insertHTML','<span class="'+s.cls+'">'+sel.toString()+'</span>');}
    }
  }else{
    // Apply to current block
    const pg=activePage();
    const sel=window.getSelection();
    let node=sel?.focusNode;
    while(node&&node.parentNode!==pg)node=node.parentNode;
    if(node&&node!==pg){
      // Toggle: if already has this class, remove it
      if(node.classList.contains(s.cls)){node.classList.remove(s.cls);}
      else{
        // Remove other ws- classes first
        Object.values(_wStyles).forEach(st=>{if(st.cls)node.classList.remove(st.cls);});
        node.classList.add(s.cls);
      }
    }else{
      ex('formatBlock','<'+s.block+'>');
      setTimeout(()=>{
        const n=window.getSelection()?.focusNode;
        const el=n?.nodeType===3?n.parentElement:n;
        if(el){Object.values(_wStyles).forEach(st=>{if(st.cls)el.classList.remove(st.cls);});el.classList.add(s.cls);}
      },0);
    }
  }
  schedSave();
}

function applyBlock(tag){
  recFlush();
  saveSnapshot();
  if(isRecording)recPush({t:'block',tag:tag});
  ex('formatBlock','<'+tag+'>');
  updFmt();schedNav();schedSave();
}

function applySpacing(v){
  saveSnapshot();
  const pg=activePage();
  const s=window.getSelection();
  if(!s||!s.rangeCount)return;
  let n=s.focusNode;
  const BL=['P','DIV','LI','H1','H2','H3','H4','BLOCKQUOTE','PRE'];
  while(n&&n!==pg&&!BL.includes(n.nodeName))n=n.parentNode;
  if(n&&n!==pg)n.style.lineHeight=v;else pg.style.lineHeight=v;
  schedSave();
}

function updFmt(){
  const q=c=>{try{return document.queryCommandState(c);}catch(e){return false;}};
  document.getElementById('bb')?.classList.toggle('on',q('bold'));
  document.getElementById('bi')?.classList.toggle('on',q('italic'));
  document.getElementById('bu')?.classList.toggle('on',q('underline'));
  document.getElementById('bs')?.classList.toggle('on',q('strikeThrough'));
  document.getElementById('bar')?.classList.toggle('on',q('justifyRight'));
  document.getElementById('bac')?.classList.toggle('on',q('justifyCenter'));
  document.getElementById('bal')?.classList.toggle('on',q('justifyLeft'));
  document.getElementById('baj')?.classList.toggle('on',q('justifyFull'));
}

/* ── PASTE MATCH FORMAT ── */
function pasteMatchFormat(){
  navigator.clipboard.readText().then(txt=>{
    if(!txt)return;
    restoreSel();saveSnapshot();
    ex('insertText',txt);schedSave();notify('✓ הודבק ומוזג עיצוב');
  }).catch(()=>{
    notify('הדבק תחילה Ctrl+V, ואז השתמש בלחצן לנירמול עיצוב');
  });
}

/* ── FORMAT PAINTER ── */
function fmtPainter(){
  if(isPainting){
    // Second click = cancel
    isPainting=false;paintData=null;
    document.getElementById('fp-btn')?.classList.remove('on');
    document.body.classList.remove('cursor-paint');
    return;
  }
  if(!savedRange){notify('יש למקם סמן בטקסט תחילה');return;}
  // Must restore selection first — button click already lost it
  restoreSel();
  paintData={
    bold:    document.queryCommandState('bold'),
    italic:  document.queryCommandState('italic'),
    underline:document.queryCommandState('underline'),
    strike:  document.queryCommandState('strikeThrough'),
    color:   document.queryCommandValue('foreColor'),
    fontName:document.queryCommandValue('fontName'),
    fontSize:document.queryCommandValue('fontSize'),
  };
  isPainting=true;
  document.getElementById('fp-btn')?.classList.add('on');
  document.body.classList.add('cursor-paint');
  notify('לחץ על טקסט ליישום העיצוב — Escape לביטול');
}

/* ── PASTE ── */
function _otzHtmlToHtml(txt){
  // Decode HTML entities if text uses &lt; instead of actual <
  if(txt.includes('&lt;')||txt.includes('&amp;')){
    const ta=document.createElement('textarea');
    ta.innerHTML=txt;
    txt=ta.value;
  }
  // Remove [N] footnote/endnote markers (Otzaria format)
  txt=txt.replace(/\[\d+\]/g,'');
  // Collapse 3+ consecutive newlines to 2
  txt=txt.replace(/\n{3,}/g,'\n\n');
  // If no block-level tags, convert newlines to <br>
  if(!/<(?:p|div|h[1-6]|ul|ol|li|blockquote|table)\b/i.test(txt)){
    txt=txt.replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
    if(!txt.startsWith('<p'))txt='<p>'+txt+'</p>';
  }
  return txt;
}

function repairHTMLTags(){
  const dp=document.getElementById('dp');
  const walker=document.createTreeWalker(dp,NodeFilter.SHOW_TEXT,{acceptNode:n=>{
    const tag=n.parentNode?.tagName?.toLowerCase();
    if(tag==='script'||tag==='style')return NodeFilter.FILTER_REJECT;
    return/<[a-zA-Z][^>]*>|<\/[a-zA-Z]+>/.test(n.textContent)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
  }});
  const nodes=[];
  let node;
  while(node=walker.nextNode())nodes.push(node);
  if(nodes.length===0){notify('לא נמצאו תגיות HTML גלויות');return;}
  nodes.forEach(tn=>{
    const par=tn.parentNode;if(!par)return;
    const frag=document.createDocumentFragment();
    const tmp=document.createElement('div');
    tmp.innerHTML=_otzHtmlToHtml(tn.textContent);
    while(tmp.firstChild)frag.appendChild(tmp.firstChild);
    par.replaceChild(frag,tn);
  });
  schedSave();notify('תוקן: '+nodes.length+' מקומות');
}

async function doPaste(){
  recFlush();
  try{
    const t=await navigator.clipboard.readText();
    _skipPasteRecord=true;
    if(isRecording)recPush({t:'paste_txt',v:t});
    if(/<[a-zA-Z][^>]*>/.test(t)){
      ex('insertHTML',_otzHtmlToHtml(t));
    }else{
      ex('insertText',t);
    }
    _skipPasteRecord=false;
  }catch(e){try{ex('paste');}catch(e2){}}
}

/* ── DOC CLICK ── */
function onDocClick(e){
  if(isPainting)return; // handled in mousedown
}

/* ── INSERT ── */
let _pgNum=1,repagTimer=null;
const _A4H=1122,_PGH=56;
function insertPageBreak(){
  recFlush();saveSnapshot();if(isRecording)recPush({t:'pg'});
  const curPage=activePage();
  const dp=document.getElementById('dp');
  const sel=window.getSelection();
  const newPg=_newPage();
  // Move block-level siblings after cursor to new page
  if(sel&&sel.rangeCount>0){
    const r=sel.getRangeAt(0);
    let node=r.startContainer;
    while(node&&node.parentNode!==curPage)node=node.parentNode;
    if(node&&node.parentNode===curPage){
      const toMove=[];
      let sib=node.nextSibling;
      while(sib){
        const next=sib.nextSibling;
        if(!sib.classList?.contains('pg-num')&&!sib.classList?.contains('fn-area'))toMove.push(sib);
        sib=next;
      }
      toMove.forEach(n=>{const pn=newPg.querySelector('.pg-num');pn?newPg.insertBefore(n,pn):newPg.appendChild(n);});
    }
  }
  if(!newPg.querySelector('p,h1,h2,h3,h4,h5,h6')){
    const p=document.createElement('p');p.innerHTML='<br>';
    const pn=newPg.querySelector('.pg-num');pn?newPg.insertBefore(p,pn):newPg.appendChild(p);
  }
  curPage.after(newPg);
  newPg.focus();
  const firstEl=newPg.querySelector('p,h1,h2,h3,h4,h5,h6');
  if(firstEl){const r=document.createRange();r.setStart(firstEl,0);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
  schedRepaginate();
}
function insertBlankPage(){insertPageBreak();}
function insHR(){
  recFlush();if(isRecording)recPush({t:'sep'});
  ex('insertHTML','<hr style="border:none;border-top:2px solid #ccc;margin:16px 0"/><p><br></p>');
}
function insLink(){
  const s=window.getSelection(),txt=s?.toString()||'';
  const url=prompt('כתובת URL:','https://');
  if(!url||!url.trim())return;
  recFlush();saveSnapshot();if(isRecording)recPush({t:'link',url,txt});
  if(txt&&!s.isCollapsed){ex('createLink',url);}
  else ex('insertHTML','<a href="'+url+'" target="_blank">'+url+'</a>');
  schedSave();
}
function insBookmark(){
  const nm=prompt('שם הסימניה:');if(!nm)return;
  ex('insertHTML','<a id="bm-'+nm.replace(/\s+/g,'-')+'" style="color:var(--wb);font-size:.85em">[📌 '+nm+']</a>');
}
function insHeader(){
  const pg=activePage();
  let h=pg.querySelector('.doc-hdr');
  if(!h){h=document.createElement('div');h.className='doc-hdr';h.contentEditable='true';
    h.style.cssText='border-bottom:1px solid #ccc;padding-bottom:8px;margin-bottom:16px;font-size:.85em;color:#555;min-height:24px;';
    h.innerHTML='כותרת עליונה';pg.insertBefore(h,pg.firstChild);}
  h.focus();
}
function insFooterArea(){
  const pg=activePage();
  let f=pg.querySelector('.doc-ftr');
  if(!f){f=document.createElement('div');f.className='doc-ftr';f.contentEditable='true';
    f.style.cssText='border-top:1px solid #ccc;padding-top:8px;margin-top:40px;font-size:.85em;color:#555;min-height:24px;';
    f.innerHTML='כותרת תחתונה';
    const pn=pg.querySelector('.pg-num');
    if(pn)pg.insertBefore(f,pn);else pg.appendChild(f);}
  f.focus();
}
function insPageNum(){ex('insertHTML','<span contenteditable="false" style="color:#666;font-size:.85em;background:#f0f0f0;padding:0 3px;border-radius:2px">[עמוד]</span>');}
function insDate(){
  recFlush();if(isRecording)recPush({t:'date'});
  const d=new Date();ex('insertText',d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear());
}
function numToHebrew(n){
  if(n<=0)return String(n);
  const tbl=[[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],
             [90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ'],[10,'י'],
             [9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']];
  let r='';
  const h=Math.floor(n/100)*100,lo=n%100;
  let hrem=h;
  for(const[v,l] of tbl){if(v<100)break;while(hrem>=v){r+=l;hrem-=v;}}
  if(lo===15)r+='טו';
  else if(lo===16)r+='טז';
  else{let lr=lo;for(const[v,l] of tbl){if(v>=100)continue;while(lr>=v){r+=l;lr-=v;}}}
  if(!r)return String(n);
  return r.length===1?r+"'":r.slice(0,-1)+'"'+r.slice(-1);
}
function insHebDate(){
  recFlush();if(isRecording)recPush({t:'heb_date'});
  try{
    const fmtParts=new Intl.DateTimeFormat('he-IL-u-ca-hebrew',{day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date());
    let day=0,month='',year=0;
    for(const p of fmtParts){
      if(p.type==='day')day=parseInt(p.value);
      else if(p.type==='month')month=p.value.replace(/^ב/,''); // strip leading ב if Intl adds it
      else if(p.type==='year')year=parseInt(p.value);
    }
    const result=numToHebrew(day)+' ב'+month+' '+numToHebrew(year%1000||year);
    ex('insertText',result);
  }catch(e){ex('insertText','[תאריך עברי]');}
}
function insLoc(){
  const ref=prompt('הכנס מיקום (לדוג׳: בראשית א, א):');if(!ref)return;
  ex('insertHTML','<span style="color:var(--wb);font-weight:600;cursor:pointer;text-decoration:underline" onclick="openRef(\''+ref.replace(/'/g,"\\'")+'\')" title="פתח בקורא">'+ref+'</span>');
}
function openRef(ref){try{Otzaria.call('reader.openBook',{bookId:ref});}catch(e){notify('פתח בקורא: '+ref);}}
function insPasuk(){
  const dlg=makeDlg('הכנס פסוק');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>ספר / מסכת:</label><input id="pbook" placeholder="בראשית / ברכות"/>
    <label>פרק:</label><input id="pchap" type="number" placeholder="1" style="width:80px"/>
    <label>פסוק / דף:</label><input id="pverse" placeholder="א"/>`;
  addDlgBtn(dlg,'הכנס',()=>{
    const bk=dlg.querySelector('#pbook').value.trim();
    const ch=dlg.querySelector('#pchap').value.trim();
    const vs=dlg.querySelector('#pverse').value.trim();
    if(!bk)return;
    const ref=bk+(ch?' '+ch:'')+(vs?', '+vs:'');
    dlg.remove();
    ex('insertHTML','<span style="color:var(--wb);font-weight:600;cursor:pointer" onclick="openRef(\''+ref.replace(/'/g,"\\'")+'\')" title="פתח בקורא">'+ref+'</span> ');
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function insFootnote(){
  recFlush();saveSnapshot();if(isRecording)recPush({t:'fn'});
  fnCount++;const n=fnCount;
  // Insert superscript ref + a reset-span to escape the sup context after typing
  restoreSel();
  activePage().focus();
  try{document.execCommand('insertHTML',false,
    '<sup class="fn-ref" style="color:var(--wb);font-size:.75em;cursor:pointer" title="הערת שוליים '+n+'">['+n+']</sup><span class="fn-exit" style="font-size:12pt;vertical-align:baseline">​</span>');}catch(e){}
  // Move cursor after the reset-span (outside sup)
  const pg=activePage();
  const exits=pg.querySelectorAll('.fn-exit');
  const exitSpan=exits[exits.length-1];
  if(exitSpan){
    const r=document.createRange();
    const tn=exitSpan.firstChild;
    if(tn){r.setStart(tn,tn.length);r.collapse(true);}
    else{r.setStartAfter(exitSpan);r.collapse(true);}
    const s=window.getSelection();s.removeAllRanges();s.addRange(r);
  }
  // Place footnote text area on the current page (no extra divider — CSS border-top handles it)
  let ar=pg.querySelector('.fn-area');
  if(!ar){
    ar=document.createElement('div');ar.className='fn-area';
    const pn=pg.querySelector('.pg-num');
    if(pn)pg.insertBefore(ar,pn);else pg.appendChild(ar);
  }
  const p=document.createElement('p');p.style.cssText='font-size:.85em;color:#444;margin:2px 0';
  p.innerHTML='<span style="color:var(--wb);font-size:.85em">['+n+']</span> ';
  ar.appendChild(p);
  schedSave();
}
function insEndnote(){
  recFlush();saveSnapshot();if(isRecording)recPush({t:'en'});
  enCount++;const n=enCount;
  ex('insertHTML','<sup style="color:#c00;font-size:.75em;cursor:pointer" title="הערת סיום '+n+'">('+n+')</sup>');
  // Endnotes go on the last page
  const pages=[...document.querySelectorAll('.page')];
  const lastPg=pages[pages.length-1]||activePage();
  let ar=lastPg.querySelector('.en-area');
  if(!ar){ar=document.createElement('div');ar.className='en-area';ar.innerHTML='<p style="font-weight:700;font-size:.9em;margin-bottom:6px">הערות סיום</p>';
    const pn=lastPg.querySelector('.pg-num');if(pn)lastPg.insertBefore(ar,pn);else lastPg.appendChild(ar);}
  const p=document.createElement('p');p.style.cssText='font-size:.85em;color:#333;margin:2px 0';
  p.innerHTML='<span style="color:#c00">('+n+')</span> ';
  ar.appendChild(p);
  const r=document.createRange();r.setStart(p,p.childNodes.length);r.collapse(true);
  const s=window.getSelection();s.removeAllRanges();s.addRange(r);
  schedSave();
}
function insCitation(){
  const src=prompt('מקור הציטוט:');if(!src)return;
  recFlush();saveSnapshot();if(isRecording)recPush({t:'cite',src});
  ex('insertHTML','<span style="color:#555;font-style:italic;font-size:.9em">('+src+')</span>');
}
function insBib(){
  ex('insertHTML','<div style="margin-top:20px;border-top:1px solid #ccc;padding-top:12px"><h3 style="font-size:1em;margin-bottom:6px">מקורות</h3><p style="font-size:.85em;color:#444">הוסף מקורות כאן...</p></div>');
}
function insSpecialChar(){
  const chars='–—…«»©®™₪°±×÷√∞≈≠≤≥←→↑↓↔αβγδεπσφψω';
  const dlg=makeDlg('תו מיוחד');
  let html='<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px">';
  for(const c of chars)html+=`<button onclick="ex('insertText','${c}');this.closest('.dlg-back').remove()" style="width:32px;height:32px;border:1px solid #d1d1d1;background:#fff;cursor:pointer;border-radius:2px;font-size:1.1em">${c}</button>`;
  html+='</div>';
  dlg.querySelector('.dlg-bd').innerHTML=html;
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}
function insImageBtn(){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='image/*';inp.style.display='none';
  document.body.appendChild(inp);
  inp.onchange=e=>{
    document.body.removeChild(inp);
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=`<img src="${ev.target.result}" style="max-width:100%;height:auto;display:block;margin:6px 0;cursor:pointer" class="doc-img" onclick="_selImg(this)"/>`;
      ex('insertHTML',img+'<p><br></p>');
      schedSave();
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}
// Simple image click-to-select with resize handles
function _selImg(img){
  document.querySelectorAll('.doc-img.selected').forEach(i=>{i.classList.remove('selected');i.style.outline='';});
  img.classList.add('selected');
  img.style.outline='2px solid var(--wb)';
  img.style.cursor='nwse-resize';
  // Allow resizing via drag on selected image
  img.onmousedown=function(e){
    if(!img.classList.contains('selected'))return;
    const startX=e.clientX,startW=img.offsetWidth;
    const onMove=ev=>{img.style.width=(startW+ev.clientX-startX)+'px';img.style.height='auto';};
    const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);schedSave();};
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
  };
}
// Deselect image on click elsewhere
document.addEventListener('click',e=>{
  if(!e.target.classList?.contains('doc-img')){
    document.querySelectorAll('.doc-img.selected').forEach(i=>{i.classList.remove('selected');i.style.outline='';i.style.cursor='pointer';i.onmousedown=null;});
  }
},true);
function insChidush(){
  recFlush();if(isRecording)recPush({t:'block',tag:'h2'});
  ex('formatBlock','<h2>');schedSave();
}
function insChidushBox(){
  ex('insertHTML','<div style="border:2px solid var(--wb);border-radius:4px;padding:10px 14px;margin:12px 0;background:var(--wb-lt)"><p style="font-weight:700;color:var(--wb);margin-bottom:6px">✦ חידוש</p><p>כתוב כאן...</p></div><p><br></p>');
  schedSave();
}

/* ── TABLE ── */
function openTableDlg(){
  const dlg=makeDlg('הוסף טבלה');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <p style="font-size:.8em;color:#555;margin-bottom:6px">גרור לבחירת גודל:</p>
    <div class="tbl-grid" id="tg"></div>
    <p id="tg-lbl" style="font-size:.78em;color:var(--wb);margin-top:5px;min-height:1.2em"></p>
    <div style="display:flex;gap:10px;margin-top:8px">
      <label style="font-size:.8em">שורות: <input type="number" id="tr" value="3" min="1" max="20" style="width:50px;border:1px solid #ccc;padding:2px 4px;border-radius:2px;font-family:inherit"></label>
      <label style="font-size:.8em">עמודות: <input type="number" id="tc" value="3" min="1" max="10" style="width:50px;border:1px solid #ccc;padding:2px 4px;border-radius:2px;font-family:inherit"></label>
    </div>`;
  const tg=dlg.querySelector('#tg');
  for(let r=1;r<=8;r++)for(let c=1;c<=10;c++){
    const cl=document.createElement('div');cl.className='tbl-cell';cl.dataset.r=r;cl.dataset.c=c;
    cl.addEventListener('mouseover',()=>{
      const rr=+cl.dataset.r,cc=+cl.dataset.c;
      tg.querySelectorAll('.tbl-cell').forEach(x=>x.classList.toggle('hi',+x.dataset.r<=rr&&+x.dataset.c<=cc));
      dlg.querySelector('#tg-lbl').textContent=rr+' שורות × '+cc+' עמודות';
      dlg.querySelector('#tr').value=rr;dlg.querySelector('#tc').value=cc;
    });
    cl.addEventListener('click',()=>{doInsTable(+cl.dataset.r,+cl.dataset.c);dlg.remove();});
    tg.appendChild(cl);
  }
  addDlgBtn(dlg,'הוסף',()=>{
    const r=parseInt(dlg.querySelector('#tr').value)||3,c=parseInt(dlg.querySelector('#tc').value)||3;
    doInsTable(r,c);dlg.remove();
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function doInsTable(rows,cols){
  recFlush();saveSnapshot();if(isRecording)recPush({t:'table',rows,cols});
  restoreSel();
  let h='<table style="border-collapse:collapse;width:100%;margin:10px 0"><tbody>';
  for(let r=0;r<rows;r++){h+='<tr>';
    for(let c=0;c<cols;c++){
      const tag=r===0?'th':'td';
      h+=`<${tag} style="border:1px solid #b0b0b0;padding:5px 8px;min-width:50px;${r===0?'background:#f3f3f3;font-weight:700;':''}">&nbsp;</${tag}>`;
    }h+='</tr>';}
  h+='</tbody></table><p><br></p>';
  ex('insertHTML',h);schedSave();
}

/* ── TOC ── */
function genTOC(){
  const dp=document.getElementById('dp');
  const hs=dp.querySelectorAll('h1,h2,h3');
  if(!hs.length){notify('אין כותרות במסמך');return;}
  hs.forEach((h,i)=>{if(!h.id)h.id='_h'+i;});
  let html='<div style="border:1px solid #d1d1d1;padding:12px 16px;margin:12px 0;background:#fafafa" class="toc-block"><p style="font-weight:700;margin-bottom:8px;color:var(--wb)">תוכן עניינים</p>';
  hs.forEach(h=>{
    const lv=parseInt(h.tagName[1]);
    html+=`<p style="margin:2px 0;padding-right:${(lv-1)*16}px;font-size:.88em"><a href="#${h.id}" style="color:#333;text-decoration:none" onclick="document.getElementById('${h.id}')?.scrollIntoView({behavior:'smooth'});return false;">${h.textContent.trim()}</a></p>`;
  });
  html+='</div><p><br></p>';
  restoreSel();ex('insertHTML',html);schedSave();
}
function updTOC(){
  const dp=document.getElementById('dp');
  dp.querySelectorAll('.toc-block').forEach(el=>el.remove());
  genTOC();
}

/* ── LAYOUT ── */
function setMargins(t){
  _curMargins=t||'normal';
  const m={normal:'96px 90px',narrow:'48px 36px',wide:'96px 144px'};
  document.querySelectorAll('.page').forEach(pg=>pg.style.padding=m[t]||m.normal);
}
function setPageDir(d){
  const w=d==='landscape'?'1122px':'794px';
  const h=d==='landscape'?'794px':'1122px';
  document.querySelectorAll('.page').forEach(pg=>{pg.style.width=w;pg.style.height=h;});
  document.getElementById('ruler').style.width=w;
}
function setPageSize(s){
  const sz={A4:{w:'794px',h:'1122px'},letter:{w:'816px',h:'1056px'},legal:{w:'816px',h:'1344px'}};
  const p=sz[s]||sz.A4;
  document.querySelectorAll('.page').forEach(pg=>{pg.style.width=p.w;pg.style.height=p.h;});
}
function setCols(n){
  recFlush();if(isRecording)recPush({t:'cols',n});
  document.querySelectorAll('.page').forEach(pg=>{
    pg.style.columns=n>1?String(n):'';pg.style.columnGap=n>1?'2em':'';
  });
}

/* ── NAV PANE ── */
function togNav(){
  const p=document.getElementById('nav-pane');p.classList.toggle('hide');
  const on=!p.classList.contains('hide');
  document.getElementById('nav-btn').textContent=(on?'✓ ':'')+'חלונית ניווט';
  document.getElementById('tb-nav-btn')?.classList.toggle('on',on);
}
function _updFsBtn(isFs){
  const btn=document.getElementById('tb-fs-btn');if(!btn)return;
  btn.style.color=isFs?'var(--wb)':'#777';
  btn.title=isFs?'יציאה ממסך מלא (F11)':'מסך מלא (F11)';
  const path=btn.querySelector('svg path');
  if(path)path.setAttribute('d',isFs
    ?'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z'
    :'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
}
function toggleFullscreen(){
  const app=document.getElementById('app');
  if(app.classList.contains('fake-fs')){
    app.classList.remove('fake-fs');_updFsBtn(false);return;
  }
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen().catch(()=>{
      app.classList.add('fake-fs');_updFsBtn(true);
    });
  }else{
    document.exitFullscreen().catch(()=>{});
  }
}
document.addEventListener('fullscreenchange',()=>{
  const isFs=!!document.fullscreenElement;
  _updFsBtn(isFs);
  if(!isFs)document.getElementById('app')?.classList.remove('fake-fs');
});
async function importFromReader(){
  notify('מחפש טאבים פתוחים...');
  let res;
  try{res=await Otzaria.call('reader.getCurrentState');}catch(e){notify('שגיאה: '+e.message);return;}
  const tabs=(res?.data?.openTabs)||[];
  if(!tabs.length){notify('אין טאבים פתוחים בקורא');return;}
  const dlg=makeDlg('ייבוא מהקורא');
  dlg.querySelector('.dlg-bd').innerHTML=
    '<p style="font-size:.8em;color:#555;margin-bottom:8px">בחר ספר לייבוא לעורך:</p>'+
    tabs.map((t,i)=>`<div class="list-item" style="cursor:pointer;padding:7px 10px;border-radius:3px;margin-bottom:3px" data-i="${i}"><b>${t.book||t.title||'ספר '+i}</b>${t.title&&t.title!==t.book?'<br><span style="font-size:.8em;color:#777">'+t.title+'</span>':''}</div>`).join('');
  dlg.querySelectorAll('.list-item').forEach(el=>{
    el.onmouseover=()=>el.style.background='var(--bh)';
    el.onmouseout=()=>el.style.background='';
    el.onclick=async()=>{
      const t=tabs[+el.dataset.i];
      dlg.remove();
      await _openReaderBook(t);
    };
  });
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
async function _openReaderBook(tab){
  notify('פותח '+(tab.book||tab.title||'ספר')+'...');
  try{await Otzaria.call('reader.openBook',{bookId:tab.bookId,index:tab.index||0});}catch(e){}
  notify('לא ניתן לייבא תוכן — נפתח בקורא');
}
function swNavTab(t,el){
  navMode=t;
  document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');updNav();
}
function schedNav(){clearTimeout(navTimer);navTimer=setTimeout(updNav,500);}
function updNav(){
  if(navMode==='h')updNavH();
  else if(navMode==='p')updNavPages();
  else updNavR();
}
function updNavPages(){
  const nb=document.getElementById('nav-body');
  const pages=[...document.querySelectorAll('.page')];
  const total=Math.max(1,pages.length);
  let html='';
  for(let i=1;i<=total;i++){
    html+=`<div class="nav-item nav-pg-item" onclick="scrollToPage(${i})" id="npg-${i}">
      <span style="display:inline-block;width:28px;height:36px;background:#fff;border:1px solid #d1d1d1;box-shadow:0 1px 3px rgba(0,0,0,.15);margin-left:6px;border-radius:1px;font-size:.6em;line-height:36px;text-align:center;color:#888;flex-shrink:0">${i}</span>
      עמוד ${i}
    </div>`;
  }
  nb.innerHTML=html||'<div class="nav-empty">מסמך ריק</div>';
  const cur=_getCurrentPage();
  document.querySelectorAll('.nav-pg-item').forEach((el,i)=>el.classList.toggle('cur',i+1===cur));
}
function updNavH(){
  const dp=document.getElementById('dp');
  const hs=dp.querySelectorAll('h1,h2,h3');
  const nb=document.getElementById('nav-body');
  if(!hs.length){nb.innerHTML='<div class="nav-empty">אין כותרות</div>';return;}
  // Assign IDs so scrollToH works
  hs.forEach((h,i)=>{if(!h.id)h.id='_h'+i;});
  nb.innerHTML=Array.from(hs).map(h=>{
    const cls=h.tagName.toLowerCase();
    const txt=(h.textContent||'').trim()||'(ללא כותרת)';
    return `<div class="nav-item ${cls}" onclick="scrollToH('${h.id}')">${txt}</div>`;
  }).join('');
}
function scrollToH(id){
  const el=document.getElementById(id);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('cur'));
    document.querySelector(`.nav-item[onclick="scrollToH('${id}')"]`)?.classList.add('cur');}
}
function scrollToPage(n){
  const pages=[...document.querySelectorAll('.page')];
  const target=pages[n-1];
  if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.nav-pg-item').forEach((el,i)=>el.classList.toggle('cur',i+1===n));
}
function _getCurrentPage(){
  const dw=document.getElementById('dw');
  const pages=[...document.querySelectorAll('.page')];
  if(!pages.length)return 1;
  const dwRect=dw.getBoundingClientRect();
  for(let i=pages.length-1;i>=0;i--){
    const r=pages[i].getBoundingClientRect();
    if(r.top<=dwRect.top+dw.clientHeight*0.5)return i+1;
  }
  return 1;
}
function navSearch(q){
  if(!q.trim()){navMode='h';document.querySelectorAll('.nav-tab').forEach((b,i)=>b.classList.toggle('on',i===0));updNavH();return;}
  navMode='r';document.querySelectorAll('.nav-tab').forEach((b,i)=>b.classList.toggle('on',i===2));
  updNavR(q);
}
function updNavR(q){
  const nb=document.getElementById('nav-body');
  if(!q){nb.innerHTML='<div class="nav-empty">הכנס מונח</div>';return;}
  const lines=_getDocText().split('\n').filter(l=>l.toLowerCase().includes(q.toLowerCase()));
  if(!lines.length){nb.innerHTML='<div class="nav-empty">אין תוצאות</div>';return;}
  nb.innerHTML=lines.slice(0,25).map(l=>`<div class="nav-item" onclick="findInDoc('${l.trim().slice(0,30).replace(/'/g,"\\'")}')">${l.trim().slice(0,70)}</div>`).join('');
}
function findInDoc(txt){openFB();document.getElementById('fi').value=txt;hlFind(txt);}

/* ── FIND & REPLACE ── */
function openFB(){document.getElementById('fb').style.display='flex';document.getElementById('fi').focus();}
function closeFB(){document.getElementById('fb').style.display='none';clearHL();document.getElementById('fc').textContent='';}
function togReplace(){const r=document.getElementById('rr');r.style.display=r.style.display==='flex'?'none':'flex';}
function openReplace(){openFB();document.getElementById('rr').style.display='flex';}
function fbKey(e){if(e.key==='Escape')closeFB();else if(e.key==='Enter'){e.shiftKey?findPrev():findNext();}}

function clearHL(){
  document.querySelectorAll('mark.fhl').forEach(m=>{
    const p=m.parentNode;if(!p)return;
    while(m.firstChild)p.insertBefore(m.firstChild,m);
    p.removeChild(m);try{p.normalize();}catch(e){}
  });
  fhlList=[];fhlIdx=0;
}
function hlFind(q){
  clearHL();if(!q)return;
  const dp=document.getElementById('dp');
  const w=document.createTreeWalker(dp,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentNode.nodeName==='MARK'?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];let n;while((n=w.nextNode()))nodes.push(n);
  const lq=q.toLowerCase();
  nodes.forEach(tn=>{
    const txt=tn.textContent,lt=txt.toLowerCase();
    let idx=0,last=0,found=false;
    const fr=document.createDocumentFragment();
    while((idx=lt.indexOf(lq,last))!==-1){
      fr.appendChild(document.createTextNode(txt.slice(last,idx)));
      const mk=document.createElement('mark');mk.className='fhl';mk.textContent=txt.slice(idx,idx+q.length);
      fr.appendChild(mk);fhlList.push(mk);last=idx+q.length;found=true;
    }
    if(found){fr.appendChild(document.createTextNode(txt.slice(last)));tn.parentNode.replaceChild(fr,tn);}
  });
  document.getElementById('fc').textContent=fhlList.length?fhlList.length+' תוצאות':'לא נמצא';
  if(fhlList.length)scrollFHL(0);
}
function scrollFHL(i){
  document.querySelectorAll('mark.fhl.cur').forEach(m=>m.classList.remove('cur'));
  const m=fhlList[i];if(!m)return;
  m.classList.add('cur');m.scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('fc').textContent=(i+1)+' / '+fhlList.length;
}
function findNext(){if(!fhlList.length)return;fhlIdx=(fhlIdx+1)%fhlList.length;scrollFHL(fhlIdx);}
function findPrev(){if(!fhlList.length)return;fhlIdx=(fhlIdx-1+fhlList.length)%fhlList.length;scrollFHL(fhlIdx);}
function doRep(){
  if(!fhlList.length)return;
  const f=document.getElementById('fi').value,r=document.getElementById('ri').value;
  saveSnapshot();
  if(isRecording){recFlush();recPush({t:'rep',f,r});}
  const m=fhlList[fhlIdx];
  if(m&&m.parentNode){m.parentNode.replaceChild(document.createTextNode(r),m);fhlList.splice(fhlIdx,1);}
  if(fhlIdx>=fhlList.length)fhlIdx=Math.max(0,fhlList.length-1);
  document.getElementById('fc').textContent=fhlList.length+' תוצאות';
  if(fhlList.length)scrollFHL(fhlIdx);
}
function doRepAll(){
  const f=document.getElementById('fi').value,r=document.getElementById('ri').value;
  if(!f)return;
  saveSnapshot();
  if(isRecording){recFlush();recPush({t:'rep',f,r});}
  const cnt=fhlList.length;
  fhlList.forEach(m=>{if(m.parentNode)m.parentNode.replaceChild(document.createTextNode(r),m);});
  fhlList=[];document.getElementById('fc').textContent='';
  notify('הוחלפו '+cnt+' מופעים');closeFB();schedSave();
}

/* ── VIEW ── */
function setZoom(v){
  zoom=Math.min(200,Math.max(50,v));
  document.getElementById('dp').style.zoom=zoom+'%';
  document.getElementById('dp').style.transformOrigin='top center';
  document.getElementById('ruler').style.zoom=zoom+'%';
  document.getElementById('zpct').textContent=zoom+'%';
  document.getElementById('zsl').value=zoom;
}
function chZoom(d){setZoom(zoom+d);}
function promptZoom(){const v=parseInt(prompt('הכנס אחוז זום:',zoom));if(!isNaN(v))setZoom(v);}

function togFocus(){
  document.body.classList.toggle('focus-mode');
  document.getElementById('sv-fc').classList.toggle('on',document.body.classList.contains('focus-mode'));
}
function togRead(){
  isReadMode=!isReadMode;
  document.querySelectorAll('.page').forEach(pg=>{
    pg.contentEditable=isReadMode?'false':'true';
    pg.style.cursor=isReadMode?'default':'text';
  });
  document.getElementById('sv-rd').classList.toggle('on',isReadMode);
  document.getElementById('vread-btn').textContent=isReadMode?'✓ מצב קריאה':'מצב קריאה';
  notify(isReadMode?'מצב קריאה':'מצב עריכה');
}
function svClick(v,el){
  if(v==='rd'){togRead();return;}
  document.querySelectorAll('.sv').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
}
function togRuler(){
  const r=document.getElementById('ruler');
  const vis=r.style.display==='block';
  r.style.display=vis?'none':'block';
  document.getElementById('ruler-btn').textContent=(vis?'':'✓ ')+'סרגל';
}

/* ── WORD COUNT ── */
function schedCount(){clearTimeout(countTimer);countTimer=setTimeout(updCount,400);}
function updCount(){
  const txt=_getDocText();
  const w=txt.trim()?txt.trim().split(/\s+/).filter(x=>x.length).length:0;
  const c=txt.replace(/\s/g,'').length;
  document.getElementById('sbw').textContent=w.toLocaleString()+' מילים';
  document.getElementById('sbch').textContent=c.toLocaleString()+' תווים';
  updPageNum();
}
function updPageNum(){
  const dw=document.getElementById('dw');
  const pages=[...document.querySelectorAll('.page')];
  const total=Math.max(1,pages.length);
  // Find which page center is visible
  const dwRect=dw.getBoundingClientRect();
  let cur=1;
  pages.forEach((pg,i)=>{
    const r=pg.getBoundingClientRect();
    if(r.top<dwRect.top+dw.clientHeight*0.5)cur=i+1;
  });
  document.getElementById('sbpg').textContent='עמוד '+cur+' / '+total;
  // Update pages nav highlight if visible
  if(navMode==='p'){
    document.querySelectorAll('.nav-pg-item').forEach((el,i)=>el.classList.toggle('cur',i+1===cur));
  }
}
function schedRepaginate(fast){clearTimeout(repagTimer);repagTimer=setTimeout(doRepaginate,fast?150:800);}
let _repagRunning=false;
async function doRepaginate(){
  if(_repagRunning)return;
  _repagRunning=true;
  const dp=document.getElementById('dp');
  if(!dp){_repagRunning=false;return;}
  const sel=window.getSelection();
  const anchorNode=sel?.anchorNode;
  const anchorOff=sel?.anchorOffset??0;

  let changed=true,passes=0;
  while(changed&&passes<30){
    changed=false;passes++;
    // Yield to browser every 2 passes — prevents UI freeze on large docs
    if(passes%2===0)await new Promise(r=>setTimeout(r,0));

    const pages=[...dp.querySelectorAll('.page')];
    // Forward pass: push overflow to next page
    for(let i=0;i<pages.length;i++){
      const pg=pages[i];
      while(pg.scrollHeight>pg.clientHeight){
        const movable=[...pg.children].filter(c=>!c.classList.contains('pg-num')&&!c.classList.contains('fn-area')&&!c.classList.contains('en-area'));
        if(movable.length<=1)break;
        const last=movable[movable.length-1];
        let next=pages[i+1];
        if(!next){next=_newPage();dp.appendChild(next);pages.push(next);}
        next.insertBefore(last,next.firstChild);
        changed=true;
      }
    }
    // Backward pass: pull content up only if it fits with margin (prevents oscillation)
    const pages2=[...dp.querySelectorAll('.page')];
    for(let i=0;i<pages2.length-1;i++){
      const pg=pages2[i],next=pages2[i+1];
      if(!next)continue;
      const movable=[...next.children].filter(c=>!c.classList.contains('pg-num')&&!c.classList.contains('fn-area')&&!c.classList.contains('en-area'));
      if(!movable.length)continue;
      const first=movable[0];
      pg.appendChild(first);
      if(pg.scrollHeight>pg.clientHeight-4){next.insertBefore(first,next.firstChild);}
      else{changed=true;}
    }
  }

  // Remove empty trailing pages
  const all=[...dp.querySelectorAll('.page')];
  while(all.length>1){
    const last=all[all.length-1];
    const hasContent=last.querySelector('p,h1,h2,h3,h4,h5,h6,ul,ol,table,img,blockquote,pre');
    if(!hasContent&&!(last.innerText||'').trim()){last.remove();all.pop();}else break;
  }

  // Page number labels
  dp.querySelectorAll('.page').forEach((pg,i)=>{
    let pn=pg.querySelector('.pg-num');
    if(!pn){pn=document.createElement('div');pn.className='pg-num';pn.contentEditable='false';pg.appendChild(pn);}
    pn.textContent=i+1;_pgNum=i+1;
  });

  // Restore cursor
  if(anchorNode&&dp.contains(anchorNode)){
    try{
      const r=document.createRange();
      const mx=anchorNode.nodeType===3?anchorNode.length:anchorNode.childNodes.length;
      r.setStart(anchorNode,Math.min(anchorOff,mx));r.collapse(true);
      sel.removeAllRanges();sel.addRange(r);
    }catch(e){}
  }
  updPageNum();
  if(navMode==='p')updNavPages();
  _repagRunning=false;
}
function openWordCountDlg(){
  const txt=_getDocText();
  const w=txt.trim()?txt.trim().split(/\s+/).filter(x=>x.length).length:0;
  const dlg=makeDlg('ספירת מילים');
  dlg.querySelector('.dlg-bd').innerHTML=`<table style="width:100%;font-size:.85em;border-collapse:collapse">
    <tr><td style="padding:5px 0;color:#555">מילים</td><td style="font-weight:600">${w.toLocaleString()}</td></tr>
    <tr><td style="padding:5px 0;color:#555">תווים (עם רווחים)</td><td style="font-weight:600">${txt.length.toLocaleString()}</td></tr>
    <tr><td style="padding:5px 0;color:#555">תווים (ללא רווחים)</td><td style="font-weight:600">${txt.replace(/\s/g,'').length.toLocaleString()}</td></tr>
    <tr><td style="padding:5px 0;color:#555">פסקאות</td><td style="font-weight:600">${document.querySelectorAll('.page p,.page h1,.page h2,.page h3').length}</td></tr>
  </table>`;
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}

/* ── SAVE / LOAD ── */
function schedSave(){document.getElementById('sbs').textContent='● לא שמור';clearTimeout(autoSave);autoSave=setTimeout(saveDoc,2500);}
async function saveDoc(){
  _saveCurrentDocState();
  await stSet('wdocs',docs.map(d=>({title:d.title,content:d.content,fn:d.fn,en:d.en})));
  await stSet('wdocIdx',docIdx);
  await stSet('wmacros',macros);
  await stSet('warchive',archive);
  await stSet('wcomments',{list:comments,count:cmCount});
  await stSet('wstickies',{list:stickies,ctr:_stickyIdCtr});
  await stSet('wclips',{list:clips,ctr:_clipIdCtr});
  document.getElementById('sbs').textContent='✓ שמור';
}
async function loadAll(){
  const saved=await stGet('wdocs');
  const savedIdx=await stGet('wdocIdx')||0;
  if(saved&&Array.isArray(saved)&&saved.length){
    docs=saved.map((d,i)=>({id:i,title:d.title||'מסמך חדש',content:d.content||'<p><br></p>',scroll:0,fn:d.fn||0,en:d.en||0}));
    _docIdCtr=docs.length;
    docIdx=Math.min(savedIdx,docs.length-1);
  }else{
    const d=await stGet('wdoc');
    if(d?.content){docs=[{id:0,title:d.title||'מסמך חדש',content:d.content,scroll:0,fn:0,en:0}];}
  }
  _loadDocState(docIdx);
  const m=await stGet('wmacros');if(Array.isArray(m))macros=m;
  const a=await stGet('warchive');if(Array.isArray(a))archive=a;
  const cm=await stGet('wcomments');
  if(cm&&Array.isArray(cm.list)){comments=cm.list;cmCount=cm.count||cm.list.length;updCommentPanel();}
  const sk=await stGet('wstickies');
  if(sk?.list){stickies=sk.list;_stickyIdCtr=sk.ctr||sk.list.length+1;renderStickies();}
  const cl=await stGet('wclips');
  if(cl?.list){clips=cl.list;_clipIdCtr=cl.ctr||cl.list.length+1;}
  await loadUserDefaults();
  _applyDefaultsToPage(document.querySelector('.page'));
}
async function stSet(k,v){
  try{await Otzaria.call('storage.set',{key:k,value:v});return;}catch(e){}
  try{localStorage.setItem('_otzw_'+k,JSON.stringify(v));}catch(e){}
}
async function stGet(k){
  try{const r=await Otzaria.call('storage.get',{key:k});if(r?.success&&r?.data!==undefined)return r.data;}catch(e){}
  try{const v=localStorage.getItem('_otzw_'+k);return v?JSON.parse(v):null;}catch(e){return null;}
}

/* ── USER DEFAULTS ── */
async function loadUserDefaults(){
  const d=await stGet('wdefaults');
  if(d)_userDefaults=Object.assign(_userDefaults,d);
}
function _applyDefaultsToPage(pg){
  if(!pg)return;
  if(_userDefaults.font){
    pg.style.fontFamily=_userDefaults.font;
    const fname=_userDefaults.font.replace(/^['"]([^'"]*)['"]\s*,.*$/,'$1').replace(/,.*$/,'').trim();
    const sf=document.getElementById('sf');
    if(sf)sf.value=fname;
  }
  if(_userDefaults.size){
    pg.style.fontSize=_userDefaults.size+'pt';
    const ss=document.getElementById('ss');
    if(ss)ss.value=_userDefaults.size;
  }
  if(_userDefaults.lineHeight)pg.style.lineHeight=_userDefaults.lineHeight;
  if(_userDefaults.margins)setMargins(_userDefaults.margins);
}
async function saveAsDefault(){
  const pg=activePage();
  const sf=document.getElementById('sf');
  const ss=document.getElementById('ss');
  const fontLabel=sf?.value?.trim()||'';
  const font=fontLabel?`'${fontLabel}',sans-serif`:'';
  const size=ss?.value||'';
  const lineHeight=pg?.style?.lineHeight||'';
  _userDefaults={font,size,lineHeight,margins:_curMargins};
  await stSet('wdefaults',_userDefaults);
  const t=document.createElement('div');
  t.textContent='✓ ברירת מחדל נשמרה';
  t.style.cssText='position:fixed;bottom:24px;right:24px;background:#2b579a;color:#fff;padding:8px 18px;border-radius:6px;font-size:.85em;z-index:99999;pointer-events:none;opacity:1;transition:opacity .5s';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),500);},2500);
}

/* ── EXPORT / PRINT ── */
/* ══ DOCX (real Open XML .docx) ══ */
function exportDocx(){
  const title=document.getElementById('doc-title').value||'מסמך';
  const body=_htmlToOoxml(_getDocHTML());
  const NW='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NR='http://schemas.openxmlformats.org/package/2006/relationships';
  const NC='http://schemas.openxmlformats.org/package/2006/content-types';
  const NO='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const CT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NC}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`;
  const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NR}"><Relationship Id="rId1" Type="${NO}/officeDocument" Target="word/document.xml"/></Relationships>`;
  const WRELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NR}"><Relationship Id="rId1" Type="${NO}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${NO}/settings" Target="settings.xml"/></Relationships>`;
  const WSETTINGS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${NW}"><w:defaultTabStop w:val="720"/><w:themeFontLang w:val="he-IL" w:bidi="he-IL"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${NW}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="David"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1F3763"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:rtl/></w:rPr></w:style></w:styles>`;
  const DOC=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="${NW}" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/><w:bidi/><w:rtlGutter/><w:docGrid w:type="lines" w:linePitch="360"/></w:sectPr></w:body></w:document>`;
  const zip=_makeZip([
    {name:'[Content_Types].xml',text:CT},
    {name:'_rels/.rels',text:RELS},
    {name:'word/document.xml',text:DOC},
    {name:'word/_rels/document.xml.rels',text:WRELS},
    {name:'word/styles.xml',text:STYLES},
    {name:'word/settings.xml',text:WSETTINGS},
  ]);
  const blob=new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=title+'.docx';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  notify('✓ '+title+'.docx נשמר');
}

/* ZIP builder (no compression) */
function _makeZip(files){
  const enc=new TextEncoder();
  const ct=new Uint32Array(256);
  for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);ct[i]=c;}
  const crc32=d=>{let c=0xFFFFFFFF;for(let i=0;i<d.length;i++)c=ct[(c^d[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
  const u16=n=>[n&0xFF,(n>>8)&0xFF];
  const u32=n=>[n&0xFF,(n>>8)&0xFF,(n>>16)&0xFF,(n>>24)&0xFF];
  const cat=(...a)=>{const t=a.reduce((s,x)=>s+x.length,0);const o=new Uint8Array(t);let p=0;for(const x of a){o.set(x,p);p+=x.length;}return o;};
  const parts=[];const cds=[];let off=0;
  for(const {name,text} of files){
    const nb=enc.encode(name),db=enc.encode(text);
    const crc=crc32(db);
    const lh=new Uint8Array([0x50,0x4B,0x03,0x04,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),0,0]);
    const cd=new Uint8Array([0x50,0x4B,0x01,0x02,20,0,20,0,0,0,0,0,0,0,0,0,...u32(crc),...u32(db.length),...u32(db.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off)]);
    const entry=cat(lh,nb,db);
    parts.push(entry);cds.push(cat(cd,nb));off+=entry.length;
  }
  const cdBuf=cat(...cds);
  const eocd=new Uint8Array([0x50,0x4B,0x05,0x06,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdBuf.length),...u32(off),0,0]);
  return cat(...parts,cdBuf,eocd);
}

/* HTML → OOXML paragraphs */
function _htmlToOoxml(html){
  const tmp=document.createElement('div');
  tmp.innerHTML=html.replace(/\n?<!-- PAGE_BREAK -->\n?/g,'');
  tmp.querySelectorAll('.pg-num,.fn-area,.en-area').forEach(e=>e.remove());
  tmp.querySelectorAll('.fn-exit').forEach(e=>e.remove());
  tmp.querySelectorAll('mark.spell-err').forEach(m=>{while(m.firstChild)m.parentNode.insertBefore(m.firstChild,m);m.remove();});
  tmp.querySelectorAll('mark.fhl').forEach(m=>{const p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);});
  const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // inline runs with optional rpr
  function runs(node,extra=''){
    if(!node)return'';
    if(node.nodeType===3){
      const t=node.textContent;if(!t)return'';
      const fontHint='<w:rFonts w:cs="David" w:hint="cs"/>';
      const rpr=`<w:rPr>${fontHint}${extra||''}<w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>`;
      return`<w:r>${rpr}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
    }
    if(node.nodeType!==1)return'';
    const tag=node.tagName.toLowerCase();
    const kids=Array.from(node.childNodes);
    let add=extra;
    if(['b','strong'].includes(tag))add+='<w:b/><w:bCs/>';
    if(['i','em'].includes(tag))add+='<w:i/><w:iCs/>';
    if(tag==='u')add+='<w:u w:val="single"/>';
    if(['s','del','strike'].includes(tag))add+='<w:strike/>';
    if(tag==='sup')add+='<w:vertAlign w:val="superscript"/>';
    if(tag==='sub')add+='<w:vertAlign w:val="subscript"/>';
    const st=node.style||{};
    if(st.fontWeight==='bold'||+st.fontWeight>=700)add+='<w:b/><w:bCs/>';
    if(st.fontStyle==='italic')add+='<w:i/><w:iCs/>';
    const fsPt=parseFloat(st.fontSize);
    if(fsPt){const hw=Math.round(fsPt*2);add+=`<w:sz w:val="${hw}"/><w:szCs w:val="${hw}"/>`;}
    const hex=_col2hex(st.color);
    if(hex)add+=`<w:color w:val="${hex}"/>`;
    return kids.map(c=>runs(c,add)).join('');
  }
  // block-level element → w:p or w:tbl
  function para(node){
    if(node.nodeType===3){
      const t=node.textContent.trim();if(!t)return'';
      return`<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r></w:p>`;
    }
    if(node.nodeType!==1)return'';
    const tag=node.tagName.toLowerCase();
    const kids=Array.from(node.childNodes);
    const jc={right:'right',left:'left',center:'center',justify:'both'}[(node.style?.textAlign||'right').toLowerCase()]||'right';
    const pBase=`<w:pPr><w:bidi/><w:jc w:val="${jc}"/></w:pPr>`;
    // table
    if(tag==='table'){
      let t=`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr>`;
      node.querySelectorAll('tr').forEach(tr=>{
        t+='<w:tr>';
        tr.querySelectorAll('td,th').forEach(td=>{
          const hd=td.tagName.toLowerCase()==='th';
          const cp=hd?'<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/></w:tcPr>':'';
          const inner=Array.from(td.childNodes).map(para).join('')||`<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
          t+=`<w:tc>${cp}${inner}</w:tc>`;
        });
        t+='</w:tr>';
      });
      return t+'</w:tbl>';
    }
    if(tag==='hr')return`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr><w:bidi/></w:pPr></w:p>`;
    if(tag==='br')return`<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
    // list
    if(['ul','ol'].includes(tag)){
      return Array.from(node.querySelectorAll('li')).map((li,i)=>
        `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:ind w:right="360"/></w:pPr><w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve">${tag==='ol'?(i+1)+'. ':'• '}</w:t></w:r>${runs(li)}</w:p>`
      ).join('');
    }
    // block with block children → recurse
    const BL=['p','div','h1','h2','h3','h4','ul','ol','table','hr','blockquote','pre','br'];
    const hasBlock=kids.some(k=>k.nodeType===1&&BL.includes(k.tagName?.toLowerCase()));
    if(['div','blockquote','section','article'].includes(tag)&&hasBlock)return kids.map(para).join('');
    // headings
    const hs={h1:'Heading1',h2:'Heading2',h3:'Heading3'};
    const hStyle=hs[tag];
    if(hStyle)return`<w:p><w:pPr><w:pStyle w:val="${hStyle}"/><w:bidi/><w:jc w:val="${jc}"/></w:pPr>${runs(node)}</w:p>`;
    // normal paragraph
    if(['p','h4','h5','h6','pre','li'].includes(tag)||!hasBlock)
      return`<w:p>${pBase}${runs(node)}</w:p>`;
    return kids.map(para).join('');
  }
  const result=Array.from(tmp.childNodes).map(para).join('');
  return result||`<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
}
function _col2hex(c){
  if(!c||c==='inherit'||c==='initial')return null;
  if(/^#[0-9a-f]{6}$/i.test(c))return c.slice(1).toUpperCase();
  if(/^#[0-9a-f]{3}$/i.test(c))return c.slice(1).split('').map(x=>x+x).join('').toUpperCase();
  const el=document.createElement('div');el.style.color=c;document.body.appendChild(el);
  const cs=window.getComputedStyle(el).color;document.body.removeChild(el);
  const m=cs.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if(!m)return null;
  return[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function printDoc(){
  try{window.print();}catch(e){notify('שגיאה בהדפסה');}
}

/* ══ MACRO RECORDING ══ */
function recPush(action){
  recActions.push(action);
  const el=document.getElementById('rec-count');
  if(el)el.textContent='('+recActions.length+')';
}
function recFlush(){
  if(!isRecording||!recBuf)return;
  recPush({t:'text',v:recBuf});recBuf='';
}
function toggleRecording(){
  if(isRecording){stopRecording();}
  else{
    const name=prompt('שם המאקרו החדש:');
    if(!name)return;
    recName=name;isRecording=true;recActions=[];recBuf='';
    const ind=document.getElementById('rec-ind');
    ind.style.display='flex';
    document.getElementById('rec-ind-name').textContent='"'+name+'"';
    document.getElementById('rec-count').textContent='(0)';
    document.getElementById('rec-btn').classList.add('on');
    notify('⏺ מקליט "'+name+'" — בצע פעולות, לחץ "עצור" בסיום');
  }
}
function stopRecording(){
  recFlush();
  isRecording=false;
  document.getElementById('rec-ind').style.display='none';
  document.getElementById('rec-btn').classList.remove('on');
  if(recActions.length){
    macros.push({name:recName,actions:[...recActions]});
    schedSave();
    notify('✓ מאקרו נשמר: "'+recName+'" — '+recActions.length+' פעולות');
  }else notify('לא הוקלטו פעולות');
}

/* ── MACRO RUN / MANAGE ── */
function openMacroDlg(){
  const dlg=makeDlg('מאקרואים');
  const listHTML=macros.length?macros.map((m,i)=>{
    const cnt=Array.isArray(m.actions)?m.actions.length:(m.actions||'').split('\n').filter(Boolean).length;
    return`<div class="list-item">
      <span>${m.name} <em style="color:#999;font-size:.85em">(${cnt} פעולות)</em></span>
      <button class="dbtn p" style="font-size:.72em;padding:2px 8px" onclick="runMacro(${i});this.closest('.dlg-back').remove()">▶ הפעל</button>
      <button class="dbtn p" style="font-size:.72em;padding:2px 8px;background:#555;border-color:#555" onclick="editMacro(${i});this.closest('.dlg-back').remove()">✎ ערוך</button>
      <button class="dbtn s" style="font-size:.72em;padding:2px 8px;color:#c00;border-color:#fcc" onclick="if(confirm('מחק?')){delMacro(${i});this.closest('.dlg-back').remove();openMacroDlg();}">✕</button>
    </div>`}).join('')
    :'<p style="font-size:.8em;color:#888;padding:6px 0">אין מאקרואים — לחץ "הקלט מאקרו" ברצועה כדי להתחיל</p>';
  dlg.querySelector('.dlg-bd').innerHTML=listHTML;
  addDlgBtn(dlg,'➕ מאקרו ידני',()=>{dlg.remove();openManualMacroDlg();},true);
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}
function openManualMacroDlg(){
  const dlg=makeDlg('מאקרו ידני');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>שם:</label><input type="text" id="mn" placeholder="שם המאקרו"/>
    <label>פעולות (שורה לפעולה):</label>
    <textarea id="mc" style="min-height:120px;font-family:monospace;font-size:.78em" placeholder="text: שלום עולם\nnewline\nbold\ntext: חידוש חשוב\nbold\nnewline\nseparator"></textarea>
    <details style="margin-top:8px">
      <summary style="font-size:.76em;color:var(--wb);cursor:pointer">📖 כל הפקודות הזמינות</summary>
      <div style="font-size:.71em;color:#444;margin-top:6px;line-height:1.9;background:#f8f8f8;padding:8px 10px;border-radius:3px;direction:ltr;text-align:left;border:1px solid #e8e8e8">
        <b>Text:</b> text: [your text] | newline | linebreak | del_back | del_fwd<br>
        <b>Format:</b> bold | italic | underline | strikethrough | clear_format<br>
        <b>More:</b> subscript | superscript | indent | outdent<br>
        <b>Lists:</b> list_ul | list_ol<br>
        <b>Align:</b> align_right | align_left | align_center | align_full<br>
        <b>Heading:</b> block_h1 | block_h2 | block_h3 | block_p | block_blockquote<br>
        <b>Font:</b> font: Times New Roman | size: 14 | color: #ff0000 | highlight: #ffff00<br>
        <b>Insert:</b> date | hebrew_date | separator | page_break<br>
        <b>Edit:</b> undo | redo
      </div>
    </details>`;
  addDlgBtn(dlg,'שמור',()=>{
    const n=dlg.querySelector('#mn').value.trim(),c=dlg.querySelector('#mc').value.trim();
    if(!n||!c){notify('מלא שם ופקודות');return;}
    macros.push({name:n,actions:textToActions(c)});schedSave();dlg.remove();notify('מאקרו נשמר: '+n);
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function editMacro(i){
  const m=macros[i];if(!m)return;
  const txt=actionsToText(m.actions);
  const dlg=makeDlg('ערוך מאקרו: '+m.name);
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>שם:</label><input type="text" id="en" value="${m.name.replace(/"/g,'&quot;')}"/>
    <label>פעולות:</label>
    <textarea id="ec" style="min-height:150px;font-family:monospace;font-size:.78em">${txt.replace(/</g,'&lt;')}</textarea>
    <p style="font-size:.71em;color:#999;margin-top:4px">ניתן לערוך ידנית — שורה לפעולה</p>`;
  addDlgBtn(dlg,'שמור',()=>{
    const newName=dlg.querySelector('#en').value.trim();
    const newTxt=dlg.querySelector('#ec').value.trim();
    if(!newName){notify('חסר שם');return;}
    macros[i]={name:newName,actions:textToActions(newTxt)};
    schedSave();dlg.remove();notify('מאקרו עודכן: '+newName);
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function runMacro(i){
  const mac=macros[i];if(!mac)return;
  if(Array.isArray(mac.actions))runMacroActions(mac.actions);
  else if(typeof mac.actions==='string')runMacroActions(textToActions(mac.actions));
  schedSave();
}
function runMacroActions(actions){
  const wasRecording=isRecording;
  isRecording=false; // disable recording during playback to avoid infinite loops
  restoreSel();
  activePage().focus();
  for(const a of actions){
    switch(a.t){
      case 'text':   if(a.v)document.execCommand('insertText',false,a.v);break;
      case 'nl':     document.execCommand('insertParagraph',false,null);break;
      case 'lb':     document.execCommand('insertLineBreak',false,null);break;
      case 'del':    if(a.d==='b')document.execCommand('delete',false,null);
                     else document.execCommand('forwardDelete',false,null);break;
      case 'fmt':{
        const cc={bold:'bold',italic:'italic',underline:'underline',strikeThrough:'strikeThrough',
          subscript:'subscript',superscript:'superscript',indent:'indent',outdent:'outdent',
          insertUnorderedList:'insertUnorderedList',insertOrderedList:'insertOrderedList',
          removeFormat:'removeFormat'};
        const execCmd=cc[a.cmd];
        if(execCmd){
          if(a.on!==undefined){
            // Absolute state: only toggle if current state differs from desired state
            let cur=false;
            try{cur=document.queryCommandState(execCmd);}catch(e){}
            if(cur!==a.on)document.execCommand(execCmd,false,null);
          }else{
            document.execCommand(execCmd,false,null);
          }
        }
        break;
      }
      case 'align':{
        const m={Right:'justifyRight',Left:'justifyLeft',Center:'justifyCenter',Full:'justifyFull'};
        if(m[a.dir])document.execCommand(m[a.dir],false,null);break;
      }
      case 'block': document.execCommand('formatBlock',false,'<'+a.tag+'>');break;
      case 'font':  applyFont(a.name);break;
      case 'size':  applySize(a.pt);break;
      case 'color': document.execCommand('foreColor',false,a.c);break;
      case 'hl':    document.execCommand('backColor',false,a.c);break;
      case 'html':
      case 'paste_html': document.execCommand('insertHTML',false,a.html||a.v||'');break;
      case 'paste_txt':  document.execCommand('insertText',false,a.v||'');break;
      case 'date':  insDate();break;
      case 'heb_date': insHebDate();break;
      case 'sep':   insHR();break;
      case 'pg':    insertPageBreak();break;
      case 'undo':  doUndo();break;
      case 'redo':  doRedo();break;
      case 'rep':   {
        const tmp=document.getElementById('fi');const tmpr=document.getElementById('ri');
        if(tmp)tmp.value=a.f||'';if(tmpr)tmpr.value=a.r||'';
        hlFind(a.f||'');doRepAll();break;
      }
      case 'wstyle': applyWStyle(a.name);break;
      case 'link':{
        const txt=a.txt||'';const url=a.url||'';
        if(txt){ex('insertHTML','<a href="'+url+'" target="_blank">'+txt+'</a>');}
        else{ex('insertHTML','<a href="'+url+'" target="_blank">'+url+'</a>');}
        break;
      }
      case 'table': doInsTable(a.rows||3,a.cols||3);break;
      case 'fn':    insFootnote();break;
      case 'en':    insEndnote();break;
      case 'cols':  setCols(a.n||1);break;
      case 'cite':  if(a.src)ex('insertHTML','<span style="color:#555;font-style:italic;font-size:.9em">('+a.src+')</span>');break;
    }
  }
  isRecording=wasRecording; // restore recording state
}
/* ── ACTIONS ↔ TEXT ── */
function textToActions(text){
  if(!text)return[];
  return text.split('\n').map(line=>{
    line=line.trim();if(!line||line.startsWith('#'))return null;
    if(line.startsWith('text:'))return{t:'text',v:line.slice(5).replace(/^ /,'')};
    if(line==='newline')return{t:'nl'};
    if(line==='linebreak')return{t:'lb'};
    if(line==='del_back')return{t:'del',d:'b'};
    if(line==='del_fwd')return{t:'del',d:'f'};
    // format commands with optional :on/:off state
    const fmtMap={bold:'bold',italic:'italic',underline:'underline',strikethrough:'strikeThrough',
      subscript:'subscript',superscript:'superscript',indent:'indent',outdent:'outdent'};
    for(const [k,v] of Object.entries(fmtMap)){
      if(line===k)return{t:'fmt',cmd:v};
      if(line===k+':on')return{t:'fmt',cmd:v,on:true};
      if(line===k+':off')return{t:'fmt',cmd:v,on:false};
    }
    if(false){}// placeholder so next if chains work
    if(line==='list_ul'||line==='list_unordered')return{t:'fmt',cmd:'insertUnorderedList'};
    if(line==='list_ol'||line==='list_ordered')return{t:'fmt',cmd:'insertOrderedList'};
    if(line==='clear_format')return{t:'fmt',cmd:'removeFormat'};
    if(line.startsWith('align_')){const d=line.slice(6);return{t:'align',dir:d.charAt(0).toUpperCase()+d.slice(1)};}
    if(line.startsWith('block_'))return{t:'block',tag:line.slice(6)};
    if(line.startsWith('font:'))return{t:'font',name:line.slice(5).replace(/^ /,'')};
    if(line.startsWith('size:'))return{t:'size',pt:parseFloat(line.slice(5))};
    if(line.startsWith('color:'))return{t:'color',c:line.slice(6).trim()};
    if(line.startsWith('highlight:'))return{t:'hl',c:line.slice(10).trim()};
    if(line==='date')return{t:'date'};
    if(line==='hebrew_date')return{t:'heb_date'};
    if(line==='separator')return{t:'sep'};
    if(line==='page_break')return{t:'pg'};
    if(line.startsWith('html:'))return{t:'html',html:line.slice(5).replace(/^ /,'')};
    if(line==='undo')return{t:'undo'};
    if(line==='redo')return{t:'redo'};
    if(line.startsWith('link:')){ const[,url,...rest]=line.split(':');return{t:'link',url:(url||'').trim(),txt:(rest.join(':').trim())||''}; }
    if(line.startsWith('table:')){ const[,r,c]=line.split(':');return{t:'table',rows:parseInt(r)||3,cols:parseInt(c)||3}; }
    if(line==='footnote')return{t:'fn'};
    if(line==='endnote')return{t:'en'};
    if(line.startsWith('columns:'))return{t:'cols',n:parseInt(line.slice(8))||1};
    if(line.startsWith('citation:'))return{t:'cite',src:line.slice(9).replace(/^ /,'')};
    return null;
  }).filter(Boolean);
}
function actionsToText(actions){
  if(typeof actions==='string')return actions;
  if(!Array.isArray(actions))return'';
  const r={bold:'bold',italic:'italic',underline:'underline',strikeThrough:'strikethrough',
    subscript:'subscript',superscript:'superscript',indent:'indent',outdent:'outdent',
    insertUnorderedList:'list_ul',insertOrderedList:'list_ol',removeFormat:'clear_format'};
  return actions.map(a=>{
    switch(a.t){
      case 'text':  return 'text: '+a.v;
      case 'nl':    return 'newline';
      case 'lb':    return 'linebreak';
      case 'del':   return a.d==='b'?'del_back':'del_fwd';
      case 'fmt':   return (r[a.cmd]||a.cmd)+(a.on!==undefined?':'+(a.on?'on':'off'):'');
      case 'align': return 'align_'+a.dir.toLowerCase();
      case 'block': return 'block_'+a.tag;
      case 'font':  return 'font: '+a.name;
      case 'size':  return 'size: '+a.pt;
      case 'color': return 'color: '+a.c;
      case 'hl':    return 'highlight: '+a.c;
      case 'date':  return 'date';
      case 'heb_date': return 'hebrew_date';
      case 'sep':   return 'separator';
      case 'pg':    return 'page_break';
      case 'html':  return 'html: '+(a.html||'').slice(0,80);
      case 'paste_html': return '# paste (html, '+((a.html||'').length)+' chars)';
      case 'paste_txt':  return 'text: '+(a.v||'');
      case 'undo':  return 'undo';
      case 'redo':  return 'redo';
      case 'link':  return 'link: '+(a.url||'')+(a.txt?':'+a.txt:'');
      case 'table': return 'table: '+(a.rows||3)+':'+(a.cols||3);
      case 'fn':    return 'footnote';
      case 'en':    return 'endnote';
      case 'cols':  return 'columns: '+(a.n||1);
      case 'cite':  return 'citation: '+(a.src||'');
      default: return '# '+JSON.stringify(a);
    }
  }).join('\n');
}
function delMacro(i){macros.splice(i,1);schedSave();}

/* ── TEMPLATES ── */
function openTemplates(){
  const tpls=[
    {name:'חידוש הלכתי',actions:'block_h1\ntext: [נושא]\nhebrew_date\nseparator\ntext: שאלה:\ntext: \ntext: תשובה:\ntext: \ntext: מסקנה:'},
    {name:'חידוש על הפרשה',actions:'block_h1\ntext: [שם הפרשה]\nhebrew_date\nseparator\ntext: \ntext: חידוש:'},
    {name:'סיכום שיעור',actions:'block_h1\ntext: סיכום שיעור\ndate\nseparator\ntext: נושא: \ntext: עיקרי הדברים:\ntext: \ntext: הערות:'},
    {name:'ביאור סוגיא',actions:'block_h1\ntext: ביאור הסוגיא\nhebrew_date\nseparator\ntext: גוף הסוגיא:\ntext: \ntext: קושיות:\ntext: \ntext: תירוצים:\ntext: \ntext: סיכום:'},
    {name:'שאלה ותשובה',actions:'block_h2\ntext: שאלה:\ntext: \nblock_h2\ntext: תשובה:\ntext: \nblock_h2\ntext: מסקנה:\ntext: '},
  ];
  const dlg=makeDlg('תבניות מסמך');
  dlg.querySelector('.dlg-bd').innerHTML='<p style="font-size:.8em;color:#555;margin-bottom:8px">בחר תבנית:</p>'+
    tpls.map(t=>`<div class="list-item" style="cursor:pointer"><span>${t.name}</span></div>`).join('');
  dlg.querySelectorAll('.list-item').forEach((el,i)=>{
    el.onclick=()=>{
      const tmp={name:tpls[i].name,actions:tpls[i].actions};
      macros.push(tmp);runMacro(macros.length-1);macros.pop();
      dlg.remove();
    };
  });
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}

/* ── ARCHIVE ── */
async function saveToArchive(){
  const t=document.getElementById('doc-title').value;
  const c=_getDocHTML();
  const d=new Date();
  const ds=d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear()+' '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
  archive.unshift({title:t,content:c,date:ds,id:Date.now()});
  if(archive.length>50)archive.pop();
  await saveDoc();notify('נשמר לארכיון: '+t);
}
function openArchiveDlg(){
  const dlg=makeDlg('ארכיון חידושים');
  dlg.querySelector('.dlg-bd').innerHTML=!archive.length?'<p style="font-size:.8em;color:#888">הארכיון ריק</p>':
    archive.map((a,i)=>`<div class="list-item">
      <span><strong>${a.title}</strong> <em style="color:#888;font-size:.85em">${a.date}</em></span>
      <button class="dbtn p" style="font-size:.72em;padding:2px 8px" onclick="loadArc(${i});this.closest('.dlg-back').remove()">טען</button>
      <button class="dbtn s" style="font-size:.72em;padding:2px 8px;color:#c00;border-color:#fcc" onclick="if(confirm('מחק?')){archive.splice(${i},1);schedSave();this.closest('.dlg-back').remove();openArchiveDlg();}">מחק</button>
    </div>`).join('');
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}
function loadArc(i){
  const a=archive[i];if(!a)return;
  document.getElementById('doc-title').value=a.title;
  _setDocHTML(a.content);
  updCount();updNav();schedSave();schedRepaginate();
}

/* ── OTZARIA ── */
function openInReader(){
  const txt=window.getSelection()?.toString()?.trim();
  if(!txt){notify('בחר טקסט לפתיחה בקורא');return;}
  try{Otzaria.call('reader.openBook',{bookId:txt});}catch(e){notify('פתח בקורא: '+txt);}
}
function searchInLib(){
  const txt=window.getSelection()?.toString()?.trim()||prompt('חפש בספרייה:');
  if(!txt)return;
  try{Otzaria.call('reader.openBook',{bookId:txt});}catch(e){notify('חיפוש: '+txt);}
}

/* ── CONTEXT MENU ── */
function showCtx(e){
  e.preventDefault();
  const ctx=document.getElementById('ctx');
  // Detect if cursor is inside a table cell
  const node=window.getSelection()?.focusNode;
  const cell=node?(node.nodeType===3?node.parentElement:node)?.closest('td,th'):null;
  const inTable=!!cell;
  const tblIds=['ctx-tbl-sep','ctx-tbl-ins-above','ctx-tbl-ins-below',
                'ctx-tbl-ins-col-r','ctx-tbl-ins-col-l',
                'ctx-tbl-del-row','ctx-tbl-del-col','ctx-tbl-del-tbl'];
  tblIds.forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display=inTable?'':'none';
  });
  // Detect spell-error word under cursor
  const spellMark=e.target?.closest('mark.spell-err');
  const dictItem=document.getElementById('ctx-add-dict');
  const dictSep=document.getElementById('ctx-dict-sep');
  if(spellMark&&_spellActive){
    _ctxSpellWord=spellMark.textContent.replace(/[ְ-ׇ]/g,'').replace(/״/g,'"').replace(/׳/g,"'");
    if(dictItem){dictItem.style.display='';dictItem.textContent='✓ הוסף למילון: '+spellMark.textContent;}
    if(dictSep)dictSep.style.display='';
  }else{
    _ctxSpellWord='';
    if(dictItem)dictItem.style.display='none';
    if(dictSep)dictSep.style.display='none';
  }
  ctx.style.display='block';
  ctx.style.left='-9999px';ctx.style.top='-9999px';
  requestAnimationFrame(()=>{
    const w=ctx.offsetWidth,h=ctx.offsetHeight;
    const x=Math.min(e.clientX,window.innerWidth-w-6);
    const y=Math.min(e.clientY,window.innerHeight-h-6);
    ctx.style.left=x+'px';ctx.style.top=y+'px';
  });
}
function hideCtx(){document.getElementById('ctx').style.display='none';}

/* ── TABLE CONTEXT ACTIONS ── */
function _ctxCell(){
  const node=window.getSelection()?.focusNode;
  return (node?(node.nodeType===3?node.parentElement:node)?.closest('td,th'):null);
}
function ctxTblRow(where){
  const cell=_ctxCell();if(!cell)return;
  const row=cell.closest('tr');if(!row)return;
  const cols=row.querySelectorAll('td,th').length;
  const newRow=document.createElement('tr');
  for(let i=0;i<cols;i++){
    const td=document.createElement('td');
    td.style.cssText='border:1px solid #b0b0b0;padding:5px 8px;min-width:50px';
    td.innerHTML='&nbsp;';
    newRow.appendChild(td);
  }
  if(where==='above')row.parentNode.insertBefore(newRow,row);
  else row.parentNode.insertBefore(newRow,row.nextSibling);
  schedSave();
}
function ctxTblCol(where){
  const cell=_ctxCell();if(!cell)return;
  const row=cell.closest('tr');
  const table=cell.closest('table');if(!table)return;
  const cellIdx=Array.from(row.children).indexOf(cell);
  table.querySelectorAll('tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td,th');
    const ref=cells[cellIdx];if(!ref)return;
    const td=document.createElement('td');
    td.style.cssText='border:1px solid #b0b0b0;padding:5px 8px;min-width:50px';
    td.innerHTML='&nbsp;';
    if(where==='right')tr.insertBefore(td,ref);
    else tr.insertBefore(td,ref.nextSibling);
  });
  schedSave();
}
function ctxTblDelRow(){
  const cell=_ctxCell();if(!cell)return;
  const row=cell.closest('tr');if(!row)return;
  const table=row.closest('table');
  if(table.querySelectorAll('tr').length<=1){ctxTblDelTable();return;}
  row.remove();schedSave();
}
function ctxTblDelCol(){
  const cell=_ctxCell();if(!cell)return;
  const row=cell.closest('tr');
  const table=cell.closest('table');if(!table)return;
  const cellIdx=Array.from(row.children).indexOf(cell);
  let allSingle=true;
  table.querySelectorAll('tr').forEach(tr=>{if(tr.querySelectorAll('td,th').length>1)allSingle=false;});
  if(allSingle){ctxTblDelTable();return;}
  table.querySelectorAll('tr').forEach(tr=>{
    const cells=tr.querySelectorAll('td,th');
    if(cells[cellIdx])cells[cellIdx].remove();
  });
  schedSave();
}
function ctxTblDelTable(){
  const cell=_ctxCell();if(!cell)return;
  const table=cell.closest('table');if(!table)return;
  table.remove();schedSave();
}

/* ── RIBBON / TABS ── */
function swTab(id,el){
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.rp').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('rp-'+id)?.classList.add('on');
  if(document.getElementById('ribbon').classList.contains('closed'))
    document.getElementById('ribbon').classList.remove('closed');
}
function togRib(){
  const r=document.getElementById('ribbon');r.classList.toggle('closed');
  document.getElementById('rib-tog').textContent=r.classList.contains('closed')?'∨':'∧';
}

/* ── THEME ── */
function togTheme(){
  const isOtz=document.body.classList.contains('otz-theme');
  if(isOtz){
    // Switch to Word look
    document.body.classList.remove('otz-theme','dark-mode');
    const root=document.documentElement;
    root.style.setProperty('--wb','#2b579a');
    root.style.setProperty('--wb-dk','#1a4480');
    root.style.setProperty('--wb-lt','#dce6f7');
    root.style.setProperty('--bh','rgba(43,87,154,.13)');
    root.style.setProperty('--ba','rgba(43,87,154,.28)');
    root.style.setProperty('--rb','#f3f3f3');
    root.style.setProperty('--rbb','#d1d1d1');
    root.style.setProperty('--canvas','#d2d2d2');
    document.querySelectorAll('.page').forEach(pg=>{pg.style.removeProperty('background');pg.style.removeProperty('color');});
    document.getElementById('tt-btn').textContent='אוצריא';
  }else{
    // Switch back to Otzaria look
    if(_lastOtzTheme){applyOtzTheme(_lastOtzTheme);}
    else{
      // No saved theme — just re-add the class
      document.body.classList.add('otz-theme');
      document.getElementById('tt-btn').textContent='Word';
    }
  }
}

/* ── KEYBOARD ── */
/* ── ALT KEY TIPS ── */
const _altTabs=['file','home','insert','layout','refs','view','design','review','books'];
let _altMode=false;
function _showAltTips(show){
  _altMode=show;
  document.querySelectorAll('.rtab').forEach((btn,i)=>{
    let tip=btn.querySelector('.alt-tip');
    if(show){
      if(!tip){tip=document.createElement('span');tip.className='alt-tip';btn.appendChild(tip);}
      tip.textContent=i+1;
    }else{
      tip?.remove();
    }
  });
}
document.addEventListener('keydown',e=>{
  if(e.key==='F11'){e.preventDefault();toggleFullscreen();return;}
  if(e.key==='Escape'&&document.fullscreenElement){document.exitFullscreen();return;}
  if(e.key==='Alt'&&!e.ctrlKey){e.preventDefault();_showAltTips(!_altMode);return;}
  if(_altMode){
    const n=parseInt(e.key);
    if(n>=1&&n<=_altTabs.length){
      e.preventDefault();_showAltTips(false);
      const tabs=document.querySelectorAll('.rtab');
      if(tabs[n-1])tabs[n-1].click();
    }else if(e.key==='Escape'){_showAltTips(false);}
  }
},true);

function onKey(e){
  const ctrl=e.ctrlKey||e.metaKey;
  if(ctrl)switch(e.key.toLowerCase()){
    case 's':e.preventDefault();saveDoc();break;
    case 'b':e.preventDefault();fmt('bold');break;
    case 'i':e.preventDefault();fmt('italic');break;
    case 'u':e.preventDefault();fmt('underline');break;
    case 'f':e.preventDefault();openFB();break;
    case 'h':e.preventDefault();openReplace();break;
    case 'a':e.preventDefault();selectAllPages();break;
    case 'p':e.preventDefault();printDoc();break;
    case 'k':e.preventDefault();insLink();break;
    case 'v':if(e.shiftKey){e.preventDefault();pasteMatchFormat();}break;
    case 'z':e.preventDefault();doUndo();break;
    case 'y':e.preventDefault();doRedo();break;
    case 'l':e.preventDefault();sa('Left');break;
    case 'r':e.preventDefault();sa('Right');break;
    case 'e':e.preventDefault();sa('Center');break;
    case 'j':e.preventDefault();sa('Full');break;
    case ']':e.preventDefault();growFont(1);break;
    case '[':e.preventDefault();growFont(-1);break;
  }
  if(e.key==='Escape'){
    if(isPainting){isPainting=false;paintData=null;document.getElementById('fp-btn')?.classList.remove('on');document.body.classList.remove('cursor-paint');return;}
    if(document.getElementById('fb').style.display==='flex')closeFB();
    else if(document.body.classList.contains('focus-mode'))togFocus();
    else if(isReadMode)togRead();
  }
  // Arrow navigation between pages
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    const pg=activePage();
    if(!pg)return;
    const pages=[...document.querySelectorAll('.page')];
    const idx=pages.indexOf(pg);
    const sel=window.getSelection();
    if(!sel||!sel.rangeCount)return;
    try{
      const range=sel.getRangeAt(0);
      const rect=range.getBoundingClientRect();
      const pgRect=pg.getBoundingClientRect();
      if(e.key==='ArrowDown'&&rect.bottom>pgRect.bottom-20&&idx<pages.length-1){
        e.preventDefault();
        const next=pages[idx+1];
        next.focus();
        const r=document.createRange();
        const first=next.querySelector('p,h1,h2,h3,h4,h5,h6')||next;
        r.setStart(first,0);r.collapse(true);
        sel.removeAllRanges();sel.addRange(r);
        next.scrollIntoView({behavior:'smooth',block:'nearest'});
      }else if(e.key==='ArrowUp'&&rect.top<pgRect.top+20&&idx>0){
        e.preventDefault();
        const prev=pages[idx-1];
        prev.focus();
        const r=document.createRange();
        r.selectNodeContents(prev);r.collapse(false);
        sel.removeAllRanges();sel.addRange(r);
        prev.scrollIntoView({behavior:'smooth',block:'nearest'});
      }
    }catch(err){}
  }
}

/* ── DIALOG HELPERS ── */
function makeDlg(title){
  const b=document.createElement('div');b.className='dlg-back';
  b.innerHTML=`<div class="dlg" onclick="event.stopPropagation()">
    <div class="dlg-hd"><span>${title}</span><button onclick="this.closest('.dlg-back').remove()">✕</button></div>
    <div class="dlg-bd"></div><div class="dlg-ft"></div>
  </div>`;
  b.addEventListener('click',()=>b.remove());
  document.body.appendChild(b);return b;
}
function addDlgBtn(dlg,label,fn,primary=true){
  const btn=document.createElement('button');
  btn.className='dbtn '+(primary?'p':'s');btn.textContent=label;
  btn.addEventListener('click',fn);
  dlg.querySelector('.dlg-ft').appendChild(btn);
}

/* ══ DESIGN TAB ══ */
const THEMES={
  default:{wb:'#2b579a',wbdk:'#1a4480',wblt:'#dce6f7',bh:'rgba(43,87,154,.13)',ba:'rgba(43,87,154,.28)',h1b:'#111',h2:'#2e74b5',h3:'#1f3763'},
  modern: {wb:'#6750A4',wbdk:'#4a3780',wblt:'#e8def8',bh:'rgba(103,80,164,.13)',ba:'rgba(103,80,164,.28)',h1b:'#6750A4',h2:'#6750A4',h3:'#3d1f87'},
  classic:{wb:'#8b0000',wbdk:'#660000',wblt:'#fce8e8',bh:'rgba(139,0,0,.13)',ba:'rgba(139,0,0,.28)',h1b:'#8b0000',h2:'#8b0000',h3:'#5c3317'},
  minimal:{wb:'#444444',wbdk:'#222222',wblt:'#f0f0f0',bh:'rgba(68,68,68,.13)',ba:'rgba(68,68,68,.28)',h1b:'#555',h2:'#333',h3:'#555'},
  elegant:{wb:'#2e5931',wbdk:'#1a3a1c',wblt:'#e2f0e3',bh:'rgba(46,89,49,.13)',ba:'rgba(46,89,49,.28)',h1b:'#2e5931',h2:'#2e5931',h3:'#1a3a1c'},
};
function applyTheme(name){
  const t=THEMES[name]||THEMES.default;
  const root=document.documentElement;
  root.style.setProperty('--wb',t.wb);
  root.style.setProperty('--wb-dk',t.wbdk);
  root.style.setProperty('--wb-lt',t.wblt);
  root.style.setProperty('--bh',t.bh);
  root.style.setProperty('--ba',t.ba);
  let s=document.getElementById('theme-style');
  if(!s){s=document.createElement('style');s.id='theme-style';document.head.appendChild(s);}
  s.textContent=`.page h1{border-bottom-color:${t.h1b}}.page h2{color:${t.h2}}.page h3{color:${t.h3}}`;
  schedSave();notify('ערכת נושא: '+name);
}
function setPageColor(c){
  document.querySelectorAll('.page').forEach(pg=>pg.style.background=c);
  schedSave();
}
let hasPageBorder=false;
function togPageBorder(){
  hasPageBorder=!hasPageBorder;
  document.querySelectorAll('.page').forEach(pg=>pg.style.outline=hasPageBorder?'2px solid #888':'');
  document.getElementById('pgborder-btn').classList.toggle('on',hasPageBorder);
}
function openWatermarkDlg(){
  const dlg=makeDlg('סימן מים');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>טקסט:</label>
    <input id="wm-txt" value="טיוטה"/>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      <button class="dbtn s" style="font-size:.76em" onclick="document.getElementById('wm-txt').value='טיוטה'">טיוטה</button>
      <button class="dbtn s" style="font-size:.76em" onclick="document.getElementById('wm-txt').value='סודי'">סודי</button>
      <button class="dbtn s" style="font-size:.76em" onclick="document.getElementById('wm-txt').value='דוגמה'">דוגמה</button>
      <button class="dbtn s" style="font-size:.76em" onclick="document.getElementById('wm-txt').value='לבדיקה'">לבדיקה</button>
    </div>`;
  addDlgBtn(dlg,'הוסף',()=>{
    const t=dlg.querySelector('#wm-txt').value.trim();
    if(!t)return;
    setWatermark(t);dlg.remove();
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function setWatermark(txt){
  let wm=document.getElementById('watermark');
  if(!wm){wm=document.createElement('div');wm.id='watermark';document.getElementById('dw').appendChild(wm);}
  wm.innerHTML='<span>'+txt+'</span>';
  notify('סימן מים: '+txt);
}
function removeWatermark(){
  document.getElementById('watermark')?.remove();
  notify('סימן המים הוסר');
}

/* ── PARAGRAPH DIALOG ── */
function openParaDlg(){
  const s=window.getSelection();
  let el=s?.focusNode?(s.focusNode.nodeType===3?s.focusNode.parentElement:s.focusNode):null;
  const BL=['P','DIV','LI','H1','H2','H3','H4','BLOCKQUOTE','PRE'];
  const dp=document.getElementById('dp');
  while(el&&el!==dp&&!BL.includes(el.nodeName))el=el.parentNode;
  const cur=(el&&el!==dp)?el:null;
  const dlg=makeDlg('עיצוב פסקה');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>יישור:</label>
    <select id="pa-al">
      <option value="right">ימין</option><option value="center">מרכז</option>
      <option value="left">שמאל</option><option value="justify">מלא</option>
    </select>
    <label>רווח שורות:</label>
    <select id="pa-lh">
      <option value="1">1.0</option><option value="1.15">1.15</option>
      <option value="1.5" selected>1.5</option><option value="2">2.0</option>
      <option value="2.5">2.5</option><option value="3">3.0</option>
    </select>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
      <div><label>מרווח לפני (pt):</label><input id="pa-mt" type="number" value="0" min="0"/></div>
      <div><label>מרווח אחרי (pt):</label><input id="pa-mb" type="number" value="0" min="0"/></div>
      <div><label>הזחה ימין (px):</label><input id="pa-pr" type="number" value="0" min="0"/></div>
      <div><label>הזחה שמאל (px):</label><input id="pa-pl" type="number" value="0" min="0"/></div>
    </div>
    <label>הזחה שורה ראשונה (px):</label>
    <input id="pa-ti" type="number" value="0"/>
    <div style="margin-top:10px;padding:8px 12px;border:1px solid #ddd;background:#fafafa;font-size:.85em;line-height:1.6;direction:rtl;text-align:right" id="pa-prev">תצוגה מקדימה של הפסקה כאן</div>`;
  const prev=dlg.querySelector('#pa-prev');
  const upd=()=>{
    const lh=dlg.querySelector('#pa-lh').value;
    const mt=dlg.querySelector('#pa-mt').value;
    const mb=dlg.querySelector('#pa-mb').value;
    const pr=dlg.querySelector('#pa-pr').value;
    const pl=dlg.querySelector('#pa-pl').value;
    const ti=dlg.querySelector('#pa-ti').value;
    const al=dlg.querySelector('#pa-al').value;
    prev.style.cssText=`padding:8px 12px;border:1px solid #ddd;background:#fafafa;font-size:.85em;direction:rtl;line-height:${lh};margin-top:${mt}pt;margin-bottom:${mb}pt;padding-right:${pr}px;padding-left:${pl}px;text-indent:${ti}px;text-align:${al}`;
  };
  dlg.querySelectorAll('#pa-al,#pa-lh,#pa-mt,#pa-mb,#pa-pr,#pa-pl,#pa-ti').forEach(e=>e.addEventListener('input',upd));
  addDlgBtn(dlg,'אישור',()=>{
    const alMap={right:'justifyRight',center:'justifyCenter',left:'justifyLeft',justify:'justifyFull'};
    ex(alMap[dlg.querySelector('#pa-al').value]||'justifyRight');
    const target=cur||dp;
    target.style.lineHeight=dlg.querySelector('#pa-lh').value;
    const mt=dlg.querySelector('#pa-mt').value;const mb=dlg.querySelector('#pa-mb').value;
    const pr=dlg.querySelector('#pa-pr').value;const pl=dlg.querySelector('#pa-pl').value;
    const ti=dlg.querySelector('#pa-ti').value;
    if(+mt)target.style.marginTop=mt+'pt';
    if(+mb)target.style.marginBottom=mb+'pt';
    if(+pr)target.style.paddingRight=pr+'px';
    if(+pl)target.style.paddingLeft=pl+'px';
    if(+ti)target.style.textIndent=ti+'px';
    schedSave();dlg.remove();
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}

/* ── FONT DIALOG ── */
function openFontDlg(){
  const dlg=makeDlg('גופן');
  dlg.querySelector('.dlg-bd').style.minWidth='360px';
  dlg.querySelector('.dlg-bd').innerHTML=`
    <div style="display:flex;gap:12px">
      <div style="flex:2">
        <label>גופן:</label>
        <select id="fd-fn" style="width:100%">
          <option value="'Times New Roman',serif">Times New Roman</option>
          <option value="'David Libre','David',serif">David</option>
          <option value="'Frank Ruhl Libre',serif">Frank Ruhl Libre</option>
          <option value="Arial,sans-serif">Arial</option>
          <option value="'Rubik',sans-serif">Rubik</option>
          <option value="'Calibri',sans-serif">Calibri</option>
          <option value="'Courier New',monospace">Courier New</option>
        </select>
      </div>
      <div style="flex:1">
        <label>גודל (pt):</label>
        <select id="fd-sz" style="width:100%">
          <option>8</option><option>9</option><option>10</option><option>11</option>
          <option selected>12</option><option>14</option><option>16</option><option>18</option>
          <option>20</option><option>24</option><option>28</option><option>36</option><option>48</option><option>72</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
      <label style="display:flex;align-items:center;gap:4px;font-size:.82em;margin:0"><input type="checkbox" id="fd-b"/> <strong>מודגש</strong></label>
      <label style="display:flex;align-items:center;gap:4px;font-size:.82em;margin:0"><input type="checkbox" id="fd-i"/> <em>נטוי</em></label>
      <label style="display:flex;align-items:center;gap:4px;font-size:.82em;margin:0"><input type="checkbox" id="fd-u"/> <u>קו תחתון</u></label>
      <label style="display:flex;align-items:center;gap:4px;font-size:.82em;margin:0"><input type="checkbox" id="fd-s"/> <s>קו חוצה</s></label>
    </div>
    <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:5px">
        <label style="font-size:.8em;margin:0">צבע:</label>
        <input type="color" id="fd-col" value="#000000" style="width:36px;height:22px;cursor:pointer;border-radius:2px;border:1px solid #ccc"/>
      </div>
      <div style="display:flex;align-items:center;gap:5px">
        <label style="font-size:.8em;margin:0">ריווח תווים:</label>
        <select id="fd-sp" style="width:90px;font-size:.8em;border:1px solid #adadad;border-radius:2px;padding:2px 4px;outline:none">
          <option value="normal">רגיל</option><option value="0.1em">מורחב</option>
          <option value="-0.05em">צפוף</option><option value="0.05em">קצת מורחב</option>
        </select>
      </div>
    </div>
    <div style="margin-top:10px;padding:8px 12px;border:1px solid #ddd;background:#fafafa;min-height:40px;text-align:center;direction:rtl" id="fd-prev">טקסט לדוגמה — Text Sample</div>`;
  const prev=dlg.querySelector('#fd-prev');
  const upd=()=>{
    const f=dlg.querySelector('#fd-fn').value;
    const sz=dlg.querySelector('#fd-sz').value;
    const b=dlg.querySelector('#fd-b').checked;
    const i=dlg.querySelector('#fd-i').checked;
    const u=dlg.querySelector('#fd-u').checked;
    const s=dlg.querySelector('#fd-s').checked;
    const c=dlg.querySelector('#fd-col').value;
    const sp=dlg.querySelector('#fd-sp').value;
    let td=[];if(u)td.push('underline');if(s)td.push('line-through');
    prev.style.cssText=`padding:8px 12px;border:1px solid #ddd;background:#fafafa;min-height:40px;text-align:center;direction:rtl;font-family:${f};font-size:${sz}pt;font-weight:${b?'bold':'normal'};font-style:${i?'italic':'normal'};text-decoration:${td.join(' ')||'none'};color:${c};letter-spacing:${sp}`;
  };
  dlg.querySelectorAll('#fd-fn,#fd-sz,#fd-b,#fd-i,#fd-u,#fd-s,#fd-col,#fd-sp').forEach(el=>el.addEventListener('change',upd));
  addDlgBtn(dlg,'אישור',()=>{
    const f=dlg.querySelector('#fd-fn').value;
    const sz=parseInt(dlg.querySelector('#fd-sz').value);
    const b=dlg.querySelector('#fd-b').checked;
    const i=dlg.querySelector('#fd-i').checked;
    const u=dlg.querySelector('#fd-u').checked;
    const s=dlg.querySelector('#fd-s').checked;
    const c=dlg.querySelector('#fd-col').value;
    const sp=dlg.querySelector('#fd-sp').value;
    applyFont(f);applySize(sz);
    // Set absolute states
    if(b!==document.queryCommandState('bold'))ex('bold');
    if(i!==document.queryCommandState('italic'))ex('italic');
    if(u!==document.queryCommandState('underline'))ex('underline');
    if(s!==document.queryCommandState('strikeThrough'))ex('strikeThrough');
    applyColor(c);
    if(sp!=='normal'){
      restoreSel();
      const sel=window.getSelection();
      if(sel&&sel.rangeCount&&!sel.isCollapsed){
        const range=sel.getRangeAt(0);
        try{
          const span=document.createElement('span');
          span.style.letterSpacing=sp;
          range.surroundContents(span);
        }catch(e){}
      }
    }
    schedSave();dlg.remove();
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}

/* ══ REVIEW TAB ══ */
let cmCount=0,comments=[],isTrackChanges=false,isDocProtected=false;

/* ── COMMENTS ── */
function addComment(){
  const s=window.getSelection();
  if(!s||s.isCollapsed){notify('בחר טקסט להוספת הערה');return;}
  const selTxt=s.toString();
  const dlg=makeDlg('הוסף הערה');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <p style="font-size:.78em;color:#666;margin-bottom:8px;direction:rtl">על הטקסט: <em>"${selTxt.slice(0,50).replace(/</g,'&lt;')}${selTxt.length>50?'...':''}"</em></p>
    <label>הערה:</label>
    <textarea id="cm-inp" style="min-height:70px" placeholder="כתוב הערה..."></textarea>
    <label>מחבר:</label>
    <input id="cm-auth" value="אני"/>`;
  dlg.querySelector('#cm-inp').focus();
  addDlgBtn(dlg,'הוסף',()=>{
    const note=dlg.querySelector('#cm-inp').value.trim();
    const auth=dlg.querySelector('#cm-auth').value.trim()||'אני';
    if(!note){notify('כתוב הערה');return;}
    cmCount++;
    const id=cmCount;
    const savedSel=window.getSelection().getRangeAt(0).cloneRange();
    const mark=document.createElement('mark');
    mark.className='cm-ref';mark.dataset.cid=id;
    mark.title='הערה '+id+': '+note;
    mark.onclick=()=>scrollToCm(id);
    try{savedSel.surroundContents(mark);}catch(e){
      ex('insertHTML','<mark class="cm-ref" data-cid="'+id+'" onclick="scrollToCm('+id+')" title="הערה '+id+'">'+selTxt.replace(/</g,'&lt;')+'</mark>');
    }
    comments.push({id,text:note,author:auth,ref:selTxt.slice(0,30),resolved:false});
    updCommentPanel();
    const cp=document.getElementById('cp');
    if(cp.classList.contains('hide'))cp.classList.remove('hide');
    schedSave();dlg.remove();notify('✓ הערה '+id+' נוספה');
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function updCommentPanel(){
  const body=document.getElementById('cp-body');
  if(!body)return;
  // Update status bar indicator
  const active=comments.filter(c=>!c.resolved).length;
  const sbCm=document.getElementById('sb-cm');
  const sbCmSep=document.getElementById('sb-cm-sep');
  if(sbCm){
    if(active>0){sbCm.textContent=active+' הערות';sbCm.style.display='';if(sbCmSep)sbCmSep.style.display='';}
    else{sbCm.style.display='none';if(sbCmSep)sbCmSep.style.display='none';}
  }
  if(!comments.length){body.innerHTML='<p style="font-size:.78em;color:#999;padding:10px">אין הערות</p>';return;}
  body.innerHTML=comments.map(c=>`
    <div class="cm-card${c.resolved?' resolved':''}" id="cmc-${c.id}" onclick="scrollToCmRef(${c.id})">
      <button class="cm-del" onclick="event.stopPropagation();delComment(${c.id})" title="מחק הערה">x</button>
      <div class="cm-author">${c.author.replace(/</g,'&lt;')}</div>
      <div class="cm-text">${c.text.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
      <div style="font-size:.72em;color:#aaa;margin-top:3px">"${c.ref.replace(/</g,'&lt;')}"</div>
      ${!c.resolved
        ?`<button onclick="event.stopPropagation();resolveComment(${c.id})" style="font-size:.72em;color:var(--wb);background:none;border:none;cursor:pointer;padding:2px 0;margin-top:3px">+ סמן כנפתר</button>`
        :'<span style="font-size:.72em;color:#999;display:block;margin-top:2px">+ נפתר</span>'}
    </div>`).join('');
}
function delComment(id){
  const mark=document.querySelector('.cm-ref[data-cid="'+id+'"]');
  if(mark){const p=mark.parentNode;while(mark.firstChild)p.insertBefore(mark.firstChild,mark);p.removeChild(mark);}
  comments=comments.filter(c=>c.id!==id);
  updCommentPanel();schedSave();
}
function resolveComment(id){
  const c=comments.find(x=>x.id===id);if(c){c.resolved=true;updCommentPanel();}
}
function scrollToCmRef(id){
  const m=document.querySelector('.cm-ref[data-cid="'+id+'"]');
  if(m)m.scrollIntoView({behavior:'smooth',block:'center'});
}
function scrollToCm(id){
  const el=document.getElementById('cmc-'+id);
  if(el){el.scrollIntoView({behavior:'smooth',block:'center'});
    document.querySelectorAll('.cm-card').forEach(c=>c.style.outline='');
    el.style.outline='2px solid var(--wb)';}
}
function togCommentPanel(){
  const cp=document.getElementById('cp');cp.classList.toggle('hide');
  if(!cp.classList.contains('hide'))updCommentPanel();
}

/* ── TRACK CHANGES ── */
function togTrackChanges(){
  isTrackChanges=!isTrackChanges;
  const btn=document.getElementById('tc-btn');
  btn.classList.toggle('on',isTrackChanges);
  btn.textContent=(isTrackChanges?'✓ ':'')+'מעקב שינויים';
  notify(isTrackChanges?'מעקב שינויים פועל — שינויים יסומנו בצבע':'מעקב שינויים כבוי');
  if(isTrackChanges){
    // Intercept input via beforeinput
    document.getElementById('dp')._tcActive=true;
  }else{
    document.getElementById('dp')._tcActive=false;
  }
}
function acceptAllChanges(){
  const dp=document.getElementById('dp');
  dp.querySelectorAll('ins.tc-ins').forEach(el=>{
    const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);
  });
  dp.querySelectorAll('del.tc-del').forEach(el=>el.remove());
  schedSave();notify('✓ כל השינויים אושרו');
}
function rejectAllChanges(){
  const dp=document.getElementById('dp');
  dp.querySelectorAll('del.tc-del').forEach(el=>{
    const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);
  });
  dp.querySelectorAll('ins.tc-ins').forEach(el=>el.remove());
  schedSave();notify('✓ כל השינויים נדחו');
}

/* ── SPELL CHECK ── */
let _spellActive=false,_spellTimer=null;
let _userDict=new Set(JSON.parse(localStorage.getItem('_otzw_userdict')||'[]'));
let _ctxSpellWord='';

function togSpellCheck(){
  _spellActive=!_spellActive;
  // Disable native spellcheck — our custom dict handles it
  document.querySelectorAll('.page').forEach(pg=>pg.spellcheck=false);
  const btn=document.getElementById('spell-btn');
  if(btn)btn.textContent=(_spellActive?'✓ ':'')+'בדיקת איות';
  if(_spellActive){runSpellCheck();notify('בדיקת איות פועלת');}
  else{clearSpellMarks();notify('בדיקת איות כבויה');}
}

function schedSpellCheck(){
  if(!_spellActive)return;
  clearTimeout(_spellTimer);
  _spellTimer=setTimeout(runSpellCheck,2000);
}

function clearSpellMarks(){
  document.querySelectorAll('.page mark.spell-err').forEach(m=>{
    const p=m.parentNode;if(!p)return;
    while(m.firstChild)p.insertBefore(m.firstChild,m);
    p.removeChild(m);
  });
}

function runSpellCheck(){
  if(!_spellActive||!window._torahDict)return;
  clearSpellMarks();
  const savedSel=window.getSelection();
  const savedRange=savedSel?.rangeCount?savedSel.getRangeAt(0).cloneRange():null;
  const HEB=/[א-ת][א-תְ-ׇ׳״"'‍]*/g;
  const SKIP=new Set(['SCRIPT','STYLE','SUP','SUB']);
  document.querySelectorAll('.page').forEach(pg=>{
    const walker=document.createTreeWalker(pg,NodeFilter.SHOW_TEXT,{
      acceptNode:n=>{
        let p=n.parentNode;
        while(p&&p!==pg){
          if(SKIP.has(p.tagName)||p.classList?.contains('pg-num')||
             p.classList?.contains('fn-area')||p.classList?.contains('en-area')||
             p.classList?.contains('spell-err'))return NodeFilter.FILTER_REJECT;
          p=p.parentNode;
        }
        return HEB.test(n.textContent)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
      }
    });
    const nodes=[];let nd;
    while(nd=walker.nextNode())nodes.push(nd);
    nodes.forEach(tn=>{
      const txt=tn.textContent;
      const frag=document.createDocumentFragment();
      let last=0;HEB.lastIndex=0;let m;
      while((m=HEB.exec(txt))!==null){
        if(m.index>last)frag.appendChild(document.createTextNode(txt.slice(last,m.index)));
        const word=m[0];
        const clean=word.replace(/[ְ-ׇ]/g,'').replace(/״/g,'"').replace(/׳/g,"'");
        if(_torahDict.has(clean)||_userDict.has(clean)){
          frag.appendChild(document.createTextNode(word));
        }else{
          const mk=document.createElement('mark');mk.className='spell-err';mk.textContent=word;
          frag.appendChild(mk);
        }
        last=m.index+m[0].length;
      }
      if(last<txt.length)frag.appendChild(document.createTextNode(txt.slice(last)));
      tn.parentNode.replaceChild(frag,tn);
    });
  });
  if(savedRange){try{savedSel.removeAllRanges();savedSel.addRange(savedRange);}catch(e){}}
}

function ctxAddToDict(){
  if(!_ctxSpellWord)return;
  _userDict.add(_ctxSpellWord);
  try{localStorage.setItem('_otzw_userdict',JSON.stringify([..._userDict]));}catch(e){}
  // Remove the mark for this word
  document.querySelectorAll('.page mark.spell-err').forEach(m=>{
    const clean=m.textContent.replace(/[ְ-ׇ]/g,'').replace(/״/g,'"').replace(/׳/g,"'");
    if(clean===_ctxSpellWord){
      const p=m.parentNode;
      while(m.firstChild)p.insertBefore(m.firstChild,m);
      p.removeChild(m);
    }
  });
  notify('נוסף למילון: '+_ctxSpellWord);
}

/* ── PROTECTION ── */
function togDocProtect(){
  isDocProtected=!isDocProtected;
  document.querySelectorAll('.page').forEach(pg=>pg.contentEditable=isDocProtected?'false':'true');
  const btn=document.getElementById('protect-btn');
  btn.textContent=(isDocProtected?'🔓 בטל הגנה':'🔒 הגנת מסמך');
  btn.classList.toggle('on',isDocProtected);
  notify(isDocProtected?'🔒 המסמך מוגן מפני עריכה':'🔓 הגנה הוסרה');
}

/* ══ BOOK EDITOR ══ */
function setBookHeading(level){
  restoreSel();
  document.execCommand('formatBlock',false,'H'+level);
  schedSave();buildOutline();updFmt();
}
function togOutlinePanel(forceOpen){
  const panel=document.getElementById('outline-panel');
  const btn=document.getElementById('outline-btn');
  if(forceOpen===true){
    panel.classList.remove('hide');
    if(btn)btn.classList.add('on');
    buildOutline();
    return;
  }
  const hidden=panel.classList.contains('hide');
  panel.classList.toggle('hide',!hidden);
  if(btn)btn.classList.toggle('on',hidden);
  if(hidden)buildOutline();
}
function buildOutline(){
  const body=document.getElementById('outline-body');
  if(!body)return;
  const dp=document.getElementById('dp');
  const headers=dp.querySelectorAll('h1,h2,h3,h4,h5,h6');
  body.innerHTML='';
  if(headers.length===0){
    const p=document.createElement('p');
    p.style.cssText='font-size:.78em;color:#999;padding:10px';
    p.textContent='אין כותרות';
    body.appendChild(p);return;
  }
  headers.forEach(h=>{
    const level=parseInt(h.tagName[1]);
    const div=document.createElement('div');
    div.className='outline-item';
    div.style.paddingRight=((level-1)*10)+'px';
    div.style.fontWeight=level<=2?'600':'400';
    div.style.opacity=String(1-(level-1)*0.12);
    div.textContent=h.textContent.trim()||'(ריק)';
    div.onclick=()=>h.scrollIntoView({behavior:'smooth',block:'start'});
    body.appendChild(div);
  });
}
function replaceHeadingLvl(){
  const from=prompt('מאיזה רמת כותרת להחליף? (1-6)');
  if(!from)return;
  const to=prompt('לאיזה רמת כותרת? (1-6)');
  if(!to)return;
  const f=parseInt(from),t=parseInt(to);
  if(isNaN(f)||isNaN(t)||f<1||f>6||t<1||t>6){notify('רמה לא תקינה (1-6)');return;}
  const dp=document.getElementById('dp');
  let count=0;
  dp.querySelectorAll('h'+f).forEach(h=>{
    const nh=document.createElement('h'+t);
    nh.innerHTML=h.innerHTML;
    h.parentNode.replaceChild(nh,h);count++;
  });
  schedSave();buildOutline();notify('✓ הוחלפו '+count+' כותרות H'+f+' → H'+t);
}
function exportOtzaria(){
  const title=document.getElementById('doc-title').value||'ספר';
  const tmp=document.createElement('div');
  tmp.innerHTML=_getDocHTML();
  tmp.querySelectorAll('.pg-num,.fn-area,.en-area').forEach(e=>e.remove());
  tmp.querySelectorAll('.fn-exit').forEach(e=>e.remove());
  tmp.querySelectorAll('mark.spell-err').forEach(m=>{while(m.firstChild)m.parentNode.insertBefore(m.firstChild,m);m.remove();});
  tmp.querySelectorAll('mark.fhl').forEach(m=>{const p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);});
  function cleanNode(n){
    if(n.nodeType===3)return n.textContent;
    if(n.nodeType!==1)return'';
    const tag=n.tagName.toLowerCase();
    const ch=Array.from(n.childNodes).map(cleanNode).join('');
    if(/^h[1-6]$/.test(tag))return`<${tag}>${ch}</${tag}>\n`;
    if(tag==='p')return`<p>${ch}</p>\n`;
    if(tag==='strong'||tag==='b')return`<strong>${ch}</strong>`;
    if(tag==='em'||tag==='i')return`<em>${ch}</em>`;
    if(tag==='u')return`<u>${ch}</u>`;
    if(tag==='sup')return`<sup>${ch}</sup>`;
    if(tag==='sub')return`<sub>${ch}</sub>`;
    if(tag==='br')return'\n';
    if(tag==='hr')return'<hr/>\n';
    if(tag==='li')return`<li>${ch}</li>\n`;
    if(tag==='ul')return`<ul>\n${ch}</ul>\n`;
    if(tag==='ol')return`<ol>\n${ch}</ol>\n`;
    return ch;
  }
  let html=`<h1>${title}</h1>\n`;
  html+=Array.from(tmp.childNodes).map(cleanNode).join('');
  html=html.replace(/\n{3,}/g,'\n\n').trim();
  const blob=new Blob([html],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=title+'.txt';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  notify('✓ '+title+'.txt נשמר');
}
function importDocxForBooks(){
  if(typeof mammoth==='undefined'){notify('⚠ mammoth לא נטען');return;}
  const inp=document.createElement('input');
  inp.type='file';inp.accept='.docx';inp.style.display='none';
  document.body.appendChild(inp);
  inp.onchange=async e=>{
    document.body.removeChild(inp);
    const file=e.target.files[0];
    if(!file)return;
    notify('⏳ מייבא '+file.name+'...');
    try{
      const ab=await file.arrayBuffer();
      /* מיפוי סגנונות Word לתגי HTML — כולל שמות עבריים ואנגליים */
      const styleMap=[
        "p[style-name='כותרת 1'] => h1:fresh",
        "p[style-name='כותרת 2'] => h2:fresh",
        "p[style-name='כותרת 3'] => h3:fresh",
        "p[style-name='כותרת 4'] => h4:fresh",
        "p[style-name='כותרת 5'] => h5:fresh",
        "p[style-name='כותרת 6'] => h6:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='כותרת'] => h1:fresh",
        "p[style-name='1'] => h1:fresh",
        "p[style-name='2'] => h2:fresh",
        "p[style-name='3'] => h3:fresh",
        "p[style-name='4'] => h4:fresh",
        "p[style-name='5'] => h5:fresh",
        "p[style-name='6'] => h6:fresh",
        "r[style-name='Footnote Reference'] => sup",
        "r[style-name='Footnote anchor'] => sup",
      ];
      const result=await mammoth.convertToHtml(
        {arrayBuffer:ab},
        {
          styleMap,
          includeDefaultStyleMap:true,
          convertImage:mammoth.images.imgElement(img=>
            img.read('base64').then(data=>({
              src:'data:'+img.contentType+';base64,'+data,
              style:'max-width:100%;height:auto;display:block;margin:4px 0'
            }))
          )
        }
      );
      let html=result.value;
      const titleName=file.name.replace(/\.docx?$/i,'');
      if(!/<h1[\s>]/i.test(html))html=`<h1>${titleName}</h1>\n`+html;
      html=html.replace(/<p>\s*<\/p>/g,'').replace(/\n{3,}/g,'\n\n');
      _setDocHTML(html);
      document.getElementById('doc-title').value=titleName;
      if(docs[docIdx])docs[docIdx].title=titleName;_rebuildDocTabs();
      schedSave();schedRepaginate();togOutlinePanel(true);
      const warns=result.messages.filter(m=>m.type==='warning').length;
      notify('✓ יובא: '+file.name+(warns?' ('+warns+' הערות המרה)':''));
    }catch(err){notify('❌ שגיאה בייבוא: '+err.message);}
  };
  inp.click();
}

/* ══ FILE TAB ══ */
function newDoc(){newDocTab();}
function openDocFile(){
  const inp=document.createElement('input');
  inp.type='file';inp.accept='.docx,.html,.htm,.txt';inp.style.display='none';
  document.body.appendChild(inp);
  inp.onchange=async e=>{
    document.body.removeChild(inp);
    const file=e.target.files[0];if(!file)return;
    const dp=document.getElementById('dp');
    const titleName=file.name.replace(/\.[^.]+$/,'');
    if(file.name.match(/\.docx?$/i)){
      // Use mammoth for Word files — preserves formatting and handles Hebrew correctly
      if(typeof mammoth==='undefined'){notify('mammoth לא נטען');return;}
      notify('פותח '+file.name+'...');
      try{
        const ab=await file.arrayBuffer();
        const styleMap=[
          "p[style-name='כותרת 1'] => h1:fresh","p[style-name='כותרת 2'] => h2:fresh",
          "p[style-name='כותרת 3'] => h3:fresh","p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh","p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
        ];
        const result=await mammoth.convertToHtml({arrayBuffer:ab},{styleMap,includeDefaultStyleMap:true,
          convertImage:mammoth.images.imgElement(img=>img.read('base64').then(d=>({
            src:'data:'+img.contentType+';base64,'+d,style:'max-width:100%;height:auto;display:block;margin:4px 0'
          })))
        });
        let html=result.value;
        html=html.replace(/<p>\s*<\/p>/g,'').replace(/\n{3,}/g,'\n\n');
        _setDocHTML(html||'<p><br></p>');
      }catch(err){notify('שגיאה בפתיחה: '+err.message);return;}
    }else{
      const txt=await file.text();
      if(file.name.endsWith('.txt')){
        _setDocHTML(txt.split('\n').map(l=>`<p>${l.replace(/</g,'&lt;')||'<br>'}</p>`).join(''));
      }else{
        const m=txt.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        _setDocHTML(m?m[1]:txt);
      }
    }
    document.getElementById('doc-title').value=titleName;
    if(docs[docIdx])docs[docIdx].title=titleName;_rebuildDocTabs();
    // Do NOT show outline panel when opening via File tab
    const panel=document.getElementById('outline-panel');
    panel.classList.add('hide');
    document.getElementById('outline-btn')?.classList.remove('on');
    schedSave();updCount();updNav();setTimeout(doRepaginate,200);notify('נפתח: '+file.name);
  };
  inp.click();
}
function saveDocAs(){
  const curTitle=(document.getElementById('doc-title').value||'מסמך חדש').replace(/"/g,'&quot;');
  const dlg=makeDlg('שמור בשם');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <label>שם הקובץ:</label>
    <input id="sas-name" value="${curTitle}" style="direction:rtl"/>
    <label style="margin-top:12px">פורמט:</label>
    <div style="display:flex;flex-direction:column;gap:7px;margin-top:6px;padding:6px 0">
      <label style="font-size:.85em;display:flex;align-items:center;gap:8px;margin:0;cursor:pointer"><input type="radio" name="sas-fmt" value="html" checked/> HTML (.html)</label>
      <label style="font-size:.85em;display:flex;align-items:center;gap:8px;margin:0;cursor:pointer"><input type="radio" name="sas-fmt" value="txt"/> טקסט רגיל (.txt)</label>
      <label style="font-size:.85em;display:flex;align-items:center;gap:8px;margin:0;cursor:pointer"><input type="radio" name="sas-fmt" value="docx"/> Word (.docx)</label>
    </div>`;
  dlg.querySelector('#sas-name').focus();
  addDlgBtn(dlg,'שמור',()=>{
    const title=dlg.querySelector('#sas-name').value.trim()||'מסמך חדש';
    const fmt=dlg.querySelector('input[name="sas-fmt"]:checked').value;
    document.getElementById('doc-title').value=title;
    if(docs[docIdx])docs[docIdx].title=title;
    dlg.remove();
    if(fmt==='html'){
      const html=`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/><title>${title}</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt;direction:rtl;padding:60px 80px;line-height:1.5">${_getDocHTML()}</body></html>`;
      _dlBlob(html,'text/html;charset=utf-8',title+'.html');
    }else if(fmt==='txt'){
      _dlBlob(_getDocText(),'text/plain;charset=utf-8',title+'.txt');
    }else if(fmt==='docx'){
      exportDocx();return;
    }
    schedSave();notify('נשמר: '+title);
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
function _dlBlob(content,type,filename){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}
function clearAllData(){
  if(!confirm('למחוק את כל הנתונים השמורים ולהתחיל מחדש?'))return;
  try{Object.keys(localStorage).filter(k=>k.startsWith('_otzw_')).forEach(k=>localStorage.removeItem(k));}catch(e){}
  docs=[{id:0,title:'מסמך חדש',content:'<p><br></p>',scroll:0,fn:0,en:0}];
  docIdx=0;_docIdCtr=1;macros=[];archive=[];comments=[];cmCount=0;
  stickies=[];_stickyIdCtr=1;stickiesVisible=true;
  clips=[];_clipIdCtr=1;
  document.querySelectorAll('.sticky').forEach(s=>s.remove());
  _loadDocState(0);
  notify('נתונים נוקו — מסמך חדש');
}

function showPluginInfo(){
  const dlg=makeDlg('אודות וורד לאוצריא');
  dlg.querySelector('.dlg-bd').innerHTML=`
    <div style="text-align:center;padding:10px 0 16px">
      <div style="margin-bottom:10px"><span class="tbl" style="font-size:2.2em;padding:6px 14px;border-radius:8px">W</span></div>
      <div style="font-size:1.1em;font-weight:700;color:var(--wb);margin-bottom:4px">וורד לאוצריא</div>
      <div style="font-size:.82em;color:#666;margin-bottom:12px">גרסה 1.2.6</div>
      <div style="font-size:.84em;color:#444;line-height:1.7">
        <div>מחבר: <strong>יאיר דניאל</strong></div>
        <div style="margin-top:8px;font-size:.9em;color:#666">עורך מסמכים בסגנון Word לכתיבת חידושי תורה,<br>עם שילוב מלא עם ספריית אוצריא</div>
      </div>
    </div>
    <div style="border-top:1px solid #e8e8e8;padding-top:10px;font-size:.76em;color:#888;text-align:center;line-height:1.9">
      <strong>חידושים בגרסה זו:</strong><br>
      undo/redo מלא • בדיקת איות תורני (102,000+ מילים)<br>
      סגנונות מאוחדים • זיהוי פונטים משופר • תיקוני ניווט וחלונית
    </div>`;
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}

/* ── SYSTEM FONTS ── */
async function loadSystemFonts(){
  // Priority fonts shown first
  const base=[
    'Times New Roman','David','Frank Ruhl Libre','Arial','Rubik','Calibri',
    'Courier New','Georgia','Verdana','Tahoma','Segoe UI','Assistant','Heebo',
    'Open Sans','Noto Sans Hebrew','Narkisim','Levenim MT','Miriam','FrankRuehl',
    'Guttman Aharoni','Guttman Frank','Guttman Yad','SBL Hebrew','Ezra SIL',
    'Rashi','Keter YG','Arial Hebrew','David CLM','Miriam CLM','Alef','Tinos',
  ];
  // Large probe list — fonts that might be installed on Windows/Mac/Linux
  const probeList=[
    // Hebrew / Israeli
    'Alef','Almoni','Almoni DL AAA','Almoni Neue','Almoni Tzar AAA',
    'Arial Hebrew','David','David CLM','DejaVu Sans','DejaVu Serif',
    'Ezra SIL','Frank Ruhl Libre','FrankRuehl','Guttman Aharoni',
    'Guttman Drogolin','Guttman Frank','Guttman Haim','Guttman Keren',
    'Guttman Stam','Guttman Yad','Heebo','Keter YG','Keter YG Bold',
    'Levenim MT','Miriam','Miriam CLM','Miriam Fixed','Narkisim',
    'Noto Rashi Hebrew','Noto Sans Hebrew','Noto Serif Hebrew',
    'Rashi','Rubik','SBL Hebrew','SBL_Hbrw','Shefa','ShefaClassic','Simple CLM',
    'Tehila','TehilaMedium','Tehila Medium','Tinos','Yehuda CLM',
    // Windows built-in
    'Agency FB','Aharoni','Algerian','Arial','Arial Black','Arial Narrow',
    'Arial Rounded MT Bold','Bahnschrift','Baskerville Old Face','Bauhaus 93',
    'Bell MT','Berlin Sans FB','Bernard MT Condensed','Blackadder ITC',
    'Bodoni MT','Book Antiqua','Bookman Old Style','Bookshelf Symbol 7',
    'Bradley Hand ITC','Britannic Bold','Broadway','Brush Script MT',
    'Calibri','Calibri Light','Californian FB','Calisto MT','Cambria',
    'Cambria Math','Candara','Century','Century Gothic','Century Schoolbook',
    'Chiller','Colonna MT','Comic Sans MS','Consolas','Constantia','Cooper Black',
    'Copperplate Gothic Bold','Copperplate Gothic Light','Corbel','Courier New',
    'Curlz MT','Dubai','Ebrima','Edwardian Script ITC','Elephant','Engravers MT',
    'Eras Bold ITC','Eras Demi ITC','Eras Light ITC','Eras Medium ITC',
    'Felix Titling','Footlight MT Light','Forte','Franklin Gothic Book',
    'Franklin Gothic Demi','Franklin Gothic Heavy','Franklin Gothic Medium',
    'Franklin Gothic Medium Cond','Freestyle Script','French Script MT',
    'Garamond','Gigi','Gill Sans MT','Gill Sans MT Condensed','Gill Sans Ultra Bold',
    'Gloucester MT Extra Condensed','Goudy Old Style','Goudy Stout','Haettenschweiler',
    'Harlow Solid Italic','Harrington','High Tower Text','HoloLens MDL2 Assets',
    'Impact','Imprint MT Shadow','Informal Roman','Javanese Text','Jokerman',
    'Juice ITC','Kristen ITC','Kunstler Script','Leelawadee','Leelawadee UI',
    'Lucida Bright','Lucida Calligraphy','Lucida Console','Lucida Fax',
    'Lucida Handwriting','Lucida Sans','Lucida Sans Typewriter','Lucida Sans Unicode',
    'Magneto','Maiandra GD','Malgun Gothic','Matura MT Script Capitals',
    'Microsoft Himalaya','Microsoft JhengHei','Microsoft New Tai Lue',
    'Microsoft PhagsPa','Microsoft Sans Serif','Microsoft Tai Le','Microsoft YaHei',
    'Microsoft Yi Baiti','MingLiU-ExtB','Mistral','Modern No. 20','Mongolian Baiti',
    'Monotype Corsiva','MV Boli','Myanmar Text','Niagara Engraved','Niagara Solid',
    'Nirmala UI','OCR A Extended','Old English Text MT','Onyx','Palatino Linotype',
    'Papyrus','Parchment','Perpetua','Perpetua Titling MT','Playbill',
    'Poor Richard','Pristina','Rage Italic','Ravie','Rockwell','Rockwell Condensed',
    'Rockwell Extra Bold','Script MT Bold','Segoe MDL2 Assets','Segoe Print',
    'Segoe Script','Segoe UI','Segoe UI Black','Segoe UI Emoji','Segoe UI Historic',
    'Segoe UI Light','Segoe UI Semibold','Segoe UI Semilight','Segoe UI Symbol',
    'Showcard Gothic','SimSun-ExtB','Sitka Banner','Sitka Display','Sitka Heading',
    'Sitka Small','Sitka Subheading','Sitka Text','Snap ITC','Stencil','Symbol',
    'Sylfaen','Tempus Sans ITC','Times New Roman','Trebuchet MS','Tw Cen MT',
    'Tw Cen MT Condensed','Viner Hand ITC','Vivaldi','Vladimir Script',
    'Webdings','Wide Latin','Wingdings','Wingdings 2','Wingdings 3','Yu Gothic',
    // Office additional
    'Abadi MT Condensed','Abadi MT Condensed Extra Bold','Abadi MT Condensed Light',
    'Blackoak Std','Charcoal CY','Geneva CY','Monaco','Myriad Pro','Minion Pro',
    'Adobe Caslon Pro','Adobe Garamond Pro','Arno Pro','Chaparral Pro','Cronos Pro',
    // Google Fonts (commonly downloaded)
    'Barlow','Barlow Condensed','Barlow Semi Condensed','Bebas Neue','Bitter',
    'Black Han Sans','Cabin','Caveat','Chakra Petch','Cinzel','Comfortaa',
    'Crimson Text','Dancing Script','DM Sans','DM Serif Display','Exo 2',
    'Fira Code','Fira Mono','Fira Sans','Fira Sans Condensed','Fjalla One',
    'IBM Plex Mono','IBM Plex Sans','IBM Plex Serif','Inconsolata','Inter',
    'Josefin Sans','Josefin Slab','Karla','Lato','Libre Baskerville',
    'Libre Franklin','Literata','Lobster','Lora','Manrope','Merriweather',
    'Merriweather Sans','Montserrat','Montserrat Alternates','Mukta','Mulish',
    'Noto Color Emoji','Noto Mono','Noto Sans','Noto Serif','Nunito','Nunito Sans',
    'Open Sans Condensed','Oswald','Overpass','Oxygen','Pacifico','Philosopher',
    'Playfair Display','Playfair Display SC','Poppins','Prompt','PT Mono',
    'PT Sans','PT Sans Caption','PT Sans Narrow','PT Serif','PT Serif Caption',
    'Quicksand','Raleway','Roboto','Roboto Condensed','Roboto Mono','Roboto Slab',
    'Secular One','Sigmar One','Source Code Pro','Source Sans Pro','Source Serif Pro',
    'Space Grotesk','Space Mono','Spectral','Titillium Web','Ubuntu','Ubuntu Condensed',
    'Ubuntu Mono','Varela Round','Vollkorn','Work Sans','Yanone Kaffeesatz','Zilla Slab',
  ];

  const available=[];
  let gotAll=false;

  // Method 1: queryLocalFonts() API — returns ALL installed fonts (Chrome 103+)
  try{
    if(typeof window.queryLocalFonts==='function'){
      const localFonts=await window.queryLocalFonts();
      const families=[...new Set(localFonts.map(f=>f.family))];
      if(families.length>5){available.push(...families);gotAll=true;}
    }
  }catch(e){}

  // Method 2: FontFace local() probe — reliable for WebView environments
  if(!gotAll){
    const toProbe=[...new Set([...base,...probeList])];
    const results=await Promise.allSettled(
      toProbe.map(name=>{
        const ff=new FontFace('_fp_'+name.replace(/\W/g,'_'),`local('${name}')`);
        return ff.load().then(()=>name);
      })
    );
    results.forEach(r=>{if(r.status==='fulfilled')available.push(r.value);});

    // Method 3: canvas cross-check for any font that slipped through
    if(available.length<5){
      const canvas=document.createElement('canvas');
      const ctx=canvas.getContext('2d');
      ctx.font='16px monospace';
      const bw=ctx.measureText('AaBbCc012אבג').width;
      toProbe.forEach(font=>{
        ctx.font=`16px '${font}',monospace`;
        if(Math.abs(ctx.measureText('AaBbCc012אבג').width-bw)>0.5&&!available.includes(font))
          available.push(font);
      });
    }

    // Add any loaded web fonts
    try{
      await document.fonts.ready;
      document.fonts.forEach(f=>{
        const nm=f.family.replace(/['"]/g,'');
        if(!available.includes(nm))available.push(nm);
      });
    }catch(e){}
  }

  // Single unified list sorted A-Z (no separate base section)
  const final=[...new Set([...base,...available])].sort((a,b)=>a.localeCompare(b));

  _fontCatalog=final.map(f=>({label:f,value:`'${f}',sans-serif`}));
  _renderFontDD(_fontCatalog);

  const fdFn=document.getElementById('fd-fn');
  if(fdFn){
    const toOpt=f=>`<option value="'${f}',sans-serif">${f}</option>`;
    fdFn.innerHTML=final.map(toOpt).join('');
  }
}

/* ══ OTZARIA THEME ══ */
let _lastOtzTheme=null;
function applyOtzTheme(theme){
  if(!theme)return;
  _lastOtzTheme=theme;
  const cs=theme.colorScheme;
  const isDark=theme.mode==='dark';
  const root=document.documentElement;
  if(cs){
    if(cs.primary){
      root.style.setProperty('--color-primary',cs.primary);
      root.style.setProperty('--color-on-primary',cs.onPrimary||'#ffffff');
      root.style.setProperty('--wb',cs.primary);
      root.style.setProperty('--otz',cs.primary);
      root.style.setProperty('--bh',_rgba(cs.primary,.12));
      root.style.setProperty('--ba',_rgba(cs.primary,.28));
      root.style.setProperty('--wb-lt',_rgba(cs.primary,.12));
      root.style.setProperty('--color-primary-subtle',_rgba(cs.primary,.12));
      root.style.setProperty('--color-focus-ring',_rgba(cs.primary,.22));
      root.style.setProperty('--color-border-hover',_rgba(cs.primary,.35));
      root.style.setProperty('--color-border-active',_rgba(cs.primary,.60));
    }
    if(cs.secondary){
      root.style.setProperty('--color-secondary',cs.secondary);
      root.style.setProperty('--color-on-secondary',cs.onSecondary||'#ffffff');
      root.style.setProperty('--wb-dk',cs.secondary);
      root.style.setProperty('--color-secondary-subtle',_rgba(cs.secondary,.12));
    }
    if(cs.surface){
      root.style.setProperty('--color-surface',cs.surface);
      root.style.setProperty('--rb',cs.surface);
      root.style.setProperty('--canvas',isDark?'#252525':'#d2d2d2');
    }
    if(cs.onSurface)root.style.setProperty('--color-on-surface',cs.onSurface);
    if(cs.outline){
      root.style.setProperty('--color-outline',cs.outline);
      root.style.setProperty('--rbb',cs.outline);
    }
    if(cs.error){
      root.style.setProperty('--color-error',cs.error);
      root.style.setProperty('--color-on-error',cs.onError||'#ffffff');
    }
  }
  if(theme.typography){
    const t=theme.typography;
    root.style.setProperty('--font-main',`'${t.fontFamily}', 'David', serif`);
    root.style.setProperty('--font-size-base',`${t.fontSize}px`);
    root.style.setProperty('--line-height',String(t.lineHeight));
  }
  document.body.classList.toggle('dark-mode',isDark);
  document.body.classList.add('otz-theme');
  document.getElementById('tt-btn').textContent='Word';
}
function _rgba(hex,a){
  if(!hex||!hex.startsWith('#'))return`rgba(103,80,164,${a})`;
  const r=parseInt(hex.slice(1,3),16)||0,g=parseInt(hex.slice(3,5),16)||0,b=parseInt(hex.slice(5,7),16)||0;
  return`rgba(${r},${g},${b},${a})`;
}
function _darken(hex,amt){
  if(!hex||!hex.startsWith('#')||hex.length<7)return'#1a4480';
  const d=Math.round(255*amt);
  const r=Math.max(0,parseInt(hex.slice(1,3),16)-d);
  const g=Math.max(0,parseInt(hex.slice(3,5),16)-d);
  const b=Math.max(0,parseInt(hex.slice(5,7),16)-d);
  return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

/* ── NOTIFY ── */
function notify(msg){
  const n=document.createElement('div');
  n.textContent=msg;
  n.style.cssText='position:fixed;bottom:32px;right:16px;background:#333;color:#fff;padding:6px 14px;border-radius:4px;font-size:.82em;z-index:9999;pointer-events:none;opacity:1;transition:opacity .4s';
  document.body.appendChild(n);
  setTimeout(()=>{n.style.opacity='0';setTimeout(()=>n.remove(),400);},2200);
}

/* ══ NOTES TAB ══ */

/* ── TAGS ── */
function addTag(type){
  const info=_tagTypes[type];if(!info)return;
  if(!savedRange||savedRange.collapsed){notify('יש לסמן טקסט תחילה');return;}
  restoreSel();
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount||sel.getRangeAt(0).collapsed){notify('יש לסמן טקסט תחילה');return;}
  const range=sel.getRangeAt(0);
  const selText=sel.toString();
  const mark=document.createElement('span');
  mark.className='tag '+info.cls;mark.dataset.tagType=type;mark.title=info.label;
  try{range.surroundContents(mark);}
  catch(e){ex('insertHTML',`<span class="tag ${info.cls}" data-tag-type="${type}" title="${info.label}">${selText.replace(/</g,'&lt;')}</span>`);}
  saveSnapshot();schedSave();notify('✓ תגית: '+info.label);
}
function removeTag(){
  restoreSel();
  const sel=window.getSelection();if(!sel||!sel.rangeCount)return;
  const node=sel.focusNode?.nodeType===3?sel.focusNode.parentElement:sel.focusNode;
  const tag=node?.closest?.('.tag');
  if(!tag){notify('לחץ בתוך תגית להסרתה');return;}
  const p=tag.parentNode;
  while(tag.firstChild)p.insertBefore(tag.firstChild,tag);
  p.removeChild(tag);
  saveSnapshot();schedSave();notify('✓ תגית הוסרה');
}
function showTagNav(){
  const dlg=makeDlg('ניווט תגיות');
  const tags=[...document.querySelectorAll('.page .tag')];
  if(!tags.length){
    dlg.querySelector('.dlg-bd').innerHTML='<p style="font-size:.82em;color:#999;padding:8px">אין תגיות במסמך</p>';
    addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);return;
  }
  const rows=tags.map((t,i)=>{
    const info=_tagTypes[t.dataset.tagType]||{label:'תגית',cls:''};
    return`<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;cursor:pointer;border-radius:var(--radius-xs);font-size:.82em" class="_tnr" data-i="${i}" onmouseover="this.style.background='var(--bh)'" onmouseout="this.style.background=''">
      <span class="tag ${info.cls}" style="flex-shrink:0">${info.label}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.textContent.slice(0,40)}</span>
    </div>`;
  }).join('');
  dlg.querySelector('.dlg-bd').innerHTML=`<div style="max-height:260px;overflow-y:auto">${rows}</div>`;
  dlg.querySelectorAll('._tnr').forEach(item=>{
    item.addEventListener('click',()=>{tags[+item.dataset.i].scrollIntoView({behavior:'smooth',block:'center'});dlg.remove();});
  });
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}

/* ── STICKIES ── */
function addSticky(color='yellow'){
  const dw=document.getElementById('dw');
  const id=_stickyIdCtr++;
  const x=dw.scrollLeft+20+Math.round(Math.random()*40);
  const y=dw.scrollTop+100+Math.round(Math.random()*40);
  const s={id,color,text:'',x,y};
  stickies.push(s);_renderStickyEl(s);schedSave();
}
function _renderStickyEl(s){
  const dw=document.getElementById('dw');
  const el=document.createElement('div');
  el.className=`sticky sticky-${s.color}`;el.id='sticky-'+s.id;
  el.style.cssText=`left:${s.x}px;top:${s.y}px;`;
  if(!stickiesVisible)el.style.display='none';
  el.innerHTML=`<div class="sticky-hd">
    <span style="pointer-events:none;opacity:.7">📌 פתקית</span>
    <button class="sticky-del" onclick="delSticky(${s.id})" title="מחק">✕</button>
  </div>
  <textarea class="sticky-body" placeholder="כתוב כאן...">${s.text.replace(/</g,'&lt;')}</textarea>`;
  el.querySelector('textarea').addEventListener('input',function(){updStickyText(s.id,this.value);});
  dw.appendChild(el);
  _makeDraggable(el,el.querySelector('.sticky-hd'),s.id);
}
function _makeDraggable(el,handle,id){
  let ox=0,oy=0,sx=0,sy=0;
  handle.addEventListener('mousedown',e=>{
    if(e.target.tagName==='BUTTON')return;
    e.preventDefault();
    sx=e.clientX;sy=e.clientY;
    ox=parseInt(el.style.left)||0;oy=parseInt(el.style.top)||0;
    const onMove=ev=>{el.style.left=(ox+ev.clientX-sx)+'px';el.style.top=(oy+ev.clientY-sy)+'px';};
    const onUp=()=>{
      document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);
      const st=stickies.find(s=>s.id===id);
      if(st){st.x=parseInt(el.style.left)||0;st.y=parseInt(el.style.top)||0;}
      schedSave();
    };
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  });
}
function updStickyText(id,text){
  const s=stickies.find(x=>x.id===id);if(s)s.text=text;schedSave();
}
function delSticky(id){
  stickies=stickies.filter(s=>s.id!==id);
  document.getElementById('sticky-'+id)?.remove();schedSave();
}
function togStickies(){
  stickiesVisible=!stickiesVisible;
  document.querySelectorAll('.sticky').forEach(s=>s.style.display=stickiesVisible?'':'none');
}
function clearStickies(){
  if(!stickies.length)return;
  if(!confirm('למחוק את כל הפתקיות?'))return;
  stickies=[];document.querySelectorAll('.sticky').forEach(s=>s.remove());schedSave();
}
function renderStickies(){
  document.querySelectorAll('.sticky').forEach(s=>s.remove());
  stickies.forEach(s=>_renderStickyEl(s));
}

/* ── CLIPS ── */
function saveClip(){
  if(!savedRange||savedRange.collapsed){notify('יש לסמן טקסט לשמירה');return;}
  restoreSel();
  const sel=window.getSelection();
  if(!sel||sel.isCollapsed){notify('יש לסמן טקסט לשמירה');return;}
  const text=sel.toString().trim();if(!text)return;
  const id=_clipIdCtr++;
  const title=text.slice(0,30)+(text.length>30?'...':'');
  clips.push({id,title,text,date:new Date().toLocaleDateString('he-IL')});
  schedSave();notify('✓ גזרייה נשמרה');
}
function showClipsPanel(){
  const dlg=makeDlg('גזרים שמורים');
  if(!clips.length){
    dlg.querySelector('.dlg-bd').innerHTML='<p style="font-size:.82em;color:#999;padding:8px">אין גזרים שמורים</p>';
  }else{
    const rows=clips.map(c=>`
      <div style="border:1px solid var(--color-border-light);border-radius:var(--radius-sm);padding:7px 10px;margin-bottom:6px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:.82em;color:var(--color-text-primary)">${c.title.replace(/</g,'&lt;')}</strong>
          <span style="font-size:.72em;color:var(--color-text-muted)">${c.date}</span>
        </div>
        <div style="font-size:.78em;color:var(--color-text-secondary);line-height:1.5;max-height:48px;overflow:hidden">${c.text.replace(/</g,'&lt;').replace(/\n/g,' ')}</div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="dbtn p" style="font-size:.72em;padding:2px 8px" onclick="_doInsertClip(${c.id})">הכנס</button>
          <button class="dbtn s" style="font-size:.72em;padding:2px 8px" onclick="_doDelClip(${c.id})">מחק</button>
        </div>
      </div>`).join('');
    dlg.querySelector('.dlg-bd').innerHTML=`<div style="max-height:340px;overflow-y:auto;min-width:300px">${rows}</div>`;
  }
  addDlgBtn(dlg,'סגור',()=>dlg.remove(),false);
}
function _doInsertClip(id){
  const c=clips.find(x=>x.id===id);if(!c)return;
  restoreSel();ex('insertText',c.text);
  schedSave();notify('✓ גזרייה הוכנסה');
  document.querySelector('.dlg-back')?.remove();
}
function _doDelClip(id){
  clips=clips.filter(c=>c.id!==id);schedSave();notify('✓ גזרייה נמחקה');
  document.querySelector('.dlg-back')?.remove();
  showClipsPanel();
}