// 빌드: venues.yml + 크롤링 결과를 합치고 점수를 계산해 site/data.json 을 만듭니다.
//   node scripts/build.mjs
import { p, readYaml, readJson, writeJson, toUtcIso, normType, TYPE_LABEL } from './lib.mjs';
import { writeIcs } from './ics.mjs';
import { mergeEditions } from './merge.mjs';

const NOW = new Date();
const MIN_YEAR = NOW.getUTCFullYear() - 1;

export const FIELDS = {
  dl: 'Deep Learning',
  medai: '의료 AI',
  imgproc: '이미지 처리',
  optics: 'Optics',
  neuro: 'Neuro',
  biomed: '의생명',
};

const venues = readYaml(p('data/venues.yml'), {});
const discovered = (readYaml(p('data/discovered.yml'), []) || []).filter((d) => !d.hidden);
const candidates = (readYaml(p('data/candidates.yml'), []) || []).filter((c) => !c.hidden);
const ccf = readJson(p('data/crawled/ccfddl.json'), {});
const hf = readJson(p('data/crawled/hf.json'), {});
const meta = readJson(p('data/crawled/meta.json'), {});
const scraped = readJson(p('data/crawled/scraped.json'), {});
const notices = (readYaml(p('data/notices.yml'), []) || []).filter((n) => !n.hidden);
const details = readYaml(p('data/details.yml'), {}) || {};
const detailsEn = readYaml(p('data/details_en.yml'), {}) || {};
const quick = readYaml(p('data/quick.yml'), {}) || {};
const pickQuick = (q) => (q ? {
  format: q.format || null, review: q.review || null, proceedings: q.proceedings || null, cadence: q.cadence || null,
  looks_for: q.looks_for || null, sources: q.sources || [],
} : null);
const pickDetails = (d) => (d ? {
  about: d.about || null, topics: d.topics || [], features: d.features || [],
  acceptance_rate: d.acceptance_rate || null, typical_schedule: d.typical_schedule || null, sources: d.sources || [],
} : null);

// ------------------------------------------------------------------ 일정 병합 + 변경 표시
const history = readJson(p('data/history.json'), {});
const RECENT = 14 * 864e5;
function editionsWithChanges(v) {
  return mergeEditions(v, { ccf, hf, scraped }, MIN_YEAR).map((e) => ({
    ...e,
    deadlines: e.deadlines.map((d) => {
      const h = history[`${v.id}|${e.year}|${d.type}|${d.label}`];
      const out = { ...d };
      if (h?.changed_at && NOW - Date.parse(h.changed_at) < RECENT) { out.changed = true; out.prev = h.prev; }
      else if (h?.since && NOW - Date.parse(h.since) < RECENT) out.added = true;
      return out;
    }),
  }));
}

// ------------------------------------------------------------------ 점수
const CORE = { 'A*': 1, A: 0.8, B: 0.55, C: 0.3 };
const CCF = { A: 1, B: 0.65, C: 0.35 };
const W = { h5: 0.45, core: 0.3, ccf: 0.15, tier: 0.4 };

const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

function difficulty(rate) {
  if (rate == null) return null;
  if (rate < 0.2) return '최상';
  if (rate < 0.27) return '상';
  if (rate < 0.35) return '중상';
  if (rate < 0.5) return '중';
  return '하';
}

/** raw 점수를 전체/분야별 최고점 기준 0~1 로 정규화 */
function normalize(items) {
  const scored = items.filter((x) => x._raw != null);
  const maxAll = Math.max(...scored.map((x) => x._raw), 1e-9);
  for (const x of items) {
    x.score = { overall: x._raw == null ? null : r3(x._raw / maxAll), byField: {} };
  }
  for (const f of Object.keys(FIELDS)) {
    const inField = scored.filter((x) => x.fields.includes(f));
    const max = Math.max(...inField.map((x) => x._raw), 1e-9);
    for (const x of inField) x.score.byField[f] = r3(x._raw / max);
  }
  for (const x of items) delete x._raw;
}

