import { useEffect, useMemo, useState } from "react";
import { ink, paper, muted, line, amber, surface, display, mono } from "./theme.js";
import { loadApplications, saveApplications, uid, normalizeApp } from "./storage.js";
import { useIsNarrow } from "./hooks.js";

const STAGES = [
  { id: "applied", label: "Applied", dot: "#8a8f9c", bg: "#ecebe4", fg: "#4b4f5a" },
  { id: "phone", label: "Phone Screen", dot: "#2f6fb0", bg: "#e4eef7", fg: "#23568a" },
  { id: "hm", label: "Hiring Manager", dot: "#6a4ca3", bg: "#ece6f5", fg: "#4f3a7d" },
  { id: "onsite", label: "On-site", dot: "#bd7a16", bg: "#f6ecd6", fg: "#8a5a10" },
  { id: "offer", label: "Offer", dot: "#3f8f4f", bg: "#e2f0e4", fg: "#2c6b39" },
  { id: "rejected", label: "Rejected", dot: "#b0453a", bg: "#f5e2df", fg: "#8a3328" },
  { id: "withdrawn", label: "Withdrawn", dot: "#8a8f9c", bg: "#ecebe4", fg: "#4b4f5a" },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const ACTIVE = new Set(["applied", "phone", "hm", "onsite"]);

const ROUND_TYPES = [
  { id: "phone", label: "Phone" },
  { id: "hm", label: "Hiring Manager" },
  { id: "onsite", label: "On-site" },
  { id: "other", label: "Other" },
];
const ROUND_LABEL = Object.fromEntries(ROUND_TYPES.map((r) => [r.id, r.label]));

const FILTERS = [
  { id: "active", label: "Active" },
  { id: "all", label: "All" },
  { id: "offer", label: "Offers" },
  { id: "archived", label: "Archived" },
];

// ---------- helpers ----------
const todayStr = () => new Date().toISOString().slice(0, 10);

function daysSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function isStale(app) {
  return ACTIVE.has(app.status) && daysSince(app.updatedAt) > 14;
}

function nextRound(app) {
  const t = todayStr();
  return (
    app.rounds
      .filter((r) => r.date && r.date >= t)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
  );
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(apps) {
  const maxRounds = apps.reduce((n, a) => Math.max(n, a.rounds.length), 0);
  const headers = ["Company", "Location", "Job Title", "Pay Range", "JD", "Status"];
  for (let i = 1; i <= maxRounds; i++) {
    headers.push(`Round ${i} Type`, `Round ${i} Date`, `Round ${i} Notes`);
  }
  const rows = apps.map((a) => {
    const row = [a.company, a.location, a.title, a.payRange, a.jdUrl, STAGE[a.status]?.label || a.status];
    for (let i = 0; i < maxRounds; i++) {
      const r = a.rounds[i];
      row.push(r ? ROUND_LABEL[r.type] || r.type : "", r?.date || "", r?.notes || "");
    }
    return row;
  });
  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
  download("job-applications.csv", csv, "text/csv;charset=utf-8");
}

// ---------- small UI pieces ----------
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${line}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "inherit",
  color: ink,
  background: surface,
  outline: "none",
};

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 11,
          color: muted,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 5,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Badge({ stage }) {
  const s = STAGE[stage] || STAGE.applied;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.fg,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />
      {s.label}
    </span>
  );
}

