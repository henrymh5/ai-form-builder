"use client";

import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Link as LinkIcon,
  Hash,
  Calendar,
  Clock,
  CircleDot,
  CheckSquare,
  ChevronDown,
  ToggleLeft,
  Star,
  StarHalf,
  Gauge,
  Upload,
  ShieldCheck,
  EyeOff,
  Heading as HeadingIcon,
  Pilcrow,
  Minus,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import type { FieldType } from "@/lib/form-schema/fields";
import { useBuilderStore } from "@/features/form-builder/builder-store";
import { PALETTE_PREFIX } from "@/features/form-builder/builder-dnd-context";
import { cn } from "@/lib/cn";

const INPUT_FIELDS: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "short_text", label: "Kurzer Text", icon: Type },
  { type: "long_text", label: "Langer Text", icon: AlignLeft },
  { type: "email", label: "E-Mail", icon: Mail },
  { type: "phone", label: "Telefonnummer", icon: Phone },
  { type: "url", label: "URL", icon: LinkIcon },
  { type: "number", label: "Zahl", icon: Hash },
  { type: "date", label: "Datum", icon: Calendar },
  { type: "time", label: "Uhrzeit", icon: Clock },
];

const CHOICE_FIELDS: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "single_choice", label: "Einfachauswahl", icon: CircleDot },
  { type: "multiple_choice", label: "Mehrfachauswahl", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "yes_no", label: "Ja/Nein", icon: ToggleLeft },
  { type: "rating", label: "Bewertung", icon: Gauge },
  { type: "star_rating", label: "Sternebewertung", icon: Star },
  { type: "nps", label: "NPS-Skala", icon: StarHalf },
];

const ADVANCED_FIELDS: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "file_upload", label: "Datei-Upload", icon: Upload },
  { type: "consent", label: "Einwilligungs-Checkbox", icon: ShieldCheck },
  { type: "hidden", label: "Verstecktes Feld", icon: EyeOff },
  { type: "heading", label: "Überschrift", icon: HeadingIcon },
  { type: "paragraph", label: "Beschreibungstext", icon: Pilcrow },
  { type: "divider", label: "Trennbereich", icon: Minus },
];

function PaletteGroup({
  title,
  items,
}: {
  title: string;
  items: { type: FieldType; label: string; icon: React.ElementType }[];
}) {
  const currentPageId = useBuilderStore((s) => s.currentPageId);
  const addField = useBuilderStore((s) => s.addField);

  return (
    <div className="space-y-1.5">
      <h3 className="text-text-muted px-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map(({ type, label, icon: Icon }) => (
          <PaletteItem
            key={type}
            type={type}
            label={label}
            icon={Icon}
            disabled={!currentPageId}
            onClick={() => currentPageId && addField(currentPageId, type)}
          />
        ))}
      </div>
    </div>
  );
}

function PaletteItem({
  type,
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  type: FieldType;
  label: string;
  icon: React.ElementType;
  disabled: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
    data: { label },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "border-border bg-surface flex flex-col items-center gap-1 rounded-md border p-2 text-center",
        "hover:border-primary hover:bg-primary-subtle cursor-grab text-xs",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <Icon className="text-text-secondary size-4" />
      <span className="text-text-primary leading-tight">{label}</span>
    </button>
  );
}

/** Left sidebar: all available field types (plan §5 "Linke Seitenleiste"). */
export function FieldPalette() {
  return (
    <aside className="border-border bg-surface w-72 shrink-0 space-y-4 overflow-y-auto border-r p-4">
      <PaletteGroup title="Eingabefelder" items={INPUT_FIELDS} />
      <PaletteGroup title="Auswahlfelder" items={CHOICE_FIELDS} />
      <PaletteGroup title="Erweiterte Felder" items={ADVANCED_FIELDS} />
    </aside>
  );
}
