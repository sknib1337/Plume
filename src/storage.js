// Tiny localStorage wrapper for the job tracker. Data lives in the browser only —
// no server, no account. Export/import (in the UI) is how you back it up or move it.
const KEY = "plume:applications";

export function loadApplications() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeApp) : [];
  } catch {
    return [];
  }
}

export function saveApplications(apps) {
  try {
    localStorage.setItem(KEY, JSON.stringify(apps));
  } catch (e) {
    // Most likely quota or a privacy mode that blocks storage.
    console.error("[plume] couldn't save applications:", e);
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Ensure every imported/loaded record has the fields the UI expects.
export function normalizeApp(a = {}) {
  const now = new Date().toISOString();
  return {
    id: a.id || uid(),
    company: a.company || "",
    location: a.location || "",
    title: a.title || "",
    payRange: a.payRange || "",
    jdUrl: a.jdUrl || "",
    status: a.status || "applied",
    createdAt: a.createdAt || now,
    updatedAt: a.updatedAt || now,
    rounds: Array.isArray(a.rounds)
      ? a.rounds.map((r) => ({
          id: r.id || uid(),
          type: r.type || "other",
          date: r.date || "",
          notes: r.notes || "",
        }))
      : [],
  };
}
