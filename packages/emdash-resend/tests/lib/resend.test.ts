import { describe, it, expect, vi } from "vitest";
import { ResendClient } from "../../src/lib/resend.js";

function makeFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("ResendClient.sendEmail", () => {
  it("POSTs to /emails and returns id", async () => {
    const fetchMock = makeFetch(200, { id: "email_abc123" });
    const client = new ResendClient("re_test_key", fetchMock);

    const result = await client.sendEmail({
      from: "test@example.com",
      to: "user@example.com",
      subject: "Hello",
      text: "World",
    });

    expect(result).toEqual({ id: "email_abc123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      })
    );
  });

  it("throws with Resend error message on 4xx", async () => {
    const fetchMock = makeFetch(422, { message: "Invalid from address" });
    const client = new ResendClient("re_test_key", fetchMock);

    await expect(
      client.sendEmail({ from: "bad", to: "user@example.com", subject: "Hi", text: "." })
    ).rejects.toThrow("Invalid from address");
  });
});

describe("ResendClient.registerWebhook", () => {
  it("POSTs to /webhooks and returns id + signing_secret", async () => {
    const fetchMock = makeFetch(200, { id: "wh_123", signing_secret: "whsec_abc" });
    const client = new ResendClient("re_test_key", fetchMock);

    const result = await client.registerWebhook("https://example.com/_emdash/api/plugins/emdash-resend/webhook", [
      "email.sent",
      "email.delivered",
    ]);

    expect(result).toEqual({ id: "wh_123", signing_secret: "whsec_abc" });
  });
});

describe("ResendClient.deleteWebhook", () => {
  it("sends DELETE to /webhooks/:id", async () => {
    const fetchMock = makeFetch(200, {});
    const client = new ResendClient("re_test_key", fetchMock);

    await client.deleteWebhook("wh_123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/webhooks/wh_123",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
