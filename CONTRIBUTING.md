# Contributing to Plume

Thanks for taking the time to contribute. This is a small project, so the process is light.

## Ground rules

- By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
- Found a security issue? **Don't open a public issue** — follow [SECURITY.md](SECURITY.md).
- Not sure if a change is wanted? Open an issue to discuss before writing a lot of code.

## Development setup

```bash
npm install
cp .env.example .env     # add your ANTHROPIC_API_KEY
npm run dev
```

`npm run dev` runs the Express API and the Vite dev server together. The frontend is at
`http://localhost:5173` and proxies `/api` to Express on `3001`.

You'll need your own Anthropic API key to test changes that hit the model. Changes to pure UI,
parsing, or styling can often be verified without one.

## Where things live

- **Prompt / model behavior:** `server/index.js` — `buildEnhancePrompt()`, `buildTailorPrompt()`,
  and the `/api/enhance` + `/api/tailor` handlers. This is where the rewrite rules, voice, JSON
  contract, and per-IP rate limiting live.
- **Shared bullet UI:** `src/bullets.jsx`. The `{{double brace}}` placeholder convention is parsed by
  `parseBullet`; if you change the delimiter, change it in the prompts too.
- **Views:** `src/Tailor.jsx`, `src/Enhancer.jsx`, `src/Tracker.jsx`, wired together by `src/App.jsx`.
- **Dev proxy:** `vite.config.js`.

## Making a change

1. Fork the repo and create a branch: `git checkout -b feat/short-description`.
2. Keep changes focused — one logical change per pull request.
3. Match the existing style. There's no linter configured; just keep formatting consistent with the
   surrounding code (2-space indentation, double quotes).
4. Test your change manually end-to-end: paste real input, confirm bullets render, slots are
   editable, and copy works.
5. Write a clear PR description: what changed, why, and how you tested it. Screenshots help for UI
   changes.

Conventional-commit-style messages (`feat:`, `fix:`, `docs:`, `refactor:`) are appreciated but not
required.

## Good first contributions

- A pre-rewrite linter that flags weak verbs / passive voice in the user's original text.
- Per-bullet "regenerate" so one line can be re-rolled without redoing all of them.
- A spreadsheet/CSV importer for the tracker, so existing trackers migrate in one paste.
- Export to plain text, Markdown, or clipboard-friendly formats that preserve filled-in slots.
- A loading skeleton and keyboard shortcuts (e.g. Cmd/Ctrl+Enter to run).
- Optional server-side persistence (e.g. SQLite) to give the tracker real accounts and cross-device sync.

Thanks again!
