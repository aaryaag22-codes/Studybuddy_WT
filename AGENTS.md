# Project rules for AI coding agents (Antigravity, Claude Code, Copilot, etc.)

These rules are always on. Follow them for every change in this repository.

## What this project is
StudyBuddy is a B.Tech full stack web development project built by a team of two students.
It is graded on the professor's checklist: semantic HTML, readable text, alt text, labelled forms,
text error messages and keyboard access, checked with the WAVE browser extension.
Read `docs/BUILD_GUIDE.md` before changing anything.

## Stack (do not change without asking the user)
- Frontend: plain HTML5, CSS3 and vanilla JavaScript (ES modules) in `public/`. No React, no Tailwind, no build step.
- Backend: Node.js + Express in `server/`. Database: MongoDB through Mongoose. XML: `fast-xml-parser`.
- Do not add a framework, a CDN script or a web font. Everything is served from this site (the Content Security Policy allows `'self'` only).

## Accessibility rules (WAVE and axe must report zero errors)
1. Every page: `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with charset, viewport and a unique `<title>`, then `<body>`.
2. Use landmarks: `<header>`, `<nav aria-label>`, `<main id="main">`, `<footer>`, and a skip link as the first element.
3. Exactly one `<h1>` per page; headings go h1, h2, h3 with no skipped levels.
4. Text contrast at least 4.5:1 (3:1 for large text and UI borders). Use the colour variables in `public/css/style.css`; never hard-code new colours without checking contrast.
5. Body text at least 16px with `line-height` 1.6. No ALL CAPS text, no blinking, no auto-moving text.
6. Every content image has useful `alt`; decorative images and icons use `alt=""` or `aria-hidden="true"`.
7. Every form control has a visible `<label>`. Placeholders are hints only (this project uses none).
8. Errors are written in words next to the field (`<p class="error" role="alert">`), never colour only. Required fields are marked with `*` and explained at the top of the form.
9. Everything must work with the keyboard (Tab, Shift+Tab, Enter, Space, Esc) with a visible focus ring.
10. Respect the theme, text size and reduce-motion settings (`data-theme`, `data-text`, `data-motion` on `<html>`).
11. No inline `style="..."` attributes and no inline `<script>` (the Content Security Policy blocks them). Use CSS classes, or `element.style.setProperty` from JavaScript.

## Code rules
- API answers always use `{ success, data, message }`. Validate every input on the server (`server/validate.js`) before it reaches a Mongoose query, to stop NoSQL injection.
- Use `textContent` or the `el()` helper in `public/js/dom.js` for user text. Never use `innerHTML` with user data.
- Keep functions short and comment the non-obvious lines in simple English. This is a student project: readable beats clever.
- Never commit `.env`, passwords, connection strings or API keys. Never print secrets in logs or chat.

## Before you say a task is finished
1. `npm test` passes (needs MongoDB running).
2. `npm run validate:html` reports no errors.
3. `npm run audit` reports `0 problem(s)` (start the server first with `npm run dev`).
4. If the browser tool is available and the WAVE extension is installed, open the changed pages and confirm WAVE shows 0 Errors and 0 Contrast Errors.
5. Tell the user exactly which files changed and how to see the change.

## Deployment rules
- Never deploy, create a GitHub repository, push code, or create a hosting account without the user's explicit yes in this conversation.
- Deployment target: Render (see `render.yaml`) with MongoDB Atlas. Ask the user to paste secrets into the Render dashboard themselves.
