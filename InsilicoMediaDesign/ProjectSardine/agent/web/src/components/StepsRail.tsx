import { metaFor } from "../lib/tools.ts";
import type { ToolCall } from "./ToolCard.tsx";

export function StepsRail({ calls }: { calls: ToolCall[] }) {
  return (
    <div className="steps-rail">
      <h2>Agent steps</h2>
      {calls.length === 0 ? (
        <div className="steps-empty">No tool calls yet. Send a message to start.</div>
      ) : (
        <div>
          {calls.map((c, i) => <Step key={c.id} call={c} index={i + 1} />)}
        </div>
      )}
    </div>
  );
}

function Step({ call, index }: { call: ToolCall; index: number }) {
  const meta = metaFor(call.name);
  const status = call.result === undefined ? "running" : call.isError ? "error" : "ok";
  const styleVars = {
    ["--c" as never]: `var(--t-${meta.color})`,
  } as React.CSSProperties;
  const summary = summary1(call.input);
  return (
    <div
      className={`step ${status}`}
      style={styleVars}
      onClick={() => {
        const el = document.getElementById(`tool-${call.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      <div className="step-label">{index}. {meta.label}</div>
      {summary ? <div className="step-blurb">{summary}</div> : null}
      <div className={`step-status ${status === "ok" ? "ok" : status === "error" ? "error" : ""}`}>
        {status === "running" ? "running…" : status === "error" ? "error" : "done"}
      </div>
    </div>
  );
}

function summary1(input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input === "string") return input.slice(0, 40);
  const obj = input as Record<string, unknown>;
  for (const k of ["query", "pattern", "endpoint", "section", "operation"]) {
    const v = obj[k];
    if (typeof v === "string") return v.slice(0, 40);
  }
  return JSON.stringify(obj).slice(0, 40);
}
