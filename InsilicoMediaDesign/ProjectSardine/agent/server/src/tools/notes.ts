import { readFile } from "node:fs/promises";
import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { NOTES_PATH } from "../paths.ts";
import { newEditId, state, type ProposedEdit } from "../state.ts";

type NotifyClient = (event: string, data: unknown) => void;

export function buildNotesTools(notify: NotifyClient) {
  const readNotes = tool(
    "read_notes",
    "Read the current contents of the canonical notes.md (the project's source of truth).",
    {},
    async () => {
      const content = await readFile(NOTES_PATH, "utf-8");
      return {
        content: [{ type: "text" as const, text: content }],
      };
    }
  );

  const proposeNotesEdit = tool(
    "propose_notes_edit",
    "Stage a section edit to notes.md for user review. The edit does NOT write to disk — the user sees a diff in the UI and clicks Apply or Reject. Provide a section identifier (e.g., '§10 Open scoping questions'), the proposed new content for that section, and a clear rationale.",
    {
      section: z
        .string()
        .describe(
          "Which section of notes.md the edit targets (e.g., '§10 Open scoping questions', or a free-form description if the edit spans sections)."
        ),
      new_content: z
        .string()
        .describe(
          "The proposed new content for the section. Markdown OK. The user will see this verbatim in a diff view."
        ),
      rationale: z
        .string()
        .describe(
          "Why this edit should be made. Shown to the user alongside the diff."
        ),
    },
    async ({ section, new_content, rationale }) => {
      const edit: ProposedEdit = {
        id: newEditId(),
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
            text: `Edit ${edit.id} staged for user review. Tell the user the diff is in the side panel and wait for their next message before assuming it was applied.`,
          },
        ],
      };
    }
  );

  return [readNotes, proposeNotesEdit];
}
