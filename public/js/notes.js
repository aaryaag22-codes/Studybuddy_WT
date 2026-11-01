// Feature 4 (Member B): notes library with search, filters and sharing
import { el, $, fmtDate } from './dom.js';
import { initPage } from './layout.js';
import { api, toast, setFieldError } from './api.js';
import { confirmDialog, emptyState } from './ui.js';
import { icon } from './icons.js';

await initPage();

let allSubjects = [];

function noteCard(n) {
  const body = el('p', { class: 'note-body clamped', text: n.body });
  const toggle = n.body.length > 220 || n.body.split('\n').length > 4
    ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-expanded': 'false', text: 'Read more', onclick: (e) => {
        const open = body.classList.toggle('clamped') === false;
        e.currentTarget.setAttribute('aria-expanded', String(open));
        e.currentTarget.textContent = open ? 'Show less' : 'Read more';
      } })
    : null;
  return el('article', { class: 'card note-card' },
    el('div', { class: 'row' },
      el('span', { class: 'badge', text: n.subject }),
      n.mine ? el('span', { class: n.shared ? 'badge badge-success' : 'badge badge-warning', text: n.shared ? 'Shared' : 'Private' }) : el('span', { class: 'badge badge-success', text: 'Shared with you' })),
    el('h3', { text: n.title }),
    body, toggle,
    n.link ? el('p', {}, el('a', { href: n.link, rel: 'noopener noreferrer', target: '_blank' }, 'Open the linked page', el('span', { class: 'visually-hidden', text: ' (opens in a new tab)' }))) : null,
    el('div', { class: 'note-foot' },
      el('span', { text: `${n.mine ? 'You' : n.author}, ${fmtDate(n.createdAt)}` }),
      n.mine ? el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => removeNote(n) }, icon('trash'), 'Delete', el('span', { class: 'visually-hidden', text: ` note ${n.title}` })) : null));
}

async function removeNote(n) {
  const yes = await confirmDialog({ title: 'Delete this note?', message: `"${n.title}" will be removed for good.`, confirmLabel: 'Delete note' });
  if (!yes) return;
  try { await api(`/notes/${n.id}`, { method: 'DELETE' }); toast('Note deleted.'); await refresh(true); }
  catch (err) { toast(err.message, 'error'); }
}

async function load() {
  const q = new URLSearchParams({ scope: $('#search-scope').value });
  if ($('#search-q').value.trim()) q.set('q', $('#search-q').value.trim());
  if ($('#search-subject').value) q.set('subject', $('#search-subject').value);
  const notes = await api('/notes?' + q.toString());
  $('#note-count').textContent = `${notes.length} note${notes.length === 1 ? '' : 's'} found`;
  $('#notes').replaceChildren(notes.length
    ? el('div', { class: 'grid grid-3' }, notes.map(noteCard))
    : emptyState(icon('empty'), 'No notes found', 'Try a different search, or add your first note above.'));
}

// Rebuild the subject lists (search filter + suggestions in the add form)
async function loadSubjectOptions() {
  const [mine, shared, planner] = await Promise.all([api('/notes?scope=all'), Promise.resolve([]), api('/subjects')]);
  allSubjects = [...new Set([...planner.map((s) => s.name), ...mine.map((n) => n.subject)])].sort();
  const current = $('#search-subject').value;
  $('#search-subject').replaceChildren(el('option', { value: '', text: 'All subjects' }), ...allSubjects.map((s) => el('option', { value: s, text: s })));
  $('#search-subject').value = allSubjects.includes(current) ? current : '';
  $('#subject-options').replaceChildren(...allSubjects.map((s) => el('option', { value: s })));
  return shared;
}

async function refresh(withOptions) {
  if (withOptions) await loadSubjectOptions();
  await load();
}

// ----- add a note -----
$('#note-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#note-title'), subject = $('#note-subject'), body = $('#note-body'), link = $('#note-link');
  [title, subject, body, link].forEach((f) => setFieldError(f, ''));
  $('#note-alert').textContent = '';
  if (title.value.trim().length < 2) { setFieldError(title, 'Enter a title (at least 2 characters).'); title.focus(); return; }
  if (subject.value.trim().length < 2) { setFieldError(subject, 'Enter a subject, for example DBMS.'); subject.focus(); return; }
  if (body.value.trim().length < 5) { setFieldError(body, 'Write at least a short sentence in the note (5 characters or more).'); body.focus(); return; }
  if (link.value.trim() && !/^https?:\/\/\S+$/i.test(link.value.trim())) { setFieldError(link, 'The link must start with http:// or https://.'); link.focus(); return; }
  try {
    await api('/notes', { method: 'POST', body: { title: title.value, subject: subject.value, body: body.value, link: link.value, shared: $('#note-shared').checked } });
    e.target.reset();
    toast('Note saved.');
    await refresh(true);
  } catch (err) { $('#note-alert').textContent = err.message; }
});

// ----- search (waits a moment after typing) -----
let timer;
$('#search-q').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
$('#search-form').addEventListener('change', load);
$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); load(); });

await refresh(true);
