export type AgentStatus = "idle" | "running" | "error";

export function Header({
  status,
  model,
  onReset,
}: {
  status: AgentStatus;
  model: string;
  onReset: () => void;
}) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="brand-mark">SR</div>
        <div className="brand-text">
          <h1>Sardine — Start With</h1>
          <div className="subtitle">Media Zero composition agent</div>
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
