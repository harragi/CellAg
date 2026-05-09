import { ALL_TOOLS } from "../lib/tools.ts";
import { ToolBadge } from "./Badge.tsx";

const SUGGESTIONS: { label: React.ReactNode; prompt: string }[] = [
  {
    label: (
      <>
        <strong>Build a Media Zero for rainbow trout muscle cells.</strong> Use the system-knowledge
        axis: pull pathways from KEGG, check trout receptors in Ensembl, cite caail. Then propose a
        notes.md edit.
      </>
    ),
    prompt:
      "Build a Media Zero formulation for rainbow trout muscle cells. Use the system-knowledge axis: pull metabolic pathways from KEGG and check what receptors rainbow trout expresses for the candidate growth factors. Cite caail papers where relevant. Then propose an edit to notes.md capturing the recommendation.",
  },
  {
    label: (
      <>
        <strong>What's the current state of Project Sardine?</strong> Summarize where Media Zero and
        Media Thrive stand and what's blocking progress.
      </>
    ),
    prompt:
      "What's the current state of Project Sardine? Summarize where Media Zero and Media Thrive stand and what's blocking progress.",
  },
  {
    label: (
      <>
        <strong>Survey caail and arXiv for serum-free fish-cell media.</strong> Return a short
        bibliography I could cite in §11 of notes.md.
      </>
    ),
    prompt:
      "Survey caail and arXiv for serum-free fish-cell media literature. Return a short bibliography I could add to §11 of notes.md.",
  },
];

export function Welcome({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="welcome">
      <h2>Drive the Media Zero design loop.</h2>
      <p className="lede">
        I read <code>notes.md</code> as canonical state, query scientific databases via custom tools,
        and propose section edits inline. Approve or reject each edit; nothing reaches disk without
        your click.
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
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="prompt-chip" onClick={() => onPick(s.prompt)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
