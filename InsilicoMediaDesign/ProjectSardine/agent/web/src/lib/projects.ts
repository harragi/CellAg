/** Mirror of server-side project metadata, fetched from /api/projects. */

export type ProjectKey = "sardine" | "hamster";

export type ExamplePrompt = { label: string; prompt: string };

export type Project = {
  key: ProjectKey;
  displayName: string;
  shortName: string;
  description: string;
  color: "sardine" | "hamster";
  examplePrompts: ExamplePrompt[];
};

export type ProjectsResponse = {
  projects: Project[];
  default: ProjectKey;
};

export async function fetchProjects(): Promise<ProjectsResponse> {
  const res = await fetch("/api/projects");
  if (!res.ok) throw new Error(`/api/projects ${res.status}`);
  return (await res.json()) as ProjectsResponse;
}
