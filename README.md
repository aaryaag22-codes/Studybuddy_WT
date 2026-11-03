# StudyBuddy

A study planner and note-sharing web app. Plan tasks, run focus sessions, save and share notes, make quizzes and revise with flashcards.

Built with **HTML, CSS, JavaScript, XML, Node.js (Express) and MongoDB** as a B.Tech full stack web development project.

| | |
|---|---|
| Team | Member A: _[Aarya Agarwal, 11]_, Member B: _[Ishi Pandeya, 31]_ |
| GitHub | _https://github.com/aaryaag22-codes/Studybuddy_WT |
| Live site | _https://studybuddy-frh8.onrender.com_ |

## Quick start in VS Code

You need **Node.js 18 or newer** and a **MongoDB** database (free MongoDB Atlas, or MongoDB on your computer).

```bash
npm install
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# open .env and set MONGODB_URI and SESSION_SECRET
npm run seed                # optional: adds demo data
npm run dev                 # open http://localhost:3000
```

Demo login after seeding: `demo@studybuddy.dev` / `Demo@1234`

No MongoDB yet? Either create a free cluster at <https://www.mongodb.com/atlas> and paste its connection string into `.env`, or run `docker compose up -d` to start MongoDB locally.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the site and restarts when you save a file |
| `npm start` | Starts the site (used on the hosting service) |
| `npm run seed` | Creates demo users, tasks, notes, quizzes and focus sessions |
| `npm test` | Runs 8 automated API tests (uses a throw-away database `studybuddy_test`) |
| `npm run validate:html` | Checks every HTML page for mistakes |
| `npm run audit` | Opens every page in Chrome in 3 themes and runs the axe-core accessibility rules; saves screenshots to `docs/screenshots` |

## Features

| # | Feature | Built by |
|---|---|---|
| 1 | Register, log in, log out (hashed passwords, session cookie) | Member A |
| 2 | Planner: subjects and tasks with due dates, priorities, filters, inline edit | Member A |
| 3 | Dashboard: stat cards, progress ring, weekly focus chart, upcoming tasks | Member A |
| 4 | Focus timer (Pomodoro) with saved sessions and a daily streak | Member A |
| 5 | Notes library: add, search, filter, share with other students | Member B |
| 6 | Quizzes: create, take one question at a time, score and review | Member B |
| 7 | Flashcards: flip, shuffle, mark known, progress saved | Member B |
| 8 | XML tools: export notes, import notes, public RSS feed | Member B |
| + | Display settings on every page: light, dark, high contrast, text size, reduce motion | Both |

Full explanation of every file, the database, the API and the accessibility checklist: **[docs/BUILD_GUIDE.md](docs/BUILD_GUIDE.md)**.

## Folder map

```text
server/    Express app, Mongoose models, API routes
public/    The website: HTML pages, css/style.css, js/ modules
scripts/   seed.js, api.test.js, a11y-audit.js
docs/      BUILD_GUIDE.md, ANTIGRAVITY_PROMPT.md, screenshots/
AGENTS.md  Rules that AI coding tools read automatically
render.yaml  Deployment settings for Render
```
