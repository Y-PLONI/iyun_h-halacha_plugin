'use strict';

/* ══ UTILITIES — notify, dialogs, theme, color, fonts ══ */

/* ── NOTIFY ── */
function notify(msg) {
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.cssText = 'position:fixed;bottom:32px;right:16px;background:#333;color:#fff;padding:6px 14px;border-radius:4px;font-size:.82em;z-index:9999;pointer-events:none;opacity:1;transition:opacity .4s';
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 400); }, 2200);
}

/* ── DIALOG HELPERS ── */
function makeDlg(title) {
  const b = document.createElement('div');
  b.className = 'dlg-back';
  b.innerHTML = `<div class="dlg" onclick="event.stopPropagation()">
    <div class="dlg-hd"><span>${title}</span><button onclick="this.closest('.dlg-back').remove()">&#x2715;</button></div>
    <div class="dlg-bd"></div><div class="dlg-ft"></div>
  </div>`;
  b.addEventListener('click', () => b.remove());
  document.body.appendChild(b);
  return b;
}
function addDlgBtn(dlg, label, fn, primary = true) {
  const btn = document.createElement('button');
  btn.className = 'dbtn ' + (primary ? 'p' : 's');
  btn.textContent = label;
  btn.addEventListener('click', fn);
  dlg.querySelector('.dlg-ft').appendChild(btn);
}

/* ── FILE DOWNLOAD ── */
function _dlBlob(content, type, filename) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

/* ── COLOR UTILITIES ── */
function _rgba(hex, a) {
  if (!hex || !hex.startsWith('#')) return `rgba(103,80,164,${a})`;
  const r = parseInt(hex.slice(1,3),16)||0, g = parseInt(hex.slice(3,5),16)||0, b = parseInt(hex.slice(5,7),16)||0;
  return `rgba(${r},${g},${b},${a})`;
}
function _darken(hex, amt) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#1a4480';
  const d = Math.round(255 * amt);
  const r = Math.max(0, parseInt(hex.slice(1,3),16) - d);
  const g = Math.max(0, parseInt(hex.slice(3,5),16) - d);
  const b = Math.max(0, parseInt(hex.slice(5,7),16) - d);
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

/* ── ABOUT DIALOG ── */
function showPluginInfo() {
  const dlg = makeDlg('אודות וורד לאוצריא');
  dlg.querySelector('.dlg-bd').innerHTML = `
    <div style="text-align:center;padding:10px 0 16px">
      <div style="margin-bottom:10px"><span class="tbl" style="font-size:2.2em;padding:6px 14px;border-radius:8px">W</span></div>
      <div style="font-size:1.1em;font-weight:700;color:var(--wb);margin-bottom:4px">וורד לאוצריא</div>
      <div style="font-size:.82em;color:#666;margin-bottom:12px">גרסה 1.3.0</div>
      <div style="font-size:.84em;color:#444;line-height:1.7">
        <div>מחבר: <strong>יאיר דניאל</strong></div>
        <div style="margin-top:8px;font-size:.9em;color:#666">עורך מסמכים בסגנון Word לכתיבת חידושי תורה,<br>עם שילוב מלא עם ספריית אוצריא</div>
      </div>
    </div>
    <div style="border-top:1px solid #e8e8e8;padding-top:10px;font-size:.76em;color:#888;text-align:center">
      וורד לאוצריא &bull; אוצריא Plugin
    </div>`;
  addDlgBtn(dlg, 'סגור', () => dlg.remove(), false);
}

