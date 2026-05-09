import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const OLS_BASE = "https://www.ebi.ac.uk/ols/api";

export function buildChebiTool() {
  return tool(
    "query_chebi",
    "Look up chemical compounds in the ChEBI ontology via the EBI Ontology Lookup Service (OLS). Use this to map a media-ingredient name (e.g. 'L-glutamine', 'pyruvate', 'cholesterol') to a canonical ChEBI ID, formula, and synonyms. The ChEBI ID is the bridge between human-readable ingredient names and the metabolite identifiers used in genome-scale models (BiGG / KEGG).",
    {
      query: z
        .string()
        .describe(
          "Compound name or partial name. Example: 'L-glutamine', 'cholesterol', 'sodium pyruvate'."
        ),
      limit: z.number().int().min(1).max(20).optional().default(8),
    },
    async ({ query, limit }) => {
      const url = new URL(`${OLS_BASE}/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("ontology", "chebi");
      url.searchParams.set("type", "class");
      url.searchParams.set("rows", String(limit));
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "cellag-agent/0.1",
          },
        });
        if (!res.ok) {
          return {
            content: [
              {
                type: "text" as const,
                text: `OLS ${res.status} ${res.statusText}`,
              },
            ],
            isError: true,
          };
        }
        const data = (await res.json()) as {
          response?: { docs?: Array<Record<string, unknown>> };
        };
        const docs = data.response?.docs ?? [];
        if (docs.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No ChEBI matches for "${query}".`,
              },
            ],
          };
        }
        const formatted = docs
          .map((d, i) => {
            const label = (d.label as string) ?? "(no label)";
            const id = (d.obo_id as string) ?? (d.short_form as string) ?? "?";
            const description = Array.isArray(d.description)
              ? (d.description as string[]).join(" ")
              : (d.description as string) ?? "";
            const synonyms = Array.isArray(d.synonym)
              ? (d.synonym as string[]).slice(0, 3).join(", ")
              : "";
            const trimmedDesc =
              description.length > 200
                ? description.slice(0, 200) + "…"
                : description;
            return `[${i + 1}] ${label}\n    ${id}${synonyms ? ` · synonyms: ${synonyms}` : ""}\n    ${trimmedDesc}`;
          })
          .join("\n\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `ChEBI matches for "${query}":\n\n${formatted}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `ChEBI fetch failed: ${(err as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
