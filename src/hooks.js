import { useState, useEffect } from "react";

// True when the viewport is at/below maxWidth. Used to collapse two-column
// layouts to a single column on phones.
export function useIsNarrow(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

// Fires `fn` on Cmd+Enter / Ctrl+Enter. Attach to a textarea's onKeyDown.
export function submitOnCmdEnter(fn) {
  return (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      fn();
    }
  };
}
