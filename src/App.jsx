import { useState } from "react";
import { ink, paper, muted, line, amber, surface, display } from "./theme.js";
import Tailor from "./Tailor.jsx";
import Enhancer from "./Enhancer.jsx";
import Tracker from "./Tracker.jsx";

const TABS = [
  { id: "tailor", label: "Tailor", view: Tailor },
  { id: "enhance", label: "Enhance", view: Enhancer },
  { id: "tracker", label: "Tracker", view: Tracker },
];

export default function App() {
  const [tab, setTab] = useState("tailor");
  const Active = (TABS.find((t) => t.id === tab) || TABS[0]).view;

  return (
    <div style={{ background: paper, minHeight: "100%", padding: "26px 20px 56px", fontFamily: "'Inter', system-ui, sans-serif", color: ink }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 26, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
              <path d="M37 7 C26 15 20 31 23 44 C25 53 29 57 32 58 C35 57 45 50 47 34 C49 23 45 14 37 7 Z" fill={ink} />
              <path d="M32 58 C32 44 33 24 36 11" stroke="#d99a2b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              <path d="M32 58 L29 63" stroke={ink} strokeWidth="2.8" strokeLinecap="round" fill="none" />
              <g stroke="#d99a2b" strokeWidth="1.5" strokeLinecap="round">
                <path d="M33 45 l-8 -2" />
                <path d="M34 34 l-9 -2" />
                <path d="M35 23 l-7 -2" />
                <path d="M33 47 l8 -4" />
                <path d="M34 36 l9 -4" />
                <path d="M35 25 l7 -3" />
              </g>
            </svg>
            <span style={{ fontFamily: display, fontWeight: 700, fontSize: 18, color: ink }}>Plume</span>
            <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: amber, fontWeight: 600 }}>
              for the job hunt
            </span>
          </div>
          <nav style={{ display: "inline-flex", background: surface, border: `1px solid ${line}`, borderRadius: 999, padding: 3 }}>
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    border: "none",
                    background: on ? ink : "transparent",
                    color: on ? "#fff" : muted,
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 600,
                    padding: "7px 16px",
                    cursor: "pointer",
                    fontFamily: display,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </header>

        <Active />
      </div>
    </div>
  );
}
