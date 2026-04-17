import { describe, it, expect } from "vitest";
import { verifySvixSignature } from "../../src/lib/webhook-verify.js";

async function sign(secret: string, svixId: string, svixTimestamp: string, rawBody: string): Promise<string> {
  const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

const RAW_SECRET = btoa("supersecretbytes_at_least_32_chars!!");
const SVIX_SECRET = `whsec_${RAW_SECRET}`;

describe("verifySvixSignature", () => {
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "test_123" } });
  const svixId = "msg_01j8xyz";
  const nowSeconds = Math.floor(Date.now() / 1000).toString();

  it("returns true for a valid signature", async () => {
    const sig = await sign(SVIX_SECRET, svixId, nowSeconds, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": sig,
    }, SVIX_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for a wrong signature", async () => {
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": "v1,invalidsignature==",
    }, SVIX_SECRET);
    expect(result).toBe(false);
  });

  it("returns false if timestamp is older than 5 minutes", async () => {
    const oldTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString();
    const sig = await sign(SVIX_SECRET, svixId, oldTimestamp, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": oldTimestamp,
      "svix-signature": sig,
    }, SVIX_SECRET);
    expect(result).toBe(false);
  });

  it("accepts any valid sig from space-separated list", async () => {
    const sig1 = await sign(SVIX_SECRET, svixId, nowSeconds, body);
    const result = await verifySvixSignature(body, {
      "svix-id": svixId,
      "svix-timestamp": nowSeconds,
      "svix-signature": `v1,invalidsig== ${sig1}`,
    }, SVIX_SECRET);
    expect(result).toBe(true);
  });
});
