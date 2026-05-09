/**
 * Per-tool metadata used for color coding, badges, and result rendering.
 * Stable single source of truth — Chat, StepsRail, ToolCard all consume this.
 */

export type ToolKey =
  | "query_kegg"
  | "query_ensembl"
  | "search_europepmc"
  | "arxiv_search"
  | "search_caail"
  | "read_notes"
  | "propose_notes_edit";

export type ToolKind = "database" | "literature" | "state" | "edit";

export type ToolMeta = {
  key: ToolKey;
  label: string;
  short: string; // 2-3 char letter badge
  kind: ToolKind;
  /** CSS color slot — matches CSS variables --t-<color> */
  color:
    | "kegg"
    | "ensembl"
    | "europepmc"
    | "arxiv"
    | "caail"
    | "notes"
    | "edit";
  blurb: string;
};

const META: Record<ToolKey, ToolMeta> = {
  query_kegg: {
    key: "query_kegg",
    label: "KEGG",
    short: "KG",
    kind: "database",
    color: "kegg",
    blurb: "metabolic pathways",
  },
  query_ensembl: {
    key: "query_ensembl",
    label: "Ensembl",
    short: "EN",
    kind: "database",
    color: "ensembl",
    blurb: "genome / receptors",
  },
  search_europepmc: {
    key: "search_europepmc",
    label: "EuropePMC",
    short: "PM",
    kind: "literature",
    color: "europepmc",
    blurb: "PubMed + preprints",
  },
  arxiv_search: {
    key: "arxiv_search",
    label: "arXiv",
    short: "AX",
    kind: "literature",
    color: "arxiv",
    blurb: "preprints",
  },
  search_caail: {
    key: "search_caail",
    label: "caail",
    short: "CL",
    kind: "literature",
    color: "caail",
    blurb: "curated bibliography",
  },
  read_notes: {
    key: "read_notes",
    label: "read notes.md",
    short: "RN",
    kind: "state",
    color: "notes",
    blurb: "canonical state",
  },
  propose_notes_edit: {
    key: "propose_notes_edit",
    label: "propose edit",
    short: "PE",
    kind: "edit",
    color: "edit",
    blurb: "stage notes.md change",
  },
};

const FALLBACK: ToolMeta = {
  key: "read_notes",
  label: "tool",
  short: "?",
  kind: "database",
  color: "kegg",
  blurb: "",
};

export function metaFor(rawName: string): ToolMeta {
  // Strip `mcp__science__` prefix if still present.
  const m = /^mcp__[^_]+__(.+)$/.exec(rawName);
  const key = (m ? m[1] : rawName) as ToolKey;
  return META[key] ?? { ...FALLBACK, label: rawName, short: rawName.slice(0, 2).toUpperCase() };
}

export const ALL_TOOLS: ToolMeta[] = Object.values(META);