// ---------- main ----------
export default function Tracker() {
  const [apps, setApps] = useState(loadApplications);
  const [filter, setFilter] = useState("active");
  const [openId, setOpenId] = useState(null);
  const narrow = useIsNarrow();

  useEffect(() => {
    saveApplications(apps);
  }, [apps]);

  const patchApp = (id, patch) =>
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a))
    );

  const patchRound = (appId, roundId, patch) =>
    setApps((prev) =>
      prev.map((a) =>
        a.id !== appId
          ? a
          : {
              ...a,
              updatedAt: new Date().toISOString(),
              rounds: a.rounds.map((r) => (r.id === roundId ? { ...r, ...patch } : r)),
            }
      )
    );

  const addRound = (appId) =>
    setApps((prev) =>
      prev.map((a) =>
        a.id !== appId
          ? a
          : {
              ...a,
              updatedAt: new Date().toISOString(),
              rounds: [...a.rounds, { id: uid(), type: "onsite", date: "", notes: "" }],
            }
      )
    );

  const deleteRound = (appId, roundId) =>
    setApps((prev) =>
      prev.map((a) =>
        a.id !== appId ? a : { ...a, rounds: a.rounds.filter((r) => r.id !== roundId) }
      )
    );

  function addApp() {
    const now = new Date().toISOString();
    const app = normalizeApp({ id: uid(), status: "applied", createdAt: now, updatedAt: now });
    setApps((prev) => [app, ...prev]);
    setOpenId(app.id);
    if (filter === "offer" || filter === "archived") setFilter("active");
  }

  function deleteApp(id) {
    const a = apps.find((x) => x.id === id);
    const name = a?.company || "this application";
    if (window.confirm(`Delete ${name}? This can't be undone.`)) {
      setApps((prev) => prev.filter((x) => x.id !== id));
    }
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("not an array");
        if (window.confirm(`Replace your current ${apps.length} record(s) with ${data.length} from the file?`)) {
          setApps(data.map(normalizeApp));
        }
      } catch {
        window.alert("That file isn't a valid Plume export.");
      }
    };
    reader.readAsText(file);
  }

  const stats = useMemo(() => {
    const active = apps.filter((a) => ACTIVE.has(a.status)).length;
    const interviewing = apps.filter((a) => ["phone", "hm", "onsite"].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === "offer").length;
    return { total: apps.length, active, interviewing, offers };
  }, [apps]);

  const visible = useMemo(() => {
    const list = apps.filter((a) => {
      if (filter === "all") return true;
      if (filter === "active") return ACTIVE.has(a.status);
      if (filter === "offer") return a.status === "offer";
      if (filter === "archived") return a.status === "rejected" || a.status === "withdrawn";
      return true;
    });
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [apps, filter]);

  const chip = (active) => ({
    border: `1px solid ${active ? ink : line}`,
    background: active ? ink : surface,
    color: active ? "#fff" : muted,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    padding: "6px 13px",
    cursor: "pointer",
  });

  const ghostBtn = {
    border: `1px solid ${line}`,
    background: surface,
    color: ink,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    padding: "7px 12px",
    cursor: "pointer",
  };

  return (
    <div>
      {/* stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          { n: stats.total, l: "Tracked" },
          { n: stats.active, l: "Active" },
          { n: stats.interviewing, l: "Interviewing" },
          { n: stats.offers, l: "Offers" },
        ].map((s) => (
          <div
            key={s.l}
            style={{
              flex: "1 1 120px",
              background: surface,
              border: `1px solid ${line}`,
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontFamily: display, fontSize: 24, fontWeight: 700, color: ink }}>{s.n}</div>
            <div style={{ fontSize: 12, color: muted, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.id} style={chip(filter === f.id)} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button style={ghostBtn} onClick={() => exportCsv(apps)} disabled={!apps.length}>
            Export CSV
          </button>
          <button
            style={ghostBtn}
            onClick={() => download("job-applications.json", JSON.stringify(apps, null, 2), "application/json")}
            disabled={!apps.length}
          >
            Export JSON
          </button>
          <label style={{ ...ghostBtn, display: "inline-block" }}>
            Import
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files[0]) importJson(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={addApp}
            style={{
              border: "none",
              background: ink,
              color: "#fff",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              cursor: "pointer",
              fontFamily: display,
            }}
          >
            + Add application
          </button>
        </div>
      </div>

      {/* list */}
      {visible.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${line}`,
            borderRadius: 12,
            padding: "40px 20px",
            textAlign: "center",
            color: muted,
          }}
        >
          {apps.length === 0 ? (
            <>
              <div style={{ fontWeight: 600, color: ink, marginBottom: 4 }}>No applications yet</div>
              <div style={{ fontSize: 14 }}>Add your first one to start tracking the pipeline.</div>
            </>
          ) : (
            <div style={{ fontSize: 14 }}>Nothing in this filter. Try “All”.</div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((app) => {
            const open = openId === app.id;
            const next = nextRound(app);
            return (
              <div
                key={app.id}
                style={{ background: surface, border: `1px solid ${line}`, borderRadius: 12, overflow: "hidden" }}
              >
                {/* collapsed header row */}
                <div
                  onClick={() => setOpenId(open ? null : app.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 16px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: ink, fontSize: 15 }}>
                        {app.company || "Untitled company"}
                      </span>
                      {app.title && <span style={{ color: muted, fontSize: 14 }}>· {app.title}</span>}
                      {isStale(app) && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#b0453a" }}>● stale</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                      {[app.location, app.payRange].filter(Boolean).join(" · ")}
                      {next && (
                        <span style={{ color: amber, fontWeight: 600 }}>
                          {(app.location || app.payRange) ? " · " : ""}
                          next {ROUND_LABEL[next.type]} {fmtDate(next.date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge stage={app.status} />
                  <span style={{ color: muted, fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
                    ›
                  </span>
                </div>

                {/* expanded editor */}
                {open && (
                  <div style={{ borderTop: `1px solid ${line}`, padding: 16, background: "#fbfaf7" }}>
                    <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <Field label="Company">
                        <input style={inputStyle} value={app.company} onChange={(e) => patchApp(app.id, { company: e.target.value })} />
                      </Field>
                      <Field label="Job title">
                        <input style={inputStyle} value={app.title} onChange={(e) => patchApp(app.id, { title: e.target.value })} />
                      </Field>
                      <Field label="Location">
                        <input style={inputStyle} value={app.location} onChange={(e) => patchApp(app.id, { location: e.target.value })} placeholder="Hybrid, SF" />
                      </Field>
                      <Field label="Pay range">
                        <input style={inputStyle} value={app.payRange} onChange={(e) => patchApp(app.id, { payRange: e.target.value })} placeholder="$180k–220k" />
                      </Field>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <Field label="Job description link">
                        <input style={inputStyle} value={app.jdUrl} onChange={(e) => patchApp(app.id, { jdUrl: e.target.value })} placeholder="https://…" />
                      </Field>
                    </div>

                    {/* status */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>
                        Status
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {STAGES.map((s) => {
                          const on = app.status === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => patchApp(app.id, { status: s.id })}
                              style={{
                                border: `1px solid ${on ? s.dot : line}`,
                                background: on ? s.bg : surface,
                                color: on ? s.fg : muted,
                                borderRadius: 999,
                                fontSize: 12.5,
                                fontWeight: 600,
                                padding: "5px 11px",
                                cursor: "pointer",
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* rounds */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                          Interview rounds
                        </div>
                        <button style={{ ...ghostBtn, padding: "5px 10px", fontSize: 12 }} onClick={() => addRound(app.id)}>
                          + Add round
                        </button>
                      </div>
                      {app.rounds.length === 0 ? (
                        <div style={{ fontSize: 13, color: muted, fontStyle: "italic" }}>
                          No rounds logged yet.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {app.rounds.map((r) => (
                            <div key={r.id} style={{ border: `1px solid ${line}`, borderRadius: 10, padding: 12, background: surface }}>
                              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                <select
                                  value={r.type}
                                  onChange={(e) => patchRound(app.id, r.id, { type: e.target.value })}
                                  style={{ ...inputStyle, width: "auto", flex: "0 0 auto" }}
                                >
                                  {ROUND_TYPES.map((t) => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={r.date}
                                  onChange={(e) => patchRound(app.id, r.id, { date: e.target.value })}
                                  style={{ ...inputStyle, width: "auto", flex: "0 0 auto", fontFamily: mono }}
                                />
                                <button
                                  onClick={() => deleteRound(app.id, r.id)}
                                  style={{ marginLeft: "auto", border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 13 }}
                                >
                                  Remove
                                </button>
                              </div>
                              <textarea
                                value={r.notes}
                                onChange={(e) => patchRound(app.id, r.id, { notes: e.target.value })}
                                placeholder="What was covered, who you met, how it went…"
                                rows={2}
                                style={{ ...inputStyle, resize: "vertical" }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: muted }}>
                        Updated {fmtDate(app.updatedAt.slice(0, 10))}
                      </span>
                      <button
                        onClick={() => deleteApp(app.id)}
                        style={{ border: "none", background: "transparent", color: "#b0453a", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                      >
                        Delete application
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 12, color: muted, marginTop: 18, lineHeight: 1.5 }}>
        Saved in this browser only. Use <strong>Export</strong> regularly to back up — clearing site
        data will erase your tracker.
      </p>
    </div>
  );
}
