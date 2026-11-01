// Feature 1 (Member A): create an account
import { $ } from './dom.js';
import { initPage } from './layout.js';
import { api, setFieldError } from './api.js';

await initPage();

const form = $('#register-form');
const alertBox = $('#form-alert');
const fields = { name: $('#name'), email: $('#email'), password: $('#password'), confirm: $('#confirm') };

$('#show-password').addEventListener('change', (e) => {
  fields.password.type = fields.confirm.type = e.target.checked ? 'text' : 'password';
});

function validate() {
  const { name, email, password, confirm } = fields;
  Object.values(fields).forEach((f) => setFieldError(f, ''));
  if (name.value.trim().length < 2) { setFieldError(name, 'Enter your name (at least 2 characters).'); return name; }
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { setFieldError(email, 'Enter a valid email address, for example riya@college.edu.'); return email; }
  if (password.value.length < 8) { setFieldError(password, 'The password must be at least 8 characters long.'); return password; }
  if (!/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) { setFieldError(password, 'The password needs at least one letter and one number.'); return password; }
  if (confirm.value !== password.value) { setFieldError(confirm, 'The two passwords do not match.'); return confirm; }
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.textContent = '';
  const bad = validate();
  if (bad) { bad.focus(); return; }
  const button = $('#submit-btn');
  button.disabled = true;
  button.textContent = 'Creating account...';
  try {
    await api('/auth/register', { method: 'POST', body: {
      name: fields.name.value.trim(), email: fields.email.value.trim(), password: fields.password.value } });
    location.href = 'dashboard.html';
  } catch (err) {
    alertBox.textContent = err.message;
    button.disabled = false;
    button.textContent = 'Create account';
  }
});
