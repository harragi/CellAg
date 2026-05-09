import { useEffect, useRef, useState } from "react";
import { Chat, type ChatHandle } from "./components/Chat.tsx";
import { Header, type AgentStatus } from "./components/Header.tsx";
import { ProgressStrip } from "./components/ProgressStrip.tsx";
import { StepsRail } from "./components/StepsRail.tsx";
import type { ToolCall } from "./components/ToolCard.tsx";
import type { BenchInit } from "./components/BenchCard.tsx";
import { fetchAgentConfig, type AgentConfig, type NotesTarget } from "./lib/config.ts";

export type ProposedEdit = {
  id: string;
  target: NotesTarget;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export type BenchData = BenchInit;

export function App() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [pendingEdits, setPendingEdits] = useState<ProposedEdit[]>([]);
  const [benches, setBenches] = useState<BenchData[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [model, setModel] = useState<string>("claude-opus-4-7");
  const chatRef = useRef<ChatHandle>(null);

  // Track when a run starts so the progress strip can show elapsed time.
  function handleStatusChange(next: AgentStatus) {
    setStatus(next);
    if (next === "running") setRunStartedAt(Date.now());
    else if (next === "idle") setRunStartedAt(null);
  }

  useEffect(() => {
    fetchAgentConfig()
      .then(setConfig)
      .catch((err) => console.error("failed to load config", err));
    fetch("/health")
      .then((r) => r.json())
      .then((d) => d?.model && setModel(d.model))
      .catch(() => undefined);
  }, []);

  function reset() {
    fetch("/api/reset", { method: "POST" }).catch(() => undefined);
    chatRef.current?.reset();
    setPendingEdits([]);
    setBenches([]);
    setToolCalls([]);
    setStatus("idle");
    setRunStartedAt(null);
  }

  return (
    <div className="app">
      <Header
        status={status}
        model={model}
        displayName={config?.displayName ?? "CellAg agent"}
        description={config?.description ?? ""}
        onReset={reset}
      />
      <ProgressStrip status={status} toolCalls={toolCalls} runStartedAt={runStartedAt} />
      <div className="app-body">
        <StepsRail calls={toolCalls} />
        <Chat
          ref={chatRef}
          examplePrompts={config?.examplePrompts ?? []}
          description={config?.description ?? ""}
          pendingEdits={pendingEdits}
          benches={benches}
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
          onBenchInit={(b) => {
            setBenches((prev) => [...prev.filter((p) => p.id !== b.id), b]);
          }}
          onToolCall={(call) => {
            setToolCalls((prev) => [...prev, call]);
          }}
          onToolResult={(id, result, isError) => {
            setToolCalls((prev) =>
              prev.map((c) => (c.id === id ? { ...c, result, isError } : c))
            );
          }}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
