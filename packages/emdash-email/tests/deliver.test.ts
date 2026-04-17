import { describe, it, expect, vi } from "vitest";
import { handleEmailDeliver } from "../src/handlers/deliver.js";
import { makeMockCtx } from "./helpers.js";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    message: {
      to: "user@example.com",
      subject: "Test email",
      text: "Hello world",
      html: "<p>Hello world</p>",
      ...overrides,
    },
    source: "test",
  };
}

describe("handleEmailDeliver", () => {
  it("sends email via Resend and writes a delivery record", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test_key",
        "settings:fromAddress": "noreply@example.com",
        "settings:fromName": "Test Site",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "email_abc" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent(), ctx as any);

    expect(ctx.http.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "email_abc",
      expect.objectContaining({ resendId: "email_abc", status: "sent" })
    );
  });

  it("uses event.from if provided, ignoring defaults", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test_key" },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "email_xyz" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent({ from: "custom@example.com" }), ctx as any);

    const body = JSON.parse((ctx.http.fetch as any).mock.calls[0][1].body);
    expect(body.from).toBe("custom@example.com");
  });

  it("builds 'Name <address>' from KV defaults when no from in event", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test_key",
        "settings:fromName": "My Site",
        "settings:fromAddress": "hi@mysite.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "e1" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });

    await handleEmailDeliver(makeEvent(), ctx as any);

    const body = JSON.parse((ctx.http.fetch as any).mock.calls[0][1].body);
    expect(body.from).toBe("My Site <hi@mysite.com>");
  });

  it("throws when no API key is configured", async () => {
    const ctx = makeMockCtx({ kv: {} });
    await expect(handleEmailDeliver(makeEvent(), ctx as any)).rejects.toThrow("API key");
  });

  it("throws when no from address is configured", async () => {
    const ctx = makeMockCtx({ kv: { "settings:apiKey": "re_test_key" } });
    await expect(handleEmailDeliver(makeEvent(), ctx as any)).rejects.toThrow("from address");
  });

  it("does not throw when delivery persistence fails after provider acceptance", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test_key",
        "settings:fromAddress": "noreply@example.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "email_after_send" }), { status: 200, headers: { "Content-Type": "application/json" } })
      ),
    });
    ctx.storage.deliveries.put = vi.fn().mockRejectedValue(new Error("storage unavailable"));

    await expect(handleEmailDeliver(makeEvent(), ctx as any)).resolves.toBeUndefined();
    expect(ctx.log.warn).toHaveBeenCalledWith(
      "Email Providers plugin: failed to persist Resend delivery record after send",
      expect.objectContaining({ providerMessageId: "email_after_send" })
    );
  });

  it("routes delivery through Cloudflare when provider is selected", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:provider": "cloudflare",
        "settings:cloudflare:apiToken": "cf_test_token",
        "settings:cloudflare:accountId": "acc_123",
        "settings:cloudflare:fromAddress": "noreply@example.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              delivered: ["user@example.com"],
              queued: [],
              permanent_bounces: [],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      ),
    });

    await handleEmailDeliver(makeEvent(), ctx as any);

    expect(ctx.http.fetch).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/acc_123/email/sending/send",
      expect.objectContaining({ method: "POST" })
    );
    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        provider: "cloudflare",
        status: "sent",
      })
    );
  });
});
