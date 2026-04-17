import { PluginRouteError } from "emdash";
import { getWebhookUrl } from "../lib/plugin-config.js";
import { ResendClient } from "../lib/resend.js";
import { verifySvixSignature } from "../lib/webhook-verify.js";

interface EmailMessage {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Array<{ filename: string; content: string; type?: string; disposition?: string }>;
  tags?: Array<{ name: string; value: string }>;
}

interface DeliverEvent {
  message: EmailMessage;
  source: string;
}

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

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
];

function maskApiKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
}

async function getResendApiKey(ctx: any): Promise<string | null> {
  const scoped = await ctx.kv.get("settings:resend:apiKey") as string | null;
  if (scoped) return scoped;
  const legacy = await ctx.kv.get("settings:apiKey") as string | null;
  return legacy ?? null;
}

async function getResendFromAddress(ctx: any): Promise<string | null> {
  const scoped = await ctx.kv.get("settings:resend:fromAddress") as string | null;
  if (scoped) return scoped;
  const legacy = await ctx.kv.get("settings:fromAddress") as string | null;
  return legacy ?? null;
}

async function getResendFromName(ctx: any): Promise<string | null> {
  const scoped = await ctx.kv.get("settings:resend:fromName") as string | null;
  if (scoped !== null && scoped !== undefined) return scoped;
  const legacy = await ctx.kv.get("settings:fromName") as string | null;
  return legacy ?? null;
}

async function getWebhookRegistrationState(ctx: any): Promise<{
  webhookId: string | null;
  webhookSecret: string | null;
  webhookRegistered: boolean;
}> {
  const [webhookId, webhookSecret] = await Promise.all([
    ctx.kv.get("settings:resend:webhookId") as Promise<string | null>,
    ctx.kv.get("settings:resend:webhookSecret") as Promise<string | null>,
  ]);

  const resolvedWebhookId = webhookId ?? await ctx.kv.get("settings:webhookId") as string | null;
  const resolvedWebhookSecret = webhookSecret ?? await ctx.kv.get("settings:webhookSecret") as string | null;

  return {
    webhookId: resolvedWebhookId ?? null,
    webhookSecret: resolvedWebhookSecret ?? null,
    webhookRegistered: Boolean(resolvedWebhookId && resolvedWebhookSecret),
  };
}

async function setWebhookRegistrationState(ctx: any, webhookId: string, webhookSecret: string): Promise<void> {
  await Promise.all([
    ctx.kv.set("settings:resend:webhookId", webhookId),
    ctx.kv.set("settings:resend:webhookSecret", webhookSecret),
    ctx.kv.set("settings:webhookId", webhookId),
    ctx.kv.set("settings:webhookSecret", webhookSecret),
  ]);
}

async function clearWebhookRegistrationState(ctx: any): Promise<void> {
  await Promise.all([
    ctx.kv.delete("settings:resend:webhookId"),
    ctx.kv.delete("settings:resend:webhookSecret"),
    ctx.kv.delete("settings:webhookId"),
    ctx.kv.delete("settings:webhookSecret"),
  ]);
}

async function getResendClient(ctx: any): Promise<ResendClient> {
  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) throw new Error("Resend API key not configured");
  return new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
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
    const byProviderMessageId = await ctx.storage.deliveries.query({
      where: { providerMessageId: emailId },
      limit: 1,
    });
    const byProviderMessageIdItem = byProviderMessageId?.items?.[0];
    if (byProviderMessageIdItem?.id && byProviderMessageIdItem?.data?.providerMessageId === emailId) {
      return { id: byProviderMessageIdItem.id, record: byProviderMessageIdItem.data };
    }
  } catch {
    // Some storage engines may not support ad-hoc indexed queries.
  }

  try {
    const byResendId = await ctx.storage.deliveries.query({
      where: { resendId: emailId },
      limit: 1,
    });
    const byResendItem = byResendId?.items?.[0];
    if (byResendItem?.id && byResendItem?.data?.resendId === emailId) {
      return { id: byResendItem.id, record: byResendItem.data };
    }
  } catch {
    // Some stores may not support this query shape/index.
  }

  return null;
}

export async function getResendSettings(ctx: any): Promise<Record<string, unknown>> {
  const [apiKey, fromAddress, fromName, { webhookId, webhookRegistered }] = await Promise.all([
    getResendApiKey(ctx),
    getResendFromAddress(ctx),
    getResendFromName(ctx),
    getWebhookRegistrationState(ctx),
  ]);

  return {
    apiKey: apiKey ? maskApiKey(apiKey) : null,
    fromAddress: fromAddress ?? null,
    fromName: fromName ?? null,
    webhookRegistered,
    webhookId: webhookId ?? null,
  };
}

