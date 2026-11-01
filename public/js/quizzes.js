// Feature 5 (Member B): quiz maker and quiz list
import { el, $, $$, fmtDate, fmtDateTime } from './dom.js';
import { initPage } from './layout.js';
import { api, toast, setFieldError } from './api.js';
import { confirmDialog, emptyState } from './ui.js';
import { icon } from './icons.js';

await initPage();

// ---------- list of quizzes ----------
async function loadQuizzes() {
  const quizzes = await api('/quizzes');
  $('#quiz-list').replaceChildren(quizzes.length
    ? el('div', { class: 'grid grid-2' }, quizzes.map((q) => el('article', { class: 'card card-lift' },
        el('div', { class: 'row' }, el('span', { class: 'badge', text: q.subject }),
          q.lastScore ? el('span', { class: 'badge badge-success', text: `Last score ${q.lastScore.score}/${q.lastScore.total}` }) : el('span', { class: 'badge badge-warning', text: 'Not taken yet' })),
        el('h3', { text: q.title }),
        el('p', { class: 'hint', text: `${q.questionCount} question${q.questionCount === 1 ? '' : 's'}` }),
        el('div', { class: 'row' },
          el('a', { class: 'btn btn-sm', href: `quiz-take.html?id=${q.id}` }, 'Take quiz', el('span', { class: 'visually-hidden', text: `: ${q.title}` })),
          el('a', { class: 'btn btn-secondary btn-sm', href: `flashcards.html?deck=${q.id}` }, 'Flashcards', el('span', { class: 'visually-hidden', text: ` for ${q.title}` })),
          el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: () => removeQuiz(q) }, icon('trash'), 'Delete', el('span', { class: 'visually-hidden', text: ` quiz ${q.title}` }))))))
    : emptyState(icon('empty'), 'No quizzes yet', 'Create your first quiz with the form below.'));
}

async function loadHistory() {
  const history = await api('/quizzes/history');
  $('#history').replaceChildren(history.length
    ? el('ul', { class: 'list-plain' }, history.map((h) => el('li', {},
        el('div', { class: 'row row-between' }, el('strong', { text: h.quizTitle }),
          el('span', { class: h.score / h.total >= 0.7 ? 'badge badge-success' : 'badge badge-warning', text: `${h.score}/${h.total}` })),
        el('span', { class: 'hint', text: fmtDateTime(h.takenAt) }))))
    : el('p', { class: 'hint', text: 'Quiz attempts will appear here.' }));
}

async function removeQuiz(q) {
  const yes = await confirmDialog({ title: 'Delete this quiz?', message: `"${q.title}" and its scores will be removed.`, confirmLabel: 'Delete quiz' });
  if (!yes) return;
  try { await api(`/quizzes/${q.id}`, { method: 'DELETE' }); toast('Quiz deleted.'); await Promise.all([loadQuizzes(), loadHistory()]); }
  catch (err) { toast(err.message, 'error'); }
}

// ---------- quiz builder ----------
let counter = 0;
const LETTERS = ['A', 'B', 'C', 'D'];

function questionBlock(number) {
  const n = ++counter;
  const group = el('fieldset', { class: 'question-builder', dataset: { n } },
    el('legend', { text: `Question ${number}` }),
    el('div', { class: 'field' },
      el('label', { for: `q${n}-text`, text: 'Question *' }),
      el('input', { class: 'input', id: `q${n}-text`, type: 'text', maxlength: '300', 'aria-describedby': `q${n}-error` }),
      el('p', { class: 'error', id: `q${n}-error` })),
    ...LETTERS.map((L, i) => el('div', { class: 'row' },
      el('div', { class: 'field flex-1' },
        el('label', { for: `q${n}-opt${i}`, text: `Option ${L} *` }),
        el('input', { class: 'input', id: `q${n}-opt${i}`, type: 'text', maxlength: '150' })),
      el('label', { class: 'check', for: `q${n}-ans${i}` },
        el('input', { type: 'radio', name: `q${n}-answer`, id: `q${n}-ans${i}`, value: String(i) }), 'Correct answer'))),
    el('div', { class: 'field' },
      el('label', { for: `q${n}-why`, text: 'Why is it correct? (optional)' }),
      el('input', { class: 'input', id: `q${n}-why`, type: 'text', maxlength: '300' })),
    number > 1 ? el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: (e) => {
      e.currentTarget.closest('fieldset').remove(); renumber(); $('#add-question').focus();
    } }, 'Remove question ' + number) : null);
  return group;
}

function renumber() {
  $$('#questions fieldset').forEach((fs, i) => { fs.querySelector('legend').textContent = `Question ${i + 1}`; });
}

$('#add-question').addEventListener('click', () => {
  const block = questionBlock($$('#questions fieldset').length + 1);
  $('#questions').append(block);
  block.querySelector('input').focus();
});

$('#quiz-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertBox = $('#quiz-alert');
  alertBox.textContent = '';
  const title = $('#quiz-title'), subject = $('#quiz-subject');
  setFieldError(title, ''); setFieldError(subject, '');
  if (title.value.trim().length < 2) { setFieldError(title, 'Enter a quiz title (at least 2 characters).'); title.focus(); return; }
  if (subject.value.trim().length < 2) { setFieldError(subject, 'Enter a subject (at least 2 characters).'); subject.focus(); return; }

  const questions = [];
  for (const [i, fs] of $$('#questions fieldset').entries()) {
    const n = fs.dataset.n;
    const err = $(`#q${n}-error`);
    err.textContent = '';
    const text = $(`#q${n}-text`);
    const options = LETTERS.map((_, k) => $(`#q${n}-opt${k}`).value.trim());
    const chosen = fs.querySelector(`input[name="q${n}-answer"]:checked`);
    let problem = '';
    if (text.value.trim().length < 3) problem = `Question ${i + 1} needs some text.`;
    else if (options.some((o) => !o)) problem = `Question ${i + 1} needs all four options filled in.`;
    else if (!chosen) problem = `Choose the correct answer for question ${i + 1}.`;
    if (problem) { err.textContent = problem; text.focus(); alertBox.textContent = problem; return; }
    questions.push({ question: text.value.trim(), options, correctIndex: Number(chosen.value), explanation: $(`#q${n}-why`).value.trim() });
  }
  try {
    await api('/quizzes', { method: 'POST', body: { title: title.value.trim(), subject: subject.value.trim(), questions } });
    toast('Quiz saved.');
    e.target.reset();
    resetBuilder();
    await loadQuizzes();
  } catch (err) { alertBox.textContent = err.message; }
});

function resetBuilder() { $('#questions').replaceChildren(questionBlock(1)); }

resetBuilder();
await Promise.all([loadQuizzes(), loadHistory()]);
