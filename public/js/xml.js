// Feature 6 (Member B): XML export, XML import
import { el, $ } from './dom.js';
import { initPage } from './layout.js';
import { api, toast, setFieldError } from './api.js';
import { icon } from './icons.js';

await initPage();

const exportBtn = $('#export-btn');
const importBtn = $('#import-btn');
exportBtn.replaceChildren(icon('download'), 'Download notes.xml');
importBtn.replaceChildren(icon('upload'), 'Import notes');

// ---------- export ----------
exportBtn.addEventListener('click', async () => {
  $('#export-status').textContent = 'Preparing your file...';
  try {
    const res = await fetch('/api/export/notes.xml', { headers: { 'X-Requested-With': 'StudyBuddy' }, credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not export your notes.');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'studybuddy-notes.xml' });
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    $('#export-status').textContent = 'Done. Your file studybuddy-notes.xml was downloaded.';
    toast('Notes exported.');
  } catch (err) { $('#export-status').textContent = ''; toast(err.message, 'error'); }
});

// ---------- import ----------
const fileInput = $('#xml-file');
let xmlText = '';

fileInput.addEventListener('change', async () => {
  xmlText = '';
  $('#preview').replaceChildren();
  setFieldError(fileInput, '');
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 1024 * 1024) { setFieldError(fileInput, 'This file is larger than 1 MB.'); return; }
  const text = await file.text();
  // Quick check in the browser: does it look like our notes file? (The server does the full XML validation.)
  // We avoid DOMParser here because the browser logs a CSP warning when it meets broken XML.
  const noteCount = (text.match(/<note[\s>]/g) || []).length;
  if (!/^\s*(<\?xml[^>]*\?>\s*)?<notes[\s>]/.test(text) || !noteCount) {
    setFieldError(fileInput, 'This does not look like a StudyBuddy notes file. It should start with <notes> and contain <note> elements.');
    return;
  }
  xmlText = text;
  const titles = [...text.matchAll(/<title>([\s\S]*?)<\/title>/g)].slice(0, 5)
    .map((m) => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() || '(no title)');
  $('#preview').replaceChildren(
    el('p', {}, el('strong', { text: `Found ${noteCount} note${noteCount === 1 ? '' : 's'}.` }), noteCount > 5 ? ' First five:' : ' Titles:'),
    el('ul', {}, titles.map((t) => el('li', { text: t }))));
});

$('#import-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#import-alert').textContent = '';
  if (!xmlText) { setFieldError(fileInput, 'Choose a valid XML file first.'); fileInput.focus(); return; }
  importBtn.disabled = true;
  try {
    const result = await api('/import/notes', { method: 'POST', xml: xmlText });
    toast(`Imported ${result.imported} note(s). ${result.skipped ? result.skipped + ' skipped because they were incomplete.' : ''}`);
    e.target.reset(); xmlText = ''; $('#preview').replaceChildren();
    $('#preview').textContent = `Import finished: ${result.imported} added, ${result.skipped} skipped. See them in the notes library.`;
  } catch (err) { $('#import-alert').textContent = err.message; }
  importBtn.disabled = false;
});
