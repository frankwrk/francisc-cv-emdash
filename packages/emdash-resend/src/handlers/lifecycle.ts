import { ResendClient } from "../lib/resend.js";

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
];

async function registerWebhook(ctx: any, apiKey: string): Promise<void> {
  const siteUrl = await ctx.kv.get<string>("settings:siteUrl");
  if (!siteUrl) return;

  const webhookUrl = `${siteUrl}/_emdash/api/plugins/emdash-resend/webhook`;
  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  const result = await client.registerWebhook(webhookUrl, WEBHOOK_EVENTS);

  await ctx.kv.set("settings:webhookId", result.id);
  await ctx.kv.set("settings:webhookSecret", result.signing_secret);
}

export async function handleInstall(_event: unknown, ctx: any): Promise<void> {
  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;
  await registerWebhook(ctx, apiKey);
}

export async function handleActivate(_event: unknown, ctx: any): Promise<void> {
  const webhookId = await ctx.kv.get<string>("settings:webhookId");
  if (webhookId) return;

  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;

  await registerWebhook(ctx, apiKey);
}

export async function handleDeactivate(_event: unknown, ctx: any): Promise<void> {
  const webhookId = await ctx.kv.get<string>("settings:webhookId");
  if (!webhookId) return;

  const apiKey = await ctx.kv.get<string>("settings:apiKey");
  if (!apiKey) return;

  const client = new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
  await client.deleteWebhook(webhookId);
  await ctx.kv.delete("settings:webhookId");
}
