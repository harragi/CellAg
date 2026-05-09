import { readFile } from "node:fs/promises";
import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { CONFIG, type NotesTarget } from "../projects.ts";
import { newEditId, state, type ProposedEdit } from "../state.ts";

type NotifyClient = (event: string, data: unknown) => void;

export function buildNotesTools(notify: NotifyClient) {
  const readNotes = tool(
    "read_notes",
    "Re-read one of the canonical notes files. The inlined copies in the system prompt are usually current; call this only if you suspect a notes file was just edited (e.g., after a propose_notes_edit was applied). Specify target_file: 'sardine' = composition state (InsilicoMediaDesign/ProjectSardine/notes.md), 'hamster' = validation state (MediaValidation/ProjectHamster/notes.md).",
    {
      target_file: z
        .enum(["sardine", "hamster"])
        .describe(
          "Which notes file to read. 'sardine' for composition / fish-focused. 'hamster' for validation / CHO-focused."
        ),
    },
    async ({ target_file }) => {
      const target = target_file as NotesTarget;
      const content = await readFile(CONFIG.notesPaths[target], "utf-8");
      return {
        content: [{ type: "text" as const, text: `# ${target} notes.md\n\n${content}` }],
      };
    }
  );

  const proposeNotesEdit = tool(
    "propose_notes_edit",
    "Stage a section edit to one of the canonical notes files for user review. The edit does NOT write to disk — the user sees a diff in the UI and clicks apply or reject. Choose target_file by what kind of decision the edit captures: 'sardine' for composition decisions (basal/growth-factor selection, system-knowledge entries, fish-cell scoping); 'hamster' for validation decisions (ingredient-to-model mapping, q_X interpretations, predicted-vs-measured analyses, CHO-specific scoping).",
    {
      target_file: z
        .enum(["sardine", "hamster"])
        .describe(
          "Which notes file to edit. 'sardine' = composition state. 'hamster' = validation state."
        ),
      section: z
        .string()
        .describe(
          "Which section of notes.md the edit targets (e.g., '§6 Validation workflow', or a free-form description if it spans sections)."
        ),
      new_content: z
        .string()
        .describe(
          "Proposed new content for the section. Markdown OK. The user will see this verbatim in a diff view."
        ),
      rationale: z
        .string()
        .describe(
          "Why this edit should be made. Shown to the user alongside the diff. Include why you chose this target_file if it's not obvious."
        ),
    },
    async ({ target_file, section, new_content, rationale }) => {
      const edit: ProposedEdit = {
        id: newEditId(),
        target: target_file as NotesTarget,
        section,
        newContent: new_content,
        rationale,
        proposedAt: Date.now(),
      };
      state.proposedEdits.set(edit.id, edit);
      notify("proposed_edit", edit);
      return {
        content: [
          {
            type: "text" as const,
            text: `Edit ${edit.id} staged for user review (target: ${target_file}). Tell the user the diff is shown inline and wait for their next message before assuming it was applied.`,
          },
        ],
      };
    }
  );

  return [readNotes, proposeNotesEdit];
}
