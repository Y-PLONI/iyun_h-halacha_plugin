// בדיקת עקביות נתונים. הרצה: npm run validate-data
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateData } from '../src/data/validators.ts';
import type { ExamsManifest, QuestionsFile, Schedule } from '../src/data/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'public', 'data');

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(dataDir, rel), 'utf8')) as T;
}

const schedule = readJson<Schedule>('schedule.json');
const examsManifest = readJson<ExamsManifest>('exams-manifest.json');

const questionsFiles: Record<string, QuestionsFile> = {};
const qDir = join(dataDir, 'questions');
for (const f of readdirSync(qDir)) {
  if (!f.endsWith('.json')) continue;
  const file = JSON.parse(readFileSync(join(qDir, f), 'utf8')) as QuestionsFile;
  questionsFiles[file.issueId] = file;
}

const issues = validateData(schedule, questionsFiles, examsManifest);
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');

for (const w of warnings) console.warn(`⚠  ${w.message}`);
for (const e of errors) console.error(`✗  ${e.message}`);

if (errors.length === 0) {
  console.log(`✓ ולידציה עברה. ${warnings.length} אזהרות, 0 שגיאות.`);
  process.exit(0);
} else {
  console.error(`\n✗ נמצאו ${errors.length} שגיאות.`);
  process.exit(1);
}
