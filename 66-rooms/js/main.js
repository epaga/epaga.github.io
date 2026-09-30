import { ZONES, STATIONS, chapterLabel } from './data/genesis.js';
import { Room } from './scene/room.js';
import * as audio from './audio.js';
import { Notes } from './notes.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const N = STATIONS.length;
const mobile = matchMedia('(max-width: 820px)');
const BEST_KEY = '66rooms:genesis:best';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastCardKey = '';

const state = {
  mode: 'intro', // intro | opening | walk | recall-setup | recall | recall-result
  index: -1,
  visited: new Set(),
  finishedWalk: false,
  chapterSel: {},
  scope: -1,
  recall: null,
  sheetOpen: false,
};
const notes = new Notes();
let room;
let thumbs = [];

boot();

async function boot() {
  const fonts = Promise.all([
    document.fonts.load('600 64px "Cormorant Garamond"'),
    document.fonts.load('italic 500 64px "Cormorant Garamond"'),
    document.fonts.load('600 32px Inter'),
  ]).catch(() => {});
  await Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]);
  try {
    room = new Room($('#stage'), { zones: ZONES, stations: STATIONS, onHover, onPick, onPop: (i) => audio.note(i) });
    room.build();
    thumbs = room.renderThumbnails();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('beforeend', '<div class="fatal">This room needs WebGL, which this browser can’t provide.<br>Try a recent Chrome, Safari, Edge or Firefox.</div>');
    return;
  }
  room.start();
  buildFlow();
  bindUI();
  syncSound();
  updateFrame();
  requestAnimationFrame(() => document.body.classList.add('ready'));
  const open = $('#openBook');
  open.disabled = false;
  open.addEventListener('click', openBook, { once: true });
  if (new URLSearchParams(location.search).has('instant')) { room.maxDt = 5; window.__room = room; openBook({ instant: true }); }
}

async function openBook({ instant = false } = {}) {
  audio.init();
  if (!instant) audio.whoosh();
  state.mode = 'opening';
  document.body.classList.add('opening');
  updateFrame();
  if (instant) room.openInstant(); else await room.openBook();
  state.mode = 'walk';
  document.body.classList.add('open');
  room.setNotes(noteStations());
  renderAll();
  const m = /^#(\d+)$/.exec(location.hash);
  if (m) go(Math.min(N, Math.max(1, +m[1])) - 1);
}

// ---------- navigation ----------
function go(i, opts = {}) {
  if (state.mode !== 'walk') return;
  if (i >= N) { state.finishedWalk = true; i = -1; } else state.finishedWalk = false;
  i = Math.max(-1, i);
  state.index = i;
  if (i >= 0) state.visited.add(i);
  state.sheetOpen = false;
  room.focus(i, opts);
  room.setWalked(i);
  renderAll();
  const url = i >= 0 ? `#${i + 1}` : location.pathname + location.search;
  history.replaceState(null, '', url);
}

function step(d) {
  if (state.mode !== 'walk') return;
  go(state.index + d);
}

// ---------- rendering ----------
function renderAll() {
  renderCard();
  renderFlow();
  renderTop();
}

