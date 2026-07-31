import { describe, expect, it } from "vitest";
import { describeTrigger, triggerConfigSchema, triggerNodeSchema } from "./nodes";

const FORM_ID = "11111111-1111-4111-8111-111111111111";

describe("triggerConfigSchema — backward compatibility", () => {
  it("parses the pre-0014 stored shape (response_submitted with formIds)", () => {
    const stored = { event: "response_submitted", formIds: [FORM_ID] };
    const parsed = triggerConfigSchema.parse(stored);
    expect(parsed).toEqual({ event: "response_submitted", formIds: [FORM_ID] });
  });

  it("parses the oldest stored shape (response_submitted without formIds, via default)", () => {
    const parsed = triggerConfigSchema.parse({ event: "response_submitted" });
    expect(parsed).toEqual({ event: "response_submitted", formIds: [] });
  });

  it("parses a full trigger node with the old config shape", () => {
    const node = {
      id: "wfn_abc123def456",
      type: "trigger",
      position: { x: 0, y: 0 },
      config: { event: "response_submitted", formIds: [] },
    };
    expect(triggerNodeSchema.safeParse(node).success).toBe(true);
  });
});

describe("triggerConfigSchema — new branches", () => {
  it("parses a daily schedule", () => {
    const parsed = triggerConfigSchema.parse({
      event: "schedule",
      frequency: "daily",
      time: "08:00",
      formIds: [FORM_ID],
    });
    expect(parsed.event).toBe("schedule");
  });

  it("parses weekly and monthly schedules with their extra fields", () => {
    expect(
      triggerConfigSchema.safeParse({
        event: "schedule",
        frequency: "weekly",
        time: "23:59",
        weekday: 7,
        formIds: [],
      }).success,
    ).toBe(true);
    expect(
      triggerConfigSchema.safeParse({
        event: "schedule",
        frequency: "monthly",
        time: "00:00",
        dayOfMonth: 31,
        formIds: [],
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid time format", () => {
    expect(
      triggerConfigSchema.safeParse({
        event: "schedule",
        frequency: "daily",
        time: "24:00",
        formIds: [],
      }).success,
    ).toBe(false);
    expect(
      triggerConfigSchema.safeParse({
        event: "schedule",
        frequency: "daily",
        time: "8:00",
        formIds: [],
      }).success,
    ).toBe(false);
  });

  it("parses scheduled_once with an ISO datetime and rejects garbage", () => {
    expect(
      triggerConfigSchema.safeParse({
        event: "scheduled_once",
        runAt: "2026-08-01T10:00:00.000Z",
        formIds: [],
      }).success,
    ).toBe(true);
    expect(
      triggerConfigSchema.safeParse({
        event: "scheduled_once",
        runAt: "morgen",
        formIds: [],
      }).success,
    ).toBe(false);
  });

  it("parses webhook_inbound and manual", () => {
    expect(triggerConfigSchema.safeParse({ event: "webhook_inbound", formIds: [] }).success).toBe(
      true,
    );
    expect(triggerConfigSchema.safeParse({ event: "manual", formIds: [] }).success).toBe(true);
  });
});

describe("describeTrigger", () => {
  it("describes each trigger type in German", () => {
    expect(describeTrigger({ event: "response_submitted", formIds: [] })).toBe(
      "Neue Formularantwort",
    );
    expect(
      describeTrigger({ event: "schedule", frequency: "daily", time: "08:00", formIds: [] }),
    ).toBe("Zeitplan: täglich 08:00 (UTC)");
    expect(
      describeTrigger({
        event: "schedule",
        frequency: "weekly",
        time: "09:30",
        weekday: 1,
        formIds: [],
      }),
    ).toBe("Zeitplan: montags 09:30 (UTC)");
    expect(
      describeTrigger({
        event: "schedule",
        frequency: "monthly",
        time: "07:00",
        dayOfMonth: 15,
        formIds: [],
      }),
    ).toBe("Zeitplan: monatlich am 15. um 07:00 (UTC)");
    expect(describeTrigger({ event: "webhook_inbound", formIds: [] })).toBe("Eingehender Webhook");
    expect(describeTrigger({ event: "manual", formIds: [] })).toBe("Manueller Auslöser");
    expect(describeTrigger(null)).toBe("Kein Trigger");
  });
});
