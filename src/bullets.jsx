import { ink, paper, muted, line, amber, surface, display, mono } from "./theme.js";

// Split a bullet string into plain text + editable {{slot}} segments.
export function parseBullet(text) {
  const parts = [];
  const re = /\{\{(.*?)\}\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "slot", value: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export const bulletText = (segs) => segs.map((s) => s.value).join("");

// Auto-sizing inline editable metric field.
export function Slot({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size={Math.max(value.length, 2)}
      spellCheck={false}
      aria-label="Editable metric"
      style={{
        fontFamily: mono,
        fontSize: "0.86em",
        color: amber,
        background: "#fbf1dc",
        border: "none",
        borderBottom: `1.5px dashed ${amber}`,
        borderRadius: "3px 3px 0 0",
        padding: "0 4px",
        margin: "0 1px",
        outline: "none",
        fontWeight: 600,
        minWidth: "1.5ch",
      }}
    />
  );
}

export function BulletCard({ index, segments, onSlotChange, onCopy, copied }) {
  return (
    <div
      style={{
        background: surface,
        border: `1px solid ${line}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        boxShadow: "0 1px 2px rgba(27,30,43,0.04)",
      }}
    >
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 13, color: muted, width: 22, flexShrink: 0, paddingTop: 2 }}>
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ flex: 1, lineHeight: 1.55, fontSize: 15, color: ink }}>
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <Slot key={i} value={seg.value} onChange={(v) => onSlotChange(i, v)} />
          )
        )}
      </div>
      <button
        onClick={onCopy}
        style={{
          flexShrink: 0,
          border: `1px solid ${line}`,
          background: copied ? ink : paper,
          color: copied ? "#fff" : muted,
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 10px",
          cursor: "pointer",
          transition: "all .15s",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// Shared chip style for role-family / voice toggles.
export function chipStyle(active) {
  return {
    border: `1px solid ${active ? ink : line}`,
    background: active ? ink : surface,
    color: active ? "#fff" : muted,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 13px",
    cursor: "pointer",
    transition: "all .15s",
  };
}

export const fieldLabelStyle = {
  fontSize: 11,
  color: muted,
  fontWeight: 600,
  marginBottom: 7,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

// A labeled textarea with the label properly associated for accessibility.
export function LabeledTextarea({ label, ...props }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ ...fieldLabelStyle, display: "block" }}>{label}</span>
      <textarea {...props} />
    </label>
  );
}

// The product's thesis, on the page. Every bullet is built this way; the last
// segment ties to the editable metric slots.
export function FormulaNote() {
  const seg = (t, accent) => (
    <span style={{ fontWeight: 600, color: accent ? amber : ink, whiteSpace: "nowrap" }}>{t}</span>
  );
  const arrow = (
    <span style={{ color: muted, margin: "0 8px", fontWeight: 400 }} aria-hidden="true">
      →
    </span>
  );
  return (
    <div
      style={{
        border: `1px solid ${line}`,
        background: surface,
        borderRadius: 10,
        padding: "11px 14px",
        marginBottom: 18,
      }}
    >
      <div style={{ ...fieldLabelStyle, marginBottom: 6 }}>The formula</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, display: "flex", flexWrap: "wrap", alignItems: "center" }}>
        {seg("Action verb")}
        {arrow}
        {seg("what + scope")}
        {arrow}
        {seg("how, technically")}
        {arrow}
        {seg("measurable impact", true)}
      </div>
      <div style={{ fontSize: 12.5, color: muted, marginTop: 6 }}>
        Every line earns its place this way. Numbers you don't have yet become fields you fill in.
      </div>
    </div>
  );
}
