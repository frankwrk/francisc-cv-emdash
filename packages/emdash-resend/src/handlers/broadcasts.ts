import { ResendClient } from "../lib/resend.js";

async function getClient(ctx: any): Promise<ResendClient> {
  const apiKey = await ctx.kv.get("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");
  return new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
}

export async function handleListBroadcasts(ctx: any) {
  const client = await getClient(ctx);
  return client.listBroadcasts();
}

export async function handleCreateBroadcast(ctx: any) {
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

  const client = await getClient(ctx);
  return client.createBroadcast({ audience_id: audienceId, from, subject, html, text, name });
}

export async function handleSendBroadcast(ctx: any) {
  const { broadcastId } = ctx.input as { broadcastId: string };
  if (!broadcastId) throw new Error("broadcastId is required");

  const client = await getClient(ctx);
  await client.sendBroadcast(broadcastId);
  return { success: true };
}
