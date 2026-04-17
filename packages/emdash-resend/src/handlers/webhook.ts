import { verifySvixSignature } from "../lib/webhook-verify.js";

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id: string;
    [key: string]: unknown;
  };
}

export async function handleWebhook(ctx: any): Promise<{ ok: boolean }> {
  const secret = await ctx.kv.get<string>("settings:webhookSecret");
  if (!secret) {
    throw new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await ctx.request.text();

  const valid = await verifySvixSignature(rawBody, {
    "svix-id": ctx.request.headers.get("svix-id") ?? "",
    "svix-timestamp": ctx.request.headers.get("svix-timestamp") ?? "",
    "svix-signature": ctx.request.headers.get("svix-signature") ?? "",
  }, secret);

  if (!valid) {
    throw new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = JSON.parse(rawBody) as ResendWebhookEvent;
  const { type, data } = event;
  const emailId = data.email_id;

  if (!emailId) return { ok: true };

  const existing = await ctx.storage.deliveries.get(emailId);
  if (!existing) return { ok: true };

  const updates: Record<string, unknown> = { ...existing };

  switch (type) {
    case "email.sent":
      break;
    case "email.delivered":
      updates.status = "delivered";
      break;
    case "email.delivery_delayed":
      updates.status = "delayed";
      break;
    case "email.bounced":
      updates.status = "bounced";
      updates.bouncedAt = new Date().toISOString();
      break;
    case "email.complained":
      updates.status = "complained";
      break;
    case "email.opened":
      if (!existing.openedAt) updates.openedAt = new Date().toISOString();
      break;
    case "email.clicked":
      if (!existing.clickedAt) updates.clickedAt = new Date().toISOString();
      break;
  }

  await ctx.storage.deliveries.put(emailId, updates);
  return { ok: true };
}
