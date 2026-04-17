import { describe, it, expect, vi } from "vitest";
import { handleWebhook } from "../src/handlers/webhook.js";
import { makeMockCtx } from "./helpers.js";

async function signBody(secret: string, svixId: string, timestamp: string, body: string): Promise<string> {
  const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${svixId}.${timestamp}.${body}`));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

const RAW_SECRET = btoa("supersecretbytes_at_least_32_chars!!");
const SVIX_SECRET = `whsec_${RAW_SECRET}`;

async function makeWebhookCtx(payload: unknown, secret = SVIX_SECRET) {
  const body = JSON.stringify(payload);
  const svixId = "msg_test_1";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signBody(secret, svixId, timestamp, body);

  const ctx = makeMockCtx({ kv: { "settings:webhookSecret": secret } });
  return {
    ...ctx,
    input: payload,
    request: new Request("https://example.com/_emdash/api/plugins/emdash-resend/webhook", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        "svix-id": svixId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      },
    }),
  };
}

describe("handleWebhook", () => {
  it("updates delivery status to delivered on email.delivered", async () => {
    const ctx = await makeWebhookCtx({ type: "email.delivered", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "sent", createdAt: "2024-01-01T00:00:00Z"
    });

    await handleWebhook(ctx as any);

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "email_abc",
      expect.objectContaining({ status: "delivered" })
    );
  });

  it("rejects requests with invalid signature", async () => {
    const ctx = await makeWebhookCtx({ type: "email.delivered", data: { email_id: "x" } });
    const badHeaders = new Headers(ctx.request.headers);
    badHeaders.set("svix-signature", "v1,invalidsig==");
    const badRequest = new Request(ctx.request.url, {
      method: "POST",
      body: await ctx.request.clone().text(),
      headers: badHeaders,
    });
    (ctx as any).request = badRequest;

    await expect(handleWebhook(ctx as any)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("writes openedAt on email.opened only when not already set", async () => {
    const ctx = await makeWebhookCtx({ type: "email.opened", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "delivered", createdAt: "2024-01-01T00:00:00Z"
    });

    await handleWebhook(ctx as any);

    const putCall = (ctx.storage.deliveries.put as any).mock.calls[0][1];
    expect(putCall.openedAt).toBeDefined();
  });

  it("does not overwrite openedAt if already set", async () => {
    const ctx = await makeWebhookCtx({ type: "email.opened", data: { email_id: "email_abc" } });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "delivered",
      createdAt: "2024-01-01T00:00:00Z", openedAt: "2024-01-01T01:00:00Z"
    });

    await handleWebhook(ctx as any);

    const putCall = (ctx.storage.deliveries.put as any).mock.calls[0][1];
    expect(putCall.openedAt).toBe("2024-01-01T01:00:00Z");
  });

  it("creates a delivery record when webhook arrives before local send log exists", async () => {
    const ctx = await makeWebhookCtx({
      type: "email.opened",
      created_at: "2026-04-17T08:56:50.762Z",
      data: {
        email_id: "44a1e02d-97c9-47ed-a4cf-b0e62530b307",
        created_at: "2026-04-17T08:56:17.593Z",
        subject: "EmDash Resend plugin — test email",
        to: ["francisc.frd@gmail.com"],
        open: { timestamp: "2026-04-17T08:56:50.762Z" },
      },
    });
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue(null);

    await handleWebhook(ctx as any);

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "44a1e02d-97c9-47ed-a4cf-b0e62530b307",
      expect.objectContaining({
        resendId: "44a1e02d-97c9-47ed-a4cf-b0e62530b307",
        to: "francisc.frd@gmail.com",
        subject: "EmDash Resend plugin — test email",
        status: "delivered",
        openedAt: "2026-04-17T08:56:50.762Z",
      })
    );
  });

  it("handles webhook when request body stream is already consumed", async () => {
    const payload = { type: "email.delivered", data: { email_id: "email_abc" } };
    const ctx = await makeWebhookCtx(payload);
    ctx.storage.deliveries.get = vi.fn().mockResolvedValue({
      resendId: "email_abc", to: "u@u.com", subject: "Hi", status: "sent", createdAt: "2024-01-01T00:00:00Z"
    });

    // EmDash runtime parses JSON first; this consumes the stream.
    await ctx.request.json();

    await handleWebhook(ctx as any);

    expect(ctx.storage.deliveries.put).toHaveBeenCalledWith(
      "email_abc",
      expect.objectContaining({ status: "delivered" })
    );
  });
});
