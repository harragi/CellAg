// Shared in-memory state for the MVP. Single-session by design — replace with
// a per-session map when we want multi-tab support.

export type ProposedEdit = {
  id: string;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export type AppState = {
  proposedEdits: Map<string, ProposedEdit>;
  // Conversation history for the current session. Reset by POST /api/reset.
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export const state: AppState = {
  proposedEdits: new Map(),
  history: [],
};

export function newEditId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
