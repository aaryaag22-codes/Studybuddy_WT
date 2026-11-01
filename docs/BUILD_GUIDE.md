# StudyBuddy: Full Build Guide

For a team of two third-year B.Tech students. Read this once together, then use it as your reference while building, testing, writing the report and preparing for the viva.

**Stack:** HTML5, CSS3, vanilla JavaScript, XML, Node.js + Express, MongoDB (Mongoose).

---

## 1. What the professor asked for, and where you meet each point

| Guideline | How StudyBuddy meets it |
|---|---|
| Team of two | Member A and Member B, with separate features and separate files (section 3) |
| Max marks 5 | Marks are split across features, UI quality, accessibility and report |
| Latest technology allowed | Node.js 18+, ES modules, CSS variables and Grid, native `<dialog>`, MongoDB Atlas |
| Full stack | Frontend in `public/`, backend in `server/`, database in MongoDB |
| At least 6 features, each member demonstrates 2 | 8 features plus a shared display-settings panel (section 3) |
| HTML, CSS, JavaScript, XML | All four are used; XML is a real feature (export, import, RSS feed) |
| GitHub link | Section 12 |
| Report with screenshots and division of work | Section 13; screenshots are generated for you in `docs/screenshots/` |
| Evaluation sheet (structure, readability, images, labels, errors, keyboard) | Section 7 maps every row to what is in the code and how to prove it |
| WAVE extension approval | Section 8 |

---

## 2. Run it on your computer (10 minutes)

1. Install **Node.js 18+** (nodejs.org) and **VS Code**.
2. Get a database. Pick one:
   - **MongoDB Atlas (recommended):** create a free account at mongodb.com/atlas, create a free M0 cluster, create a database user, under *Network Access* add your IP address, then click *Connect, Drivers* and copy the connection string.
   - **Docker:** run `docker compose up -d` in the project folder, then use `mongodb://127.0.0.1:27017/studybuddy`.
