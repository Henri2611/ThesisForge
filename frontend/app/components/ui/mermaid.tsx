"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart) return;
    setError(null);
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => setError(String(e)));
  }, [chart]);

  return (
    <div className="flex justify-center overflow-auto">
      <div ref={ref} className="mermaid" style={{ maxWidth: "100%" }} />
      {error && <p className="text-xs text-error mt-2">{error}</p>}
    </div>
  );
}
