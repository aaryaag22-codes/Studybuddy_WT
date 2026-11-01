// Automated API test.  Needs MongoDB running.  Run:  npm test
// It starts the server on port 3999 with a throw-away database called studybuddy_test.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

// A tiny "browser": keeps the session cookie between requests
function client() {
  let cookie = '';
  return async (method, url, body, extra = {}) => {
    const headers = { 'X-Requested-With': 'StudyBuddy', ...(extra.headers || {}) };
    if (cookie) headers.Cookie = cookie;
    let payload;
    if (body !== undefined) {
      if (extra.raw) payload = body; else { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    }
    const res = await fetch(BASE + url, { method, headers, body: payload });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON (XML) */ }
    return { status: res.status, json, text, headers: res.headers };
  };
}

before(async () => {
  // start from an empty database (before the server starts, so its indexes are created fresh)
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/studybuddy_test');
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server = spawn('node', [path.join(__dirname, '..', 'server', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), MONGODB_URI: (process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/studybuddy_test'), SESSION_SECRET: 'test', SESSION_AUTOREMOVE: process.env.SESSION_AUTOREMOVE || 'native' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => { if (String(d).includes('running')) resolve(); });
    server.on('exit', () => reject(new Error('server exited early')));
    setTimeout(() => reject(new Error('server did not start')), 15000);
  });
});
after(() => server && server.kill());

test('auth: validation, register, duplicate, login, me, logout', async () => {
  const a = client();
  let r = await a('POST', '/api/auth/register', { name: 'T', email: 'bad', password: '1' });
  assert.equal(r.status, 400);
  r = await a('POST', '/api/auth/register', { name: 'Test User', email: 'Test@Example.com', password: 'Passw0rd!' });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.email, 'test@example.com');
  assert.equal(r.json.data.passwordHash, undefined);
  r = await a('GET', '/api/auth/me');
  assert.equal(r.status, 200);
  r = await a('POST', '/api/auth/register', { name: 'Test User', email: 'test@example.com', password: 'Passw0rd!' });
  assert.equal(r.status, 409);
  r = await a('POST', '/api/auth/logout', {});
  assert.equal(r.status, 200);
  r = await a('GET', '/api/auth/me');
  assert.equal(r.status, 200);
  assert.equal(r.json.data, null); // logged out: no user
  r = await a('POST', '/api/auth/login', { email: 'test@example.com', password: 'wrong' });
  assert.equal(r.status, 401);
  r = await a('POST', '/api/auth/login', { email: 'test@example.com', password: 'Passw0rd!' });
  assert.equal(r.status, 200);
});

test('security: NoSQL injection and missing CSRF header are rejected', async () => {
  const a = client();
  let r = await a('POST', '/api/auth/login', { email: { $ne: '' }, password: { $ne: '' } });
  assert.equal(r.status, 400);
  r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
  r = await a('GET', '/api/tasks');
  assert.equal(r.status, 401);
  r = await fetch(BASE + '/');
  assert.ok(r.headers.get('content-security-policy').includes("script-src 'self'"));
});

test('planner: subjects and tasks (create, filter, update, delete)', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { name: 'Planner One', email: 'p1@example.com', password: 'Passw0rd!' });
  let r = await a('POST', '/api/subjects', { name: 'DBMS', color: '#4338ca' });
  assert.equal(r.status, 201);
  const subj = r.json.data._id;
  r = await a('POST', '/api/subjects', { name: 'DBMS', color: '#4338ca' });
  assert.equal(r.status, 409);
  r = await a('POST', '/api/tasks', { title: 'Revise joins', subject: subj, dueDate: '2026-12-01', priority: 'high' });
  assert.equal(r.status, 201);
  const id = r.json.data._id;
  r = await a('POST', '/api/tasks', { title: 'x', subject: subj });
  assert.equal(r.status, 400);
  r = await a('POST', '/api/tasks', { title: 'Bad date', dueDate: '01/12/2026' });
  assert.equal(r.status, 400);
  r = await a('PUT', `/api/tasks/${id}`, { done: true });
  assert.equal(r.json.data.done, true);
  r = await a('GET', `/api/tasks?subject=${subj}&status=done`);
  assert.equal(r.json.data.length, 1);
  r = await a('GET', '/api/tasks?status=pending');
  assert.equal(r.json.data.length, 0);
  // another user cannot touch it
  const b = client();
  await b('POST', '/api/auth/register', { name: 'Planner Two', email: 'p2@example.com', password: 'Passw0rd!' });
  r = await b('DELETE', `/api/tasks/${id}`);
  assert.equal(r.status, 404);
  r = await a('DELETE', `/api/tasks/${id}`);
  assert.equal(r.status, 200);
});

test('focus timer and dashboard stats', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { name: 'Focus User', email: 'f1@example.com', password: 'Passw0rd!' });
  let r = await a('POST', '/api/focus', { minutes: 0 });
  assert.equal(r.status, 400);
  r = await a('POST', '/api/focus', { minutes: 25, subject: 'DBMS' });
  assert.equal(r.status, 201);
  r = await a('GET', '/api/stats?tz=-330');
  assert.equal(r.status, 200);
  assert.equal(r.json.data.focus.todayMinutes, 25);
  assert.equal(r.json.data.focus.week.length, 7);
  assert.equal(r.json.data.focus.streak, 1);
});

