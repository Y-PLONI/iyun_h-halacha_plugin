'use strict';

/* ══ EXPORT / PRINT / OPEN ══ */

/* ── DOCX (Open XML) ── */
function exportDocx(){
  const title=document.getElementById('doc-title').value||'מסמך';
  const body=_htmlToOoxml(document.getElementById('dp').innerHTML);
  const NW='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const NR='http://schemas.openxmlformats.org/package/2006/relationships';
  const NC='http://schemas.openxmlformats.org/package/2006/content-types';
  const NO='http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  const CT=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${NC}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

  const RELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NR}">
  <Relationship Id="rId1" Type="${NO}/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const WRELS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="${NR}">
  <Relationship Id="rId1" Type="${NO}/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="${NO}/settings" Target="settings.xml"/>
</Relationships>`;

  const SETTINGS=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${NW}">
  <w:defaultTabStop w:val="720"/>
  <w:themeFontLang w:val="he-IL" w:bidi="he-IL"/>
  <w:bidi/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
  </w:compat>
</w:settings>`;

  // RTL fix: document defaults set Hebrew CS font + RTL + language
  const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${NW}">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="David"/>
      <w:rtl/>
      <w:lang w:val="he-IL" w:bidi="he-IL"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:bidi/>
      <w:jc w:val="right"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:sz w:val="40"/><w:szCs w:val="40"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:color w:val="2E74B5"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rtl/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:rFonts w:cs="David"/><w:b/><w:bCs/><w:color w:val="1F3763"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:rtl/></w:rPr>
  </w:style>
