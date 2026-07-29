"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Settings2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { FieldCanvasPreview } from "@/features/form-builder/field-canvas-preview";
import {
  CANVAS_DROPZONE_PREFIX,
  FIELD_PREFIX,
  PAGE_TAB_PREFIX,
} from "@/features/form-builder/builder-dnd-context";
import type { Field } from "@/lib/form-schema/fields";

/** Middle column: page tabs + the current page's fields (plan §5 "Mittlerer Bereich"). */
export function BuilderCanvas() {
  const definition = useBuilderStore((s) => s.definition);
  const currentPageId = useBuilderStore((s) => s.currentPageId);
  const setCurrentPage = useBuilderStore((s) => s.setCurrentPage);
  const addPage = useBuilderStore((s) => s.addPage);
  const removePage = useBuilderStore((s) => s.removePage);
  const duplicatePage = useBuilderStore((s) => s.duplicatePage);
  const selectPage = useBuilderStore((s) => s.selectPage);

  if (!definition) return null;

  const currentPage = definition.pages.find((p) => p.id === currentPageId) ?? definition.pages[0];

  return (
    <main className="bg-background flex-1 overflow-y-auto">
      <div className="border-border bg-surface flex items-center gap-1 overflow-x-auto border-b px-4 py-2">
        {definition.pages.map((page, index) => (
          <PageTab
            key={page.id}
            pageId={page.id}
            label={page.title || `Seite ${index + 1}`}
            isActive={page.id === currentPage?.id}
            canRemove={definition.pages.length > 1}
            onSelect={() => setCurrentPage(page.id)}
            onRemove={() => removePage(page.id)}
            onDuplicate={() => duplicatePage(page.id)}
            onEditSettings={() => {
              setCurrentPage(page.id);
              selectPage(page.id);
            }}
          />
        ))}
        <Button variant="ghost" size="sm" onClick={() => addPage()}>
          <Plus className="size-4" />
          Seite
        </Button>
      </div>

      {currentPage ? <CanvasDropzone page={currentPage} /> : null}
    </main>
  );
}

function PageTab({
  pageId,
  label,
  isActive,
  canRemove,
  onSelect,
  onRemove,
  onDuplicate,
  onEditSettings,
}: {
  pageId: string;
  label: string;
  isActive: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onEditSettings: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${PAGE_TAB_PREFIX}${pageId}` });

  return (
    <div ref={setNodeRef} className="group relative flex items-center">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
          isActive
            ? "bg-primary-subtle text-primary-text font-medium"
            : "text-text-secondary hover:bg-surface-subtle",
          isOver && "ring-primary ring-2",
        )}
      >
        {label}
      </button>
      <button
        type="button"
        title="Seiteneinstellungen"
        onClick={(e) => {
          e.stopPropagation();
          onEditSettings();
        }}
        className="text-text-muted hover:text-text-primary hidden rounded p-0.5 group-hover:block"
      >
        <Settings2 className="size-3" />
      </button>
      <button
        type="button"
        title="Seite duplizieren"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="text-text-muted hover:text-text-primary hidden rounded p-0.5 group-hover:block"
      >
        <Copy className="size-3" />
      </button>
      {canRemove ? (
        <button
          type="button"
          aria-label="Seite entfernen"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-text-muted hover:text-error absolute -top-1 -right-1 hidden size-4 rounded-full bg-surface group-hover:block"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function CanvasDropzone({ page }: { page: { id: string; fields: Field[] } }) {
  const { setNodeRef } = useDroppable({ id: `${CANVAS_DROPZONE_PREFIX}${page.id}` });
  const fieldIds = page.fields.map((f) => `${FIELD_PREFIX}${f.id}`);

  return (
    <div ref={setNodeRef} className="mx-auto max-w-2xl space-y-3 p-8">
      <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
        {page.fields.length === 0 ? (
          <Card className="border-dashed py-12 text-center">
            <p className="text-text-secondary text-sm">
              Ziehe ein Feld aus der linken Seitenleiste hierher oder klicke darauf.
            </p>
          </Card>
        ) : (
          page.fields.map((field) => (
            <CanvasFieldRow key={field.id} pageId={page.id} field={field} />
          ))
        )}
      </SortableContext>
    </div>
  );
}

function CanvasFieldRow({ pageId, field }: { pageId: string; field: Field }) {
  const [hovered, setHovered] = useState(false);
  const selected = useBuilderStore((s) => s.selected);
  const selectField = useBuilderStore((s) => s.selectField);
  const duplicateField = useBuilderStore((s) => s.duplicateField);
  const removeField = useBuilderStore((s) => s.removeField);
  const toggleRequired = useBuilderStore((s) => s.toggleRequired);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${FIELD_PREFIX}${field.id}`,
  });

  const isSelected = selected?.kind === "field" && selected.fieldId === field.id;
  const isDisplayOnly =
    field.type === "heading" || field.type === "paragraph" || field.type === "divider";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectField(pageId, field.id)}
      className={cn(
        "group relative cursor-pointer rounded-lg border p-4 pl-9 transition-colors",
        isSelected
          ? "border-primary bg-primary-subtle/30"
          : "border-border bg-surface hover:border-border-strong",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label="Feld verschieben"
        onClick={(e) => e.stopPropagation()}
        className="text-text-muted hover:text-text-primary absolute top-1/2 left-2 -translate-y-1/2 cursor-grab touch-none"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-4" />
      </button>

      <FieldCanvasPreview field={field} />

      {(hovered || isSelected) && (
        <div className="border-border bg-surface absolute -top-3 right-3 flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
          {!isDisplayOnly ? (
            <button
              type="button"
              title="Als Pflichtfeld markieren"
              onClick={(e) => {
                e.stopPropagation();
                toggleRequired(pageId, field.id);
              }}
              className={cn(
                "rounded px-1.5 py-1 text-xs font-semibold",
                "required" in field && field.required
                  ? "text-primary-text"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              *
            </button>
          ) : null}
          <button
            type="button"
            title="Duplizieren"
            onClick={(e) => {
              e.stopPropagation();
              duplicateField(pageId, field.id);
            }}
            className="text-text-muted hover:text-text-primary rounded p-1"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            title="Löschen"
            onClick={(e) => {
              e.stopPropagation();
              removeField(pageId, field.id);
            }}
            className="text-text-muted hover:text-error rounded p-1"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
