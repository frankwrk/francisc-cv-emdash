import { describe, it, expect, vi } from "vitest";
import { handleListBroadcasts, handleCreateBroadcast, handleSendBroadcast } from "../src/handlers/broadcasts.js";
import { makeRouteMockCtx } from "./helpers.js";

function makeCtx(input: unknown) {
  return makeRouteMockCtx(input, {
    kv: { "settings:apiKey": "re_test" },
    fetchImpl: vi.fn(),
  });
}

describe("handleListBroadcasts", () => {
  it("returns broadcasts from Resend", async () => {
    const ctx = makeCtx({});
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: "bc_1", name: "March Newsletter", status: "sent" }] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleListBroadcasts(ctx as any);
    expect(result.data[0].id).toBe("bc_1");
  });
});

describe("handleCreateBroadcast", () => {
  it("creates a broadcast draft", async () => {
    const ctx = makeCtx({
      audienceId: "aud_1",
      from: "newsletter@example.com",
      subject: "March Issue",
      html: "<h1>March</h1>",
      name: "March 2024",
    });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ id: "bc_new" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleCreateBroadcast(ctx as any);
    expect(result.id).toBe("bc_new");
  });
});

describe("handleSendBroadcast", () => {
  it("POSTs to /broadcasts/:id/send", async () => {
    const ctx = makeCtx({ broadcastId: "bc_1" });
    (ctx.http.fetch as any).mockResolvedValue(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
    );

    const result = await handleSendBroadcast(ctx as any);
    expect(result.success).toBe(true);
    expect(ctx.http.fetch as any).toHaveBeenCalledWith(
      "https://api.resend.com/broadcasts/bc_1/send",
      expect.objectContaining({ method: "POST" })
    );
  });
});
