import { ALL_TOOLS } from "../lib/tools.ts";
import type { ExamplePrompt } from "../lib/config.ts";
import { ToolBadge } from "./Badge.tsx";

export function Welcome({
  examplePrompts,
  description,
  onPick,
}: {
  examplePrompts: ExamplePrompt[];
  description: string;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="welcome">
      <h2>Drive the design → validate loop, end-to-end.</h2>
      <p className="lede">
        {description} I read both <code>notes.md</code> files as canonical state, query
        scientific databases, and propose section edits inline that you review before they hit disk.
      </p>

      <h3>Tools available to the agent</h3>
      <div className="tools-grid">
        {ALL_TOOLS.map((t) => (
          <div key={t.key} className="tool-pill">
            <ToolBadge name={t.key} />
            <div className="info">
              <div className="name">{t.label}</div>
              <div className="blurb">{t.blurb}</div>
            </div>
          </div>
        ))}
      </div>

      <h3>Try one of these</h3>
      <div className="prompt-chips">
        {examplePrompts.map((s, i) => (
          <button key={i} className="prompt-chip" onClick={() => onPick(s.prompt)}>
            <strong>{s.label}.</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
