// A friendly confirmation box built on the native <dialog> element
// (keyboard friendly: Tab stays inside, Esc cancels, focus returns afterwards).
import { el } from './dom.js';

export function confirmDialog({ title, message, confirmLabel = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    let answer = false;
    const dialog = el('dialog', { class: 'panel', 'aria-labelledby': 'confirm-title' },
      el('div', { class: 'panel-head' }, el('h2', { id: 'confirm-title', text: title })),
      el('div', { class: 'panel-body' },
        el('p', { text: message }),
        el('div', { class: 'row' },
          el('button', { class: 'btn btn-secondary', type: 'button', autofocus: true, text: 'Cancel', onclick: () => dialog.close() }),
          el('button', { class: danger ? 'btn btn-danger' : 'btn', type: 'button', text: confirmLabel, onclick: () => { answer = true; dialog.close(); } })
        )
      )
    );
    dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); });
    document.body.append(dialog);
    dialog.showModal();
  });
}

// Small empty-state block used by several pages
export function emptyState(icon, title, text, action) {
  return el('div', { class: 'empty' }, icon, el('p', {}, el('strong', { text: title })), el('p', { text }), action || null);
}
