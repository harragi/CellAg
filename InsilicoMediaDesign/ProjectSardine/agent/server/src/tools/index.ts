import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { buildNotesTools } from "./notes.ts";
import { buildKeggTool } from "./kegg.ts";
import { buildEnsemblTool } from "./ensembl.ts";
import { buildEuropePmcTool } from "./europepmc.ts";
import { buildArxivTool } from "./arxiv.ts";
import { buildCaailTool } from "./caail.ts";
import { buildBiggTool } from "./bigg.ts";
import { buildChebiTool } from "./chebi.ts";
import { buildYieldsTool } from "./yields.ts";

export type NotifyClient = (event: string, data: unknown) => void;

export function buildScienceMcpServer(notify: NotifyClient) {
  const tools = [
    ...buildNotesTools(notify),
    buildKeggTool(),
    buildEnsemblTool(),
    buildEuropePmcTool(),
    buildArxivTool(),
    buildCaailTool(),
    buildBiggTool(),
    buildChebiTool(),
    buildYieldsTool(),
  ];
  return createSdkMcpServer({
    name: "science",
    version: "0.3.0",
    tools,
  });
}

export const SCIENCE_TOOL_GLOB = "mcp__science__*";
