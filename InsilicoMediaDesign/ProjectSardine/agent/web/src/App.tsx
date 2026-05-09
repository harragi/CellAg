import { useEffect, useRef, useState } from "react";
import { Chat, type ChatHandle } from "./components/Chat.tsx";
import { Header, type AgentStatus } from "./components/Header.tsx";
import { StepsRail } from "./components/StepsRail.tsx";
import type { ToolCall } from "./components/ToolCard.tsx";

export type ProposedEdit = {
  id: string;
  section: string;
  newContent: string;
  rationale: string;
  proposedAt: number;
};

export function App() {
  const [pendingEdits, setPendingEdits] = useState<ProposedEdit[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [model, setModel] = useState<string>("claude-opus-4-7");
  const chatRef = useRef<ChatHandle>(null);

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then((d) => d?.model && setModel(d.model))
      .catch(() => undefined);
  }, []);

  function reset() {
    fetch("/api/reset", { method: "POST" }).catch(() => undefined);
    chatRef.current?.reset();
    setPendingEdits([]);
    setToolCalls([]);
    setStatus("idle");
  }

  return (
    <div className="app">
      <Header status={status} model={model} onReset={reset} />
      <div className="app-body">
        <StepsRail calls={toolCalls} />
        <Chat
          ref={chatRef}
          pendingEdits={pendingEdits}
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
