// Feature 2 (Member A): task planner (create, read, update, delete)
const express = require('express');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const { clean, isId, isString, ok, fail } = require('../validate');

const router = express.Router();
const PRIORITIES = ['low', 'medium', 'high'];

// Turns "2026-11-20" into a Date; returns null for empty, undefined for invalid
function parseDate(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (!isString(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(v + 'T00:00:00.000Z');
  return Number.isNaN(d.getTime()) ? undefined : d;
}

async function subjectIdFor(userId, value) {
  if (value === '' || value === null || value === undefined) return null;
  if (!isId(value)) return undefined;
  const found = await Subject.findOne({ _id: value, user: userId }).select('_id');
  return found ? found._id : undefined;
}

router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.session.userId };
    if (isId(req.query.subject)) filter.subject = req.query.subject;
    if (req.query.status === 'done') filter.done = true;
    if (req.query.status === 'pending') filter.done = false;
    const tasks = await Task.find(filter)
      .populate('subject', 'name color')
      .sort({ done: 1, dueDate: 1, createdAt: -1 })
      .lean();
    ok(res, tasks);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const title = clean(req.body.title, 120);
    const dueDate = parseDate(req.body.dueDate);
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'medium';
    if (title.length < 2) return fail(res, 400, 'Task title must be at least 2 characters.');
    if (dueDate === undefined) return fail(res, 400, 'Due date must look like 2026-11-20.');
    const subject = await subjectIdFor(req.session.userId, req.body.subject);
    if (subject === undefined) return fail(res, 400, 'Choose one of your own subjects.');
    const task = await Task.create({ user: req.session.userId, title, dueDate, priority, subject });
    const full = await Task.findById(task._id).populate('subject', 'name color').lean();
    ok(res, full, 'Task added.', 201);
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid task id.');
    const update = {};
    if (req.body.title !== undefined) {
      update.title = clean(req.body.title, 120);
      if (update.title.length < 2) return fail(res, 400, 'Task title must be at least 2 characters.');
    }
    if (req.body.done !== undefined) update.done = req.body.done === true;
    if (req.body.priority !== undefined) {
      if (!PRIORITIES.includes(req.body.priority)) return fail(res, 400, 'Priority must be low, medium or high.');
      update.priority = req.body.priority;
    }
    if (req.body.dueDate !== undefined) {
      const d = parseDate(req.body.dueDate);
      if (d === undefined) return fail(res, 400, 'Due date must look like 2026-11-20.');
      update.dueDate = d;
    }
    if (req.body.subject !== undefined) {
      const s = await subjectIdFor(req.session.userId, req.body.subject);
      if (s === undefined) return fail(res, 400, 'Choose one of your own subjects.');
      update.subject = s;
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId }, update, { returnDocument: 'after' }
    ).populate('subject', 'name color').lean();
    if (!task) return fail(res, 404, 'Task not found.');
    ok(res, task, 'Task updated.');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid task id.');
    const deleted = await Task.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return fail(res, 404, 'Task not found.');
    ok(res, null, 'Task deleted.');
  } catch (err) { next(err); }
});

module.exports = router;
