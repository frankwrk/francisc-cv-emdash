import { describe, expect, it, vi } from "vitest";
import { getCloudflareWorkerStatus } from "../src/providers/cloudflare.js";
import { makeMockCtx } from "./helpers.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("getCloudflareWorkerStatus", () => {
  it("treats missing worker as not-provisioned state instead of hard error", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("/accounts/acc_1/workers/scripts/email-worker")) {
        return jsonResponse(
          {
            success: false,
            errors: [{ message: "This Worker does not exist on your account." }],
          },
          404
        );
      }

      if (url.includes("/zones/zone_1/email/routing/rules")) {
        return jsonResponse({ success: true, result: [] });
      }

      throw new Error(`Unhandled request URL: ${url}`);
    });

    const ctx = makeMockCtx({
      kv: {
        "settings:cloudflare:apiToken": "cf_token",
        "settings:cloudflare:accountId": "acc_1",
        "settings:cloudflare:zoneId": "zone_1",
        "settings:cloudflare:workerName": "email-worker",
        "settings:cloudflare:routeAddress": "support@example.com",
      },
      fetchImpl: fetchMock,
    });

    const status = await getCloudflareWorkerStatus(ctx as any);

    expect(status).toMatchObject({
      configured: false,
      workerExists: false,
      workerError: null,
    });
    expect(status.reason).toContain("Worker script not found yet");
  });

  it("matches routing rules when Cloudflare returns scoped worker targets", async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);

      if (url.includes("/accounts/acc_1/workers/scripts/email-worker")) {
        return jsonResponse({ success: true, result: { id: "email-worker" } });
      }

      if (url.includes("/zones/zone_1/email/routing/rules")) {
        return jsonResponse({
          success: true,
          result: [
            {
              id: "rule_1",
              matchers: [{ type: "literal", field: "to", value: "support@example.com" }],
              actions: [{ type: "worker", value: ["acc_1/email-worker"] }],
            },
          ],
        });
      }

      throw new Error(`Unhandled request URL: ${url}`);
    });

    const ctx = makeMockCtx({
      kv: {
        "settings:cloudflare:apiToken": "cf_token",
        "settings:cloudflare:accountId": "acc_1",
        "settings:cloudflare:zoneId": "zone_1",
        "settings:cloudflare:workerName": "email-worker",
        "settings:cloudflare:routeAddress": "support@example.com",
      },
      fetchImpl: fetchMock,
    });

    const status = await getCloudflareWorkerStatus(ctx as any);

    expect(status).toMatchObject({
      configured: true,
      workerExists: true,
      routeMatched: true,
      routeRuleId: "rule_1",
    });
  });
});