function renderTop() {
  const inRecall = state.mode.startsWith('recall');
  $$('.seg button').forEach((b) => {
    const on = (b.dataset.mode === 'recall') === inRecall;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  const n = notes.count();
  const badge = $('#btnNotes .badge');
  badge.hidden = n === 0;
  badge.textContent = n;
}

function renderCard() {
  const card = $('#card');
  let html;
  if (state.mode === 'recall-setup') html = recallSetupCard();
  else if (state.mode === 'recall') html = recallCard();
  else if (state.mode === 'recall-result') html = resultCard();
  else if (state.index < 0) html = overviewCard();
  else html = stationCard(state.index);
  card.innerHTML = html;
  const key = `${state.mode}:${state.index}`;
  if (key !== lastCardKey && !reducedMotion.matches) {
    [...card.children].forEach((el, k) => el.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: k * 60, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' },
    ));
  }
  lastCardKey = key;
  const collapsible = mobile.matches && state.mode === 'walk';
  card.classList.toggle('collapsed', collapsible && !state.sheetOpen);
  const body = $('.card-body', card);
  if (body) body.scrollTop = 0;
  requestAnimationFrame(() => updateFrame());
}

function bestFor(scope) {
  try { return (JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {})[scope]; } catch { return null; }
}

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function overviewCard() {
  const done = state.finishedWalk;
  const best = bestFor(-1);
  return `
  <div class="card-head">
    <button class="sheet-handle" data-act="sheet" aria-label="Show details"></button>
    <p class="eyebrow dark">Room 1 of 66 · ${done ? 'Walk complete' : 'The whole room'}</p>
    <h2 class="title">${done ? 'You walked Genesis.' : 'Genesis'}</h2>
    <p class="meta">50 chapters · 4 movements · 20 objects</p>
  </div>
  <div class="card-body">
    <p class="lede">${done
      ? 'Fifty chapters, one path. Close your eyes and walk it again in your head — then empty the room and put it back together.'
      : 'Walk clockwise from the entrance. Every object holds one part of the story, and every color is one movement of the book.'}</p>
    <ol class="movements">${ZONES.map((z, k) => `
      <li><button class="movement" data-zone="${k}" style="--zc:${z.color}">
        <span class="mv-num">${z.numeral}</span>
        <span class="mv-text"><b>${z.name}</b><small>Genesis ${z.chapters[0]}–${z.chapters[1]} · ${z.theme}</small></span>
        <span class="mv-thumbs">${range(0, 4).map((j) => `<img src="${thumbs[k * 5 + j]}" alt="">`).join('')}</span>
      </button></li>`).join('')}
    </ol>
    <div class="actions">
      ${done
        ? '<button class="btn primary" data-act="recall">Retell it from memory <span aria-hidden="true">→</span></button><button class="btn ghost" data-act="start">Walk it again</button>'
        : '<button class="btn primary" data-act="start">Start the walk <span aria-hidden="true">→</span></button><button class="btn ghost" data-act="recall">Retell from memory</button>'}
    </div>
    ${best ? `<p class="fine">Your best retelling of the whole book: ${best.slips} slips in ${fmtTime(best.time)}.</p>` : ''}
  </div>`;
}

function stationCard(i) {
  const s = STATIONS[i], z = ZONES[s.zone];
  const chs = range(...s.chapters);
  const sel = state.chapterSel[i] ?? chs.find((c) => notes.get(c)) ?? chs[0];
  state.chapterSel[i] = sel;
  const next = STATIONS[i + 1];
  const nextColor = next ? ZONES[next.zone].color : z.color;
  return `
  <div class="card-head" style="--zc:${z.color}">
    <button class="sheet-handle" data-act="sheet" aria-label="Show details"></button>
    <div class="row between"><span class="zone-tag"><i></i>${z.numeral} · ${z.name}</span><span class="count">${i + 1} <span>/ ${N}</span></span></div>
    <div class="station-head" data-act="sheet">
      <img class="thumb" src="${thumbs[i]}" alt="">
      <div><p class="chapters">Genesis ${chapterLabel(s.chapters)}</p><h2 class="title">${s.title}</h2></div>
    </div>
    <div class="zone-steps">${range(0, 4).map((j) => { const k = s.zone * 5 + j; return `<span class="${k === i ? 'on' : k < i ? 'past' : ''}"></span>`; }).join('')}</div>
  </div>
  <div class="card-body" style="--zc:${z.color}">
    <p class="summary">${s.summary}</p>
    <div class="symbol"><p class="label">Why this object</p><p>${s.symbol}</p></div>
    <blockquote class="verse"><p>${s.verse.text}</p><cite>${s.verse.ref} · KJV</cite></blockquote>
    <section class="notes-box" aria-label="Your notes">
      <div class="row between"><p class="label">Your notes</p><span class="saved" aria-live="polite">Saved on this device</span></div>
      <div class="chips">${chs.map((c) => `<button class="chip ${c === sel ? 'on' : ''} ${notes.get(c) ? 'has' : ''}" data-ch="${c}" aria-pressed="${c === sel}" aria-label="Genesis ${c}">${c}</button>`).join('')}</div>
      <textarea id="noteText" rows="4" data-ch="${sel}" aria-label="Your notes on Genesis ${sel}" placeholder="What stands out to you in Genesis ${sel}?">${esc(notes.get(sel))}</textarea>
    </section>
    <button class="then" data-act="next" style="--zc:${nextColor}">
      <span class="label">Then</span>
      <span class="then-text">${s.then}</span>
      ${next
        ? `<span class="then-next"><img src="${thumbs[i + 1]}" alt=""><span>${i + 2} · ${next.title}</span><b aria-hidden="true">→</b></span>`
        : '<span class="then-next"><span>Step back and see the whole room</span><b aria-hidden="true">→</b></span>'}
    </button>
  </div>`;
}

function recallSetupCard() {
  const scopes = [{ k: -1, name: 'The whole book', sub: '20 objects · chapters 1–50' }, ...ZONES.map((z, k) => ({ k, name: `${z.numeral} · ${z.name}`, sub: `5 objects · chapters ${z.chapters[0]}–${z.chapters[1]}`, color: z.color }))];
  const best = bestFor(state.scope);
  return `
  <div class="card-head">
    <p class="eyebrow dark">Recall</p>
    <h2 class="title">Retell Genesis</h2>
    <p class="meta">Put the objects back, in order</p>
  </div>
  <div class="card-body">
    <p class="lede">The room empties. Start at the entrance and pick the object that comes next, again and again, until the whole book stands again. Say out loud what happens at each one as you go.</p>
    <p class="label">What to retell</p>
    <div class="scopes">${scopes.map((s) => `<button class="scope ${s.k === state.scope ? 'on' : ''}" data-scope="${s.k}" ${s.color ? `style="--zc:${s.color}"` : ''} aria-pressed="${s.k === state.scope}"><b>${s.name}</b><small>${s.sub}</small></button>`).join('')}</div>
    <div class="actions">
      <button class="btn primary" data-act="begin">Empty the room <span aria-hidden="true">→</span></button>
      <button class="btn ghost" data-act="walk">Back to walking</button>
    </div>
    ${best ? `<p class="fine">Your best here: ${best.slips} slips in ${fmtTime(best.time)}.</p>` : ''}
  </div>`;
}

function recallCard() {
  const r = state.recall;
  const slot = r.order[r.pos], s = STATIONS[slot], z = ZONES[s.zone];
  return `
  <div class="card-head" style="--zc:${z.color}">
    <div class="row between"><span class="zone-tag"><i></i>${z.numeral} · ${z.name}</span><span class="count">${r.pos + 1} <span>/ ${r.order.length}</span></span></div>
    <h2 class="title" style="margin-top:12px">${r.pos === 0 ? 'What comes first?' : 'What comes next?'}</h2>
    <p class="meta">${r.hint ? `Hint: it stands for Genesis ${chapterLabel(s.chapters)}.` : 'Picture the path, then pick the object that stands here.'}</p>
    <div class="progress"><span style="width:${(r.pos / r.order.length) * 100}%"></span></div>
  </div>
  <div class="card-body">
    <div class="tray">${r.pool.map((i) => `<button class="piece ${r.placed.has(i) ? 'placed' : ''} ${r.reveal && i === slot ? 'reveal' : ''}" data-piece="${i}" aria-label="${esc(STATIONS[i].title)}" title="${esc(STATIONS[i].title)}" ${r.placed.has(i) ? 'disabled' : ''}><img src="${thumbs[i]}" alt=""></button>`).join('')}</div>
    <p class="feedback" aria-live="polite">${r.feedback}</p>
    <div class="row between recall-foot">
      <span class="fine">${r.mistakes} ${r.mistakes === 1 ? 'slip' : 'slips'}</span>
      <span><button class="link" data-act="hint">Hint</button> <button class="link" data-act="quit">Stop</button></span>
    </div>
  </div>`;
}

function resultCard() {
  const r = state.recall;
  const n = r.order.length;
  const first = r.firstTry.size;
  const verdict = r.mistakes === 0 ? 'Flawless.' : r.mistakes <= 2 ? 'Beautifully retold.' : r.mistakes <= 6 ? 'Nearly there.' : 'Walk it once more.';
  const msg = r.mistakes === 0
    ? `You rebuilt ${r.scope < 0 ? 'the whole book of Genesis' : `the movement of ${ZONES[r.scope].name}`} without a single slip. That’s the memory palace doing its job.`
    : r.mistakes <= 6
      ? 'The shape of the book is there. The objects outlined in red are the ones that tripped you — walk past them once more.'
      : 'That’s normal on a first try. Walk the room once more, slowly, saying each object out loud — then come back.';
  const scopeName = r.scope < 0 ? 'The whole book' : `${ZONES[r.scope].numeral} · ${ZONES[r.scope].name}`;
  return `
  <div class="card-head">
    <p class="eyebrow dark">Recall · ${scopeName}</p>
    <h2 class="title">${verdict}</h2>
    <p class="meta">Genesis, retold in order.</p>
  </div>
  <div class="card-body">
    <div class="score">
      <div><b>${first}/${n}</b><small>First try</small></div>
      <div><b>${r.mistakes}</b><small>Slips</small></div>
      <div><b>${fmtTime(r.time)}</b><small>Time</small></div>
    </div>
    <div class="result-strip" style="grid-template-columns:repeat(${Math.min(10, n)},1fr)">${r.order.map((i) => `<img class="${r.firstTry.has(i) ? '' : 'missed'}" src="${thumbs[i]}" alt="${esc(STATIONS[i].title)}" title="${i + 1} · ${esc(STATIONS[i].title)}">`).join('')}</div>
    <p class="lede">${msg}</p>
    <div class="actions">
      <button class="btn primary" data-act="again">Retell again</button>
      <button class="btn ghost" data-act="walk">Walk the room</button>
    </div>
    ${r.newBest ? '<p class="fine">A new personal best.</p>' : ''}
  </div>`;
}

// ---------- flow bar ----------
function buildFlow() {
  $('#flowTrack').innerHTML = `
    <div class="flow-zones">${ZONES.map((z, k) => `<button class="fz" data-zone="${k}" style="--zc:${z.color}">${z.numeral} · ${z.name}<small>${z.chapters[0]}–${z.chapters[1]}</small></button>`).join('')}</div>
    <div class="flow-nodes">${ZONES.map((z, k) => `
      <div class="flow-group" style="--zc:${z.color}"><span class="fill"></span>
        ${range(0, 4).map((j) => { const i = k * 5 + j, s = STATIONS[i]; return `<button class="node" data-node="${i}" style="--zc:${z.color}" aria-label="${i + 1}. ${esc(s.title)}, Genesis ${chapterLabel(s.chapters)}"><img src="${thumbs[i]}" alt=""><span class="num">${chapterLabel(s.chapters)}</span></button>`; }).join('')}
      </div>`).join('')}
    </div>`;
}

function renderFlow() {
  const r = state.recall;
  const inRecall = state.mode === 'recall';
  const done = state.mode === 'recall-result';
  const cur = inRecall ? r.order[r.pos] : state.index;
  const reached = inRecall ? (r.pos > 0 ? r.order[r.pos - 1] : r.order[0] - 1) : done ? r.order[r.order.length - 1] : state.index;
  $$('.node').forEach((b) => {
    const i = +b.dataset.node;
    b.classList.toggle('current', i === cur);
    b.classList.toggle('visited', inRecall || done ? !r.order.includes(i) || r.placed.has(i) : state.visited.has(i));
    b.classList.toggle('blank', !!r && state.mode === 'recall' && r.order.includes(i) && !r.placed.has(i));
    b.disabled = state.mode !== 'walk';
  });
  $$('.flow-group').forEach((g, k) => {
    const local = reached - k * 5;
    const f = local < 0 ? 0 : Math.min(4, local) / 4;
    $('.fill', g).style.width = `${f * 80}%`;
  });
  const zoneNow = cur >= 0 ? STATIONS[cur].zone : -1;
  $$('.fz').forEach((b, k) => b.classList.toggle('on', k === zoneNow));
  const walk = state.mode === 'walk';
  const prev = $('#prev'), next = $('#next');
  prev.disabled = !walk || state.index < 0;
  next.disabled = !walk;
  prev.title = state.index > 0 ? `Back: ${STATIONS[state.index - 1].title}` : 'Back to the whole room';
  next.title = state.index < N - 1 ? `Next: ${STATIONS[state.index + 1].title}` : 'Finish the walk';
}

// ---------- recall ----------
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function openRecallSetup() {
  if (state.mode === 'recall') endRecall(false);
  state.mode = 'recall-setup';
  state.index = -1;
  room.focus(-1);
  room.setWalked(-1);
  history.replaceState(null, '', location.pathname + location.search);
  renderAll();
}

function beginRecall() {
  const scope = state.scope;
  const order = scope < 0 ? range(0, N - 1) : range(scope * 5, scope * 5 + 4);
  state.mode = 'recall';
  state.recall = { scope, order, pos: 0, pool: shuffle(order.slice()), placed: new Set(), firstTry: new Set(), mistakes: 0, missesHere: 0, hint: false, reveal: false, feedback: '', start: performance.now() };
  document.body.classList.add('recall');
  room.pickMode = 'recall';
  order.forEach((i, k) => { room.popStation(i, false, { delay: k * 0.035, sound: false }); room.setMedallionBlank(i, true); });
  room.setWalked(order[0] - 1);
  setTimeout(() => { if (state.recall && state.recall.pos === 0) room.focus(order[0], { duration: 1.8 }); }, 500);
  renderAll();
}

function pickPiece(i) {
  const r = state.recall;
  if (!r || state.mode !== 'recall' || r.placed.has(i)) return;
  const slot = r.order[r.pos];
  if (i === slot) {
    r.placed.add(i);
    if (r.missesHere === 0) r.firstTry.add(i);
    room.setMedallionBlank(i, false);
    room.popStation(i, true);
    room.setWalked(i);
    const s = STATIONS[i];
    r.feedback = `<span class="ok">✓</span> <b>${i + 1} · ${s.title}</b> — Genesis ${chapterLabel(s.chapters)}. ${s.summary.split('. ')[0]}.`;
    r.pos++;
    r.missesHere = 0; r.hint = false; r.reveal = false;
    if (r.pos >= r.order.length) { finishRecall(); return; }
    const nextSlot = r.order[r.pos];
    setTimeout(() => { if (state.recall === r && r.order[r.pos] === nextSlot) room.focus(nextSlot, { duration: 1.1 }); }, 650);
    renderCard();
    renderFlow();
  } else {
    r.mistakes++;
    r.missesHere++;
    audio.wrong();
    if (r.missesHere >= 2) { r.reveal = true; r.hint = true; }
    const s = STATIONS[i];
    r.feedback = `Not yet — <b>${s.title}</b> comes later, in Genesis ${chapterLabel(s.chapters)}.${r.reveal ? ' The right one is glowing.' : ''}`;
    renderCard();
    const btn = $(`[data-piece="${i}"]`);
    if (btn) { btn.classList.add('shake', 'wrong'); }
  }
}

function finishRecall() {
  const r = state.recall;
  r.time = performance.now() - r.start;
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {};
    const prev = all[r.scope];
    if (!prev || r.mistakes < prev.slips || (r.mistakes === prev.slips && r.time < prev.time)) {
      all[r.scope] = { slips: r.mistakes, time: r.time };
      localStorage.setItem(BEST_KEY, JSON.stringify(all));
      r.newBest = !!prev;
    }
  } catch { /* storage unavailable */ }
  state.mode = 'recall-result';
  room.focus(-1, { duration: 2.2 });
  room.setWalked(r.order[r.order.length - 1]);
  setTimeout(() => room.celebrate(r.order), 1500);
  renderAll();
}

