"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Search + status/sort filter bar (plan §4 "Suche und Filter"). */
export function FormsToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`/forms?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Formulare durchsuchen…"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => updateParam("search", e.target.value)}
        className="max-w-xs"
        aria-label="Formulare durchsuchen"
      />

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(value) => updateParam("status", value === "all" ? "" : value)}
      >
        <SelectTrigger className="w-40" aria-label="Nach Status filtern">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          <SelectItem value="draft">Entwurf</SelectItem>
          <SelectItem value="published">Veröffentlicht</SelectItem>
          <SelectItem value="paused">Pausiert</SelectItem>
          <SelectItem value="archived">Archiviert</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") ?? "updated_desc"}
        onValueChange={(value) => updateParam("sort", value)}
      >
        <SelectTrigger className="w-52" aria-label="Sortierung">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated_desc">Zuletzt bearbeitet</SelectItem>
          <SelectItem value="created_desc">Zuletzt erstellt</SelectItem>
          <SelectItem value="responses_desc">Meiste Antworten</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
