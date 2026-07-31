import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { RunContext } from "../context";
import { runWebhookAction, signWebhookPayload } from "./webhook";

function makeContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    runId: "run_1",
    workflowId: "wf_1",
    triggerType: "response_submitted",
    formId: "form_1",
    responseId: "resp_1",
    isTest: false,
    dryRun: false,
    form: createEmptyFormDefinition("Testformular"),
    answers: {},
    rawAnswers: [{ fieldId: "fld_budget", fieldType: "number", value: 5000 }],
    response: { id: "resp_1", submittedAt: "2026-01-01T10:00:00.000Z" },
    digest: null,
    webhookPayload: null,
    workflow: { id: "wf_1", name: "Test-Workflow", webhookSecret: "supersecret" },
    createdByUserId: "user_1",
    creatorEmail: "creator@example.com",
    workspaceId: "ws_1",
    ...overrides,
  };
}

function digestOf(overrides: Partial<RunContext["digest"]> = {}): NonNullable<RunContext["digest"]> {
  return {
    responses: [
      {
        responseId: "resp_a",
        formId: "form_1",
        formTitle: "Testformular",
        submittedAt: "2026-01-01T09:00:00.000Z",
        answers: [{ fieldId: "fld_budget", fieldType: "number", value: 3000 }],
      },
    ],
    windowStart: "2026-01-01T00:00:00.000Z",
    windowEnd: "2026-01-01T10:00:00.000Z",
    truncated: false,
    ...overrides,
  };
}

function webhookNode(url: string, includeAnswers = true) {
  return {
    id: "wfn_webhook",
    type: "webhook" as const,
    position: { x: 0, y: 0 },
    config: { url, includeAnswers },
  };
}

describe("signWebhookPayload", () => {
  it("produces a deterministic HMAC-SHA256 hex digest", () => {
    const signature = signWebhookPayload("hello", "secret");
    // Precomputed: HMAC-SHA256("hello", key="secret") in hex.
    expect(signature).toBe("88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b");
  });

  it("produces different signatures for different secrets", () => {
    const a = signWebhookPayload("hello", "secret-a");
    const b = signWebhookPayload("hello", "secret-b");
    expect(a).not.toBe(b);
  });
});

describe("runWebhookAction — response_submitted", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a blocked URL before making any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://localhost/hooks");
    await expect(runWebhookAction(node, makeContext())).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a signed POST request with the response payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => "ok",
    });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks");
    const result = await runWebhookAction(node, makeContext());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.com/hooks");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.headers["x-formcraft-signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);

    const body = JSON.parse(init.body);
    expect(body.event).toBe("response.submitted");
    expect(body.responseId).toBe("resp_1");
    expect(body.answers).toEqual([{ fieldId: "fld_budget", fieldType: "number", value: 5000 }]);

    expect(result.output).toEqual({ status: 200, bodyExcerpt: "ok" });
  });

  it("omits answers when includeAnswers is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks", false);
    await runWebhookAction(node, makeContext());

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.answers).toBeUndefined();
  });

  it("throws when the response status is >= 400", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 500, text: async () => "boom" });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks");
    await expect(runWebhookAction(node, makeContext())).rejects.toThrow(/500/);
  });

  it("does not call fetch in dry-run mode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks");
    const result = await runWebhookAction(node, makeContext({ dryRun: true }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({ simulated: true });
  });
});

describe("runWebhookAction — digest triggers (schedule/manual)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a workflow.digest payload with window and count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks");
    await runWebhookAction(
      node,
      makeContext({
        triggerType: "schedule",
        formId: null,
        responseId: null,
        form: null,
        response: null,
        digest: digestOf(),
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.event).toBe("workflow.digest");
    expect(body.workflowId).toBe("wf_1");
    expect(body.count).toBe(1);
    expect(body.windowStart).toBe("2026-01-01T00:00:00.000Z");
    expect(body.windowEnd).toBe("2026-01-01T10:00:00.000Z");
    expect(body.responses[0].responseId).toBe("resp_a");
  });

  it("omits the responses array when includeAnswers is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks", false);
    await runWebhookAction(
      node,
      makeContext({
        triggerType: "manual",
        formId: null,
        responseId: null,
        form: null,
        response: null,
        digest: digestOf(),
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.event).toBe("workflow.digest");
    expect(body.responses).toBeUndefined();
  });
});

describe("runWebhookAction — webhook_inbound", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a workflow.webhook_received payload including the received payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const node = webhookNode("https://example.com/hooks");
    await runWebhookAction(
      node,
      makeContext({
        triggerType: "webhook_inbound",
        formId: null,
        responseId: null,
        form: null,
        response: null,
        digest: digestOf({ responses: [] }),
        webhookPayload: { hello: "world" },
      }),
    );

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.event).toBe("workflow.webhook_received");
    expect(body.receivedPayload).toEqual({ hello: "world" });
  });
});
