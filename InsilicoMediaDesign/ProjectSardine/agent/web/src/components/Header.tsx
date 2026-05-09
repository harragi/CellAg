export type AgentStatus = "idle" | "running" | "error";

export function Header({
  status,
  model,
  displayName,
  description,
  onReset,
}: {
  status: AgentStatus;
  model: string;
  displayName: string;
  description: string;
  onReset: () => void;
}) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="brand-mark">CA</div>
        <div className="brand-text">
          <h1>{displayName}</h1>
          <div className="subtitle">{description}</div>
        </div>
      </div>
      <div className="header-right">
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
