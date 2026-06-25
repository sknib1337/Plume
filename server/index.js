import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const MODEL = process.env.MODEL || "claude-sonnet-4-6";
const MAX_INPUT_CHARS = 4000;
const MAX_TAILOR_CHARS = 8000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n[plume] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.\n"
  );
}

// The SDK automatically reads ANTHROPIC_API_KEY from the environment.
const anthropic = new Anthropic();

const app = express();
app.use(express.json({ limit: "256kb" }));

// If deployed behind a reverse proxy (Render, Fly, nginx, etc.), set TRUST_PROXY
// so rate limiting sees the real client IP rather than the proxy's.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

// Each generation spends real money on your API key. Cap requests per IP so an
// exposed public instance can't be hammered into a large bill.
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Wait a moment and try again." },
});

// --- shared prompt fragments ---
function toneLine(intensity) {
  return intensity === "bold"
    ? "INTENSITY = bold: punchy executive verbs, high density. Still professional — no cartoonish words."
    : "INTENSITY = measured: confident and recruiter/ATS-friendly. Avoid theatrics like 'ruthlessly', 'crushing', 'commanded', 'forged'. Pick verbs a hiring manager respects.";
}

function familyLine(family) {
  return family && family !== "auto"
    ? `The user has indicated job family = ${family}. Use it.`
    : "Detect the most likely job family yourself.";
}

const BULLET_STYLE = `Bullets follow: [strong action verb] + [scope] + [technical execution] + [measurable impact].
- Open with executive action verbs (Architected, Spearheaded, Drove, Led, Scaled, Shipped, Streamlined). Never "Helped/Assisted/Worked on".
- Use standard acronyms where natural (E2E, XF, IAM, MTTR, SDLC, KPI, GTM, MVP, OKR, ARR, MAU) but prioritize readability — do not stuff.
- Active voice, zero filler.
- For ANY impact metric the user did not supply, insert an editable placeholder wrapped in DOUBLE BRACES naming what to fill, e.g. "reducing MTTR by {{X%}}", "capturing {{$X}} net-new ARR". If the user gave a real number, use it directly — no braces.`;

function buildEnhancePrompt(family, intensity) {
  return `You are an elite technical resume editor for TPM, PdM, and IT/Infra/SecOps roles.

Rewrite the user's raw material into 3-5 high-impact bullets. ${BULLET_STYLE}
- ${toneLine(intensity)}
- ${familyLine(family)}

Return ONLY valid JSON, no markdown, no commentary:
{"jobFamily":"TPM|PdM|IT","bullets":["bullet one","bullet two","..."]}`;
}

function buildTailorPrompt(family, intensity) {
  return `You are an expert technical resume editor helping a candidate TAILOR their resume to ONE specific job description (JD), for TPM, PdM, or IT/Infra/SecOps roles.

You are given the JD and the candidate's current experience. Do three things:
1. Extract the most important skills, tools, and requirements from the JD as short keywords or phrases (a handful, not every word).
2. Classify each as "matched" (clearly evidenced in the candidate's experience) or "missing" (asked for by the JD but not supported by anything the candidate wrote).
3. Rewrite 3-6 of the candidate's bullets to emphasize the experience most relevant to this JD, using the JD's own terminology WHERE the candidate genuinely has that experience.

CRITICAL honesty rules - follow these strictly:
- NEVER invent experience, tools, seniority, or outcomes the candidate did not state. Tailoring means re-emphasizing and rephrasing REAL experience, not fabricating qualifications.
- Mark a keyword "matched" only if the candidate's text actually supports it. When unsure, mark it "missing".
- Never write a "missing" skill into a bullet as if the candidate has it.

${BULLET_STYLE}
- ${toneLine(intensity)}
- ${familyLine(family)}

Return ONLY valid JSON, no markdown, no commentary:
{"matched":["keyword","..."],"missing":["keyword","..."],"bullets":["tailored bullet","..."]}`;
}

function extractJson(raw) {
  let t = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

async function callModel(system, userContent) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  return extractJson(text);
}

function handleError(res, err) {
  console.error("[plume] request failed:", err?.message || err);
  const status = err?.status === 429 ? 429 : 500;
  const msg =
    status === 429
      ? "Rate limited by the API. Wait a moment and try again."
      : "Couldn't generate a result. Check the server logs.";
  return res.status(status).json({ error: msg });
}

function keyGuard(res) {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY. See README setup." });
    return false;
  }
  return true;
}

app.post("/api/enhance", apiLimiter, async (req, res) => {
  try {
    if (!keyGuard(res)) return;
    const { input, family = "auto", intensity = "measured" } = req.body || {};
    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({ error: "Provide some text to enhance." });
    }
    if (input.length > MAX_INPUT_CHARS) {
      return res.status(400).json({ error: `Input is too long (max ${MAX_INPUT_CHARS} characters).` });
    }

    const parsed = await callModel(buildEnhancePrompt(family, intensity), input.trim());
    if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) {
      return res.status(502).json({ error: "Model returned no usable bullets. Try again." });
    }
    return res.json({
      jobFamily: parsed.jobFamily || null,
      bullets: parsed.bullets.filter((b) => typeof b === "string" && b.trim()),
    });
  } catch (err) {
    return handleError(res, err);
  }
});

app.post("/api/tailor", apiLimiter, async (req, res) => {
  try {
    if (!keyGuard(res)) return;
    const { jobDescription, resume, family = "auto", intensity = "measured" } = req.body || {};
    if (typeof jobDescription !== "string" || !jobDescription.trim()) {
      return res.status(400).json({ error: "Paste the job description." });
    }
    if (typeof resume !== "string" || !resume.trim()) {
      return res.status(400).json({ error: "Paste your experience or current bullets." });
    }
    if (jobDescription.length > MAX_TAILOR_CHARS || resume.length > MAX_TAILOR_CHARS) {
      return res.status(400).json({ error: `Each field is limited to ${MAX_TAILOR_CHARS} characters.` });
    }

    const userContent = `JOB DESCRIPTION:\n${jobDescription.trim()}\n\nCANDIDATE EXPERIENCE:\n${resume.trim()}`;
    const parsed = await callModel(buildTailorPrompt(family, intensity), userContent);

    return res.json({
      matched: Array.isArray(parsed.matched) ? parsed.matched.filter((x) => typeof x === "string") : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.filter((x) => typeof x === "string") : [],
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.filter((b) => typeof b === "string" && b.trim()) : [],
    });
  } catch (err) {
    return handleError(res, err);
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

// In production, serve the built frontend from this same server.
if (process.env.NODE_ENV === "production") {
  const dist = path.join(__dirname, "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`[plume] API listening on http://localhost:${PORT} (model: ${MODEL})`);
});
