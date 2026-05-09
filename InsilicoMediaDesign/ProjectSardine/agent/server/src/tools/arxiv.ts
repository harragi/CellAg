import { z } from "zod";
import { tool } from "@anthropic-ai/claude-agent-sdk";

const BASE = "https://export.arxiv.org/api/query";

export function buildArxivTool() {
  return tool(
    "arxiv_search",
    "Search arXiv for preprints. Returns parsed entries with title, authors, summary, and arXiv ID. Use for recent / preprint work that may not yet be in caail.",
    {
      query: z.string().describe("arXiv search query. Example: 'cultured meat media optimization'."),
      max_results: z.number().int().min(1).max(20).optional().default(10),
    },
    async ({ query, max_results }) => {
      const url = new URL(BASE);
      url.searchParams.set("search_query", `all:${query}`);
      url.searchParams.set("start", "0");
      url.searchParams.set("max_results", String(max_results));
      url.searchParams.set("sortBy", "relevance");
      url.searchParams.set("sortOrder", "descending");
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "sardine-start-with-agent/0.1" },
        });
        if (!res.ok) {
          return {
            content: [{ type: "text" as const, text: `arXiv ${res.status} ${res.statusText}` }],
            isError: true,
          };
        }
        const xml = await res.text();
        const entries = parseAtomEntries(xml);
        if (entries.length === 0) {
          return {
            content: [{ type: "text" as const, text: `No arXiv results for "${query}".` }],
          };
        }
        const formatted = entries
          .map((e, i) => {
            const summary = e.summary.length > 600 ? e.summary.slice(0, 600) + "…" : e.summary;
            return `[${i + 1}] ${e.title}\n    ${e.authors.join(", ")}\n    arXiv: ${e.id}\n    ${summary}`;
          })
          .join("\n\n");
        return {
          content: [
            { type: "text" as const, text: `arXiv results for "${query}":\n\n${formatted}` },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `arXiv fetch failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}

type ArxivEntry = { title: string; authors: string[]; summary: string; id: string };

function parseAtomEntries(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(xml))) {
    const block = m[1] ?? "";
    const title = pickTag(block, "title").replace(/\s+/g, " ").trim();
    const summary = pickTag(block, "summary").replace(/\s+/g, " ").trim();
    const idUrl = pickTag(block, "id").trim();
    const id = idUrl.replace(/^.*\/abs\//, "");
    const authors: string[] = [];
    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
    let am: RegExpExecArray | null;
    while ((am = authorRegex.exec(block))) {
      authors.push((am[1] ?? "").trim());
    }
    if (title) entries.push({ title, authors, summary, id });
  }
  return entries;
}

function pickTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = re.exec(block);
  return m ? (m[1] ?? "") : "";
}
