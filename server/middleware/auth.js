// Blocks the request unless the user has logged in (session cookie)
const { fail } = require('../validate');

module.exports = function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return fail(res, 401, 'Please log in to continue.');
  }
  next();
};
