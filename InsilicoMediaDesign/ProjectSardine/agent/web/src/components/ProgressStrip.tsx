import { useEffect, useState } from "react";
import type { AgentStatus } from "./Header.tsx";
import type { ToolCall } from "./ToolCard.tsx";
import { metaFor } from "../lib/tools.ts";

/**
 * Live progress strip below the header. Shows running indicator, tool count,
 * elapsed time, and the currently-active tool. Hides when status === "idle"
 * with a fade-out so quick turns don't flicker.
 */
export function ProgressStrip({
  status,
  toolCalls,
  runStartedAt,
}: {
  status: AgentStatus;
  toolCalls: ToolCall[];
  runStartedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [status]);

  if (status !== "running" || runStartedAt === null) return null;

  const elapsedSec = Math.max(0, Math.floor((now - runStartedAt) / 1000));
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const elapsed = minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;

  const inFlight = toolCalls.filter((c) => c.result === undefined);
  const completed = toolCalls.length - inFlight.length;
  const current = inFlight[inFlight.length - 1];
  const currentMeta = current ? metaFor(current.name) : null;

  return (
    <div className="progress-strip" role="status" aria-live="polite">
      <span className="ps-pulse" aria-hidden="true" />
      <span className="ps-label">running</span>
      <span className="ps-sep">·</span>
      <span className="ps-stat">
        <strong>{completed}</strong>/{toolCalls.length} tools
      </span>
      <span className="ps-sep">·</span>
      <span className="ps-stat ps-time">{elapsed}</span>
      {current && currentMeta ? (
        <>
          <span className="ps-sep">·</span>
          <span className="ps-current">
            <span
              className="ps-current-badge"
              style={{ background: `var(--t-${currentMeta.color})` } as React.CSSProperties}
            >
              {currentMeta.short}
            </span>
            <span className="ps-current-name">{current.name}</span>
            <span className="ps-current-spinner" />
          </span>
        </>
      ) : null}
    </div>
  );
}