function endRecall(toWalk = true) {
  const r = state.recall;
  if (r) {
    r.order.forEach((i, k) => {
      room.setMedallionBlank(i, false);
      if (!r.placed.has(i)) room.popStation(i, true, { delay: k * 0.05, sound: false });
    });
  }
  state.recall = null;
  room.pickMode = 'walk';
  document.body.classList.remove('recall');
  if (toWalk) {
    state.mode = 'walk';
    go(-1);
  }
}

// ---------- notes ----------
function noteStations() {
  const set = new Set();
  STATIONS.forEach((s, i) => { if (notes.inRange(s.chapters).length) set.add(i); });
  return set;
}

let saveTimer;
function onNoteInput(e) {
  const ta = e.target;
  const ch = +ta.dataset.ch;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const ok = notes.set(ch, ta.value);
    const chip = $(`.chip[data-ch="${ch}"]`);
    if (chip) chip.classList.toggle('has', !!ta.value.trim());
    const saved = $('.saved');
    if (saved) {
      saved.textContent = ok ? 'Saved on this device' : 'Couldn’t save — storage is blocked';
      saved.classList.add('show');
      clearTimeout(saved._t);
      saved._t = setTimeout(() => saved.classList.remove('show'), 1600);
    }
    room.setNotes(noteStations());
    renderTop();
    if (!$('#drawer').hidden) renderDrawer();
  }, 350);
}

