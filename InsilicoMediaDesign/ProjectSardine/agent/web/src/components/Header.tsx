import type { Project, ProjectKey } from "../lib/projects.ts";

export type AgentStatus = "idle" | "running" | "error";

export function Header({
  status,
  model,
  projects,
  currentProject,
  onProjectChange,
  onReset,
}: {
  status: AgentStatus;
  model: string;
  projects: Project[];
  currentProject: ProjectKey | null;
  onProjectChange: (key: ProjectKey) => void;
  onReset: () => void;
}) {
  const current = projects.find((p) => p.key === currentProject) ?? projects[0];
  const mark = current?.shortName?.slice(0, 2).toUpperCase() ?? "CA";
  const projectVars = current
    ? ({
        ["--p" as never]: `var(--p-${current.color})`,
        ["--p-soft" as never]: `var(--p-${current.color}-soft)`,
        ["--p-deep" as never]: `var(--p-${current.color})`,
      } as React.CSSProperties)
    : {};
  return (
    <div className="header" style={projectVars}>
      <div className="header-left">
        <div className="brand-mark">{mark}</div>
        <div className="brand-text">
          <h1>{current?.displayName ?? "CellAg agent"}</h1>
          <div className="subtitle">{current?.description ?? ""}</div>
        </div>
      </div>
      <div className="header-right">
        {projects.length > 1 ? (
          <div className="project-switcher">
            <span>project</span>
            <select
              value={currentProject ?? ""}
              onChange={(e) => onProjectChange(e.target.value as ProjectKey)}
            >
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <span className="model-badge">{model}</span>
        <span className={`status-dot ${status}`}>
          {status === "running" ? "running…" : status === "error" ? "error" : "idle"}
        </span>
        <button className="btn-ghost" onClick={onReset}>
          reset
        </button>
      </div>
    </div>
  );
}
