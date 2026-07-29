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
import { useDragScroll } from "@/features/form-builder/use-drag-scroll";
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
    <main className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
      <PageTabStrip
        pages={definition.pages}
        currentPageId={currentPage?.id}
        canRemove={definition.pages.length > 1}
        onSelect={setCurrentPage}
        onRemove={removePage}
        onDuplicate={duplicatePage}
        onEditSettings={(pageId) => {
          setCurrentPage(pageId);
          selectPage(pageId);
        }}
        onAddPage={() => addPage()}
      />

      <div className="flex-1 overflow-y-auto">
        {currentPage ? <CanvasDropzone page={currentPage} /> : null}
      </div>
    </main>
  );
}

/**
 * Horizontally scrollable page tabs. Once the tabs overflow, the strip can be dragged with the
 * pointer; the scrollbar itself stays hidden so the toolbar keeps its clean single-row height.
 */
function PageTabStrip({
  pages,
  currentPageId,
  canRemove,
  onSelect,
  onRemove,
  onDuplicate,
  onEditSettings,
  onAddPage,
}: {
  pages: { id: string; title?: string }[];
  currentPageId: string | undefined;
  canRemove: boolean;
  onSelect: (pageId: string) => void;
  onRemove: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onEditSettings: (pageId: string) => void;
  onAddPage: () => void;
}) {
  const { ref, isDragging, isScrollable, onPointerDown, atStart, atEnd } =
    useDragScroll<HTMLDivElement>();

  return (
    <div className="border-border bg-surface flex shrink-0 items-center gap-2 border-b px-4 py-2">
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        role="tablist"
        aria-label="Formularseiten"
        aria-orientation="horizontal"
        // Fades hint at clipped tabs on whichever side still has content to scroll to.
        data-fade-start={isScrollable && !atStart ? "" : undefined}
        data-fade-end={isScrollable && !atEnd ? "" : undefined}
        className={cn(
          "tab-strip-fade flex min-w-0 flex-1 scrollbar-none items-center gap-1 overflow-x-auto",
          isScrollable && (isDragging ? "cursor-grabbing" : "cursor-grab"),
        )}
      >
        {pages.map((page, index) => (
          <PageTab
            key={page.id}
            pageId={page.id}
            label={page.title || `Seite ${index + 1}`}
            isActive={page.id === currentPageId}
            canRemove={canRemove}
            suppressClick={isDragging}
            onSelect={() => onSelect(page.id)}
            onRemove={() => onRemove(page.id)}
            onDuplicate={() => onDuplicate(page.id)}
            onEditSettings={() => onEditSettings(page.id)}
          />
        ))}
      </div>

      <div className="bg-border h-5 w-px shrink-0" aria-hidden />
      <Button variant="ghost" size="sm" className="shrink-0" onClick={onAddPage}>
        <Plus className="size-4" />
        Seite
      </Button>
    </div>
  );
}

function PageTab({
  pageId,
  label,
  isActive,
  canRemove,
  suppressClick,
  onSelect,
  onRemove,
  onDuplicate,
  onEditSettings,
}: {
  pageId: string;
  label: string;
  isActive: boolean;
  canRemove: boolean;
  suppressClick: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onEditSettings: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${PAGE_TAB_PREFIX}${pageId}` });

  return (
    <div ref={setNodeRef} className="group relative flex shrink-0 items-center">
      <button
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => {
          // A pointer drag of the strip ends in a click on whichever tab sat under the cursor.
          if (suppressClick) return;
          onSelect();
        }}
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
          className="text-text-muted hover:text-error bg-surface absolute -top-1 -right-1 hidden size-4 rounded-full group-hover:block"
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
    <div
      ref={setNodeRef}
      className="mx-auto w-full max-w-(--builder-canvas-max) space-y-3 p-4 sm:p-6 lg:p-8"
    >
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
