// All talking to the server goes through this file.
// The server always answers { success, data, message }.
import { el } from './dom.js';

export async function api(path, { method = 'GET', body, xml } = {}) {
  const headers = { 'X-Requested-With': 'StudyBuddy' }; // CSRF protection header
  let payload;
  if (xml !== undefined) { headers['Content-Type'] = 'application/xml'; payload = xml; }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Cannot reach the server. Check your internet connection.', 0);
  }
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !json || json.success === false) {
    const message = (json && json.message) || 'Something went wrong. Please try again.';
    throw new ApiError(message, res.status);
  }
  return json.data;
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// Message that screen readers announce (polite) without moving focus
export function toast(message, type = 'success') {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = el('div', { id: 'toast-region', class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  const node = el('div', { class: type === 'error' ? 'toast toast-error' : 'toast', text: message });
  region.append(node);
  setTimeout(() => node.remove(), 5000);
}

// Shows an error in text next to a form field (never colour only)
export function setFieldError(input, message) {
  const err = document.getElementById(input.id + '-error');
  if (err) err.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}