</w:styles>`;

  const DOC=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:w="${NW}"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:body>${body}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>
      <w:bidi/>
      <w:rtlGutter/>
      <w:docGrid w:type="lines" w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const zip=_makeZip([
    {name:'[Content_Types].xml',text:CT},
    {name:'_rels/.rels',text:RELS},
    {name:'word/document.xml',text:DOC},
    {name:'word/_rels/document.xml.rels',text:WRELS},
    {name:'word/styles.xml',text:STYLES},
    {name:'word/settings.xml',text:SETTINGS},
  ]);
  const blob=new Blob([zip],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=title+'.docx';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  notify('✓ '+title+'.docx נשמר');
}

/* ── ZIP builder (no compression) ── */
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
    const entry=cat(lh,nb,db);parts.push(entry);cds.push(cat(cd,nb));off+=entry.length;
  }
  const cdBuf=cat(...cds);
  const eocd=new Uint8Array([0x50,0x4B,0x05,0x06,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cdBuf.length),...u32(off),0,0]);
  return cat(...parts,cdBuf,eocd);
}

/* ── HTML → OOXML (RTL-correct) ── */
function _htmlToOoxml(html){
  const tmp=document.createElement('div');
  tmp.innerHTML=html;
  tmp.querySelectorAll('.pgbreak,.fn-area,.en-area').forEach(e=>e.remove());
  tmp.querySelectorAll('mark.fhl').forEach(m=>{const p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);});
  const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function _fontRpr(st){
    if(!st||!st.fontFamily)return'';
    const ff=st.fontFamily.replace(/['"]/g,'').split(',')[0].trim();
    if(!ff||ff==='inherit'||ff==='initial')return'';
    return`<w:rFonts w:ascii="${xe(ff)}" w:hAnsi="${xe(ff)}" w:cs="${xe(ff)}" w:hint="cs"/>`;
  }

  function runs(node,extra=''){
    if(!node)return'';
    if(node.nodeType===3){
      const t=node.textContent;if(!t)return'';
      // Always include Hebrew CS font + RTL in every text run
      const rpr=`<w:rPr><w:rFonts w:cs="David" w:hint="cs"/>${extra}<w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr>`;
      return`<w:r>${rpr}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
    }
    if(node.nodeType!==1)return'';
    const tag=node.tagName.toLowerCase();
    const kids=Array.from(node.childNodes);
    let add=extra;
    const st=node.style||{};
    // Font family from inline style
    const fontRpr=_fontRpr(st);
    if(fontRpr&&!extra.includes('<w:rFonts'))add=fontRpr+add;
    if(['b','strong'].includes(tag))add+='<w:b/><w:bCs/>';
    if(['i','em'].includes(tag))add+='<w:i/><w:iCs/>';
    if(tag==='u')add+='<w:u w:val="single"/>';
    if(['s','del','strike'].includes(tag))add+='<w:strike/>';
    if(tag==='sup')add+='<w:vertAlign w:val="superscript"/>';
    if(tag==='sub')add+='<w:vertAlign w:val="subscript"/>';
    if(st.fontWeight==='bold'||+st.fontWeight>=700)add+='<w:b/><w:bCs/>';
    if(st.fontStyle==='italic')add+='<w:i/><w:iCs/>';
    const fsPt=parseFloat(st.fontSize);
    if(fsPt){const hw=Math.round(fsPt*2);add+=`<w:sz w:val="${hw}"/><w:szCs w:val="${hw}"/>`;}
    const hex=_col2hex(st.color);
    if(hex)add+=`<w:color w:val="${hex}"/>`;
    return kids.map(c=>runs(c,add)).join('');
  }

  function para(node){
    if(node.nodeType===3){
      const t=node.textContent.trim();if(!t)return'';
      return`<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:cs="David" w:hint="cs"/><w:rtl/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r></w:p>`;
    }
    if(node.nodeType!==1)return'';
    const tag=node.tagName.toLowerCase();
    const kids=Array.from(node.childNodes);
    const jcVal={right:'right',left:'left',center:'center',justify:'both'}[(node.style?.textAlign||'right').toLowerCase()]||'right';
    const pBase=`<w:pPr><w:bidi/><w:jc w:val="${jcVal}"/></w:pPr>`;

    if(tag==='table'){
      let t=`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:bidiVisual/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr>`;
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
    if(['ul','ol'].includes(tag)){
      return Array.from(node.querySelectorAll('li')).map((li,i)=>
        `<w:p><w:pPr><w:bidi/><w:jc w:val="right"/><w:ind w:right="360"/></w:pPr><w:r><w:rPr><w:rFonts w:cs="David" w:hint="cs"/><w:rtl/></w:rPr><w:t xml:space="preserve">${tag==='ol'?(i+1)+'. ':'&#x2022; '}</w:t></w:r>${runs(li)}</w:p>`
      ).join('');
    }
    const BL=['p','div','h1','h2','h3','h4','ul','ol','table','hr','blockquote','pre','br'];
    const hasBlock=kids.some(k=>k.nodeType===1&&BL.includes(k.tagName?.toLowerCase()));
    if(['div','blockquote','section','article'].includes(tag)&&hasBlock)return kids.map(para).join('');
    const hStyles={h1:'Heading1',h2:'Heading2',h3:'Heading3'};
    const hStyle=hStyles[tag];
    if(hStyle)return`<w:p><w:pPr><w:pStyle w:val="${hStyle}"/><w:bidi/><w:jc w:val="${jcVal}"/></w:pPr>${runs(node)}</w:p>`;
    if(['p','h4','h5','h6','pre','li'].includes(tag)||!hasBlock)
      return`<w:p>${pBase}${runs(node)}</w:p>`;
    return kids.map(para).join('');
  }
  const result=Array.from(tmp.childNodes).map(para).join('');
  return result||`<w:p><w:pPr><w:bidi/></w:p>`;
}

