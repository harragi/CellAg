# Project Sardine — Working Notes

**Last updated:** 2026-05-09 10:17
**Source artifacts:**
- `notes-2026-05-09.png` (whiteboard, 09:48 — initial scoping)
- `notes-2026-05-09b.png` (whiteboard, 10:05 — system knowledge axis added)
- `notes-2026-05-09c.png` (whiteboard, 10:17 — Media Thrive added, sources annotated, databases named) ← **latest**

---

## 1. Source notes (transcribed from latest photo)

The whiteboard is a 2×2 grid. As of 10:17 the top-left, top-right, and bottom-left panels are filled; bottom-right remains blank.

### Top-left panel — Start with: Media Zero

> **Project Sardine**
>
> **Start with**
> - **Media Zero: enable cell survival**
>   - → Some combination of basal media that have worked for fish X        *[source: Cells Source / Catalogs / Literature]*
>   - + Some combo of growth factors that you think will maybe work (like PDGF, insulin)        *[source: Literature]*
>   - (–) Some combo of often-ignored factors (fatty acids)        *[source: Literature]*
> - **+ System knowledge**

The green annotations in the left margin explicitly tag the *source* for each ingredient category — i.e., where to look for candidates. This is a methodology cue, not a decision yet.

### Top-right panel — System knowledge

> - **→ Metabolism — databases (KEGG)**
> - **→ Signaling — databases (RNA, DNA) (EMBO)**
>
> *(Plus a workflow arrow: DNA → [transcription] → Protein.)*

System knowledge is now anchored to specific databases:
- **KEGG** (Kyoto Encyclopedia of Genes and Genomes) for metabolic pathways
- RNA/DNA databases for signaling, with EMBO/EMBL ecosystem named (likely refers to ENA, Ensembl, EuropePMC under the EMBL umbrella)

### Bottom-left panel — Thrive: Media Thrive (NEW in 10:17 photo)

> - **● Media Thrive:**
>   - → Transcriptome (RAM) (RNA) (Bar—)
>     *Your cells*
>   - → Cell growth (doubling time)
>   - → Cell health (imaging)

This is a parallel framework to Media Zero, but for a **different target**: not survival, but **thriving**. And critically, the framework is now about *measurement*, not composition — how do you tell whether a media is producing thriving cells?

Three measurement axes:
1. **Transcriptome of *your* cells** — RNA-Seq / scRNA-Seq (note: tucca-rna-seq exists for exactly this)
2. **Cell growth** — operationalized as doubling time
3. **Cell health** — operationalized via imaging

### Bottom-right panel: blank.

---

## 2. Project structure: two halves, two skills

The whiteboard now defines two distinct workstreams under Project Sardine. They share scope (one cell line, one experimental loop) but have different design objectives, different deliverables, and warrant separate agentic skills.

| | **Start With (Media Zero)** | **Thrive (Media Thrive)** |
|---|---|---|
| **Question answered** | What's the minimum media that keeps cells alive? | How do we measure that cells in a media are *thriving*, not just alive? |
| **Domain** | Composition / formulation | Measurement / evaluation |
| **Output** | A formulation (basal + growth factors + often-ignored factors) | A metric stack (transcriptome + doubling time + imaging) |
| **Source for candidates / metrics** | Cells source, catalogs, literature | Existing assays + tucca-rna-seq pipeline |
| **Skill** | `sardine-start-with` | `sardine-thrive` |
| **System knowledge axis (§5)** | Constrains *what's in* the formulation | Constrains *what to measure* and how to interpret it |

The two halves are sequential in spirit — you need a Media Zero before you can ask "is this thriving" — but in practice they will be developed in parallel because the Thrive measurement stack should be ready when the first Media Zero candidates are ready to evaluate.

---

# Part A: Start With (Media Zero)

## 3. The Media Zero framework

Media Zero = combination across three component categories, **constrained by system-level knowledge** (see §5). The point is not to optimize any one component in isolation, but to find a *minimal viable combination* that keeps cells alive — using metabolism and signaling knowledge to narrow the search space before any wet-lab work.

