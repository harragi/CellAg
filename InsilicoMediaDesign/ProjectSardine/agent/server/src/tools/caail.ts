import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { CAAIL_PAPERS_PATH } from "../paths.ts";

export function buildCaailTool() {
  return tool(
    "search_caail",
    "Search the local caail bibliography (tucca-cellag/caail Papers.md) for matches. Returns the matching reference entries with their caail numbers. Falls back to a polite 'not cloned' message if the local clone is missing.",
    {
      pattern: z
        .string()
        .describe(
          "Case-insensitive substring or simple regex to match against the references list. Examples: 'Cosenza', 'serum-free', 'Bayesian'."
        ),
    },
    async ({ pattern }) => {
      if (!existsSync(CAAIL_PAPERS_PATH)) {
        return {
          content: [
            {
              type: "text" as const,
              text: `caail Papers.md not found at ${CAAIL_PAPERS_PATH}. To enable this tool, clone the repo: git clone https://github.com/tucca-cellag/caail.git ${CAAIL_PAPERS_PATH.replace(/\/Papers\.md$/, "")}`,
            },
          ],
          isError: true,
        };
      }
      const text = await readFile(CAAIL_PAPERS_PATH, "utf-8");
      let regex: RegExp;
      try {
        regex = new RegExp(pattern, "i");
      } catch {
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      }
      // Each reference entry starts with `<a id="N">N</a> ` and runs until the next reference or EOF.
      const refMatches = [...text.matchAll(/<a id="(\d+)">\d+<\/a>([^<]*?)(?=\n<a id=|\n## |\n#|$)/gs)];
      const hits = refMatches.filter(([, , body]) => regex.test(body ?? ""));
      if (hits.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No caail references match /${pattern}/i.` }],
        };
      }
      const formatted = hits
        .map(([, num, body]) => `caail #${num}:${(body ?? "").trim()}`)
        .join("\n\n");
      return {
        content: [
          {
            type: "text" as const,
            text: `caail matches for /${pattern}/i (${hits.length} of ${refMatches.length} entries):\n\n${formatted}`,
          },
        ],
      };
    }
  );
}
