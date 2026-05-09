import { resolve } from "node:path";

// Resolve workspace paths from server/src/. Project-specific paths live in
// projects.ts; this file holds only cross-project constants.
const AGENT_DIR = resolve(import.meta.dir, "..", "..");
export const CELLAG_ROOT = resolve(AGENT_DIR, "..", "..", "..");

// Optional dependency — caail bibliography clone for local lookup.
export const CAAIL_PAPERS_PATH =
  process.env.CAAIL_PAPERS_PATH ??
  resolve(CELLAG_ROOT, "..", "tucca", "caail", "Papers.md");