/* ── OTZARIA THEME ── */
function applyOtzTheme(theme) {
  if (!theme) return;
  const cs = theme.colorScheme;
  const isDark = theme.mode === 'dark';
  const root = document.documentElement;
  if (cs) {
    if (cs.primary) {
      root.style.setProperty('--color-primary',   cs.primary);
      root.style.setProperty('--color-on-primary', cs.onPrimary || '#ffffff');
      root.style.setProperty('--wb',  cs.primary);
      root.style.setProperty('--bh',  _rgba(cs.primary, .12));
      root.style.setProperty('--ba',  _rgba(cs.primary, .28));
      root.style.setProperty('--wb-lt', _rgba(cs.primary, .12));
      root.style.setProperty('--color-primary-subtle', _rgba(cs.primary, .12));
      root.style.setProperty('--color-focus-ring',   _rgba(cs.primary, .22));
      root.style.setProperty('--color-border-hover', _rgba(cs.primary, .35));
      root.style.setProperty('--color-border-active',_rgba(cs.primary, .60));
    }
    if (cs.secondary) {
      root.style.setProperty('--color-secondary',   cs.secondary);
      root.style.setProperty('--color-on-secondary', cs.onSecondary || '#ffffff');
      root.style.setProperty('--wb-dk', cs.secondary);
      root.style.setProperty('--color-secondary-subtle', _rgba(cs.secondary, .12));
    }
    if (cs.surface) {
      root.style.setProperty('--color-surface', cs.surface);
      root.style.setProperty('--rb', cs.surface);
      root.style.setProperty('--canvas', isDark ? '#252525' : '#d2d2d2');
    }
    if (cs.onSurface) {
      root.style.setProperty('--color-on-surface', cs.onSurface);
    }
    if (cs.outline) {
      root.style.setProperty('--color-outline', cs.outline);
      root.style.setProperty('--rbb', cs.outline);
    }
    if (cs.surfaceContainerHighest)
      root.style.setProperty('--color-surface-container-highest', cs.surfaceContainerHighest);
    if (cs.error) {
      root.style.setProperty('--color-error', cs.error);
      root.style.setProperty('--color-on-error', cs.onError || '#ffffff');
    }
  }
  if (theme.typography) {
    const t = theme.typography;
    root.style.setProperty('--font-main', `'${t.fontFamily}', 'David', serif`);
    root.style.setProperty('--font-size-base', `${t.fontSize}px`);
    root.style.setProperty('--line-height', String(t.lineHeight));
  }
  document.body.classList.toggle('dark-mode', isDark);
  document.body.classList.add('otz-theme');
  document.getElementById('tt-btn').textContent = 'Word';
}

/* ── FONT PICKER ── */
let _fontCatalog = []; // [{label, value}]

function openFontPicker() {
  const dd = document.getElementById('fp-dd');
  if (!dd) return;
  dd.classList.add('open');
  if (!dd.children.length && _fontCatalog.length) _renderFontDD(_fontCatalog);
}
function closeFontPicker() {
  document.getElementById('fp-dd')?.classList.remove('open');
}
function filterFontPicker(q) {
  const dd = document.getElementById('fp-dd');
  if (!dd) return;
  dd.classList.add('open');
  const lower = q.toLowerCase();
  [...dd.children].forEach(item => { item.style.display = item.dataset.n.toLowerCase().includes(lower) ? '' : 'none'; });
}
function _renderFontDD(list) {
  const dd = document.getElementById('fp-dd');
  if (!dd) return;
  dd.innerHTML = '';
  list.forEach(f => {
    const div = document.createElement('div');
    div.className = 'fp-item';
    div.dataset.n = f.label;
    div.textContent = f.label;
    div.style.fontFamily = f.value;
    div.addEventListener('mousedown', e => { e.preventDefault(); _pickFont(f); });
    dd.appendChild(div);
  });
}
function _pickFont(f) {
  const inp = document.getElementById('sf');
  if (inp) inp.value = f.label;
  closeFontPicker();
  applyFont(f.value);
}

