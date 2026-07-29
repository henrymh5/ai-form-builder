import { afterEach, describe, expect, it, vi } from "vitest";
import { captureError, logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes info logs as JSON to stdout", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logger.info("hello", { requestId: "req_1" });

    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed).toMatchObject({ level: "info", message: "hello", requestId: "req_1" });
    expect(typeof parsed.time).toBe("string");
  });

  it("writes error logs to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("boom");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0]![0] as string)).toMatchObject({
      level: "error",
      message: "boom",
    });
  });
});

describe("captureError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes thrown non-Error values into an Error with a message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captureError("plain string failure");

    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed.message).toBe("plain string failure");
  });

  it("includes the stack trace and extra fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captureError(new Error("db failure"), { requestId: "req_2" });

    const parsed = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(parsed.message).toBe("db failure");
    expect(parsed.requestId).toBe("req_2");
    expect(typeof parsed.stack).toBe("string");
  });
});
