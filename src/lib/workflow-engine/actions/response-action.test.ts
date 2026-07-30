import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyFormDefinition } from "@/lib/form-schema/factory";
import type { RunContext } from "../context";

const setResponseStatusForWorkflow = vi.fn();
const markResponseReadForWorkflow = vi.fn();
const appendResponseNoteForWorkflow = vi.fn();

vi.mock("@/lib/db/repositories/workflow-runs", () => ({
  setResponseStatusForWorkflow: (...args: unknown[]) => setResponseStatusForWorkflow(...args),
  markResponseReadForWorkflow: (...args: unknown[]) => markResponseReadForWorkflow(...args),
  appendResponseNoteForWorkflow: (...args: unknown[]) => appendResponseNoteForWorkflow(...args),
}));

const { runResponseAction } = await import("./response-action");

function makeContext(overrides: Partial<RunContext> = {}): RunContext {
  return {
    runId: "run_1",
    workflowId: "wf_1",
    formId: "form_1",
    responseId: "resp_1",
    isTest: false,
    dryRun: false,
    form: createEmptyFormDefinition("Testformular"),
    answers: {},
    rawAnswers: [],
    response: { id: "resp_1", submittedAt: "2026-01-01T10:00:00.000Z" },
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

describe("runResponseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls setResponseStatusForWorkflow for set_status", async () => {
    await runResponseAction(node("set_status", { status: "spam" }), makeContext());
    expect(setResponseStatusForWorkflow).toHaveBeenCalledWith("resp_1", "spam");
  });

  it("calls markResponseReadForWorkflow for mark_read", async () => {
    await runResponseAction(node("mark_read"), makeContext());
    expect(markResponseReadForWorkflow).toHaveBeenCalledWith("resp_1");
  });

  it("resolves placeholders before appending a note", async () => {
    await runResponseAction(
      node("append_note", { noteText: "Formular: {{form:title}}" }),
      makeContext(),
    );
    expect(appendResponseNoteForWorkflow).toHaveBeenCalledWith("resp_1", "Formular: Testformular");
  });

  it("throws when set_status has no target status", async () => {
    await expect(runResponseAction(node("set_status"), makeContext())).rejects.toThrow();
    expect(setResponseStatusForWorkflow).not.toHaveBeenCalled();
  });

  it("simulates without calling repositories in dry-run mode", async () => {
    const result = await runResponseAction(
      node("set_status", { status: "spam" }),
      makeContext({ dryRun: true }),
    );
    expect(setResponseStatusForWorkflow).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({ simulated: true });
  });
});
