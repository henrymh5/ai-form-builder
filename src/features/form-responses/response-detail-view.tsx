"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { FormDefinition, Field } from "@/lib/form-schema/schema";
import { hasOptions } from "@/lib/form-schema/schema";
import type { ResponseDetail, ResponseStatus } from "@/lib/db/repositories/responses";
import {
  archiveResponseAction,
  deleteResponseAction,
  setResponseNoteAction,
  unarchiveResponseAction,
} from "@/features/form-responses/actions/response-actions";

type AnswerableField = Exclude<Field, { type: "heading" | "paragraph" | "divider" | "hidden" }>;

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

function isAnswerable(field: Field): field is AnswerableField {
  return !["heading", "paragraph", "divider", "hidden"].includes(field.type);
}

/** Human-readable rendering of one answer value, resolving choice option labels (plan §8 detail view). */
function formatAnswerValue(field: AnswerableField, value: unknown): string {
  if (value === undefined || value === null || value === "") return "–";
  if (hasOptions(field)) {
    const values = Array.isArray(value) ? value : [value];
    const labels = values.map((v) => field.options.find((o) => o.value === v)?.label ?? String(v));
    return labels.join(", ");
  }
  if (typeof value === "boolean") return value ? "Ja" : "Nein";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function ResponseDetailView({
  formId,
  response,
  definition,
}: {
  formId: string;
  response: ResponseDetail;
  definition: FormDefinition;
}) {
  const router = useRouter();
  const [note, setNote] = useState(response.note ?? "");

  const answerByFieldId = new Map(response.answers.map((a) => [a.fieldId, a.value]));
  const allFields = definition.pages.flatMap((p) => p.fields).filter(isAnswerable);

  function runAction(action: (formData: FormData) => Promise<void>): void {
    const formData = new FormData();
    formData.set("formId", formId);
    formData.set("responseId", response.id);
    void action(formData);
  }

  // Delete removes the page this view lives on, so — unlike the other
  // actions, which just revalidate the list — this one navigates back to
  // it once the deletion has actually completed on the server.
  async function handleDelete() {
    const formData = new FormData();
    formData.set("formId", formId);
    formData.set("responseId", response.id);
    await deleteResponseAction(formData);
    router.push(`/forms/${formId}/responses`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-xl font-semibold">
            Antwort vom {formatDateTime(response.submittedAt)}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[response.status]}>{STATUS_LABEL[response.status]}</Badge>
            <span className="text-text-muted text-xs">
              Formularversion {response.versionNumber}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {response.status === "archived" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => runAction(unarchiveResponseAction)}
            >
              Wiederherstellen
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => runAction(archiveResponseAction)}>
              Archivieren
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => void handleDelete()}>
            Löschen
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <CardTitle>Antworten</CardTitle>
        {allFields.map((field) => {
          const wasAnswered = answerByFieldId.has(field.id);
          return (
            <div key={field.id} className="border-border border-b pb-3 last:border-0 last:pb-0">
              <p className="text-text-secondary text-xs font-medium">{field.label}</p>
              {wasAnswered ? (
                <p className="text-text-primary text-sm">
                  {formatAnswerValue(field, answerByFieldId.get(field.id))}
                </p>
              ) : (
                <p className="text-text-muted text-sm italic">Übersprungen</p>
              )}
            </div>
          );
        })}
      </Card>

      <Card className="space-y-3">
        <CardTitle>Notiz</CardTitle>
        <form
          action={(formData) => {
            void setResponseNoteAction(formData);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="formId" value={formId} />
          <input type="hidden" name="responseId" value={response.id} />
          <Textarea
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Interne Notiz zu dieser Antwort…"
          />
          <Button type="submit" variant="secondary" size="sm">
            Notiz speichern
          </Button>
        </form>
      </Card>
    </div>
  );
}
