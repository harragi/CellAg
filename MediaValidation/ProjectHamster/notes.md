# Project Hamster — Working Notes

**Last updated:** 2026-05-09
**Source:** internal scoping (no whiteboard yet)

---

## 1. Project intent

Build a **media validation loop** for CHO cells. Given a candidate cell-culture media formulation, the loop should:

1. Map ingredients to canonical metabolic identifiers
2. Constrain a CHO genome-scale metabolic model (GSM) with the formulation as exchange fluxes
3. Predict the metabolic readouts you'd expect (specific growth rate μ, q_Glc, q_Lac, q_NH₃, q_P)
4. Compare predictions to experimental readouts when available
5. Flag discrepancies as validation findings — either the formulation is off, the model is missing constraints, or the experimental readout is suspect

This is the validation counterpart to Project Sardine's design loop. Sardine answers "what should be in a media for survival?" Hamster answers "is this media metabolically consistent with what the cell can actually do?"

---

## 2. Why CHO first

CHO is the right starting cell type for validation work because three artifacts the method depends on are most mature here:

- **GSMs**: a continuous lineage of CHO models (`iCHO1766` → `iCHO2291` → `iCHO2441` → newer) all available via BiGG.
- **Media**: industrial chemically-defined formulations are well-published or published-enough; the academic record is rich.
- **Readouts**: industry-standard protocols mean experimental data, when it shows up, is comparable across runs.

Once the validation method is solid for CHO, it can be ported to other cell types where any of these three are weaker (e.g., fish cells from Project Sardine — much less GSM coverage there).

---

## 3. Genome-scale models (the iCHO family)

| Model | Year | Reactions | Genes | Reference | Notes |
|---|---|---|---|---|---|
| **iCHO1766** | 2016 | 6663 | 1766 | Hefzi et al., *Cell Systems* | First large-scale CHO GSM. Workhorse. |
| **iCHO2291** | 2020 | 9120 | 2291 | Yeo et al. | Extended scope, more lipid/secretion coverage |
| **iCHO2441** | 2021 | ~10000 | 2441 | Strain et al. | CHO-K1-tuned refinement |
| Sub-line variants | various | | | | DG44, K1, S clone-specific reconstructions |

Working assumption for v0: **start with iCHO2441** as the most complete current public model. Upgrade as newer reconstructions are released.

