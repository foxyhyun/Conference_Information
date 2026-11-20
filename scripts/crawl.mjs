// 크롤러: 공개 데드라인 저장소 + WikiCFP 에서 일정을 수집합니다.
//   node scripts/crawl.mjs
// 결과:
//   data/crawled/ccfddl.json, data/crawled/hf.json  — 연결된 학회의 최신 일정
//   data/discovered.yml  — 큐레이션된 소스에서 새로 발견된 관련 학회 (사이트에 NEW 로 표시)
//   data/candidates.yml  — WikiCFP 에서 찾은 후보 (검증 전, 사이트의 '후보' 탭에만 표시)
import yaml from 'js-yaml';
import { p, readYaml, writeYaml, writeJson, fetchText, toUtcIso, normType, sleep } from './lib.mjs';
import { scrapeVenue, watchNotices } from './scrape.mjs';
import { updateHistory } from './merge.mjs';
import { crawlLabPubs, LAB_PUB_URL } from './labpubs.mjs';
import { readJson } from './lib.mjs';

const NOW = new Date();
const MIN_YEAR = NOW.getUTCFullYear() - 1;
const venues = readYaml(p('data/venues.yml'), {});
const confs = venues.conferences || [];

// ------------------------------------------------------------------ ccfddl
async function crawlCcfddl() {
  const txt = await fetchText('https://ccfddl.github.io/conference/allconf.yml');
  const all = yaml.load(txt) || [];
  const out = {};
  for (const c of all) {
    const editions = (c.confs || [])
      .filter((e) => Number(e.year) >= MIN_YEAR)
      .map((e) => {
        const deadlines = [];
        for (const t of e.timeline || []) {
          const note = t.comment ? ` (${t.comment})` : '';
          const add = (key, type) => {
            const at = toUtcIso(t[key], e.timezone);
            if (at) deadlines.push({ type, label: type + note, at });
          };
          add('abstract_deadline', 'abstract');
          add('deadline', 'paper');
          add('rebuttal_deadline', 'rebuttal');
          add('decision_deadline', 'notification');
        }
        return { year: Number(e.year), link: e.link, date: e.date, place: e.place, timezone: e.timezone, deadlines, source: 'ccfddl' };
      });
    out[c.title] = { title: c.title, full: c.description, sub: c.sub, rank: c.rank || {}, editions };
  }
  return out;
}

// ------------------------------------------------------------------ huggingface/ai-deadlines
async function crawlHf() {
  const list = JSON.parse(await fetchText('https://api.github.com/repos/huggingface/ai-deadlines/contents/src/data/conferences'));
  const out = {};
  for (const f of list.filter((x) => x.name.endsWith('.yml'))) {
    const key = f.name.replace(/\.yml$/, '');
    let items;
    try {
      items = yaml.load(await fetchText(f.download_url)) || [];
    } catch (e) {
      console.warn('  hf parse fail', key, e.message);
      continue;
    }
    const editions = [];
    let meta = {};
    for (const it of items) {
      meta = { title: it.title, full: it.full_name, hindex: it.hindex, tags: it.tags, rankings: it.rankings };
      if (Number(it.year) < MIN_YEAR) continue;
      const deadlines = [];
      if (Array.isArray(it.deadlines)) {
        for (const d of it.deadlines) {
          const at = toUtcIso(d.date, d.timezone || it.timezone);
          if (at) deadlines.push({ type: normType(d.type), label: d.label || d.type, at });
        }
      } else {
        const ab = toUtcIso(it.abstract_deadline, it.timezone);
        if (ab) deadlines.push({ type: 'abstract', label: 'Abstract', at: ab });
        const dl = toUtcIso(it.deadline, it.timezone);
        if (dl) deadlines.push({ type: 'paper', label: 'Paper', at: dl });
      }
      const place = it.venue || [it.city, it.country].filter(Boolean).join(', ');
      editions.push({ year: Number(it.year), link: it.link, date: it.date, place, deadlines, source: 'hf' });
    }
    out[key] = { ...meta, editions };
    await sleep(100);
  }
  return out;
}

