(() => {
  'use strict';

  const FIELD_SHORT = { dl: 'Deep Learning', medai: '의료 AI', imgproc: '이미지 처리', optics: 'Optics', neuro: 'Bio / Neuro' };
  const FIELD_TINY = { dl: 'DL', medai: '의료AI', imgproc: '영상처리', optics: 'Optics', neuro: 'Neuro' };
  const TYPE_KO = {
    abstract: 'Abstract 마감', paper: 'Paper 마감', supplementary: 'Supplementary 마감', rebuttal: 'Rebuttal 마감',
    camera_ready: 'Camera-ready', registration: '등록 마감', notification: '결과 발표', other: '마감',
  };
  const SRC = { ccfddl: '출처 ccfddl', hf: '출처 HF ai-deadlines', manual: '직접 입력', scraped: '공식 사이트 자동 추출' };
  const SUBMIT = new Set(['abstract', 'paper', 'supplementary', 'rebuttal', 'camera_ready', 'registration', 'other']);
  const SORTS = {
    conf: [['deadline', '마감 임박순'], ['tier', '티어순'], ['difficulty', '난이도순 (채택률 낮은 순)'], ['name', '이름순']],
    journal: [['if', 'IF 높은 순'], ['tier', '티어순'], ['name', '이름순']],
    cand: [['deadline', '마감 임박순'], ['name', '이름순']],
  };

  const state = { tab: 'conf', field: 'all', region: 'all', sort: 'deadline', q: '', onlyUpcoming: false, targetFirst: true };
  let DATA = null;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- 시간 표시
  const kstFmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  function kst(iso) {
    const p = Object.fromEntries(kstFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return `${p.year}.${p.month}.${p.day} (${p.weekday}) ${p.hour}:${p.minute} KST`;
  }
  function countdown(ms) {
    if (ms <= 0) return '마감됨';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return d > 0
      ? `${d}<small>일</small>${pad(h)}<small>시간</small>${pad(m)}<small>분</small>${pad(sec)}<small>초</small>`
      : `${pad(h)}<small>시간</small>${pad(m)}<small>분</small>${pad(sec)}<small>초</small>`;
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
  /** 보여줄 회차: 다가오는 마감이 있는 회차 > 가장 최근 회차 */
  function shownEdition(c, nd) {
    if (nd) return nd.edition;
    const y = new Date().getFullYear();
    return c.editions.find((e) => e.year >= y) || c.editions.at(-1) || null;
  }
  const tierOf = (x) => (state.field === 'all' ? x.score.overall : x.score.byField[state.field]) ?? -1;

  // ---------------------------------------------------------------- 렌더링
  function scoreBlock(x, extra = '') {
    const rows = [];
    const bar = (label, v) =>
      `<div class="srow"><span>${label}</span><div class="bar"><i style="width:${Math.round((v ?? 0) * 100)}%"></i></div><b>${v == null ? '–' : v.toFixed(2)}</b></div>`;
    if (state.field !== 'all') rows.push(bar('분야 내', x.score.byField[state.field]));
    rows.push(bar('전체', x.score.overall));
    if (state.field === 'all' && x.fields.length > 1) {
      for (const f of x.fields) rows.push(bar(FIELD_TINY[f], x.score.byField[f]));
    }
    return `<div class="score">${rows.join('')}${extra}</div>`;
  }

  function warn(x) {
    return x.verified ? '' : ' <span class="warn-ico" title="근사값 — 아직 검증되지 않았습니다">⚠</span>';
  }

  function confCard(c, now) {
    const nd = nextDeadline(c, now);
    const ed = shownEdition(c, nd);
    const m = c.metrics;
    const badges = [
      c.target ? '<span class="star" title="타겟 학회">★</span>' : '',
      c.status === 'new' ? '<span class="badge new">NEW</span>' : '',
      c.region === 'domestic' ? '<span class="badge dom">국내</span>' : '',
      m.core ? `<span class="badge">CORE ${esc(m.core)}</span>` : '',
      m.ccf ? `<span class="badge gray">CCF ${esc(m.ccf)}</span>` : '',
    ].join('');
    const where = ed ? [ed.year, ed.date].filter(Boolean).map(esc).join(' · ') : '';
    const link = ed?.link || c.link;

    let cd;
    if (nd) {
      const ms = nd.t - now;
      cd = `<div class="${level(ms)}"><div class="cd-type">${esc(TYPE_KO[nd.type] || nd.label)}${nd.label && /\(/.test(nd.label) ? ' ' + esc(nd.label.replace(/^[^(]*/, '')) : ''}</div>
        <div class="cd" data-at="${nd.t}">${countdown(ms)}</div>
        <div class="cd-date">${kst(nd.at)}</div>
        ${ed?.place ? `<div class="cd-place">📍 ${esc(ed.place)}</div>` : ''}
        <div class="src">${SRC[nd.edition.source] || ''}${nd.edition.source === 'scraped' ? ` <a href="${esc(nd.edition.link)}" target="_blank" rel="noopener">원문</a> <span class="warn-ico" title="공식 페이지에서 자동으로 읽은 날짜입니다. 원문을 확인하세요.">⚠</span>` : ''}</div></div>`;
    } else {
      const ld = lastDeadline(c, now);
      cd = `<div class="cd-none">다음 마감 미발표<br><span class="meta">${ld ? '지난 마감 ' + kst(ld.at).slice(0, 10) : '공식 사이트 확인'}</span>
        ${ed?.place ? `<div class="cd-place">📍 ${esc(ed.place)}</div>` : ''}</div>`;
    }

    const diff = [
      c.difficulty ? `난이도 <b>${c.difficulty}</b>` : '',
      m.accept_rate != null ? `채택률 ${(m.accept_rate * 100).toFixed(0)}%` : '',
      m.h5 ? `h5 ${m.h5}` : '',
    ].filter(Boolean).join(' · ');

    const allDl = c.editions.filter((e) => e.deadlines.length);
    const tl = allDl.length
      ? `<details class="dl"><summary>전체 일정 보기 (${allDl.map((e) => e.year).join(', ')})</summary><ul class="tl">${allDl
          .flatMap((e) => e.deadlines.map((d) => `<li class="${Date.parse(d.at) < now ? 'done' : ''}"><span><span class="ed">${e.year}</span> ${esc(d.label || d.type)}</span><span>${kst(d.at).slice(0, 18)}</span></li>`))
          .join('')}</ul></details>`
      : '';
    const dt = c.details;
    const detail = dt && (dt.about || dt.features?.length || dt.topics?.length)
      ? `<details class="dl detail"><summary>학회 상세 · 제출 분야 · 특징</summary>
          <div class="dbody">
            ${dt.about ? `<p class="dabout">${esc(dt.about)}</p>` : ''}
            ${dt.features?.length ? `<h4>특징</h4><ul class="dlist">${dt.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
            ${dt.acceptance_rate ? `<p class="dmeta">채택률: ${esc(dt.acceptance_rate)}</p>` : ''}
            ${dt.typical_schedule ? `<p class="dmeta">일정 패턴: ${esc(dt.typical_schedule)}</p>` : ''}
            ${dt.topics?.length ? `<h4>제출 분야</h4><div class="dtopics">${dt.topics.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
            ${dt.sources?.length ? `<p class="dsrc">출처: ${dt.sources.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>`).join(' · ')}</p>` : ''}
          </div></details>`
      : '';

    return `<article class="item ${c.target ? 'target' : ''} ${nd ? '' : 'past'}">
      <div>
        <div class="name">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)} ${badges}</div>
        <div class="full">${esc(c.full)}</div>
        ${where ? `<div class="meta">${where}</div>` : ''}
        <div class="fields">${c.fields.map((f) => `<span class="ftag">${FIELD_SHORT[f]}</span>`).join('')}</div>
      </div>
      <div>${cd}</div>
      ${scoreBlock(c, diff ? `<div class="smeta">${diff}${warn(c)}</div>` : `<div class="smeta">${warn(c)}</div>`)}
      ${detail}
      ${tl}
    </article>`;
  }

  function journalCard(j, now) {
    const si = j.special_issues.filter((s) => Date.parse(s.at) > now).sort((a, b) => a.at.localeCompare(b.at))[0];
    const cd = si
      ? `<div class="${level(Date.parse(si.at) - now)}"><div class="cd-type">특집호: <a href="${esc(si.link)}" target="_blank" rel="noopener">${esc(si.title)}</a></div>
         <div class="cd" data-at="${Date.parse(si.at)}">${countdown(Date.parse(si.at) - now)}</div><div class="cd-date">${kst(si.at)}</div></div>`
      : `<div class="cd-none">상시 투고</div>`;
    return `<article class="item">
      <div>
        <div class="name"><a href="${esc(j.link)}" target="_blank" rel="noopener">${esc(j.name)}</a>
          ${j.quartile ? `<span class="badge">${esc(j.quartile)}</span>` : ''}</div>
        <div class="full">${esc(j.full)}</div>
        <div class="fields">${j.fields.map((f) => `<span class="ftag">${FIELD_SHORT[f]}</span>`).join('')}</div>
      </div>
      <div><div class="cd-type">Impact Factor${j.if_year ? ` (${j.if_year})` : ''}</div>
        <div class="cd">${j.if != null ? j.if.toFixed(1) : '–'}${warn(j)}</div>${cd}</div>
      ${scoreBlock(j)}
    </article>`;
  }

  function candCard(c, now) {
    const t = Date.parse(c.deadline + 'T23:59:59-12:00');
    const ms = t - now;
    return `<article class="item ${ms < 0 ? 'past' : ''}">
      <div>
        <div class="name"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.name)}</a> <span class="badge gray">WikiCFP</span></div>
        <div class="full">${esc(c.full)}</div>
        <div class="meta">${esc(c.when)} · ${esc(c.where)}</div>
        <div class="fields">${c.fields.map((f) => `<span class="ftag">${FIELD_SHORT[f]}</span>`).join('')}</div>
      </div>
      <div class="${level(ms)}"><div class="cd-type">제출 마감 (AoE 가정)</div>
        <div class="cd" data-at="${t}">${countdown(ms)}</div><div class="cd-date">${kst(new Date(t).toISOString())}</div></div>
      <div class="smeta">첫 발견 ${esc(c.first_seen)}<br>분류: ${esc(c.categories.join(', '))}</div>
    </article>`;
  }

  function filtered(now) {
    const q = state.q.trim().toLowerCase();
    const match = (x, extra = '') =>
      (state.field === 'all' || x.fields.includes(state.field)) &&
      (!q || `${x.name} ${x.full} ${extra}`.toLowerCase().includes(q));

    if (state.tab === 'conf') {
      let list = DATA.conferences.filter((c) =>
        match(c, c.editions.map((e) => e.place).join(' ')) && (state.region === 'all' || c.region === state.region));
      const nd = new Map(list.map((c) => [c.id, nextDeadline(c, now)]));
      if (state.onlyUpcoming) list = list.filter((c) => nd.get(c.id));
      const cmp = {
        deadline: (a, b) => (nd.get(a.id)?.t ?? Infinity) - (nd.get(b.id)?.t ?? Infinity) || tierOf(b) - tierOf(a),
        tier: (a, b) => tierOf(b) - tierOf(a),
        difficulty: (a, b) => (a.metrics.accept_rate ?? 2) - (b.metrics.accept_rate ?? 2) || tierOf(b) - tierOf(a),
        name: (a, b) => a.name.localeCompare(b.name),
      }[state.sort];
      list.sort((a, b) => (state.targetFirst ? b.target - a.target : 0) || cmp(a, b));
      return list;
    }
    if (state.tab === 'journal') {
      const list = DATA.journals.filter((j) => match(j));
      const cmp = {
        if: (a, b) => (b.if ?? -1) - (a.if ?? -1),
        tier: (a, b) => tierOf(b) - tierOf(a),
        name: (a, b) => a.name.localeCompare(b.name),
      }[state.sort];
      return list.sort(cmp);
    }
    const list = DATA.candidates.filter((c) => match(c, c.where));
    return list.sort(state.sort === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => a.deadline.localeCompare(b.deadline));
  }

  function render() {
    if (!DATA) return;
    const now = Date.now();
    const list = filtered(now);
    const card = { conf: confCard, journal: journalCard, cand: candCard }[state.tab];
    let html = list.length ? list.map((x) => card(x, now)).join('') : '<div class="empty">조건에 맞는 항목이 없습니다.</div>';
    if (state.tab === 'cand' && DATA.notices?.length) {
      const q = state.q.trim().toLowerCase();
      const ns = DATA.notices.filter((n) => !q || `${n.venue_name} ${n.title}`.toLowerCase().includes(q));
      const recent = Date.now() - 14 * 864e5;
      html = `<article class="item notices"><div style="grid-column:1/-1">
        <div class="name">국내 학회 공지 <span class="badge dom">${ns.length}</span></div>
        <div class="meta">국내 학회 홈페이지에서 수집한 논문·초록 모집 공지입니다. 날짜는 원문에서 확인하세요.</div>
        <ul class="nlist">${ns.map((n) => `<li><span class="nv">${esc(n.venue_name)}</span>
          <a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>
          ${Date.parse(n.first_seen) > recent ? '<span class="badge new">NEW</span>' : ''}<span class="nd">${esc(n.first_seen)}</span></li>`).join('')}</ul>
      </div></article>` + html;
    }
    $('#list').innerHTML = html;
    const n = $('#notice');
    n.hidden = state.tab !== 'cand';
    n.textContent = 'WikiCFP 에서 자동 수집한 후보입니다. 검증되지 않았고 질 낮은(약탈적) 학회가 섞여 있을 수 있으니 투고 전 반드시 확인하세요.';
    document.querySelectorAll('#region-seg').forEach((el) => (el.style.display = state.tab === 'conf' ? '' : 'none'));
    $('#only-upcoming').parentElement.style.display = state.tab === 'conf' ? '' : 'none';
    $('#target-first').parentElement.style.display = state.tab === 'conf' ? '' : 'none';
    saveHash();
  }

  function tick() {
    const now = Date.now();
    $('#now-kst').textContent = kst(new Date(now).toISOString()).replace(/^\d{4}\./, '');
    document.querySelectorAll('.cd[data-at]').forEach((el) => {
      const ms = Number(el.dataset.at) - now;
      el.innerHTML = countdown(ms);
      const wrap = el.parentElement;
      wrap.classList.remove('lvl-red', 'lvl-orange', 'lvl-yellow');
      const l = level(ms);
      if (l && ms > 0) wrap.classList.add(l);
    });
  }

  // ---------------------------------------------------------------- 컨트롤
  function setupControls() {
    const chips = $('#field-chips');
    chips.innerHTML = [['all', '전체 분야'], ...Object.entries(FIELD_SHORT)]
      .map(([k, v]) => `<button class="chip" data-v="${k}">${v}</button>`).join('');
    chips.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      state.field = b.dataset.v; syncUi(); render();
    });
    $('#region-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      state.region = b.dataset.v; syncUi(); render();
    });
    document.querySelector('.tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.tab'); if (!b) return;
      state.tab = b.dataset.tab; state.sort = SORTS[state.tab][0][0]; syncUi(); render();
    });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    $('#only-upcoming').addEventListener('change', (e) => { state.onlyUpcoming = e.target.checked; render(); });
    $('#target-first').addEventListener('change', (e) => { state.targetFirst = e.target.checked; render(); });
  }
  function syncUi() {
    document.querySelectorAll('.chip').forEach((b) => b.classList.toggle('on', b.dataset.v === state.field));
    document.querySelectorAll('#region-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.region));
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
    $('#sort').innerHTML = SORTS[state.tab].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if (!SORTS[state.tab].some(([v]) => v === state.sort)) state.sort = SORTS[state.tab][0][0];
    $('#sort').value = state.sort;
    $('#q').value = state.q;
    $('#only-upcoming').checked = state.onlyUpcoming;
    $('#target-first').checked = state.targetFirst;
  }
  // 필터 상태를 URL 에 저장 → 링크로 공유 가능
  function saveHash() {
    const h = new URLSearchParams({ tab: state.tab, field: state.field, region: state.region, sort: state.sort });
    history.replaceState(null, '', '#' + h.toString());
  }
  function loadHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    for (const k of ['tab', 'field', 'region', 'sort']) if (h.get(k)) state[k] = h.get(k);
    if (!SORTS[state.tab]) state.tab = 'conf';
  }

  // ---------------------------------------------------------------- 시작
  async function init() {
    loadHash();
    setupControls();
    syncUi();
    try {
      const r = await fetch('data.json', { cache: 'no-cache' });
      DATA = await r.json();
    } catch (e) {
      $('#list').innerHTML = '<div class="empty">data.json 을 불러오지 못했습니다.</div>';
      return;
    }
    $('#cnt-conf').textContent = DATA.conferences.length;
    $('#cnt-journal').textContent = DATA.journals.length;
    $('#cnt-cand').textContent = DATA.candidates.length + (DATA.notices?.length || 0);
    const upd = DATA.crawledAt || DATA.generatedAt;
    $('#updated').textContent = '데이터 갱신 ' + kst(upd).replace(' KST', '');
    render();
    tick();
    setInterval(tick, 1000);
    window.addEventListener('hashchange', () => { loadHash(); syncUi(); render(); tick(); });
  }
  init();
})();
