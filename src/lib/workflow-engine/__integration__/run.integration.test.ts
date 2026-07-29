import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, serviceClient } from "@/lib/db/__integration__/helpers";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import { CURRENT_SCHEMA_VERSION } from "@/lib/form-schema/schema";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import type { WorkflowDefinition } from "@/lib/workflow-schema/schema";

/**
 * Exercises enqueue + execute against the real local Supabase stack (RLS,
 * the unique idempotency index, the queued/running/succeeded lifecycle) —
 * unlike interpreter.test.ts, which is pure and DB-free. Only external
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
  });

  afterAll(async () => {
    if (ownerId) await deleteTestUser(ownerId);
  });

  async function insertResponse(): Promise<string> {
    const admin = serviceClient();
    const { data: session, error: sessionError } = await admin
      .from("form_sessions")
      .insert({ form_id: formId, form_version_id: publishedVersionId, status: "completed" })
      .select("id")
      .single();
    if (sessionError) throw sessionError;

    const { data: response, error: responseError } = await admin
      .from("responses")
      .insert({
        form_id: formId,
        form_version_id: publishedVersionId,
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

  function workflowDefinitionWithResponseAction(): WorkflowDefinition {
    const triggerId = generateWorkflowId("node");
    const actionId = generateWorkflowId("node");
    return {
      schemaVersion: 1,
      nodes: [
        { id: triggerId, type: "trigger", position: { x: 0, y: 0 }, config: { event: "response_submitted" } },
        {
          id: actionId,
          type: "responseAction",
          position: { x: 0, y: 100 },
          config: { action: "append_note", noteText: "Budget: {{field:" + fieldId + "}}" },
        },
      ],
      edges: [{ id: generateWorkflowId("edge"), source: triggerId, target: actionId, sourceHandle: "out" }],
    };
  }

  it("enqueues one run per enabled workflow and executes it end-to-end", async () => {
    const { data: workflow, error: workflowError } = await ownerClient
      .from("workflows")
      .insert({
        form_id: formId,
        name: "Notiz-Workflow",
        status: "enabled",
        definition: workflowDefinitionWithResponseAction() as never,
        schema_version: 1,
        webhook_secret: "test-secret",
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (workflowError) throw workflowError;

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

    await admin.from("workflows").delete().eq("id", workflow.id);
  });

  it("does not enqueue a second run for the same response+workflow (idempotency)", async () => {
    const { data: workflow, error: workflowError } = await ownerClient
      .from("workflows")
      .insert({
        form_id: formId,
        name: "Idempotenz-Workflow",
        status: "enabled",
        definition: workflowDefinitionWithResponseAction() as never,
        schema_version: 1,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (workflowError) throw workflowError;

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
      .eq("workflow_id", workflow.id)
      .eq("response_id", responseId);
    expect(runs).toHaveLength(1);

    await admin.from("workflows").delete().eq("id", workflow.id);
  });

  it("does not enqueue anything when no workflow is enabled", async () => {
    const { data: workflow, error: workflowError } = await ownerClient
      .from("workflows")
      .insert({
        form_id: formId,
        name: "Pausierter Workflow",
        status: "paused",
        definition: workflowDefinitionWithResponseAction() as never,
        schema_version: 1,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (workflowError) throw workflowError;

    const responseId = await insertResponse();
    const { enqueueWorkflowRuns } = await import("../run");
    const runIds = await enqueueWorkflowRuns({ formId, responseId });
    expect(runIds).toHaveLength(0);

    const admin = serviceClient();
    await admin.from("workflows").delete().eq("id", workflow.id);
  });
});
