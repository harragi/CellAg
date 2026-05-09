import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const BASE = "http://bigg.ucsd.edu/api/v2";

export function buildBiggTool() {
  return tool(
    "query_bigg",
    "Query the BiGG Models REST API for genome-scale metabolic models, including the iCHO family for Chinese hamster ovary (CHO) cells. Endpoints (relative to https://bigg.ucsd.edu/api/v2): 'models' (list), 'models/{id}', 'models/{id}/reactions/{rxn_id}', 'models/{id}/metabolites/{met_id}', 'models/{id}/genes/{gene_id}', 'universal/reactions/{id}', 'universal/metabolites/{id}', 'search?query=...&search_type=reactions|metabolites|models|genes'. Useful CHO model IDs: 'iCHOv1', 'iCHOv1_DG44', 'iCHOv1_K1', 'iCHOv1_S'. Use BiGG metabolite IDs like 'glc__D_e' (glucose extracellular) and reaction IDs like 'EX_glc__D_e' (exchange) or 'BIOMASS_cho' (biomass).",
    {
      endpoint: z
        .string()
        .describe(
          "Path under https://bigg.ucsd.edu/api/v2. May start with '/' or not. Example: 'models/iCHOv1/reactions/EX_glc__D_e'."
        ),
      query: z
        .record(z.string())
        .optional()
        .describe("Optional query string parameters for search endpoints."),
    },
    async ({ endpoint, query }) => {
      const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = new URL(BASE + path);
      if (query) {
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      }
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "cellag-agent/0.1",
          },
        });
        const text = await res.text();
        if (!res.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `BiGG ${res.status}: ${text.slice(0, 800)}`,
              },
            ],
            isError: true,
          };
        }
        const truncated =
          text.length > 8000 ? text.slice(0, 8000) + "\n\n[…truncated]" : text;
        return {
          content: [
            {
              type: "text" as const,
              text: `BiGG ${path}:\n\n${truncated}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `BiGG fetch failed: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
