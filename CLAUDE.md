# CLAUDE.md Generator

## Project Overview

Free web tool that generates production-ready CLAUDE.md files for Claude Code users.
User describes their project via a form → Claude API generates a complete CLAUDE.md.

## Tech Stack

- Vanilla HTML/CSS/JS — no build step, no framework, no dependencies
- Claude API (claude-sonnet-4-6) — streamed response via fetch()
- GitHub Pages — static deploy from main branch
- User brings their own Claude API key (stored in sessionStorage only)

## Key Files

- `index.html` — main page (form + output pane)
- `style.css` — styles
- `app.js` — API call logic + UI interactions

## Deploy Target

GitHub Pages: https://tydurand14-cloud.github.io/claude-md-generator/
GitHub repo: github.com/tydurand14-cloud/claude-md-generator (public after launch)

## Security Rules

- API key MUST use `autocomplete="off"`, stored in sessionStorage only
- API key MUST NOT be logged, committed, or sent to any endpoint except api.anthropic.com
- No analytics, no tracking, no third-party scripts

## Session Rules

- Static site — no server, no database, no auth
- All content in root directory
- Test by opening index.html in browser
