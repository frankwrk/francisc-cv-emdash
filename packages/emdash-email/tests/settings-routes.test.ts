import { describe, it, expect, vi } from "vitest";
import {
  handleGetSettings,
  handleSaveSettings,
  handleGetWebhookStatus,
  handleRegisterWebhook,
} from "../src/handlers/settings.js";
import { makeRouteMockCtx } from "./helpers.js";

describe("handleGetSettings", () => {
  it("returns settings with apiKey masked", async () => {
    const ctx = makeRouteMockCtx({}, {
      kv: {
        "settings:apiKey": "re_live_secret",
        "settings:fromAddress": "hi@example.com",
        "settings:fromName": "My Site",
        "settings:webhookId": "wh_123",
        "settings:webhookSecret": "whsec_abc",
      },
    });

    const result = await handleGetSettings(ctx as any);

    expect(result).toMatchObject({
      fromAddress: "hi@example.com",
      fromName: "My Site",
      webhookRegistered: true,
    });
    expect(result.apiKey).toMatch(/•/);
    expect(result.apiKey).not.toContain("secret");
  });

  it("returns webhookRegistered: false when no webhookId", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:apiKey": "re_live_secret" } });
    const result = await handleGetSettings(ctx as any);
    expect(result.webhookRegistered).toBe(false);
  });

  it("returns webhookRegistered: false when webhookId exists but secret is missing", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:webhookId": "wh_123" } });
    const result = await handleGetSettings(ctx as any);
    expect(result.webhookRegistered).toBe(false);
  });

  it("returns selected provider and capability metadata", async () => {
    const ctx = makeRouteMockCtx({}, {
      kv: {
        "settings:provider": "cloudflare",
      },
    });

    const result = await handleGetSettings(ctx as any);
    expect(result.provider).toBe("cloudflare");
    expect(result.capabilities).toMatchObject({
      workerProvisioning: true,
      audiences: false,
      broadcasts: false,
    });
  });
});

describe("handleSaveSettings", () => {
  it("saves all provided fields to KV", async () => {
    const ctx = makeRouteMockCtx(
      { apiKey: "re_new_key", fromAddress: "new@example.com", fromName: "New Name" },
      { method: "POST", url: "https://example.com/_emdash/api/plugins/emdash-resend/settings/save" }
    );

    const result = await handleSaveSettings(ctx as any);

    expect(result.success).toBe(true);
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:apiKey", "re_new_key");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:fromAddress", "new@example.com");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:fromName", "New Name");
  });

  it("registers webhook on first save when no webhookId exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "wh_new", signing_secret: "whsec_abc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const ctx = makeRouteMockCtx(
      { apiKey: "re_new_key", fromAddress: "x@y.com" },
      {
        method: "POST",
        url: "https://mysite.com/_emdash/api/plugins/emdash-resend/settings/save",
        fetchImpl: fetchMock,
      }
    );

    await handleSaveSettings(ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:siteUrl", "https://mysite.com");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_new");
  });

  it("re-registers webhook when webhookId exists but secret is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "wh_newer", signing_secret: "whsec_newer" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const ctx = makeRouteMockCtx(
      { fromAddress: "x@y.com" },
      {
        method: "POST",
        url: "https://mysite.com/_emdash/api/plugins/emdash-resend/settings/save",
        kv: {
          "settings:apiKey": "re_existing_key",
          "settings:webhookId": "wh_existing",
        },
        fetchImpl: fetchMock,
      }
    );

    await handleSaveSettings(ctx as any);

    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookId", "wh_newer");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:webhookSecret", "whsec_newer");
  });

  it("switches provider and saves nested cloudflare settings", async () => {
    const ctx = makeRouteMockCtx(
      {
        provider: "cloudflare",
        cloudflare: {
          apiToken: "cf_token",
          authEmail: "owner@example.com",
          accountId: "acc_1",
          zoneId: "zone_1",
          fromAddress: "noreply@example.com",
        },
      },
      { method: "POST", url: "https://example.com/_emdash/api/plugins/emdash-resend/settings/save" }
    );

    const result = await handleSaveSettings(ctx as any);

    expect(result).toEqual({ success: true, provider: "cloudflare" });
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:provider", "cloudflare");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:cloudflare:apiToken", "cf_token");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:cloudflare:authEmail", "owner@example.com");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:cloudflare:accountId", "acc_1");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:cloudflare:zoneId", "zone_1");
    expect(ctx.kv.set).toHaveBeenCalledWith("settings:cloudflare:fromAddress", "noreply@example.com");
  });
});

describe("handleGetWebhookStatus", () => {
  it("returns registered: false when no webhookId in KV", async () => {
    const ctx = makeRouteMockCtx({}, { kv: {} });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(false);
  });

  it("returns registered: true when webhookId and secret exist", async () => {
    const ctx = makeRouteMockCtx({}, {
      kv: {
        "settings:webhookId": "wh_123",
        "settings:webhookSecret": "whsec_abc",
      },
    });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(true);
    expect(result.webhookId).toBe("wh_123");
  });

  it("returns registered: false when webhookId exists but secret is missing", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:webhookId": "wh_123" } });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(false);
  });

  it("returns provider-specific reason when active provider is cloudflare", async () => {
    const ctx = makeRouteMockCtx({}, { kv: { "settings:provider": "cloudflare" } });
    const result = await handleGetWebhookStatus(ctx as any);
    expect(result.registered).toBe(false);
    expect(result.reason).toContain("only used by Resend");
  });
});

describe("handleRegisterWebhook", () => {
  it("replaces an existing webhook before registering a new one", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "wh_new", signing_secret: "whsec_new" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

    const ctx = makeRouteMockCtx(
      {},
      {
        method: "POST",
        url: "https://mysite.com/_emdash/api/plugins/emdash-resend/settings/webhook-register",
        kv: {
          "settings:apiKey": "re_test",
          "settings:webhookId": "wh_existing",
        },
        fetchImpl: fetchMock,
      }
    );

    const result = await handleRegisterWebhook(ctx as any);

    expect(result).toEqual({ success: true, webhookId: "wh_new" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.resend.com/webhooks/wh_existing",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.resend.com/webhooks",
      expect.objectContaining({ method: "POST" })
    );
  });
});
