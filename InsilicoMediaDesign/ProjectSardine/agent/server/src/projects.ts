import { resolve } from "node:path";

const AGENT_DIR = resolve(import.meta.dir, "..", "..");
const CELLAG_ROOT = resolve(AGENT_DIR, "..", "..", "..");

/** Notes-file targets the agent can read from / propose edits against. */
export type NotesTarget = "sardine" | "hamster";

export type ExamplePrompt = { label: string; prompt: string };

export type AgentConfig = {
  displayName: string;
  shortName: string;
  description: string;
  /** Both notes files are loaded into the system prompt every turn. */
  notesPaths: Record<NotesTarget, string>;
  /** Both driver skills are loaded into the system prompt every turn. */
  skillPaths: { sardine: string; hamster: string };
  examplePrompts: ExamplePrompt[];
};

export const CONFIG: AgentConfig = {
  displayName: "CellAg agent",
  shortName: "CellAg",
  description:
    "Unified design → validate loop. Composes media (Sardine framework) and validates against metabolic models / readouts (Hamster framework, CHO-tuned).",
  notesPaths: {
    sardine: resolve(
      CELLAG_ROOT,
      "InsilicoMediaDesign/ProjectSardine/notes.md"
    ),
    hamster: resolve(CELLAG_ROOT, "MediaValidation/ProjectHamster/notes.md"),
  },
  skillPaths: {
    sardine: resolve(
      CELLAG_ROOT,
      ".claude/skills/sardine-start-with/SKILL.md"
    ),
    hamster: resolve(CELLAG_ROOT, ".claude/skills/hamster-validate/SKILL.md"),
  },
  examplePrompts: [
    {
      label: "Open the live bench with a CHO-K1 starter media",
      prompt:
        "Skip the literature search. Just call simulate_cho_media right now with sensible CHO-K1 mAb-platform defaults (glucose 25 mM, glutamine 4 mM, asparagine 5 mM, insulin 10 mg/L, IGF-1 20 ng/mL, selenium 30 nM, NaCl 117 mM, initial VCD 0.5 ×10^6/mL, 96 h horizon). Label it 'CHO-K1-starter'. After the bench renders, briefly tell me the predicted bottlenecks I'll see when I move sliders.",
    },
    {
      label: "Design a CHO media + validate + open the live bench",
      prompt:
        "Design a chemically-defined media for a CHO-K1 mAb-producing line, validate it via iCHO, AND end with a simulate_cho_media call so the live dashboard appears inline. Steps: (1) Compose ~10 components grounded in published recipes (search EuropePMC, cite >=2 PMIDs). (2) Map ingredients to ChEBI IDs and iCHOv1 BiGG exchanges. (3) Predict expected mu, q_Glc, q_Gln, Y_Lac/Glc. (4) MUST call simulate_cho_media with the composition mapped to its 7 scalar inputs (glucose_mM, glutamine_mM, asparagine_mM, insulin_mg_L, igf1_ng_mL, selenium_nM, naCl_mM). Use defaults for any value you don't have specific data for. (5) After the bench is rendered, give the verdict and propose an edit to the Hamster notes.md.",
    },
    {
      label: "Compose a Media Zero for rainbow trout muscle cells",
      prompt:
        "Build a Media Zero formulation for rainbow trout muscle cells using the Sardine framework. Use the system-knowledge axis: pull metabolic pathways from KEGG and check what receptors rainbow trout expresses for the candidate growth factors. Cite caail papers where relevant. Then propose an edit to the Sardine notes.md capturing the recommendation.",
    },
    {
      label: "Compute metabolic yields from a CHO time-course",
      prompt:
        "I have a CHO bioreactor sample at t=24h: VCD 1.2 x10^6 cells/mL, glucose 12 mM, lactate 8 mM. At t=48h: VCD 2.4, glucose 7 mM, lactate 14 mM. Use compute_metabolic_yields to compute the rates and interpret in 3 sentences.",
    },
  ],
};
