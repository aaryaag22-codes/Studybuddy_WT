// Feature 3 (Member A): dashboard with stat cards and charts
import { el, $, fmtDate, dayKeyUTC, todayKey } from './dom.js';
import { initPage, greetingFor } from './layout.js';
import { api } from './api.js';
import { donut, barChart, dataTable } from './charts.js';
import { emptyState } from './ui.js';
import { icon } from './icons.js';

const user = await initPage();
$('#page-title').textContent = greetingFor(user.name);

const data = await api('/stats?tz=' + new Date().getTimezoneOffset());
const { totals, bySubject, upcoming, focus, quiz } = data;

$('#greeting-sub').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  + (totals.overdue ? ` - ${totals.overdue} task${totals.overdue === 1 ? ' is' : 's are'} overdue` : ' - nothing is overdue');

// ---- four summary cards ----
function stat(label, value, unit, note, accent) {
  const card = el('div', { class: 'stat' },
    el('dt', { text: label }),
    el('dd', {}, value, unit ? el('span', { class: 'unit', text: ' ' + unit }) : null,
      el('span', { class: 'stat-note', text: note })));
  card.style.setProperty('--stat-accent', accent);
  return card;
}
$('#stats').replaceChildren(
  stat('Tasks completed', `${totals.done}/${totals.tasks}`, '', totals.pending ? `${totals.pending} still to do` : 'All done', '#6366f1'),
  stat('Focus today', String(focus.todayMinutes), 'min', `${focus.weekMinutes} min this week`, '#0d9488'),
  stat('Study streak', String(focus.streak), focus.streak === 1 ? 'day' : 'days', focus.streak ? 'Keep it going' : 'Start a session today', '#b45309'),
  stat('Quiz average', quiz.averagePercent === null ? '-' : `${quiz.averagePercent}%`, '', quiz.attempts ? `${quiz.attempts} attempt${quiz.attempts === 1 ? '' : 's'}` : 'No quizzes taken yet', '#db2777')
);

// ---- task progress ring ----
const percent = totals.tasks ? Math.round((totals.done / totals.tasks) * 100) : 0;
$('#completion').replaceChildren(
  totals.tasks
    ? el('figure', {},
        donut(percent, `${percent}%`, 'complete', `Task progress: ${totals.done} of ${totals.tasks} tasks completed, ${percent} percent`),
        el('figcaption', { text: `${totals.done} of ${totals.tasks} tasks completed` }))
    : emptyState(icon('empty'), 'No tasks yet', 'Add a task in the planner to see your progress here.', el('a', { class: 'btn btn-secondary', href: 'planner.html', text: 'Open the planner' })),
  totals.tasks ? dataTable('Show this chart as a table', 'Tasks by subject', ['Subject', 'Done', 'To do'], bySubject.map((s) => [s.name, String(s.done), String(s.pending)])) : null
);

// ---- focus minutes this week (bar chart) ----
const weekData = focus.week.map((d, i) => ({
  label: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(d.date + 'T00:00:00Z')),
  value: d.minutes, highlight: i === focus.week.length - 1
}));
$('#week').replaceChildren(
  focus.weekMinutes
    ? el('figure', {}, barChart(weekData, 'min', `Bar chart of focus minutes for the last 7 days, ${focus.weekMinutes} minutes in total`),
        el('figcaption', { text: `${focus.weekMinutes} minutes in the last 7 days. Today is the teal bar.` }))
    : emptyState(icon('empty'), 'No focus sessions yet', 'Finish a session with the focus timer and it will appear here.', el('a', { class: 'btn btn-secondary', href: 'focus.html', text: 'Start the timer' })),
  focus.weekMinutes ? dataTable('Show this chart as a table', 'Focus minutes per day', ['Day', 'Minutes'], focus.week.map((d) => [d.date, String(d.minutes)])) : null
);

// ---- coming up ----
const today = todayKey();
$('#upcoming').replaceChildren(upcoming.length
  ? el('ul', { class: 'list-plain' }, upcoming.map((t) => {
      const due = dayKeyUTC(t.dueDate);
      const overdue = due < today;
      return el('li', {},
        el('div', { class: 'row row-between' },
          el('strong', { text: t.title }),
          overdue ? el('span', { class: 'badge badge-danger', text: 'Overdue' })
            : el('span', { class: `badge ${t.priority === 'high' ? 'badge-warning' : ''}`, text: `${t.priority[0].toUpperCase()}${t.priority.slice(1)} priority` })),
        el('div', { class: 'task-meta' },
          t.subject ? subjectChip(t.subject) : null,
          el('span', { class: 'hint', text: `Due ${fmtDate(t.dueDate)}` })));
    }))
  : emptyState(icon('empty'), 'Nothing due soon', 'Tasks with a due date show up here.', el('a', { class: 'btn btn-secondary', href: 'planner.html', text: 'Add a task' })));

function subjectChip(subject) {
  const dot = el('span', { class: 'dot', 'aria-hidden': 'true' });
  dot.style.setProperty('--dot', subject.color);
  return el('span', { class: 'subject-chip' }, dot, subject.name);
}

// ---- progress by subject ----
$('#subjects').replaceChildren(bySubject.length
  ? el('ul', { class: 'subject-bars' }, bySubject.map((s) => {
      const total = s.done + s.pending;
      const pct = total ? Math.round((s.done / total) * 100) : 0;
      const dot = el('span', { class: 'dot', 'aria-hidden': 'true' });
      dot.style.setProperty('--dot', s.color);
      const fill = el('span', {});
      fill.style.width = pct + '%';
      const bar = el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
        'aria-valuenow': String(pct), 'aria-label': `${s.name}: ${s.done} of ${total} tasks done` }, fill);
      bar.style.setProperty('--fill', s.color);
      return el('li', {}, el('div', { class: 'row' }, dot, el('strong', { text: s.name }), el('span', { class: 'hint', text: `${s.done} of ${total} done` })), bar);
    }))
  : emptyState(icon('empty'), 'No subjects yet', 'Add subjects in the planner to track them here.', el('a', { class: 'btn btn-secondary', href: 'planner.html', text: 'Add a subject' })));
