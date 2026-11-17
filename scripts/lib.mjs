// 공통 유틸: 시간대 변환, 파일 입출력
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const p = (...a) => path.join(ROOT, ...a);

export const readYaml = (f, fallback) =>
  fs.existsSync(f) ? (yaml.load(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) ?? fallback) : fallback;
export const writeYaml = (f, obj, header = '') =>
  fs.writeFileSync(f, header + yaml.dump(obj, { lineWidth: 140, noRefs: true }));
export const readJson = (f, fallback) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : fallback;
export const writeJson = (f, obj) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 2));
};

const NAMED_TZ = { AOE: -12, UTC: 0, GMT: 0, PST: -8, PDT: -7, EST: -5, EDT: -4, CET: 1, CEST: 2, KST: 9, JST: 9 };

/** 알아들을 수 있는 시간대 표기인지 (검사기용) */
export function isKnownTz(tz) {
  if (tz == null) return true;
  const s = String(tz).trim().toUpperCase();
  return NAMED_TZ[s] !== undefined || /^(?:UTC|GMT)?\s*[+-]\s*\d{1,2}(?::?\d{2})?$/.test(s);
}

/** "UTC-8", "AoE", "UTC+05:30", "PST" → 분 단위 오프셋 (없으면 AoE) */
export function tzOffsetMinutes(tz) {
  if (!tz) return -12 * 60;
  const s = String(tz).trim().toUpperCase();
  if (NAMED_TZ[s] !== undefined) return NAMED_TZ[s] * 60;
  const m = s.match(/^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/);
  if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
  return -12 * 60;
}

/** "2026-11-16 23:59:59" + tz → ISO(UTC) 문자열. TBD/잘못된 값이면 null */
export function toUtcIso(local, tz) {
  if (!local) return null;
  const m = String(local).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, y, mo, d, h = '23', mi = '59', s = '59'] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - tzOffsetMinutes(tz) * 60000;
  return Number.isFinite(utc) ? new Date(utc).toISOString() : null;
}

export const TYPE_LABEL = {
  abstract: 'Abstract',
  paper: 'Paper',
  supplementary: 'Supplementary',
  rebuttal: 'Rebuttal',
  camera_ready: 'Camera-ready',
  notification: 'Notification',
  registration: 'Registration',
  other: 'Other',
};

/** 카운트다운 대상(제출 관련) 타입 */
export const SUBMISSION_TYPES = new Set(['abstract', 'paper', 'supplementary', 'rebuttal', 'camera_ready', 'registration', 'other']);

export function normType(t) {
  const s = String(t || '').toLowerCase();
  if (s.includes('abstract')) return 'abstract';
  if (s.includes('supp')) return 'supplementary';
  if (s.includes('rebuttal')) return 'rebuttal';
  if (s.includes('camera')) return 'camera_ready';
  if (s.includes('notif') || s.includes('decision') || s.includes('review_release')) return 'notification';
  if (s.includes('regist')) return 'registration';
  if (s.includes('paper') || s === 'deadline' || s.includes('submission')) return 'paper';
  return 'other';
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (lab-deadline-tracker)' } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {}
    await sleep(1500 * (i + 1));
  }
  throw new Error(`fetch failed: ${url}`);
}
