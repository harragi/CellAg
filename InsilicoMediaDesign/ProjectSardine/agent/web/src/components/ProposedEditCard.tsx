import type { ProposedEdit } from "../App.tsx";

export function ProposedEditCard({
  edit,
  resolved,
  resolution,
  onApply,
  onReject,
}: {
  edit: ProposedEdit;
  resolved: boolean;
  resolution?: "applied" | "rejected";
  onApply: () => void;
  onReject: () => void;
}) {
  return (
    <div className={`edit-card${resolved ? " resolved" : ""}`}>
      <div className="edit-card-head">
        <span className="edit-tag">{resolved ? resolution : "proposed edit"}</span>
        <span className="edit-target-file">→ {edit.target}/notes.md</span>
        <span className="edit-target" title={edit.section}>{edit.section}</span>
      </div>
      <div className="edit-card-body">
        <div className="edit-rationale">{edit.rationale}</div>
        <div className="edit-content">{edit.newContent}</div>
        {!resolved ? (
          <div className="edit-actions">
            <button className="reject" onClick={onReject}>reject</button>
            <button className="apply" onClick={onApply}>apply to notes.md</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
