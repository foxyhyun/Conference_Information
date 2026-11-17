(() => {
  'use strict';

  // ---------------------------------------------------------------- i18n
  const I18N = {
    ko: {
      subtitle: 'Neurophotonics Lab · 학회·저널 마감 트래커',
      tab_conf: '학회', tab_journal: '저널', tab_cand: '신규 후보', tab_timeline: '타임라인',
      calendar: '📅 캘린더 구독', calendar_hint: '구글/애플/아웃룩 캘린더에 구독하면 마감 7일·1일 전에 알림이 옵니다. 링크를 복사해서 캘린더의 "URL로 추가"에 넣으세요.',
      only_fav: '☆ 내 즐겨찾기만', fav_hint: '즐겨찾기 (이 브라우저에만 저장)',
      stale: '⚠ 자동 갱신이 {d}일 동안 실행되지 않았습니다. 마감 정보가 오래됐을 수 있으니 공식 사이트를 확인하세요.',
      changes_title: '최근 변경된 마감', chg_new: '추가', chg_changed: '변경', prev: '이전',
      months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], this_month: '이번 달', items: '건', days_left: '일 남음', today: '오늘', passed: '지남',
      field_all: '전체 분야', field_hint: '분야를 여러 개 고르면 모두 해당하는 학회만 보입니다', also_hint: '부 분야 — 제출은 가능하지만 이 분야의 점수 순위에는 포함되지 않음',
      fields: { dl: 'Deep Learning', medai: '의료 AI', imgproc: '이미지 처리', optics: 'Optics', neuro: 'Neuro (신경과학)', biomed: '의생명 (Bio·임상·통증)' },
      fields_tiny: { dl: 'DL', medai: '의료AI', imgproc: '영상처리', optics: 'Optics', neuro: 'Neuro', biomed: '의생명' },
      region_all: '전체', region_intl: '국제', region_domestic: '국내',
      sort: '정렬', only_upcoming: '마감 일정 있는 것만', target_first: '★ 타겟 먼저', search: '검색 (이름, 장소…)',
      sorts: {
        conf: [['deadline', '마감 임박순'], ['research', '내 연구 관련도순'], ['tier', '티어순'], ['difficulty', '난이도순 (채택률 낮은 순)'], ['name', '이름순']],
        journal: [['if', 'IF 높은 순'], ['research', '내 연구 관련도순'], ['lab', '랩 게재 많은 순'], ['tier', '티어순'], ['name', '이름순']],
        cand: [['deadline', '마감 임박순'], ['name', '이름순']],
        timeline: [['deadline', '날짜순']],
      },
      updated: '데이터 갱신', loading: '데이터 불러오는 중…', load_fail: 'data.json 을 불러오지 못했습니다.', empty: '조건에 맞는 항목이 없습니다.',
      types: { abstract: 'Abstract 마감', paper: 'Paper 마감', supplementary: 'Supplementary 마감', rebuttal: 'Rebuttal 마감', camera_ready: 'Camera-ready', registration: '등록 마감', notification: '결과 발표', other: '마감' },
      closed: '마감됨', d: '일', h: '시간', m: '분', s: '초',
      no_next: '다음 마감 미발표', last_dl: '지난 마감', check_site: '공식 사이트 확인',
      src: { ccfddl: '출처 ccfddl', hf: '출처 HF ai-deadlines', manual: '직접 입력', scraped: '공식 사이트 자동 추출' },
      src_orig: '원문', src_warn: '공식 페이지에서 자동으로 읽은 날짜입니다. 원문을 확인하세요.',
      unverified: '근사값 — 아직 검증되지 않았습니다', target_title: '타겟 학회', domestic: '국내',
      score_field: '분야 내', score_all: '전체',
      difficulty: '난이도', accept: '채택률',
      diff: { '최상': '최상', '상': '상', '중상': '중상', '중': '중', '하': '하' },
      all_dates: '전체 일정', detail: '더 보기 — 소개 · 특징 · 제출 분야 · 전체 일정', features: '특징', topics: '제출 분야', schedule: '일정 패턴', sources: '출처',
      f_format: '형식', f_review: '심사', f_proc: '논문집', f_accept: '채택률', f_cadence: '시기', f_looks: '이런 논문을 봅니다',
      f_scope: '범위', f_oa: '공개', f_publisher: '출판사', f_looks_j: '이런 논문을 봅니다',
      oa_map: { 'full OA': '완전 오픈액세스', hybrid: '하이브리드 (선택 OA)', subscription: '구독형' },
      lab_badge: '🏠 랩 게재 {n}편', lab_hint: '우리 랩 홈페이지 출판 목록 기준', lab_pubs_title: '우리 랩 게재 논문', lab_more: '랩 게재 논문 {n}편 · 출처',
      only_lab: '🏠 랩이 낸 저널만',
      only_research: '🔬 내 연구 관련만', research_hint: '제출 분야·소개에 내 연구 키워드가 있음 (data/research.yml)',
      if_label: 'Impact Factor', special: '특집호', rolling: '상시 투고',
      cand_dl: '제출 마감 (AoE 가정)', first_seen: '첫 발견', category: '분류',
      cand_notice: 'WikiCFP 에서 자동 수집한 후보입니다. 검증되지 않았고 질 낮은(약탈적) 학회가 섞여 있을 수 있으니 투고 전 반드시 확인하세요.',
      notices_title: '국내 학회 공지', notices_desc: '국내 학회 홈페이지에서 수집한 논문·초록 모집 공지입니다. 날짜는 원문에서 확인하세요.',
      foot_score: '점수: 학회는 h5-index(로그) · CORE · CCF 등급(지표가 없는 학회는 수동 티어)을 가중 평균한 뒤, <b>분야 내 최고 = 1.0</b>, <b>전체 최고 = 1.0</b> 으로 각각 정규화했습니다. 저널은 직전 IF 기준입니다.',
      foot_warn: '<span class="warn-ico">⚠</span> 표시는 아직 검증되지 않은 근사값입니다. 마감은 모두 한국시간(KST)으로 표시합니다. 공식 사이트에서 최종 확인하세요.',
      foot_src: '출처: <a href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener">ccfddl</a> · <a href="https://github.com/huggingface/ai-deadlines" target="_blank" rel="noopener">huggingface/ai-deadlines</a> · <a href="http://www.wikicfp.com" target="_blank" rel="noopener">WikiCFP</a> · 각 학회 공식 사이트',
    },
    en: {
      subtitle: 'Neurophotonics Lab · conference & journal deadline tracker',
      tab_conf: 'Conferences', tab_journal: 'Journals', tab_cand: 'New candidates', tab_timeline: 'Timeline',
      calendar: '📅 Subscribe (ICS)', calendar_hint: 'Subscribe in Google/Apple/Outlook Calendar to get reminders 7 days and 1 day before each deadline. Copy the link into your calendar\'s "Add by URL".',
      only_fav: '☆ My favorites only', fav_hint: 'Favorite (stored in this browser only)',
      stale: '⚠ The automatic update has not run for {d} days. Deadlines may be outdated — verify on official sites.',
      changes_title: 'Recently changed deadlines', chg_new: 'added', chg_changed: 'changed', prev: 'was',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], this_month: 'this month', items: 'items', days_left: 'days left', today: 'today', passed: 'passed',
      field_all: 'All fields', field_hint: 'Pick several fields to show only venues matching all of them', also_hint: 'Secondary field — accepts such submissions but is not ranked within this field',
      fields: { dl: 'Deep Learning', medai: 'Medical AI', imgproc: 'Image Processing', optics: 'Optics', neuro: 'Neuroscience', biomed: 'Biomedical (bio · clinical · pain)' },
      fields_tiny: { dl: 'DL', medai: 'Med AI', imgproc: 'Img Proc', optics: 'Optics', neuro: 'Neuro', biomed: 'Biomed' },
      region_all: 'All', region_intl: 'International', region_domestic: 'Korea',
      sort: 'Sort', only_upcoming: 'Only with upcoming deadline', target_first: '★ Targets first', search: 'Search (name, place…)',
      sorts: {
        conf: [['deadline', 'Deadline (soonest)'], ['research', 'Research relevance'], ['tier', 'Tier score'], ['difficulty', 'Difficulty (lowest acceptance)'], ['name', 'Name']],
        journal: [['if', 'Impact factor'], ['research', 'Research relevance'], ['lab', 'Lab papers'], ['tier', 'Tier score'], ['name', 'Name']],
        cand: [['deadline', 'Deadline (soonest)'], ['name', 'Name']],
        timeline: [['deadline', 'By date']],
      },
      updated: 'Data updated', loading: 'Loading…', load_fail: 'Could not load data.json.', empty: 'Nothing matches the current filters.',
      types: { abstract: 'Abstract deadline', paper: 'Paper deadline', supplementary: 'Supplementary deadline', rebuttal: 'Rebuttal deadline', camera_ready: 'Camera-ready', registration: 'Registration deadline', notification: 'Notification', other: 'Deadline' },
      closed: 'Closed', d: 'd', h: 'h', m: 'm', s: 's',
      no_next: 'Next deadline not announced', last_dl: 'Last deadline', check_site: 'Check official site',
      src: { ccfddl: 'Source: ccfddl', hf: 'Source: HF ai-deadlines', manual: 'Entered manually', scraped: 'Auto-extracted from official site' },
      src_orig: 'source', src_warn: 'Date was read automatically from the official page. Verify at the source.',
      unverified: 'Approximate — not yet verified', target_title: 'Target venue', domestic: 'Korea',
      score_field: 'In field', score_all: 'Overall',
      difficulty: 'Difficulty', accept: 'Acceptance',
      diff: { '최상': 'very hard', '상': 'hard', '중상': 'mod. hard', '중': 'moderate', '하': 'easy' },
      all_dates: 'All dates', detail: 'More — about · characteristics · submission areas · all dates', features: 'Characteristics', topics: 'Submission areas', schedule: 'Typical schedule', sources: 'Sources',
      f_format: 'Format', f_review: 'Review', f_proc: 'Proceedings', f_accept: 'Acceptance', f_cadence: 'When', f_looks: 'What they look for',
      f_scope: 'Scope', f_oa: 'Access', f_publisher: 'Publisher', f_looks_j: 'What they look for',
      oa_map: { 'full OA': 'Fully open access', hybrid: 'Hybrid (optional OA)', subscription: 'Subscription' },
      lab_badge: '🏠 Lab: {n}', lab_hint: 'Papers listed on our lab publication page', lab_pubs_title: 'Our lab’s papers', lab_more: '{n} lab paper(s) · sources',
      only_lab: '🏠 Journals our lab used',
      only_research: '🔬 Related to my research', research_hint: 'Submission areas / description mention my research keywords (data/research.yml)',
      if_label: 'Impact Factor', special: 'Special issue', rolling: 'Rolling submission',
      cand_dl: 'Submission deadline (AoE assumed)', first_seen: 'First seen', category: 'Categories',
      cand_notice: 'Automatically collected from WikiCFP. Unverified and may include low-quality (predatory) venues — check carefully before submitting.',
      notices_title: 'Korean society notices', notices_desc: 'Call-for-papers/abstracts notices collected from Korean society websites. Check dates at the source.',
      foot_score: 'Score: for conferences, a weighted average of h5-index (log) · CORE · CCF rank (manual tier where no index exists), normalized so that <b>best in field = 1.0</b> and <b>best overall = 1.0</b>. Journals use the latest impact factor.',
      foot_warn: '<span class="warn-ico">⚠</span> marks approximate values that have not been verified yet. All deadlines are shown in Korea Standard Time (KST). Confirm on the official site.',
      foot_src: 'Sources: <a href="https://github.com/ccfddl/ccf-deadlines" target="_blank" rel="noopener">ccfddl</a> · <a href="https://github.com/huggingface/ai-deadlines" target="_blank" rel="noopener">huggingface/ai-deadlines</a> · <a href="http://www.wikicfp.com" target="_blank" rel="noopener">WikiCFP</a> · official conference sites',
    },
  };
  let lang = 'ko';
  const T = () => I18N[lang];
  const SUBMIT = new Set(['abstract', 'paper', 'supplementary', 'rebuttal', 'camera_ready', 'registration', 'other']);

  // fields: 선택된 분야 집합 (비어 있으면 전체). 여러 개 선택 시 모두 해당하는 학회만 표시 (AND)
  const state = { tab: 'conf', fields: new Set(), region: 'all', sort: 'deadline', q: '', onlyUpcoming: false, targetFirst: true, onlyFav: false, onlyLab: false, onlyResearch: false };
  let DATA = null;
  // 즐겨찾기 (브라우저 로컬 저장)
  const FAV = new Set();
  try { for (const id of JSON.parse(localStorage.getItem('fav') || '[]')) FAV.add(id); } catch {}
  const saveFav = () => { try { localStorage.setItem('fav', JSON.stringify([...FAV])); } catch {} };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 언어별 이름/상세
  const nameOf = (x) => (lang === 'en' && x.name_en) || x.name;
  const fullOf = (x) => (lang === 'en' && x.full_en) || x.full;
  const detailsOf = (c) => (lang === 'en' && c.details_en) || c.details;

  // ---------------------------------------------------------------- 시간 표시
  const kstFmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const kstFmtEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'short', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  function kst(iso, short = false) {
    const d = new Date(iso);
    if (lang === 'en') {
      const p = Object.fromEntries(kstFmtEn.formatToParts(d).map((x) => [x.type, x.value]));
      const date = `${p.weekday}, ${p.month} ${p.day}, ${p.year}`;
      return short ? date : `${date} ${p.hour}:${p.minute} KST`;
    }
    const p = Object.fromEntries(kstFmt.formatToParts(d).map((x) => [x.type, x.value]));
    const date = `${p.year}.${p.month}.${p.day} (${p.weekday})`;
    return short ? date : `${date} ${p.hour}:${p.minute} KST`;
  }
  function countdown(ms) {
    if (ms <= 0) return T().closed;
    const t = T();
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return d > 0
      ? `${d}<small>${t.d}</small>${pad(h)}<small>${t.h}</small>${pad(m)}<small>${t.m}</small>${pad(sec)}<small>${t.s}</small>`
      : `${pad(h)}<small>${t.h}</small>${pad(m)}<small>${t.m}</small>${pad(sec)}<small>${t.s}</small>`;
  }
  function level(ms) {
    const d = ms / 864e5;
    return d < 3 ? 'lvl-red' : d < 14 ? 'lvl-orange' : d < 30 ? 'lvl-yellow' : '';
  }

  // ---------------------------------------------------------------- 파생값
  function nextDeadline(c, now) {
    let best = null;
    for (const e of c.editions) for (const d of e.deadlines) {
      if (!SUBMIT.has(d.type)) continue;
      const t = Date.parse(d.at);
      if (t > now && (!best || t < best.t)) best = { ...d, t, edition: e };
    }
    return best;
  }
  function lastDeadline(c, now) {
    let best = null;
    for (const e of c.editions) for (const d of e.deadlines) {
      if (d.type !== 'paper') continue;
      const t = Date.parse(d.at);
      if (t <= now && (!best || t > best.t)) best = { ...d, t, edition: e };
    }
    return best;
  }
  function shownEdition(c, nd) {
    if (nd) return nd.edition;
    const y = new Date().getFullYear();
    return c.editions.find((e) => e.year >= y) || c.editions.at(-1) || null;
  }
  const selFields = () => [...state.fields];
  // 정렬용 점수: 분야 하나만 골랐으면 그 분야 점수, 아니면 전체 점수
  const tierOf = (x) => {
    const fs = selFields();
    return (fs.length === 1 ? x.score.byField[fs[0]] : x.score.overall) ?? -1;
  };

  // ---------------------------------------------------------------- 렌더링
  // 점수: 분야별 점수를 알약 형태로. 선택한 분야는 강조
  function scorePills(x) {
    const t = T();
    const fs = selFields();
    const pill = (label, v, on) => `<span class="pill ${on ? 'on' : ''}"><span>${label}</span><b>${v == null ? '–' : v.toFixed(2)}</b></span>`;
    // 종합지(모든 분야)는 선택한 분야만 표시
    const shown = x.fields.length >= 6 ? x.fields.filter((f) => fs.includes(f)) : x.fields;
    const parts = shown.map((f) => pill(t.fields_tiny[f], x.score.byField[f], fs.includes(f)));
    parts.push(pill(t.score_all, x.score.overall, fs.length === 0));
    return `<div class="pills">${parts.join('')}</div>`;
  }
  const warn = (x) => (x.verified ? '' : ` <span class="warn-ico" title="${T().unverified}">⚠</span>`);
  const placeLine = (ed) => (ed?.place ? `<div class="cd-place">📍 ${esc(ed.place)}</div>` : '');
  const allFields = (x) => x.fields;
  const fieldTags = (x) => `<div class="fields">${x.fields.map((f) => `<span class="ftag ${state.fields.has(f) ? 'on' : ''}">${T().fields[f]}</span>`).join('')}</div>`;
  const L = (v) => (v == null ? null : typeof v === 'object' ? (v[lang] ?? v.ko ?? v.en) : v);
  // 🔬 내 연구 관련 키워드 칩
  const researchTags = (x) => {
    if (!x.research?.length || !DATA.research) return '';
    const kw = (id) => DATA.research.find((k) => k.id === id);
    return `<div class="rtags" title="${T().research_hint}">🔬 ${x.research.map((id) => `<span class="rtag ${kw(id)?.main ? 'main' : ''}">${esc(kw(id)?.[lang] || id)}</span>`).join('')}</div>`;
  };

  function confCard(c, now) {
    const t = T();
    const nd = nextDeadline(c, now);
    const ed = shownEdition(c, nd);
    const m = c.metrics;
    const chg = c.editions.flatMap((e) => e.deadlines).find((d) => d.changed || d.added);
    const badges = [
      c.target ? `<span class="star" title="${t.target_title}">★</span>` : '',
      `<button class="fav ${FAV.has(c.id) ? 'on' : ''}" data-fav="${c.id}" title="${t.fav_hint}">${FAV.has(c.id) ? '★' : '☆'}</button>`,
      chg ? `<span class="badge chg" title="${chg.changed ? `${t.prev}: ${kst(chg.prev)}` : ''}">${chg.changed ? t.chg_changed : t.chg_new}</span>` : '',
      c.status === 'new' ? '<span class="badge new">NEW</span>' : '',
      c.region === 'domestic' ? `<span class="badge dom">${t.domestic}</span>` : '',
      m.core ? `<span class="badge">CORE ${esc(m.core)}</span>` : '',
      m.ccf ? `<span class="badge gray">CCF ${esc(m.ccf)}</span>` : '',
    ].join('');
    const where = ed ? [ed.year, ed.date].filter(Boolean).map(esc).join(' · ') : '';
    const link = ed?.link || c.link;

    let cd;
    if (nd) {
      const ms = nd.t - now;
      const extraLabel = nd.label && /\(/.test(nd.label) ? ' ' + esc(nd.label.replace(/^[^(]*/, '')) : '';
      const typeLabel = nd.edition.source === 'manual' && nd.label && !t.types[nd.label] && nd.type === 'other' ? esc(nd.label) : esc(t.types[nd.type] || nd.label);
      cd = `<div class="${level(ms)}"><div class="cd-type">${typeLabel}${extraLabel}</div>
        <div class="cd" data-at="${nd.t}">${countdown(ms)}</div>
        <div class="cd-date">${kst(nd.at)}</div>
        ${placeLine(ed)}
        <div class="src">${t.src[nd.edition.source] || ''}${nd.edition.source === 'scraped' ? ` <a href="${esc(nd.edition.link)}" target="_blank" rel="noopener">${t.src_orig}</a> <span class="warn-ico" title="${t.src_warn}">⚠</span>` : ''}</div></div>`;
    } else {
      const ld = lastDeadline(c, now);
      cd = `<div class="cd-none">${t.no_next}<br><span class="meta">${ld ? `${t.last_dl} ${kst(ld.at, true)}` : t.check_site}</span>${placeLine(ed)}</div>`;
    }

    // 핵심 정보 (항상 표시)
    const q = c.quick || {};
    const acceptStr = m.accept_rate != null
      ? `${(m.accept_rate * 100).toFixed(0)}%${c.difficulty ? ` · ${t.diff[c.difficulty] || c.difficulty}` : ''}`
      : null;
    const facts = [
      [t.f_format, L(q.format)],
      [t.f_review, L(q.review)],
      [t.f_proc, L(q.proceedings)],
      [t.f_accept, acceptStr],
      [t.f_cadence, L(q.cadence)],
    ].filter(([, v]) => v);
    const factsHtml = facts.length
      ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`
      : '';
    const looks = L(q.looks_for);
    const looksHtml = looks?.length
      ? `<div class="looks"><span class="lk">${t.f_looks}</span><ul>${looks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
      : '';

    // 접힘: 소개 · 특징 · 제출 분야 · 전체 일정
    const allDl = c.editions.filter((e) => e.deadlines.length);
    const dt = detailsOf(c);
    const more = (dt && (dt.about || dt.features?.length || dt.topics?.length)) || allDl.length
      ? `<details class="dl detail"><summary>${t.detail}</summary>
          <div class="dbody">
            ${dt?.about ? `<p class="dabout">${esc(dt.about)}</p>` : ''}
            ${dt?.features?.length ? `<h4>${t.features}</h4><ul class="dlist">${dt.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
            ${dt?.acceptance_rate ? `<p class="dmeta">${t.accept}: ${esc(dt.acceptance_rate)}</p>` : ''}
            ${dt?.topics?.length ? `<h4>${t.topics}</h4><div class="dtopics">${dt.topics.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
            ${allDl.length ? `<h4>${t.all_dates}</h4><ul class="tl">${allDl
              .flatMap((e) => e.deadlines.map((d) => `<li class="${Date.parse(d.at) < now ? 'done' : ''}"><span><span class="ed">${e.year}</span> ${esc(d.label || d.type)}</span><span>${kst(d.at)}</span></li>`))
              .join('')}</ul>` : ''}
            ${(dt?.sources?.length || q.sources?.length) ? `<p class="dsrc">${t.sources}: ${[...new Set([...(dt?.sources || []), ...(q.sources || [])])].map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>` : ''}
          </div></details>`
      : '';

    return `<article class="item ${c.target ? 'target' : ''} ${nd ? '' : 'past'}">
      <div class="head">
        <div>
          <div class="name">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(nameOf(c))}</a>` : esc(nameOf(c))} ${badges}</div>
          <div class="full">${esc(fullOf(c))}</div>
          ${where ? `<div class="meta">${where}</div>` : ''}
          ${fieldTags(c)}
          ${researchTags(c)}
          ${scorePills(c)}${m.h5 ? `<span class="h5">h5 ${m.h5}${warn(c)}</span>` : warn(c)}
        </div>
        <div class="cdwrap">${cd}</div>
      </div>
      ${factsHtml}
      ${looksHtml}
      ${more}
    </article>`;
  }

  function journalCard(j, now) {
    const t = T();
    const q = j.quick || {};
    const si = j.special_issues.filter((s) => Date.parse(s.at) > now).sort((a, b) => a.at.localeCompare(b.at))[0];
    const siHtml = si
      ? `<div class="${level(Date.parse(si.at) - now)}"><div class="cd-type">${t.special}: <a href="${esc(si.link)}" target="_blank" rel="noopener">${esc(si.title)}</a></div>
         <div class="cd small" data-at="${Date.parse(si.at)}">${countdown(Date.parse(si.at) - now)}</div></div>`
      : `<div class="src">${t.rolling}</div>`;
    const ifSrc = j.if_source && j.if_source !== 'manual'
      ? ` <a class="src" href="${esc(j.if_source)}" target="_blank" rel="noopener">${t.src_orig}</a>` : '';
    const n = j.lab_pubs?.length || 0;
    const badges = [
      `<button class="fav ${FAV.has(j.id) ? 'on' : ''}" data-fav="${j.id}" title="${t.fav_hint}">${FAV.has(j.id) ? '★' : '☆'}</button>`,
      j.quartile ? `<span class="badge">${esc(j.quartile)}</span>` : '',
      n ? `<span class="badge lab" title="${t.lab_hint}">${t.lab_badge.replace('{n}', n)}</span>` : '',
      j.oa === 'full OA' ? '<span class="badge gray">Open Access</span>' : '',
    ].join('');
    const oaStr = [j.oa ? (t.oa_map[j.oa] || j.oa) : null, j.apc_usd ? `APC $${Number(j.apc_usd).toLocaleString('en-US')}` : null].filter(Boolean).join(' · ');
    const facts = [
      [t.f_scope, L(q.scope)],
      [t.f_format, L(q.format)],
      [t.f_review, L(q.review)],
      [t.f_oa, oaStr || null],
      [t.f_publisher, j.publisher],
    ].filter(([, v]) => v);
    const looks = L(q.looks_for);
    const pubList = n
      ? `<h4>${t.lab_pubs_title}</h4><ul class="dlist">${j.lab_pubs.map((x) => `<li>${x.year ? `<b>${x.year}</b> · ` : ''}${x.doi ? `<a href="https://doi.org/${esc(x.doi)}" target="_blank" rel="noopener">${esc(x.title)}</a>` : esc(x.title)}</li>`).join('')}</ul>`
      : '';
    const srcs = j.sources?.length
      ? `<p class="dsrc">${t.sources}: ${j.sources.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>` : '';
    const more = pubList || srcs ? `<details class="dl detail"><summary>${n ? t.lab_more.replace('{n}', n) : t.sources}</summary><div class="dbody">${pubList}${srcs}</div></details>` : '';
    return `<article class="item">
      <div class="head">
        <div>
          <div class="name"><a href="${esc(j.link)}" target="_blank" rel="noopener">${esc(j.name)}</a> ${badges}</div>
          <div class="full">${esc(j.full)}</div>
          ${fieldTags(j)}
          ${researchTags(j)}
          ${scorePills(j)}
        </div>
        <div class="cdwrap">
          <div class="cd-type">${t.if_label}${j.if_year ? ` ${j.if_year}` : ''}</div>
          <div class="cd">${j.if != null ? j.if.toFixed(1) : '–'}${j.if != null ? warn(j) : ''}${ifSrc}</div>
          ${siHtml}
        </div>
      </div>
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${looks?.length ? `<div class="looks"><span class="lk">${t.f_looks_j}</span><ul>${looks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${more}
    </article>`;
  }

  function candCard(c, now) {
    const t = T();
    const at = Date.parse(c.deadline + 'T23:59:59-12:00');
    const ms = at - now;
    return `<article class="item ${ms < 0 ? 'past' : ''}">
      <div>
        <div class="name"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.name)}</a> <span class="badge gray">WikiCFP</span></div>
        <div class="full">${esc(c.full)}</div>
        <div class="meta">${esc(c.when)} · ${esc(c.where)}</div>
        ${fieldTags(c)}
      </div>
      <div class="${level(ms)}"><div class="cd-type">${t.cand_dl}</div>
        <div class="cd" data-at="${at}">${countdown(ms)}</div><div class="cd-date">${kst(new Date(at).toISOString())}</div></div>
      <div class="smeta">${t.first_seen} ${esc(c.first_seen)}<br>${t.category}: ${esc(c.categories.join(', '))}</div>
    </article>`;
  }

  function noticesBlock() {
    const t = T();
    const q = state.q.trim().toLowerCase();
    const ns = DATA.notices.filter((n) => !q || `${n.venue_name} ${n.title}`.toLowerCase().includes(q));
    if (!ns.length) return '';
    const recent = Date.now() - 14 * 864e5;
    const vname = (n) => { const v = DATA.conferences.find((c) => c.id === n.venue); return v ? nameOf(v) : n.venue_name; };
    return `<article class="item notices"><div style="grid-column:1/-1">
      <div class="name">${t.notices_title} <span class="badge dom">${ns.length}</span></div>
      <div class="meta">${t.notices_desc}</div>
      <ul class="nlist">${ns.map((n) => `<li><span class="nv">${esc(vname(n))}</span>
        <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
        ${Date.parse(n.first_seen) > recent ? '<span class="badge new">NEW</span>' : ''}<span class="nd">${esc(n.first_seen)}</span></li>`).join('')}</ul>
    </div></article>`;
  }

  function filtered(now) {
    const q = state.q.trim().toLowerCase();
    const fs = selFields();
    // 검색: 이름·장소 + 제출 분야·소개·특징까지
    const deepText = (x) => {
      const d = x.details, e = x.details_en;
      return [d?.about, e?.about, ...(d?.topics || []), ...(e?.topics || []), ...(d?.features || []), ...(e?.features || [])].join(' ');
    };
    const match = (x, extra = '') =>
      fs.every((f) => allFields(x).includes(f)) &&
      (!q || `${x.name} ${x.full} ${x.name_en || ''} ${x.full_en || ''} ${extra} ${x.details ? deepText(x) : ''}`.toLowerCase().includes(q));

    if (state.tab === 'conf' || state.tab === 'timeline') {
      let list = DATA.conferences.filter((c) =>
        match(c, c.editions.map((e) => e.place).join(' ')) && (state.region === 'all' || c.region === state.region));
      if (state.onlyFav) list = list.filter((c) => FAV.has(c.id));
      if (state.onlyResearch) list = list.filter((c) => c.research_score);
      const nd = new Map(list.map((c) => [c.id, nextDeadline(c, now)]));
      if (state.onlyUpcoming || state.tab === 'timeline') list = list.filter((c) => nd.get(c.id));
      const cmp = {
        deadline: (a, b) => (nd.get(a.id)?.t ?? Infinity) - (nd.get(b.id)?.t ?? Infinity) || tierOf(b) - tierOf(a),
        research: (a, b) => (b.research_score || 0) - (a.research_score || 0) || (nd.get(a.id)?.t ?? Infinity) - (nd.get(b.id)?.t ?? Infinity),
        tier: (a, b) => tierOf(b) - tierOf(a),
        difficulty: (a, b) => (a.metrics.accept_rate ?? 2) - (b.metrics.accept_rate ?? 2) || tierOf(b) - tierOf(a),
        name: (a, b) => nameOf(a).localeCompare(nameOf(b)),
      }[state.sort];
      list.sort((a, b) => (state.targetFirst ? b.target - a.target : 0) || cmp(a, b));
      return list;
    }
    if (state.tab === 'journal') {
      let list = DATA.journals.filter((j) => match(j, `${j.publisher || ''} ${L(j.quick?.scope) || ''} ${(L(j.quick?.looks_for) || []).join(' ')} ${j.lab_pubs.map((x) => x.title).join(' ')}`));
      if (state.onlyLab) list = list.filter((j) => j.lab_pubs.length);
      if (state.onlyResearch) list = list.filter((j) => j.research_score);
      if (state.onlyFav) list = list.filter((j) => FAV.has(j.id));
      const cmp = {
        if: (a, b) => (b.if ?? -1) - (a.if ?? -1),
        lab: (a, b) => b.lab_pubs.length - a.lab_pubs.length || (b.if ?? -1) - (a.if ?? -1),
        research: (a, b) => (b.research_score || 0) - (a.research_score || 0) || (b.if ?? -1) - (a.if ?? -1),
        tier: (a, b) => tierOf(b) - tierOf(a),
        name: (a, b) => a.name.localeCompare(b.name),
      }[state.sort];
      return list.sort(cmp);
    }
    const list = DATA.candidates.filter((c) => match(c, c.where));
    return list.sort(state.sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.deadline.localeCompare(b.deadline));
  }

  // 타임라인: 다가오는 모든 마감(제출·결과 포함)을 월별로
  function timeline(list, now) {
    const t = T();
    const rows = [];
    for (const c of list) for (const e of c.editions) for (const d of e.deadlines) {
      const at = Date.parse(d.at);
      if (at < now - 864e5 || at > now + 400 * 864e5) continue;
      rows.push({ c, e, d, at });
    }
    rows.sort((a, b) => a.at - b.at);
    if (!rows.length) return `<div class="empty">${t.empty}</div>`;
    const byMonth = new Map();
    for (const r of rows) {
      const dt = new Date(r.at + 9 * 3600e3); // KST 기준 월
      const key = `${dt.getUTCFullYear()}-${dt.getUTCMonth()}`;
      if (!byMonth.has(key)) byMonth.set(key, { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), rows: [] });
      byMonth.get(key).rows.push(r);
    }
    const nowK = new Date(now + 9 * 3600e3);
    return [...byMonth.values()].map((g) => {
      const isNow = g.y === nowK.getUTCFullYear() && g.m === nowK.getUTCMonth();
      const head = `<div class="tl-month">${lang === 'en' ? `${t.months[g.m]} ${g.y}` : `${g.y}년 ${t.months[g.m]}`}${isNow ? ` <small>· ${t.this_month}</small>` : ''}<small>${g.rows.length}${lang === 'en' ? ' ' : ''}${t.items}</small></div>`;
      return head + g.rows.map((r) => {
        const ms = r.at - now;
        const days = Math.ceil(ms / 864e5);
        const left = ms < 0 ? t.passed : days === 0 ? t.today : `D-${days}`;
        const typeLabel = t.types[r.d.type] || r.d.label;
        const extra = r.d.label && /\(/.test(r.d.label) ? ' ' + esc(r.d.label.replace(/^[^(]*/, '')) : (r.d.type === 'other' ? ' ' + esc(r.d.label) : '');
        return `<div class="tl-row ${ms < 0 ? 'past' : level(ms)}">
          <span class="d">${kst(r.d.at, true)}</span>
          <span class="v">${r.c.target ? '<span class="star">★</span> ' : ''}<a href="${esc(r.e.link || r.c.link)}" target="_blank" rel="noopener">${esc(nameOf(r.c))} ${r.e.year}</a> <span class="lb">· ${esc(typeLabel)}${extra}${r.d.changed ? ` <span class="badge chg">${t.chg_changed}</span>` : ''}</span>${r.e.place ? `<span class="lb"> · 📍 ${esc(r.e.place)}</span>` : ''}</span>
          <span class="left">${left}</span>
        </div>`;
      }).join('');
    }).join('');
  }

  function render() {
    if (!DATA) return;
    const t = T();
    const now = Date.now();
    const list = filtered(now);
    let html;
    if (state.tab === 'timeline') html = timeline(list, now);
    else {
      const card = { conf: confCard, journal: journalCard, cand: candCard }[state.tab];
      html = list.length ? list.map((x) => card(x, now)).join('') : `<div class="empty">${t.empty}</div>`;
      if (state.tab === 'cand' && DATA.notices?.length) html = noticesBlock() + html;
    }
    $('#list').innerHTML = html;
    const n = $('#notice');
    n.hidden = state.tab !== 'cand';
    n.textContent = t.cand_notice;
    const isConf = state.tab === 'conf' || state.tab === 'timeline';
    $('#region-seg').style.display = isConf ? '' : 'none';
    $('#only-upcoming').parentElement.style.display = state.tab === 'conf' ? '' : 'none';
    $('#target-first').parentElement.style.display = state.tab === 'conf' ? '' : 'none';
    $('#only-fav').parentElement.style.display = isConf || state.tab === 'journal' ? '' : 'none';
    $('#only-lab').parentElement.style.display = state.tab === 'journal' ? '' : 'none';
    $('#only-research').parentElement.style.display = state.tab === 'cand' ? 'none' : '';
    $('#changes').hidden = !(state.tab === 'conf' && DATA.recentChanges?.length);
    saveHash();
  }

  function tick() {
    const now = Date.now();
    $('#now-kst').textContent = lang === 'en' ? kst(new Date(now).toISOString()).replace(/, \d{4}/, '') : kst(new Date(now).toISOString()).replace(/^\d{4}\./, '');
    document.querySelectorAll('.cd[data-at]').forEach((el) => {
      const ms = Number(el.dataset.at) - now;
      el.innerHTML = countdown(ms);
      const wrap = el.parentElement;
      wrap.classList.remove('lvl-red', 'lvl-orange', 'lvl-yellow');
      const l = level(ms);
      if (l && ms > 0) wrap.classList.add(l);
    });
  }

  // ---------------------------------------------------------------- 정적 문구 적용
  function applyStatic() {
    const t = T();
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t[el.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t[el.dataset.i18nHtml]; });
    $('#q').placeholder = t.search;
    $('#field-chips').innerHTML = `<label class="fchk all"><input type="checkbox" data-v="all"> ${t.field_all}</label>` +
      Object.entries(t.fields).map(([k, v]) => `<label class="fchk"><input type="checkbox" data-v="${k}"> ${v}</label>`).join('');
    $('#field-chips').title = t.field_hint;
    document.querySelectorAll('#lang-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === lang));
    $('#cal-link').title = t.calendar_hint;
    if (DATA) {
      const upd = DATA.crawledAt || DATA.generatedAt;
      $('#updated').textContent = `${t.updated} ${kst(upd).replace(' KST', '')}`;
      const stale = $('#stale');
      stale.hidden = !DATA.crawlStale;
      if (DATA.crawlStale) stale.textContent = t.stale.replace('{d}', Math.floor((Date.now() - Date.parse(upd)) / 864e5));
      const ch = $('#changes');
      if (DATA.recentChanges?.length) {
        ch.innerHTML = `<b>${t.changes_title}</b><ul>${DATA.recentChanges.slice(0, 8).map((c) =>
          `<li>${esc(c.when)} · ${esc(c.venue)} ${c.year} · ${esc(c.label)}: ${c.kind === 'changed' ? `${kst(c.prev, true)} → ` : ''}<b>${kst(c.at, true)}</b> (${c.kind === 'changed' ? t.chg_changed : t.chg_new})</li>`).join('')}</ul>`;
      }
    } else $('#updated').textContent = t.loading;
  }

  // ---------------------------------------------------------------- 컨트롤
  function setupControls() {
    $('#field-chips').addEventListener('change', (e) => {
      const b = e.target.closest('input'); if (!b) return;
      const v = b.dataset.v;
      if (v === 'all') state.fields.clear();
      else if (b.checked) state.fields.add(v);
      else state.fields.delete(v);
      syncUi(); render();
    });
    $('#region-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      state.region = b.dataset.v; syncUi(); render();
    });
    $('#lang-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      setLang(b.dataset.v);
    });
    document.querySelector('.tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab'); if (!b) return;
      state.tab = b.dataset.tab; state.sort = T().sorts[state.tab][0][0]; syncUi(); render();
    });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    $('#only-upcoming').addEventListener('change', (e) => { state.onlyUpcoming = e.target.checked; render(); });
    $('#target-first').addEventListener('change', (e) => { state.targetFirst = e.target.checked; render(); });
    $('#only-fav').addEventListener('change', (e) => { state.onlyFav = e.target.checked; render(); });
    $('#only-lab').addEventListener('change', (e) => { state.onlyLab = e.target.checked; render(); });
    $('#only-research').addEventListener('change', (e) => { state.onlyResearch = e.target.checked; render(); });
    $('#list').addEventListener('click', (e) => {
      const b = e.target.closest('.fav'); if (!b) return;
      const id = b.dataset.fav;
      if (FAV.has(id)) FAV.delete(id); else FAV.add(id);
      saveFav();
      b.classList.toggle('on', FAV.has(id)); b.textContent = FAV.has(id) ? '★' : '☆';
      if (state.onlyFav) render();
    });
    // 캘린더 링크: webcal:// 로 바로 구독 시도 (지원 안 하면 .ics 다운로드)
    $('#cal-link').addEventListener('click', (e) => {
      const url = new URL('deadlines.ics', location.href).href;
      if (location.protocol === 'https:') { e.preventDefault(); location.href = url.replace(/^https:/, 'webcal:'); }
    });
  }
  function setLang(l) {
    if (!I18N[l]) return;
    lang = l;
    try { localStorage.setItem('lang', l); } catch {}
    applyStatic(); syncUi(); render(); tick();
  }
  function syncUi() {
    const sorts = T().sorts[state.tab];
    document.querySelectorAll('.fchk input').forEach((b) => {
      b.checked = b.dataset.v === 'all' ? state.fields.size === 0 : state.fields.has(b.dataset.v);
      b.parentElement.classList.toggle('on', b.checked);
    });
    document.querySelectorAll('#region-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.region));
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
    $('#sort').innerHTML = sorts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if (!sorts.some(([v]) => v === state.sort)) state.sort = sorts[0][0];
    $('#sort').value = state.sort;
    $('#q').value = state.q;
    $('#only-upcoming').checked = state.onlyUpcoming;
    $('#target-first').checked = state.targetFirst;
    $('#only-fav').checked = state.onlyFav;
    $('#only-lab').checked = state.onlyLab;
    $('#only-research').checked = state.onlyResearch;
  }
  function saveHash() {
    const h = new URLSearchParams({ tab: state.tab, field: selFields().join(',') || 'all', region: state.region, sort: state.sort, lang });
    history.replaceState(null, '', '#' + h.toString());
  }
  function loadHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    for (const k of ['tab', 'region', 'sort']) if (h.get(k)) state[k] = h.get(k);
    const f = h.get('field');
    if (f) state.fields = new Set(f === 'all' ? [] : f.split(',').filter((x) => I18N.ko.fields[x]));
    if (!I18N.ko.sorts[state.tab]) state.tab = 'conf';
    if (h.get('lang') && I18N[h.get('lang')]) lang = h.get('lang');
  }

  // ---------------------------------------------------------------- 시작
  async function init() {
    try { const l = localStorage.getItem('lang'); if (l && I18N[l]) lang = l; } catch {}
    if (!localStorage.getItem('lang') && !/^ko/i.test(navigator.language || '')) lang = 'en';
    loadHash();
    applyStatic();
    setupControls();
    syncUi();
    try {
      const r = await fetch('data.json', { cache: 'no-cache' });
      DATA = await r.json();
    } catch (e) {
      $('#list').innerHTML = `<div class="empty">${T().load_fail}</div>`;
      return;
    }
    $('#cnt-conf').textContent = DATA.conferences.length;
    $('#cnt-journal').textContent = DATA.journals.length;
    $('#cnt-cand').textContent = DATA.candidates.length + (DATA.notices?.length || 0);
    applyStatic();
    render();
    tick();
    setInterval(tick, 1000);
    window.addEventListener('hashchange', () => { loadHash(); applyStatic(); syncUi(); render(); tick(); });
  }
  init();
})();
