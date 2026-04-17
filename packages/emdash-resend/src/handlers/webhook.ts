import { PluginRouteError } from "emdash";
import { verifySvixSignature } from "../lib/webhook-verify.js";

interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data: {
    email_id: string;
    created_at?: string;
    subject?: string;
    to?: string[];
    open?: { timestamp?: string };
    click?: { timestamp?: string };
    bounce?: { timestamp?: string };
    [key: string]: unknown;
  };
}

function isWebhookEvent(value: unknown): value is ResendWebhookEvent {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { type?: unknown; data?: { email_id?: unknown } };
  return typeof maybe.type === "string" && !!maybe.data && typeof maybe.data.email_id === "string";
}

function asIsoString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function normalizeRecipients(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join(", ");
}

async function findDeliveryRecord(ctx: any, emailId: string): Promise<{ id: string; record: Record<string, unknown> } | null> {
  const byId = await ctx.storage.deliveries.get(emailId);
  if (byId) return { id: emailId, record: byId };

  try {
    const byResendId = await ctx.storage.deliveries.query({
      where: { resendId: emailId },
      limit: 1,
    });
    const item = byResendId?.items?.[0];
    if (item?.id && item?.data?.resendId === emailId) return { id: item.id, record: item.data };
  } catch {
    // Some stores may not support this query shape/index -- ignore and create fresh record below.
  }

  return null;
}

export async function handleWebhook(ctx: any): Promise<{ ok: boolean }> {
  const secret = await ctx.kv.get("settings:webhookSecret");
  if (!secret) {
    throw PluginRouteError.unauthorized("Webhook not configured. Re-register it in plugin settings.");
  }

  // EmDash consumes JSON bodies before plugin route handlers run (ctx.input).
  // Rebuild the signed payload from ctx.input in that case.
  let rawBody: string;
  if (ctx.input !== undefined) {
    try {
      rawBody = JSON.stringify(ctx.input);
    } catch {
      throw PluginRouteError.badRequest("Invalid webhook payload");
    }
  } else {
    rawBody = await ctx.request.text();
  }

  const valid = await verifySvixSignature(rawBody, {
    "svix-id": ctx.request.headers.get("svix-id") ?? "",
    "svix-timestamp": ctx.request.headers.get("svix-timestamp") ?? "",
    "svix-signature": ctx.request.headers.get("svix-signature") ?? "",
  }, secret);

  if (!valid) {
    throw PluginRouteError.unauthorized("Invalid webhook signature");
  }

  let event: ResendWebhookEvent | null = null;
  if (isWebhookEvent(ctx.input)) event = ctx.input;
  if (!event) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (isWebhookEvent(parsed)) event = parsed;
    } catch {
      // handled below
    }
  }
  if (!event) throw PluginRouteError.badRequest("Invalid webhook payload");

  const { type, data } = event;
  const emailId = data.email_id;

  if (!emailId) return { ok: true };

  const existingRecord = await findDeliveryRecord(ctx, emailId);
  const now = new Date().toISOString();
  const createdAt = asIsoString(data.created_at) ?? asIsoString(event.created_at) ?? now;

  const updates: Record<string, unknown> = existingRecord
    ? { ...existingRecord.record }
    : {
        resendId: emailId,
        to: normalizeRecipients(data.to),
        subject: typeof data.subject === "string" ? data.subject : "",
        status: "sent",
        createdAt,
      };

  const eventTimestamp = asIsoString(event.created_at) ?? now;

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
      updates.bouncedAt = asIsoString(data.bounce?.timestamp) ?? eventTimestamp;
      break;
    case "email.complained":
      updates.status = "complained";
      break;
    case "email.opened":
      if (!updates.openedAt) updates.openedAt = asIsoString(data.open?.timestamp) ?? eventTimestamp;
      if (updates.status === "sent") updates.status = "delivered";
      break;
    case "email.clicked":
      if (!updates.clickedAt) updates.clickedAt = asIsoString(data.click?.timestamp) ?? eventTimestamp;
      if (updates.status === "sent") updates.status = "delivered";
      break;
  }

  const storageId = existingRecord?.id ?? emailId;
  await ctx.storage.deliveries.put(storageId, updates);
  return { ok: true };
}
