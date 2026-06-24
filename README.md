# עיון ההלכה — תוסף אוצריא

תוסף לניהול הספקי "עיון ההלכה": צפייה בשאלות הגליון, כתיבת תשובות עם autosave,
עיון במקורות מתוך אוצריא (שו"ע, משנה ברורה, ביאור הלכה, שער הציון), ייצוא ל-Word
ושליחה במייל.

נבנה לפי [תכנון מפורט - תוסף עיון ההלכה.md](./תכנון%20מפורט%20-%20תוסף%20עיון%20ההלכה.md).

## טכנולוגיה

- React + TypeScript + Vite (build סטטי, chunk יחיד — נדרש ל-WebView מסוג file://).
- הנתונים מוטמעים מקומית; עדכון אופציונלי מ-GitHub (ראה למטה).
- API אוצריא: `storage.*`, `library.*`, `reader.*`, `network.fetch`, `feedback.sendEmail`,
  `ui.*` (דרך עטיפה אחת ב-[src/otzaria/](src/otzaria/)).

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

מסמכי ה-Word הם **מקור האמת**. אין שלב המרה ידני ואין קבצי JSON ביניים — הקבצים
מ-`exams-src/*.docx` מוטמעים ב-build ומומרים בזמן ריצה (mammoth) ומפוצלים לפי שבוע.

1. שמור את קובץ המבחן ב-`exams-src/issue-XXXX.docx` (Word, כפי שמתקבל מהמו"ל).
   שם הקובץ קובע את ה-issueId (למשל `issue-0241.docx` → `issue-0241`).
2. הוסף תקופה/שבועות ב-`public/data/schedule.json` (פרשה, טווח סימנים, `sourceRefs`).
   חשוב: `weekNumber` בשבוע חייב להתאים למספר השבוע במסמך (מרקר "(שבוע N מתוך M)").
3. הוסף ערך ב-`public/data/exams-manifest.json` (issueNumber, hebrewMonth, parshiot).
4. הרץ `npm run build` (או `npm run release`). זהו — אין צורך לערוך קוד:
   `import.meta.glob` מגלה את כל קבצי ה-docx אוטומטית.

> פורמט המבחן הנתמך: מרקר "(שבוע N מתוך M)" לכל שבוע, כותרת "שבוע פרשת ...",
> שורת טווח "מסימן ... עד ...", ושאלות באות פותחת — `א]` או `[א]`. הפענוח
> ב-[src/data/examParse.ts](src/data/examParse.ts).
>
> נוסח השאלות מוצג ישירות מתוך מסמך ה-Word (קריאה בלבד). מודל התשובות הוא לכל שבוע
> (לא לכל שאלה); אין צורך בקובץ `questions/issue-XXXX.json`.

## מעבר בין גליונות

כל גליון שמופיע ב-`exams-manifest.json` ושיש לו תקופה/שבועות ב-`schedule.json` מופיע
אוטומטית **בבורר הגליונות בסרגל העליון**. מעבר גליון מציג את ההספק והשבועות שלו.
כרגע מחווטים שני גליונות: ר"מ (סיון) ו-רל"ט (אייר-סיון).

## עדכון מ-GitHub

התוסף יכול למשוך גליונות ונתונים חדשים בלי התקנה מחדש: **הגדרות → עדכונים → בדוק עדכונים**.
- מקור: `Y-PLONI/iyun_h-halacha_plugin` (branch `master`). דורש הרשאת `network.access` ו-`network`
  ב-manifest; ה-repo כבר נמצא ב-`pluginNetworkAllowlist` הרשמי של אוצריא.
- `schedule.json` ו-`exams-manifest.json` נמשכים כ-raw (טקסט); קבצי `.docx` נמשכים דרך
  GitHub **Contents API** כ-base64 (כי `network.fetch` מחזיר טקסט בלבד).
- ההשוואה היא לפי `dataVersion` ב-`exams-manifest.json`. הנתונים נשמרים ב-`storage`
  (`remote:data:v1`) ומיושמים בכל טעינה. ראה [src/data/remoteUpdate.ts](src/data/remoteUpdate.ts).
- כדי לפרסם עדכון: דחוף את הקבצים ל-repo והעלה את `dataVersion`. ראה [exams-src/README.md](exams-src/README.md).

## הגדרות

חלון ההגדרות מחולק לכרטיסיות: **מראה** (גופן — ברירת מחדל/כמו אוצריא, וגודל גופן),
**שליחת תשובות** (שם, קוד אישי, מיילים), **מקורות** (שמות ספרים + זיהוי אוטומטי + השהיית
שמירה), **התראות** (תזכורות), **עדכונים**, ו**אודות**. גודל הגופן ומצב הגופן נשמרים
ב-`settings:v1` ומיושמים על משתני ה-CSS.

### התראות ותזכורות

תזכורת שבועית קבועה (יום בשבוע + שעה) על שבועות שטרם הושלמו ("אי לימוד/כתיבת תשובות").
התזכורת מתוזמנת **רק כל עוד יש שבוע פעיל שתשובתו לא סומנה כ"הושלם"**, ומתואמת מחדש בכל
טעינה ובכל שינוי בתשובות/הגדרות ([src/state/reminders.ts](src/state/reminders.ts)). שני ערוצים,
ניתנים להפעלה בנפרד:
- **שולחן עבודה** — התראת מערכת דרך `notifications.scheduleSystem` (דורש הרשאת `notifications.system`
  + אישור הרשאת מערכת חד-פעמי מתוך כרטיסיית ההתראות).
- **לוח שנה** — אירוע מסוג `calendar.event` ב-`publishedData.upsert` (הרשאת `published_data.write`),
  שמופיע בלוח השנה של אוצריא.

כשמסמנים שבוע כ"הושלם", או מכבים את התזכורות — ההתראות והאירועים נמחקים אוטומטית.

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
