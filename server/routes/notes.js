// Feature 4 (Member B): notes library with search, filter and sharing
const express = require('express');
const Note = require('../models/Note');
const { clean, isId, isString, escapeRegex, ok, fail } = require('../validate');

const router = express.Router();

// Returns your own notes plus notes other students chose to share
router.get('/', async (req, res, next) => {
  try {
    const me = req.session.userId;
    const scope = req.query.scope;
    let filter;
    if (scope === 'mine') filter = { user: me };
    else if (scope === 'shared') filter = { shared: true, user: { $ne: me } };
    else filter = { $or: [{ user: me }, { shared: true }] };

    const and = [filter];
    if (isString(req.query.q) && req.query.q.trim()) {
      const rx = new RegExp(escapeRegex(req.query.q.trim().slice(0, 60)), 'i');
      and.push({ $or: [{ title: rx }, { body: rx }, { subject: rx }] });
    }
    if (isString(req.query.subject) && req.query.subject.trim()) {
      and.push({ subject: clean(req.query.subject, 40) });
    }
    const notes = await Note.find({ $and: and })
      .populate('user', 'name').sort({ createdAt: -1 }).limit(100).lean();

    ok(res, notes.map((n) => ({
      id: n._id, title: n.title, subject: n.subject, body: n.body, link: n.link,
      shared: n.shared, createdAt: n.createdAt,
      author: n.user ? n.user.name : 'Unknown',
      mine: n.user && String(n.user._id) === String(me)
    })));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const title = clean(req.body.title, 120);
    const subject = clean(req.body.subject, 40);
    const body = clean(req.body.body, 5000);
    const link = clean(req.body.link, 300);
    if (title.length < 2) return fail(res, 400, 'Title must be at least 2 characters.');
    if (subject.length < 2) return fail(res, 400, 'Enter a subject, for example DBMS.');
    if (body.length < 5) return fail(res, 400, 'The note text must be at least 5 characters.');
    if (link && !/^https?:\/\/\S+$/i.test(link)) return fail(res, 400, 'The link must start with http:// or https://.');
    const note = await Note.create({
      user: req.session.userId, title, subject, body, link, shared: req.body.shared === true
    });
    ok(res, { id: note._id }, 'Note saved.', 201);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid note id.');
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return fail(res, 404, 'Note not found, or it belongs to someone else.');
    ok(res, null, 'Note deleted.');
  } catch (err) { next(err); }
});

module.exports = router;
