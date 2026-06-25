import { useState } from "react";
import { ink, muted, line, amber, surface, display } from "./theme.js";
import {
  parseBullet,
  bulletText,
  BulletCard,
  chipStyle,
  fieldLabelStyle,
  FormulaNote,
  LabeledTextarea,
} from "./bullets.jsx";
import { useIsNarrow, submitOnCmdEnter } from "./hooks.js";

const FAMILIES = [
  { id: "auto", label: "Auto-detect" },
  { id: "TPM", label: "Program (TPM)" },
  { id: "PdM", label: "Product (PdM)" },
  { id: "IT", label: "IT / Infra / Sec" },
];

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${line}`,
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 14.5,
  fontFamily: "inherit",
  color: ink,
  resize: "vertical",
  outline: "none",
  background: surface,
};

function KeywordChips({ items, kind }) {
  const covered = kind === "covered";
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {items.map((k, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "4px 11px",
            borderRadius: 999,
            background: covered ? "#e2f0e4" : surface,
            color: covered ? "#2c6b39" : "#8a5a10",
            border: covered ? "1px solid #bfdcc4" : `1px dashed ${amber}`,
          }}
        >
          <span style={{ fontSize: 11 }}>{covered ? "✓" : "+"}</span>
          {k}
        </span>
      ))}
    </div>
  );
}

export default function Tailor() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [family, setFamily] = useState("auto");
  const [intensity, setIntensity] = useState("measured");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const narrow = useIsNarrow();

  const ready = jd.trim() && resume.trim();

  async function tailor() {
    if (!ready || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd.trim(), resume: resume.trim(), family, intensity }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult({
        matched: Array.isArray(data.matched) ? data.matched : [],
        missing: Array.isArray(data.missing) ? data.missing : [],
        bullets: (data.bullets || []).map(parseBullet),
      });
    } catch (e) {
      setError(e.message || "Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const onKey = submitOnCmdEnter(tailor);

  function updateSlot(bIdx, sIdx, val) {
    setResult((prev) => ({
      ...prev,
      bullets: prev.bullets.map((segs, i) =>
        i === bIdx ? segs.map((s, j) => (j === sIdx ? { ...s, value: val } : s)) : segs
      ),
    }));
  }

  function copyOne(idx) {
    navigator.clipboard.writeText(bulletText(result.bullets[idx]));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1400);
  }

  function copyAll() {
    navigator.clipboard.writeText(result.bullets.map((s) => "• " + bulletText(s)).join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1400);
  }

  const coverage =
    result && result.matched.length + result.missing.length > 0
      ? Math.round((result.matched.length / (result.matched.length + result.missing.length)) * 100)
      : null;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 28, margin: 0, lineHeight: 1.1 }}>
          Aim your resume at one job.
        </h1>
        <p style={{ color: muted, fontSize: 14, marginTop: 10, maxWidth: 540 }}>
          Paste the job description and your current experience. You get bullets re-emphasized toward
          what this role asks for, plus an honest read on which of its requirements you{" "}
          <span style={{ color: "#2c6b39", fontWeight: 600 }}>cover</span> and which are{" "}
          <span style={{ color: amber, fontWeight: 600 }}>gaps</span>. It never invents experience you
          didn't list.
        </p>
      </div>

      <FormulaNote />

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: narrow ? "1fr" : "1fr 1fr" }}>
        <LabeledTextarea
          label="Job description"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          onKeyDown={onKey}
          placeholder="Paste the full JD: responsibilities, requirements, nice-to-haves…"
          rows={9}
          style={textareaStyle}
        />
        <LabeledTextarea
          label="Your experience / current bullets"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          onKeyDown={onKey}
          placeholder="Paste your current resume bullets or a description of what you've actually done."
          rows={9}
          style={textareaStyle}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", margin: "16px 0 6px" }}>
        <div>
          <div style={fieldLabelStyle}>Role family</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {FAMILIES.map((f) => (
              <button key={f.id} style={chipStyle(family === f.id)} onClick={() => setFamily(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={fieldLabelStyle}>Voice</div>
          <div style={{ display: "flex", gap: 7 }}>
            <button style={chipStyle(intensity === "measured")} onClick={() => setIntensity("measured")}>
              Measured
            </button>
            <button style={chipStyle(intensity === "bold")} onClick={() => setIntensity("bold")}>
              Bold
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={tailor}
        disabled={loading || !ready}
        style={{
          marginTop: 16,
          width: "100%",
          background: loading || !ready ? "#c9c4b8" : ink,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: display,
          cursor: loading || !ready ? "default" : "pointer",
          transition: "background .15s",
        }}
      >
        {loading ? "Tailoring…" : "Tailor to this job"}
      </button>
      <div style={{ fontSize: 12, color: muted, marginTop: 8, textAlign: "center" }}>
        or press ⌘/Ctrl + Enter
      </div>

      {error && (
        <div style={{ marginTop: 16, color: "#9a3324", fontSize: 14, background: "#fbeae6", padding: "10px 14px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontFamily: display, fontWeight: 700, fontSize: 15, color: ink }}>
                Keyword coverage
              </span>
              {coverage !== null && (
                <span style={{ fontSize: 13, color: muted }}>
                  <span style={{ color: ink, fontWeight: 700 }}>{coverage}%</span> of {result.matched.length + result.missing.length} key requirements evidenced
                </span>
              )}
            </div>
            {result.matched.length > 0 && (
              <div style={{ marginBottom: result.missing.length ? 14 : 0 }}>
                <div style={{ ...fieldLabelStyle, color: "#2c6b39" }}>Covered</div>
                <KeywordChips items={result.matched} kind="covered" />
              </div>
            )}
            {result.missing.length > 0 && (
              <div>
                <div style={{ ...fieldLabelStyle, color: "#8a5a10" }}>Gaps — the JD asks for these, your input didn't show them</div>
                <KeywordChips items={result.missing} kind="gap" />
              </div>
            )}
            {result.matched.length === 0 && result.missing.length === 0 && (
              <div style={{ fontSize: 13, color: muted }}>No distinct keywords were extracted.</div>
            )}
          </div>

          {result.bullets.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: muted }}>
                  Tailored bullets · tab into the amber fields to drop in real numbers
                </span>
                <button
                  onClick={copyAll}
                  style={{ border: `1px solid ${line}`, background: copiedAll ? ink : surface, color: copiedAll ? "#fff" : ink, borderRadius: 7, fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}
                >
                  {copiedAll ? "Copied all" : "Copy all"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.bullets.map((segs, i) => (
                  <BulletCard
                    key={i}
                    index={i}
                    segments={segs}
                    onSlotChange={(sIdx, v) => updateSlot(i, sIdx, v)}
                    onCopy={() => copyOne(i)}
                    copied={copiedIdx === i}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
