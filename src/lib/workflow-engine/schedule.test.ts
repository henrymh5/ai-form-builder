import { describe, expect, it } from "vitest";
import type { TriggerConfig } from "@/lib/workflow-schema/nodes";
import { computeNextRunAt } from "./schedule";

const FORM_IDS: string[] = [];

function schedule(partial: Omit<Extract<TriggerConfig, { event: "schedule" }>, "event" | "formIds">): TriggerConfig {
  return { event: "schedule", formIds: FORM_IDS, ...partial };
}

describe("computeNextRunAt — daily", () => {
  it("returns today's slot when the time is still ahead", () => {
    const from = new Date("2026-07-31T06:00:00.000Z");
    const next = computeNextRunAt(schedule({ frequency: "daily", time: "08:00" }), from);
    expect(next?.toISOString()).toBe("2026-07-31T08:00:00.000Z");
  });

  it("rolls over to tomorrow when the time has passed", () => {
    const from = new Date("2026-07-31T09:30:00.000Z");
    const next = computeNextRunAt(schedule({ frequency: "daily", time: "08:00" }), from);
    expect(next?.toISOString()).toBe("2026-08-01T08:00:00.000Z");
  });

  it("rolls over when `from` is exactly the slot (strictly after)", () => {
    const from = new Date("2026-07-31T08:00:00.000Z");
    const next = computeNextRunAt(schedule({ frequency: "daily", time: "08:00" }), from);
    expect(next?.toISOString()).toBe("2026-08-01T08:00:00.000Z");
  });
});

describe("computeNextRunAt — weekly", () => {
  // 2026-07-31 is a Friday (ISO weekday 5).
  it("finds the same day when the time is ahead", () => {
    const from = new Date("2026-07-31T06:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "weekly", time: "08:00", weekday: 5 }),
      from,
    );
    expect(next?.toISOString()).toBe("2026-07-31T08:00:00.000Z");
  });

  it("wraps to next week when today's slot has passed", () => {
    const from = new Date("2026-07-31T09:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "weekly", time: "08:00", weekday: 5 }),
      from,
    );
    expect(next?.toISOString()).toBe("2026-08-07T08:00:00.000Z");
  });

  it("crosses the week boundary to reach an earlier weekday", () => {
    // From Friday to next Monday (weekday 1).
    const from = new Date("2026-07-31T09:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "weekly", time: "08:00", weekday: 1 }),
      from,
    );
    expect(next?.toISOString()).toBe("2026-08-03T08:00:00.000Z");
  });
});

describe("computeNextRunAt — monthly", () => {
  it("finds this month's slot when still ahead", () => {
    const from = new Date("2026-07-10T00:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "monthly", time: "08:00", dayOfMonth: 15 }),
      from,
    );
    expect(next?.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("rolls into the next month when the slot has passed", () => {
    const from = new Date("2026-07-20T00:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "monthly", time: "08:00", dayOfMonth: 15 }),
      from,
    );
    expect(next?.toISOString()).toBe("2026-08-15T08:00:00.000Z");
  });

  it("clamps day 31 to the end of shorter months (Feb)", () => {
    const from = new Date("2026-02-01T00:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "monthly", time: "08:00", dayOfMonth: 31 }),
      from,
    );
    // 2026 is not a leap year — February ends on the 28th.
    expect(next?.toISOString()).toBe("2026-02-28T08:00:00.000Z");
  });

  it("clamps day 31 to Feb 29 in a leap year", () => {
    const from = new Date("2028-02-01T00:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "monthly", time: "08:00", dayOfMonth: 31 }),
      from,
    );
    expect(next?.toISOString()).toBe("2028-02-29T08:00:00.000Z");
  });

  it("wraps December into January of the next year", () => {
    const from = new Date("2026-12-20T00:00:00.000Z");
    const next = computeNextRunAt(
      schedule({ frequency: "monthly", time: "08:00", dayOfMonth: 15 }),
      from,
    );
    expect(next?.toISOString()).toBe("2027-01-15T08:00:00.000Z");
  });
});

describe("computeNextRunAt — scheduled_once", () => {
  it("returns the runAt while it is still in the future", () => {
    const from = new Date("2026-07-31T06:00:00.000Z");
    const next = computeNextRunAt(
      { event: "scheduled_once", runAt: "2026-08-01T10:00:00.000Z", formIds: [] },
      from,
    );
    expect(next?.toISOString()).toBe("2026-08-01T10:00:00.000Z");
  });

  it("returns null once the runAt has passed", () => {
    const from = new Date("2026-08-02T00:00:00.000Z");
    const next = computeNextRunAt(
      { event: "scheduled_once", runAt: "2026-08-01T10:00:00.000Z", formIds: [] },
      from,
    );
    expect(next).toBeNull();
  });
});

describe("computeNextRunAt — non-time-based triggers", () => {
  it("returns null for response_submitted, webhook_inbound, manual, and null config", () => {
    const from = new Date("2026-07-31T06:00:00.000Z");
    expect(computeNextRunAt({ event: "response_submitted", formIds: [] }, from)).toBeNull();
    expect(computeNextRunAt({ event: "webhook_inbound", formIds: [] }, from)).toBeNull();
    expect(computeNextRunAt({ event: "manual", formIds: [] }, from)).toBeNull();
    expect(computeNextRunAt(null, from)).toBeNull();
  });
});
