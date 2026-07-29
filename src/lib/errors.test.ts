import { describe, expect, it } from "vitest";
import { AppError, isAppError } from "./errors";

describe("AppError", () => {
  it("maps error codes to the correct HTTP status", () => {
    expect(new AppError("NOT_FOUND", "Formular nicht gefunden").status).toBe(404);
    expect(new AppError("CONFLICT", "Revision veraltet").status).toBe(409);
    expect(new AppError("RATE_LIMITED", "Zu viele Anfragen").status).toBe(429);
  });

  it("serializes to the { error: { code, message } } envelope", () => {
    const error = new AppError("VALIDATION_ERROR", "Ungültige Eingabe");
    expect(error.toResponseBody()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Ungültige Eingabe" },
    });
  });

  it("includes optional details (e.g. retryAfter) in the envelope", () => {
    const error = new AppError("RATE_LIMITED", "Zu viele Anfragen", {
      details: { retryAfter: 30 },
    });
    expect(error.toResponseBody().error.details).toEqual({ retryAfter: 30 });
  });

  it("isAppError narrows unknown values correctly", () => {
    expect(isAppError(new AppError("NOT_FOUND", "x"))).toBe(true);
    expect(isAppError(new Error("plain"))).toBe(false);
    expect(isAppError("not an error")).toBe(false);
  });
});
