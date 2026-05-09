import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const BASE = "https://rest.ensembl.org";

export function buildEnsemblTool() {
  return tool(
    "query_ensembl",
    "Query the Ensembl REST API for genome, gene, and transcript data. Unauthenticated. Use for the signaling axis of system knowledge — find which receptors a target species expresses (e.g., does rainbow trout have a PDGF receptor?). Common endpoints: '/lookup/symbol/{species}/{symbol}', '/xrefs/symbol/{species}/{symbol}', '/sequence/id/{id}', '/info/species'.",
    {
      endpoint: z
        .string()
        .describe(
          "Path under https://rest.ensembl.org. Must start with '/'. Example: '/lookup/symbol/homo_sapiens/PDGFRA'."
        ),
      query: z
        .record(z.string())
        .optional()
        .describe(
          "Optional query-string parameters as a key/value object."
        ),
    },
    async ({ endpoint, query }) => {
      const url = new URL(BASE + (endpoint.startsWith("/") ? endpoint : `/${endpoint}`));
      if (query) {
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      }
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "sardine-start-with-agent/0.1",
          },
        });
        const text = await res.text();
        if (!res.ok) {
          return {
            content: [{ type: "text" as const, text: `Ensembl ${res.status}: ${text.slice(0, 1000)}` }],
            isError: true,
          };
        }
        const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n\n[…truncated]" : text;
        return {
          content: [{ type: "text" as const, text: `Ensembl ${endpoint}:\n\n${truncated}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Ensembl fetch failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
