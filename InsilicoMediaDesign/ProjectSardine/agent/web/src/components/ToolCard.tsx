import { useState } from "react";
import { metaFor, type ToolMeta } from "../lib/tools.ts";

export type ToolCall = {
  id: string;
  name: string; // e.g. "query_kegg" (mcp prefix already stripped)
  input?: unknown;
  result?: string;
  isError?: boolean;
};

export function ToolCard({ call, defaultOpen = false }: { call: ToolCall; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = metaFor(call.name);
  const summary = summarize(meta, call.input);
  const status = call.result === undefined ? "pending" : call.isError ? "err" : "ok";
  const stateLabel = status === "pending" ? "running…" : status === "err" ? "error" : "done";
  const cls = `tool-card${call.isError ? " error" : ""}`;
  const styleVars = {
    ["--c" as never]: `var(--t-${meta.color})`,
    ["--c-soft" as never]: `var(--t-${meta.color}-soft)`,
  } as React.CSSProperties;
  return (
    <div className={cls} style={styleVars} id={`tool-${call.id}`}>
      <div className="tool-card-head" onClick={() => setOpen((o) => !o)}>
        <span
          className="badge"
          style={{ background: `var(--t-${meta.color})` } as React.CSSProperties}
        >
          {meta.short}
        </span>
        <span className="tool-name">{meta.label}</span>
        <span className="tool-summary">{summary}</span>
        <span className={`tool-state ${status}`}>{stateLabel}</span>
        <span className={`chevron${open ? " open" : ""}`}>›</span>
      </div>
      {open ? (
        <div className="tool-card-body">
          {call.input !== undefined ? (
            <div className="input-block">
              <div className="input-block-title">input</div>
              <pre>{stringifyInput(call.input)}</pre>
            </div>
          ) : null}
          <div className="input-block">
            <div className="input-block-title">{call.isError ? "error" : "result"}</div>
            {renderResult(meta, call)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stringifyInput(input: unknown): string {
  if (typeof input === "string") return input;
  return JSON.stringify(input, null, 2);
}

/** A 1-line summary of the call for the collapsed-card row. */
function summarize(meta: ToolMeta, input: unknown): string {
  if (input === undefined || input === null) return "";
  if (typeof input === "string") return input;
  const obj = input as Record<string, unknown>;
  switch (meta.key) {
    case "query_kegg":
      return `${obj.operation ?? "?"} / ${obj.query ?? "?"}`;
    case "query_ensembl":
      return String(obj.endpoint ?? "");
    case "search_europepmc":
    case "arxiv_search":
      return String(obj.query ?? "");
    case "search_caail":
      return `/${String(obj.pattern ?? "")}/`;
    case "read_notes":
      return "read notes.md";
    case "propose_notes_edit":
      return String(obj.section ?? "");
  }
  return JSON.stringify(input).slice(0, 80);
}

/** Tool-specific result renderers — fall back to plain pre. */
function renderResult(meta: ToolMeta, call: ToolCall) {
  if (call.result === undefined) return <pre>{"(running)"}</pre>;
  if (call.isError) return <pre>{call.result}</pre>;
  switch (meta.key) {
    case "search_europepmc":
    case "arxiv_search":
    case "search_caail":
      return <NumberedRefList raw={call.result} colorVar={`--t-${meta.color}`} />;
    case "query_ensembl":
      return <EnsemblResult raw={call.result} />;
    default:
      return <pre>{call.result}</pre>;
  }
}

/** Parse "[1] Title\n  meta\n  abstract\n\n[2] ..." into card list. */
function NumberedRefList({ raw, colorVar }: { raw: string; colorVar: string }) {
  // Drop a possible heading line ("EuropePMC results for ...") and any trailing
  // whitespace before splitting on numbered entries.
  const stripped = raw.replace(/^[^\n]*?:\n+/, "");
  const items = stripped
    .split(/\n(?=\[\d+\])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return <pre>{raw}</pre>;
  return (
    <div className="result-list">
      {items.map((item, i) => {
        const lines = item.split(/\n+/).map((l) => l.trim());
        const m = /^\[(\d+)\]\s*(.*)/.exec(lines[0] ?? "");
        const num = m?.[1] ?? String(i + 1);
        const title = m?.[2] ?? lines[0] ?? "";
        const meta = lines[1] ?? "";
        const tail = lines.slice(2).join(" ");
        return (
          <div key={i} className="result-card">
            <span
              className="ref-tag"
              style={
                {
                  ["--c" as never]: `var(${colorVar})`,
                  ["--c-soft" as never]: colorVar.replace(/\)$/, "-soft)"),
                  background: colorVar.replace(/\)$/, "-soft)").replace("var(", "var("),
                  color: `var(${colorVar})`,
                } as React.CSSProperties
              }
            >
              {num}
            </span>
            <span className="title">{title}</span>
            {meta ? <div className="meta">{meta}</div> : null}
            {tail ? <div className="abstract">{tail}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

/** Render the first JSON object compactly when the body is an Ensembl JSON response. */
function EnsemblResult({ raw }: { raw: string }) {
  // Body looks like: "Ensembl /lookup/symbol/...:\n\n{json}"
  const idx = raw.indexOf("\n\n");
  const head = idx > 0 ? raw.slice(0, idx) : "";
  const body = idx > 0 ? raw.slice(idx + 2).trim() : raw;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    return <pre>{raw}</pre>;
  }
  if (Array.isArray(parsed)) {
    return (
      <>
        <div className="meta" style={{ marginBottom: 6 }}>{head}</div>
        <pre>{JSON.stringify(parsed, null, 2)}</pre>
      </>
    );
  }
  if (parsed && typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const interesting = ["display_name", "id", "biotype", "species", "description", "object_type"];
    const rows = interesting
      .map((k) => [k, o[k]] as const)
      .filter(([, v]) => v !== undefined);
    return (
      <>
        <div className="meta" style={{ marginBottom: 6 }}>{head}</div>
        <table className="markdown" style={{ width: "100%", margin: 0 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: 130, color: "var(--muted)" }}>{k}</td>
                <td>
                  <code>{typeof v === "string" ? v : JSON.stringify(v)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--muted)" }}>
            full JSON
          </summary>
          <pre>{JSON.stringify(parsed, null, 2)}</pre>
        </details>
      </>
    );
  }
  return <pre>{raw}</pre>;
}
