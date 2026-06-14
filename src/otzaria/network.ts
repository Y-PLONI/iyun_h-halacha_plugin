// עטיפה ל-network.fetch של ה-host. דורש הרשאת network.access + network.enabled
// ב-manifest + שה-URL נמצא ב-allowlist (של התוסף ושל אוצריא).
// הגוף מוחזר כטקסט בלבד (לכן קבצים בינאריים נמשכים דרך GitHub Contents API כ-base64).

import { callOtzaria, hasOtzaria } from './sdk';

export interface NetFetchResult {
  status: number;
  ok: boolean;
  body: string;
}

/** האם ניתן לבצע בקשות רשת (רצים בתוך אוצריא). */
export function hasNetwork(): boolean {
  return hasOtzaria();
}

export async function networkFetch(
  url: string,
  opts?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<NetFetchResult> {
  return await callOtzaria<NetFetchResult>('network.fetch', {
    url,
    method: opts?.method ?? 'GET',
    headers: opts?.headers,
    body: opts?.body,
  });
}

/** GET שמחזיר טקסט; זורק אם הסטטוס אינו 2xx. */
export async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const res = await networkFetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} עבור ${url}`);
  return res.body;
}
