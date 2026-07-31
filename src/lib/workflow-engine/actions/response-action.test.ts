import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { RunContext } from "../context";

const setResponseStatusForWorkflowBatch = vi.fn();
const markResponseReadForWorkflowBatch = vi.fn();
const appendResponseNoteForWorkflowBatch = vi.fn();

vi.mock("@/lib/db/repositories/workflow-runs", () => ({
  setResponseStatusForWorkflowBatch: (...args: unknown[]) =>
    setResponseStatusForWorkflowBatch(...args),
  markResponseReadForWorkflowBatch: (...args: unknown[]) => markResponseReadForWorkflowBatch(...args),
  appendResponseNoteForWorkflowBatch: (...args: unknown[]) =>
    appendResponseNoteForWorkflowBatch(...args),
}));

const { runResponseAction } = await import("./response-action");

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
    rawAnswers: [],
    response: { id: "resp_1", submittedAt: "2026-01-01T10:00:00.000Z" },
    digest: null,
    webhookPayload: null,
    workflow: { id: "wf_1", name: "Test-Workflow", webhookSecret: null },
    createdByUserId: "user_1",
    creatorEmail: "creator@example.com",
    workspaceId: "ws_1",
    ...overrides,
  };
}

function node(
  action: "set_status" | "mark_read" | "append_note",
  extra: Record<string, unknown> = {},
) {
  return {
    id: "wfn_action",
    type: "responseAction" as const,
    position: { x: 0, y: 0 },
    config: { action, ...extra },
  };
}

describe("runResponseAction — response_submitted (single response)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setResponseStatusForWorkflowBatch with a single-element array for set_status", async () => {
    await runResponseAction(node("set_status", { status: "spam" }), makeContext());
    expect(setResponseStatusForWorkflowBatch).toHaveBeenCalledWith(["resp_1"], "spam");
  });

  it("calls markResponseReadForWorkflowBatch for mark_read", async () => {
    await runResponseAction(node("mark_read"), makeContext());
    expect(markResponseReadForWorkflowBatch).toHaveBeenCalledWith(["resp_1"]);
  });

  it("resolves placeholders before appending a note", async () => {
    await runResponseAction(
      node("append_note", { noteText: "Formular: {{form:title}}" }),
      makeContext(),
    );
    expect(appendResponseNoteForWorkflowBatch).toHaveBeenCalledWith(
      ["resp_1"],
      "Formular: Testformular",
    );
  });

  it("throws when set_status has no target status", async () => {
    await expect(runResponseAction(node("set_status"), makeContext())).rejects.toThrow();
    expect(setResponseStatusForWorkflowBatch).not.toHaveBeenCalled();
  });

  it("simulates without calling repositories in dry-run mode", async () => {
    const result = await runResponseAction(
      node("set_status", { status: "spam" }),
      makeContext({ dryRun: true }),
    );
    expect(setResponseStatusForWorkflowBatch).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({ simulated: true, appliedTo: 1 });
  });
});

describe("runResponseAction — digest mode (multiple responses)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function digestContext(): RunContext {
    return makeContext({
      triggerType: "schedule",
      formId: null,
      responseId: null,
      form: null,
      response: null,
      digest: {
        responses: [
          {
            responseId: "resp_a",
            formId: "form_1",
            formTitle: "Testformular",
            submittedAt: "2026-01-01T09:00:00.000Z",
            answers: [],
          },
          {
            responseId: "resp_b",
            formId: "form_1",
            formTitle: "Testformular",
            submittedAt: "2026-01-01T09:30:00.000Z",
            answers: [],
          },
        ],
        windowStart: "2026-01-01T00:00:00.000Z",
        windowEnd: "2026-01-01T10:00:00.000Z",
        truncated: false,
      },
    });
  }

  it("applies set_status to every digest response in one batched call", async () => {
    await runResponseAction(node("set_status", { status: "archived" }), digestContext());
    expect(setResponseStatusForWorkflowBatch).toHaveBeenCalledWith(
      ["resp_a", "resp_b"],
      "archived",
    );
  });

  it("appends the same resolved note text to every digest response", async () => {
    await runResponseAction(node("append_note", { noteText: "Automatisch verarbeitet" }), digestContext());
    expect(appendResponseNoteForWorkflowBatch).toHaveBeenCalledWith(
      ["resp_a", "resp_b"],
      "Automatisch verarbeitet",
    );
  });

  it("does nothing (appliedTo: 0) when the digest is empty", async () => {
    const ctx = digestContext();
    ctx.digest = { responses: [], windowStart: null, windowEnd: "2026-01-01T10:00:00.000Z", truncated: false };
    const result = await runResponseAction(node("mark_read"), ctx);
    expect(markResponseReadForWorkflowBatch).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({ appliedTo: 0 });
  });
});
