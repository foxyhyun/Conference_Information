// 공식 사이트 마감 추출기
//   - venues.yml 의 각 학회에 `scrape:` 설정이 있으면 해당 페이지에서 날짜를 뽑아냅니다.
//   - 결과는 자동 추출값이라 사이트에 "자동 추출" 표시와 출처 링크가 함께 나갑니다.
//
//   scrape:
//     url: https://embc.embs.org/{year}/important-dates/   # {year} 는 올해·내년을 차례로 시도
//     follow: true          # 페이지 안의 "Important Dates / Call for Papers" 링크도 따라감
//     label: after          # 날짜 라벨이 날짜 뒤에 오는 사이트 (기본 before)
//     timezone: AoE         # 시각/시간대가 없을 때 기본값 (국내 기본 UTC+9)
//     include: "Paper|Abstract"   # (선택) 라벨이 이 정규식과 맞는 것만
//     exclude: "Workshop|Tutorial" # (선택) 추가 제외 패턴
//
// 단독 테스트: node scripts/scrape.mjs <venue id> [--dump]
import { toUtcIso, sleep } from './lib.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 (lab-deadline-tracker)';
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MON = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DAYNAME = '(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?,?\\s*)?';
// 날짜 패턴 (순서 중요)
const DATE_RES = [
  // 2027년 1월 18일
  { re: /(20\d\d)\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g, f: (m) => [m[1], m[2], m[3]] },
  // 2027.1.18 / 2027-01-18 / 2027/01/18
  { re: /\b(20\d\d)[.\-/]\s?(\d{1,2})[.\-/]\s?(\d{1,2})\b/g, f: (m) => [m[1], m[2], m[3]] },
  // November 23, 2026 / Monday, December 14, 2026
  { re: new RegExp(`\\b${DAYNAME}${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)`, 'gi'), f: (m) => [m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], m[2]] },
  // 23 November 2026 / Monday 21 September 2026
  { re: new RegExp(`\\b${DAYNAME}(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON},?\\s+(20\\d\\d)`, 'gi'), f: (m) => [m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], m[1]] },
];
const TIME_RE = /^[^|]{0,6}?(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*\(?\s*(aoe|anywhere on earth|pst|pdt|pt|est|edt|et|cet|cest|gmt|utc|kst|jst)?/i;
const TZ_MAP = { aoe: 'AoE', 'anywhere on earth': 'AoE', pst: 'UTC-8', pdt: 'UTC-7', pt: 'UTC-8', est: 'UTC-5', edt: 'UTC-4', et: 'UTC-5', cet: 'UTC+1', cest: 'UTC+2', gmt: 'UTC+0', utc: 'UTC+0', kst: 'UTC+9', jst: 'UTC+9' };

// 마감으로 볼 라벨 / 제외할 라벨
const KEYWORD = /deadline|due|submi|abstract|paper|manuscript|camera|final|notif|accept|decision|regist|rebuttal|마감|접수|제출|초록|논문|통보|등록|심사/i;
const EXCLUDE = /workshop|tutorial|special session|symposi|challenge|proposal|exhibit|sponsor|hotel|housing|travel|grant|award|volunteer|opens?\b|open[: ]|start|begin|reviewer|chair|job|채용|임용|공모|강사|워크샵\s*제안/i;

export function classify(label) {
  const s = label.toLowerCase();
  if (/notif|accept|decision|result|통보|결과|합격/.test(s)) return 'notification';
  if (/camera|final|최종/.test(s)) return 'camera_ready';
  if (/rebuttal/.test(s)) return 'rebuttal';
  if (/abstract|초록/.test(s) && !/paper|manuscript|full/.test(s)) return 'abstract';
  if (/regist|등록/.test(s)) return 'registration';
  if (/paper|manuscript|submi|논문|제출|접수|deadline|due|마감/.test(s)) return 'paper';
  return 'other';
}

/** HTML → 줄 단위 텍스트 (표의 칸은 " | " 로 구분) */
export function htmlToLines(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(td|th)>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|dt|dd|section|article|table|ul|ol)>/gi, '\n')
    .replace(/<(h[1-6])[^>]*>/gi, '\n#H ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&ndash;|&#8211;|&mdash;|&#8212;/g, '-')
    .replace(/&rsquo;|&lsquo;|&#8217;|&#8216;/g, "'").replace(/&[a-z]+;|&#\d+;/g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').replace(/^(\s*\|\s*)+|(\s*\|\s*)+$/g, '').trim())
    .filter(Boolean);
}

// 연도 없는 날짜 (July 14 / 14 July) — yearless 옵션이 있을 때만
const YEARLESS_RES = [
  { re: new RegExp(`^\\s*${DAYNAME}${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s*20\\d\\d)`, 'gi'), f: (m, y) => [y, MONTHS[m[1].slice(0, 3).toLowerCase()], m[2]] },
  { re: new RegExp(`^\\s*${DAYNAME}(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON}\\b(?!,?\\s*20\\d\\d)`, 'gi'), f: (m, y) => [y, MONTHS[m[2].slice(0, 3).toLowerCase()], m[1]] },
];

function findDates(line, yearless = null) {
  const out = [];
  const pats = yearless ? [...DATE_RES, ...YEARLESS_RES.map((p) => ({ re: p.re, f: (m) => p.f(m, yearless) }))] : DATE_RES;
  for (const { re, f } of pats) {
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) {
      const start = m.index, end = m.index + m[0].length;
      if (out.some((o) => start < o.end && end > o.start)) continue;
      const [y, mo, d] = f(m).map(Number);
      if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31)) continue;
      out.push({ start, end, y, mo, d });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const clean = (s) => s.replace(/^[\s|:,\-–>→~()]+|[\s|:,\-–<←~(]+$/g, '').replace(/\s*\|\s*/g, ' ').trim();

/**
 * 텍스트 줄에서 (라벨, 날짜) 쌍을 추출
 * @returns [{type,label,at}]
 */
const GENERIC = /^(paper\s+)?(submission|submissions close|notification|final submission|deadline|submission deadline|final submission deadline|accept\/reject notification|camera[- ]ready)$/i;
const LABEL_ONLY_EXCLUDE = /\breviews?\b|reviewer|bidding|meta-review/i;

export function extractDeadlines(rawLines, opt = {}) {
  const labelPos = opt.label || 'before';
  const defTz = opt.timezone || 'AoE';
  const include = opt.include ? new RegExp(opt.include, 'i') : null;
  const exclude = opt.exclude ? new RegExp(opt.exclude, 'i') : null;
  const yearless = opt.yearless ? Number(opt.yearless) : null;

  const lines = rawLines.map((l) => (l.startsWith('#H ') ? l.slice(3) : l));
  const isHead = rawLines.map((l) => l.startsWith('#H '));
  const dateCache = lines.map((l) => findDates(l, yearless));
  // 날짜(+시각)만 있는 줄인지
  const dateOnly = lines.map((l, i) => {
    const ds = dateCache[i];
    if (!ds.length) return false;
    let rest = l;
    for (const d of [...ds].reverse()) rest = rest.slice(0, d.start) + rest.slice(d.end);
    rest = rest.replace(TIME_RE, '').replace(/[\s|,()\-–:.]+/g, ' ').trim();
    return rest.length <= 12;
  });
  const hasDate = (i) => i >= 0 && i < lines.length && dateCache[i].length > 0;
  const textAt = (i) => (i >= 0 && i < lines.length && !hasDate(i) && lines[i].length < 120 ? lines[i] : '');

  const res = [];
  let heading = '';
  let group = '';
  lines.forEach((line, li) => {
    if (isHead[li] && !hasDate(li)) { heading = line; group = ''; return; }
    const dates = dateCache[li];
    if (!dates.length) return;

    // 날짜만 있는 줄: 라벨은 앞(또는 뒤) 줄, 그룹 제목은 그 앞 줄
    let lineLabel = null;
    if (dateOnly[li] && dates.length === 1) {
      if (labelPos === 'after') {
        lineLabel = textAt(li + 1);
        if (textAt(li - 1) && !hasDate(li - 2)) group = textAt(li - 1);
      } else {
        lineLabel = textAt(li - 1);
        if (textAt(li - 2)) group = textAt(li - 2);
      }
    }

    dates.forEach((dt, i) => {
      let label;
      if (lineLabel != null) label = lineLabel;
      else {
        const before = clean(line.slice(i ? dates[i - 1].end : 0, dt.start));
        const after = clean(line.slice(dt.end, i + 1 < dates.length ? dates[i + 1].start : line.length));
        label = labelPos === 'after' ? after : before;
        if (!label && labelPos !== 'after') label = textAt(li - 1);
      }
      // 날짜 바로 뒤 시각/시간대
      const tm = line.slice(dt.end).match(TIME_RE);
      let hh = 23, mm = 59, tz = defTz;
      if (tm && (tm[2] || tm[3] || tm[4]) && Number(tm[1]) <= 24) {
        hh = Number(tm[1]); mm = Number(tm[2] || 0);
        const ap = (tm[3] || '').toLowerCase();
        if (ap.startsWith('p') && hh < 12) hh += 12;
        if (ap.startsWith('a') && hh === 12) hh = 0;
        if (tm[4]) tz = TZ_MAP[tm[4].toLowerCase()];
        if (labelPos === 'after' && lineLabel == null) label = clean(label.replace(TIME_RE, ''));
      }
      label = (label || '').replace(/\s+/g, ' ').trim();
      if (!label || !KEYWORD.test(label)) return;
      if (label.length > 70) label = label.slice(-70);
      const ctx = `${heading} ${group} ${label}`;
      if (EXCLUDE.test(label) || EXCLUDE.test(group) || LABEL_ONLY_EXCLUDE.test(label) || (exclude && exclude.test(ctx))) return;
      if (include && !include.test(ctx)) return;
      if (group && GENERIC.test(label) && group.length <= 40) label = `${group} · ${label}`;
      const local = `${dt.y}-${String(dt.mo).padStart(2, '0')}-${String(dt.d).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
      const at = toUtcIso(local, tz);
      if (at) res.push({ type: classify(label), label, at });
    });
  });
  // 같은 타입·같은 시각 중복 제거
  const seen = new Set();
  return res.filter((d) => { const k = d.type + d.at; if (seen.has(k)) return false; seen.add(k); return true; });
}

async function fetchHtml(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en,ko;q=0.8' }, signal: ac.signal, redirect: 'follow' });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    let html = buf.toString('utf8');
    if (/charset=["']?(euc-kr|ks_c_5601)/i.test(html.slice(0, 3000))) html = new TextDecoder('euc-kr').decode(buf);
    if (/Pardon Our Interruption|captcha|cf-chl/i.test(html.slice(0, 5000))) return null; // 봇 차단 페이지
    return { html, url: r.url };
  } catch { return null; } finally { clearTimeout(timer); }
}

const FOLLOW_RE = /important[\s-]*dates|key[\s-]*dates|dates[\s-]*(and|&)[\s-]*deadlines|call[\s-]*for[\s-]*(papers|abstracts|content)|submission|deadlines|cfp|논문\s*모집|초록\s*(접수|모집)|주요\s*일정|일정\s*안내|논문\s*제출/i;

function followLinks(html, base) {
  const out = new Set();
  const host = new URL(base).host;
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const href = m[1] || m[2] || m[3];
    const text = m[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (!href || href.startsWith('#') || /^(mailto|javascript):/i.test(href)) continue;
    if (!FOLLOW_RE.test(text) && !FOLLOW_RE.test(href)) continue;
    try {
      const u = new URL(href, base);
      if (u.host === host && !/\.(pdf|docx?|pptx?|zip)$/i.test(u.pathname)) out.add(u.href.split('#')[0]);
    } catch {}
  }
  return [...out].slice(0, 5);
}

/** 학회 1개 스크래핑 → [{year, link, deadlines, source:'scraped'}] */
export async function scrapeVenue(v, now = new Date(), { dump = false } = {}) {
  const cfg = v.scrape;
  if (!cfg?.url) return [];
  const y = now.getUTCFullYear();
  const years = cfg.url.includes('{year}') ? [y + 1, y] : [null];
  const baseOpt = { timezone: cfg.timezone || (v.region === 'domestic' ? 'UTC+9' : 'AoE'), label: cfg.label, include: cfg.include, exclude: cfg.exclude };
  const editions = [];
  for (const year of years) {
    const opt = { ...baseOpt, yearless: cfg.yearless && year ? year : null };
    const start = year ? cfg.url.replaceAll('{year}', year) : cfg.url;
    const page = await fetchHtml(start);
    if (!page) continue;
    const pages = [page];
    if (cfg.follow) {
      for (const u of followLinks(page.html, page.url)) {
        if (u === page.url) continue;
        await sleep(500);
        const p2 = await fetchHtml(u);
        if (p2) pages.push(p2);
      }
    }
    let deadlines = [];
    for (const pg of pages) {
      const lines = htmlToLines(pg.html);
      if (dump) {
        const keep = new Set();
        lines.forEach((l, i) => { if (findDates(l).length) for (let k = i - 2; k <= i + 2; k++) keep.add(k); });
        console.log(`\n----- ${pg.url}\n` + lines.map((l, i) => (keep.has(i) ? `${String(i).padStart(4)}: ${l.slice(0, 140)}` : null)).filter(Boolean).join('\n'));
      }
      deadlines.push(...extractDeadlines(lines, opt));
    }
    // 1년 이상 지난 날짜, 2년 이상 먼 날짜는 버림
    deadlines = deadlines.filter((d) => {
      const t = Date.parse(d.at);
      return t > now.getTime() - 365 * 864e5 && t < now.getTime() + 2 * 365 * 864e5;
    });
    const seen = new Set();
    deadlines = deadlines.filter((d) => { const k = d.type + d.at; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.at.localeCompare(b.at));
    if (!deadlines.length) continue;
    // 회차 연도: 템플릿 연도, 없으면 마지막 마감 + 4개월의 연도
    const last = new Date(deadlines.filter((d) => d.type !== 'notification').at(-1)?.at || deadlines.at(-1).at);
    const edYear = year ?? new Date(last.getTime() + 120 * 864e5).getUTCFullYear();
    editions.push({ year: edYear, link: start, deadlines, source: 'scraped' });
    if (year) break; // 내년 페이지에서 찾았으면 올해 페이지는 생략
  }
  return editions;
}

// ------------------------------------------------------------------ 국내 학회 공지 감시
//   watch: https://www.theieie.org/   → 홈페이지의 '논문모집/초록모집/Call for' 공지 링크를 수집
const NOTICE_RE = /논문\s*(모집|접수|제출)|초록\s*(모집|접수|제출)|발표\s*(모집|신청)|call\s*for\s*(papers|abstracts|symposia|participation)|학술(대회|발표회)[^\n]{0,30}(개최|모집)/i;
const NOTICE_EXCLUDE = /채용|임용|공모전|강사|장학|출장|휴무|규정|시스템|투고|login/i;

export async function watchNotices(v) {
  if (!v.watch) return [];
  const page = await fetchHtml(v.watch);
  if (!page) return [];
  const html = page.html.replace(/<!--[\s\S]*?-->/g, ' ');
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]{0,400}?)<\/a>/gi)) {
    const href = m[1] || m[2] || m[3];
    const title = m[4].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title || title.length < 6 || !NOTICE_RE.test(title)) continue;
    if (NOTICE_EXCLUDE.test(title) || NOTICE_EXCLUDE.test(href)) continue;
    let url;
    try { url = /^javascript:/i.test(href) ? page.url : new URL(href, page.url).href; } catch { continue; }
    // 같은 공지가 여러 번 나오는 경우(번호·날짜만 다름) 하나로
    const key = title.replace(/^\d+\s+/, '').replace(/\s*\(deadline[^)]*\)/i, '').replace(/\s*\(?\d{4}[.\-]\d{1,2}[.\-]\d{1,2}\)?\s*$/, '').trim().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    // 제목의 날짜(행사일/마감일)가 모두 1주 이상 지났으면 지난 공지로 보고 제외
    const ds = findDates(title);
    // "2026 ... 학술대회 (8월 13일~14일)" 처럼 연도와 월/일이 떨어져 있는 경우
    const yr = title.match(/\b(20\d\d)\b/);
    for (const m of title.matchAll(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) if (yr) ds.push({ y: +yr[1], mo: +m[1], d: +m[2] });
    if (ds.length && ds.every((d) => Date.UTC(d.y, d.mo - 1, d.d) < Date.now() - 7 * 864e5)) continue;
    // 제목 안에 날짜가 있으면 함께 표시 (예: "~ 9.6", "2026.12.05")
    out.push({ venue: v.id, venue_name: v.name, title: title.slice(0, 140), url });
  }
  return out.slice(0, 10);
}

// ------------------------------------------------------------------ 단독 실행
if (process.argv[1]?.endsWith('scrape.mjs')) {
  const { p, readYaml } = await import('./lib.mjs');
  const venues = readYaml(p('data/venues.yml'), {}).conferences || [];
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dump = process.argv.includes('--dump');
  if (process.argv.includes('--watch')) {
    for (const v of venues.filter((v) => v.watch && (!ids.length || ids.includes(v.id)))) {
      const ns = await watchNotices(v);
      console.log(`\n=== ${v.name}  (${ns.length})`);
      for (const n of ns) console.log(`  - ${n.title}\n    ${n.url}`);
    }
    process.exit(0);
  }
  for (const v of venues.filter((v) => v.scrape && (!ids.length || ids.includes(v.id)))) {
    const eds = await scrapeVenue(v, new Date(), { dump });
    console.log(`\n=== ${v.name}`);
    if (!eds.length) console.log('  (nothing found)');
    for (const e of eds) {
      console.log(`  ${e.year}  ${e.link}`);
      for (const d of e.deadlines) console.log(`    ${d.type.padEnd(13)} ${d.at}  ${d.label}`);
    }
  }
}
