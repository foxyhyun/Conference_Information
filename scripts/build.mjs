// 빌드: venues.yml + 크롤링 결과를 합치고 점수를 계산해 site/data.json 을 만듭니다.
//   node scripts/build.mjs
import { p, readYaml, readJson, writeJson, toUtcIso, normType, TYPE_LABEL } from './lib.mjs';

const NOW = new Date();
const MIN_YEAR = NOW.getUTCFullYear() - 1;

export const FIELDS = {
  dl: 'Deep Learning',
  medai: '의료 AI',
  imgproc: '이미지 처리',
  optics: 'Optics',
  neuro: 'Bio / Neuro',
};

const venues = readYaml(p('data/venues.yml'), {});
const discovered = (readYaml(p('data/discovered.yml'), []) || []).filter((d) => !d.hidden);
const candidates = (readYaml(p('data/candidates.yml'), []) || []).filter((c) => !c.hidden);
const ccf = readJson(p('data/crawled/ccfddl.json'), {});
const hf = readJson(p('data/crawled/hf.json'), {});
const meta = readJson(p('data/crawled/meta.json'), {});

// ------------------------------------------------------------------ 일정 병합
function manualEditions(v) {
  return (v.editions || []).map((e) => ({
    year: Number(e.year), date: e.date, place: e.place, link: e.link || v.link, source: 'manual',
    deadlines: (e.deadlines || [])
      .map((d) => {
        const type = normType(d.type);
        return { type, label: d.label || TYPE_LABEL[type], at: toUtcIso(d.at, d.timezone || e.timezone || 'UTC+9') };
      })
      .filter((d) => d.at),
  }));
}

function mergeEditions(v) {
  const pools = [manualEditions(v), ccf[v.sources?.ccfddl]?.editions || [], hf[v.sources?.hf]?.editions || []];
  const years = new Set(pools.flat().map((e) => e.year));
  const out = [];
  for (const y of [...years].sort()) {
    if (y < MIN_YEAR) continue;
    const cands = pools.map((pool) => pool.find((e) => e.year === y)).filter(Boolean);
    const pick = (k) => cands.find((e) => e[k])?.[k];
    const withDl = cands.find((e) => e.deadlines?.length);
    const deadlines = (withDl?.deadlines || []).map((d) => ({ ...d, label: d.label || TYPE_LABEL[d.type] }));
    deadlines.sort((a, b) => a.at.localeCompare(b.at));
    out.push({ year: y, date: pick('date'), place: pick('place'), link: pick('link') || v.link, source: withDl?.source || cands[0].source, deadlines });
  }
  return out;
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
    metrics, difficulty: difficulty(metrics.accept_rate), editions: mergeEditions(v),
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
const ifMax = Math.max(...(venues.journals || []).map((j) => j.if || 0), 1);
const journals = (venues.journals || []).map((j) => {
  const item = {
    id: j.id, name: j.name, full: j.full, kind: 'journal', fields: j.fields || [], link: j.link,
    if: j.if ?? null, if_year: j.if_year ?? null, quartile: j.quartile ?? null, verified: !!j.verified,
    special_issues: (j.special_issues || [])
      .map((s) => ({ title: s.title, link: s.link || j.link, at: toUtcIso(s.at, s.timezone || 'UTC+0') }))
      .filter((s) => s.at),
  };
  item._raw = j.if ? Math.log1p(j.if) / Math.log1p(ifMax) : null;
  return item;
});
normalize(journals);

// ------------------------------------------------------------------ 출력
const out = {
  generatedAt: NOW.toISOString(),
  crawledAt: meta.crawledAt || null,
  fields: FIELDS,
  conferences: confList,
  journals,
  candidates: candidates.map(({ hidden, ...c }) => c),
};
writeJson(p('site/data.json'), out);

const withNext = confList.filter((c) => c.editions.some((e) => e.deadlines.some((d) => new Date(d.at) > NOW)));
console.log(`conferences: ${confList.length} (upcoming deadline: ${withNext.length}), journals: ${journals.length}, candidates: ${candidates.length}`);
