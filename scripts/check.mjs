// 데이터 파일 검사: 손으로 고친 YAML 이 사이트를 깨뜨리지 않도록 빌드 전에 실행
//   node scripts/check.mjs   (오류가 있으면 종료 코드 1)
import { p, readYaml, toUtcIso, isKnownTz } from './lib.mjs';

const FIELDS = new Set(['dl', 'medai', 'imgproc', 'optics', 'neuro', 'biomed', 'rad']);
const TYPES = new Set(['abstract', 'paper', 'supplementary', 'rebuttal', 'camera_ready', 'notification', 'registration', 'other']);
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

let venues;
try { venues = readYaml(p('data/venues.yml'), null); } catch (e) { err(`venues.yml 파싱 실패: ${e.message}`); }
if (venues) {
  const ids = new Set();
  for (const v of venues.conferences || []) {
    const tag = `conferences/${v.id || '(id 없음)'}`;
    if (!v.id) err(`${tag}: id 가 없습니다`);
    if (ids.has(v.id)) err(`${tag}: id 중복`);
    ids.add(v.id);
    if (!v.name) err(`${tag}: name 이 없습니다`);
    if (!Array.isArray(v.fields) || !v.fields.length) err(`${tag}: fields 가 비었습니다`);
    for (const f of v.fields || []) if (!FIELDS.has(f)) err(`${tag}: 알 수 없는 분야 '${f}' (가능: ${[...FIELDS].join(', ')})`);
    if (v.region && !['intl', 'domestic'].includes(v.region)) err(`${tag}: region 은 intl 또는 domestic`);
    const m = v.metrics || {};
    if (m.accept_rate != null && (m.accept_rate <= 0 || m.accept_rate > 1)) err(`${tag}: accept_rate 는 0~1 사이 (예: 0.25)`);
    if (m.tier != null && (m.tier < 0 || m.tier > 1)) err(`${tag}: tier 는 0~1 사이`);
    if (m.core && !['A*', 'A', 'B', 'C'].includes(m.core)) err(`${tag}: core 는 A*, A, B, C 중 하나`);
    for (const e of v.editions || []) {
      if (!e.year) err(`${tag}: editions 항목에 year 가 없습니다`);
      if (!isKnownTz(e.timezone)) err(`${tag} ${e.year}: 알 수 없는 timezone '${e.timezone}' (예: UTC+1, UTC-5, AoE, KST)`);
      for (const d of e.deadlines || []) if (!isKnownTz(d.timezone)) err(`${tag} ${e.year}: 알 수 없는 timezone '${d.timezone}'`);
      for (const d of e.deadlines || []) {
        const type = String(d.type || '').toLowerCase();
        if (!TYPES.has(type)) err(`${tag} ${e.year}: 알 수 없는 마감 type '${d.type}'`);
        if (!toUtcIso(d.at, d.timezone || e.timezone || 'UTC+9')) err(`${tag} ${e.year}: 날짜 형식 오류 '${d.at}' (예: "2027-01-07 23:59")`);
      }
    }
    if (v.scrape && !v.scrape.url) err(`${tag}: scrape 에 url 이 없습니다`);
  }
  for (const j of venues.journals || []) {
    const tag = `journals/${j.id || '(id 없음)'}`;
    if (!j.id) err(`${tag}: id 가 없습니다`);
    if (ids.has(j.id)) err(`${tag}: id 가 학회 id 와 겹칩니다`);
    ids.add(j.id);
    for (const f of j.fields || []) if (!FIELDS.has(f) && f !== 'all') err(`${tag}: 알 수 없는 분야 '${f}'`);
    if (j.match) { try { new RegExp(j.match, 'i'); } catch (e) { err(`${tag}: match 정규식 오류 (${e.message})`); } }
    if (j.if != null && (typeof j.if !== 'number' || j.if < 0)) err(`${tag}: if 는 숫자`);
    for (const s of j.special_issues || []) if (!toUtcIso(s.at, s.timezone || 'UTC+0')) err(`${tag}: special_issues 날짜 오류 '${s.at}'`);
  }
  // 상세/핵심정보 파일의 id 가 실제 학회와 맞는지
  for (const [file, obj] of [['details.yml', readYaml(p('data/details.yml'), {})], ['details_en.yml', readYaml(p('data/details_en.yml'), {})], ['quick.yml', readYaml(p('data/quick.yml'), {})]]) {
    const discovered = new Set((readYaml(p('data/discovered.yml'), []) || []).map((d) => d.id));
    for (const id of Object.keys(obj || {})) if (!ids.has(id) && !discovered.has(id)) warn(`${file}: '${id}' 에 해당하는 학회가 venues.yml / discovered.yml 에 없습니다`);
  }
}
{
  const jinfo = readYaml(p('data/journals.yml'), {}) || {};
  const jids = new Set((venues?.journals || []).map((j) => j.id));
  for (const [id, info] of Object.entries(jinfo)) {
    if (!jids.has(id)) warn(`journals.yml: '${id}' 가 venues.yml journals 에 없습니다`);
    if (info?.if != null && (typeof info.if !== 'number' || info.if < 0 || info.if > 200)) err(`journals.yml/${id}: if 값 이상 (${info.if})`);
  }
  for (const id of jids) if (!jinfo[id] && !(venues.journals.find((j) => j.id === id) || {}).name) warn(`journals/${id}: 이름 정보가 없습니다 (journals.yml 에 조사 결과가 없음)`);
}
for (const f of ['discovered.yml', 'candidates.yml', 'notices.yml', 'details.yml', 'details_en.yml', 'quick.yml', 'journals.yml']) {
  try { readYaml(p('data/' + f), null); } catch (e) { err(`${f} 파싱 실패: ${e.message}`); }
}

for (const w of warns) console.log('warn:', w);
for (const e of errors) console.log('ERROR:', e);
console.log(errors.length ? `${errors.length} error(s)` : 'ok');
process.exit(errors.length ? 1 : 0);
