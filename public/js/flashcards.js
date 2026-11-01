// Feature 8 (Member B): flashcards made from quizzes
import { el, $ } from './dom.js';
import { initPage } from './layout.js';
import { api, toast } from './api.js';
import { icon } from './icons.js';
import { emptyState } from './ui.js';

await initPage();

async function main() {

  const area = $('#deck-area');
  const select = $('#deck-select');
  const shuffleBtn = $('#shuffle-btn');
  shuffleBtn.replaceChildren(icon('shuffle'), 'Shuffle cards');

  let deck = null;        // { id, title, cards }
  let order = [];         // card positions (can be shuffled)
  let pos = 0;
  let flipped = false;
  let known = new Set();

  const quizzes = await api('/quizzes');
  if (!quizzes.length) {
    $('#deck-form').hidden = true;
    area.replaceChildren(emptyState(icon('empty'), 'No decks yet', 'Flashcards are made from your quizzes. Create a quiz first.', el('a', { class: 'btn', href: 'quizzes.html', text: 'Create a quiz' })));
    return;
  }
  select.replaceChildren(...quizzes.map((q) => el('option', { value: q.id, text: `${q.title} (${q.questionCount} cards)` })));
  const wanted = new URLSearchParams(location.search).get('deck');
  if (wanted && quizzes.some((q) => q.id === wanted)) select.value = wanted;

  const storeKey = () => `sb-known-${deck.id}`;
  function saveKnown() { try { localStorage.setItem(storeKey(), JSON.stringify([...known])); } catch { /* ignore */ } }
  function loadKnown() { try { return new Set(JSON.parse(localStorage.getItem(storeKey()) || '[]')); } catch { return new Set(); } }

  async function loadDeck() {
    deck = await api(`/quizzes/${select.value}/cards`);
    known = loadKnown();
    order = deck.cards.map((_, i) => i);
    pos = 0; flipped = false;
    render();
  }

  function say(text) { $('#card-announce').textContent = text; }

  function render() {
    const total = deck.cards.length;
    const card = deck.cards[order[pos]];
    const knownCount = known.size;

    const face = el('button', { class: 'flashcard' + (flipped ? ' is-flipped' : ''), type: 'button', id: 'card', onclick: flip },
      el('span', { class: 'side', text: flipped ? 'Answer. Press to see the question again.' : 'Question. Press to reveal the answer.' }),
      el('span', { class: 'face', text: flipped ? card.back : card.front }),
      flipped && card.note ? el('span', { class: 'extra', text: card.note }) : null);

    const pct = Math.round((knownCount / total) * 100);
    const bar = el('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-labelledby': 'deck-progress' },
      (() => { const s = el('span'); s.style.width = pct + '%'; return s; })());

    area.replaceChildren(
      el('div', { class: 'row row-between' },
        el('p', { class: 'hint', id: 'deck-progress', text: `Card ${pos + 1} of ${total}. You know ${knownCount} of ${total}.` })),
      bar,
      el('div', { class: 'mt-md' }, face),
      el('div', { class: 'deck-controls' },
        el('button', { class: 'btn btn-secondary', type: 'button', text: 'Previous', onclick: () => go(-1) }),
        el('button', { class: 'btn btn-secondary', type: 'button', text: 'Still learning', onclick: () => mark(false) }),
        el('button', { class: 'btn', type: 'button', onclick: () => mark(true) }, icon('check'), 'I knew it'),
        el('button', { class: 'btn btn-secondary', type: 'button', text: 'Next', onclick: () => go(1) })),
      el('p', { class: 'hint mt-md' }, 'Keyboard: ', el('span', { class: 'kbd', text: 'Space' }), ' or ', el('span', { class: 'kbd', text: 'Enter' }), ' flips the card, ',
        el('span', { class: 'kbd', text: 'Left' }), ' and ', el('span', { class: 'kbd', text: 'Right' }), ' arrow keys move between cards.'),
      knownCount ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Clear my progress for this deck', onclick: () => { known.clear(); saveKnown(); render(); toast('Progress cleared.'); } }) : null);
  }

  function flip() {
    flipped = !flipped;
    render();
    $('#card').focus();
    const card = deck.cards[order[pos]];
    say(flipped ? `Answer: ${card.back}` : `Question: ${card.front}`);
  }
  function go(step) {
    const total = deck.cards.length;
    pos = (pos + step + total) % total;
    flipped = false;
    render();
    $('#card').focus();
    say(`Card ${pos + 1} of ${total}. Question: ${deck.cards[order[pos]].front}`);
  }
  function mark(yes) {
    const idx = order[pos];
    if (yes) known.add(idx); else known.delete(idx);
    saveKnown();
    toast(yes ? 'Marked as known.' : 'Marked as still learning.');
    if (known.size === deck.cards.length) { render(); say('You know every card in this deck. Great work!'); return; }
    go(1);
  }

  shuffleBtn.addEventListener('click', () => {
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    pos = 0; flipped = false; render(); toast('Cards shuffled.');
  });
  select.addEventListener('change', loadDeck);
  

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.closest('dialog')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  await loadDeck();

}

main();
