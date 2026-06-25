#!/usr/bin/env python3
# יצירת תבנית "טופס סימון התשובות" מתוך קובץ ה-Word של הארגון.
#
# הסקריפט מזהה את שדות הנתונים בטבלאות לפי תוויות העמודות, מחליף את ערכי הדוגמה
# בטוקנים ({{NAME}}, {{CODE}}, {{KOLLEL}}, {{ISSUE}}, {{PARSHIOT}}, {{PAYMENT}},
# {{WEEKS}}, {{ANSWERED}}, {{PILPULA}}), ושומר תבנית שבה word/document.xml מאוחסן
# ללא דחיסה (store) — כך שבזמן ריצה אפשר להחליף טוקנים בלי לפענח deflate.
#
# שימוש:
#   python3 scripts/tokenize-form.py <מקור.docx> [יעד.docx]
#   ברירת יעד: src/export/templates/answer-form.docx
#
# דרישות: pip3 install lxml
#
# מתי להריץ: רק אם הארגון מעדכן את עיצוב/מבנה הטופס. לאחר ההרצה — `npm run build`.

import sys, os, io, copy, zipfile
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
def w(tag): return f"{{{W}}}{tag}"

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DST = os.path.join(REPO, "src/export/templates/answer-form.docx")

EXPECTED = {"NAME", "CODE", "KOLLEL", "ISSUE", "PARSHIOT", "PAYMENT", "WEEKS", "ANSWERED", "PILPULA"}

def label_to_token(text):
    t = text.strip()
    if "שם פרטי" in t: return "NAME"
    if t == "קוד אישי": return "CODE"
    if t == "כולל": return "KOLLEL"
    if "גליון מספר" in t: return "ISSUE"
    if "מספר פרשיות" in t: return "PARSHIOT"
    if "צורת התשלום" in t: return "PAYMENT"
    if "מספר שבועות שנענו" in t: return "WEEKS"
    if "סימון שנענה" in t: return "ANSWERED"
    if "תשובות לפלפולא" in t: return "PILPULA"
    return None

def cell_text(tc):
    return "".join(t.text or "" for t in tc.iter(w("t")))

def set_cell_token(tc, token):
    ps = tc.findall(w("p"))
    if not ps:
        return False
    first_p = ps[0]
    sample_rpr = None
    for r in first_p.iter(w("r")):
        rpr = r.find(w("rPr"))
        if rpr is not None:
            sample_rpr = rpr
            break
    for p in ps[1:]:
        tc.remove(p)
    for child in list(first_p):
        if child.tag in (w("r"), w("sdt")):
            first_p.remove(child)
    new_r = etree.SubElement(first_p, w("r"))
    if sample_rpr is not None:
        new_r.append(copy.deepcopy(sample_rpr))
    new_t = etree.SubElement(new_r, w("t"))
    new_t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    new_t.text = "{{" + token + "}}"
    return True

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DST

    zin = zipfile.ZipFile(src)
    tree = etree.parse(io.BytesIO(zin.read("word/document.xml")))
    root = tree.getroot()

    found = set()
    for tbl in root.iter(w("tbl")):
        rows = tbl.findall(w("tr"))
        for i, tr in enumerate(rows):
            for col, tc in enumerate(tr.findall(w("tc"))):
                token = label_to_token(cell_text(tc))
                if not token or i == 0:
                    continue
                dcells = rows[i - 1].findall(w("tc"))
                if col >= len(dcells):
                    continue
                old = cell_text(dcells[col]).strip()
                if set_cell_token(dcells[col], token):
                    found.add(token)
                    print(f"  {{{{{token}}}}}  <-  {old!r}")

    missing = EXPECTED - found
    if missing:
        print("!!! לא נמצאו טוקנים:", missing)
        sys.exit(1)

    new_doc = etree.tostring(tree, xml_declaration=True, encoding="UTF-8", standalone=True)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    # שאר החלקים נשמרים דחוסים; document.xml ללא דחיסה (store) לקריאה ישירה בזמן ריצה.
    with zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            data = new_doc if info.filename == "word/document.xml" else zin.read(info.filename)
            zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            zi.compress_type = zipfile.ZIP_STORED if info.filename == "word/document.xml" else zipfile.ZIP_DEFLATED
            zi.external_attr = info.external_attr
            zout.writestr(zi, data)
    print(f"\nנשמר: {dst}  ({os.path.getsize(dst)} bytes)")

if __name__ == "__main__":
    main()