export async function saveResendSettings(
  ctx: any,
  input: { apiKey?: string; fromAddress?: string; fromName?: string },
  options: { registerWebhookIfNeeded: boolean }
): Promise<void> {
  const writes: Array<Promise<void>> = [];

  if (input.apiKey !== undefined) {
    writes.push(ctx.kv.set("settings:resend:apiKey", input.apiKey));
    writes.push(ctx.kv.set("settings:apiKey", input.apiKey));
  }
  if (input.fromAddress !== undefined) {
    writes.push(ctx.kv.set("settings:resend:fromAddress", input.fromAddress));
    writes.push(ctx.kv.set("settings:fromAddress", input.fromAddress));
  }
  if (input.fromName !== undefined) {
    writes.push(ctx.kv.set("settings:resend:fromName", input.fromName));
    writes.push(ctx.kv.set("settings:fromName", input.fromName));
  }

  if (writes.length > 0) await Promise.all(writes);

  const origin = new URL(ctx.request.url).origin;
  await ctx.kv.set("settings:siteUrl", origin);

  if (!options.registerWebhookIfNeeded) return;

  const [resolvedApiKey, webhookState] = await Promise.all([
    getResendApiKey(ctx),
    getWebhookRegistrationState(ctx),
  ]);

  if (resolvedApiKey && !webhookState.webhookRegistered) {
    try {
      const client = new ResendClient(resolvedApiKey, ctx.http.fetch.bind(ctx.http));
      const result = await client.registerWebhook(getWebhookUrl(origin), WEBHOOK_EVENTS);
      await setWebhookRegistrationState(ctx, result.id, result.signing_secret);
    } catch (error) {
      ctx.log?.warn?.("Failed to auto-register Resend webhook", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function sendResendTestEmail(
  ctx: any,
  input: { to?: string }
): Promise<{ success: boolean }> {
  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) throw new Error("Resend API key not configured");

  const fromAddress = await getResendFromAddress(ctx);
  const fromName = await getResendFromName(ctx);
  if (!fromAddress) throw new Error("Resend from address not configured");

  const requested = input.to?.trim();
  const to = requested
    || (ctx.users ? await ctx.users.getCurrent?.()?.then((user: any) => user?.email) : null)
    || fromAddress;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.sendEmail({
    from,
    to,
    subject: "EmDash Email Providers plugin — Resend test email",
    text: "If you received this, Resend is configured correctly in the Email Providers plugin.",
    html: "<p>If you received this, Resend is configured correctly in the Email Providers plugin.</p>",
  });

  return { success: true };
}

export async function getResendWebhookStatus(ctx: any): Promise<{ registered: boolean; webhookId?: string }> {
  const { webhookId, webhookRegistered } = await getWebhookRegistrationState(ctx);
  return webhookRegistered && webhookId
    ? { registered: true, webhookId }
    : { registered: false };
}

export async function registerResendWebhook(ctx: any): Promise<{ success: boolean; webhookId: string }> {
  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) throw new Error("Resend API key not configured");

  const { webhookId: existingWebhookId } = await getWebhookRegistrationState(ctx);
  const origin = new URL(ctx.request.url).origin;
  const webhookUrl = getWebhookUrl(origin);
  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));

  if (existingWebhookId) {
    try {
      await client.deleteWebhook(existingWebhookId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const notFound = /404|not found/i.test(message);
      if (!notFound) {
        throw new Error(`Failed to replace existing webhook (${existingWebhookId}): ${message}`);
      }
      ctx.log?.warn?.("Existing Resend webhook was not found during replacement", {
        webhookId: existingWebhookId,
      });
    }
  }

  const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);
  await setWebhookRegistrationState(ctx, result.id, result.signing_secret);
  await ctx.kv.set("settings:siteUrl", origin);

  return { success: true, webhookId: result.id };
}

