"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { WorkflowStatusBadge } from "@/features/workflow-builder/workflow-status-badge";
import {
  deleteWorkflowAction,
  renameWorkflowAction,
  toggleWorkflowStatusAction,
} from "@/features/workflow-builder/actions/workflow-actions";
import type { WorkflowRecord } from "@/lib/db/repositories/workflows";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function WorkflowCard({
  workflow,
  formId,
}: {
  workflow: WorkflowRecord;
  formId: string;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [status, setStatus] = useState(workflow.status);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    const nextStatus = checked ? "enabled" : "paused";
    setToggleError(null);
    startTransition(async () => {
      const result = await toggleWorkflowStatusAction(
        workflow.id,
        formId,
        nextStatus,
        workflow.definition,
      );
      setStatus(result.status);
      if (result.error) setToggleError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-3" data-testid="workflow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/forms/${formId}/workflows/${workflow.id}`} className="hover:underline">
            <h3 className="text-text-primary truncate text-base font-semibold">{workflow.name}</h3>
          </Link>
          <WorkflowStatusBadge status={status} className="mt-1.5" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Aktionen">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/forms/${formId}/workflows/${workflow.id}`}>Öffnen</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/forms/${formId}/workflows/${workflow.id}/runs`}>Läufe ansehen</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>Umbenennen</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor={`toggle-${workflow.id}`} className="text-text-secondary text-sm">
          Aktiviert
        </Label>
        <Switch
          id={`toggle-${workflow.id}`}
          checked={status === "enabled"}
          disabled={isPending}
          onCheckedChange={handleToggle}
        />
      </div>
      {toggleError ? <p className="text-error text-xs">{toggleError}</p> : null}

      <div className="text-text-muted text-xs">Bearbeitet: {formatDate(workflow.updatedAt)}</div>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow umbenennen</DialogTitle>
          </DialogHeader>
          <form
            action={async (formData) => {
              await renameWorkflowAction(formData);
              setRenameOpen(false);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="workflowId" value={workflow.id} />
            <input type="hidden" name="formId" value={formId} />
            <div className="space-y-1.5">
              <Label htmlFor={`rename-${workflow.id}`}>Name</Label>
              <Input id={`rename-${workflow.id}`} name="name" defaultValue={workflow.name} required />
            </div>
            <DialogFooter>
              <Button type="submit" variant="primary">
                Speichern
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-text-secondary text-sm">
            &quot;{workflow.name}&quot; wird gelöscht. Diese Aktion kann nicht rückgängig gemacht
            werden.
          </p>
          <DialogFooter>
            <form action={deleteWorkflowAction}>
              <input type="hidden" name="workflowId" value={workflow.id} />
              <input type="hidden" name="formId" value={formId} />
              <Button type="submit" variant="destructive">
                Löschen
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
