"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkspaceMember } from "@/lib/db/repositories/workspaces";
import {
  addMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type MemberActionState,
} from "@/features/workspaces/actions/member-actions";

interface WorkspaceMembersPanelProps {
  workspaceId: string;
  currentUserId: string;
  currentUserRole: "owner" | "editor" | "viewer";
  members: WorkspaceMember[];
}

const ROLE_LABEL: Record<WorkspaceMember["role"], string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const initialState: MemberActionState = {};

export function WorkspaceMembersPanel({
  workspaceId,
  currentUserId,
  currentUserRole,
  members,
}: WorkspaceMembersPanelProps) {
  const [state, formAction, isPending] = useActionState(addMemberAction, initialState);
  const isOwner = currentUserRole === "owner";

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-text-muted border-b text-left text-xs font-medium">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Rolle</th>
              {isOwner ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId} className="border-border border-b last:border-0">
                <td className="text-text-primary px-4 py-3">
                  {member.displayName}
                  {member.userId === currentUserId ? (
                    <span className="text-text-muted ml-2 text-xs">(du)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {isOwner && member.userId !== currentUserId ? (
                    <form action={updateMemberRoleAction} className="inline-flex">
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Select name="role" defaultValue={member.role}>
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </form>
                  ) : (
                    <Badge variant="neutral">{ROLE_LABEL[member.role]}</Badge>
                  )}
                </td>
                {isOwner ? (
                  <td className="px-4 py-3 text-right">
                    {member.userId !== currentUserId ? (
                      <form action={removeMemberAction}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" variant="ghost" size="sm">
                          Entfernen
                        </Button>
                      </form>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isOwner ? (
        <Card className="max-w-md space-y-4">
          <h2 className="text-text-primary text-base font-semibold">Mitglied hinzufügen</h2>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <div className="space-y-1.5">
              <Label htmlFor="member-email">E-Mail-Adresse</Label>
              <Input id="member-email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Rolle</Label>
              <Select name="role" defaultValue="editor">
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {state.error ? (
              <p role="alert" className="text-error text-sm">
                {state.error}
              </p>
            ) : null}
            {state.success ? <p className="text-success text-sm">Mitglied hinzugefügt.</p> : null}
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Wird hinzugefügt…" : "Hinzufügen"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
