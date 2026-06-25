<p align="center">
  <img src="public/logo.png" alt="Plume" width="84" height="84" />
</p>

# Plume

*Put your best plume forward.* A resume tailoring tool for technical roles — Program Management,
Product, and IT / Infrastructure.

Rewrite rough technical resume bullets into high-impact statements — and turn every missing
metric into a **fill-in-the-blank field** you type your real number into.

Built for three job families: Technical Program Management (TPM), Product Management (PdM), and
IT / Infrastructure / Security. Paste a responsibility or a weak bullet, pick a role family and a
voice, and get 3–5 rewritten bullets back. Anywhere a number belongs but you didn't supply one, the
app inserts a highlighted, editable slot like `reducing MTTR by [ X% ]` instead of inventing a
figure.

It has three tabs:

- **Tailor** — paste a job description plus your experience and get bullets re-aimed at that specific
  role, with a keyword coverage read showing what you cover and where the gaps are. See
  [Tailoring to a job](#tailoring-to-a-job) below.
- **Enhance** — the standalone resume bullet rewriter described above.
- **Tracker** — a job application tracker that follows the interview pipeline (Phone → Hiring
  Manager → On-site rounds → Offer), with notes and dates per round. It saves to your browser and
  exports to JSON or CSV. See [The job tracker](#the-job-tracker) below.

> **Why the editable slot matters:** pasting a resume prompt into a chatbot gives you dead text like
> `reducing MTTR by [X]%`. Here, that placeholder is a live field — the prose stays locked, you fill
> the number, and copy gives you a finished bullet. The tool never fabricates metrics.

---

## How it works

```
Browser (React, Vite)  ──POST /api/enhance──▶  Express server  ──▶  Anthropic Messages API
        ▲                                       (holds API key)
        └──────────── bullets + slots ──────────┘
```

The browser **never** talks to Anthropic directly and never sees your API key. All requests go
through a thin Express proxy that holds the key server-side, builds the system prompt, calls the
[Messages API](https://docs.anthropic.com/en/api/messages), and returns clean JSON. This is the one
change that makes the tool safe to deploy publicly — a key shipped to the browser would be
harvested within minutes.

---

## Quick start

**Prerequisites**

- [Node.js](https://nodejs.org) 20 or newer
- An Anthropic API key — create one at <https://console.anthropic.com/settings/keys>

**Setup**

```bash
git clone https://github.com/<your-username>/plume.git
cd plume
npm install

cp .env.example .env        # on Windows (cmd): copy .env.example .env
# then open .env and paste your ANTHROPIC_API_KEY
```

**Run in development**

```bash
npm run dev
```

This starts the Express API on `http://localhost:3001` and the Vite dev server on
`http://localhost:5173`. Open the Vite URL — it proxies `/api` calls to Express automatically.

**Run in production**

```bash
npm run build     # bundles the React app into dist/
npm start         # Express serves dist/ and the API on one port (default 3001)
```

---

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable               | Default              | Notes                                                            |
| ---------------------- | -------------------- | ---------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | _(required)_         | Your Anthropic key. Never commit this.                           |
| `PORT`                 | `3001`               | Port the Express server listens on.                              |
| `MODEL`                | `claude-sonnet-4-6`  | Any current model string. `claude-haiku-4-5` is cheaper.         |
| `RATE_LIMIT_MAX`       | `30`                 | Max API requests per IP per window.                              |
| `RATE_LIMIT_WINDOW_MS` | `300000`             | Rate-limit window length in ms (default 5 min).                  |
| `TRUST_PROXY`          | _(off)_              | Set to `1` only when behind a proxy, so limits see real IPs.     |

---

## Cost

Each enhancement or tailoring is a single Messages API call with a small prompt and a short
response — on the order of a thousand tokens total. With Sonnet 4.6 at roughly $3 per million input
tokens and $15 per million output, a single call costs a fraction of a cent. Switching `MODEL` to
`claude-haiku-4-5` lowers it further. Check current pricing at
<https://www.anthropic.com/pricing>, since rates change.

You pay Anthropic directly for usage on your own key. There is no other cost to running this.

---

## Deploying

The app is a standard Node server after `npm run build`, so it runs anywhere that runs Node:

- **Render / Railway / Fly.io / a VPS:** set the build command to `npm install && npm run build`,
  the start command to `npm start`, and add `ANTHROPIC_API_KEY` (and optionally `MODEL`) as
  environment variables in the platform dashboard.
- **Split frontend/backend:** you can also host `dist/` on any static host and run `server/` as a
  standalone API — just point the frontend's fetch base at the API's URL and enable CORS.

Whatever you choose, **set `ANTHROPIC_API_KEY` as a platform secret**, never in committed code.
Per-IP rate limiting is built in (configurable via `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`); tune
it for your traffic before exposing a public instance, since each request spends real money on your
key. If you deploy behind a proxy or load balancer, also set `TRUST_PROXY` so limits apply per real
client IP.

---

## Customizing the output

The voice and rules of the rewrite live entirely in `server/index.js` — `buildEnhancePrompt()` and
`buildTailorPrompt()`, which share a `BULLET_STYLE` block and the `toneLine` / `familyLine` helpers.
Two things you'll likely want to tune:

- **The verb lexicon and acronym density.** The default "measured" voice avoids theatrical verbs;
  "bold" leans punchier. Edit `toneLine()` and `BULLET_STYLE` to taste.
- **The placeholder convention.** The model wraps fill-in metrics in `{{double braces}}`. The
  frontend (`parseBullet` in [`src/bullets.jsx`](src/bullets.jsx)) splits on that exact pattern to
  render the editable fields, so if you change the delimiter, change it in both places.

---

## Tailoring to a job

The **Tailor** tab is the difference between a generic resume and one aimed at the job in front of
you. Paste the job description in one box and your current experience or bullets in the other, and it
returns two things:

- **Keyword coverage.** It pulls the key skills and requirements out of the JD and splits them into
  what your experience already evidences (**Covered**) and what the JD wants but your input didn't
  show (**Gaps**), with a coverage percentage. The gaps list is the useful part — it tells you what
  to add if you have it, or what you'll be asked about that you can't claim.
- **Tailored bullets.** Your experience rewritten to lead with what this role cares about, using the
  JD's own terminology — but only where you genuinely have the experience. Same editable `{{metric}}`
  slots as the Enhance tab.

**It will not invent qualifications.** Tailoring here means re-emphasizing and rephrasing real
experience, never fabricating skills or outcomes. A keyword only lands in "Covered" if your input
actually supports it; everything else is honestly reported as a gap. That's deliberate — a resume
that claims things you can't back up falls apart in the interview.

## The job tracker

The **Tracker** tab is a self-contained application tracker — no API key, no server call, no account.
It runs entirely in the browser.

- **Pipeline-first.** Each application moves through a status: Applied → Phone Screen → Hiring
  Manager → On-site → Offer (plus Rejected / Withdrawn). Inside each application you log any number of
  **interview rounds**, each with a type, date, and free-text notes — so multiple on-site rounds are
  just multiple rounds, not extra columns.
- **At-a-glance.** Summary counts at the top (tracked / active / interviewing / offers), a filter
  (Active / All / Offers / Archived), the next upcoming interview surfaced on each card, and a
  "stale" flag on anything active that hasn't moved in two weeks.
- **Your data stays yours.** Records are saved in the browser's local storage. **Export** to JSON
  (full backup, re-importable) or CSV at any time. Because it's browser-local, clearing site data
  wipes it — export regularly, and note it won't sync across devices.

### Moving from a spreadsheet

The CSV export uses the same wide column layout a lot of people already track in, so it pastes back
into Google Sheets cleanly:

| Spreadsheet column        | Tracker field                          |
| ------------------------- | -------------------------------------- |
| Company                   | Company                                |
| Location                  | Location                               |
| Job Title                 | Job title                              |
| Pay Range                 | Pay range                              |
| JD                        | Job description link                   |
| Phone Interview Date/Notes| A round with type **Phone**            |
| Hiring Manager Date/Notes | A round with type **Hiring Manager**   |
| On-site Date/Notes (×N)   | One round each with type **On-site**   |
| Offer?                    | Status set to **Offer**                |

There's no spreadsheet importer yet (it's a [good first issue](CONTRIBUTING.md)); for now you re-enter
existing applications, then export keeps you in sync going forward.

## Project structure

```
plume/
├── server/
│   └── index.js        Express proxy: /api/enhance, /api/tailor, rate limiting, static serving
├── src/
│   ├── App.jsx         Tabbed shell (Tailor / Enhance / Tracker) + brand header
│   ├── Tailor.jsx      Tailor bullets to a job description + coverage analysis
│   ├── Enhancer.jsx    Standalone resume bullet rewriter
│   ├── Tracker.jsx     Job application tracker (local storage, export)
│   ├── bullets.jsx     Shared bullet rendering + editable metric slots + the formula note
│   ├── hooks.js        Responsive + keyboard-shortcut hooks
│   ├── storage.js      localStorage helpers for the tracker
│   ├── theme.js        Shared color + type tokens
│   ├── main.jsx        React entry point
│   └── index.css       Minimal global styles
├── public/
│   ├── favicon.svg     Feather mark (browser tab)
│   └── logo.png        Feather mark (README / sharing)
├── index.html          Vite HTML entry
├── vite.config.js      Dev proxy: /api → Express
├── .env.example        Copy to .env and fill in
└── package.json
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for the dev setup and
conventions, and note that this project ships a [Code of Conduct](CODE_OF_CONDUCT.md). Security
issues should follow [SECURITY.md](SECURITY.md) rather than the public issue tracker.

## License

[MIT](LICENSE) — do whatever you like, no warranty. This is an independent project and is not
affiliated with or endorsed by Anthropic.
