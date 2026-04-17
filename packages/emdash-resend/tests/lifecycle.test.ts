import { describe, it, expect, vi } from "vitest";
import { handleInstall, handleActivate, handleDeactivate } from "../src/handlers/lifecycle.js";
import { makeMockCtx } from "./helpers.js";

const WEBHOOK_RESPONSE = new Response(
  JSON.stringify({ id: "wh_new", signing_secret: "whsec_newsecret" }),
  { status: 200, headers: { "Content-Type": "application/json" } }
);
const DELETE_RESPONSE = new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });

describe("handleInstall", () => {
  it("registers webhook when API key and site URL are present", async () => {
    const ctx = makeMockCtx({
      kv: {
        "settings:apiKey": "re_test",
        "settings:siteUrl": "https://example.com",
      },
      fetchImpl: vi.fn().mockResolvedValue(WEBHOOK_RESPONSE.clone()),
    });

    await handleInstall({}, ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookSecret", "whsec_newsecret");
  });

  it("skips silently when no API key", async () => {
    const ctx = makeMockCtx({ kv: {} });
    await handleInstall({}, ctx as any);
    expect(ctx.kv.set).not.toHaveBeenCalled();
  });
});

describe("handleActivate", () => {
  it("skips when webhookId already exists", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:webhookId": "wh_existing" },
    });
    await handleActivate({}, ctx as any);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
  });

  it("re-registers when API key exists but no webhookId", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:siteUrl": "https://example.com" },
      fetchImpl: vi.fn().mockResolvedValue(WEBHOOK_RESPONSE.clone()),
    });

    await handleActivate({}, ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
  });
});

describe("handleDeactivate", () => {
  it("deletes webhook from Resend and removes webhookId from KV", async () => {
    const ctx = makeMockCtx({
      kv: { "settings:apiKey": "re_test", "settings:webhookId": "wh_del" },
      fetchImpl: vi.fn().mockResolvedValue(DELETE_RESPONSE.clone()),
    });

    await handleDeactivate({}, ctx as any);

    expect(ctx.http.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/webhooks/wh_del",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(ctx.kv.delete).toHaveBeenCalledWith("settings:webhookId");
  });

  it("skips when no webhookId", async () => {
    const ctx = makeMockCtx({ kv: { "settings:apiKey": "re_test" } });
    await handleDeactivate({}, ctx as any);
    expect(ctx.http.fetch).not.toHaveBeenCalled();
  });
});
