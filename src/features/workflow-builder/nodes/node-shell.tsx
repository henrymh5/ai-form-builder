import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/cn";

/**
 * Shared visual shell for every workflow node type — Teal design system
 * (border-only cards, no gradients/glows per the style guide). `selected`
 * gets a Teal ring instead of a stronger shadow, matching how the rest of
 * the app signals selection.
 */
export function NodeShell({
  icon,
  label,
  summary,
  selected,
  showTarget = true,
  outHandles,
  children,
}: {
  icon: ReactNode;
  label: string;
  summary?: string;
  selected?: boolean;
  showTarget?: boolean;
  outHandles?: { id: "true" | "false"; label: string; colorClass: string }[];
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-border bg-surface w-56 rounded-lg border px-3 py-2.5 shadow-sm",
        selected && "border-primary ring-primary/30 ring-2",
      )}
    >
      {showTarget ? (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-border-strong !size-2.5 !border-0"
        />
      ) : null}

      <div className="flex items-center gap-2">
        <span className="text-primary-text bg-primary-subtle flex size-6 shrink-0 items-center justify-center rounded-md">
          {icon}
        </span>
        <span className="text-text-primary truncate text-sm font-medium">{label}</span>
      </div>
      {summary ? (
        <p className="text-text-secondary mt-1 line-clamp-2 text-xs">{summary}</p>
      ) : null}
      {children}

      {outHandles ? (
        <div className="mt-2 flex justify-between text-[11px] font-medium">
          {outHandles.map((handle) => (
            <span key={handle.id} className={handle.colorClass}>
              {handle.label}
            </span>
          ))}
        </div>
      ) : null}

      {outHandles ? (
        outHandles.map((handle, i) => (
          <Handle
            key={handle.id}
            id={handle.id}
            type="source"
            position={Position.Bottom}
            style={{ left: outHandles.length === 1 ? "50%" : `${25 + i * 50}%` }}
            className="!bg-border-strong !size-2.5 !border-0"
          />
        ))
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-border-strong !size-2.5 !border-0"
        />
      )}
    </div>
  );
}
