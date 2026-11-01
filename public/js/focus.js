// Feature 7 (Member A): focus timer (Pomodoro)
import { el, $, $$, fmtDateTime } from './dom.js';
import { initPage } from './layout.js';
import { api, toast } from './api.js';
import { icon } from './icons.js';

await initPage();

const CIRC = 2 * Math.PI * 54;
const ring = $('#ring');
ring.setAttribute('stroke-dasharray', CIRC);

let mode = { minutes: 25, name: 'Focus' };
let total = mode.minutes * 60;     // seconds in this session
let remaining = total;
let endAt = null;                  // timestamp when the timer should hit zero
let ticker = null;
let lastAnnounced = null;

const startBtn = $('#start-btn');
const resetBtn = $('#reset-btn');

function setButtons(running) {
  startBtn.replaceChildren(icon(running ? 'pause' : 'play'), running ? 'Pause' : (remaining < total ? 'Resume' : 'Start'));
  resetBtn.replaceChildren(icon('reset'), 'Reset');
}

function draw() {
  const m = String(Math.floor(remaining / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');
  $('#digits').textContent = `${m}:${s}`;
  ring.setAttribute('stroke-dashoffset', CIRC * (1 - remaining / total));
  document.title = ticker ? `${m}:${s} ${mode.name} - StudyBuddy` : 'Focus timer - StudyBuddy';
}

function announce(text) { $('#announce').textContent = text; }

function tick() {
  remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  draw();
  // Screen readers hear one short message per minute, not every second
  if (remaining > 0 && remaining % 60 === 0 && lastAnnounced !== remaining) {
    lastAnnounced = remaining;
    announce(`${remaining / 60} minute${remaining === 60 ? '' : 's'} remaining.`);
  }
  if (remaining === 0) finish();
}

function start() {
  endAt = Date.now() + remaining * 1000;
  ticker = setInterval(tick, 250);
  setButtons(true);
  announce(`${mode.name} started for ${Math.ceil(remaining / 60)} minutes.`);
}
function pause() {
  clearInterval(ticker); ticker = null;
  setButtons(false); draw();
  announce('Timer paused.');
}
function reset() {
  clearInterval(ticker); ticker = null;
  remaining = total; lastAnnounced = null;
  setButtons(false); draw();
  announce('Timer reset.');
}

function beep() {
  if (!$('#sound-toggle').checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.3);
  } catch { /* sound not available */ }
}

async function finish() {
  clearInterval(ticker); ticker = null;
  beep();
  const wasFocus = mode.name === 'Focus' || mode.name === 'Quick test';
  remaining = total; lastAnnounced = null;
  setButtons(false); draw();
  if (wasFocus) {
    try {
      await api('/focus', { method: 'POST', body: { minutes: mode.minutes, subject: $('#focus-subject').selectedOptions[0].text === 'No subject' ? '' : $('#focus-subject').selectedOptions[0].text } });
      announce(`Time is up. Your ${mode.minutes} minute session was saved.`);
      toast(`Great work! ${mode.minutes} minute session saved.`);
      await loadSummary();
    } catch (err) { toast(err.message, 'error'); announce('Time is up, but the session could not be saved.'); }
  } else {
    announce('Break finished. Ready for the next focus session.');
    toast('Break finished.');
  }
}

$$('.mode-tabs button').forEach((btn) => btn.addEventListener('click', () => {
  clearInterval(ticker); ticker = null;
  $$('.mode-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  mode = { minutes: Number(btn.dataset.minutes), name: btn.dataset.mode };
  total = remaining = mode.minutes * 60; lastAnnounced = null;
  $('#mode-label').textContent = mode.name;
  setButtons(false); draw();
}));
startBtn.addEventListener('click', () => (ticker ? pause() : start()));
resetBtn.addEventListener('click', reset);

async function loadSummary() {
  const [stats, recent] = await Promise.all([api('/stats?tz=' + new Date().getTimezoneOffset()), api('/focus')]);
  $('#today-min').textContent = `${stats.focus.todayMinutes} min`;
  $('#streak').textContent = `${stats.focus.streak} day${stats.focus.streak === 1 ? '' : 's'}`;
  $('#recent').replaceChildren(recent.length
    ? el('ul', { class: 'list-plain' }, recent.slice(0, 6).map((r) => el('li', { class: 'row row-between' },
        el('span', {}, el('strong', { text: `${r.minutes} min` }), r.subject ? ` of ${r.subject}` : ''),
        el('span', { class: 'hint', text: fmtDateTime(r.at) }))))
    : el('p', { class: 'hint', text: 'No sessions yet. Start the timer to log your first one.' }));
}

const subjects = await api('/subjects');
$('#focus-subject').append(...subjects.map((s) => el('option', { value: s._id, text: s.name })));
setButtons(false);
draw();
await loadSummary();
