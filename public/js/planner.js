// Feature 2 (Member A): planner - subjects and tasks (create, read, update, delete)
import { el, $, clear, fmtDate, dayKeyUTC, todayKey } from './dom.js';
import { initPage } from './layout.js';
import { api, toast, setFieldError } from './api.js';
import { confirmDialog, emptyState } from './ui.js';
import { icon } from './icons.js';

await initPage();

const COLORS = [
  ['#6366f1', 'Indigo'], ['#0d9488', 'Teal'], ['#b45309', 'Amber'], ['#db2777', 'Pink'],
  ['#0284c7', 'Sky blue'], ['#15803d', 'Green'], ['#dc2626', 'Red'], ['#c2410c', 'Orange']
];
let subjects = [];
let tasks = [];

// ---------- helpers ----------
function dot(color) {
  const d = el('span', { class: 'dot', 'aria-hidden': 'true' });
  d.style.setProperty('--dot', color);
  return d;
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ---------- subjects ----------
function renderSwatches() {
  $('#swatches').replaceChildren(...COLORS.map(([hex, name], i) => {
    const span = el('span', {});
    span.style.setProperty('--c', hex);
    return el('label', { class: 'swatch' },
      el('input', { type: 'radio', name: 'color', value: hex, checked: i === 0 }),
      span, el('span', { class: 'visually-hidden', text: name }));
  }));
}

function renderSubjects() {
  const options = (first) => [el('option', { value: '', text: first }), ...subjects.map((s) => el('option', { value: s._id, text: s.name }))];
  const keep = (sel) => sel.value;
  const a = keep($('#task-subject')), b = keep($('#filter-subject'));
  $('#task-subject').replaceChildren(...options('No subject'));
  $('#filter-subject').replaceChildren(...options('All subjects'));
  $('#task-subject').value = a; $('#filter-subject').value = b;

  const list = $('#subject-list');
  clear(list);
  subjects.forEach((s) => list.append(el('li', { class: 'row row-between' },
    el('span', { class: 'subject-chip' }, dot(s.color), s.name),
    el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => removeSubject(s) },
      'Delete', el('span', { class: 'visually-hidden', text: ` subject ${s.name}` })))));
}

async function loadSubjects() { subjects = await api('/subjects'); renderSubjects(); }

async function removeSubject(s) {
  const yes = await confirmDialog({ title: 'Delete this subject?', message: `"${s.name}" will be removed. Its tasks stay, but they will have no subject.`, confirmLabel: 'Delete subject' });
  if (!yes) return;
  try { await api(`/subjects/${s._id}`, { method: 'DELETE' }); toast('Subject deleted.'); await loadSubjects(); await loadTasks(); }
  catch (err) { toast(err.message, 'error'); }
}

$('#subject-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#subject-name');
  setFieldError(input, '');
  $('#subject-alert').textContent = '';
  if (input.value.trim().length < 2) { setFieldError(input, 'Enter a subject name (at least 2 characters).'); input.focus(); return; }
  const color = $('input[name=color]:checked').value;
  try {
    await api('/subjects', { method: 'POST', body: { name: input.value.trim(), color } });
    input.value = '';
    toast('Subject added.');
    await loadSubjects();
  } catch (err) { $('#subject-alert').textContent = err.message; }
});

// ---------- tasks ----------
async function loadTasks() {
  const q = new URLSearchParams();
  if ($('#filter-subject').value) q.set('subject', $('#filter-subject').value);
  if ($('#filter-status').value) q.set('status', $('#filter-status').value);
  tasks = await api('/tasks?' + q.toString());
  renderTasks();
}

function dueBadge(task) {
  if (!task.dueDate) return null;
  const overdue = !task.done && dayKeyUTC(task.dueDate) < todayKey();
  return el('span', { class: overdue ? 'badge badge-danger' : 'hint', text: overdue ? `Overdue, was due ${fmtDate(task.dueDate)}` : `Due ${fmtDate(task.dueDate)}` });
}

