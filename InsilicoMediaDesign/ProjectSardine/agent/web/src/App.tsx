import { useEffect, useRef, useState } from "react";
import { Chat, type ChatHandle } from "./components/Chat.tsx";
import { Header, type AgentStatus } from "./components/Header.tsx";
import { StepsRail } from "./components/StepsRail.tsx";
import type { ToolCall } from "./components/ToolCard.tsx";
import { fetchProjects, type Project, type ProjectKey } from "./lib/projects.ts";

export type ProposedEdit = {
  id: string;
  project: ProjectKey;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectKey | null>(null);
  // Per-project state: each switch resets the UI's transient state. Pending
  // edits are filtered to the active project below.
  const [pendingEdits, setPendingEdits] = useState<ProposedEdit[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [model, setModel] = useState<string>("claude-opus-4-7");
  const chatRef = useRef<ChatHandle>(null);

  // Load project list and pick default.
  useEffect(() => {
    fetchProjects()
      .then((data) => {
        setProjects(data.projects);
        setCurrentProject(data.default);
      })
      .catch((err) => console.error("failed to load projects", err));
    fetch("/health")
      .then((r) => r.json())
      .then((d) => d?.model && setModel(d.model))
      .catch(() => undefined);
  }, []);

  function reset() {
    if (!currentProject) return;
    fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: currentProject }),
    }).catch(() => undefined);
    chatRef.current?.reset();
    setPendingEdits((prev) => prev.filter((p) => p.project !== currentProject));
    setToolCalls([]);
    setStatus("idle");
  }

  function switchProject(key: ProjectKey) {
    if (key === currentProject) return;
    setCurrentProject(key);
    chatRef.current?.reset();
    setToolCalls([]);
    setStatus("idle");
  }

  const project = projects.find((p) => p.key === currentProject) ?? null;
  const editsForProject = pendingEdits.filter((e) => e.project === currentProject);

  return (
    <div className="app">
      <Header
        status={status}
        model={model}
        projects={projects}
        currentProject={currentProject}
        onProjectChange={switchProject}
        onReset={reset}
      />
      <div className="app-body">
        <StepsRail calls={toolCalls} />
        <Chat
          ref={chatRef}
          project={project}
          pendingEdits={editsForProject}
          toolCalls={toolCalls}
          onProposedEdit={(edit) => {
            setPendingEdits((prev) => [
              ...prev.filter((p) => p.id !== edit.id),
              edit,
            ]);
          }}
          onResolveEdit={(editId) => {
            setPendingEdits((prev) => prev.filter((p) => p.id !== editId));
          }}
          onToolCall={(call) => {
            setToolCalls((prev) => [...prev, call]);
          }}
          onToolResult={(id, result, isError) => {
            setToolCalls((prev) =>
              prev.map((c) => (c.id === id ? { ...c, result, isError } : c))
            );
          }}
          onStatusChange={setStatus}
        />
      </div>
    </div>
  );
}
