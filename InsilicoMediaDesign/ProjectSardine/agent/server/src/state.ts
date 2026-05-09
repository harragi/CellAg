import type { ProjectKey } from "./projects.ts";

// Multi-project in-memory state for the MVP. Histories are keyed by project
// so switching projects in the UI doesn't pollute. Proposed edits include the
// project key so /api/notes/apply knows which file to write.

export type ProposedEdit = {
  id: string;
  project: ProjectKey;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export type Turn = { role: "user" | "assistant"; content: string };

export type AppState = {
  proposedEdits: Map<string, ProposedEdit>;
  histories: Map<ProjectKey, Turn[]>;
};

export const state: AppState = {
  proposedEdits: new Map(),
  histories: new Map(),
};

export function getHistory(project: ProjectKey): Turn[] {
  let h = state.histories.get(project);
  if (!h) {
    h = [];
    state.histories.set(project, h);
  }
  return h;
}

export function appendTurn(project: ProjectKey, turn: Turn): void {
  getHistory(project).push(turn);
}

export function resetHistory(project: ProjectKey): void {
  state.histories.set(project, []);
}

export function newEditId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