// ------------------------------------------------------------------ 학회
const confList = [...(venues.conferences || []), ...discovered].map((v) => {
  const c = ccf[v.sources?.ccfddl];
  const h = hf[v.sources?.hf];
  const m = v.metrics || {};
  const metrics = {
    h5: m.h5 ?? h?.hindex ?? null,
    h5_source: m.h5 != null ? 'manual' : h?.hindex != null ? 'huggingface' : null,
    core: m.core ?? (c?.rank?.core && c.rank.core !== 'N' ? c.rank.core : null),
    ccf: c?.rank?.ccf && c.rank.ccf !== 'N' ? c.rank.ccf : null,
    accept_rate: m.accept_rate ?? null,
    tier: m.tier ?? null,
  };
  return {
    id: v.id, name: v.name, full: v.full || c?.full || h?.full || '', kind: 'conference',
    fields: v.fields || [], region: v.region || 'intl', target: !!v.target, link: v.link,
    status: v.status || null, verified: !!(m.verified ?? v.verified),
    metrics, difficulty: difficulty(metrics.accept_rate), editions: editionsWithChanges(v),
    details: pickDetails(details[v.id]),
    details_en: pickDetails(detailsEn[v.id]),
    quick: pickQuick(quick[v.id]),
    name_en: v.name_en || detailsEn[v.id]?.name_en || null,
    full_en: v.full_en || detailsEn[v.id]?.full_en || null,
  };
});

const h5Max = Math.max(...confList.map((x) => x.metrics.h5 || 0), 1);
for (const x of confList) {
  const parts = [];
  const { h5, core, ccf: ccfRank, tier } = x.metrics;
  const ranks = [CORE[core], CCF[ccfRank]].filter((v) => v != null);
  if (h5) parts.push([Math.log1p(h5) / Math.log1p(h5Max), W.h5]);
  // h5 가 없으면 등급만으로 1.0 이 되지 않도록, 등급 평균의 85% 로 추정해 넣음
  else if (ranks.length) parts.push([0.85 * ranks.reduce((a, b) => a + b, 0) / ranks.length, W.h5]);
  if (core && CORE[core] != null) parts.push([CORE[core], W.core]);
  if (ccfRank && CCF[ccfRank] != null) parts.push([CCF[ccfRank], W.ccf]);
  if (tier != null) parts.push([tier, W.tier]);
  x._raw = parts.length ? parts.reduce((s, [v, w]) => s + v * w, 0) / parts.reduce((s, [, w]) => s + w, 0) : null;
  x.score_basis = parts.length;
}
normalize(confList);