3. Open the project folder in VS Code. Open the terminal (Ctrl + `) and run:
   ```bash
   npm install
   cp .env.example .env        # Windows PowerShell: copy .env.example .env
   ```
4. Open `.env`. Paste your connection string after `MONGODB_URI=`. Make a secret and paste it after `SESSION_SECRET=`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Add demo data and start:
   ```bash
   npm run seed
   npm run dev
   ```
6. Open <http://localhost:3000>. Log in with `demo@studybuddy.dev` / `Demo@1234`.

Press **F5** in VS Code to run with the debugger (a launch configuration is included).

---

## 3. Features and division of work

Each member builds their features end to end: database model, API route, HTML page, CSS and JavaScript.

| # | Feature | Owner | Files |
|---|---|---|---|
| 1 | Register, log in, log out | **A** | `server/routes/auth.js`, `models/User.js`, `public/login.html`, `register.html`, `js/login.js`, `js/register.js` |
| 2 | Planner (subjects and tasks) | **A** | `routes/subjects.js`, `routes/tasks.js`, `models/Subject.js`, `Task.js`, `public/planner.html`, `js/planner.js` |
| 3 | Dashboard (cards, ring, chart) | **A** | `routes/stats.js`, `public/dashboard.html`, `js/dashboard.js`, `js/charts.js` |
| 4 | Focus timer | **A** | `routes/focus.js`, `models/Focus.js`, `public/focus.html`, `js/focus.js` |
| 5 | Notes library with sharing | **B** | `routes/notes.js`, `models/Note.js`, `public/notes.html`, `js/notes.js` |
| 6 | Quiz maker and taker | **B** | `routes/quizzes.js`, `models/Quiz.js`, `Attempt.js`, `public/quizzes.html`, `quiz-take.html`, `js/quizzes.js`, `js/quiz-take.js` |
| 7 | Flashcards | **B** | `public/flashcards.html`, `js/flashcards.js`, `GET /api/quizzes/:id/cards` |
| 8 | XML tools (export, import, RSS) | **B** | `routes/xml.js`, `public/xml.html`, `js/xml.js` |
| + | Display settings (themes, text size, motion) | Both | `js/theme.js`, `js/layout.js`, theme tokens in `css/style.css` |

**Shared work (do together in week 1):** `css/style.css`, `js/layout.js`, `js/api.js`, `js/dom.js`, home page, README, GitHub setup.

**Suggested demo split (2 features each):**
- Member A demonstrates **Planner** and **Focus timer** (and shows the Dashboard updating afterwards).
- Member B demonstrates **Quizzes with Flashcards** and **Notes with XML export/import**.

---

## 4. How the pieces fit together

```text
Browser (HTML + CSS + JS)  --fetch JSON-->  Express routes  --Mongoose-->  MongoDB
        ^                                        |
        |------------ JSON { success, data, message } ------------|
```

**One request, step by step (use this in the report):** the student presses *Add task* in `planner.html`. `planner.js` checks the fields, then `api.js` sends `POST /api/tasks` with the session cookie and a `X-Requested-With` header. In `server.js` the request passes the CSRF header check, the JSON parser and `requireLogin`. `routes/tasks.js` validates every value, saves a `Task` with Mongoose, and answers `{ success: true, data: task }`. `planner.js` redraws the list and shows a toast message that screen readers announce.

---

## 5. File by file

### Backend (`server/`)

| File | What it does |
|---|---|
| `server.js` | Starts Express. Adds security headers (Helmet and a Content Security Policy), rate limiting for login, sessions stored in MongoDB, the CSRF header check, all routes, static files, a 404 page and one error handler |
| `db.js` | Connects Mongoose to `MONGODB_URI` |
| `validate.js` | Helpers: `clean()` trims strings, `isId()` checks ObjectIds, `ok()` and `fail()` send the standard response. Every input is checked to be a plain string first, which stops NoSQL injection |
| `middleware/auth.js` | `requireLogin`: answers 401 if there is no session |
| `models/*.js` | One Mongoose schema per collection (section 6) |
| `routes/auth.js` | Register (bcrypt hash), login, logout, `me`. A new session id is created on login (prevents session fixation) |
| `routes/subjects.js`, `tasks.js` | CRUD for the planner. Only your own records can be read, changed or deleted |
| `routes/stats.js` | Builds all dashboard numbers: totals, tasks per subject, upcoming, 7-day focus minutes, streak, quiz average. Uses the browser's time zone for "today" |
| `routes/focus.js` | Saves finished focus sessions |
| `routes/notes.js` | Notes CRUD, search with escaped regex, own plus shared notes |
| `routes/quizzes.js` | Quiz CRUD. The quiz sent for taking has **no correct answers**; marking happens on the server |
| `routes/xml.js` | XML export (escapes special characters), XML import (validates, parses, limits size), RSS feed of shared notes only |

### Frontend (`public/`)

| File | What it does |
|---|---|
| `*.html` | One page each. Static structure: skip link, `header`, `main`, `footer`, headings, forms with labels |
| `css/style.css` | The whole design system: colour tokens for 3 themes, typography, layout, components, responsive rules, focus styles, reduce-motion rules |
| `js/theme.js` | Runs before the page is drawn and applies the saved theme, so there is no flash |
| `js/layout.js` | Builds the header, navigation, footer and the Display settings dialog; checks login and redirects protected pages |
| `js/api.js` | The only place that calls the server; also toast messages and field errors |
| `js/dom.js` | `el()` builds elements safely with `textContent`, so user text can never run as code |
| `js/icons.js` | Inline SVG icons (all decorative, always next to text) |
| `js/charts.js` | SVG progress ring and bar chart, plus a text table for each chart |
| `js/ui.js` | Confirmation dialog on the native `<dialog>` element, empty-state block |
| `js/<page>.js` | The logic of each page |

### Scripts (`scripts/`)

`seed.js` (demo data), `api.test.js` (8 automated tests), `a11y-audit.js` (accessibility audit with screenshots).

---

## 6. Database (MongoDB collections)

| Collection | Fields | Notes |
|---|---|---|
| `users` | name, email (unique), passwordHash, createdAt | Password is hashed with bcrypt, never stored as text |
| `subjects` | user, name, color | Unique per user and name |
| `tasks` | user, subject, title, dueDate, priority, done, createdAt | `subject` references `subjects` |
| `notes` | user, subject, title, body, link, shared, createdAt | `shared: true` makes it visible to others and in the RSS feed |
| `quizzes` | user, subject, title, questions [{ question, options[4], correctIndex, explanation }] | Questions are **embedded** in the quiz document |
| `attempts` | quiz, user, score, total, takenAt | One per quiz attempt |
| `focus` | user, minutes, subject, at | One per finished focus session |
| `sessions` | created by `connect-mongo` | Login sessions |

**Viva point, embedding vs referencing:** questions belong to exactly one quiz and are always read with it, so they are embedded (one read, no join). Tasks reference subjects because a subject is shared by many tasks and can be renamed or deleted on its own.

---

## 7. The evaluation sheet, row by row

| Criterion | What the code does | How to show it in the report |
|---|---|---|
| Proper HTML structure | Every page starts with `<!DOCTYPE html>`, `<html lang="en">`, `<head>` (charset, viewport, title, description) and `<body>` | Run `npm run validate:html`, screenshot "no errors" |
| Semantic tags | `header`, `nav` (labelled), `main`, `section` (labelled by its heading), `article`, `aside`, `footer`, `figure`, `dl`, `fieldset` | Show DevTools Accessibility tree or WAVE Structure tab |
| Headings | One `h1` per page, then `h2`, `h3`, no skipped levels (the audit fails if a page has not exactly one `h1`) | WAVE Structure tab |
| Contrast (WCAG 2.1 AA) | All text 4.5:1 or better, large text and borders 3:1 or better. Light: body 17.2:1, muted 8.1:1, button 7.9:1. Dark: body 13.7:1, muted 8.5:1. High contrast theme: black and white | WAVE Contrast tab, Lighthouse |
| Font size and spacing | Body 17px, `line-height: 1.65`, hints 15px or more, text size setting up to 136% | Section 9 of your report |
| Readable text | Sentence case only (no all caps), nothing blinks or scrolls by itself, animations stop with the reduce-motion setting | Mention in report |
| Alt text | The home page illustration has `role="img"` with a full description; charts have `aria-label` plus a text table | Show the line of HTML |
| Decorative images | Icons and background blobs use `aria-hidden="true"` | Show the line of HTML |
| Captions for video or audio | The site has no video or audio, so this row does not apply. The timer beep is optional and is announced in text as well | Say "not applicable" in the report |
| Labels | Every input has a visible `<label for>` (or wraps the checkbox). Groups use `fieldset` and `legend` | WAVE Details tab shows labels |
| Placeholders | None used. Hints sit under the field and are linked with `aria-describedby` | Screenshot of a form |
| Error messages | Written text under the field (`<p class="error" role="alert">`) starting with "Error:", plus a red border as an extra. Focus moves to the bad field | Screenshot of a failed submit |
| Instructions | "Fields marked with * are required" at the top of each form; format hints under fields | Screenshot of a form |
| Keyboard access | Everything works with Tab, Shift+Tab, Enter, Space, Esc and arrow keys (flashcards). Visible 3px focus ring. Skip link first on every page. Dialogs trap focus and return it | Record a short screen capture tabbing through a form |

---

## 9. Design system (so the UI stays consistent)

- **Colours** are CSS variables (`--bg`, `--surface`, `--text`, `--muted`, `--primary`, ...). Dark and high contrast themes only change the variables, so no page needs special code.
- **Layout** uses CSS Grid and Flexbox with `auto-fit` columns, so it works from 320px phones to wide screens with no horizontal scrolling.
- **Components:** `.card`, `.btn` (primary, secondary, ghost, danger), `.badge`, `.field`, `.input`, `.bar`, `.task`, `.flashcard`, `.stat`, toasts and a `<dialog>` panel.
- **Motion:** gentle lift on hover, slide-in for toasts, a floating illustration. All of it is disabled when the visitor chooses "Reduce animations" or their device asks for reduced motion.
- **No outside files:** no CDN, no web fonts, no framework. The site works offline from your own server and the Content Security Policy blocks everything else.

---

## 8. WAVE approval, step by step

The WAVE browser extension is a free tool from WebAIM. It cannot be run from a script, so **you** run it and keep the screenshots as evidence. The project is built so that it should report **0 Errors and 0 Contrast Errors**.

1. Install **WAVE Evaluation Tool** from the Chrome Web Store (or Edge or Firefox add-ons).
2. Start the site (`npm run dev`), log in, and visit each page: Home, Register, Log in, Dashboard, Planner, Focus, Notes, Quizzes, Take quiz, Flashcards, XML tools.
3. On each page click the WAVE icon. In the **Summary** tab check:
   - **Errors = 0**
   - **Contrast Errors = 0**
   - Read each Alert (yellow). Typical harmless alerts are listed below.
4. Also test Dark and High contrast (Display button, top right). Open the **Contrast** tab.
5. Take one screenshot of the Summary tab per page for the report.
6. If WAVE shows an error, fix it and run `npm run validate:html` and `npm run audit`, then check WAVE again.

**Automated checks already run for you** (`npm run audit`, `npm run validate:html`): axe-core (WCAG 2.0, 2.1 and 2.2 A and AA rules plus best practices) on every page in light, dark and high contrast themes, with extra-large text and at phone width; exactly one `h1` per page; no horizontal scroll; no browser console errors; and HTML validation. axe-core and WAVE are different tools, so always confirm with WAVE yourself.

**Alerts you may see and why they are fine:** WAVE lists "features" in green (labels, skip link, ARIA) and may show alerts such as a link that opens in a new tab (the note link says so in hidden text), or a `<fieldset>` hint. Alerts are not errors; explain any alert in one sentence in your report.

---

## 10. Security (good viva material)

| Risk | Protection in the code |
|---|---|
| Stolen passwords | bcrypt hashing; hashes are never sent to the browser |
| NoSQL injection (`{"$ne":""}` as email) | Every input must be a plain string; checked in `validate.js`; covered by a test |
| Cross-site scripting (XSS) | Page text is built with `textContent`; Content Security Policy allows only your own scripts |
| Cross-site request forgery (CSRF) | `SameSite=Lax` cookie plus a required `X-Requested-With` header on every write |
| Password guessing | Rate limit on login and register |
| Reading other students' data | Every query includes the logged-in user's id; private notes never appear in search or in the RSS feed |
| Session theft | `httpOnly` cookie, `secure` in production, new session id on login |
| Broken or huge XML | XML is validated, limited to 1 MB and 100 notes, special characters are escaped on export |

---

## 11. Test it

```bash
npm test               # 8 API tests (needs MongoDB; uses its own studybuddy_test database)
npm run validate:html  # HTML mistakes
npm run dev            # in one terminal
npm run audit          # in another terminal: accessibility audit + screenshots
```

`npm run audit` uses your installed Google Chrome. If it cannot find Chrome, set `CHROME_PATH` to your Chrome program. To audit your deployed site: `BASE_URL=https://your-site.onrender.com npm run audit` (PowerShell: `$env:BASE_URL="https://..."; npm run audit`).

**Manual test list for the report (test case, steps, expected result):** register with a weak password (error text appears), log in with a wrong password, add a task, tick it, edit it, delete it, filter tasks, run the Quick test timer (1 minute), add a shared note, search it, create a quiz, take it, flip a flashcard, export notes, import the file, open `/feed.xml`, switch to dark and high contrast themes, use only the keyboard to add a task.

---

## 12. GitHub

1. Create a new **empty** repository on GitHub (no README). Add your teammate as a collaborator.
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial StudyBuddy project"
   git branch -M main
   git remote add origin https://github.com/<you>/studybuddy.git
   git push -u origin main
   ```
3. Work on branches (`feature/planner`, `feature/quizzes`), open pull requests, and review each other's work. Both members must have real commits, because the history shows your division of work.
4. Never commit `.env` (it is in `.gitignore`).

---

## 12b. Deploy (Render + MongoDB Atlas)

1. Push the project to GitHub (section 12).
2. In Atlas: *Network Access, Add IP Address, Allow access from anywhere* (`0.0.0.0/0`), because Render's free plan has no fixed address. Use a strong database password.
3. In Render: *New, Blueprint*, choose your repository. Render reads `render.yaml`.
4. When asked, paste your Atlas connection string as `MONGODB_URI`. `SESSION_SECRET` is created automatically.
5. Open the Render link. The first load after a pause can take about a minute on the free plan.
6. Run `npm run seed` once against the live database if you want demo data: set `MONGODB_URI` in `.env` to the Atlas string and run it on your computer.
7. Run the audit against the live site (section 11) and WAVE on the live pages. Put both links in the report and README.

---

## 13. Report outline

1. Title page: project name, names and roll numbers, GitHub link, live link
2. Introduction, problem statement, objectives
3. Technologies used and why (section 1 of this guide)
4. System design: architecture diagram (section 4), database collections (section 6), API list (see `server/routes/`), XML format
5. Features: one subsection each with screenshots (from `docs/screenshots/`) and the name of the person who built it
6. Accessibility: the table in section 7 with your WAVE screenshots
7. Security (section 10)
8. Division of work: the table in section 3 plus a screenshot of the GitHub contributors page
9. Testing: the manual test table and `npm test` output
10. Conclusion and future scope (email reminders, mobile app, shared study groups)
11. References, including every tutorial and **every AI tool you used**

### Screenshot checklist

Home (light, dark, high contrast); Register with an error message; Log in; Dashboard; Planner with filters; Planner inline edit; Focus timer running; Notes with search; Quiz creation; Taking a quiz; Quiz result; Flashcard front and back; XML export file open in VS Code; Import success message; `/feed.xml`; Display settings dialog; WAVE Summary for each page; GitHub commits and contributors.

---

## 14. Viva questions to practise

- Why sessions and cookies instead of JWT tokens? What does `httpOnly` do?
- What does bcrypt do? Why not store the password?
- What is NoSQL injection? Show the test that proves you stop it.
- Embedding versus referencing: why are quiz questions embedded?
- What is a semantic element? Which ones did you use and why do screen readers care?
- How did you meet the contrast rule? What ratio is needed for normal and large text?
- Why is there no placeholder text? What is the difference between a label and a placeholder?
- How does keyboard-only use work? What is the skip link for?
- What does `fetch` do, and what happens on a 401 response?
- How is XML different from JSON? Why do you escape `&` and `<`?
- What does the Content Security Policy block, and why are there no inline styles?
- Show one Git merge and say who wrote which commit.

**Practise explaining every file in your half out loud.** If you cannot explain a line, read it again or ask your teammate before the viva.

---

## 15. Academic honesty

Check your college's rules on AI tools. If you used an AI assistant, name it in your report's references and be ready to explain every part of the code in your viva. Understanding the project is also the best way to get full marks.

---

## 16. Troubleshooting

| Problem | Fix |
|---|---|
| `Could not start StudyBuddy: connect ECONNREFUSED` | MongoDB is not running, or `MONGODB_URI` in `.env` is wrong |
| Atlas: `MongooseServerSelectionError` | Add your IP address under Atlas *Network Access* |
| `Port 3000 already in use` | Close the other terminal, or set `PORT=3001` in `.env` |
| Login works but you are logged out on the next page | In production the site must be served over HTTPS; on localhost leave `NODE_ENV` unset |
| `npm run audit` cannot find Chrome | Install Google Chrome, or set `CHROME_PATH` |
| Page looks unstyled | You opened the HTML file directly. Always open <http://localhost:3000> |
