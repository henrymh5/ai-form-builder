"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { FieldCanvasPreview } from "@/features/form-builder/field-canvas-preview";
import type { FieldType } from "@/lib/form-schema/fields";

/**
 * Drag-and-drop wiring (plan §6, `dnd-kit`): sorting within a page,
 * moving between pages (dropping on a page tab), inserting at a specific
 * position, a drag overlay as the visual indicator, and keyboard support
 * (KeyboardSensor + dnd-kit's built-in arrow-key handling via useSortable in
 * the canvas/tabs). Every drop is a single Builder Store mutation, so it
 * rides the same undo/redo history as any other change (plan §6
 * "Rückgängigmachen einer Verschiebung").
 *
 * Drag sources are identified by a prefixed id so `onDragEnd` can tell
 * palette items (`palette:<fieldType>`), canvas fields (`field:<fieldId>`),
 * and page tabs (`page-tab:<pageId>`) apart without a lookup table.
 */
export const PALETTE_PREFIX = "palette:";
export const FIELD_PREFIX = "field:";
export const PAGE_TAB_PREFIX = "page-tab:";
export const CANVAS_DROPZONE_PREFIX = "canvas:";

function findFieldLocation(pageId_fieldId: string) {
  const fieldId = pageId_fieldId.slice(FIELD_PREFIX.length);
  const definition = useBuilderStore.getState().definition;
  if (!definition) return null;
  for (const page of definition.pages) {
    const index = page.fields.findIndex((f) => f.id === fieldId);
    if (index !== -1) return { pageId: page.id, fieldId, index };
  }
  return null;
}

export function BuilderDndContext({ children }: { children: React.ReactNode }) {
  const [activeLabel, setActiveLabel] = useState<React.ReactNode>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (id.startsWith(FIELD_PREFIX)) {
      const location = findFieldLocation(id);
      const definition = useBuilderStore.getState().definition;
      const field = definition?.pages
        .find((p) => p.id === location?.pageId)
        ?.fields.find((f) => f.id === location?.fieldId);
      if (field) setActiveLabel(<FieldCanvasPreview field={field} />);
    } else if (id.startsWith(PALETTE_PREFIX)) {
      setActiveLabel(
        <span className="text-sm font-medium">{event.active.data.current?.label}</span>,
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const store = useBuilderStore.getState();

    // Palette item dropped onto the canvas -> add a new field.
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const type = activeId.slice(PALETTE_PREFIX.length) as FieldType;
      if (overId.startsWith(FIELD_PREFIX)) {
        const location = findFieldLocation(overId);
        if (location) store.addField(location.pageId, type, location.index);
      } else if (overId.startsWith(CANVAS_DROPZONE_PREFIX)) {
        const pageId = overId.slice(CANVAS_DROPZONE_PREFIX.length);
        store.addField(pageId, type);
      } else if (overId.startsWith(PAGE_TAB_PREFIX)) {
        const pageId = overId.slice(PAGE_TAB_PREFIX.length);
        store.addField(pageId, type);
      }
      return;
    }

    // Existing field dropped somewhere.
    if (activeId.startsWith(FIELD_PREFIX)) {
      const from = findFieldLocation(activeId);
      if (!from) return;

      if (overId.startsWith(PAGE_TAB_PREFIX)) {
        const toPageId = overId.slice(PAGE_TAB_PREFIX.length);
        if (toPageId === from.pageId) return;
        const toPage = store.definition!.pages.find((p) => p.id === toPageId)!;
        store.moveField(from.pageId, toPageId, from.fieldId, toPage.fields.length);
        return;
      }

      if (overId.startsWith(CANVAS_DROPZONE_PREFIX)) {
        const toPageId = overId.slice(CANVAS_DROPZONE_PREFIX.length);
        const toPage = store.definition!.pages.find((p) => p.id === toPageId)!;
        store.moveField(from.pageId, toPageId, from.fieldId, toPage.fields.length);
        return;
      }

      if (overId.startsWith(FIELD_PREFIX)) {
        const to = findFieldLocation(overId);
        if (!to || (to.pageId === from.pageId && to.index === from.index)) return;
        // For a same-page move, `to.index` is the target position in the
        // array *after* the source item has been removed — which is
        // exactly the index arrayMove-style reordering expects (matches
        // @dnd-kit/sortable's own arrayMove semantics). For a cross-page
        // move, `to.index` is simply the destination page's original index
        // and needs no adjustment since removal happened in a different array.
        store.moveField(from.pageId, to.pageId, from.fieldId, to.index);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeLabel ? (
          <div className="border-primary bg-surface rounded-md border p-2 shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
