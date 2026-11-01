// Features 5 and 8 (Member B): quiz maker, quiz taker and flashcards
const express = require('express');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const { clean, isId, isString, ok, fail } = require('../validate');

const router = express.Router();

// Quizzes with the last score for each
router.get('/', async (req, res, next) => {
  try {
    const user = req.session.userId;
    const quizzes = await Quiz.find({ user }).sort({ createdAt: -1 }).lean();
    const attempts = await Attempt.find({ user }).sort({ takenAt: -1 }).lean();
    ok(res, quizzes.map((q) => {
      const last = attempts.find((a) => String(a.quiz) === String(q._id));
      return {
        id: q._id, title: q.title, subject: q.subject, questionCount: q.questions.length,
        lastScore: last ? { score: last.score, total: last.total, takenAt: last.takenAt } : null
      };
    }));
  } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ user: req.session.userId })
      .populate('quiz', 'title').sort({ takenAt: -1 }).limit(20).lean();
    ok(res, attempts.map((a) => ({
      id: a._id, quizTitle: a.quiz ? a.quiz.title : 'Deleted quiz',
      score: a.score, total: a.total, takenAt: a.takenAt
    })));
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const title = clean(req.body.title, 100);
    const subject = clean(req.body.subject, 40);
    if (title.length < 2) return fail(res, 400, 'Quiz title must be at least 2 characters.');
    if (subject.length < 2) return fail(res, 400, 'Enter a subject for the quiz.');
    const raw = Array.isArray(req.body.questions) ? req.body.questions : [];
    if (raw.length < 1 || raw.length > 20) return fail(res, 400, 'Add between 1 and 20 questions.');

    const questions = [];
    for (let i = 0; i < raw.length; i++) {
      const q = raw[i] || {};
      const options = Array.isArray(q.options) ? q.options.map((o) => clean(o, 150)) : [];
      const correctIndex = Number(q.correctIndex);
      if (clean(q.question, 300).length < 3) return fail(res, 400, `Question ${i + 1} needs some text.`);
      if (options.length !== 4 || options.some((o) => !o)) return fail(res, 400, `Question ${i + 1} needs four answer options.`);
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return fail(res, 400, `Choose the correct answer for question ${i + 1}.`);
      questions.push({ question: clean(q.question, 300), options, correctIndex, explanation: clean(q.explanation, 300) });
    }
    const quiz = await Quiz.create({ user: req.session.userId, title, subject, questions });
    ok(res, { id: quiz._id }, 'Quiz saved.', 201);
  } catch (err) { next(err); }
});

// Quiz for taking: the correct answers are NOT sent
router.get('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid quiz id.');
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.userId }).lean();
    if (!quiz) return fail(res, 404, 'Quiz not found.');
    ok(res, {
      id: quiz._id, title: quiz.title, subject: quiz.subject,
      questions: quiz.questions.map((q) => ({ question: q.question, options: q.options }))
    });
  } catch (err) { next(err); }
});

// Flashcards: the question is the front, the correct answer is the back
router.get('/:id/cards', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid quiz id.');
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.userId }).lean();
    if (!quiz) return fail(res, 404, 'Quiz not found.');
    ok(res, {
      id: quiz._id, title: quiz.title, subject: quiz.subject,
      cards: quiz.questions.map((q) => ({
        front: q.question, back: q.options[q.correctIndex], note: q.explanation
      }))
    });
  } catch (err) { next(err); }
});

router.post('/:id/submit', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid quiz id.');
    const quiz = await Quiz.findOne({ _id: req.params.id, user: req.session.userId }).lean();
    if (!quiz) return fail(res, 404, 'Quiz not found.');
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    if (answers.length !== quiz.questions.length) return fail(res, 400, 'Answer every question before submitting.');

    let score = 0;
    const results = quiz.questions.map((q, i) => {
      const chosen = Number(answers[i]);
      const correct = chosen === q.correctIndex;
      if (correct) score++;
      return { question: q.question, options: q.options, chosen, correctIndex: q.correctIndex, correct, explanation: q.explanation };
    });
    await Attempt.create({ quiz: quiz._id, user: req.session.userId, score, total: quiz.questions.length });
    ok(res, { score, total: quiz.questions.length, results }, 'Quiz submitted.');
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return fail(res, 400, 'Invalid quiz id.');
    const deleted = await Quiz.findOneAndDelete({ _id: req.params.id, user: req.session.userId });
    if (!deleted) return fail(res, 404, 'Quiz not found.');
    await Attempt.deleteMany({ quiz: deleted._id, user: req.session.userId });
    ok(res, null, 'Quiz deleted.');
  } catch (err) { next(err); }
});

module.exports = router;