// ------------------------------------------------------------------ 신규 학회 발견 (큐레이션 소스)
// 랩 관련 분야만: 비전/영상, 의료, 광학, 뉴로. (일반 ML 이론·NLP·시각화는 제외)
const RELEVANT = /vision|image|imaging|video|medical|biomedical|health|clinical|surg|optic|photon|laser|neuro|brain|pattern recognition|multimedia|visual (?:information|computing|signal)/i;

function guessFields(text) {
  const t = text.toLowerCase();
  const f = new Set();
  if (/medic|health|clinical|biomed|surg/.test(t)) f.add('medai');
  if (/optic|photon|laser/.test(t)) f.add('optics');
  if (/neuro|brain/.test(t)) f.add('neuro');
  if (/biolog|bioinformatic|biomed|clinical|pain|stroke|ophthalm|cell/.test(t)) f.add('biomed');
  if (/radiat|nuclear|radon|neutron|dosimet|radioact/.test(t)) f.add('rad');
  if (/image|imaging|video|multimedia|visual|graphic/.test(t)) f.add('imgproc');
  if (/vision|learning|neural|artificial intelligence|\bai\b|pattern/.test(t)) f.add('dl');
  return f.size ? [...f] : ['dl'];
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function discover(ccf, hf) {
  const file = p('data/discovered.yml');
  const existing = readYaml(file, []) || [];
  const mappedCcf = new Set(confs.map((c) => c.sources?.ccfddl).filter(Boolean));
  const mappedHf = new Set(confs.map((c) => c.sources?.hf).filter(Boolean));
  for (const d of existing) {
    if (d.sources?.ccfddl) mappedCcf.add(d.sources.ccfddl);
    if (d.sources?.hf) mappedHf.add(d.sources.hf);
  }
  const added = [];
  const hasFuture = (eds) => eds.some((e) => e.year >= NOW.getUTCFullYear());

  for (const c of Object.values(ccf)) {
    if (mappedCcf.has(c.title)) continue;
    const good = ['A*', 'A', 'B'].includes(c.rank.core) || ['A', 'B'].includes(c.rank.ccf);
    const text = `${c.title} ${c.full}`;
    if (!good || !RELEVANT.test(text) || !hasFuture(c.editions)) continue;
    if (!['AI', 'CG', 'MX', 'HI'].includes(c.sub)) continue;
    // hf 에 같은 학회가 있으면 함께 연결
    const hfKey = Object.keys(hf).find((k) => !mappedHf.has(k) && hf[k].title?.toLowerCase() === c.title.toLowerCase());
    const entry = {
      id: 'auto-' + slug(c.title), name: c.title, full: c.full, fields: guessFields(text), region: 'intl',
      link: c.editions.at(-1)?.link, sources: { ccfddl: c.title, ...(hfKey ? { hf: hfKey } : {}) },
      metrics: { ...(c.rank.core && c.rank.core !== 'N' ? { core: c.rank.core } : {}) },
      status: 'new', discovered: NOW.toISOString().slice(0, 10), hidden: false,
    };
    if (hfKey) mappedHf.add(hfKey);
    mappedCcf.add(c.title);
    added.push(entry);
  }
  for (const [k, h] of Object.entries(hf)) {
    if (mappedHf.has(k)) continue;
    const text = `${h.title} ${h.full} ${(h.tags || []).join(' ')}`;
    if (!RELEVANT.test(`${h.title} ${h.full}`) || !hasFuture(h.editions)) continue;
    const id = 'auto-' + slug(h.title || k);
    if (added.some((a) => a.id === id) || existing.some((a) => a.id === id)) continue;
    added.push({
      id, name: h.title || k, full: h.full, fields: guessFields(text), region: 'intl',
      link: h.editions.at(-1)?.link, sources: { hf: k }, metrics: {},
      status: 'new', discovered: NOW.toISOString().slice(0, 10), hidden: false,
    });
  }
  if (added.length) {
    writeYaml(file, [...existing, ...added],
      '# 크롤러가 자동으로 추가한 학회입니다. 분야(fields)를 확인하고, 필요 없으면 hidden: true 로 바꾸세요.\n' +
      '# 확인이 끝난 항목은 status: new 줄을 지우면 NEW 배지가 사라집니다.\n\n');
  }
  return added;
}

// ------------------------------------------------------------------ WikiCFP 후보
const WIKICFP_CATEGORIES = [
  'computer vision', 'image processing', 'medical imaging', 'deep learning', 'machine learning',
  'biomedical engineering', 'optics', 'photonics', 'neuroscience', 'bioinformatics',
];

async function crawlWikiCfp() {
  const file = p('data/candidates.yml');
  const prev = readYaml(file, []) || [];
  const byId = new Map(prev.map((c) => [String(c.eventid), c]));
  const rowRe = /event\.showcfp\?eventid=(\d+)[^"]*">([^<]+)<\/a><\/td>\s*<td[^>]*colspan="3">([^<]*)<\/td>[\s\S]*?<tr[^>]*>\s*<td align="left">([^<]*)<\/td>\s*<td align="left">([^<]*)<\/td>\s*<td align="left">([^<]*)<\/td>/g;
  let fresh = 0;
  for (const cat of WIKICFP_CATEGORIES) {
    let html;
    try {
      html = await fetchText('http://www.wikicfp.com/cfp/call?conference=' + encodeURIComponent(cat));
    } catch (e) {
      console.warn('  wikicfp fail', cat, e.message);
      continue;
    }
    for (const m of html.matchAll(rowRe)) {
      const [, eventid, acronym, title, when, where, deadlineRaw] = m;
      const dl = Date.parse(deadlineRaw.replace(/\(.*\)/, '').trim());
      if (!Number.isFinite(dl) || dl < NOW.getTime()) continue;
      const cur = byId.get(eventid);
      const rec = {
        eventid: Number(eventid), name: decode(acronym.trim()), full: decode(title.trim()),
        when: when.trim(), where: decode(where.trim()),
        deadline: new Date(dl).toISOString().slice(0, 10),
        categories: [...new Set([...(cur?.categories || []), cat])],
        fields: guessFields(`${title} ${cat}`),
        link: `http://www.wikicfp.com/cfp/servlet/event.showcfp?eventid=${eventid}`,
        hidden: cur?.hidden ?? false,
        first_seen: cur?.first_seen || NOW.toISOString().slice(0, 10),
      };
      if (!cur) fresh++;
      byId.set(eventid, rec);
    }
    await sleep(1500); // 서버 부담을 줄이기 위해 천천히
  }
  // 마감이 30일 이상 지난 후보는 정리. 이미 등록된 학회(약어 일치)와 흔한 저품질 패턴은 숨김
  const cutoff = NOW.getTime() - 30 * 864e5;
  const known = new Set(confs.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const LOWQ = /^(ieee|acm|spie)?-?-?\s*20\d\d\s+\d+(st|nd|rd|th)\s+international conference|\(\w+ 20\d\d\)$|conference proceedings citation index|ei compendex|scopus/i;
  const list = [...byId.values()]
    .filter((c) => Date.parse(c.deadline) >= cutoff)
    .map((c) => {
      const acro = c.name.replace(/\s*20\d\d$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (known.has(acro)) c.hidden = true;             // 이미 정식 등록된 학회
      if (LOWQ.test(c.full)) c.lowq = true;             // "IEEE--2027 11th International Conference on ..." 류
      return c;
    })
    .sort((a, b) => (a.lowq ? 1 : 0) - (b.lowq ? 1 : 0) || a.deadline.localeCompare(b.deadline));
  writeYaml(file, list,
    '# WikiCFP 에서 수집한 후보 (검증 전). 약탈적 학회가 섞여 있을 수 있습니다.\n' +
    '# 숨기려면 hidden: true, 정식 등록하려면 venues.yml 로 옮기세요.\n\n');
  return { total: list.length, fresh };
}

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ------------------------------------------------------------------ main
const t0 = Date.now();
console.log('ccfddl ...');
const ccf = await crawlCcfddl();
console.log(`  ${Object.keys(ccf).length} venues`);
console.log('huggingface/ai-deadlines ...');
const hf = await crawlHf();
console.log(`  ${Object.keys(hf).length} venues`);
writeJson(p('data/crawled/ccfddl.json'), ccf);
writeJson(p('data/crawled/hf.json'), hf);

const added = discover(ccf, hf);
console.log(`discovered ${added.length} new venue(s)` + (added.length ? ': ' + added.map((a) => a.name).join(', ') : ''));

console.log('WikiCFP ...');
let wiki = { total: 0, fresh: 0 };
try {
  wiki = await crawlWikiCfp();
} catch (e) {
  console.warn('  WikiCFP skipped:', e.message);
}
console.log(`  ${wiki.total} candidates (${wiki.fresh} new)`);

// ------------------------------------------------------------------ 공식 사이트 추출 + 국내 공지
console.log('official sites ...');
const allVenues = [...confs, ...(readYaml(p('data/discovered.yml'), []) || [])];
// 사이트가 일시적으로 막히면(특히 GitHub 러너 IP 차단) 이전에 읽은 값을 유지 — 아직 미래 마감이 남아 있는 경우만
const prevScraped = readJson(p('data/crawled/scraped.json'), {});
const scraped = {};
for (const v of allVenues.filter((v) => v.scrape)) {
  let eds = [];
  try {
    eds = await scrapeVenue(v, NOW);
  } catch (e) {
    console.warn(`  ${v.name}: failed (${e.message})`);
  }
  if (eds.length) {
    scraped[v.id] = eds;
    console.log(`  ${v.name}: ${eds.reduce((s, e) => s + e.deadlines.length, 0)} dates`);
  } else if (prevScraped[v.id]?.some((e) => e.deadlines.some((d) => Date.parse(d.at) > NOW.getTime()))) {
    scraped[v.id] = prevScraped[v.id];
    console.log(`  ${v.name}: unreachable, kept previous result`);
  } else {
    console.log(`  ${v.name}: 0 dates`);
  }
  await sleep(800);
}
writeJson(p('data/crawled/scraped.json'), scraped);

console.log('domestic notices ...');
const noticeFile = p('data/notices.yml');
const prevNotices = readYaml(noticeFile, []) || [];
const prevByKey = new Map(prevNotices.map((n) => [n.venue + '|' + n.title, n]));
const notices = [];
let newNotices = 0;
for (const v of allVenues.filter((v) => v.watch)) {
  for (const n of await watchNotices(v).catch(() => [])) {
    const old = prevByKey.get(n.venue + '|' + n.title);
    if (!old) newNotices++;
    notices.push({ ...n, first_seen: old?.first_seen || NOW.toISOString().slice(0, 10), hidden: old?.hidden ?? false });
  }
  await sleep(800);
}
// 이번에 안 보인 공지도 60일간 유지 (홈페이지에서 밀려났을 수 있음)
for (const n of prevNotices) {
  if (!notices.some((x) => x.venue === n.venue && x.title === n.title) && Date.parse(n.first_seen) > NOW.getTime() - 60 * 864e5) notices.push(n);
}
writeYaml(noticeFile, notices,
  '# 국내 학회 홈페이지에서 수집한 논문/초록 모집 공지. 숨기려면 hidden: true\n\n');
console.log(`  ${notices.length} notices (${newNotices} new)`);

// ------------------------------------------------------------------ 랩 게재 이력 (저널 탭의 "랩 게재" 배지)
try {
  const items = await crawlLabPubs();
  if (items.length) writeJson(p('data/crawled/lab_pubs.json'), { source: LAB_PUB_URL, crawledAt: NOW.toISOString(), items });
  console.log(`lab publications: ${items.length}`);
} catch (e) {
  console.warn('lab publications: failed, kept previous', e.message);
}

// ------------------------------------------------------------------ 마감 변경 이력
const history = readJson(p('data/history.json'), {});
const changes = updateHistory(history, allVenues, { ccf, hf, scraped }, NOW);
writeJson(p('data/history.json'), history);
const prevMeta = readJson(p('data/crawled/meta.json'), {});
const changeLog = [...changes.map((c) => ({ ...c, when: NOW.toISOString().slice(0, 10) })), ...(prevMeta.changes || [])]
  .filter((c) => NOW - Date.parse(c.when) < 60 * 864e5).slice(0, 100);
console.log(`deadline changes: ${changes.length}` + (changes.length ? ' — ' + changes.map((c) => `${c.venue} ${c.year} ${c.label} (${c.kind})`).join(', ') : ''));

writeJson(p('data/crawled/meta.json'), {
  crawledAt: NOW.toISOString(),
  discovered: added.map((a) => a.name),
  wikicfpNew: wiki.fresh,
  scraped: Object.keys(scraped),
  noticesNew: newNotices,
  changes: changeLog,
});
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