### 3.1 Basal media (the foundation)

| Basal | Typical use | Notes |
|---|---|---|
| **DMEM** | General mammalian, fibroblasts, muscle | High glucose (4.5 g/L) common; lower-glucose variant exists |
| **DMEM/F12** (1:1) | Stem cells, primary cells | More amino acids and trace components than DMEM alone |
| **RPMI-1640** | Lymphoid lineage, broad mammalian | Lower amino acid content than DMEM/F12 |
| **MEM / α-MEM** | Simpler formulations, some primary cells | α-MEM adds non-essential amino acids and nucleosides |
| **Ham's F-12** | Used as F12 portion of DMEM/F12 | Designed for clonal CHO growth |
| **L-15 (Leibovitz)** | CO₂-independent, often fish/insect cells | **Most likely starting point given "fish X" annotation on whiteboard** |
| **Beefy-9 / B8 / B9** | Cell-ag-specific basals | Stout et al. (Kaplan lab) and Kuo et al.; designed serum-free from the ground up |

**Whiteboard cue:** "basal media that have worked for fish X" → search published *fish* serum-free formulations specifically. Source bucket: Cells Source / Catalogs / Literature.

### 3.2 Growth factors (the expensive part)

Recombinant signaling proteins. Historically the dominant cost driver in serum-free formulations — single growth factors run $1k–$10k+ per gram at research scale, used at 1–100 ng/mL.

**Whiteboard candidates (10:17 photo): PDGF, insulin.**

| Growth factor | Primary effect | Whiteboard? | Notes |
|---|---|---|---|
| **Insulin** | Survival, glucose/amino-acid uptake | ✓ | Cheapest of the set; near-universal; whiteboard candidate |
| **IGF-1** | Survival and proliferation | | Often substitutes for insulin at lower concentration |
| **PDGF** | Proliferation, mesenchymal/connective | ✓ | Whiteboard candidate; relevant for fibroblast/mesenchymal lineages |
| **FGF2 (bFGF)** | Proliferation, stemness | | Workhorse for myogenic, mesenchymal, pluripotent lines; thermolabile |
| **TGF-β1 / Activin A** | Context-dependent | | Use with caution — pleiotropic |
| **EGF** | Proliferation (epithelial) | | |
| **HGF** | Specialized contexts | | |
| **Transferrin** | Iron transport | | Always grouped here even though not strictly a growth factor |

**LLM/foundation-model angle.** Protein language models (ESM-2/3, AlphaFold-3) are credible candidates for designing cheaper recombinant variants — same activity, easier expression, more stable. High-leverage place to bring foundation models into the project.

### 3.3 Often-ignored factors (the failure modes)

The components that are usually trace, sometimes invisible in published formulations, often the difference between "media works" and "cells die in 48 hours." Sardine's most novel territory.

