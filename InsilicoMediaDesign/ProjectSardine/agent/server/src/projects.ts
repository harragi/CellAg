import { resolve } from "node:path";

const AGENT_DIR = resolve(import.meta.dir, "..", "..");
const CELLAG_ROOT = resolve(AGENT_DIR, "..", "..", "..");

export type ProjectKey = "sardine" | "hamster";

export type ExamplePrompt = { label: string; prompt: string };

export type Project = {
  key: ProjectKey;
  displayName: string;
  shortName: string;
  description: string;
  /** Absolute path to the driver SKILL.md loaded into the system prompt. */
  skillPath: string;
  /** Absolute path to the project's canonical notes.md. */
  notesPath: string;
  /** Display color slot. Matches CSS vars --p-<color>. */
  color: "sardine" | "hamster";
  examplePrompts: ExamplePrompt[];
};

export const PROJECTS: Record<ProjectKey, Project> = {
  sardine: {
    key: "sardine",
    displayName: "Sardine — Start With",
    shortName: "Sardine",
    description:
      "Designing minimum-viable cell-culture media for fish cells (Project Sardine, Media Zero half — composition).",
    skillPath: resolve(CELLAG_ROOT, ".claude/skills/sardine-start-with/SKILL.md"),
    notesPath: resolve(CELLAG_ROOT, "InsilicoMediaDesign/ProjectSardine/notes.md"),
    color: "sardine",
    examplePrompts: [
      {
        label: "Build a Media Zero for rainbow trout muscle cells",
        prompt:
          "Build a Media Zero formulation for rainbow trout muscle cells. Use the system-knowledge axis: pull metabolic pathways from KEGG and check what receptors rainbow trout expresses for the candidate growth factors. Cite caail papers where relevant. Then propose an edit to notes.md capturing the recommendation.",
      },
      {
        label: "What's the current state of Project Sardine?",
        prompt:
          "What's the current state of Project Sardine? Summarize where Media Zero and Media Thrive stand and what's blocking progress.",
      },
      {
        label: "Survey caail and arXiv for serum-free fish-cell media",
        prompt:
          "Survey caail and arXiv for serum-free fish-cell media literature. Return a short bibliography I could add to §11 of notes.md.",
      },
    ],
  },
  hamster: {
    key: "hamster",
    displayName: "Hamster — Validate",
    shortName: "Hamster",
    description:
      "Validating cell-culture media against CHO genome-scale metabolic models (iCHO family) and metabolic readouts (validation, not composition).",
    skillPath: resolve(CELLAG_ROOT, ".claude/skills/hamster-validate/SKILL.md"),
    notesPath: resolve(CELLAG_ROOT, "MediaValidation/ProjectHamster/notes.md"),
    color: "hamster",
    examplePrompts: [
      {
        label: "Set up a validation pass for CD-CHO against an iCHO model",
        prompt:
          "Set up a validation pass for the CD-CHO chemically-defined media against the iCHOv1 model. Step 1: confirm the BiGG model ID and pull a few key exchange reactions (glucose, glutamine, oxygen). Step 2: list ~8 of CD-CHO's likely ingredients and find the matching ChEBI IDs. Then propose an edit to notes.md §6 capturing the mapping table.",
      },
      {
        label: "Compute metabolic yields from a time-course",
        prompt:
          "I have a CHO bioreactor sample at t=24h: VCD 1.2 ×10⁶ cells/mL, glucose 12 mM, lactate 8 mM. At t=48h: VCD 2.4, glucose 7 mM, lactate 14 mM. Compute q_Glc, q_Lac, μ, doubling time, and Y_Lac/Glc. Interpret the metabolic state.",
      },
      {
        label: "What's the current state of Project Hamster?",
        prompt:
          "What's the current state of Project Hamster? Summarize the validation framework and the open scoping questions in §8 of notes.md.",
      },
    ],
  },
};

export function getProject(key: string): Project | undefined {
  return PROJECTS[key as ProjectKey];
}

export const DEFAULT_PROJECT: ProjectKey = "sardine";
export const ALL_PROJECTS = Object.values(PROJECTS);
