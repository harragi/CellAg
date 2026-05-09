import type { NotesTarget } from "./projects.ts";

export type ProposedEdit = {
  id: string;
  /** Which notes file this edit targets. */
  target: NotesTarget;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export type Turn = { role: "user" | "assistant"; content: string };

export type AppState = {
  proposedEdits: Map<string, ProposedEdit>;
  history: Turn[];
};

export const state: AppState = {
  proposedEdits: new Map(),
  history: [],
};

export function appendTurn(turn: Turn): void {
  state.history.push(turn);
}

export function resetHistory(): void {
  state.history = [];
}

export function newEditId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
