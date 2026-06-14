'use strict';

/* ══ GLOBAL STATE ══ */

// View / editing
let zoom = 100, autoSave, countTimer, navTimer;
let macros = [], archive = [], navMode = 'h';
let fhlList = [], fhlIdx = 0, savedRange = null;
let fnCount = 0, enCount = 0;
let isReadMode = false, isPainting = false, paintData = null;
let isRecording = false, recActions = [], recName = '', recBuf = '';
let _skipPasteRecord = false;
let hasPageBorder = false;

// Multi-doc tabs
let docs = [{id:0, title:'מסמך חדש', content:'<p><br></p>', scroll:0, fn:0, en:0}];
let docIdx = 0, _docIdCtr = 1;

// Review
let cmCount = 0, comments = [], isTrackChanges = false, isDocProtected = false;

// Design themes
const THEMES = {
  default: {wb:'#2b579a',wbdk:'#1a4480',wblt:'#dce6f7',bh:'rgba(43,87,154,.13)',ba:'rgba(43,87,154,.28)',h1b:'#111',h2:'#2e74b5',h3:'#1f3763'},
  modern:  {wb:'#6750A4',wbdk:'#4a3780',wblt:'#e8def8',bh:'rgba(103,80,164,.13)',ba:'rgba(103,80,164,.28)',h1b:'#6750A4',h2:'#6750A4',h3:'#3d1f87'},
  classic: {wb:'#8b0000',wbdk:'#660000',wblt:'#fce8e8',bh:'rgba(139,0,0,.13)',ba:'rgba(139,0,0,.28)',h1b:'#8b0000',h2:'#8b0000',h3:'#5c3317'},
  minimal: {wb:'#444444',wbdk:'#222222',wblt:'#f0f0f0',bh:'rgba(68,68,68,.13)',ba:'rgba(68,68,68,.28)',h1b:'#555',h2:'#333',h3:'#555'},
  elegant: {wb:'#2e5931',wbdk:'#1a3a1c',wblt:'#e2f0e3',bh:'rgba(46,89,49,.13)',ba:'rgba(46,89,49,.28)',h1b:'#2e5931',h2:'#2e5931',h3:'#1a3a1c'},
};