**Whiteboard candidates (10:17 photo): fatty acids.** This implies lipids are the priority sub-category to start with — consistent with a fish target (fish cells need polyunsaturated fatty acids like DHA/EPA that mammalian cells don't).

| Category | Examples | Whiteboard? | Why it matters |
|---|---|---|---|
| **Lipids** | Cholesterol, linoleic/oleic acid, **DHA/EPA** for fish, Chemically Defined Lipid Concentrate | ✓ (fatty acids) | Membrane synthesis; serum carries these implicitly |
| **Albumin** | HSA, BSA, recombinant albumin | | Carrier protein, anti-oxidant, toxin sink |
| **Antioxidants** | Ascorbic acid, N-acetylcysteine, β-mercaptoethanol, glutathione | | Reduce oxidative stress, especially at low cell density |
| **Trace elements** | Selenium, Cu, Zn, Mn, Fe | | Cofactors; selenium critical for GPx and survival |
| **Attachment factors** | Fibronectin, laminin, vitronectin, gelatin, poly-L-lysine | | For adherent cells |
| **Surfactants / shear protectants** | Pluronic F-68 | | Critical in stirred reactors; not needed in static culture |
| **Polyamines** | Putrescine, spermidine | | Often required for serum-free formulations |
| **Steroids** | Hydrocortisone, dexamethasone | | Often required for primary cells |
| **Phospholipid precursors** | Choline, inositol, ethanolamine | | Already in many basals; supplementation sometimes needed |

## 4. Success criteria for Media Zero

"Enable cell survival" must be operationalized. Proposed framework (to confirm):

- **Primary metric:** viability ≥ X% at T hours post-seeding (e.g., ≥80% at 72h via live/dead staining or trypan blue).
- **Secondary metric:** no proliferation required, but no overt apoptosis (caspase-3 negative, normal morphology).
- **Metabolic floor:** baseline metabolic activity (MTT, alamarBlue) within a defined band of the FBS-containing positive control.

**Anti-criteria** (intentionally excluded from Media Zero — they belong to Media Thrive):
- Proliferation rate
- Differentiation efficiency
- Productivity (protein secretion, biomass)
- Cost optimization

---

# Part B: Thrive (Media Thrive)

## 5. The Media Thrive framework

Once cells survive in Media Zero, the next question is whether they're *thriving*. Media Thrive is fundamentally a **measurement framework**, not a composition framework. The output is a metric stack you can apply to any candidate media to grade it.

The whiteboard names three measurement axes, each at a different depth of the cell.

### 5.1 Transcriptome — what *your* cells are doing

The "**your cells**" annotation matters: this is not generic transcriptome work, this is RNA-Seq on the specific target cell line in the specific candidate media. Compare gene expression patterns across candidate medias against a reference (typically FBS-containing media or a published gold-standard formulation).

**Why it's the deepest signal.** Two medias can produce identically viable cells with identical doubling times but radically different transcriptomes — and the transcriptome difference predicts whether the cells will behave as expected in downstream applications (differentiation, lipid accumulation, etc.).

**Tooling already in the family.** [`tucca-cellag/tucca-rna-seq`](https://github.com/tucca-cellag/tucca-rna-seq) is the production-grade RNA-Seq pipeline maintained at Tufts/TUCCA — direct dependency for this axis. Maintained by Benjamin Bromberg, ~1000 commits, Zenodo DOI, Snakemake-based.

**Open questions:**
- Bulk RNA-Seq or single-cell?
- Reference condition? (FBS-containing media of the same basal? Fresh tissue?)
- Comparison method? (DESeq2 — already in tucca-rna-seq — for differential expression; pathway enrichment on top.)

### 5.2 Cell growth — doubling time

The classic proliferation metric. Time for the cell population to double under steady-state conditions.

**Why useful.** Cheap to measure (just count cells over time). Strongly correlated with overall metabolic health. Good for fast triage: if doubling time is 5x slower than positive control, abandon the candidate before doing expensive transcriptomics.

**Open questions:**
- Counting method? (Hemocytometer, automated counter, image-based?)
- Confluence range to measure within?
- Number of replicates?

### 5.3 Cell health — imaging

Morphological assessment via microscopy. Look for:
- Normal cell shape (vs. rounding-up indicating stress)
- No vacuolation
- No detachment events
- No abnormal granularity

**Why useful.** Catches problems that biochemistry can't (e.g., a cell that's metabolically active but morphologically distressed). Hard to quantify without ML.

**LLM/foundation-model angle.** Vision-language models (GPT-4o, Gemini, Claude with vision) can triage microscopy images at scale. Daily microscopy + automated description and anomaly flagging is achievable today. Multimodal microscopy is one of the cleanest LLM entry points in this whole project (also flagged in the Todhunter 2024 review's microscopy section).

## 6. Success criteria for Media Thrive

To confirm with the project owner:

- **Primary metric:** transcriptomic distance from reference media within tolerance (e.g., correlation > X, no significant DEGs in core metabolic pathways).
- **Secondary metric:** doubling time within Y% of positive control.
- **Tertiary metric:** imaging-based health score above threshold.

The order matters: transcriptome is the deepest signal but most expensive; doubling time and imaging are cheap triage steps.

---

# Cross-cutting

## 7. System knowledge axis

System-level cell biology knowledge informs both halves. Anchored to specific databases per the whiteboard.

### 7.1 Metabolism (databases: KEGG)

What the cells need to *eat* and *produce* to stay alive (Start With) and grow (Thrive). Drives:
- Carbon source choice (glucose vs. galactose vs. pyruvate)
- Amino-acid auxotrophies — which amino acids must be supplied
- Lipid synthesis capability — fatty acids that must be supplied (especially relevant for fish, which require DHA/EPA)
- Nucleotide salvage vs. de novo
- Redox balance

**KEGG** (Kyoto Encyclopedia of Genes and Genomes) is the canonical pathway database. Useful queries:
- Pathway maps for the target organism (fish: e.g., zebrafish `dre`, Atlantic salmon `sasa`)
- Auxotrophy inference from genome annotation (which biosynthetic enzymes are present/absent)

### 7.2 Signaling (databases: RNA / DNA, EMBL/EMBO ecosystem)

Which receptors are expressed on the target cells and what ligands engage them. Drives growth-factor selection. The whiteboard names "RNA, DNA" databases under the EMBL/EMBO umbrella — likely referring to:
- **ENA** (European Nucleotide Archive) — DNA/RNA sequences
- **Ensembl** — genome annotation, gene families
- **EuropePMC** — literature mining

**Workflow** (per the DNA → Protein arrow on the whiteboard):
1. Get the target organism's genome / transcriptome
2. Identify expressed receptors in the target cell type
3. Map to ligands → these are the candidate growth factors
4. Cross-reference against §3.2 candidate table

### 7.3 How system knowledge feeds both halves

- **Start With:** metabolism → mandatory ingredients; signaling → candidate growth factors
- **Thrive:** metabolism → which pathways to track in transcriptomics; signaling → which signaling readouts indicate healthy state

**LLM angle.** Both pillars are exactly the kind of structured biology task that LLM-assisted literature mining accelerates. A query like "summarize the metabolic auxotrophies and active signaling pathways of [fish species] muscle satellite cells, with KEGG and Ensembl citations" is tractable today.

## 8. Validation approach

| Mode | Speed | Cost | Trustworthiness |
|---|---|---|---|
| **Paper-only ranking** | Hours | $0 | Low — biased toward published work |
| **Surrogate model** | Days | Modest (compute) | Medium — bounded by training data |
| **Wet-lab screen** | Weeks per round | High ($$$) | High — ground truth |

Sardine workflow combines all three:
1. **Paper-only**: assemble candidate component sets from caail + Beefy-9/B8/B9 lineage + fish-specific literature.
2. **Surrogate model**: train Bayesian-optimization or active-learning model (Cosenza-style) on existing public datasets to rank candidate combinations.
3. **Wet-lab**: validate top-K combinations on the target cell line using the Media Thrive metric stack.

LLM/agent layer sits on top of step 1 (literature synthesis), step 2 (proposing experiments), and the imaging step of Thrive (vision-language anomaly detection). Wet-lab and benchwork stay human-driven.

## 9. Decision workflow

1. **Confirm the target cell line / species.** ("Fish X" on whiteboard — confirm species.)
2. **Define survival** (Media Zero success criterion) and **define thriving** (Media Thrive success criteria).
3. **Anchor the basal.** Likely L-15 or fish-tuned DMEM/F12 derivative.
4. **Pin minimal growth-factor cocktail.** Whiteboard says PDGF + insulin; expect to add transferrin and selenium as standard.
5. **Enumerate often-ignored candidates.** Lipids first per whiteboard; expand to albumin, antioxidants, attachment factors.
6. **Build the Thrive measurement stack.** Set up tucca-rna-seq for the target species; define reference condition; set up doubling-time and imaging assays.
7. **Score combinations.** Surrogate model → top-K → wet-lab handoff with full Thrive metric stack.
8. **Iterate.** Active-learning loop with human-in-the-loop candidate gating.

## 10. Open scoping questions

These need answers before the project can move past scoping. Prioritized.

1. **Target cell line / species** — "fish X" needs a name. Determines basal, growth factor selection, and Thrive reference.
2. **Cell source** — primary line vs. immortalized line vs. iPSC-derived?
3. **Survival metric and threshold** — Media Zero success criterion (§4)
4. **Thrive metric thresholds** — for transcriptomic distance, doubling time, imaging score (§6)
5. **Reference condition for Thrive** — FBS-containing media of same basal? Fresh tissue?
6. **FBS allowed in Media Zero v0?** — strict serum-free from day one, or FBS as positive control?
7. **Validation cadence** — wet-lab cycles per month?
8. **Cost target** — $/L ceiling, or v0 unconstrained?
9. **Reproducibility scope** — same operator? same lab? cross-lab?

## 11. Caail literature cross-walk

Most directly relevant references in the caail bibliography (numbers refer to entries in `tucca-cellag/caail/Papers.md`):

| Topic | caail # | Relevance |
|---|---|---|
| BO for serum-free cell-ag media | #2, #3, #18 | Direct — Cosenza et al. on multi-objective and multi-information BO |
| AI for reduced-serum cultivated meat | #1 | Direct — Nikkhah et al. |
| DL + BO for E. coli media (transferable framework) | #15 | Method analog |
| Active learning for media | #23, #24, #25 | Hashizume, Zhang, Ozawa — methodology for the iteration loop |
| SVR for serum-free media | #21 | Older but methodologically relevant |
| Robotic execution of media optimization | #16 | Kanda et al. — execution layer |
| AI/ML for cultured meat (review) | #36 | Todhunter — frames the field |
| AI for food innovation (review, Kaplan/Jurafsky) | #37 | Frames the LLM layer |
| scRNA-Seq tools (relevant for Thrive) | #5, #8, #9, #12, #13 | DESC, scGNN, GLAE etc. for transcriptome interpretation |

## 12. Status

- **2026-05-09 09:48:** Initial whiteboard. Three component categories named for Media Zero. Three of four quadrants blank.
- **2026-05-09 10:05:** System knowledge axis added (metabolism, signaling). Concrete candidates: PDGF, IGF, fatty acids.
- **2026-05-09 10:17:** **Media Thrive added (3 measurement axes)**. Source annotations on Media Zero ingredients (Cells Source / Catalogs / Literature). Databases named: KEGG (metabolism), EMBL/EMBO (signaling). PDGF + **insulin** confirmed for growth factors. "Fish X" annotation on basal-media line.
- **Next milestone:** confirm target species ("fish X"), then operationalize success criteria for both Media Zero and Media Thrive.

<!-- agent-applied edit_1778339525253_n87unr 2026-05-09 target="§3 Media Zero framework — replace with RTM-Z0 v0 (rainbow trout muscle); also resolve §10 Q1, append §12 dated entry" -->
### [2026-05-09] Applied edit — §3 Media Zero framework — replace with RTM-Z0 v0 (rainbow trout muscle); also resolve §10 Q1, append §12 dated entry

_Rationale: User asked to build a Media Zero formulation for rainbow trout muscle cells, grounded in KEGG metabolism and Ensembl receptor lookups, with caail citations where relevant. This rewrite of §3 captures RTM-Z0 v0: L-15 basal (justified by KEGG `omy00400` Phe/Trp essentiality and trout 18–21 °C operating temperature), receptor-validated growth-factor cocktail (insulin / IGF-1 / PDGF-BB / FGF-2 / transferrin — every receptor confirmed in Ensembl USDA_OmykA_1.1 with explicit Ensembl IDs), and lipid-led often-ignored stack (DHA + EPA direct supply justified by KEGG `omy01040` flux limitation; selenium + NAC justified by `omy00450` and `omy00480` machinery). caail #2/3/17/18/21 cited for the iteration framework, with explicit caveat that caail has zero fish-specific entries. New §3.4 is the v0 summary. Resolves §10 Q1 (target species). Date-stamped per skill update protocol._

## 3. The Media Zero framework

**Target species (resolved 2026-05-09):** *Oncorhynchus mykiss* — rainbow trout. Cell type: primary mononucleated muscle cells (myogenic progenitor compartment, per Goffette et al. 2024 isolation method, PMID 39013963). Operating temperature: **18–21 °C** (not 37 °C — drives basal selection toward CO₂-independent L-15).

Media Zero = combination across three component categories, **constrained by system-level knowledge** (see §7). The point is not to optimize any one component in isolation, but to find a *minimal viable combination* that keeps trout muscle cells alive — using metabolism (KEGG `omy`) and signaling (Ensembl USDA_OmykA_1.1) knowledge to narrow the search space before any wet-lab work.

### 3.1 Basal media

**Selected: Leibovitz's L-15 (1×).** CO₂-independent (matches 18–21 °C trout culture-room conditions), teleost-tuned osmolality, amino-acid spectrum supplies KEGG-essential Phe and Trp (KEGG `omy00400` confirms trout has `pah` for Phe→Tyr but no de novo Phe or Trp synthesis). Dominant basal in published trout primary muscle work.

| Basal | Status for RTM-Z0 | Notes |
|---|---|---|
| **L-15 (Leibovitz)** | ✓ **selected** | CO₂-independent, fish-tuned, used in Goffette 2024 trout MPC system |
| DMEM/F12 | runner-up | Some trout work uses this with HEPES + open-cap; less natural fit |
| DMEM | rejected | Wrong temperature regime; CO₂-dependent buffering |
| RPMI-1640 | rejected | Lymphoid-tuned amino-acid spectrum |
| Beefy-9 / B8 / B9 | reference only | Mammalian / cell-ag mammalian-target basals — useful as formulation references but not directly applicable to trout |

[2026-05-09] Selected L-15 over DMEM/F12 because trout cells operate at ~18–21 °C; CO₂-buffering is wrong-temperature. Source bucket per whiteboard: Cells Source / Catalogs / Literature.

### 3.2 Growth factors — receptor-validated

**Whiteboard candidates (10:17 photo): PDGF, insulin.** All five proposed growth factors have receptor evidence in the trout genome (Ensembl USDA_OmykA_1.1).

| Component | Concentration | Rationale | Trout receptor (Ensembl ID) |
|---|---|---|---|
| Recombinant insulin | 10 µg/mL | Whiteboard. Cheapest signaling input; engages insrb, cross-engages igf1r at high dose | `insrb` ENSOMYG00000012063 |
| Recombinant IGF-1 | 10–25 ng/mL | Strong proliferative signal in trout MPCs; insurance against weak insulin→igf1r cross-talk | `igf1ra` ENSOMYG00000028616, `igf1rb` ENSOMYG00000066583 |
| Recombinant PDGF-BB | 10 ng/mL | Whiteboard. Engages both α and β PDGF receptors | `pdgfra` ENSOMYG00000005391, `pdgfrb` ENSOMYG00000026317 |
| Recombinant FGF-2 (bFGF) | 5 ng/mL | Workhorse for muscle progenitor proliferation; thermolabile, refresh every 48h | `fgfr1a` ENSOMYG00000031327, `fgfr4` ENSOMYG00000032603 |
| Holo-transferrin | 5–10 µg/mL | Iron delivery; tfr1a confirmed | `tfr1a` ENSOMYG00000031642 |

Strictly minimal v0 floor: **insulin + transferrin + selenium (ITS-equivalent)**. PDGF / IGF-1 / FGF-2 are added for survival robustness given the muscle-progenitor identity. Mammalian-source recombinants acceptable for v0 (receptor sequences conserved cross-species), flag for re-verification at the Thrive stage.

[2026-05-09] `insra` paralog not retrievable via Ensembl symbol lookup — likely annotation gap, not absence. v0 doesn't depend on it (`insrb` engagement sufficient). Follow-up: `/xrefs` lookup or BLAST against Atlantic salmon `insra`.

**LLM/foundation-model angle.** Protein language models (ESM-2/3, AlphaFold-3) are credible candidates for designing cheaper recombinant variants — same activity, easier expression, more stable. High-leverage place to bring foundation models into the project.

### 3.3 Often-ignored factors

**Whiteboard priority: fatty acids.** For trout — n-3 LC-PUFAs absolutely required for membrane integrity. KEGG `omy01040` confirms `fads2` (110521170) and `elovl5` (110499383) are annotated, so the ALA→EPA→DHA pathway *exists* — but in-vitro flux is insufficient absent abundant precursor. Direct supplementation, not bioconversion reliance.

| Component | Concentration | Rationale |
|---|---|---|
| **DHA** (22:6n-3) | 10 µM, BSA-conjugated | KEGG `omy01040` pathway present but flux-limited → direct supply |
| **EPA** (20:5n-3) | 10 µM, BSA-conjugated | Same; n-3 LC-PUFA mandatory for fish membranes |
| Chemically Defined Lipid Concentrate (Gibco 11905-031 or equiv.) | 1× (1:100 dilution) | Cholesterol, oleate, low linoleate, α-tocopherol baseline |
| Linoleate (18:2n-6) | CDLC level only | Cardona 2024 (PMID 38811794) — excess n-6 (arachidonate) detrimental in trout |
| Recombinant or fatty-acid-free albumin (HSA preferred; rHSA acceptable) | 1 mg/mL | Lipid carrier (DHA/EPA conjugation), anti-oxidant, toxin sink |
| **Sodium selenite** | 30 nM | KEGG `omy00450` confirms `sepsecs`, `scly`, `txnrd2.2` machinery → selenoprotein incorporation productive |
| L-Ascorbate-2-phosphate | 50 µg/mL | Antioxidant; stable form preferred over ascorbate |
| N-Acetylcysteine | 1 mM | GSH precursor; KEGG `omy00480` confirms full GSH machinery (`gclc`, `gss`, `gpx1/2/4a/7/9`, `gsr`, `g6pd`) |
| Pluronic F-68 | 0.1% w/v (only if shear-exposed) | Skip in static culture |
| Cold-water fish-gelatin or laminin | 5 µg/cm² | Trout MPCs adherent; fish-source gelatin avoids mammalian-protein contamination |

### 3.4 RTM-Z0 v0 summary

**RTM-Z0 v0** = L-15 + (insulin 10 µg/mL · IGF-1 10–25 ng/mL · PDGF-BB 10 ng/mL · FGF-2 5 ng/mL · holo-transferrin 5 µg/mL) + (DHA 10 µM + EPA 10 µM BSA-conjugated · CDLC 1× · rHSA 1 mg/mL · sodium selenite 30 nM · ascorbate-2-P 50 µg/mL · NAC 1 mM) on cold-water fish-gelatin substrate.

**Positive control:** L-15 + 10% FBS. RTM-Z0 v0 is scored against this baseline using the §4 survival metric. Anti-criteria from §4 still apply (no proliferation requirement at this stage — that belongs to Thrive).

**Iteration framework:** Cosenza-style multi-objective Bayesian optimization (caail #2, caail #3) once wet-lab survival data is in hand. caail #17, caail #18 for surrogate-model framing; caail #21 (Xu et al. 2014) as older SVR precedent. **Caveat:** caail bibliography contains zero fish-specific entries — trout-specific decisions lean on EuropePMC and salmonid aquaculture literature (Goffette 2024 PMID 39013963, Cardona 2024 PMID 38811794, He 2023 PMID 38132280, Trace 2025 PMID 40129714, Goswami/Kaplan 2024 PMID 39113103), not the cell-ag-AI canon.

**Caveats / TBD for wet-lab calibration:**
- All concentrations are literature-grounded starting points, **not** quantitative survival predictions.
- DHA/EPA dosing should be re-titrated — Cardona's caution is about n-6 excess, but n-3 PUFAs may also have an upper-band detrimental zone.
- Mammalian-source recombinant growth factors acceptable for v0; flag for re-verification at the Thrive stage with species-source proteins.
- Insulin 10 µg/mL vs. ITS-style 5–10 µg/mL is a wet-lab decision; trout-MPC literature clusters around 10 µg/mL but should be confirmed.


