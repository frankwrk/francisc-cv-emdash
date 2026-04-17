import { describe, expect, it, vi } from "vitest";
import { CloudflareEmailClient } from "../../src/lib/cloudflare.js";

describe("CloudflareEmailClient", () => {
  it("sends email through Cloudflare Email Service endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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
    );

    const client = new CloudflareEmailClient("cf_test_token", fetchMock as any);
    const result = await client.sendEmail("acc_1", {
      to: "user@example.com",
      from: "noreply@example.com",
      subject: "Hello",
      text: "world",
    });

    expect(result.delivered).toEqual(["user@example.com"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/acc_1/email/sending/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
      })
    );
  });

  it("surfaces Cloudflare API errors with normalized message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          errors: [{ message: "invalid token" }],
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );

    const client = new CloudflareEmailClient("bad_token", fetchMock as any);

    await expect(
      client.sendEmail("acc_1", {
        to: "user@example.com",
        from: "noreply@example.com",
        subject: "Hello",
        text: "world",
      })
    ).rejects.toThrow("invalid token");
  });

  it("uses X-Auth headers when auth email is provided (Global API key mode)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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
    );

    const client = new CloudflareEmailClient("global_api_key_value", fetchMock as any, {
      apiEmail: "owner@example.com",
    });

    await client.sendEmail("acc_1", {
      to: "user@example.com",
      from: "noreply@example.com",
      subject: "Hello",
      text: "world",
    });

    const requestInit = (fetchMock.mock.calls[0] as any[])[1] as RequestInit;
    const headers = new Headers(requestInit.headers);
    expect(headers.get("X-Auth-Email")).toBe("owner@example.com");
    expect(headers.get("X-Auth-Key")).toBe("global_api_key_value");
    expect(headers.get("Authorization")).toBeNull();
  });
});
