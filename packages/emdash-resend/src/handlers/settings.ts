import { ResendClient } from "../lib/resend.js";

const WEBHOOK_EVENTS = [
  "email.sent", "email.delivered", "email.delivery_delayed",
  "email.complained", "email.bounced", "email.opened", "email.clicked",
];

function maskApiKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  return key.slice(0, 4) + "•".repeat(Math.max(0, key.length - 8)) + key.slice(-4);
}

async function getWebhookRegistrationState(ctx: any): Promise<{
  webhookId: string | null;
  webhookSecret: string | null;
  webhookRegistered: boolean;
}> {
  const [webhookId, webhookSecret] = await Promise.all([
    ctx.kv.get<string>("settings:webhookId"),
    ctx.kv.get<string>("settings:webhookSecret"),
  ]);

  return {
    webhookId: webhookId ?? null,
    webhookSecret: webhookSecret ?? null,
    webhookRegistered: Boolean(webhookId && webhookSecret),
  };
}

export async function handleGetSettings(ctx: any): Promise<Record<string, unknown>> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  const fromAddress = await ctx.kv.get<string>("settings:fromAddress");
  const fromName = await ctx.kv.get<string>("settings:fromName");
  const { webhookId, webhookRegistered } = await getWebhookRegistrationState(ctx);

  return {
    apiKey: apiKey ? maskApiKey(apiKey) : null,
    fromAddress: fromAddress ?? null,
    fromName: fromName ?? null,
    webhookRegistered,
    webhookId: webhookId ?? null,
  };
}

export async function handleSaveSettings(ctx: any): Promise<{ success: boolean }> {
  const { apiKey, fromAddress, fromName } = ctx.input as {
    apiKey?: string;
    fromAddress?: string;
    fromName?: string;
  };

  if (apiKey !== undefined) await ctx.kv.set("settings:apiKey", apiKey);
  if (fromAddress !== undefined) await ctx.kv.set("settings:fromAddress", fromAddress);
  if (fromName !== undefined) await ctx.kv.set("settings:fromName", fromName);

  const origin = new URL(ctx.request.url).origin;
  await ctx.kv.set("settings:siteUrl", origin);

  const resolvedApiKey = apiKey ?? await ctx.kv.get<string>("settings:apiKey");
  const { webhookId, webhookSecret } = await getWebhookRegistrationState(ctx);

  if (resolvedApiKey && (!webhookId || !webhookSecret)) {
    try {
      const webhookUrl = `${origin}/_emdash/api/plugins/emdash-resend/webhook`;
      const client = new ResendClient(resolvedApiKey, ctx.http.fetch.bind(ctx.http));
      const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);
      await ctx.kv.set("settings:webhookId", result.id);
      await ctx.kv.set("settings:webhookSecret", result.signing_secret);
    } catch (err) {
      ctx.log?.warn?.("Failed to auto-register webhook", err);
    }
  }

  return { success: true };
}

export async function handleTestEmail(ctx: any): Promise<{ success: boolean; error?: string }> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");

  const fromAddress = await ctx.kv.get<string>("settings:fromAddress");
  const fromName = await ctx.kv.get<string>("settings:fromName");

  if (!fromAddress) throw new Error("From address not configured");

  const requested = (ctx.input as { to?: string } | undefined)?.to?.trim();
  const to = requested
    || (ctx.users ? await ctx.users.getCurrent?.()?.then((u: any) => u?.email) : null)
    || fromAddress;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.sendEmail({
    from,
    to,
    subject: "EmDash Resend plugin — test email",
    text: "If you received this, the Resend plugin is configured correctly.",
    html: "<p>If you received this, the Resend plugin is configured correctly.</p>",
  });

  return { success: true };
}

export async function handleGetWebhookStatus(ctx: any): Promise<{ registered: boolean; webhookId?: string }> {
  const { webhookId, webhookRegistered } = await getWebhookRegistrationState(ctx);
  return webhookRegistered && webhookId
    ? { registered: true, webhookId }
    : { registered: false };
}

export async function handleRegisterWebhook(ctx: any): Promise<{ success: boolean; webhookId: string }> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");

  const existingWebhookId = await ctx.kv.get<string>("settings:webhookId");
  const origin = new URL(ctx.request.url).origin;
  const webhookUrl = `${origin}/_emdash/api/plugins/emdash-resend/webhook`;
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
      ctx.log?.warn?.("Existing webhook was not found during replacement", {
        webhookId: existingWebhookId,
      });
    }
  }

  const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);

  await ctx.kv.set("settings:webhookId", result.id);
  await ctx.kv.set("settings:webhookSecret", result.signing_secret);
  await ctx.kv.set("settings:siteUrl", origin);

  return { success: true, webhookId: result.id };
}
