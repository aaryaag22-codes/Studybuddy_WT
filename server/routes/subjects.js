// Feature 2 (Member A): subjects used by the planner, timer and notes
const express = require('express');
const Subject = require('../models/Subject');
const Task = require('../models/Task');
const { clean, isId, isHex, ok, fail } = require('../validate');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const subjects = await Subject.find({ user: req.session.userId }).sort({ name: 1 }).lean();
    ok(res, subjects);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const name = clean(req.body.name, 40);
    const color = isHex(req.body.color) ? req.body.color : '#6366f1';
    if (name.length < 2) return fail(res, 400, 'Subject name must be at least 2 characters.');
    const subject = await Subject.create({ user: req.session.userId, name, color });
    ok(res, subject, 'Subject added.', 201);
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, 'You already have a subject with that name.');
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid subject id.');
    const deleted = await Subject.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return fail(res, 404, 'Subject not found.');
    await Task.updateMany({ user: req.session.userId, subject: deleted._id }, { subject: null });
    ok(res, null, 'Subject deleted.');
  } catch (err) { next(err); }
});

module.exports = router;