function taskItem(task) {
  const id = 'chk-' + task._id;
  const check = el('input', { type: 'checkbox', id, checked: task.done, onchange: async (e) => {
    try { await api(`/tasks/${task._id}`, { method: 'PUT', body: { done: e.target.checked } }); toast(e.target.checked ? 'Task completed. Well done!' : 'Task moved back to your list.'); await loadTasks(); }
    catch (err) { e.target.checked = !e.target.checked; toast(err.message, 'error'); }
  } });
  const item = el('li', { class: 'task' + (task.done ? ' is-done' : '') },
    el('label', { for: id }, check, el('span', { class: 'visually-hidden', text: `Mark "${task.title}" as done` })),
    el('div', {},
      el('div', { class: 'task-title', text: task.title }),
      el('div', { class: 'task-meta' },
        task.subject ? el('span', { class: 'subject-chip' }, dot(task.subject.color), task.subject.name) : null,
        dueBadge(task),
        el('span', { class: task.priority === 'high' ? 'badge badge-warning' : 'badge', text: `${cap(task.priority)} priority` }),
        task.done ? el('span', { class: 'badge badge-success', text: 'Completed' }) : null)),
    el('div', { class: 'row task-actions' },
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => editTask(item, task) }, 'Edit', el('span', { class: 'visually-hidden', text: ` task ${task.title}` })),
      el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => removeTask(task) }, icon('trash'), 'Delete', el('span', { class: 'visually-hidden', text: ` task ${task.title}` })))
  );
  if (task.subject) item.style.setProperty('--dot', task.subject.color);
  return item;
}

function renderTasks() {
  const box = $('#tasks');
  $('#task-count').textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'} shown`;
  if (!tasks.length) {
    box.replaceChildren(emptyState(icon('empty'), 'No tasks here', 'Add a task using the form, or change the filters.'));
    return;
  }
  box.replaceChildren(el('ul', { class: 'task-list' }, tasks.map(taskItem)));
}

// Inline editing: the task row turns into a small form
function editTask(item, task) {
  const id = task._id;
  const title = el('input', { class: 'input', id: `e-title-${id}`, type: 'text', value: task.title, maxlength: '120' });
  const due = el('input', { class: 'input', id: `e-due-${id}`, type: 'date', value: task.dueDate ? dayKeyUTC(task.dueDate) : '' });
  const pr = el('select', { class: 'input', id: `e-pr-${id}` }, ['low', 'medium', 'high'].map((p) => el('option', { value: p, text: cap(p), selected: p === task.priority })));
  const err = el('p', { class: 'error', id: `e-title-${id}-error`, role: 'alert' });
  const form = el('form', { class: 'card', novalidate: true, 'aria-label': `Edit task ${task.title}`, onsubmit: async (e) => {
    e.preventDefault();
    if (title.value.trim().length < 2) { err.textContent = 'Enter a task title (at least 2 characters).'; title.focus(); return; }
    try {
      await api(`/tasks/${id}`, { method: 'PUT', body: { title: title.value.trim(), dueDate: due.value, priority: pr.value } });
      toast('Task updated.'); await loadTasks();
    } catch (ex) { err.textContent = ex.message; }
  } },
    el('div', { class: 'field' }, el('label', { for: title.id, text: 'Task' }), title, err),
    el('div', { class: 'grid grid-2' },
      el('div', { class: 'field' }, el('label', { for: due.id, text: 'Due date' }), due),
      el('div', { class: 'field' }, el('label', { for: pr.id, text: 'Priority' }), pr)),
    el('div', { class: 'row' },
      el('button', { class: 'btn btn-sm', type: 'submit', text: 'Save changes' }),
      el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Cancel', onclick: () => renderTasks() })));
  item.replaceWith(el('li', {}, form));
  title.focus();
}

async function removeTask(task) {
  const yes = await confirmDialog({ title: 'Delete this task?', message: `"${task.title}" will be removed for good.`, confirmLabel: 'Delete task' });
  if (!yes) return;
  try { await api(`/tasks/${task._id}`, { method: 'DELETE' }); toast('Task deleted.'); await loadTasks(); }
  catch (err) { toast(err.message, 'error'); }
}

$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#task-title');
  setFieldError(title, '');
  $('#task-alert').textContent = '';
  if (title.value.trim().length < 2) { setFieldError(title, 'Enter a task (at least 2 characters).'); title.focus(); return; }
  try {
    await api('/tasks', { method: 'POST', body: {
      title: title.value.trim(), subject: $('#task-subject').value, dueDate: $('#task-due').value, priority: $('#task-priority').value } });
    title.value = ''; $('#task-due').value = '';
    toast('Task added.');
    await loadTasks();
    title.focus();
  } catch (err) { $('#task-alert').textContent = err.message; }
});

$('#filter-form').addEventListener('change', loadTasks);


renderSwatches();
await loadSubjects();
await loadTasks();
