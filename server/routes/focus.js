// Feature 7 (Member A): focus timer sessions (Pomodoro)
const express = require('express');
const Focus = require('../models/Focus');
const { clean, ok, fail } = require('../validate');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const minutes = Number(req.body.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      return fail(res, 400, 'Minutes must be a whole number from 1 to 180.');
    }
    const session = await Focus.create({
      user: req.session.userId, minutes, subject: clean(req.body.subject, 40)
    });
    ok(res, session, 'Focus session saved.', 201);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const sessions = await Focus.find({ user: req.session.userId }).sort({ at: -1 }).limit(10).lean();
    ok(res, sessions);
  } catch (err) { next(err); }
});

module.exports = router;