test('notes: create, share, search, delete own only', async () => {
  const a = client();
  const b = client();
  await a('POST', '/api/auth/register', { name: 'Note A', email: 'na@example.com', password: 'Passw0rd!' });
  await b('POST', '/api/auth/register', { name: 'Note B', email: 'nb@example.com', password: 'Passw0rd!' });
  let r = await a('POST', '/api/notes', { title: 'Shared joins', subject: 'DBMS', body: 'Inner join returns matching rows', shared: true });
  assert.equal(r.status, 201);
  const sharedId = r.json.data.id;
  await a('POST', '/api/notes', { title: 'Private secret', subject: 'DBMS', body: 'Only for me please' });
  r = await b('GET', '/api/notes?q=inner');
  assert.equal(r.json.data.length, 1);
  assert.equal(r.json.data[0].author, 'Note A');
  r = await b('GET', '/api/notes?q=secret');
  assert.equal(r.json.data.length, 0);
  r = await b('DELETE', `/api/notes/${sharedId}`);
  assert.equal(r.status, 404);
  r = await a('POST', '/api/notes', { title: 'Bad link', subject: 'DBMS', body: 'hello world', link: 'javascript:alert(1)' });
  assert.equal(r.status, 400);
  r = await a('GET', '/api/notes?q=.*');
  assert.equal(r.status, 200); // regex characters are escaped, not executed
  r = await a('DELETE', `/api/notes/${sharedId}`);
  assert.equal(r.status, 200);
});

test('quiz: create, take (answers hidden), score, flashcards, history', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { name: 'Quiz User', email: 'q1@example.com', password: 'Passw0rd!' });
  const questions = [
    { question: 'Capital of France?', options: ['Paris', 'Rome', 'Oslo', 'Bern'], correctIndex: 0, explanation: 'Paris.' },
    { question: 'Two plus two?', options: ['3', '4', '5', '6'], correctIndex: 1 }
  ];
  let r = await a('POST', '/api/quizzes', { title: 'Mini quiz', subject: 'General', questions: [{ question: 'x', options: ['a'], correctIndex: 0 }] });
  assert.equal(r.status, 400);
  r = await a('POST', '/api/quizzes', { title: 'Mini quiz', subject: 'General', questions });
  assert.equal(r.status, 201);
  const id = r.json.data.id;
  r = await a('GET', `/api/quizzes/${id}`);
  assert.equal(r.json.data.questions.length, 2);
  assert.equal(r.json.data.questions[0].correctIndex, undefined);
  r = await a('POST', `/api/quizzes/${id}/submit`, { answers: [0] });
  assert.equal(r.status, 400);
  r = await a('POST', `/api/quizzes/${id}/submit`, { answers: [0, 2] });
  assert.equal(r.json.data.score, 1);
  assert.equal(r.json.data.results[1].correctIndex, 1);
  r = await a('GET', `/api/quizzes/${id}/cards`);
  assert.equal(r.json.data.cards[0].back, 'Paris');
  r = await a('GET', '/api/quizzes');
  assert.deepEqual(r.json.data[0].lastScore.score, 1);
  r = await a('GET', '/api/quizzes/history');
  assert.equal(r.json.data.length, 1);
});

test('XML: export, import (valid, invalid, special characters) and public RSS feed', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { name: 'Xml User', email: 'x1@example.com', password: 'Passw0rd!' });
  await a('POST', '/api/notes', { title: 'Cats & dogs <3', subject: 'Biology', body: 'Tom & Jerry "quote" <b>bold</b>', shared: true });
  await a('POST', '/api/notes', { title: 'Hidden note', subject: 'Biology', body: 'This stays private' });
  let r = await a('GET', '/api/export/notes.xml');
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-type').includes('application/xml'));
  assert.ok(r.text.includes('Cats &amp; dogs &lt;3'));
  const exported = r.text;
  r = await a('POST', '/api/import/notes', exported, { raw: true, headers: { 'Content-Type': 'application/xml' } });
  assert.equal(r.status, 201);
  assert.equal(r.json.data.imported, 2);
  r = await a('POST', '/api/import/notes', '<notes><note><title>x', { raw: true, headers: { 'Content-Type': 'application/xml' } });
  assert.equal(r.status, 400);
  r = await a('POST', '/api/import/notes', '<notes><note><title>A</title></note></notes>', { raw: true, headers: { 'Content-Type': 'application/xml' } });
  assert.equal(r.json.data.skipped, 1);
  r = await fetch(BASE + '/feed.xml');
  const feed = await r.text();
  assert.ok(r.headers.get('content-type').includes('application/rss+xml'));
  assert.ok(feed.includes('Cats &amp; dogs'));
  assert.ok(!feed.includes('Hidden note'));
});

test('static site is served', async () => {
  const res = await fetch(BASE + '/');
  assert.equal(res.status, 200);
  const res2 = await fetch(BASE + '/api/nope', { headers: { 'X-Requested-With': 'StudyBuddy' } });
  assert.equal(res2.status, 404);
});