/* ── SYSTEM FONTS ── */
async function loadSystemFonts() {
  const base = ['Times New Roman','David','Frank Ruhl Libre','Arial','Rubik','Calibri','Courier New','Georgia','Verdana','Tahoma','Segoe UI','Assistant','Heebo','Open Sans','Noto Sans Hebrew'];
  const fallbackList = [
    // Hebrew
    'Alef','Almoni','Almoni DL AAA','Almoni Neue','Arial Hebrew','David CLM','DejaVu Sans','DejaVu Serif',
    'Ezra SIL','FrankRuehl','Guttman Aharoni','Guttman Drogolin','Guttman Frank','Guttman Haim',
    'Guttman Keren','Guttman Stam','Guttman Yad','Keter YG','Keter YG Bold','Levenim MT',
    'Miriam','Miriam CLM','Miriam Fixed','Narkisim','Rashi','SBL Hebrew','Simple CLM','Tinos','Yehuda CLM',
    // Windows
    'Arial Black','Arial Narrow','Arial Rounded MT Bold','Bahnschrift','Book Antiqua','Bookman Old Style',
    'Calibri Light','Cambria','Cambria Math','Candara','Century','Century Gothic','Comic Sans MS',
    'Consolas','Constantia','Corbel','Ebrima','Franklin Gothic Medium','Garamond',
    'Gil Sans MT','Impact','Lucida Console','Lucida Sans Unicode',
    'Microsoft Sans Serif','Palatino Linotype','Segoe Print','Segoe Script',
    'Segoe UI Light','Segoe UI Semibold','Symbol','Trebuchet MS','Wingdings',
    // Mac
    'Andale Mono','Apple Chancery','Brush Script MT','Chalkboard','Chalkduster','Cochin',
    'Copperplate','Didot','Futura','Geneva','Gill Sans','Helvetica','Helvetica Neue',
    'Hoefler Text','Lucida Grande','Marker Felt','Menlo','Monaco','Optima','Papyrus',
    // Google / web common
    'Barlow','Bebas Neue','Bitter','Cabin','DM Sans','Exo 2','Fira Code','Fira Sans',
    'IBM Plex Mono','IBM Plex Sans','Inconsolata','Inter','Josefin Sans','Lato',
    'Libre Baskerville','Libre Franklin','Merriweather','Montserrat','Mulish',
    'Noto Sans','Noto Serif','Nunito','Nunito Sans','Oswald','Playfair Display',
    'Poppins','PT Mono','PT Sans','PT Serif','Quicksand','Raleway','Roboto',
    'Roboto Condensed','Roboto Mono','Roboto Slab','Source Code Pro','Source Sans Pro',
    'Space Grotesk','Ubuntu','Ubuntu Mono','Work Sans',
  ];

  const available = [];
  let gotAll = false;

  // Try queryLocalFonts() — returns ALL installed fonts
  try {
    if (typeof window.queryLocalFonts === 'function') {
      const localFonts = await window.queryLocalFonts();
      const families = [...new Set(localFonts.map(f => f.family))];
      if (families.length > 5) { available.push(...families); gotAll = true; }
    }
  } catch(e) {}

  if (!gotAll) {
    // Canvas detection against comprehensive list
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const testHe = 'אבגדהוזחטי', testLat = 'AaBbCcDdEe012';
    ctx.font = '16px monospace';
    const baseW_he = ctx.measureText(testHe).width;
    const baseW_lat = ctx.measureText(testLat).width;
    for (const font of [...new Set([...base, ...fallbackList])]) {
      ctx.font = `16px '${font}',monospace`;
      const wHe = ctx.measureText(testHe).width;
      const wLat = ctx.measureText(testLat).width;
      if (Math.abs(wHe - baseW_he) > 0.5 || Math.abs(wLat - baseW_lat) > 0.5) available.push(font);
    }
    try {
      await document.fonts.ready;
      document.fonts.forEach(f => {
        const nm = f.family.replace(/['"]/g, '');
        if (!available.includes(nm)) available.push(nm);
      });
    } catch(e) {}
  }

  const baseSorted = [...base];
  const rest = [...new Set(available)].filter(f => !baseSorted.includes(f)).sort((a,b) => a.localeCompare(b, 'he'));
  const final = [...baseSorted, ...rest];

  _fontCatalog = final.map(f => ({label: f, value: `'${f}',sans-serif`}));
  _renderFontDD(_fontCatalog);

  // Also populate font dialog select
  const fdFn = document.getElementById('fd-fn');
  if (fdFn) {
    const toOpt = f => `<option value="'${f}',sans-serif">${f}</option>`;
    fdFn.innerHTML = final.map(toOpt).join('');
  }
}
