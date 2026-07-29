"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Status filter for the responses list (plan §8). */
export function ResponsesToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateStatus(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("status");
    else params.set("status", value);
    params.delete("page");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={searchParams.get("status") ?? "all"} onValueChange={updateStatus}>
        <SelectTrigger className="w-48" aria-label="Nach Status filtern">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Antworten (ohne Spam/Test)</SelectItem>
          <SelectItem value="completed">Abgeschlossen</SelectItem>
          <SelectItem value="test">Testantworten</SelectItem>
          <SelectItem value="spam">Spam</SelectItem>
          <SelectItem value="archived">Archiviert</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
