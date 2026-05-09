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

export type BenchComponents = {
  glucose_mM: number;
  glutamine_mM: number;
  asparagine_mM: number;
  insulin_mg_L: number;
  igf1_ng_mL: number;
  selenium_nM: number;
  naCl_mM: number;
  initial_vcd_million_per_ml: number;
  time_horizon_hours: number;
};

export type BenchData = {
  id: string;
  label: string;
  rationale: string;
  components: BenchComponents;
  proposedAt: number;
};

export type Turn = { role: "user" | "assistant"; content: string };

export type AppState = {
  proposedEdits: Map<string, ProposedEdit>;
  benches: Map<string, BenchData>;
  history: Turn[];
};

export const state: AppState = {
  proposedEdits: new Map(),
  benches: new Map(),
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
