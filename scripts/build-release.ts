// מרכיב את תיקיית התוסף הסופית: מעתיק manifest.json ו-icon/ לתוך dist/
// (Vite כבר העתיק index.html, assets/* ו-data/*). הרצה אחרי vite build.
// שימוש: npm run release  (build + assemble)
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('✗ תיקיית dist לא קיימת. הרץ קודם: npm run build');
  process.exit(1);
}

// manifest
const manifestSrc = join(root, 'manifest.json');
copyFileSync(manifestSrc, join(dist, 'manifest.json'));

// icon
const iconSrc = join(root, 'icon');
if (existsSync(iconSrc)) {
  mkdirSync(join(dist, 'icon'), { recursive: true });
  cpSync(iconSrc, join(dist, 'icon'), { recursive: true });
}

// בדיקות שפיות בסיסיות
const manifest = JSON.parse(readFileSync(manifestSrc, 'utf8'));
const entry = join(dist, manifest.entrypoint);
const checks: [string, boolean][] = [
  ['manifest.json', existsSync(join(dist, 'manifest.json'))],
  [manifest.entrypoint, existsSync(entry)],
  [manifest.icon, existsSync(join(dist, manifest.icon))],
  ['data/schedule.json', existsSync(join(dist, 'data', 'schedule.json'))],
];

let ok = true;
for (const [label, present] of checks) {
  console.log(`${present ? '✓' : '✗'} ${label}`);
  if (!present) ok = false;
}

if (ok) {
  console.log(`\n✓ תיקיית התוסף מוכנה לאריזה: ${dist}`);
  console.log('   ארוז עם: otzaria pack-plugin <path-to-dist> --force');
} else {
  console.error('\n✗ חסרים קבצים בתיקיית התוסף');
  process.exit(1);
}
