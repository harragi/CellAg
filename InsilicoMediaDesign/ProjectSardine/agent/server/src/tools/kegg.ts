import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const BASE = "https://rest.kegg.jp";

export function buildKeggTool() {
  return tool(
    "query_kegg",
    "Query the KEGG REST API for metabolic pathway and gene/organism data. KEGG is unauthenticated. Use for the metabolism axis of system knowledge — KEGG organism codes (e.g., 'hsa' for human, 'mmu' for mouse, 'dre' for zebrafish) gate species-specific lookups.",
    {
      operation: z
        .enum(["get", "find", "list", "link", "info"])
        .describe(
          "KEGG operation. 'get' fetches an entry by ID (e.g., 'map00010'). 'find' searches a database for keywords. 'list' enumerates entries. 'link' returns cross-references. 'info' returns DB metadata."
        ),
      query: z
        .string()
        .describe(
          "Operation argument. For 'get' and 'list': an ID or DB name. For 'find': 'database/keyword'. For 'link': 'target/source'. For 'info': database name."
        ),
    },
    async ({ operation, query }) => {
      const url = `${BASE}/${operation}/${encodeURIComponent(query).replace(/%2F/g, "/")}`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": "sardine-start-with-agent/0.1" } });
        if (!res.ok) {
          return {
            content: [{ type: "text" as const, text: `KEGG ${res.status} ${res.statusText} for ${url}` }],
            isError: true,
          };
        }
        const text = await res.text();
        const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n\n[…truncated]" : text;
        return {
          content: [{ type: "text" as const, text: `KEGG ${operation}/${query}:\n\n${truncated}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `KEGG fetch failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
