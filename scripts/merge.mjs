// 일정 병합 (build.mjs 와 crawl.mjs 가 공유)
//   우선순위: 수동 입력 > ccfddl > huggingface > 공식 사이트 자동 추출
import { toUtcIso, normType, TYPE_LABEL } from './lib.mjs';

export function manualEditions(v) {
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

export function mergeEditions(v, { ccf = {}, hf = {}, scraped = {} }, minYear = 0) {
  const pools = [manualEditions(v), ccf[v.sources?.ccfddl]?.editions || [], hf[v.sources?.hf]?.editions || [], scraped[v.id] || []];
  const years = new Set(pools.flat().map((e) => e.year));
  const out = [];
  for (const y of [...years].sort()) {
    if (y < minYear) continue;
    const cands = pools.map((pool) => pool.find((e) => e.year === y)).filter(Boolean);
    const pick = (k) => cands.find((e) => e[k])?.[k];
    const withDl = cands.find((e) => e.deadlines?.length);
    const deadlines = (withDl?.deadlines || []).map((d) => ({ ...d, label: d.label || TYPE_LABEL[d.type] }));
    deadlines.sort((a, b) => a.at.localeCompare(b.at));
    out.push({ year: y, date: pick('date'), place: pick('place'), link: pick('link') || v.link, source: withDl?.source || cands[0].source, deadlines });
  }
  return out;
}

/** 마감 변경 이력 갱신. history: { key: { at, since, changed_at?, prev? } } */
export function updateHistory(history, venues, srcs, now) {
  const nowIso = now.toISOString();
  const fresh = Object.keys(history).length === 0; // 최초 실행이면 전부 '기존'으로 기록
  const changes = [];
  for (const v of venues) {
    for (const e of mergeEditions(v, srcs, now.getUTCFullYear() - 1)) {
      for (const d of e.deadlines) {
        const key = `${v.id}|${e.year}|${d.type}|${d.label}`;
        const h = history[key];
        if (!h) {
          history[key] = { at: d.at, since: fresh ? null : nowIso };
          if (!fresh) changes.push({ venue: v.name, year: e.year, label: d.label, kind: 'new', at: d.at });
        } else if (h.at !== d.at) {
          changes.push({ venue: v.name, year: e.year, label: d.label, kind: 'changed', prev: h.at, at: d.at });
          Object.assign(h, { prev: h.at, at: d.at, changed_at: nowIso });
        }
      }
    }
  }
  return changes;
}
