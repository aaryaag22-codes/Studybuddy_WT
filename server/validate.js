// Small input helpers. Every value from req.body is checked to be a plain
// string/number BEFORE it reaches a Mongoose query. This blocks NoSQL injection
// such as { "email": { "$ne": "" } }.
const mongoose = require('mongoose');

const isString = (v) => typeof v === 'string';
const clean = (v, max = 200) => (isString(v) ? v.trim().slice(0, max) : '');
const isId = (v) => isString(v) && mongoose.isValidObjectId(v) && /^[a-f0-9]{24}$/i.test(v);
const isEmail = (v) => isString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120;
const isHex = (v) => isString(v) && /^#[0-9a-fA-F]{6}$/.test(v);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Sends the standard response shape { success, data, message }
const ok = (res, data = null, message = '', status = 200) =>
  res.status(status).json({ success: true, data, message });
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, message });

module.exports = { isString, clean, isId, isEmail, isHex, escapeRegex, ok, fail };
