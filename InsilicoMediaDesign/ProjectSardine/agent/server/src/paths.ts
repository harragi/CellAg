import { resolve } from "node:path";

// Resolve workspace paths from server/src/.
const AGENT_DIR = resolve(import.meta.dir, "..", "..");
export const PROJECT_DIR = resolve(AGENT_DIR, "..");
export const CELLAG_ROOT = resolve(PROJECT_DIR, "..", "..");

export const NOTES_PATH = resolve(PROJECT_DIR, "notes.md");
export const SKILL_PATH = resolve(
  CELLAG_ROOT,
  ".claude/skills/sardine-start-with/SKILL.md"
);

// Optional dependency — caail bibliography clone for local lookup.
export const CAAIL_PAPERS_PATH =
  process.env.CAAIL_PAPERS_PATH ??
  resolve(CELLAG_ROOT, "..", "tucca", "caail", "Papers.md");
