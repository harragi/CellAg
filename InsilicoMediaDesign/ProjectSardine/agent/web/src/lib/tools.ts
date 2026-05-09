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
  | "propose_notes_edit"
  | "query_bigg"
  | "query_chebi"
  | "compute_metabolic_yields";

export type ToolKind = "database" | "literature" | "state" | "edit" | "model" | "compute" | "protein" | "pathway";

export type ToolMeta = {
  key: string;
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
    | "edit"
    | "bigg"
    | "chebi"
    | "yields"
    | "uniprot"
    | "reactome"
    | "tu";
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
  query_bigg: {
    key: "query_bigg",
    label: "BiGG",
    short: "BG",
    kind: "model",
    color: "bigg",
    blurb: "iCHO genome-scale models",
  },
  query_chebi: {
    key: "query_chebi",
    label: "ChEBI",
    short: "CB",
    kind: "database",
    color: "chebi",
    blurb: "compound IDs",
  },
  compute_metabolic_yields: {
    key: "compute_metabolic_yields",
    label: "yields",
    short: "YL",
    kind: "compute",
    color: "yields",
    blurb: "q_X & yield ratios",
  },
};

/**
 * Prefix-based fallback for ToolUniverse tool families. When the agent
 * calls a TU tool, the SDK reports its name like `KEGG_get_compound` (with
 * the `mcp__tooluniverse__` prefix already stripped). Map by family prefix
 * so the UI keeps consistent color coding without listing every TU tool.
 */
const TU_PREFIXES: { match: (name: string) => boolean; meta: Omit<ToolMeta, "label" | "short" | "key"> }[] = [
  { match: (n) => /^kegg/i.test(n), meta: { kind: "database", color: "kegg", blurb: "KEGG" } },
  { match: (n) => /^ensembl/i.test(n), meta: { kind: "database", color: "ensembl", blurb: "Ensembl" } },
  { match: (n) => /^pubmed/i.test(n), meta: { kind: "literature", color: "europepmc", blurb: "PubMed" } },
  { match: (n) => /^arxiv/i.test(n), meta: { kind: "literature", color: "arxiv", blurb: "arXiv" } },
  { match: (n) => /^biorxiv/i.test(n), meta: { kind: "literature", color: "arxiv", blurb: "bioRxiv" } },
  { match: (n) => /^bigg/i.test(n), meta: { kind: "model", color: "bigg", blurb: "BiGG" } },
  { match: (n) => /^chebi|^rhea/i.test(n), meta: { kind: "database", color: "chebi", blurb: "ChEBI / Rhea" } },
  { match: (n) => /^uniprot/i.test(n), meta: { kind: "protein", color: "uniprot", blurb: "UniProt" } },
  { match: (n) => /^reactome/i.test(n), meta: { kind: "pathway", color: "reactome", blurb: "Reactome" } },
  { match: (n) => /^metaboanalyst/i.test(n), meta: { kind: "pathway", color: "reactome", blurb: "MetaboAnalyst" } },
  { match: (n) => /^hpa/i.test(n), meta: { kind: "protein", color: "uniprot", blurb: "HPA" } },
  { match: (n) => /^glygen/i.test(n), meta: { kind: "model", color: "bigg", blurb: "GlyGen" } },
  { match: (n) => /^cellxgene/i.test(n), meta: { kind: "database", color: "tu", blurb: "CELLxGENE" } },
  { match: (n) => /^opentargets/i.test(n), meta: { kind: "database", color: "tu", blurb: "OpenTargets" } },
];

const FALLBACK: ToolMeta = {
  key: "_fallback",
  label: "tool",
  short: "?",
  kind: "database",
  color: "tu",
  blurb: "",
};

export function metaFor(rawName: string): ToolMeta {
  // Strip `mcp__<server>__` prefix if still present.
  const m = /^mcp__[^_]+__(.+)$/.exec(rawName);
  const key = m ? m[1] : rawName;
  // Exact match against our own custom-tool registry first.
  if (key in META) return META[key as ToolKey]!;
  // Then prefix match for TU families.
  for (const { match, meta } of TU_PREFIXES) {
    if (match(key)) {
      return {
        ...meta,
        key,
        label: key,
        short: shortBadgeFor(key),
      };
    }
  }
  return { ...FALLBACK, label: key, short: key.slice(0, 2).toUpperCase() };
}

/** Two-letter badge from a tool name. Splits on underscore and uses the
 *  initials of the first up to two segments — e.g. KEGG_get_compound → KG,
 *  PubMed_search_articles → PS. */
function shortBadgeFor(name: string): string {
  const parts = name.split("_").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export const ALL_TOOLS: ToolMeta[] = Object.values(META);