function _col2hex(c){
  if(!c||c==='inherit'||c==='initial'||c==='transparent')return null;
  if(/^#[0-9a-f]{6}$/i.test(c))return c.slice(1).toUpperCase();
  if(/^#[0-9a-f]{3}$/i.test(c))return c.slice(1).split('').map(x=>x+x).join('').toUpperCase();
  const el=document.createElement('div');el.style.color=c;document.body.appendChild(el);
  const cs=window.getComputedStyle(el).color;document.body.removeChild(el);
  const m=cs.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if(!m)return null;
  return[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('').toUpperCase();
}

/* ── PRINT ── */
function printDoc(){
  try{window.print();}catch(e){notify('שגיאה בהדפסה');}
}

/* ── DOCX IMPORT — full style preservation via JSZip + OOXML parser ── */
async function _importDocxWithStyles(file){
  if(typeof JSZip==='undefined')throw new Error('JSZip לא נטען');
  notify('טוען קובץ...');
  const WNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const ANS='http://schemas.openxmlformats.org/drawingml/2006/main';
  const DP=new DOMParser();
  const zip=await JSZip.loadAsync(await file.arrayBuffer());
  notify('קורא תמונות וסגנונות...');
  const qw =(el,t)=>el?el.getElementsByTagNameNS(WNS,t)[0]||null:null;
  const qwa=(el,t)=>el?[...el.getElementsByTagNameNS(WNS,t)]:[];
  const aw =(el,a)=>el?(el.getAttributeNS(WNS,a)??el.getAttribute('w:'+a)??null):null;
  const ar =(el,a)=>el?(el.getAttributeNS(RNS,a) ??el.getAttribute('r:'+a)??null):null;
  const xe =s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  /* Images */
  const imgMap={};
  const relsXml=await zip.file('word/_rels/document.xml.rels')?.async('string')??'';
  const relsDoc=DP.parseFromString(relsXml||'<root/>','text/xml');
  const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',bmp:'image/bmp',svg:'image/svg+xml'};
  for(const rel of relsDoc.querySelectorAll('Relationship')){
    if(!(rel.getAttribute('Type')??'').includes('/image'))continue;
    const rId=rel.getAttribute('Id')??'';
    const tgt=rel.getAttribute('Target')??'';
    const path=tgt.startsWith('/')?tgt.slice(1):`word/${tgt}`;
    const ext=path.split('.').pop().toLowerCase();
    const f=zip.file(path);
    if(f&&rId)imgMap[rId]=`data:${MIME[ext]??'image/png'};base64,${await f.async('base64')}`;
  }

  /* Paragraph styles → HTML tags */
  const styleTagMap={};
  const stylesXml=await zip.file('word/styles.xml')?.async('string')??'';
  if(stylesXml){
    const sDoc=DP.parseFromString(stylesXml,'text/xml');
    const HM={'heading 1':'h1','heading 2':'h2','heading 3':'h3','heading 4':'h4','title':'h1','subtitle':'h2',
      'כותרת 1':'h1','כותרת 2':'h2','כותרת 3':'h3','כותרת 4':'h4',
      'block text':'blockquote','block quote':'blockquote','quote':'blockquote'};
    for(const s of sDoc.getElementsByTagNameNS(WNS,'style')){
      const id=aw(s,'styleId')??'';
      const nm=(aw(qw(s,'name'),'val')??'').toLowerCase().trim();
      const hit=Object.keys(HM).find(k=>nm===k||nm.startsWith(k+' '));
      if(hit&&id)styleTagMap[id]=HM[hit];
    }
  }

  /* Numbering (lists) */
  const numTypeMap={};
  const numXml=await zip.file('word/numbering.xml')?.async('string')??'';
  if(numXml){
    const nDoc=DP.parseFromString(numXml,'text/xml');
    const OL=new Set(['decimal','lowerLetter','upperLetter','lowerRoman','upperRoman','decimalZero']);
    const absNums={};
    for(const an of nDoc.getElementsByTagNameNS(WNS,'abstractNum')){
      const anId=aw(an,'abstractNumId')??'';const m={};
      for(const lvl of an.getElementsByTagNameNS(WNS,'lvl'))
        m[aw(lvl,'ilvl')??'0']=OL.has(aw(qw(lvl,'numFmt'),'val')??'')?'ol':'ul';
      absNums[anId]=m;
    }
    for(const num of nDoc.getElementsByTagNameNS(WNS,'num')){
      const numId=aw(num,'numId')??'';
      const lvls=absNums[aw(qw(num,'abstractNumId'),'val')??'']??{};
      for(const il of Object.keys(lvls))numTypeMap[`${numId}:${il}`]=lvls[il];
    }
  }

  /* Parse main document */
  notify('ממיר תוכן...');
  const docXml=await zip.file('word/document.xml')?.async('string');
  if(!docXml)throw new Error('word/document.xml חסר');
  const docEl=DP.parseFromString(docXml,'text/xml');
  const body=docEl.getElementsByTagNameNS(WNS,'body')[0];
  if(!body)throw new Error('body לא נמצא');

  const HL={'yellow':'#ffff00','green':'#92d050','cyan':'#00ffff','magenta':'#ff00ff','blue':'#4472c4','red':'#ff0000',
    'darkBlue':'#003366','darkCyan':'#006666','darkGreen':'#375623','darkMagenta':'#7030a0',
    'darkRed':'#c00000','darkYellow':'#8f6000','darkGray':'#595959','lightGray':'#d9d9d9'};

  function runToHtml(run){
    /* Image via DrawingML */
    for(const blip of run.getElementsByTagNameNS(ANS,'blip')){
      const rId=ar(blip,'embed');
      if(rId&&imgMap[rId])return`<img src="${imgMap[rId]}" style="max-width:100%;height:auto;display:block;margin:4px auto">`;
    }
    for(const el of run.querySelectorAll('[*|embed]')){
      const rId=el.getAttributeNS(RNS,'embed')??el.getAttribute('r:embed');
      if(rId&&imgMap[rId])return`<img src="${imgMap[rId]}" style="max-width:100%;height:auto;display:block;margin:4px auto">`;
    }
    const rPr=qw(run,'rPr');
    const css=[],pre=[],post=[];
    if(rPr){
      /* Font family */
      const rf=qw(rPr,'rFonts');
      const font=aw(rf,'ascii')??aw(rf,'hAnsi')??aw(rf,'cs');
      if(font&&!['Times New Roman','David','Arial','Calibri'].includes(font))
        css.push(`font-family:'${font.replace(/'/g,'')}'`);
      /* Font size: half-pts → pt (skip default 24 = 12pt) */
      const sz=aw(qw(rPr,'sz')??qw(rPr,'szCs'),'val');
      if(sz&&+sz!==24)css.push(`font-size:${(+sz/2).toFixed(1)}pt`);
      /* Color */
      const col=aw(qw(rPr,'color'),'val');
      if(col&&col!=='auto'&&col.toLowerCase()!=='000000')css.push(`color:#${col}`);
      /* Highlight */
      const hl=aw(qw(rPr,'highlight'),'val');
      if(hl&&HL[hl])css.push(`background:${HL[hl]}`);
      /* Shading fill */
      const fill=aw(qw(rPr,'shd'),'fill');
      if(fill&&fill!=='auto'&&fill.toUpperCase()!=='FFFFFF')css.push(`background:#${fill}`);
      /* Bold */
      const b=qw(rPr,'b'),bv=aw(b,'val');
      if(b&&bv!=='0'&&bv!=='false'){pre.push('<strong>');post.unshift('</strong>');}
      /* Italic */
      const i=qw(rPr,'i'),iv=aw(i,'val');
      if(i&&iv!=='0'&&iv!=='false'){pre.push('<em>');post.unshift('</em>');}
      /* Underline */
      const uv=aw(qw(rPr,'u'),'val');
      if(uv&&uv!=='none')css.push('text-decoration:underline');
      /* Strikethrough */
      const stk=qw(rPr,'strike')??qw(rPr,'dstrike');
      if(stk&&aw(stk,'val')!=='0'&&aw(stk,'val')!=='false')css.push('text-decoration:line-through');
      /* Super / Subscript */
      const vert=aw(qw(rPr,'vertAlign'),'val');
      if(vert==='superscript'){pre.push('<sup>');post.unshift('</sup>');}
      if(vert==='subscript')  {pre.push('<sub>');post.unshift('</sub>');}
    }
    /* Line / page break */
    const brEl=qw(run,'br');
    if(brEl)return aw(brEl,'type')==='page'?'|||PB|||':'<br>';
    const tEl=qw(run,'t');
    if(!tEl)return'';
    const txt=tEl.textContent??'';if(!txt)return'';
    const esc=xe(txt);
    const inner=css.length?`<span style="${css.join(';')}">${esc}</span>`:esc;
    return pre.join('')+inner+post.join('');
  }

  function hlinkToHtml(hl){
    const rId=ar(hl,'id');
    const relEl=rId?relsDoc.querySelector(`[Id="${rId}"]`):null;
    const href=xe(relEl?.getAttribute('Target')??'#');
    const content=qwa(hl,'r').map(runToHtml).join('');
    return content?`<a href="${href}">${content}`+'</a>':'';
  }

  function collectRuns(pNode){
    let h='';
    for(const c of pNode.childNodes){
      const t=c.localName??'';
      if(t==='r')         h+=runToHtml(c);
      else if(t==='hyperlink')h+=hlinkToHtml(c);
      else if(t==='ins')  h+=qwa(c,'r').map(runToHtml).join('');
      // w:del skipped (deleted text hidden)
    }
    return h;
  }

  function tblToHtml(tbl){
    let t='<table>';
    for(const row of tbl.getElementsByTagNameNS(WNS,'tr')){
      const cells=[...row.childNodes].filter(c=>(c.localName??'')==='tc');
      if(!cells.length)continue;
      t+='<tr>';
      for(const cell of cells){
        t+='<td>';
        for(const c of cell.childNodes){
          const cn=c.localName??'';
          if(cn==='p')   t+=paraToHtml(c)??'<p><br></p>';
          else if(cn==='tbl')t+=tblToHtml(c);
        }
        t+='</td>';
      }
      t+='</tr>';
    }
    return t+'</table>';
  }

  function paraToHtml(para){
    const pPr=qw(para,'pPr');
    /* List? */
    const numId=aw(qw(qw(pPr,'numPr'),'numId'),'val')??'';
    const ilvl =aw(qw(qw(pPr,'numPr'),'ilvl') ,'val')??'0';
    if(numId&&numId!=='0'){
      const lType=numTypeMap[`${numId}:${ilvl}`]??'ul';
      return`|||LIST:${lType}:${collectRuns(para)}|||`;
    }
    /* Tag from paragraph style */
    const pStyleId=aw(qw(pPr,'pStyle'),'val')??'';
    const tag=styleTagMap[pStyleId]??'p';
    /* Alignment */
    const jcVal=aw(qw(pPr,'jc'),'val')??'right';
    const ALIGN={left:'left',center:'center',right:'right',both:'justify',distribute:'justify',end:'left',start:'right'};
    const align=ALIGN[jcVal]??'right';
    /* Indentation (twips → pt, 1pt=20twips) */
    const ind=qw(pPr,'ind');
    const indR=Math.round(+(aw(ind,'right')??0)/20);
    const indL=Math.round(+(aw(ind,'left')??0)/20);
    const fi  =Math.round(+(aw(ind,'firstLine')??0)/20);
    const hang=Math.round(+(aw(ind,'hanging')??0)/20);
    /* Spacing */
    const spc=qw(pPr,'spacing');
    const spB=Math.round(+(aw(spc,'before')??0)/20);
    const spA=Math.round(+(aw(spc,'after')??0)/20);
    const lineV=+(aw(spc,'line')??0),lineR=aw(spc,'lineRule')??'auto';
    const lh=lineV&&lineR==='auto'?`line-height:${(lineV/240).toFixed(2)}`:
             lineV&&lineR==='exact'?`line-height:${(lineV/20).toFixed(1)}pt`:'';
    const css=[];
    if(align!=='right')css.push(`text-align:${align}`);
    if(indR>1) css.push(`padding-right:${indR}pt`);
    if(indL>1) css.push(`padding-left:${indL}pt`);
    if(fi>1)   css.push(`text-indent:${fi}pt`);
    if(hang>1) css.push(`padding-right:${hang}pt;text-indent:-${hang}pt`);
    if(spB>1)  css.push(`margin-top:${spB}pt`);
    if(spA>1)  css.push(`margin-bottom:${spA}pt`);
    if(lh)     css.push(lh);
    const runs=collectRuns(para);
    if(!runs.trim()&&tag==='p')return'<p><br></p>';
    const sa=css.length?` style="${css.join(';')}"`:'' ;
    return`<${tag}${sa}>${runs}</${tag}>`;
  }

  /* Process body */
  let html='';
  let listBuf=null;
  const flushList=()=>{
    if(!listBuf)return;
    html+=`<${listBuf.type}>${listBuf.items.map(i=>`<li>${i}</li>`).join('')}</${listBuf.type}>`;
    listBuf=null;
  };
  const addPara=child=>{
    const res=paraToHtml(child);if(!res)return;
    if(res.startsWith('|||LIST:')){
      const m=res.match(/^\|\|\|LIST:(ul|ol):([\s\S]*)\|\|\|$/);
      if(m){
        const[,lType,lHtml]=m;
        if(!listBuf||listBuf.type!==lType){flushList();listBuf={type:lType,items:[]};}
        listBuf.items.push(lHtml);
      }
    }else if(res.includes('|||PB|||')){
      flushList();
      res.split('|||PB|||').forEach((part,i)=>{if(i>0)html+='\n<!-- PAGE_BREAK -->\n';html+=part;});
    }else{flushList();html+=res;}
  };
  for(const child of body.childNodes){
    const t=child.localName??'';
    if(t==='p')addPara(child);
    else if(t==='tbl'){flushList();html+=tblToHtml(child);}
    else if(t==='sdt'){
      const content=qw(child,'sdtContent');
      if(content)for(const p of content.getElementsByTagNameNS(WNS,'p'))addPara(p);
    }
  }
  flushList();
  html=html.replace(/(<p[^>]*><br><\/p>\s*){3,}/g,'<p><br></p><p><br></p>').trim();
  notify('ייבוא הושלם!');
  return html||'<p><br></p>';
}

/* ── NEW / OPEN / SAVE AS ── */
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
      notify('פותח '+file.name+'...');
      try{
        let html;
        try{
          html=await _importDocxWithStyles(file);
        }catch(e1){
          /* Fallback to Mammoth if custom parser fails */
          if(typeof mammoth==='undefined')throw e1;
          const ab=await file.arrayBuffer();
          const result=await mammoth.convertToHtml({arrayBuffer:ab},{
            styleMap:[
              "p[style-name='כותרת 1'] => h1:fresh","p[style-name='כותרת 2'] => h2:fresh",
              "p[style-name='כותרת 3'] => h3:fresh","p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh","p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Title'] => h1:fresh",
            ],
            includeDefaultStyleMap:true,
            convertImage:mammoth.images.imgElement(img=>img.read('base64').then(d=>({
              src:'data:'+img.contentType+';base64,'+d,style:'max-width:100%;height:auto;display:block;margin:4px 0'
            })))
          });
          html=result.value.replace(/<p>\s*<\/p>/g,'').replace(/\n{3,}/g,'\n\n');
        }
        _setDocHTML(html||'<p><br></p>');
      }catch(err){notify('שגיאה בפתיחה: '+err.message);return;}
    }else{
      const txt=await file.text();
      if(file.name.endsWith('.txt')){
        dp.innerHTML=txt.split('\n').map(l=>`<p>${l.replace(/</g,'&lt;')||'<br>'}</p>`).join('');
      }else{
        const m=txt.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        dp.innerHTML=m?m[1]:txt;
      }
    }
    document.getElementById('doc-title').value=titleName;
    document.getElementById('outline-panel')?.classList.add('hide');
    document.getElementById('outline-btn')?.classList.remove('on');
    schedSave();updCount();updNav();setTimeout(doRepaginate,200);
    notify('נפתח: '+file.name);
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
      const html=`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/><title>${title}</title></head><body style="font-family:'Times New Roman',serif;font-size:12pt;direction:rtl;padding:60px 80px;line-height:1.5">${document.getElementById('dp').innerHTML}</body></html>`;
      _dlBlob(html,'text/html;charset=utf-8',title+'.html');
    }else if(fmt==='txt'){
      _dlBlob(document.getElementById('dp').innerText,'text/plain;charset=utf-8',title+'.txt');
    }else{exportDocx();return;}
    schedSave();notify('נשמר: '+title);
  },true);
  addDlgBtn(dlg,'בטל',()=>dlg.remove(),false);
}
