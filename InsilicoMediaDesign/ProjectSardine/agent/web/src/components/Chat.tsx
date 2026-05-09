import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import type { ProposedEdit } from "../App.tsx";
import type { Project } from "../lib/projects.ts";
import { streamSse, type SseEvent } from "../lib/stream.ts";
import { MarkdownView } from "./MarkdownView.tsx";
import { ToolCard, type ToolCall } from "./ToolCard.tsx";
import { ProposedEditCard } from "./ProposedEditCard.tsx";
import { Welcome } from "./Welcome.tsx";

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string; streaming: boolean }
  | { kind: "tool"; toolId: string }
  | { kind: "edit"; editId: string; resolution?: "applied" | "rejected" }
  | { kind: "system"; text: string }
  | { kind: "error"; text: string };

export type ChatHandle = {
  reset: () => void;
  send: (text: string) => void;
};

type Props = {
  project: Project | null;
  pendingEdits: ProposedEdit[];
  toolCalls: ToolCall[];
  onProposedEdit: (e: ProposedEdit) => void;
  onResolveEdit: (editId: string) => void;
  onToolCall: (call: ToolCall) => void;
  onToolResult: (id: string, result: string, isError: boolean) => void;
  onStatusChange: (status: "idle" | "running" | "error") => void;
};

export const Chat = forwardRef<ChatHandle, Props>(function Chat(
  {
    project,
    pendingEdits,
    toolCalls,
    onProposedEdit,
    onResolveEdit,
    onToolCall,
    onToolResult,
    onStatusChange,
  },
  ref
) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, pendingEdits]);

  useImperativeHandle(ref, () => ({
    reset: () => setItems([]),
    send: (text: string) => sendMessage(text),
  }));

  async function sendMessage(text: string) {
    if (!text.trim() || busy || !project) return;
    setInput("");
    setBusy(true);
    onStatusChange("running");
    setItems((prev) => [
      ...prev,
      { kind: "user", text },
      { kind: "assistant", text: "", streaming: true },
    ]);

    try {
      await streamSse(
        "/api/chat",
        { message: text, project: project.key },
        (ev: SseEvent) => {
          handleEvent(ev, setItems, onProposedEdit, onToolCall, onToolResult);
        }
      );
      onStatusChange("idle");
    } catch (err) {
      setItems((prev) => [
        ...prev,
        { kind: "error", text: err instanceof Error ? err.message : String(err) },
      ]);
      onStatusChange("error");
    } finally {
      setItems((prev) =>
        prev.map((it) =>
          it.kind === "assistant" && it.streaming ? { ...it, streaming: false } : it
        )
      );
      setBusy(false);
    }
  }

  async function handleApply(editId: string) {
    await fetch("/api/notes/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editId }),
    });
    onResolveEdit(editId);
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "edit" && it.editId === editId ? { ...it, resolution: "applied" } : it
      )
    );
  }

  async function handleReject(editId: string) {
    await fetch("/api/notes/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editId }),
    });
    onResolveEdit(editId);
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "edit" && it.editId === editId ? { ...it, resolution: "rejected" } : it
      )
    );
  }

  return (
    <div className="chat-pane">
      <div className="chat-list" ref={listRef}>
        {items.length === 0 ? (
          <Welcome project={project} onPick={(prompt) => setInput(prompt)} />
        ) : (
          items.map((it, i) => (
            <Item
              key={i}
              item={it}
              toolCalls={toolCalls}
              pendingEdits={pendingEdits}
              onApply={handleApply}
              onReject={handleReject}
            />
          ))
        )}
      </div>
      <div className="composer">
        <div className="composer-inner">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                project
                  ? `Ask the ${project.shortName} agent — try a suggested prompt above`
                  : "Ask the agent…"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <button className="send" type="submit" disabled={busy || !input.trim()}>
              {busy ? "…" : "send"}
            </button>
          </form>
          <div className="hint">⌘/Ctrl+Enter to send</div>
        </div>
      </div>
    </div>
  );
});

