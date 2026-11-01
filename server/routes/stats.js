// Feature 3 (Member A): numbers for the dashboard
const express = require('express');
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Focus = require('../models/Focus');
const Attempt = require('../models/Attempt');
const Note = require('../models/Note');
const { ok } = require('../validate');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const user = req.session.userId;
    // The browser sends its time zone offset so "today" matches the student's day
    let tz = parseInt(req.query.tz, 10);
    if (!Number.isInteger(tz) || Math.abs(tz) > 840) tz = 0;
    const dayKey = (date) => new Date(date.getTime() - tz * 60000).toISOString().slice(0, 10);

    const [subjects, tasks, focus, attempts, notesCount] = await Promise.all([
      Subject.find({ user }).lean(),
      Task.find({ user }).lean(),
      Focus.find({ user }).lean(),
      Attempt.find({ user }).lean(),
      Note.countDocuments({ user })
    ]);

    // Tasks per subject (for the chart)
    const bySubject = subjects.map((s) => {
      const mine = tasks.filter((t) => t.subject && String(t.subject) === String(s._id));
      const done = mine.filter((t) => t.done).length;
      return { id: s._id, name: s.name, color: s.color, done, pending: mine.length - done };
    });
    const loose = tasks.filter((t) => !t.subject);
    if (loose.length) {
      const done = loose.filter((t) => t.done).length;
      bySubject.push({ id: null, name: 'No subject', color: '#64748b', done, pending: loose.length - done });
    }

    const todayKey = dayKey(new Date());
    const doneCount = tasks.filter((t) => t.done).length;
    const overdue = tasks.filter((t) => !t.done && t.dueDate && dayKey(t.dueDate) < todayKey).length;
    const upcoming = tasks
      .filter((t) => !t.done && t.dueDate)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5)
      .map((t) => ({
        id: t._id, title: t.title, dueDate: t.dueDate, priority: t.priority,
        subject: subjects.find((s) => String(s._id) === String(t.subject)) || null
      }));

    // Focus minutes for the last 7 days and the study streak
    const perDay = {};
    focus.forEach((f) => { const k = dayKey(f.at); perDay[k] = (perDay[k] || 0) + f.minutes; });
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * 86400000));
      week.push({ date: key, minutes: perDay[key] || 0 });
    }
    let streak = 0;
    for (let i = perDay[todayKey] ? 0 : 1; ; i++) {
      const key = dayKey(new Date(Date.now() - i * 86400000));
      if (perDay[key]) streak++; else break;
    }

    const quizPercent = attempts.length
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / attempts.length)
      : null;

    ok(res, {
      totals: { tasks: tasks.length, done: doneCount, pending: tasks.length - doneCount, overdue },
      bySubject,
      upcoming,
      focus: { todayMinutes: perDay[todayKey] || 0, weekMinutes: week.reduce((s, d) => s + d.minutes, 0), week, streak },
      quiz: { attempts: attempts.length, averagePercent: quizPercent },
      notes: notesCount
    });
  } catch (err) { next(err); }
});

module.exports = router;
