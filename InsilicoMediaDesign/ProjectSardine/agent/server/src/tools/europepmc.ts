import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export function buildEuropePmcTool() {
  return tool(
    "search_europepmc",
    "Search EuropePMC (PubMed + PMC + preprints) for biomedical literature. Unauthenticated. Returns JSON with title, authors, abstract, and PMIDs/DOIs. Use this for evidence-grounded literature lookups beyond caail.",
    {
      query: z
        .string()
        .describe(
          "EuropePMC search syntax. Examples: 'cultured meat media optimization', 'Cosenza serum-free', 'rainbow trout muscle satellite cells'."
        ),
      limit: z.number().int().min(1).max(25).optional().default(10),
    },
    async ({ query, limit }) => {
      const url = new URL(BASE);
      url.searchParams.set("query", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("pageSize", String(limit));
      url.searchParams.set("resultType", "core");
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "sardine-start-with-agent/0.1" },
        });
        if (!res.ok) {
          return {
            content: [{ type: "text" as const, text: `EuropePMC ${res.status} ${res.statusText}` }],
            isError: true,
          };
        }
        const data = (await res.json()) as {
          resultList?: { result?: Array<Record<string, unknown>> };
        };
        const results = data.resultList?.result ?? [];
        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: `No EuropePMC results for "${query}".` }] };
        }
        const formatted = results
          .map((r, i) => {
            const title = (r.title as string) ?? "(no title)";
            const authors = (r.authorString as string) ?? "(no authors)";
            const journal = (r.journalTitle as string) ?? "(no journal)";
            const year = (r.pubYear as string) ?? "?";
            const doi = (r.doi as string) ?? "";
            const pmid = (r.pmid as string) ?? "";
            const abstract = (r.abstractText as string) ?? "";
            const trimmedAbstract = abstract.length > 600 ? abstract.slice(0, 600) + "…" : abstract;
            return `[${i + 1}] ${title}\n    ${authors} — ${journal} (${year})\n    ${doi ? `DOI: ${doi}` : ""} ${pmid ? ` PMID: ${pmid}` : ""}\n    ${trimmedAbstract}`;
          })
          .join("\n\n");
        return {
          content: [
            { type: "text" as const, text: `EuropePMC results for "${query}":\n\n${formatted}` },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `EuropePMC fetch failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