function Item({
  item,
  toolCalls,
  pendingEdits,
  onApply,
  onReject,
}: {
  item: ChatItem;
  toolCalls: ToolCall[];
  pendingEdits: ProposedEdit[];
  onApply: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (item.kind === "user") return <div className="bubble user">{item.text}</div>;
  if (item.kind === "assistant") {
    const cls = `bubble assistant${item.streaming ? " streaming" : ""}`;
    if (!item.text && item.streaming) {
      return (
        <div className={cls}>
          <span style={{ color: "var(--muted)" }}>thinking…</span>
        </div>
      );
    }
    return (
      <div className={cls}>
        <MarkdownView source={item.text} />
      </div>
    );
  }
  if (item.kind === "tool") {
    const call = toolCalls.find((c) => c.id === item.toolId);
    if (!call) return null;
    return <ToolCard call={call} />;
  }
  if (item.kind === "edit") {
    const edit = pendingEdits.find((p) => p.id === item.editId);
    const resolved = !!item.resolution;
    if (!edit) return <div className="system-line">edit {item.editId} no longer staged</div>;
    return (
      <ProposedEditCard
        edit={edit}
        resolved={resolved}
        resolution={item.resolution}
        onApply={() => onApply(edit.id)}
        onReject={() => onReject(edit.id)}
      />
    );
  }
  if (item.kind === "system") return <div className="system-line">{item.text}</div>;
  return <div className="error-line">{item.text}</div>;
}

function handleEvent(
  ev: SseEvent,
  setItems: React.Dispatch<React.SetStateAction<ChatItem[]>>,
  onProposedEdit: (e: ProposedEdit) => void,
  onToolCall: (call: ToolCall) => void,
  onToolResult: (id: string, result: string, isError: boolean) => void
) {
  if (ev.event === "proposed_edit") {
    const edit = ev.data as ProposedEdit;
    onProposedEdit(edit);
    setItems((prev) => [...prev, { kind: "edit", editId: edit.id }]);
    return;
  }
  if (ev.event === "system") return;
  if (ev.event === "error") {
    const data = ev.data as { reason?: string };
    setItems((p) => [...p, { kind: "error", text: data.reason ?? "unknown" }]);
    return;
  }
  if (ev.event === "done") return;
  if (ev.event !== "message") return;

  const m = ev.data as Record<string, unknown>;
  const type = m.type as string | undefined;

  if (type === "assistant") {
    const inner = (m.message as Record<string, unknown> | undefined) ?? m;
    const blocks = (inner.content as Array<Record<string, unknown>> | undefined) ?? [];
    for (const block of blocks) {
      if (block.type === "text" && typeof block.text === "string") {
        appendAssistantText(setItems, block.text);
      } else if (block.type === "tool_use") {
        const id = (block.id as string) ?? `${block.name}_${Date.now()}_${Math.random()}`;
        const rawName = (block.name as string) ?? "tool";
        const name = stripMcpPrefix(rawName);
        const call: ToolCall = { id, name, input: block.input };
        onToolCall(call);
        setItems((prev) => [...prev, { kind: "tool", toolId: id }]);
      }
    }
  }

  if (type === "user") {
    const inner = (m.message as Record<string, unknown> | undefined) ?? m;
    const blocks = (inner.content as Array<Record<string, unknown>> | undefined) ?? [];
    for (const block of blocks) {
      if (block.type === "tool_result") {
        const id = block.tool_use_id as string | undefined;
        if (!id) continue;
        const isError = block.is_error === true;
        let text = "";
        const c = block.content;
        if (typeof c === "string") text = c;
        else if (Array.isArray(c)) {
          for (const item of c) {
            const it = item as Record<string, unknown>;
            if (it.type === "text" && typeof it.text === "string") text += it.text + "\n";
          }
        }
        onToolResult(id, text.trim(), isError);
      }
    }
  }
}

function appendAssistantText(
  setItems: React.Dispatch<React.SetStateAction<ChatItem[]>>,
  delta: string
) {
  setItems((prev) => {
    const next = [...prev];
    for (let i = next.length - 1; i >= 0; i--) {
      const it = next[i];
      if (it && it.kind === "assistant" && it.streaming) {
        next[i] = { ...it, text: it.text + delta };
        return next;
      }
      if (it && (it.kind === "tool" || it.kind === "user" || it.kind === "edit")) {
        break;
      }
    }
    next.push({ kind: "assistant", text: delta, streaming: true });
    return next;
  });
}

function stripMcpPrefix(name: string): string {
  const m = /^mcp__[^_]+__(.+)$/.exec(name);
  return m ? (m[1] ?? name) : name;
}
