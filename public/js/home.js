// Home page: shows the feature cards, and a dashboard button when you are logged in
import { el, $ } from './dom.js';
import { icon } from './icons.js';
import { initPage } from './layout.js';

const user = await initPage();

const features = $('#features');
if (features) {
  const items = [
    ['chart', 'Dashboard', 'See tasks, focus time, streak and quiz scores on one screen.'],
    ['planner', 'Planner', 'Subjects, tasks, due dates and priorities with quick filters.'],
    ['timer', 'Focus timer', 'Pomodoro sessions that are saved and build a daily streak.'],
    ['notes', 'Notes library', 'Search your notes and share the good ones with classmates.'],
    ['quiz', 'Quizzes', 'Write multiple choice questions and track your scores.'],
    ['cards', 'Flashcards', 'Flip through any quiz as a deck, with shuffle and progress.'],
    ['xml', 'XML tools', 'Export, import and subscribe to your notes using XML and RSS.'],
    ['settings', 'Display settings', 'Dark and high contrast themes, bigger text and fewer animations.']
  ];
  features.replaceChildren(...items.map(([ic, title, text]) =>
    el('article', { class: 'card card-lift rise' },
      el('div', { class: 'feature-icon' }, icon(ic)),
      el('h3', { text: title }),
      el('p', { text })
    )));
}

if (user) {
  const actions = $('#hero-actions');
  if (actions) actions.replaceChildren(
    el('a', { class: 'btn btn-lg', href: 'dashboard.html', text: 'Go to your dashboard' }),
    el('a', { class: 'btn btn-secondary btn-lg', href: 'planner.html', text: 'Open the planner' })
  );
}
