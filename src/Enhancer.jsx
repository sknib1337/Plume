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
import { submitOnCmdEnter } from "./hooks.js";

const FAMILIES = [
  { id: "auto", label: "Auto-detect" },
  { id: "TPM", label: "Program (TPM)" },
  { id: "PdM", label: "Product (PdM)" },
  { id: "IT", label: "IT / Infra / Sec" },
];

const FAMILY_NAME = {
  TPM: "Program Management",
  PdM: "Product Management",
  IT: "IT / Infrastructure",
};

export default function Enhancer() {
  const [input, setInput] = useState("");
  const [family, setFamily] = useState("auto");
  const [intensity, setIntensity] = useState("measured");
  const [bullets, setBullets] = useState(null);
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  async function enhance() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setBullets(null);
    setDetected(null);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), family, intensity }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setDetected(data.jobFamily);
      setBullets(data.bullets.map(parseBullet));
    } catch (e) {
      setError(e.message || "Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const onKey = submitOnCmdEnter(enhance);

  function updateSlot(bIdx, sIdx, val) {
    setBullets((prev) =>
      prev.map((segs, i) =>
        i === bIdx ? segs.map((s, j) => (j === sIdx ? { ...s, value: val } : s)) : segs
      )
    );
  }

  function copyOne(idx) {
    navigator.clipboard.writeText(bulletText(bullets[idx]));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1400);
  }

  function copyAll() {
    navigator.clipboard.writeText(bullets.map((s) => "• " + bulletText(s)).join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1400);
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 28, margin: 0, lineHeight: 1.1 }}>
          Raw bullets in. Numbers you fill, out.
        </h1>
        <p style={{ color: muted, fontSize: 14, marginTop: 10, maxWidth: 520 }}>
          Paste responsibilities or rough bullets. You get 3–5 rewritten ones — and every missing
          metric becomes a <span style={{ color: amber, fontWeight: 600 }}>highlighted field</span> you
          type your real number into.
        </p>
      </div>

      <FormulaNote />

      <LabeledTextarea
        label="Your bullets or responsibilities"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        placeholder="e.g. I was the TPM that helped coordinate the migration off our old monolith. Worked with security and three eng teams to keep it on track..."
        rows={4}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${line}`,
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 15,
          fontFamily: "inherit",
          color: ink,
          resize: "vertical",
          outline: "none",
          background: surface,
        }}
      />

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
        onClick={enhance}
        disabled={loading || !input.trim()}
        style={{
          marginTop: 16,
          width: "100%",
          background: loading || !input.trim() ? "#c9c4b8" : ink,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: display,
          cursor: loading || !input.trim() ? "default" : "pointer",
          transition: "background .15s",
        }}
      >
        {loading ? "Rewriting…" : "Enhance bullets"}
      </button>
      <div style={{ fontSize: 12, color: muted, marginTop: 8, textAlign: "center" }}>
        or press ⌘/Ctrl + Enter
      </div>

      {error && (
        <div style={{ marginTop: 16, color: "#9a3324", fontSize: 14, background: "#fbeae6", padding: "10px 14px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      {bullets && (
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: muted }}>
              {detected && (
                <>
                  Read as <span style={{ color: ink, fontWeight: 600 }}>{FAMILY_NAME[detected] || detected}</span> ·{" "}
                </>
              )}
              tab into the amber fields to drop in real numbers
            </div>
            <button
              onClick={copyAll}
              style={{ border: `1px solid ${line}`, background: copiedAll ? ink : surface, color: copiedAll ? "#fff" : ink, borderRadius: 7, fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer" }}
            >
              {copiedAll ? "Copied all" : "Copy all"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bullets.map((segs, i) => (
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
  );
}
