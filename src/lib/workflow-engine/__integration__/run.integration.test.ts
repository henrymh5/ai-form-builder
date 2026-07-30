import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, serviceClient } from "@/lib/db/__integration__/helpers";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { CURRENT_SCHEMA_VERSION } from "@/lib/form-schema/schema";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import type { WorkflowDefinition } from "@/lib/workflow-schema/schema";

/**
 * Exercises enqueue + execute against the real local Supabase stack (RLS,
 * the unique idempotency index, the queued/running/succeeded lifecycle,
 * the workflow_form_triggers join table from 0013) — unlike
 * interpreter.test.ts, which is pure and DB-free. Only external
 * side-effecting calls (fetch for the webhook action) are mocked; nothing
 * about the workflow engine itself is mocked, so this genuinely tests the
 * repository layer and the run.ts orchestration together.
 */

describe("workflow enqueue + execute (integration)", () => {
  let ownerId: string;
  let ownerClient: Awaited<ReturnType<typeof createTestUser>>["client"];
  let workspaceId: string;
  let formId: string;
  let publishedVersionId: string;
  let fieldId: string;
  let secondFormId: string;
  let secondPublishedVersionId: string;

  beforeAll(async () => {
    const owner = await createTestUser("Workflow Test Owner");
    ownerId = owner.userId;
    ownerClient = owner.client;

    const { data: membership } = await ownerClient
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ownerId)
      .single();
    workspaceId = membership!.workspace_id;

    const formDef = createEmptyFormDefinition("Integrationstest-Formular");
    fieldId = "fld_test_budget";
    formDef.pages[0]!.fields = [
      {
        id: fieldId,
        key: "budget",
        label: "Budget",
        required: false,
        type: "number",
      },
    ];

    const { data: form, error: formError } = await ownerClient
      .from("forms")
      .insert({
        workspace_id: workspaceId,
        title: "Integrationstest-Formular",
        slug: `wf-integration-${Date.now()}`,
        draft_definition: formDef as never,
        schema_version: CURRENT_SCHEMA_VERSION,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (formError) throw formError;
    formId = form.id;

    const { data: version, error: versionError } = await ownerClient
      .from("form_versions")
      .insert({
        form_id: formId,
        version_number: 1,
        schema_version: CURRENT_SCHEMA_VERSION,
        definition: formDef as never,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (versionError) throw versionError;
    publishedVersionId = version.id;

    await ownerClient
      .from("forms")
      .update({ status: "published", published_version_id: publishedVersionId })
      .eq("id", formId);

    // A second form in the same workspace — used by the multi-form-trigger test.
    const { data: secondForm, error: secondFormError } = await ownerClient
      .from("forms")
      .insert({
        workspace_id: workspaceId,
        title: "Zweites Integrationstest-Formular",
        slug: `wf-integration-2-${Date.now()}`,
        draft_definition: formDef as never,
        schema_version: CURRENT_SCHEMA_VERSION,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (secondFormError) throw secondFormError;
    secondFormId = secondForm.id;

    const { data: secondVersion, error: secondVersionError } = await ownerClient
      .from("form_versions")
      .insert({
        form_id: secondFormId,
        version_number: 1,
        schema_version: CURRENT_SCHEMA_VERSION,
        definition: formDef as never,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (secondVersionError) throw secondVersionError;
    secondPublishedVersionId = secondVersion.id;

    await ownerClient
      .from("forms")
      .update({ status: "published", published_version_id: secondPublishedVersionId })
      .eq("id", secondFormId);
  });

  afterAll(async () => {
    if (ownerId) await deleteTestUser(ownerId);
  });

  async function insertResponse(
    targetFormId: string = formId,
    targetVersionId: string = publishedVersionId,
  ): Promise<string> {
    const admin = serviceClient();
    const { data: session, error: sessionError } = await admin
      .from("form_sessions")
      .insert({ form_id: targetFormId, form_version_id: targetVersionId, status: "completed" })
      .select("id")
      .single();
    if (sessionError) throw sessionError;

    const { data: response, error: responseError } = await admin
      .from("responses")
      .insert({
        form_id: targetFormId,
        form_version_id: targetVersionId,
        session_id: session.id,
        status: "completed",
        idempotency_key: `key-${Date.now()}-${Math.random()}`,
      })
      .select("id")
      .single();
    if (responseError) throw responseError;

    await admin.from("response_answers").insert({
      response_id: response.id,
      field_id: fieldId,
      field_type: "number",
      value: 5000 as never,
    });

    return response.id;
  }

  function workflowDefinitionWithResponseAction(
    triggerFormIds: string[] = [formId],
  ): WorkflowDefinition {
    const triggerId = generateWorkflowId("node");
    const actionId = generateWorkflowId("node");
    return {
      schemaVersion: 1,
      nodes: [
        {
          id: triggerId,
          type: "trigger",
          position: { x: 0, y: 0 },
          config: { event: "response_submitted", formIds: triggerFormIds },
        },
        {
          id: actionId,
          type: "responseAction",
          position: { x: 0, y: 100 },
          config: { action: "append_note", noteText: "Budget: {{field:" + fieldId + "}}" },
        },
      ],
      edges: [
        {
          id: generateWorkflowId("edge"),
          source: triggerId,
          target: actionId,
          sourceHandle: "out",
        },
      ],
    };
  }

  /** Inserts a workflow row + its workflow_form_triggers join rows — mirrors what createWorkflow/saveWorkflowDefinition do together. */
  async function insertWorkflow(params: {
    name: string;
    status: "enabled" | "paused";
    triggerFormIds: string[];
  }): Promise<string> {
    const { data: workflow, error: workflowError } = await ownerClient
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: params.name,
        status: params.status,
        definition: workflowDefinitionWithResponseAction(params.triggerFormIds) as never,
        schema_version: 1,
        webhook_secret: "test-secret",
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (workflowError) throw workflowError;

    const { error: triggerError } = await ownerClient.from("workflow_form_triggers").insert(
      params.triggerFormIds.map((triggerFormId) => ({
        workflow_id: workflow.id,
        form_id: triggerFormId,
      })),
    );
    if (triggerError) throw triggerError;

    return workflow.id;
  }

  it("enqueues one run per enabled workflow and executes it end-to-end", async () => {
    const workflowId = await insertWorkflow({
      name: "Notiz-Workflow",
      status: "enabled",
      triggerFormIds: [formId],
    });

    const responseId = await insertResponse();

    const { enqueueWorkflowRuns, executeWorkflowRun } = await import("../run");
    const runIds = await enqueueWorkflowRuns({ formId, responseId });
    expect(runIds).toHaveLength(1);

    await executeWorkflowRun(runIds[0]!);

    const admin = serviceClient();
    const { data: run } = await admin
      .from("workflow_runs")
      .select("status, error_message")
      .eq("id", runIds[0]!)
      .single();
    expect(run?.status).toBe("succeeded");

    const { data: steps } = await admin
      .from("workflow_run_steps")
      .select("node_type, status")
      .eq("run_id", runIds[0]!);
    expect(steps).toHaveLength(1);
    expect(steps![0]!.node_type).toBe("responseAction");
    expect(steps![0]!.status).toBe("succeeded");

    const { data: response } = await admin
      .from("responses")
      .select("note")
      .eq("id", responseId)
      .single();
    expect(response?.note).toContain("Budget: 5000");

    await admin.from("workflows").delete().eq("id", workflowId);
  });

  it("does not enqueue a second run for the same response+workflow (idempotency)", async () => {
    const workflowId = await insertWorkflow({
      name: "Idempotenz-Workflow",
      status: "enabled",
      triggerFormIds: [formId],
    });

    const responseId = await insertResponse();

    const { enqueueWorkflowRuns } = await import("../run");
    const firstRunIds = await enqueueWorkflowRuns({ formId, responseId });
    const secondRunIds = await enqueueWorkflowRuns({ formId, responseId });

    expect(firstRunIds).toHaveLength(1);
    expect(secondRunIds).toHaveLength(0); // unique index swallows the duplicate insert

    const admin = serviceClient();
    const { data: runs } = await admin
      .from("workflow_runs")
      .select("id")
      .eq("workflow_id", workflowId)
      .eq("response_id", responseId);
    expect(runs).toHaveLength(1);

    await admin.from("workflows").delete().eq("id", workflowId);
  });

  it("does not enqueue anything when no workflow is enabled", async () => {
    const workflowId = await insertWorkflow({
      name: "Pausierter Workflow",
      status: "paused",
      triggerFormIds: [formId],
    });

    const responseId = await insertResponse();
    const { enqueueWorkflowRuns } = await import("../run");
    const runIds = await enqueueWorkflowRuns({ formId, responseId });
    expect(runIds).toHaveLength(0);

    const admin = serviceClient();
    await admin.from("workflows").delete().eq("id", workflowId);
  });

  it("fires a workflow triggered by multiple forms for either of them, but not for an unrelated form", async () => {
    const workflowId = await insertWorkflow({
      name: "Multi-Formular-Workflow",
      status: "enabled",
      triggerFormIds: [formId, secondFormId],
    });

    const { enqueueWorkflowRuns } = await import("../run");

    const responseOnFirstForm = await insertResponse(formId, publishedVersionId);
    const runsForFirstForm = await enqueueWorkflowRuns({ formId, responseId: responseOnFirstForm });
    expect(runsForFirstForm).toHaveLength(1);

    const responseOnSecondForm = await insertResponse(secondFormId, secondPublishedVersionId);
    const runsForSecondForm = await enqueueWorkflowRuns({
      formId: secondFormId,
      responseId: responseOnSecondForm,
    });
    expect(runsForSecondForm).toHaveLength(1);

    const admin = serviceClient();

    // A third, unrelated form must never enqueue this workflow.
    const { data: unrelatedForm, error: unrelatedFormError } = await ownerClient
      .from("forms")
      .insert({
        workspace_id: workspaceId,
        title: "Unbeteiligtes Formular",
        slug: `wf-integration-unrelated-${Date.now()}`,
        draft_definition: createEmptyFormDefinition("Unbeteiligtes Formular") as never,
        schema_version: CURRENT_SCHEMA_VERSION,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (unrelatedFormError) throw unrelatedFormError;

    const runsForUnrelatedForm = await enqueueWorkflowRuns({
      formId: unrelatedForm.id,
      responseId: responseOnFirstForm, // response id is irrelevant here; only the formId lookup matters
    });
    expect(runsForUnrelatedForm).toHaveLength(0);

    await admin.from("forms").delete().eq("id", unrelatedForm.id);
    await admin.from("workflows").delete().eq("id", workflowId);
  });

  it("re-syncs workflow_form_triggers when a workflow's trigger formIds change", async () => {
    // Exercises the same delete/insert sync logic as
    // lib/db/repositories/workflows.ts's syncWorkflowTriggerForms — that
    // function itself requires a Next.js request scope (cookie-based
    // createUserClient), which a plain test import doesn't have, so this
    // reproduces its query shape directly against the RLS-authenticated
    // owner client instead.
    const workflowId = await insertWorkflow({
      name: "Sync-Workflow",
      status: "paused",
      triggerFormIds: [formId],
    });

    const { error: deleteError } = await ownerClient
      .from("workflow_form_triggers")
      .delete()
      .eq("workflow_id", workflowId)
      .eq("form_id", formId);
    if (deleteError) throw deleteError;

    const { error: insertError } = await ownerClient
      .from("workflow_form_triggers")
      .insert({ workflow_id: workflowId, form_id: secondFormId });
    if (insertError) throw insertError;

    const admin = serviceClient();
    const { data: triggers } = await admin
      .from("workflow_form_triggers")
      .select("form_id")
      .eq("workflow_id", workflowId);

    expect(triggers).toHaveLength(1);
    expect(triggers![0]!.form_id).toBe(secondFormId);

    await admin.from("workflows").delete().eq("id", workflowId);
  });
});
