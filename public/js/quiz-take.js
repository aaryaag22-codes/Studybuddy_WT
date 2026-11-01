// Feature 5 (Member B): take a quiz, one question at a time, then see the score
import { el, $ } from './dom.js';
import { initPage } from './layout.js';
import { api } from './api.js';
import { donut } from './charts.js';

await initPage();

async function main() {

  const id = new URLSearchParams(location.search).get('id');
  const area = $('#quiz-area');
  if (!id) { area.replaceChildren(el('p', {}, 'No quiz was chosen. ', el('a', { href: 'quizzes.html', text: 'Pick a quiz' }), '.')); return; }

  let quiz;
  try { quiz = await api(`/quizzes/${id}`); }
  catch (err) { area.replaceChildren(el('p', { class: 'form-alert', role: 'alert', text: err.message }), el('a', { href: 'quizzes.html', text: 'Back to all quizzes' })); return; }

  document.title = `${quiz.title} - StudyBuddy`;
  $('#page-title').textContent = quiz.title;
  $('#quiz-sub').textContent = `${quiz.subject} - ${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'}. Choose one answer for each question.`;

  const answers = new Array(quiz.questions.length).fill(null);
  let index = 0;

  function renderQuestion() {
    const q = quiz.questions[index];
    const last = index === quiz.questions.length - 1;
    const pct = Math.round((index / quiz.questions.length) * 100);
    const progress = el('div', { class: 'quiz-progress' },
      el('p', { class: 'hint', id: 'progress-text', text: `Question ${index + 1} of ${quiz.questions.length}` }),
      el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-labelledby': 'progress-text' },
        (() => { const s = el('span'); s.style.width = pct + '%'; return s; })()));
    const error = el('p', { class: 'error', id: 'answer-error', role: 'alert' });
    const form = el('form', { class: 'card', novalidate: true, onsubmit: (e) => { e.preventDefault(); next(); } },
      el('fieldset', { 'aria-describedby': 'answer-error' },
        el('legend', { text: q.question }),
        q.options.map((opt, i) => el('label', { class: 'option' },
          el('input', { type: 'radio', name: 'answer', value: String(i), checked: answers[index] === i, onchange: () => { answers[index] = i; error.textContent = ''; } }),
          el('span', { text: opt }))),
        error),
      el('div', { class: 'row' },
        index > 0 ? el('button', { class: 'btn btn-secondary', type: 'button', text: 'Previous', onclick: () => { index--; renderQuestion(); } }) : null,
        el('button', { class: 'btn', type: 'submit', text: last ? 'Submit answers' : 'Next question' })));
    area.replaceChildren(progress, form);
    form.querySelector('legend').setAttribute('tabindex', '-1');
    form.querySelector('legend').focus();
  }

  async function next() {
    if (answers[index] === null) { $('#answer-error').textContent = 'Choose an answer to continue.'; return; }
    if (index < quiz.questions.length - 1) { index++; renderQuestion(); return; }
    try {
      const result = await api(`/quizzes/${id}/submit`, { method: 'POST', body: { answers } });
      renderResult(result);
    } catch (err) { $('#answer-error').textContent = err.message; }
  }

  function renderResult({ score, total, results }) {
    const pct = Math.round((score / total) * 100);
    const heading = el('h2', { tabindex: '-1', id: 'result-title', text: `You scored ${score} out of ${total}` });
    area.replaceChildren(
      el('section', { class: 'card', 'aria-labelledby': 'result-title' },
        el('div', { class: 'row' },
          donut(pct, `${pct}%`, 'score', `Score: ${score} out of ${total}, ${pct} percent`),
          el('div', {}, heading,
            el('p', { text: pct === 100 ? 'Perfect score. Excellent work!' : pct >= 70 ? 'Great job. A little more revision and you will have it.' : 'Keep going. Review the answers below and try again.' }),
            el('div', { class: 'row' },
              el('button', { class: 'btn', type: 'button', text: 'Try again', onclick: () => { answers.fill(null); index = 0; renderQuestion(); } }),
              el('a', { class: 'btn btn-secondary', href: `flashcards.html?deck=${id}`, text: 'Revise with flashcards' }),
              el('a', { class: 'btn btn-ghost', href: 'quizzes.html', text: 'All quizzes' })))))
      ,
      el('section', { 'aria-labelledby': 'review-title', class: 'section' },
        el('h2', { id: 'review-title', text: 'Review your answers' }),
        results.map((r, i) => el('article', { class: `result-item ${r.correct ? 'right' : 'wrong'}` },
          el('h3', {}, `Question ${i + 1}: `, el('span', { class: r.correct ? 'badge badge-success' : 'badge badge-danger', text: r.correct ? 'Correct' : 'Incorrect' })),
          el('p', { text: r.question }),
          el('p', {}, el('strong', { text: 'Your answer: ' }), r.options[r.chosen] || 'No answer'),
          r.correct ? null : el('p', {}, el('strong', { text: 'Correct answer: ' }), r.options[r.correctIndex]),
          r.explanation ? el('p', { class: 'hint', text: r.explanation }) : null))));
    heading.focus();
  }

  renderQuestion();

}

main();
