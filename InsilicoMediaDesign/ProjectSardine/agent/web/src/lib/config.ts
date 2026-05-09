/** Mirror of server-side agent config, fetched from /api/config. */

export type NotesTarget = "sardine" | "hamster";

export type ExamplePrompt = { label: string; prompt: string };

export type AgentConfig = {
  displayName: string;
  shortName: string;
  description: string;
  examplePrompts: ExamplePrompt[];
};

export async function fetchAgentConfig(): Promise<AgentConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`/api/config ${res.status}`);
  return (await res.json()) as AgentConfig;
}
