import { describe, it, expect, vi } from "vitest";
import { handleGetDeliveries, handleGetDeliveryStats } from "../src/handlers/deliveries.js";
import { makeRouteMockCtx } from "./helpers.js";

const SAMPLE_DELIVERIES = {
  "email_1": { resendId: "email_1", to: "a@a.com", subject: "S1", status: "delivered", createdAt: "2024-01-01T00:00:00Z" },
  "email_2": { resendId: "email_2", to: "b@b.com", subject: "S2", status: "bounced", createdAt: "2024-01-02T00:00:00Z" },
  "email_3": { resendId: "email_3", to: "c@c.com", subject: "S3", status: "sent", createdAt: "2024-01-03T00:00:00Z" },
};

describe("handleGetDeliveries", () => {
  it("returns paginated delivery records", async () => {
    const ctx = makeRouteMockCtx(null, {
      url: "https://example.com/_emdash/api/plugins/emdash-resend/deliveries?limit=10",
    });
    ctx.storage.deliveries.query = vi.fn().mockResolvedValue({
      items: Object.entries(SAMPLE_DELIVERIES).map(([id, data]) => ({ id, data })),
      cursor: undefined,
      hasMore: false,
    });

    const result = await handleGetDeliveries(ctx as any);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(ctx.storage.deliveries.query).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it("passes status filter to query", async () => {
    const ctx = makeRouteMockCtx(null, {
      url: "https://example.com/_emdash/api/plugins/emdash-resend/deliveries?status=bounced",
    });
    ctx.storage.deliveries.query = vi.fn().mockResolvedValue({ items: [], cursor: undefined, hasMore: false });

    await handleGetDeliveries(ctx as any);

    expect(ctx.storage.deliveries.query).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "bounced" } })
    );
  });
});

describe("handleGetDeliveryStats", () => {
  it("returns sent/delivery-rate/bounce-rate counts", async () => {
    const ctx = makeRouteMockCtx({});
    ctx.storage.deliveries.count = vi.fn()
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(85)
      .mockResolvedValueOnce(5);

    const result = await handleGetDeliveryStats(ctx as any);

    expect(result.totalSent).toBe(100);
    expect(result.deliveryRate).toBe(85);
    expect(result.bounceRate).toBe(5);
  });
});