// ------------------------------------------------------------------ 저널
//   venues.yml: id·분야·랩 게재 매칭 / data/journals.yml: 조사된 이름·IF·범위 (venues.yml 값이 우선)
const jinfo = readYaml(p('data/journals.yml'), {}) || {};
const labPubs = readJson(p('data/crawled/lab_pubs.json'), { items: [] });
const ALL_FIELDS = Object.keys(FIELDS);
const journalsRaw = (venues.journals || []).map((j) => {
  const info = jinfo[j.id] || {};
  const ifv = j.if ?? info.if ?? null;
  const re = j.match ? new RegExp(j.match, 'i') : null;
  const pubs = re
    ? labPubs.items.filter((x) => x.type !== 'patent' && re.test(x.venue || '')).map((x) => ({ year: x.year, title: x.title, doi: x.doi || null }))
    : [];
  return {
    id: j.id, name: j.name || info.name || j.id, full: j.full || info.full || '', kind: 'journal',
    fields: (j.fields || []).includes('all') ? ALL_FIELDS : (j.fields || []),
    link: j.link || info.link || null, publisher: info.publisher || null,
    if: ifv, if_year: j.if_year ?? info.if_year ?? null, if_source: j.if != null ? 'manual' : info.if_source || null,
    // 공식 출처가 있거나 직접 확인(verified)했으면 검증된 값으로 표시
    verified: !!(j.verified || (j.if == null && info.if != null && info.if_source && info.if_verified !== false)),
    quartile: j.quartile ?? null, oa: info.oa || null, apc_usd: info.apc_usd ?? null,
    quick: info.quick || null, sources: info.sources || [],
    lab_pubs: pubs.sort((a, b) => (b.year || 0) - (a.year || 0)),
    special_issues: (j.special_issues || [])
      .map((s) => ({ title: s.title, link: s.link || j.link || info.link, at: toUtcIso(s.at, s.timezone || 'UTC+0') }))
      .filter((s) => s.at),
  };
});
const ifMax = Math.max(...journalsRaw.map((j) => j.if || 0), 1);
const journals = journalsRaw.map((j) => ({ ...j, _raw: j.if ? Math.log1p(j.if) / Math.log1p(ifMax) : null }));
normalize(journals);
// 트래커에 없는 랩 게재 저널 (venues.yml 에 추가할 후보) 을 빌드 로그에 표시
const unmatched = labPubs.items.filter((x) => x.type !== 'patent' && x.venue && !/journal name|patent/i.test(x.venue)
  && !(venues.journals || []).some((j) => j.match && new RegExp(j.match, 'i').test(x.venue)));
if (unmatched.length) console.log('lab venues not in tracker:', [...new Set(unmatched.map((x) => x.venue))].join(' | '));

// ------------------------------------------------------------------ 내 연구 관련도
const research = (readYaml(p('data/research.yml'), {}) || {}).keywords || [];
const KW = research.map((k) => ({ ...k, re: new RegExp(k.match, 'i') }));
const textOf = (x) => {
  const d = x.details || {}, e = x.details_en || {}, q = x.quick || {};
  const flat = (v) => (v == null ? '' : Array.isArray(v) ? v.map(flat).join(' ') : typeof v === 'object' ? Object.values(v).map(flat).join(' ') : String(v));
  return [x.name, x.full, flat(d.about), flat(d.topics), flat(d.features), flat(e.about), flat(e.topics), flat(e.features), flat(q.scope), flat(q.looks_for), flat(q.format)].join(' \n ');
};
for (const x of [...confList, ...journals]) {
  const txt = textOf(x);
  x.research = KW.filter((k) => k.re.test(txt)).map((k) => k.id);
  x.research_score = x.research.reduce((s, id) => s + (KW.find((k) => k.id === id).main ? 2 : 1), 0);
}

// ------------------------------------------------------------------ 출력
const out = {
  generatedAt: NOW.toISOString(),
  crawledAt: meta.crawledAt || null,
  crawlStale: !meta.crawledAt || NOW - Date.parse(meta.crawledAt) > 21 * 864e5,
  recentChanges: (meta.changes || []).slice(0, 30),
  fields: FIELDS,
  conferences: confList,
  journals,
  research: research.map(({ id, ko, en, main }) => ({ id, ko, en, main: !!main })),
  labPubsSource: labPubs.source || null,
  labPubsTotal: labPubs.items.filter((x) => x.type !== 'patent').length,
  candidates: candidates.filter((c) => !c.lowq).map(({ hidden, lowq, ...c }) => c),
  candidatesLowQ: candidates.filter((c) => c.lowq).length,
  notices: notices.map(({ hidden, ...n }) => n).sort((a, b) => b.first_seen.localeCompare(a.first_seen)),
};
writeJson(p('site/data.json'), out);
writeIcs();

const withNext = confList.filter((c) => c.editions.some((e) => e.deadlines.some((d) => new Date(d.at) > NOW)));
console.log(`conferences: ${confList.length} (upcoming deadline: ${withNext.length}), journals: ${journals.length}, candidates: ${candidates.length}`);