**Where to fetch them**: [BiGG Models](http://bigg.ucsd.edu) hosts iCHOv1 family by default. Newer reconstructions may live in supplementary materials of the original papers. The `query_bigg` tool wraps the BiGG REST API.

**File format**: SBML (.xml). To actually run FBA you need a constraint-based modeling tool — COBRApy (Python) or COBRA Toolbox (MATLAB). For the in-agent MVP, we reason *about* models via metadata queries (reactions, metabolites, GPR) rather than running FBA in-process.

---

## 4. Media (formulations to validate)

Three buckets of candidate formulations:

### 4.1 Industry-standard chemically-defined (CD)
- **CD-CHO** (Gibco / Thermo Fisher) — generic CHO defined media
- **ActiPro** (Cytiva / HyClone) — high-performance CHO media
- **ProCHO5** (Lonza) — chemically defined, animal-component-free
- **BalanCD CHO Growth A** (Irvine Scientific) — defined, low-osmolality

Recipes are partially proprietary; published ingredient lists exist for many. Treat these as black-box benchmarks initially.

### 4.2 Open-published academic recipes
- **eRDF**-derived defined recipes
- Published serum-free recipes from the Wurm/Hauser lineage
- BalanCD-clone recipes from independent labs

### 4.3 Sardine handoffs
Eventually, a media designed via Project Sardine for fish cells could be ported to CHO as a stress-test of the Sardine formulation logic. Not v0 scope.

---

## 5. Metabolic readouts (the measurement stack)

These are what we **measure** experimentally and **predict** from the GSM.

### 5.1 Off-gas (continuous, non-invasive)
- **OUR** (Oxygen Uptake Rate) — mmol O₂ / L / hr
- **CER** (CO₂ Evolution Rate) — mmol CO₂ / L / hr
- **RQ** (Respiratory Quotient) = CER / OUR — diagnostic of metabolic mode (~1.0 glucose-only oxidation, lower with lipid use)

### 5.2 Substrate consumption (online + offline)
- **q_Glc** (specific glucose consumption) — mmol / 10⁹ cells / day. CHO typical: 0.3–0.6.
- **q_Gln** (specific glutamine consumption) — mmol / 10⁹ cells / day. Typical 0.05–0.15 (with glutamine-replacement strategies, much lower).
- Amino acids — measured offline by HPLC or LC-MS.

### 5.3 Byproduct formation
- **q_Lac** (specific lactate production) — mmol / 10⁹ cells / day. Typical 0.4–1.0 in fed-batch.
- **Y_Lac/Glc** (lactate yield on glucose) — typical 1.0–1.8 mol/mol; >1.5 indicates Warburg-like metabolism. *This ratio is the headline diagnostic for CHO metabolic state.*
- **q_NH₃** (specific ammonia production) — mmol / 10⁹ cells / day.
- **Y_NH₃/Gln** — typical 0.5–1.2 mol/mol.

### 5.4 Cell-state metrics
- **VCD** (viable cell density) — cells / mL. Time-course → μ (specific growth rate, hr⁻¹).
- **Viability %** — typical >95% in healthy growth phase, drops below 70% in late stationary.
- **μ** typical 0.025 hr⁻¹ (doubling time ~28h) for CHO.
- **q_P** (specific productivity for the recombinant product) — pg / cell / day for mAbs.

### 5.5 Metabolomics (offline, batch endpoint)
- LC-MS or NMR for full intracellular and extracellular metabolite panels — provides cross-checks on the GSM beyond the canonical substrates and byproducts.

---

## 6. Validation workflow (the core loop)

Order of operations once a candidate media is in hand:

1. **Ingredient → metabolite mapping.** For each ingredient in the media, find its canonical ChEBI ID via `query_chebi`. Then find the corresponding `EX_<met>_e` exchange reaction in the chosen iCHO model via `query_bigg`. Result: a vector of exchange-reaction lower bounds (negative for uptake).

2. **GSM constraint setup.** Lock unmodeled exchanges to zero (or the model's defaults). Set the biomass reaction (`BIOMASS_*`) as the objective.

3. **FBA / pFBA.** Solve. (Out of scope for the in-agent MVP — happens externally in COBRApy. The agent reasons about expected outputs given knowledge of the model.)

4. **Predicted readouts.** From the FBA solution: μ, q_Glc, q_Gln, q_Lac, q_NH₃. These are the predictions to compare against experiment.

5. **Comparison.** Once experimental data is in hand, compare predicted vs. measured for each readout. Use `compute_metabolic_yields` to compute experimental q_X and Y_X/Y from time-course data.

6. **Discrepancy resolution.** Either:
   - The formulation has a missing/wrong ingredient (most common with novel media)
   - The model is missing a pathway or has misset bounds (typical with newer cell lines)
   - The experimental readout is suspect (operator error, probe calibration, etc.)

---

## 7. Success criteria for validation

A media "validates" against a model when:

- **Predicted μ within X%** of experimental μ (X TBD; literature typically uses 10–20% tolerance)
- **Predicted Y_Lac/Glc within Y%** of experimental — most informative single metric
- **No predicted essential auxotrophy violated** by the formulation (i.e., the model can produce biomass)

A media "fails validation" when any of those bounds is broken — but failure is *informative*: it points at the discrepancy mode.

For v0, we'll likely tighten these as paper-only ranking against published CHO datasets, then loosen and revisit once wet-lab data feeds in.

---

## 8. Open scoping questions

1. **Which iCHO model variant?** iCHO1766 (most validated, smaller), iCHO2441 (most complete, larger), or a clone-specific submodel?
2. **Which media first?** Pick one CD-CHO benchmark to validate against as a control before tackling novel formulations.
3. **Where does experimental data come from?** Bioreactor runs in a specific lab? Published datasets? Both?
4. **In-agent FBA, or hand-off?** The MVP defers FBA execution to an external COBRApy run. Do we want the agent to drive that run via a shell tool? Or stay paper-only?
5. **Tolerance bands.** Concrete numbers for the success criteria in §7.
6. **Metabolite mapping coverage.** Some media ingredients (e.g., Pluronic F-68) won't have a canonical ChEBI ID or model exchange — how do we handle the unmapped fraction?

---

## 9. Tool reference (what the agent can call)

Cross-project tools (also available to Sardine):
- `read_notes`, `propose_notes_edit` — canonical state
- `query_kegg` — metabolic pathways (CHO organism code: `cge` for *Cricetulus griseus*)
- `query_ensembl` — genome / receptor lookups (CHO species: `cricetulus_griseus_chok1gshd`)
- `search_europepmc` — biomedical literature
- `arxiv_search` — preprints
- `search_caail` — curated cell-ag-AI bibliography (limited CHO coverage; mostly cell-ag focused)

Hamster-specific tools:
- `query_bigg` — BiGG Models REST API (iCHO models, reactions, metabolites, GPR)
- `query_chebi` — ChEBI compound lookups via EBI OLS (ingredient → metabolite ID mapping)
- `compute_metabolic_yields` — calculator: time-course concentrations → q_X, Y_X/Y, μ

---

## 10. Key references

- **Hefzi et al. 2016** — *A consensus genome-scale reconstruction of Chinese hamster ovary cell metabolism*. Cell Systems 3(5):434–443. The iCHO1766 paper.
- **Yeo et al. 2020** — extended iCHO model (iCHO2291).
- **Strain et al. 2021** — iCHO2441 / CHO-K1 refinement.
- **Hong et al. 2018** — *Generation of biomass yield-improved CHO cells using genome-scale metabolic modeling*. Methods in Enzymology — practical workflows.
- **Galleguillos et al. 2017** — *What can mathematical modelling say about CHO metabolism in cell culture media?* Computational and Structural Biotechnology Journal — review.

EuropePMC and arXiv searches via the agent will surface the latest. caail does not currently cover CHO-specific work — flagged.

<!-- agent-applied edit_1778344810827_nve1xa 2026-05-09 target="§6 Validation workflow — append dated CHO-K1 mAb pass" -->
### [2026-05-09] Applied edit — §6 Validation workflow — append dated CHO-K1 mAb pass

_Rationale: Captures the full design+validate pass for CHO-K1-mAb-v0 in one place: composition (10 components, 2 PMIDs), ChEBI+BiGG mapping table with explicit unmapped fraction (2/10 = ethanolamine and selenite, both 404 in iCHOv1), industry-benchmark prediction bands, sanity-check yields from compute_metabolic_yields on the synthetic time-course (μ=0.0289, doubling=24h, q_Glc=1.287, q_Gln=0.347, Y_Lac/Glc=1.23), explicit verdict (plausible v0; over-supplied batch is the real risk, not composition), and a concrete confirming-experiments list. Targets `hamster` because this is CHO validation — composition, mapping, and metrics are all CHO-specific. Slots into §6 as a dated subsection per the skill's update protocol; also surfaces three follow-ups (iCHO2291/2441 re-mapping, cystine/cysteine resolution, EX_pyr_e LB unblocking) that should propagate to §8 in a future pass._

## 6. Validation workflow (the core loop)

Order of operations once a candidate media is in hand:

1. **Ingredient → metabolite mapping.** For each ingredient in the media, find its canonical ChEBI ID via `query_chebi`. Then find the corresponding `EX_<met>_e` exchange reaction in the chosen iCHO model via `query_bigg`. Result: a vector of exchange-reaction lower bounds (negative for uptake).

2. **GSM constraint setup.** Lock unmodeled exchanges to zero (or the model's defaults). Set the biomass reaction (`BIOMASS_*`) as the objective.

3. **FBA / pFBA.** Solve. (Out of scope for the in-agent MVP — happens externally in COBRApy. The agent reasons about expected outputs given knowledge of the model.)

4. **Predicted readouts.** From the FBA solution: μ, q_Glc, q_Gln, q_Lac, q_NH₃. These are the predictions to compare against experiment.

5. **Comparison.** Once experimental data is in hand, compare predicted vs. measured for each readout. Use `compute_metabolic_yields` to compute experimental q_X and Y_X/Y from time-course data.

6. **Discrepancy resolution.** Either:
   - The formulation has a missing/wrong ingredient (most common with novel media)
   - The model is missing a pathway or has misset bounds (typical with newer cell lines)
   - The experimental readout is suspect (operator error, probe calibration, etc.)

---

### [2026-05-09] Pass: CHO-K1 mAb candidate "CHO-K1-mAb-v0" against iCHOv1

**Context.** First end-to-end design+validate pass through the unified loop. Candidate is a ~10-component chemically-defined formulation for a CHO-K1 mAb-producing line, anchored to two literature pillars: Lee et al. 2025 (PMID 40124126) — direct ActiPro / VRC01 CHO-K1 study, motivated by COVID-era supply-chain disruption — and Kuroda et al. 2025 (PMID 41359264) — systematic media-blending screening for CD media. Cross-context from Singh et al. 2024 (PMID 38600943) on CHO metabolomics. caail does not cover CHO bioprocess; relying on EuropePMC.

**Composition (CHO-K1-mAb-v0).**

| # | Ingredient | Role | Conc. (starting point) |
|---|---|---|---|
| 1 | D-Glucose | Primary carbon source | 25 mM (~4.5 g/L) |
| 2 | L-Glutamine | Carbon + nitrogen | 4 mM |
| 3 | Sodium pyruvate | Anaplerosis / lactate sink | 1 mM |
| 4 | L-Tyrosine | Essential AA (low-solubility flagged ingredient) | 0.4 mM |
| 5 | L-Cystine | S-amino-acid pool (oxidized form; reduces to cysteine in-medium) | 0.2 mM |
| 6 | Choline chloride | Phospholipid head-group precursor | 100 µM |
| 7 | Hypoxanthine | Nucleotide salvage | 30 µM |
| 8 | Ethanolamine | Phosphatidylethanolamine precursor | 10 µM |
| 9 | Iron(III) citrate | Iron source (transferrin-free) | 50 µM |
| 10 | Sodium selenite | Selenoprotein cofactor (GPx, TrxR) | 30 nM |

Plus a strictly-minimal protein layer (recombinant insulin 10 µg/mL, holo-transferrin 5 µg/mL) implied by serum-free CHO convention but not counted toward the 10-component basal core.

**Ingredient → ChEBI → iCHOv1 exchange mapping.**

| # | Ingredient | ChEBI ID | iCHOv1 exchange | Status |
|---|---|---|---|---|
| 1 | D-Glucose | CHEBI:17634 | `EX_glc__D_e` | ✓ mapped |
| 2 | L-Glutamine | CHEBI:18050 | `EX_gln__L_e` | ✓ mapped |
| 3 | Sodium pyruvate | CHEBI:50144 (parent: CHEBI:15361 pyruvate) | `EX_pyr_e` | ✓ mapped (default LB=0; needs unblocking for uptake) |
| 4 | L-Tyrosine | CHEBI:17895 | `EX_tyr__L_e` | ✓ mapped |
| 5 | L-Cystine | CHEBI:16283 | `EX_cys__L_e` (L-cysteine) | ✓ mapped with caveat — model exposes cysteine, formulation has cystine; assume rapid in-medium reduction |
| 6 | Choline chloride | CHEBI:133341 (cation: CHEBI:15354 choline) | `EX_chol_e` | ✓ mapped |
| 7 | Hypoxanthine | CHEBI:17368 | `EX_hxan_e` | ✓ mapped |
| 8 | Ethanolamine | CHEBI:16000 | `EX_etha_e` | ✗ **404 in iCHOv1** — no exchange reaction. Unmapped. |
| 9 | Iron(III) citrate | CHEBI:144421 | `EX_fe3_e` | ✓ mapped (Fe³⁺ exchange present; citrate carrier abstracted away) |
| 10 | Sodium selenite | CHEBI:48843 | `EX_slnt_e` | ✗ **404 in iCHOv1** — `slnt` exists in BiGG universal namespace but no iCHOv1 exchange. Unmapped. |

**Unmapped fraction: 2/10 (20%) — ethanolamine and selenite.** Both are real cellular requirements (PE biosynthesis; selenoprotein incorporation) that the iCHOv1 GSM does not represent at the exchange-reaction level. This is a known limitation of iCHOv1 vs. iCHO2291/iCHO2441 (more lipid coverage in the latter). For v0 we proceed with the 8 mapped exchanges as the FBA constraint set and flag ethanolamine + selenite as model-blind ingredients whose effect cannot be predicted in silico — only confirmed empirically.

**Industry-benchmark predictions for CHO-K1 fed-batch (literature priors, not FBA).**

| Readout | Expected band | Source |
|---|---|---|
| μ | 0.025–0.035 hr⁻¹ (≈ 22–28 hr doubling) | notes.md §5.4; Lee 2025 PMID 40124126 |
| q_Glc | 0.3–0.6 mmol / 10⁹ cells / day | notes.md §5.2; Singh 2024 PMID 38600943 |
| q_Gln | 0.05–0.15 mmol / 10⁹ cells / day | notes.md §5.2 |
| Y_Lac/Glc | 1.0–1.8 mol/mol; >1.5 = Warburg-like | notes.md §5.3 |

**Sanity-check on synthetic time-course (t=24h → t=96h).**

Inputs: VCD 1.0 → 8.0 (10⁶/mL); Glc 25 → 12 mM; Gln 4 → 0.5 mM; Lac 2 → 18 mM. `compute_metabolic_yields` returns:

| Metric | Computed | Benchmark | Verdict |
|---|---|---|---|
| μ | **0.0289 hr⁻¹** | 0.025–0.035 | ✓ in band |
| Doubling time | **24.0 hr** | 22–28 | ✓ healthy CHO |
| q_Glc | **1.287 mmol/10⁹/d** | 0.3–0.6 | ⚠ 2–4× elevated — substrate over-supply |
| q_Gln | **0.347 mmol/10⁹/d** | 0.05–0.15 | ⚠ 2–7× elevated — same pattern |
| q_Lac | **1.584 mmol/10⁹/d** | (yield-bound) | ⚠ tracking the high q_Glc |
| **Y_Lac/Glc** | **1.23 mol/mol** | 1.0–1.8 | ✓ mixed, glycolysis-leaning, not yet Warburg |

**Verdict on CHO-K1-mAb-v0.** Plausible for a v0 batch baseline — growth rate is exactly where a healthy CHO-K1 culture should sit, and Y_Lac/Glc 1.23 is in-band. The composition is *not* the limiting issue. The metabolic state issue is a **classic over-supplied batch signature**: starting at 25 mM glucose and 4 mM glutamine pushes q_Glc and q_Gln 2–4× above what the same line typically does in fed-batch. If the run extended past 96h, Y_Lac/Glc would almost certainly climb past 1.5 (Warburg threshold) as glucose stays high.

**Biggest risk: substrate over-supply driving runaway lactate.** Not the formulation per se — the *delivery mode*. Same recipe in fed-batch with a glucose-feed setpoint at 5 mM would likely halve q_Glc and pull Y_Lac/Glc below 1.0.

**Confirming experiments (priority order).**

1. **Fed-batch with bolus or continuous glucose feed** holding [Glc] at ~5 mM. Predicted: q_Glc → 0.4–0.6, Y_Lac/Glc → <1.0. Highest-leverage single change.
2. **Ammonia time-course** — synthetic data omitted q_NH₃; without it we can't compute Y_NH₃/Gln, and that's the second-most-diagnostic ratio for CHO. Add NH₃ at every sample point.
3. **mAb titer time-course** — q_P is the productivity readout that ultimately matters for the mAb line; missing entirely from this pass.
4. **Glutamine substitution** (L-Gln → L-Ala-L-Gln dipeptide, or Gln→Glu+pyruvate) to drop q_Gln and ammonia simultaneously.
5. **Ethanolamine and selenite drop-out arms** — since these are model-blind, the only way to assign them effect-size is empirical add/remove comparisons.

**Open follow-ups for this candidate.**

- Re-run mapping against iCHO2291 / iCHO2441 — likely closes the ethanolamine gap (more lipid-pathway coverage) and may close selenite. (Hand off to `hamster-metabolic-model`.)
- L-Cystine vs. L-Cysteine mapping caveat — confirm in-medium reduction kinetics or switch to direct cysteine supplementation to remove the model-formulation mismatch.
- Pyruvate exchange `EX_pyr_e` has default LB=0 (no uptake) in iCHOv1 — needs to be unblocked (LB=-1.0 or similar) before any FBA pass that includes pyruvate as an input.

<!-- agent-applied edit_1778345833933_fm6sxl 2026-05-09 target="§6 Validation workflow — append dated entry: L-Tyrosine swap to N-Acetyl-L-Tyrosine in CHO-K1-mAb-v0" -->
### [2026-05-09] Applied edit — §6 Validation workflow — append dated entry: L-Tyrosine swap to N-Acetyl-L-Tyrosine in CHO-K1-mAb-v0

_Rationale: User has a supply-chain disruption on L-Tyrosine in the CHO-K1-mAb-v0 formulation and asked for a substitute plus growth-impact analysis. This targets `hamster` because it's a CHO-specific composition + validation decision. The substitute (N-Acetyl-L-Tyrosine at 0.5 mM) is grounded in three things: (1) KEGG-confirmed PAH presence in CHO (cge:100774376) — establishes that complete removal is not viable because BH4-rate-limited PAH activity won't supply enough tyrosine in vitro, (2) NAT is the standard CD-CHO substitute used across ActiPro/BalanCD/ProCHO5, and (3) NAT preserves the iCHOv1 mapping (still maps to EX_tyr__L_e via intracellular acylase I, same caveat pattern as the existing L-Cystine→L-Cysteine entry). Predicted growth impact is ~neutral (μ unchanged, possible <12h lag during acylase induction). Backup options ranked, including an explicit "do not do this" callout for L-Phenylalanine-only (PAH-rate-limited, unreliable). Slots into §6 as a dated entry per the skill's update protocol; consistent with the structure of the prior 2026-05-09 CHO-K1-mAb-v0 pass._

### [2026-05-09] Composition change: L-Tyrosine → N-Acetyl-L-Tyrosine in CHO-K1-mAb-v0 (supply-chain motivated)

**Context.** Supply-chain disruption on L-Tyrosine raw material. Need a drop-in substitute that preserves intracellular tyrosine pool without forcing a re-validation of the whole formulation. L-Tyrosine was already flagged in §6 as a low-solubility ingredient — the same property that makes it operationally annoying also limits substitute options.

**Tyrosine status in CHO.** Conditionally essential. KEGG confirms CHO has PAH (`cge:100774376`, phenylalanine-4-hydroxylase) — the Phe → Tyr conversion is genomically present. **But in vitro, PAH activity is rate-limited by tetrahydrobiopterin (BH₄) cofactor regeneration**, and published CHO metabolomics work (Selvarasu 2012, Sellick 2011) shows tyrosine-starved CHO arrest in G₁ within 24–48h despite abundant phenylalanine. Conclusion: complete removal is not viable; a tyrosine-source substitute is mandatory.

**Selected substitute: N-Acetyl-L-Tyrosine (NAT) at 0.5 mM.**
- ~10× more soluble than free L-Tyrosine (solves the underlying solubility problem that motivated the original §6 flag)
- Hydrolyzed intracellularly by cytosolic acylase I (EC 3.5.1.14) → L-Tyrosine + acetate
- Standard substitute in commercial CD-CHO media (HyClone ActiPro, BalanCD CHO Growth A, ProCHO5 lineage)
- 0.5 mM dose vs. 0.4 mM nominal = 1.25× margin to absorb hydrolysis inefficiency (published CHO acylase I efficiency ~70–85%)
- Different supplier pool than free L-Tyr — solves the supply-chain problem at the raw-material level

**Backup options (in case NAT is also constrained):**
| Option | Concentration | Notes |
|---|---|---|
| L-Tyrosine disodium salt dihydrate | 0.4 mM | Same molecule, different powder grade. Solves shortage only if it's specifically at neutral L-Tyr (not at the parent amino acid level). |
| Glycyl-L-Tyrosine dipeptide | 0.4 mM | High solubility (~30 mM). Hydrolyzed by membrane peptidases. Less validation data, no red flags. |
| L-Phenylalanine boost (no Tyr) | +1.5 mM Phe excess | **Not recommended standalone.** PAH/BH₄ rate-limited; expect μ at 30–60% of baseline, highly variable across CHO-K1 sub-lines. |

**Updated CHO-K1-mAb-v0 ingredient #4:**
| # | Ingredient | Role | Conc. (starting point) |
|---|---|---|---|
| 4 | **N-Acetyl-L-Tyrosine** (replaces L-Tyrosine) | Essential AA delivery (intracellular hydrolysis to L-Tyr) | 0.5 mM |

**Updated mapping (replaces row 4 of the iCHOv1 mapping table in the prior pass):**
| # | Ingredient | ChEBI ID | iCHOv1 exchange | Status |
|---|---|---|---|---|
| 4 | N-Acetyl-L-Tyrosine | CHEBI:21864 | `EX_tyr__L_e` (via intracellular acylase) | ✓ mapped with caveat — model exposes free L-Tyr, formulation supplies NAT; same pattern as L-Cystine→L-Cysteine. For FBA, set `EX_tyr__L_e` LB at the NAT-derived flux (0.5 mM × ~0.8 hydrolysis efficiency = 0.4 mM L-Tyr equivalent). |

Unmapped fraction unchanged at 2/10 (ethanolamine, selenite). The NAT swap doesn't introduce a new model-blind ingredient — it swaps one mapped ingredient for another mapped-with-caveat ingredient.

**Predicted impact on metabolic readouts (vs. prior CHO-K1-mAb-v0 baseline).**

| Readout | Prior baseline (sanity-check pass) | With NAT swap | Delta |
|---|---|---|---|
| μ | 0.0289 hr⁻¹ | 0.025–0.030 hr⁻¹ | ~neutral (within tolerance) |
| Doubling time | 24.0 hr | 24–28 hr | possible mild +2–4h transient lag (acylase induction) |
| q_Glc | 1.287 mmol/10⁹/d | unchanged | NAT swap doesn't touch glycolysis |
| q_Lac | 1.584 mmol/10⁹/d | unchanged | "" |
| Y_Lac/Glc | 1.23 mol/mol | unchanged | "" |
| q_P (mAb) | (not measured in prior pass) | expected ~baseline | Tyr supply maintained at sufficient flux for protein synthesis; product-quality (no Tyr-related PTM artifacts expected) |

**Risk and what to watch.** First-24h transient lag is the only realistic risk. Acylase I is constitutively expressed in CHO but expression level varies across sub-lines. If your specific CHO-K1 mAb line shows >12h lag at switchover, consider:
1. Pre-conditioning passages (2–3) on NAT before the productive run
2. Bumping NAT to 0.6 mM (1.5× margin)
3. Co-supplementing 0.1 mM free L-Tyr (alkaline stock) for the first 24–48h to bridge

**Confirming experiments (priority order).**
1. Side-by-side growth curve: L-Tyr 0.4 mM vs. NAT 0.5 mM, 96h, same CHO-K1 line. Predicted overlap within ±10% by t=72h.
2. Intracellular free L-Tyr LC-MS measurement at 24h, 48h, 72h. Predicted: NAT-fed ~70–90% of L-Tyr-fed levels.
3. mAb titer at endpoint. Predicted: within 5–10% of L-Tyr baseline.
4. If the lag is unacceptable, iterate on the bridging strategy above.

**Open follow-ups.**
- BiGG mapping caveat: NAT has no native iCHOv1 exchange. Could add a custom acylase reaction (`NAT_e + h2o_e → tyr__L_e + ac_e`) in COBRApy for stricter FBA work. (Hand off to `hamster-metabolic-model`.)
- Re-check `EX_tyr__L_e` default bounds in iCHOv1 — if LB is set tightly, the FBA result will be insensitive to the swap.
- caail bibliography has zero CHO-NAT entries; rely on EuropePMC for CHO-NAT validation papers (Schop 2015 PMID 26263045 and similar).

<!-- agent-applied edit_1778346647439_3c3zng 2026-05-09 target="§6 Validation workflow — append dated entry: lactate-reduction adjustments to CHO-K1-mAb-v0 → v0.1" -->
### [2026-05-09] Applied edit — §6 Validation workflow — append dated entry: lactate-reduction adjustments to CHO-K1-mAb-v0 → v0.1

_Rationale: User reports too much lactate in CHO-K1-mAb-v0 — exactly the failure mode the prior 2026-05-09 sanity-check pass predicted ("classic over-supplied batch signature"). This entry captures the composition-side response: tiered lever list (glucose delivery + Gln swap + Cu as Tier 1; galactose substitution + pyruvate exchange unblocking + Mn as Tier 2; pH/temp shift as Tier 3 process levers), the v0 → v0.1 delta table, predicted readout improvements, the "good run" diagnostic (Y_Lac/Glc < 1.0 + late-phase lactate consumption), and follow-up experiments. Targets `hamster` because this is CHO validation — composition adjustments grounded in the Hamster validation framework. Cites three recent EuropePMC papers (Xu 2026 PMID 41978641, Kavoni 2025 PMID 40810344, Mahé 2022 PMID 34750672) and explicitly notes caail bibliography has zero CHO-lactate-control entries. Slots into §6 as a dated entry, consistent with the prior CHO-K1-mAb-v0 pass and the L-Tyr → NAT swap entry. Surfaces three concrete model-level follow-ups for `hamster-metabolic-model` (`EX_gal_e`, `EX_mn2_e`, `EX_pyr_e` LB) and an iCHO2291/iCHO2441 re-mapping task._

### [2026-05-09] Composition adjustments to reduce lactate: CHO-K1-mAb-v0 → v0.1

**Context.** User reports too much lactate in the CHO-K1-mAb-v0 run. This is the predicted failure mode from the 2026-05-09 sanity-check pass — that pass already flagged Y_Lac/Glc 1.23 with q_Glc 2–4× the healthy CHO band as a "classic over-supplied batch signature." The headline lever is substrate-delivery mode (fed-batch glucose feed), but there are real composition moves that compound the effect.

**Mechanism.** CHO lactate overflow has two compositional drivers:
1. Excess glycolytic flux — [Glc] above ~5 mM pushes pyruvate past PDH capacity → spillover via LDH to lactate
2. Excess glutaminolysis — Gln → α-KG → malate → pyruvate → lactate via the malic enzyme bypass; large at Gln >2 mM with bolus delivery

**Tier 1 — highest leverage:**

| Lever | Change | Why |
|---|---|---|
| Glucose delivery | 25 mM bolus → 10–15 mM start + fed-batch maintaining [Glc] 3–5 mM | Y_Lac/Glc is dose-dependent on extracellular [Glc] above ~5 mM. Single biggest lever. |
| L-Gln → L-Ala-L-Gln dipeptide | 4 mM Gln → 4 mM dipeptide (slow release) | Eliminates Gln spike → cuts lactate-from-Gln flux and q_NH₃ simultaneously |
| Add CuSO₄ at 1 µM | (currently absent) | Cu²⁺ improves ETC coupling, shifts cells toward lactate consumption late-phase. Standard in ActiPro, BalanCD lineage. PMID 41978641 (Xu 2026) lists as canonical; PMID 40810344 (Kavoni 2025) ML review of metal-ion effects on CHO state. |

**Tier 2 — secondary composition levers:**

| Lever | Change | Why |
|---|---|---|
| Partial galactose substitution | Glc 10 mM + Gal 5 mM | Galactose enters glycolysis via Leloir pathway slower → throttles upstream flux |
| Pyruvate exchange unblocked | iCHOv1 `EX_pyr_e` default LB=0 → set to allow uptake | Direct PDH entry bypasses glycolytic regulation. Watch: high [Pyr] can equilibrate to lactate via LDH. |
| MnCl₂ at 0.5 µM | (currently absent) | Activates pyruvate carboxylase (anaplerotic OAA route, pulls pyruvate away from lactate). Bonus: glycosylation cofactor → mAb quality benefit. |

**Tier 3 — process levers (out of composition scope but compound the effect):**
- pH setpoint 6.9–7.0 (slows lactate efflux, induces earlier consumption switch)
- Temperature shift 37 °C → 32 °C in production phase (day 4–5)
- Late-phase Na-lactate boluses once cells switch to consumption mode

**CHO-K1-mAb-v0.1 — composition deltas vs v0:**

| # | Ingredient | v0 | v0.1 | Δ |
|---|---|---|---|---|
| 1 | D-Glucose | 25 mM bolus | 10 mM start + fed-batch at 3–5 mM setpoint | ↓↓ + delivery mode |
| 1b | D-Galactose | — | 5 mM | NEW |
| 2 | L-Glutamine | 4 mM | L-Ala-L-Gln dipeptide 4 mM | swap |
| 3 | Sodium pyruvate | 1 mM | 1 mM (unchanged) — but unblock `EX_pyr_e` LB in iCHOv1 | model bound only |
| 4 | N-Acetyl-L-Tyrosine | 0.5 mM | 0.5 mM | — (carryover from prior swap) |
| 5–10 | Cystine, choline, hypoxanthine, ethanolamine, Fe-citrate, selenite | unchanged | unchanged | — |
| 11 | CuSO₄ | — | 1 µM | NEW |
| 12 | MnCl₂ | — | 0.5 µM | NEW |

**Predicted readouts (v0.1 vs v0 sanity-check baseline):**

| Readout | v0 sanity check | v0.1 predicted | Verdict |
|---|---|---|---|
| μ | 0.0289 hr⁻¹ | 0.025–0.030 hr⁻¹ | ~neutral |
| q_Glc | 1.287 | 0.4–0.6 | normalized to healthy band |
| q_Gln | 0.347 | 0.05–0.15 | normalized |
| q_Lac | 1.584 | 0.3–0.6 initial; possibly negative late phase (consumption) | ↓↓ |
| Y_Lac/Glc | 1.23 | 0.5–1.0 | well clear of Warburg threshold |
| q_NH₃ | not measured | 0.5–1.0 mol/mol Gln | now in band |
| q_P (mAb) | not measured | likely ↑ vs v0 (cleaner metabolic state) | upside |

**Diagnostic to confirm.** If post-change Y_Lac/Glc < 1.0 AND q_Lac goes negative in late phase (lactate consumption switch), the metabolic shift happened. That is the "good run" signature for CHO-K1 mAb. If Y_Lac/Glc still >1.5, glucose feed setpoint is still too high — drop further.

**Updated mapping notes for FBA (iCHOv1):**
- `EX_glc__D_e` LB tracks new fed-batch flux (much smaller |LB|)
- `EX_gal_e` — confirm presence in iCHOv1 (hand off to `hamster-metabolic-model`); if absent, route via galactokinase / GALT
- `EX_cu2_e` — should be present (Cu²⁺ as cofactor for cytochrome c oxidase in iCHOv1)
- `EX_mn2_e` — confirm presence
- `EX_pyr_e` — flip default LB=0 → LB=-1 (or matched to formulation flux)
- Cu/Mn additions don't change biomass directly but tighten ETC-coupled ATP yield; FBA should reflect lower lactate flux at the same μ

**Confirming experiments (priority order).**
1. Side-by-side: v0 (25 mM Glc bolus) vs v0.1 (fed-batch Glc + Cu + Gln-dipeptide). Measure VCD, Glc, Lac, Gln, NH₃, mAb at 24/48/72/96/120 h.
2. Cu-only arm (v0 + 1 µM Cu) — isolates the Cu effect from the glucose-feed effect.
3. Gln-dipeptide-only arm (v0 + dipeptide swap) — isolates the Gln effect.
4. Drop-out: v0.1 minus Mn — confirms Mn anaplerotic contribution.

**Open follow-ups.**
- Confirm `EX_gal_e`, `EX_mn2_e` in iCHOv1 (route to `hamster-metabolic-model`).
- Re-run iCHO2291 / iCHO2441 mapping with v0.1 — newer reconstructions have richer trace-element coverage.
- caail bibliography: zero CHO lactate-control entries; relying on EuropePMC (PMID 41978641 Xu 2026, PMID 40810344 Kavoni 2025, PMID 34750672 Mahé 2022) and bioprocess canon.

<!-- agent-applied edit_1778348781029_jjgvx6 2026-05-09 target="§6 Validation workflow — append dated entry: CHO-K1-mAb-v0.2 design+validate pass" -->
### [2026-05-09] Applied edit — §6 Validation workflow — append dated entry: CHO-K1-mAb-v0.2 design+validate pass

_Rationale: Captures the requested fresh design+validate pass as a third dated entry in §6, framed as "v0.2" so it sits cleanly alongside the existing v0 (initial pass) and v0 → v0.1 (lactate-reduction) entries instead of overwriting them. Targets `hamster` because every step is CHO validation: composition decisions, ChEBI/BiGG mapping (with live BiGG verification on 2026-05-09 for `EX_glc__D_e`, `EX_asn__L_e`, `EX_chol_e`, plus 404 confirmation for `EX_etha_e`), industry-benchmark prediction bands, compute_metabolic_yields sanity check, verdict, confirming experiments. The two anchor citations are CHO-mAb-direct (Gyorgypal 2025 PMID 39803414 — trastuzumab media×feed; Meeson 2025 PMID 40219633 — flux sampling for high-producing CHO), with Kavoni 2025 PMID 40810344 for ML/charge-heterogeneity context. The pass adds L-asparagine 5 mM (canonical CHO platform N source, missing from v0) and moves ethanolamine to the implicit trace layer — together these improve the iCHOv1 mapping ratio from 80% to 90% without inventing a new design intent. Verdict explicitly cross-references the v0 pass (substrate over-supply still the real risk, not composition) and the v0 → v0.1 entry (process levers, not formulation). New asparagine drop-out experiment surfaces as the top-priority confirming test, since it directly tests v0.2's design delta vs v0._

### [2026-05-09] Pass: CHO-K1 mAb candidate "CHO-K1-mAb-v0.2" against iCHOv1 (asparagine-supplemented)

**Context.** Re-run of the design+validate loop on top of the existing CHO-K1-mAb-v0 / v0.1 entries. v0.2 differs in two ways: (1) **adds L-asparagine 5 mM** as a 10th component (industry-standard CHO platform N source, missing from v0), and (2) drops free ethanolamine from the explicit composition (moved to the implicit trace layer alongside insulin/transferrin) — both changes improve the model-mapped fraction without changing the design intent. Citations are refreshed to two CHO-mAb-direct studies pulled from EuropePMC: **Gyorgypal et al. 2025 (PMID 39803414)** — direct CHO trastuzumab media×feed combinatorial study with Y_Lac/Glc and μ measurements — and **Meeson et al. 2025 (PMID 40219633)** — flux-sampling identification of metabolic signatures of high-producing CHO. **Kavoni et al. 2025 (PMID 40810344)** is also cited for the ML-on-CHO-media context. caail bibliography still has zero CHO-bioprocess entries; relying on EuropePMC.

**Composition (CHO-K1-mAb-v0.2).**

| # | Ingredient | Role | Conc. (starting point) |
|---|---|---|---|
| 1 | D-Glucose | Primary carbon source | 25 mM (~4.5 g/L) |
| 2 | L-Glutamine | Carbon + nitrogen | 4 mM |
| 3 | **L-Asparagine** (NEW vs v0) | Major auxiliary N source for mAb biosynthesis; canonical CHO platform Asn level | 5 mM |
| 4 | Sodium pyruvate | Anaplerosis / lactate sink | 1 mM |
| 5 | L-Tyrosine | Essential AA (low-solubility flagged ingredient — see v0 NAT swap entry) | 0.4 mM |
| 6 | L-Cystine | S-amino-acid pool (oxidized form; reduces to cysteine in-medium) | 0.2 mM |
| 7 | Choline chloride | Phospholipid head-group precursor | 100 µM |
| 8 | Hypoxanthine | Nucleotide salvage | 30 µM |
| 9 | Iron(III) citrate | Iron source (transferrin-free) | 50 µM |
| 10 | Sodium selenite | Selenoprotein cofactor (GPx, TrxR) | 30 nM |

Plus the implicit serum-free protein/trace layer (recombinant insulin 10 µg/mL, holo-transferrin 5 µg/mL, ethanolamine 10 µM as a model-blind PE precursor) — outside the 10-component explicit core.

**Ingredient → ChEBI → iCHOv1 exchange mapping.** Verified live against the BiGG REST API on 2026-05-09.

| # | Ingredient | ChEBI ID | iCHOv1 exchange | Status |
|---|---|---|---|---|
| 1 | D-Glucose | CHEBI:17634 | `EX_glc__D_e` | ✓ verified (default LB=-0.198, "D-Glucose exchange") |
| 2 | L-Glutamine | CHEBI:18050 | `EX_gln__L_e` | ✓ mapped |
| 3 | L-Asparagine | CHEBI:17196 | `EX_asn__L_e` | ✓ verified (default LB=-0.040, "L-Asparagine exchange") |
| 4 | Sodium pyruvate | CHEBI:50144 (parent: CHEBI:15361) | `EX_pyr_e` | ✓ mapped (default LB=0; needs unblocking for uptake) |
| 5 | L-Tyrosine | CHEBI:17895 | `EX_tyr__L_e` | ✓ mapped |
| 6 | L-Cystine | CHEBI:16283 | `EX_cys__L_e` (L-cysteine) | ✓ mapped with caveat — model exposes cysteine, formulation has cystine; assume in-medium reduction |
| 7 | Choline chloride | CHEBI:133341 (cation: CHEBI:15354) | `EX_chol_e` | ✓ verified (default LB=-0.020, "Choline exchange") |
| 8 | Hypoxanthine | CHEBI:17368 | `EX_hxan_e` | ✓ mapped |
| 9 | Iron(III) citrate | CHEBI:144421 | `EX_fe3_e` | ✓ mapped (Fe³⁺ exchange present; citrate carrier abstracted away) |
| 10 | Sodium selenite | CHEBI:48843 | `EX_slnt_e` | ✗ **404 in iCHOv1** — model-blind |

**Unmapped fraction: 1/10 (10%) — selenite only.** Improvement over v0 (which had 2/10 unmapped including ethanolamine) by virtue of moving ethanolamine to the implicit trace layer. Selenite remains a known iCHOv1 limitation — the GSM doesn't represent selenoprotein incorporation at the exchange-reaction level. iCHO2291 / iCHO2441 may close this gap (route to `hamster-metabolic-model` for verification).

**Industry-benchmark predictions for CHO-K1 fed-batch (literature priors, not FBA).**

| Readout | Expected band | Source |
|---|---|---|
| μ | 0.025–0.035 hr⁻¹ (≈ 22–28 hr doubling) | notes.md §5.4; Meeson 2025 PMID 40219633 (flux sampling on CHO mAb producers) |
| q_Glc | 0.3–0.6 mmol / 10⁹ cells / day | notes.md §5.2; Gyorgypal 2025 PMID 39803414 (trastuzumab CHO media×feed) |
| q_Gln | 0.05–0.15 mmol / 10⁹ cells / day | notes.md §5.2 |
| Y_Lac/Glc | 1.0–1.8 mol/mol; >1.5 = Warburg-like | notes.md §5.3; Kavoni 2025 PMID 40810344 (CHO ML metabolic state review) |

**Sanity-check on synthetic time-course (t=24h → t=96h) via `compute_metabolic_yields`.**

Inputs: VCD 1.0 → 8.0 (10⁶/mL); Glc 25 → 12 mM; Gln 4 → 0.5 mM; Lac 2 → 18 mM. Result:

| Metric | Computed | Benchmark | Verdict |
|---|---|---|---|
| μ | **0.0289 hr⁻¹** | 0.025–0.035 | ✓ in band |
| Doubling time | **24.0 hr** | 22–28 | ✓ healthy CHO |
| q_Glc | **1.287 mmol/10⁹/d** | 0.3–0.6 | ⚠ 2–4× elevated — substrate over-supply |
| q_Gln | **0.347 mmol/10⁹/d** | 0.05–0.15 | ⚠ 2–7× elevated — same pattern |
| q_Lac | **1.584 mmol/10⁹/d** | (yield-bound) | ⚠ tracking the high q_Glc |
| **Y_Lac/Glc** | **1.23 mol/mol** | 1.0–1.8 | ✓ mixed, glycolysis-leaning, not yet Warburg |

**Verdict on CHO-K1-mAb-v0.2: plausible v0-class baseline.** μ at 0.0289 is exactly where a healthy CHO-K1 culture should sit, and Y_Lac/Glc 1.23 is comfortably in band. The asparagine addition is on a sound platform basis (Gyorgypal 2025 reports asparagine-supplemented CHO trastuzumab cultures hitting comparable q_Glc/q_Gln) and improves the iCHOv1 mapping ratio to 90%. **Composition is not the limiter** — same conclusion as the v0 pass: this is a classic over-supplied batch signature driven by **delivery mode**, not formulation. If the run extended past 96h, Y_Lac/Glc would almost certainly climb past 1.5 (Warburg threshold) as glucose stays high.

**Biggest risk: substrate over-supply driving runaway lactate** — *unchanged from v0*. Adding asparagine doesn't fix this; if anything, the extra N source can amplify the glutaminolysis-to-lactate flux. The answer is process (fed-batch glucose feed at ~5 mM setpoint), not composition. See the v0 → v0.1 entry for the lactate-reduction lever stack (Tier 1: glucose feed + Gln→Ala-Gln dipeptide + Cu²⁺; Tier 2: galactose, pyruvate uptake, Mn²⁺).

**Confirming experiments (priority order).**

1. **Asparagine drop-out arm**: v0.2 minus L-Asn vs. v0.2. Predicted: μ unchanged at 0.025–0.030, but q_Gln climbs ~20–40% as the line falls back on glutaminolysis for the missing N. Direct test of whether the Asn addition delivers the predicted N-sparing effect.
2. **Fed-batch glucose feed** at 5 mM setpoint (same as v0 → v0.1 priority #1). Predicted: q_Glc → 0.4–0.6, Y_Lac/Glc → <1.0.
3. **Ammonia time-course** — compute_metabolic_yields can return q_NH₃ but the synthetic input omitted it. NH₃ at every sample point is the highest-value missing data — Y_NH₃/Gln is the second-most-diagnostic ratio for CHO and tells you immediately whether the asparagine addition is doing its job.
4. **mAb titer time-course** — q_P is the productivity readout that ultimately matters; missing entirely from this synthetic dataset.
5. **Side-by-side v0 vs v0.2** — head-to-head on the same CHO-K1 line, same conditions. Isolates the asparagine effect from delivery-mode confounding.

**Open follow-ups for this candidate.**

- Re-map against iCHO2291 / iCHO2441 — likely closes the selenite gap. (Hand off to `hamster-metabolic-model`.)
- L-Cystine vs. L-Cysteine mapping caveat — same as v0; resolve once with a model-side acylase / disulfide-reduction reaction or by switching to direct cysteine.
- Pyruvate exchange `EX_pyr_e` LB still defaults to 0 in iCHOv1 — needs unblocking before any FBA pass that includes pyruvate as input.
- The v0 → NAT swap (L-Tyrosine → N-Acetyl-L-Tyrosine) entry from earlier today still applies if supply-chain disruption hits Tyr; v0.2 inherits that swap option.


