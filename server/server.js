// StudyBuddy server: Express + MongoDB (Mongoose) + sessions
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo').default; // connect-mongo v6 exports it as .default
const connectDB = require('./db');
const requireLogin = require('./middleware/auth');
const { fail } = require('./validate');
const { apiRouter: xmlApi, feedRouter } = require('./routes/xml');

const isProd = process.env.NODE_ENV === 'production';
const app = express();
app.set('trust proxy', 1); // needed on Render so secure cookies work behind the proxy

// Security headers. The CSP only allows our own files (no outside scripts).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  }
}));

// Slows down password guessing: only the login and register routes are limited
// (checking "who is logged in" on every page must stay unlimited).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: isProd ? 30 : 500, standardHeaders: true, legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many attempts. Try again in a few minutes.' }
});
app.use(['/api/auth/login', '/api/auth/register'], authLimiter);

async function start() {
  const uri = await connectDB();
  const secret = process.env.SESSION_SECRET;
  if (!secret && isProd) throw new Error('SESSION_SECRET must be set in production.');

  app.use(session({
    name: 'sb.sid',
    secret: secret || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
    // Old sessions are removed automatically (a TTL index). Real MongoDB and Atlas support this.
    // SESSION_AUTOREMOVE=off is only for MongoDB look-alikes that lack TTL indexes (used in testing).
    store: MongoStore.create({
      mongoUrl: uri, collectionName: 'sessions', ttl: 7 * 24 * 60 * 60,
      autoRemove: process.env.SESSION_AUTOREMOVE === 'off' ? 'disabled' : 'native'
    }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 }
  }));

  // Public RSS feed (XML)
  app.use(feedRouter);

  // JSON API
  const api = express.Router();
  api.use((req, res, next) => {
    // CSRF protection: browsers cannot add this header on a cross-site form post
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Requested-With') !== 'StudyBuddy') {
      return fail(res, 403, 'Missing request header.');
    }
    next();
  });
  api.use(xmlApi); // XML import/export (own body parser for text/xml)
  api.use(express.json({ limit: '100kb' }));
  api.use('/auth', require('./routes/auth'));
  api.use('/subjects', requireLogin, require('./routes/subjects'));
  api.use('/tasks', requireLogin, require('./routes/tasks'));
  api.use('/stats', requireLogin, require('./routes/stats'));
  api.use('/focus', requireLogin, require('./routes/focus'));
  api.use('/notes', requireLogin, require('./routes/notes'));
  api.use('/quizzes', requireLogin, require('./routes/quizzes'));
  api.use((req, res) => fail(res, 404, 'API route not found.'));
  app.use('/api', api);

  // The website itself (HTML, CSS, JavaScript)
  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

  // Friendly 404 page for browsers, JSON for everything else
  app.use((req, res) => {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
    }
    fail(res, 404, 'Not found.');
  });

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return fail(res, 400, 'The request body is not valid JSON.');
    if (err.type === 'entity.too.large') return fail(res, 413, 'The request is too large.');
    console.error(err);
    fail(res, 500, 'Something went wrong on the server.');
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`StudyBuddy running at http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Could not start StudyBuddy:', err.message);
  process.exit(1);
});
