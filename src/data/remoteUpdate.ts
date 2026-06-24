// עדכון עצמי מ-GitHub: משיכת schedule/exams-manifest (raw, טקסט) וקבצי המבחן
// (.docx בינארי — דרך GitHub Contents API כ-base64, כי network.fetch מחזיר טקסט).
// הנתונים נשמרים ב-storage ומיושמים על שכבת הנתונים. ה-repo כבר ב-allowlist של אוצריא.

import { fetchText, hasNetwork } from '../otzaria/network';
import { storageGet, storageSet } from '../otzaria/storage';
import { applyRemoteData, examsManifest } from './localData';
import { applyRemoteExams } from './examLoader';
import type { ExamsManifest, Schedule } from './types';

const REPO = 'Y-PLONI/iyun_h-halacha_plugin';
const BRANCH = 'master';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API_CONTENTS = `https://api.github.com/repos/${REPO}/contents`;
const GH_HEADERS = { 'User-Agent': 'iyun-halacha-plugin', Accept: 'application/vnd.github+json' };

const STORAGE_KEY = 'remote:data:v1';

interface StoredRemote {
  dataVersion: string;
  schedule: Schedule;
  examsManifest: ExamsManifest;
  /** issueId -> תוכן ה-docx ב-base64 */
  examsBase64: Record<string, string>;
  /** issueId -> version (להשוואה ומשיכה חלקית) */
  issueVersions: Record<string, string>;
  updatedAt: string;
}

export interface UpdateCheck {
  available: boolean;
  remoteVersion: string;
  localVersion: string;
}

/** טוען נתונים מרוחקים שנשמרו (אם יש) ומיישם אותם. נקרא ב-boot לפני הרינדור. */
export async function loadStoredRemote(): Promise<void> {
  try {
    const stored = await storageGet<StoredRemote>(STORAGE_KEY);
    if (!stored || !stored.schedule || !stored.examsManifest) return;
    applyRemoteData({ schedule: stored.schedule, examsManifest: stored.examsManifest });
    if (stored.examsBase64) await applyRemoteExams(stored.examsBase64);
  } catch (e) {
    console.error('[update] טעינת נתונים מרוחקים שמורים נכשלה', e);
  }
}

/** בודק מול GitHub אם יש גרסת נתונים חדשה (משווה dataVersion). */
export async function checkForUpdates(): Promise<UpdateCheck> {
  const localVersion = examsManifest.dataVersion;
  const body = await fetchText(`${RAW_BASE}/public/data/exams-manifest.json`);
  const remote = JSON.parse(body) as ExamsManifest;
  return {
    available: !!remote.dataVersion && remote.dataVersion !== localVersion,
    remoteVersion: remote.dataVersion ?? '',
    localVersion,
  };
}

async function fetchDocxBase64(issueId: string): Promise<string> {
  const url = `${API_CONTENTS}/exams-src/${issueId}.docx?ref=${BRANCH}`;
  const body = await fetchText(url, GH_HEADERS);
  const json = JSON.parse(body) as { content?: string; encoding?: string };
  if (json.encoding !== 'base64' || !json.content) {
    throw new Error(`תוכן לא צפוי עבור ${issueId}.docx`);
  }
  return json.content.replace(/\s/g, '');
}

export interface UpdateResult {
  version: string;
  fetchedIssues: string[];
  totalIssues: number;
}

/**
 * מושך את הנתונים העדכניים: schedule + exams-manifest (raw) וקבצי docx שהשתנו
 * (Contents API). שומר ב-storage ומיישם מיד. מחזיר סיכום.
 */
export async function applyUpdate(): Promise<UpdateResult> {
  const [scheduleBody, manifestBody] = await Promise.all([
    fetchText(`${RAW_BASE}/public/data/schedule.json`),
    fetchText(`${RAW_BASE}/public/data/exams-manifest.json`),
  ]);
  const remoteSchedule = JSON.parse(scheduleBody) as Schedule;
  const remoteManifest = JSON.parse(manifestBody) as ExamsManifest;

  const prev = await storageGet<StoredRemote>(STORAGE_KEY);
  const examsBase64: Record<string, string> = { ...(prev?.examsBase64 ?? {}) };
  const issueVersions: Record<string, string> = { ...(prev?.issueVersions ?? {}) };

  // מושכים רק docx שהשתנה (לפי version) או שעדיין לא נשמר
  const fetched: string[] = [];
  for (const exam of remoteManifest.exams) {
    if (issueVersions[exam.issueId] !== exam.version || !examsBase64[exam.issueId]) {
      examsBase64[exam.issueId] = await fetchDocxBase64(exam.issueId);
      issueVersions[exam.issueId] = exam.version;
      fetched.push(exam.issueId);
    }
  }

  const stored: StoredRemote = {
    dataVersion: remoteManifest.dataVersion ?? '',
    schedule: remoteSchedule,
    examsManifest: remoteManifest,
    examsBase64,
    issueVersions,
    updatedAt: new Date().toISOString(),
  };
  await storageSet(STORAGE_KEY, stored);

  // יישום מיידי
  applyRemoteData({ schedule: remoteSchedule, examsManifest: remoteManifest });
  await applyRemoteExams(examsBase64);

  return { version: stored.dataVersion, fetchedIssues: fetched, totalIssues: remoteManifest.exams.length };
}

export { hasNetwork };
