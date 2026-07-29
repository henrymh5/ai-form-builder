"use client";

import { NODE_TYPE_META, PALETTE_NODE_TYPES } from "./node-types";

const PALETTE_DRAG_MIME = "application/x-formcraft-workflow-node";

/**
 * Left sidebar: draggable node types, dropped onto the canvas via the
 * editor's onDrop handler (screenToFlowPosition). Trigger is excluded —
 * every workflow starts with exactly one, created by the factory, and
 * cannot be added again (enforced by validate.ts's MULTIPLE_TRIGGERS check).
 */
export function NodePalette() {
  return (
    <aside className="border-border bg-surface w-64 shrink-0 overflow-y-auto border-r p-3">
      <h2 className="text-text-secondary mb-2 px-1 text-xs font-medium tracking-wide uppercase">
        Aktionen
      </h2>
      <div className="space-y-1.5">
        {PALETTE_NODE_TYPES.map((type) => {
          const meta = NODE_TYPE_META[type];
          const Icon = meta.icon;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(PALETTE_DRAG_MIME, type);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="border-border bg-surface hover:border-border-strong hover:bg-surface-subtle flex cursor-grab items-center gap-2 rounded-md border px-2.5 py-2 text-sm active:cursor-grabbing"
            >
              <span className="text-primary-text bg-primary-subtle flex size-6 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-3.5" />
              </span>
              <span className="text-text-primary">{meta.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export { PALETTE_DRAG_MIME };
