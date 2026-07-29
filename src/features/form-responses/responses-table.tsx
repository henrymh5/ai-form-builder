"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResponseStatus, ResponseSummary } from "@/lib/db/repositories/responses";
import {
  archiveResponseAction,
  deleteResponseAction,
  markResponseReadAction,
  unarchiveResponseAction,
} from "@/features/form-responses/actions/response-actions";

const STATUS_LABEL: Record<ResponseStatus, string> = {
  completed: "Abgeschlossen",
  test: "Testantwort",
  spam: "Spam",
  archived: "Archiviert",
};

const STATUS_VARIANT: Record<ResponseStatus, "success" | "info" | "error" | "neutral"> = {
  completed: "success",
  test: "info",
  spam: "error",
  archived: "neutral",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "–";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Same direct-action-call pattern as form-card.tsx — nested forms inside Radix DropdownMenuItem are unreliable. */
function runResponseAction(
  action: (formData: FormData) => Promise<void>,
  formId: string,
  responseId: string,
): void {
  const formData = new FormData();
  formData.set("formId", formId);
  formData.set("responseId", responseId);
  void action(formData);
}

export function ResponsesTable({
  formId,
  responses,
}: {
  formId: string;
  responses: ResponseSummary[];
}) {
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border bg-surface-subtle text-text-secondary border-b text-left">
            <th className="px-4 py-2 font-medium">Eingang</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Version</th>
            <th className="px-4 py-2 font-medium">Dauer</th>
            <th className="px-4 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {responses.map((response) => (
            <tr
              key={response.id}
              className="border-border hover:bg-surface-subtle border-b last:border-0"
            >
              <td className="px-4 py-2">
                <Link
                  href={`/forms/${formId}/responses/${response.id}`}
                  className="hover:underline"
                  onClick={() => {
                    if (!response.isRead) runResponseAction(markResponseReadAction, formId, response.id);
                  }}
                >
                  <span className={response.isRead ? "text-text-secondary" : "text-text-primary font-medium"}>
                    {formatDateTime(response.submittedAt)}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-2">
                <Badge variant={STATUS_VARIANT[response.status]}>
                  {STATUS_LABEL[response.status]}
                </Badge>
              </td>
              <td className="text-text-secondary px-4 py-2">v{response.versionNumber}</td>
              <td className="text-text-secondary px-4 py-2">{formatDuration(response.durationMs)}</td>
              <td className="px-4 py-2 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Aktionen">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/forms/${formId}/responses/${response.id}`}>Ansehen</Link>
                    </DropdownMenuItem>
                    {response.status === "archived" ? (
                      <DropdownMenuItem
                        onSelect={() => runResponseAction(unarchiveResponseAction, formId, response.id)}
                      >
                        Wiederherstellen
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => runResponseAction(archiveResponseAction, formId, response.id)}
                      >
                        Archivieren
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      destructive
                      onSelect={() => runResponseAction(deleteResponseAction, formId, response.id)}
                    >
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