export async function resendSendEmail(event: DeliverEvent, ctx: any): Promise<void> {
  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) {
    throw new Error("Email Providers plugin: Resend API key not configured. Configure it under Settings > Resend.");
  }

  const fromAddress = await getResendFromAddress(ctx);
  const fromName = await getResendFromName(ctx);

  let from = event.message.from;
  if (!from) {
    if (!fromAddress) {
      throw new Error("Email Providers plugin: No Resend from address configured. Set it under Settings > Resend.");
    }
    from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  }

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));

  const params: Record<string, unknown> = {
    from,
    to: event.message.to,
    subject: event.message.subject,
  };
  if (event.message.html) params.html = event.message.html;
  if (event.message.text) params.text = event.message.text;
  if (event.message.cc) params.cc = event.message.cc;
  if (event.message.bcc) params.bcc = event.message.bcc;
  if (event.message.replyTo) params.reply_to = event.message.replyTo;
  if (event.message.attachments) params.attachments = event.message.attachments;
  if (event.message.tags) params.tags = event.message.tags;

  const result = await client.sendEmail(params as any);
  const to = Array.isArray(event.message.to) ? event.message.to.join(", ") : event.message.to;

  try {
    await ctx.storage.deliveries.put(result.id, {
      provider: "resend",
      providerMessageId: result.id,
      resendId: result.id,
      to,
      subject: event.message.subject,
      status: "sent",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // The provider accepted the message. Failing here would cause retries and duplicate sends.
    ctx.log?.warn?.("Email Providers plugin: failed to persist Resend delivery record after send", {
      providerMessageId: result.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function resendHandleInstall(_event: unknown, ctx: any): Promise<void> {
  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) return;

  const siteUrl = await ctx.kv.get("settings:siteUrl");
  if (!siteUrl) return;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  const result = await client.registerWebhook(getWebhookUrl(siteUrl), WEBHOOK_EVENTS);
  await setWebhookRegistrationState(ctx, result.id, result.signing_secret);
}

export async function resendHandleActivate(_event: unknown, ctx: any): Promise<void> {
  const { webhookRegistered } = await getWebhookRegistrationState(ctx);
  if (webhookRegistered) return;

  const apiKey = await getResendApiKey(ctx);
  if (!apiKey) return;

  const siteUrl = await ctx.kv.get("settings:siteUrl");
  if (!siteUrl) return;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  const result = await client.registerWebhook(getWebhookUrl(siteUrl), WEBHOOK_EVENTS);
  await setWebhookRegistrationState(ctx, result.id, result.signing_secret);
}

export async function resendHandleDeactivate(_event: unknown, ctx: any): Promise<void> {
  const [{ webhookId }, apiKey] = await Promise.all([
    getWebhookRegistrationState(ctx),
    getResendApiKey(ctx),
  ]);

  if (!webhookId || !apiKey) return;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.deleteWebhook(webhookId);
  await clearWebhookRegistrationState(ctx);
}

export async function resendListAudiences(ctx: any): Promise<unknown> {
  const client = await getResendClient(ctx);
  return client.listAudiences();
}

export async function resendCreateAudience(ctx: any): Promise<unknown> {
  const { name } = ctx.input as { name: string };
  if (!name) throw new Error("Audience name is required");
  const client = await getResendClient(ctx);
  return client.createAudience(name);
}

export async function resendListContacts(ctx: any): Promise<unknown> {
  const audienceId = new URL(ctx.request.url).searchParams.get("audienceId");
  if (!audienceId) throw new Error("audienceId is required");
  const client = await getResendClient(ctx);
  return client.listContacts(audienceId);
}

export async function resendAddContact(ctx: any): Promise<unknown> {
  const { audienceId, email, firstName, lastName } = ctx.input as {
    audienceId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  if (!audienceId || !email) throw new Error("audienceId and email are required");

  const client = await getResendClient(ctx);
  return client.createContact(audienceId, {
    email,
    first_name: firstName,
    last_name: lastName,
  });
}

export async function resendUnsubscribeContact(ctx: any): Promise<{ success: boolean }> {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");

  const client = await getResendClient(ctx);
  await client.updateContact(audienceId, contactId, { unsubscribed: true });
  return { success: true };
}

export async function resendDeleteContact(ctx: any): Promise<{ success: boolean }> {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");

  const client = await getResendClient(ctx);
  await client.deleteContact(audienceId, contactId);
  return { success: true };
}

export async function resendListBroadcasts(ctx: any): Promise<unknown> {
  const client = await getResendClient(ctx);
  return client.listBroadcasts();
}

export async function resendCreateBroadcast(ctx: any): Promise<unknown> {
  const { audienceId, from, subject, html, text, name } = ctx.input as {
    audienceId: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
    name?: string;
  };

  if (!audienceId || !from || !subject) {
    throw new Error("audienceId, from, and subject are required");
  }

  const client = await getResendClient(ctx);
  return client.createBroadcast({ audience_id: audienceId, from, subject, html, text, name });
}

export async function resendSendBroadcast(ctx: any): Promise<{ success: boolean }> {
  const { broadcastId } = ctx.input as { broadcastId: string };
  if (!broadcastId) throw new Error("broadcastId is required");

  const client = await getResendClient(ctx);
  await client.sendBroadcast(broadcastId);
  return { success: true };
}

export async function resendHandleWebhook(ctx: any): Promise<{ ok: boolean }> {
  const { webhookSecret } = await getWebhookRegistrationState(ctx);
  if (!webhookSecret) {
    throw PluginRouteError.unauthorized("Resend webhook not configured. Re-register it in plugin settings.");
  }

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

  const valid = await verifySvixSignature(
    rawBody,
    {
      "svix-id": ctx.request.headers.get("svix-id") ?? "",
      "svix-timestamp": ctx.request.headers.get("svix-timestamp") ?? "",
      "svix-signature": ctx.request.headers.get("svix-signature") ?? "",
    },
    webhookSecret
  );

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
      // Handled below.
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
        provider: "resend",
        providerMessageId: emailId,
        resendId: emailId,
        to: normalizeRecipients(data.to),
        subject: typeof data.subject === "string" ? data.subject : "",
        status: "sent",
        createdAt,
      };

  updates.provider = "resend";
  updates.providerMessageId = emailId;
  if (!updates.resendId) updates.resendId = emailId;

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
