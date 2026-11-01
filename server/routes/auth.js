// Feature 1 (Member A): register, login, logout, current user
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { clean, isString, isEmail, ok, fail } = require('../validate');

const router = express.Router();

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

router.post('/register', async (req, res, next) => {
  try {
    const name = clean(req.body.name, 60);
    const email = clean(req.body.email, 120).toLowerCase();
    const password = isString(req.body.password) ? req.body.password : '';

    if (name.length < 2) return fail(res, 400, 'Name must be at least 2 characters.');
    if (!isEmail(email)) return fail(res, 400, 'Enter a valid email address.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return fail(res, 400, 'Password must be at least 8 characters and contain a letter and a number.');
    }
    if (await User.findOne({ email })) {
      return fail(res, 409, 'An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = String(user._id);
      ok(res, publicUser(user), 'Account created.', 201);
    });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = clean(req.body.email, 120).toLowerCase();
    const password = isString(req.body.password) ? req.body.password : '';
    if (!isEmail(email) || !password) return fail(res, 400, 'Enter your email and password.');

    const user = await User.findOne({ email });
    const match = user && (await bcrypt.compare(password, user.passwordHash));
    if (!match) return fail(res, 401, 'Email or password is incorrect.');

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = String(user._id);
      ok(res, publicUser(user), 'Logged in.');
    });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('sb.sid');
    ok(res, null, 'Logged out.');
  });
});

// Used by every page to ask "who is logged in?". Answers 200 with data: null for visitors,
// so the browser console stays free of red 401 errors on public pages.
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId) return ok(res, null, 'Not logged in.');
    const user = await User.findById(req.session.userId);
    ok(res, user ? publicUser(user) : null);
  } catch (err) { next(err); }
});

module.exports = router;
