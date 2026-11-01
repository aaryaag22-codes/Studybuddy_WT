// Feature 6 (Member B): XML export, XML import and a public RSS feed
const express = require('express');
const { XMLParser, XMLValidator } = require('fast-xml-parser');
const Note = require('../models/Note');
const User = require('../models/User');
const requireLogin = require('../middleware/auth');
const { clean, ok, fail } = require('../validate');

// Escape the five special XML characters so a note can never break the file
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  // remove characters that are not allowed in XML 1.0
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const apiRouter = express.Router();
const feedRouter = express.Router();

// Download your own notes as an XML file
apiRouter.get('/export/notes.xml', requireLogin, async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    const notes = await Note.find({ user: req.session.userId }).sort({ createdAt: -1 }).lean();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<notes owner="${esc(user.email)}" exported="${new Date().toISOString().slice(0, 10)}">\n`;
    for (const n of notes) {
      xml += '  <note>\n';
      xml += `    <title>${esc(n.title)}</title>\n`;
      xml += `    <subject>${esc(n.subject)}</subject>\n`;
      xml += `    <body>${esc(n.body)}</body>\n`;
      xml += `    <created>${n.createdAt.toISOString().slice(0, 10)}</created>\n`;
      xml += '  </note>\n';
    }
    xml += '</notes>\n';
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="studybuddy-notes.xml"');
    res.send(xml);
  } catch (err) { next(err); }
});

// Upload an XML file (sent as plain text body) and add its notes to your library
apiRouter.post('/import/notes', requireLogin,
  express.text({ type: ['application/xml', 'text/xml'], limit: '1mb' }),
  async (req, res, next) => {
    try {
      const text = typeof req.body === 'string' ? req.body : '';
      if (!text.trim()) return fail(res, 400, 'Choose an XML file to import.');
      const check = XMLValidator.validate(text);
      if (check !== true) return fail(res, 400, `This is not valid XML (line ${check.err.line}): ${check.err.msg}`);

      const parser = new XMLParser({
        parseTagValue: false, parseAttributeValue: false, trimValues: true,
        isArray: (name) => name === 'note'
      });
      const doc = parser.parse(text);
      const list = doc && doc.notes && doc.notes.note ? doc.notes.note : [];
      if (!list.length) return fail(res, 400, 'No <note> elements were found in this file.');
      if (list.length > 100) return fail(res, 400, 'You can import at most 100 notes at once.');

      let imported = 0;
      let skipped = 0;
      for (const item of list) {
        const title = clean(item && item.title, 120);
        const subject = clean(item && item.subject, 40);
        const body = clean(item && item.body, 5000);
        if (title.length < 2 || subject.length < 2 || body.length < 5) { skipped++; continue; }
        await Note.create({ user: req.session.userId, title, subject, body, shared: false });
        imported++;
      }
      ok(res, { imported, skipped }, `Imported ${imported} note(s), skipped ${skipped}.`, 201);
    } catch (err) { next(err); }
  });

// Public RSS feed of the newest SHARED notes (private notes never appear)
feedRouter.get('/feed.xml', async (req, res, next) => {
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    const notes = await Note.find({ shared: true }).populate('user', 'name')
      .sort({ createdAt: -1 }).limit(20).lean();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n';
    xml += '  <title>StudyBuddy shared notes</title>\n';
    xml += `  <link>${esc(base)}/notes.html</link>\n`;
    xml += '  <description>The newest notes shared by StudyBuddy students</description>\n';
    xml += '  <language>en</language>\n';
    for (const n of notes) {
      xml += '  <item>\n';
      xml += `    <title>${esc(n.title)} (${esc(n.subject)})</title>\n`;
      xml += `    <description>${esc(n.body.slice(0, 300))}</description>\n`;
      xml += `    <author>${esc(n.user ? n.user.name : 'A student')}</author>\n`;
      xml += `    <pubDate>${n.createdAt.toUTCString()}</pubDate>\n`;
      xml += `    <guid isPermaLink="false">${n._id}</guid>\n`;
      xml += '  </item>\n';
    }
    xml += '</channel>\n</rss>\n';
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(xml);
  } catch (err) { next(err); }
});

module.exports = { apiRouter, feedRouter };
