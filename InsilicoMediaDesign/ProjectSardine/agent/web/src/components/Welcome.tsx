import { ALL_TOOLS } from "../lib/tools.ts";
import type { Project } from "../lib/projects.ts";
import { ToolBadge } from "./Badge.tsx";

export function Welcome({
  project,
  onPick,
}: {
  project: Project | null;
  onPick: (prompt: string) => void;
}) {
  const headline = project ? `Drive ${project.displayName}.` : "Drive the agent.";
  const lede = project
    ? project.description
    : "Read notes.md as canonical state, query scientific databases, propose section edits inline.";
  return (
    <div className="welcome">
      <h2>{headline}</h2>
      <p className="lede">
        {lede} I read <code>notes.md</code> as canonical state and propose edits inline that you
        review before they hit disk.
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
        {(project?.examplePrompts ?? []).map((s, i) => (
          <button key={i} className="prompt-chip" onClick={() => onPick(s.prompt)}>
            <strong>{s.label}.</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
