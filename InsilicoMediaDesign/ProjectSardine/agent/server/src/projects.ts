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
      label:
        "Design a CHO media and validate it end-to-end through iCHO",
      prompt:
        "Design a chemically-defined media for a CHO-K1 mAb-producing line, then validate it through the iCHO metabolic-model lens. (1) Compose ~10 components based on published recipes (search EuropePMC for Beefy-9 / BalanCD / academic CD-CHO formulations; cite at least two PMIDs). (2) Map each ingredient to its ChEBI ID and BiGG iCHOv1 exchange reaction; flag unmapped fraction. (3) Predict expected μ, q_Glc, q_Gln, Y_Lac/Glc with industry-benchmark citations. (4) Sanity-check using compute_metabolic_yields on synthetic data: t=24h VCD 1.0 ×10⁶/mL, glucose 25 mM, glutamine 4 mM, lactate 2 mM → t=96h VCD 8.0, glucose 12 mM, glutamine 0.5 mM, lactate 18 mM. (5) Verdict: good choice or not, biggest risk, what experiments would confirm. (6) Propose an edit to the Hamster notes.md §6 capturing the full pass.",
    },
    {
      label: "Compose a Media Zero for rainbow trout muscle cells",
      prompt:
        "Build a Media Zero formulation for rainbow trout muscle cells using the Sardine framework. Use the system-knowledge axis: pull metabolic pathways from KEGG and check what receptors rainbow trout expresses for the candidate growth factors. Cite caail papers where relevant. Then propose an edit to the Sardine notes.md capturing the recommendation.",
    },
    {
      label: "Compute metabolic yields from a CHO time-course",
      prompt:
        "I have a CHO bioreactor sample at t=24h: VCD 1.2 ×10⁶ cells/mL, glucose 12 mM, lactate 8 mM. At t=48h: VCD 2.4, glucose 7 mM, lactate 14 mM. Use compute_metabolic_yields to compute the rates and interpret in 3 sentences.",
    },
    {
      label: "Summarize current state across both notes files",
      prompt:
        "Summarize the current state across both notes files (Sardine for composition, Hamster for validation). What's decided, what's blocking each, what's the highest-priority unblocker right now?",
    },
  ],
};
