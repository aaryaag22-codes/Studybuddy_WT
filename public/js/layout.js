// Builds the shared header, footer and settings panel on every page,
// and protects pages that need a login. Each page calls:  const user = await initPage();
import { el, $ } from './dom.js';
import { icon } from './icons.js';
import { api, toast } from './api.js';

const APP_LINKS = [
  ['dashboard.html', 'Dashboard'],
  ['planner.html', 'Planner'],
  ['focus.html', 'Focus'],
  ['notes.html', 'Notes'],
  ['quizzes.html', 'Quizzes'],
  ['flashcards.html', 'Flashcards'],
  ['xml.html', 'XML tools']
];
const GUEST_LINKS = [['login.html', 'Log in'], ['register.html', 'Register']];

// ---------- saved preferences (theme, text size, motion) ----------
function loadPrefs() {
  const prefs = { theme: 'system', text: 'normal', motion: 'system' };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('sb-prefs') || '{}')); } catch { /* ignore */ }
  return prefs;
}
function savePrefs(prefs) {
  try { localStorage.setItem('sb-prefs', JSON.stringify(prefs)); } catch { /* ignore */ }
  const root = document.documentElement;
  let theme = prefs.theme;
  if (theme === 'system') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-text', prefs.text);
  root.setAttribute('data-motion', prefs.motion === 'reduce' ? 'reduce' : 'normal');
}

function currentPage() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return file.endsWith('.html') ? file : file + '.html';
}

// One group of radio buttons that looks like pill buttons
function choiceGroup(name, legend, options, current, onChange) {
  return el('fieldset', {},
    el('legend', { text: legend }),
    el('div', { class: 'choice-row' }, options.map(([value, label]) =>
      el('label', { class: 'choice' },
        el('input', { type: 'radio', name, value, checked: value === current, onchange: () => onChange(value) }),
        el('span', { text: label })
      ))
    )
  );
}

function buildSettings() {
  const prefs = loadPrefs();
  const update = (key, value) => { prefs[key] = value; savePrefs(prefs); };

  const motion = el('input', { type: 'checkbox', id: 'pref-motion', checked: prefs.motion === 'reduce',
    onchange: (e) => update('motion', e.target.checked ? 'reduce' : 'system') });

  const dialog = el('dialog', { class: 'panel', id: 'settings-dialog', 'aria-labelledby': 'settings-title' },
    el('div', { class: 'panel-head' },
      el('h2', { id: 'settings-title', text: 'Display settings' }),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Close', onclick: () => dialog.close() })
    ),
    el('div', { class: 'panel-body' },
      el('p', { class: 'hint', text: 'These choices are saved on this device.' }),
      choiceGroup('pref-theme', 'Colour theme', [['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark'], ['contrast', 'High contrast']], prefs.theme, (v) => update('theme', v)),
      choiceGroup('pref-text', 'Text size', [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']], prefs.text, (v) => update('text', v)),
      el('div', { class: 'field' }, el('label', { class: 'check', for: 'pref-motion' }, motion, 'Reduce animations')),
      el('button', { class: 'btn btn-secondary', type: 'button', text: 'Reset to defaults', onclick: () => {
        prefs.theme = 'system'; prefs.text = 'normal'; prefs.motion = 'system'; savePrefs(prefs);
        dialog.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = (r.value === 'system' || r.value === 'normal'); });
        motion.checked = false; toast('Display settings reset.');
      } })
    )
  );
  return dialog;
}

function buildHeader(user) {
  const page = currentPage();
  const links = user ? APP_LINKS : GUEST_LINKS;
  const nav = el('nav', { class: 'main-nav', id: 'main-nav', 'aria-label': 'Main' },
    el('ul', {}, links.map(([href, label]) =>
      el('li', {}, el('a', { href, 'aria-current': href === page ? 'page' : false, text: label }))
    ))
  );
  const settingsBtn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', 'aria-haspopup': 'dialog',
    onclick: () => $('#settings-dialog').showModal() }, icon('settings'), 'Display');
  const menuBtn = el('button', { class: 'btn btn-secondary btn-sm menu-toggle', type: 'button', 'aria-expanded': 'false',
    'aria-controls': 'main-nav', onclick: (e) => {
      const open = nav.classList.toggle('is-open');
      e.currentTarget.setAttribute('aria-expanded', String(open));
    } }, icon('menu'), 'Menu');

  const actions = el('div', { class: 'header-actions' }, settingsBtn);
  if (user) {
    actions.prepend(el('span', { class: 'user-chip', text: user.name }));
    actions.append(el('button', { class: 'btn btn-secondary btn-sm', type: 'button', text: 'Log out', onclick: async () => {
      try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* ignore */ }
      location.href = 'index.html';
    } }));
  }
  const brand = el('a', { class: 'brand', href: 'index.html' }, icon('logo'), 'StudyBuddy');
  return el('div', { class: 'container header-inner' }, brand, menuBtn, nav, actions);
}

function buildFooter() {
  return el('div', { class: 'container footer-inner' },
    el('p', { text: 'StudyBuddy, a B.Tech web development project. Built with HTML, CSS, JavaScript, XML, Node.js and MongoDB.' }),
    el('nav', { 'aria-label': 'Footer' }, el('ul', {},
      el('li', {}, el('a', { href: '/feed.xml', text: 'RSS feed of shared notes' })),
      el('li', {}, el('a', { href: '#main', text: 'Back to top' }))
    ))
  );
}

export async function initPage() {
  const protectedPage = document.body.hasAttribute('data-protected');
  const guestOnly = document.body.hasAttribute('data-guest-only');

  let user = null;
  try { user = await api('/auth/me'); } catch { user = null; }

  if (protectedPage && !user) {
    location.replace('login.html?next=' + encodeURIComponent(currentPage()));
    return new Promise(() => {}); // stop the page script while redirecting
  }
  if (guestOnly && user) {
    location.replace('dashboard.html');
    return new Promise(() => {});
  }

  $('#site-header').replaceChildren(buildHeader(user));
  $('#site-footer').replaceChildren(buildFooter());
  document.body.append(buildSettings());
  return user;
}

// Page title helper: "Planner - StudyBuddy"
export function greetingFor(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name.split(' ')[0]}`;
}
