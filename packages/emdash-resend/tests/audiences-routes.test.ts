import { describe, it, expect, vi } from "vitest";
import {
  handleListAudiences,
  handleListContacts,
  handleAddContact,
} from "../src/handlers/audiences.js";
import { makeRouteMockCtx } from "./helpers.js";

function makeCtx(input: unknown, kv: Record<string, unknown> = {}) {
  return makeRouteMockCtx(input, {
    kv: { "settings:apiKey": "re_test", ...kv },
    fetchImpl: vi.fn(),
  });
}

describe("handleListAudiences", () => {
  it("fetches audiences from Resend", async () => {
    const ctx = makeCtx({});
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "aud_1", name: "Newsletter", created_at: "2024-01-01" }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListAudiences(ctx as any);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe("aud_1");
  });
});

describe("handleListContacts", () => {
  it("fetches contacts for audience", async () => {
    const ctx = makeRouteMockCtx(null, {
      url: "https://example.com/_emdash/api/plugins/emdash-resend/audiences/contacts?audienceId=aud_1",
      kv: { "settings:apiKey": "re_test" },
      fetchImpl: vi.fn(),
    });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "c_1", email: "user@example.com", unsubscribed: false }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListContacts(ctx as any);
    expect(result.data).toHaveLength(1);
    expect((ctx.http.fetch as any)).toHaveBeenCalledWith(
      expect.stringContaining("/audiences/aud_1/contacts"),
      expect.any(Object)
    );
  });
});

describe("handleAddContact", () => {
  it("creates a contact in the specified audience", async () => {
    const ctx = makeCtx({ audienceId: "aud_1", email: "new@example.com", firstName: "Jane" });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ id: "c_new" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleAddContact(ctx as any);
    expect(result.id).toBe("c_new");
  });
});
