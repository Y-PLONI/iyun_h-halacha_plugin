# עיון ההלכה — תוסף אוצריא

תוסף לניהול הספקי "עיון ההלכה": צפייה בשאלות הגליון, כתיבת תשובות עם autosave,
עיון במקורות מתוך אוצריא (שו"ע, משנה ברורה, ביאור הלכה, שער הציון), ייצוא ל-Word
ושליחה במייל.

נבנה לפי [תכנון מפורט - תוסף עיון ההלכה.md](./תכנון%20מפורט%20-%20תוסף%20עיון%20ההלכה.md).

## טכנולוגיה

- React + TypeScript + Vite (build סטטי).
- ללא תלות ברשת ב-MVP — כל הנתונים מקומיים.
- API אוצריא: `storage.*`, `library.*`, `reader.*`, `feedback.sendEmail`, `ui.*`
  (דרך עטיפה אחת ב-[src/otzaria/](src/otzaria/)).

## פיתוח

```bash
npm install
npm run dev          # דפדפן רגיל, עם mock SDK (localStorage במקום storage של אוצריא)
```

ב-console של הדפדפן ניתן להחליף theme: `__toggleTheme()`.

## בנייה ואריזה

```bash
npm run validate-data   # בדיקת עקביות schedule/questions/exams
npm run typecheck
npm run release         # validate-data + build + הרכבת dist/ מוכן לאריזה
```

`npm run release` יוצר את התיקייה `dist/` הכוללת: `manifest.json`, `index.html`,
`assets/*`, `data/*`, `icon/*` — זו תיקיית התוסף המלאה.

אריזה ל-`.otzplugin`:

```bash
# דרך כלי אוצריא:
dart tool/package_plugin.dart /path/to/dist --force
# או ידנית (זיפ של תוכן dist, הקבצים בשורש הזיפ):
cd dist && zip -r -X ../com.chadbedera.iyun-halacha-<version>.otzplugin . -x '.*'
```

## הוספת גליון חדש

1. שמור את קובץ המבחן ב-`exams-src/issue-XXXX.docx` (Word, כפי שמתקבל מהמו"ל).
2. הרץ `npm run convert-exams` — ממיר את ה-DOCX ל-`public/data/exams/issue-XXXX.json`
   (HTML מנוקה, מפוצל לפי שבוע). הקבצים ב-`exams-src/` אינם נארזים בתוסף; רק ה-JSON.
3. הוסף ייבוא ושורה במיפוי `examByIssue` שב-[src/data/localData.ts](src/data/localData.ts):
   ```ts
   import examXXXX from '../../public/data/exams/issue-XXXX.json';
   const examByIssue = { ..., 'issue-XXXX': examXXXX as unknown as ExamDoc };
   ```
4. הוסף תקופה/שבועות ב-`public/data/schedule.json` (פרשה, טווח סימנים, `sourceRefs`).
   חשוב: `weekNumber` בשבוע חייב להתאים למספר השבוע במסמך המבחן.
5. הוסף ערך ב-`public/data/exams-manifest.json`.
6. הרץ `npm run validate-data`, ואז `npm run release`.
7. עדכן `dataVersion` בקבצים.

> נוסח השאלות מוצג ישירות מתוך מסמך ה-Word (קריאה בלבד). קובץ
> `public/data/questions/issue-XXXX.json` נשמר לתאימות/ולידציה אך אינו נדרש לתצוגה.

## מבנה נתונים

- `schedule.json` — גליון → שבוע (פרשה, טווח סימנים, מזהי שאלות, מקורות).
- `questions/issue-XXXX.json` — נוסח השאלות לפי שבוע.
- `exams-manifest.json` — מטא-דאטה של גליונות + סטטוס רישוי.
- תשובות המשתמש נשמרות ב-`storage` תחת `answers:v1`; הגדרות תחת `settings:v1`.

סכמות מלאות: [src/data/types.ts](src/data/types.ts).

## נקודות פתוחות (סעיף 24 בתכנון)

- **רישוי הפצה**: `licenseStatus` בגליון מסומן `private`. אין לפרסם לציבור עד
  הכרעה על זכויות הפצת נוסח השאלות.
- **עדכוני GitHub**: לא ב-MVP. דורש הרשאת `network.access` ו-PR ל-allowlist של אוצריא.
- **שמות ספרים**: ניתנים ל-override בהגדרות + זיהוי אוטומטי (`library.findBooks`).

## הגבלות ידועות

- `mailto`/`feedback.sendEmail` אינם מצרפים את קובץ ה-DOCX אוטומטית — יש לצרפו ידנית.
- `library.getBookContent` מוגבל ל-5000 תווים לקריאה; טווחים ארוכים נטענים במספר קריאות.
