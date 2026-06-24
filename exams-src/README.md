# הוספת גליונות מבחן (קבצי Word)

תיקייה זו מכילה את מסמכי ה-Word של המבחנים. **הם מקור האמת** — אין קבצי JSON ביניים.
בזמן הבנייה הקבצים מוטמעים בתוסף, ובזמן ריצה הם מומרים ל-HTML (mammoth) ומפוצלים לפי שבוע.

## הוספת גליון חדש — שלב אחר שלב

1. **שמור את קובץ ה-Word כאן** בשם `issue-XXXX.docx`
   (XXXX = מספר הגליון בארבע ספרות, למשל `issue-0241.docx`).
   שם הקובץ קובע את ה-`issueId`.

2. **עדכן `public/data/schedule.json`** — הוסף "תקופה" (period) עם שבועות הגליון.
   לכל שבוע: `weekId` (כמו `issue-0241-w1`), `parasha`, `sourceRangeTitle`,
   ו-`sourceRefs` (טווח סימנים לשו"ע / מ"ב / ביה"ל).
   ⚠️ `weekNumber` חייב להתאים למספר השבוע במסמך (המרקר "(שבוע N מתוך M)").
   במודל החדש אפשר להשאיר `questionIds: []` — השאלות מגיעות מה-Word.

3. **עדכן `public/data/exams-manifest.json`** — הוסף ערך לגליון:
   `issueId`, `issueNumber`, `hebrewMonth`, `parshiot`, `version`, וכן `dataVersion`
   ברמת הקובץ (זהו מספר הגרסה שמנגנון העדכון משווה).

4. **בנה:** `npm run build`. זהו — אין צורך לערוך קוד; כל קבצי ה-`.docx`
   מתגלים אוטומטית.

## פורמט המבחן הנתמך

הממיר ([../src/data/examParse.ts](../src/data/examParse.ts)) מצפה למבנה הבא בכל עמוד/שבוע:

- מרקר שבוע: `(שבוע N מתוך M)`
- כותרת: `שבוע פרשת <פרשה> - <נושא>` (יכולה להשתרע על כמה שורות)
- טווח: שורה שמתחילה ב-`מסימן ... עד ...`
- שאלות: אות פותחת — `א]` או `[א]` — ואחריה גוף השאלה.

## עדכון אוטומטי מ-GitHub

המשתמשים מקבלים גליונות חדשים בלי להתקין גרסה חדשה של התוסף:

1. דחוף את הקבצים ל-repo: `Y-PLONI/iyun_h-halacha_plugin` (branch `master`) —
   `exams-src/issue-XXXX.docx`, וכן `public/data/schedule.json` ו-`public/data/exams-manifest.json`.
2. **העלה את `dataVersion`** ב-`exams-manifest.json` (למשל `2026.07.01`). זהו הסימן
   לתוסף שיש עדכון.
3. אצל המשתמש: **הגדרות → עדכונים → בדוק עדכונים → עדכן עכשיו**. הנתונים נשמרים
   מקומית ונכנסים לתוקף מיד.

> דרישות (מתקיימות כבר): ה-repo נמצא ב-`pluginNetworkAllowlist` הרשמי של אוצריא,
> ולתוסף יש הרשאת `network.access` ו-`network.enabled` ב-manifest. קבצי `.docx`
> (בינאריים) נמשכים דרך GitHub Contents API כ-base64, כי `network.fetch` מחזיר טקסט.
