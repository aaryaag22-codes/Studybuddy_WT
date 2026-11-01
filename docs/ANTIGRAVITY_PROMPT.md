# Antigravity prompt for StudyBuddy

## How to use

1. Unzip `studybuddy.zip`. In Antigravity choose **Open Folder** and pick the `studybuddy` folder. It automatically reads `AGENTS.md` at the root (the always-on project rules).
2. Open the Agent Manager (or the agent panel), start a new conversation in this workspace, and paste everything inside the box below.
3. Answer its questions. It will stop and ask before anything is deployed.

Optional: install the **WAVE Evaluation Tool** extension in Antigravity's browser first, so the agent can run it for you. If it is not installed, the agent will tell you and you run WAVE yourself (see `docs/BUILD_GUIDE.md`, section 8).

---

## Paste this

```text
You are working in StudyBuddy, a B.Tech full stack web project (HTML, CSS, vanilla JavaScript, XML, Node.js + Express, MongoDB). Two students are submitting it. Before anything else, read AGENTS.md and docs/BUILD_GUIDE.md and follow them. Do not change the stack, add a framework, a CDN or a web font.

PHASE 1: Set up and verify locally
1. Run `npm install`.
2. Ask me for my MongoDB connection string (MongoDB Atlas, or mongodb://127.0.0.1:27017/studybuddy if I run Docker). Create `.env` from `.env.example`, generate SESSION_SECRET yourself with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, and write both values into `.env`. Never print the connection string or the secret in chat, logs or commits.
3. Run `npm run seed`, then `npm test`. All 8 tests must pass.
4. Run `npm run validate:html`. It must report no errors.
5. Start the site with `npm run dev`, then run `npm run audit`. It must report 0 problem(s). If Chrome is not found, set CHROME_PATH.
6. If any step fails, find the cause, fix it in the smallest way that follows AGENTS.md, and re-run. Tell me what you changed.

PHASE 2: WAVE check in the browser
1. Using your browser, open http://localhost:3000 and log in with demo@studybuddy.dev / Demo@1234.
2. If the WAVE Evaluation Tool extension is installed, run it on every page: index, register, login, dashboard, planner, focus, notes, quizzes, quiz-take (open a quiz first), flashcards, xml. Repeat in the Dark and High contrast themes (Display button, top right).
3. For each page report: Errors, Contrast Errors, Alerts. The target is 0 Errors and 0 Contrast Errors. Fix anything above target, then re-check.
4. If WAVE is not installed, say so clearly and do not claim a WAVE result. Instead, review each page for the checklist in AGENTS.md and tell me to run WAVE myself.
5. Save a screenshot of the WAVE Summary for each page into docs/wave/ (create the folder).

PHASE 3: Look and feel review
Walk through all 8 features once with the keyboard only (Tab, Enter, Space, Esc) and once on a 375px wide window. Report any broken layout, missing focus ring or unclear text. Fix only what is clearly wrong, and keep the existing design.

PHASE 4: Stop and ask before deploying
Summarise Phase 1 to 3 results in a short table. Then ask me: "Do you want me to deploy to Render with MongoDB Atlas now?" Do NOT push code, create a repository, create an account or deploy until I answer yes in this conversation.

PHASE 5: Deploy (only after I say yes)
1. Check `git status`. If there is no repository, ask me for the GitHub repository URL (I will create an empty one), then `git init`, commit (without .env) and push to it. Make sure both team members' work is committed under their own names if I tell you the names.
2. Tell me to do these steps myself in the dashboards, and wait for my confirmation:
   - Atlas, Network Access: allow 0.0.0.0/0 (Render free plan has no fixed IP), and use a strong database password.
   - Render, New, Blueprint: select the repository (render.yaml is already in the project). Paste the Atlas connection string into MONGODB_URI when asked. SESSION_SECRET is generated automatically.
3. Never ask me to paste secrets into this chat.
4. When Render shows the site is live, ask me for the URL, then run `BASE_URL=<url> npm run audit` (PowerShell: `$env:BASE_URL="<url>"; npm run audit`) and open the live pages in your browser. Confirm: register and login work over HTTPS, the dashboard loads, the XML feed at /feed.xml opens, and the WAVE result is still 0 Errors if WAVE is installed.
5. If something fails, read the Render logs (I will paste them), fix the cause, and redeploy only after asking me.

PHASE 6: Report back
Give me: what passed, what you changed (file list), the live URL, WAVE results per page (or a note that WAVE was not available), and anything I still need to do by hand (for example screenshots for the report, the GitHub link, and my names and roll numbers in README.md).

Rules for the whole task: keep the code simple and commented in plain English so two students can explain every file in a viva. Never remove accessibility features to make a check pass. If a decision is mine to make, ask me.
```

---

## Notes

- The agent cannot see your Atlas or Render dashboards. It will ask you to click those steps.
- A passing axe-core audit does not replace WAVE. Run WAVE yourself and keep the screenshots for the report.
- Replace the placeholders in `README.md` (names, roll numbers, links) before submitting.