function selectChapter(ch) {
  const i = state.index;
  state.chapterSel[i] = ch;
  $$('.chip').forEach((c) => { const on = +c.dataset.ch === ch; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
  const ta = $('#noteText');
  ta.dataset.ch = ch;
  ta.value = notes.get(ch);
  ta.placeholder = `What stands out to you in Genesis ${ch}?`;
  ta.setAttribute('aria-label', `Your notes on Genesis ${ch}`);
  if (!mobile.matches) ta.focus();
}

function renderDrawer() {
  const body = $('#drawer .drawer-body');
  const chs = notes.chapters();
  if (!chs.length) {
    body.innerHTML = '<p class="empty">No notes yet.<br>Open any object and write what strikes you — each chapter has its own page.</p>';
  } else {
    body.innerHTML = ZONES.map((z, k) => {
      const items = STATIONS.map((s, i) => ({ s, i })).filter(({ s }) => s.zone === k)
        .flatMap(({ s, i }) => notes.inRange(s.chapters).map((c) => `
          <button class="note-item" data-goto="${i}" data-ch="${c}">
            <span class="ni-ref">Genesis ${c} · ${esc(s.title)}</span>
            <span class="ni-text">${esc(notes.get(c))}</span>
          </button>`));
      return items.length ? `<div class="drawer-group" style="--zc:${z.color}"><h3><i></i>${z.numeral} · ${z.name}</h3>${items.join('')}</div>` : '';
    }).join('');
  }
  $('#drawer .drawer-foot').hidden = !chs.length;
}

function toggleDrawer(open) {
  const d = $('#drawer');
  const show = open ?? d.hidden;
  d.hidden = !show;
  if (show) renderDrawer();
}

function exportNotes() {
  const blob = new Blob([notes.toMarkdown(STATIONS)], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'genesis-notes.md';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- 3D interaction ----------
function onHover(hit, x, y) {
  const tip = $('#tooltip');
  let html = '';
  if (hit && (hit.type === 'station' || hit.type === 'note')) {
    const i = hit.index, s = STATIONS[i];
    const hidden = state.recall && state.recall.order.includes(i) && !state.recall.placed.has(i);
    if (!hidden) html = hit.type === 'note' ? `Your notes · ${esc(s.title)}<small>Genesis ${chapterLabel(s.chapters)}</small>` : `${i + 1} · ${esc(s.title)}<small>Genesis ${chapterLabel(s.chapters)}</small>`;
  } else if (hit && hit.type === 'exit') {
    html = 'Exodus<small>Room 2 · not built yet</small>';
  }
  if (!html) { tip.hidden = true; return; }
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = `${Math.min(innerWidth - tip.offsetWidth - 10, x + 16)}px`;
  tip.style.top = `${y + 18}px`;
}

function onPick(hit) {
  if (hit.type === 'exit') { toast('Room 2 · Exodus isn’t built yet. This prototype is the Genesis room only.'); return; }
  if (state.mode !== 'walk') return;
  if (hit.type === 'station') go(hit.index);
  if (hit.type === 'note') {
    go(hit.index);
    state.sheetOpen = true;
    renderCard();
    setTimeout(() => $('#noteText')?.focus({ preventScroll: false }), 300);
  }
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- layout ----------
function updateFrame() {
  if (!room) return;
  const w = innerWidth, h = innerHeight;
  if (state.mode === 'intro') {
    if (mobile.matches) room.setFrame(0, -h * 0.2); else room.setFrame(-w * 0.2, 0);
    return;
  }
  if (mobile.matches) {
    const card = $('#card');
    const top = card.getBoundingClientRect().top;
    const covered = Math.max(0, h - top);
    room.setFrame(0, covered * 0.5 - 24);
  } else {
    const cw = $('#card').offsetWidth + 20;
    room.setFrame(cw * 0.5, 44);
  }
}

function syncSound() {
  const m = audio.isMuted();
  const b = $('#btnSound');
  b.classList.toggle('muted', m);
  b.setAttribute('aria-pressed', !m);
  b.setAttribute('aria-label', m ? 'Sound off' : 'Sound on');
}

function bindUI() {
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#btnOverview').addEventListener('click', () => { if (state.mode === 'walk') go(-1); });
  $('#btnNotes').addEventListener('click', () => toggleDrawer());
  $('#btnSound').addEventListener('click', () => { audio.init(); audio.setMuted(!audio.isMuted()); syncSound(); });
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    if (state.mode === 'intro' || state.mode === 'opening') return;
    if (b.dataset.mode === 'recall') { if (!state.mode.startsWith('recall')) openRecallSetup(); }
    else if (state.mode.startsWith('recall')) { if (state.recall) endRecall(); else { state.mode = 'walk'; go(-1); } }
  }));

  $('#flowTrack').addEventListener('click', (e) => {
    const node = e.target.closest('[data-node]');
    if (node && state.mode === 'walk') return go(+node.dataset.node);
    const zone = e.target.closest('[data-zone]');
    if (zone && state.mode === 'walk') go(+zone.dataset.zone * 5);
  });

  const card = $('#card');
  card.addEventListener('click', (e) => {
    const t = e.target;
    const act = t.closest('[data-act]')?.dataset.act;
    if (act === 'start') return go(0);
    if (act === 'next') return step(1);
    if (act === 'recall') return openRecallSetup();
    if (act === 'begin') return beginRecall();
    if (act === 'walk') { if (state.recall) endRecall(); else { state.mode = 'walk'; go(-1); } return; }
    if (act === 'again') { endRecall(false); state.mode = 'walk'; return openRecallSetup(); }
    if (act === 'quit') return endRecall();
    if (act === 'hint' && state.recall) { state.recall.hint = true; renderCard(); return; }
    if (act === 'sheet' && mobile.matches && state.mode === 'walk') { state.sheetOpen = !state.sheetOpen; renderCard(); return; }
    const zone = t.closest('[data-zone]');
    if (zone) return go(+zone.dataset.zone * 5);
    const chip = t.closest('.chip');
    if (chip) return selectChapter(+chip.dataset.ch);
    const scope = t.closest('[data-scope]');
    if (scope) { state.scope = +scope.dataset.scope; renderCard(); return; }
    const piece = t.closest('[data-piece]');
    if (piece) pickPiece(+piece.dataset.piece);
  });
  card.addEventListener('input', (e) => { if (e.target.id === 'noteText') onNoteInput(e); });
  card.addEventListener('animationend', (e) => { if (e.target.classList.contains('piece')) e.target.classList.remove('shake'); });

  const drawer = $('#drawer');
  drawer.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close-drawer') return toggleDrawer(false);
    if (act === 'export') return exportNotes();
    const item = e.target.closest('[data-goto]');
    if (item) {
      toggleDrawer(false);
      if (state.mode.startsWith('recall')) endRecall();
      const i = +item.dataset.goto;
      state.chapterSel[i] = +item.dataset.ch;
      go(i);
      state.sheetOpen = true;
      renderCard();
      setTimeout(() => $('#noteText')?.focus(), 300);
    }
  });

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('textarea, input')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Escape') {
      if (!$('#drawer').hidden) toggleDrawer(false);
      else if (state.mode === 'walk') go(-1);
    }
  });

  addEventListener('resize', () => updateFrame());
  mobile.addEventListener('change', () => renderCard());
}
