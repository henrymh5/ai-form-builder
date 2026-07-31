import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { customAlphabet } from "nanoid";
import { createTestUser, deleteTestUser, serviceClient } from "@/lib/db/__integration__/helpers";
import { generateWorkflowId } from "@/lib/workflow-schema/ids";
import type { WorkflowDefinition } from "@/lib/workflow-schema/schema";

/**
 * `after()` requires a real Next.js request-lifecycle context (verified via
 * a throwaway probe: calling it bare under plain Vitest throws "`after`
 * was called outside a request scope") — this route uses it purely as a
 * "respond now, run the workflow in the background" optimization, so
 * mocking it to invoke its callback immediately is behavior-equivalent for
 * a test that awaits the response anyway.
 */
const afterCalls = vi.hoisted(() => ({ promises: [] as Promise<unknown>[] }));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (fn: () => unknown) => {
      afterCalls.promises.push(Promise.resolve(fn()));
    },
  };
});

const { POST } = await import("./route");

const tokenAlphabet = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  32,
);

function makeRequest(body: string | undefined, extraHeaders: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/public/workflows/x/trigger", {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body,
  });
}

/** Awaits the route's response AND the background after() callback it scheduled (mocked above to run inline), so DB assertions right after this call see the finished run. */
async function callRoute(
  token: string,
  body?: string,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const response = await POST(makeRequest(body, extraHeaders), {
    params: Promise.resolve({ token }),
  });
  await Promise.all(afterCalls.promises.splice(0));
  return response;
}

describe("POST /api/public/workflows/:token/trigger (integration)", () => {
  let ownerId: string;
  let workspaceId: string;

  async function insertWorkflow(params: {
    status: "enabled" | "paused";
    definition: WorkflowDefinition;
  }): Promise<{ id: string; token: string }> {
    const token = tokenAlphabet();
    const admin = serviceClient();
    const { data, error } = await admin
      .from("workflows")
      .insert({
        workspace_id: workspaceId,
        name: "Inbound-Route-Testworkflow",
        status: params.status,
        definition: params.definition as never,
        schema_version: 1,
        webhook_secret: "test-secret",
        inbound_token: token,
        created_by: ownerId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id, token };
  }

  function webhookInboundDefinition(): WorkflowDefinition {
    return {
      schemaVersion: 1,
      nodes: [
        {
          id: generateWorkflowId("node"),
          type: "trigger",
          position: { x: 0, y: 0 },
          config: { event: "webhook_inbound", formIds: [] },
        },
      ],
      edges: [],
    };
  }

  function manualDefinition(): WorkflowDefinition {
    return {
      schemaVersion: 1,
      nodes: [
        {
          id: generateWorkflowId("node"),
          type: "trigger",
          position: { x: 0, y: 0 },
          config: { event: "manual", formIds: [] },
        },
      ],
      edges: [],
    };
  }

  beforeAll(async () => {
    const owner = await createTestUser("Inbound Route Test Owner");
    ownerId = owner.userId;
    const { data: membership } = await owner.client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ownerId)
      .single();
    workspaceId = membership!.workspace_id;
  });

  afterAll(async () => {
    if (ownerId) await deleteTestUser(ownerId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a uniform 404 for an unknown token", async () => {
    const response = await callRoute("does-not-exist", "{}");
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a paused workflow", async () => {
    const { token } = await insertWorkflow({
      status: "paused",
      definition: webhookInboundDefinition(),
    });
    const response = await callRoute(token, "{}");
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for an enabled workflow with a non-webhook trigger", async () => {
    const { token } = await insertWorkflow({ status: "enabled", definition: manualDefinition() });
    const response = await callRoute(token, "{}");
    expect(response.status).toBe(404);
  });

  it("returns 400 for a body that isn't valid JSON", async () => {
    const { token } = await insertWorkflow({
      status: "enabled",
      definition: webhookInboundDefinition(),
    });
    const response = await callRoute(token, "not json");
    expect(response.status).toBe(400);
  });

  it("returns 413 when the body exceeds the size cap", async () => {
    const { token } = await insertWorkflow({
      status: "enabled",
      definition: webhookInboundDefinition(),
    });
    const hugeBody = JSON.stringify({ data: "x".repeat(70_000) });
    const response = await callRoute(token, hugeBody);
    expect(response.status).toBe(413);
  });

  it("treats an empty body as {} and enqueues + runs the workflow (202)", async () => {
    const { id, token } = await insertWorkflow({
      status: "enabled",
      definition: webhookInboundDefinition(),
    });

    const response = await callRoute(token, "");
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.runId).toBeTruthy();

    const admin = serviceClient();
    const { data: run } = await admin
      .from("workflow_runs")
      .select("status, trigger_type, trigger_context")
      .eq("id", body.runId)
      .single();
    expect(run?.trigger_type).toBe("webhook_inbound");
    expect(run?.status).toBe("succeeded");
    expect((run?.trigger_context as { payload?: unknown } | null)?.payload).toEqual({});

    const { data: workflow } = await admin
      .from("workflows")
      .select("last_digest_at")
      .eq("id", id)
      .single();
    expect(workflow?.last_digest_at).not.toBeNull();
  });

  it("stores the parsed JSON payload on the run's trigger_context", async () => {
    const { token } = await insertWorkflow({
      status: "enabled",
      definition: webhookInboundDefinition(),
    });

    const response = await callRoute(token, JSON.stringify({ hello: "world" }));
    expect(response.status).toBe(202);
    const body = await response.json();

    const admin = serviceClient();
    const { data: run } = await admin
      .from("workflow_runs")
      .select("trigger_context")
      .eq("id", body.runId)
      .single();
    expect((run?.trigger_context as { payload?: unknown } | null)?.payload).toEqual({
      hello: "world",
    });
  });

  it("rate-limits after 30 requests within the window (429 on the 31st)", async () => {
    const { token } = await insertWorkflow({
      status: "enabled",
      definition: webhookInboundDefinition(),
    });

    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const response = await callRoute(token, "{}");
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 30).every((s) => s === 202)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
