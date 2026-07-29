import { describe, expect, it } from "vitest";
import { checkWebhookUrl } from "./webhook-url";

describe("checkWebhookUrl", () => {
  it("allows a normal https URL", () => {
    expect(checkWebhookUrl("https://example.com/hooks/formcraft").ok).toBe(true);
  });

  it("rejects an invalid URL", () => {
    const result = checkWebhookUrl("not-a-url");
    expect(result.ok).toBe(false);
  });

  it("rejects localhost", () => {
    expect(checkWebhookUrl("https://localhost/hooks").ok).toBe(false);
  });

  it("rejects loopback IPs", () => {
    expect(checkWebhookUrl("https://127.0.0.1/hooks").ok).toBe(false);
  });

  it("rejects private 10.x addresses", () => {
    expect(checkWebhookUrl("https://10.0.0.5/hooks").ok).toBe(false);
  });

  it("rejects private 192.168.x addresses", () => {
    expect(checkWebhookUrl("https://192.168.1.1/hooks").ok).toBe(false);
  });

  it("rejects 172.16-31.x addresses but allows 172.32.x", () => {
    expect(checkWebhookUrl("https://172.20.0.1/hooks").ok).toBe(false);
    expect(checkWebhookUrl("https://172.32.0.1/hooks").ok).toBe(true);
  });

  it("rejects link-local addresses", () => {
    expect(checkWebhookUrl("https://169.254.169.254/hooks").ok).toBe(false);
  });

  it("rejects .internal hostnames", () => {
    expect(checkWebhookUrl("https://service.internal/hooks").ok).toBe(false);
  });
});
