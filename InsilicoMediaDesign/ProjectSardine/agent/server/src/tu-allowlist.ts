/**
 * Curated allowlist of ToolUniverse tools exposed to the agent.
 * Keeping this scoped (~40 tools) rather than wildcard (2,200+) so the
 * tool-definition tokens in the system prompt stay bounded.
 *
 * Add a tool here when its named ToolUniverse counterpart is more granular
 * than what our generic wrappers can do. Discover candidates with
 * `tu find '<topic>'` or `tu grep '<prefix>' --field name`.
 */

const NAMES = [
  // KEGG — 22 named tools in TU; pick the structural/functional ones.
  "kegg_search_pathway",
  "kegg_get_pathway_info",
  "kegg_find_genes",
  "kegg_get_gene_info",
  "kegg_list_organisms",
  "KEGG_get_compound",
  "KEGG_get_gene_pathways",
  "KEGG_get_pathway_genes",
  "KEGG_link_entries",
  "KEGG_search_network",
  "KEGG_get_network",

  // Ensembl — direct gene/sequence lookups (plus many OpenTargets/HPA tools
  // that consume Ensembl IDs but we treat as separate families).
  "ensembl_lookup_gene",
  "ensembl_get_sequence",

  // PubMed — more granular than our single-shot search_europepmc.
  "PubMed_search_articles",
  "PubMed_get_article",
  "PubMed_get_related",
  "PubMed_get_cited_by",

  // Preprints — arXiv + BioRxiv (BIO preprints, more relevant than arXiv).
  "ArXiv_search_papers",
  "ArXiv_get_pdf_snippets",
  "BioRxiv_list_recent_preprints",

  // BiGG — 7 named tools; cleaner than our generic endpoint wrapper.
  "BiGG_list_models",
  "BiGG_get_model",
  "BiGG_get_reaction",
  "BiGG_get_metabolite",
  "BiGG_search",

  // ChEBI + Rhea — direct compound and biochemical-reaction lookups.
  "ChEBI_search",
  "ChEBI_get_compound",
  "ChEBI_get_ontology_children",
  "Rhea_search_by_chebi",

  // UniProt — protein function, sequence, PTMs, subcellular localization.
  // New capability for the Sardine signaling axis & Hamster GPR work.
  "UniProt_search",
  "UniProt_get_entry_by_accession",
  "UniProt_get_function_by_accession",
  "UniProt_get_subcellular_location_by_accession",
  "UniProt_get_sequence_by_accession",

  // Reactome — mammalian-tuned pathway DB (alternative/complement to KEGG).
  "Reactome_map_uniprot_to_pathways",
  "Reactome_map_uniprot_to_reactions",

  // Pathway enrichment — capability we did not have before.
  "MetaboAnalyst_get_pathway_library",
  "MetaboAnalyst_pathway_enrichment",

  // Human Protein Atlas — gene expression by tissue/cell.
  "HPA_get_gene_basic_info_by_ensembl_id",

  // GlyGen — glycan structures. Critical for CHO mAb product-quality.
  "GlyGen_get_glycan",

  // CELLxGENE — single-cell metadata across 50M cells.
  "CELLxGENE_get_cell_metadata",
];

export const TU_ALLOWED_TOOLS = NAMES.map((n) => `mcp__tooluniverse__${n}`);
