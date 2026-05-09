import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { buildNotesTools } from "./notes.ts";
import { buildKeggTool } from "./kegg.ts";
import { buildEnsemblTool } from "./ensembl.ts";
import { buildEuropePmcTool } from "./europepmc.ts";
import { buildArxivTool } from "./arxiv.ts";
import { buildCaailTool } from "./caail.ts";

export type NotifyClient = (event: string, data: unknown) => void;

export function buildScienceMcpServer(notify: NotifyClient) {
  const tools = [
    ...buildNotesTools(notify),
    buildKeggTool(),
    buildEnsemblTool(),
    buildEuropePmcTool(),
    buildArxivTool(),
    buildCaailTool(),
  ];
  return createSdkMcpServer({
    name: "science",
    version: "0.1.0",
    tools,
  });
}

export const SCIENCE_TOOL_GLOB = "mcp__science__*";
