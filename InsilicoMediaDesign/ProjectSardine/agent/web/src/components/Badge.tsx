import { metaFor } from "../lib/tools.ts";

/**
 * 26x26 colored letter badge for a tool. Uses CSS vars so callers don't
 * have to plumb colors — the parent sets `--c` and `--c-soft` once.
 */
export function ToolBadge({ name }: { name: string }) {
  const meta = metaFor(name);
  return (
    <span
      className="badge"
      style={
        {
          ["--c" as never]: `var(--t-${meta.color})`,
          ["--c-soft" as never]: `var(--t-${meta.color}-soft)`,
        } as React.CSSProperties
      }
    >
      {meta.short}
    </span>
  );
}
