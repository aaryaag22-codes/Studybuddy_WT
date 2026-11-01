// Feature 1 (Member A): log in
import { $ } from './dom.js';
import { initPage } from './layout.js';
import { api, setFieldError } from './api.js';

await initPage();

const form = $('#login-form');
const alertBox = $('#form-alert');
const email = $('#email');
const password = $('#password');

$('#show-password').addEventListener('change', (e) => { password.type = e.target.checked ? 'text' : 'password'; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.textContent = '';
  setFieldError(email, '');
  setFieldError(password, '');

  // 1. check the fields in the browser first
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    setFieldError(email, 'Enter a valid email address, for example riya@college.edu.');
    email.focus();
    return;
  }
  if (!password.value) {
    setFieldError(password, 'Enter your password.');
    password.focus();
    return;
  }

  // 2. send them to the server
  const button = $('#submit-btn');
  button.disabled = true;
  button.textContent = 'Logging in...';
  try {
    await api('/auth/login', { method: 'POST', body: { email: email.value.trim(), password: password.value } });
    const next = new URLSearchParams(location.search).get('next');
    location.href = next && /^[a-z0-9-]+\.html$/.test(next) ? next : 'dashboard.html';
  } catch (err) {
    alertBox.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Log in';
    password.focus();
  }
});
