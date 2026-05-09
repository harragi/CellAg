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



