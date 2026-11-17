// site/data.json → site/deadlines.ics (구글/애플/아웃룩 캘린더 구독용)
//   build.mjs 가 호출. 지난 마감은 60일까지만 포함.
import { p, readJson } from './lib.mjs';
import fs from 'node:fs';

const TYPE = { abstract: 'Abstract', paper: 'Paper', supplementary: 'Supplementary', rebuttal: 'Rebuttal', camera_ready: 'Camera-ready', registration: 'Registration', notification: 'Notification', other: 'Deadline' };
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => { const out = []; let s = line; while (s.length > 72) { out.push(s.slice(0, 72)); s = ' ' + s.slice(72); } out.push(s); return out.join('\r\n'); };
const stamp = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function writeIcs() {
  const d = readJson(p('site/data.json'), null);
  if (!d) return;
  const now = Date.now();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lab Deadlines//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Lab Deadlines', 'X-WR-TIMEZONE:Asia/Seoul', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D'];
  let n = 0;
  const add = (uid, at, title, desc, url) => {
    const t = Date.parse(at);
    if (!Number.isFinite(t) || t < now - 60 * 864e5) return;
    lines.push('BEGIN:VEVENT', `UID:${uid}@lab-deadlines`, `DTSTAMP:${stamp(d.generatedAt)}`, `DTSTART:${stamp(at)}`, `DTEND:${stamp(at)}`,
      fold(`SUMMARY:${esc(title)}`), fold(`DESCRIPTION:${esc(desc)}`));
    if (url) lines.push(fold(`URL:${url}`));
    lines.push('BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(title)} — 7 days left`), 'END:VALARM');
    lines.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', fold(`DESCRIPTION:${esc(title)} — 1 day left`), 'END:VALARM');
    lines.push('END:VEVENT');
    n++;
  };
  for (const c of d.conferences) {
    for (const e of c.editions) for (const [i, dl] of (e.deadlines || []).entries()) {
      const label = dl.label && !/^(abstract|paper|rebuttal|notification)$/i.test(dl.label) ? dl.label : TYPE[dl.type] || dl.type;
      add(`${c.id}-${e.year}-${dl.type}-${i}`, dl.at, `[${c.target ? '★ ' : ''}${c.name} ${e.year}] ${label}`,
        [c.full, e.place ? `Venue: ${e.place}` : '', e.date ? `Dates: ${e.date}` : '', `Source: ${e.source}`, e.link || c.link].filter(Boolean).join('\n'), e.link || c.link);
    }
  }
  for (const j of d.journals) for (const [i, s] of (j.special_issues || []).entries()) {
    add(`${j.id}-si-${i}`, s.at, `[${j.name}] Special issue: ${s.title}`, j.full, s.link);
  }
  lines.push('END:VCALENDAR');
  fs.writeFileSync(p('site/deadlines.ics'), lines.join('\r\n') + '\r\n');
  console.log(`ics: ${n} events`);
}

if (process.argv[1]?.endsWith('ics.mjs')) writeIcs();
