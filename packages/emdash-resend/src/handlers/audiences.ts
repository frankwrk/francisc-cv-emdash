import { ResendClient } from "../lib/resend.js";

async function getClient(ctx: any): Promise<ResendClient> {
  const apiKey = await ctx.kv.get("settings:apiKey");
  if (!apiKey) throw new Error("API key not configured");
  return new ResendClient(apiKey, ctx.http.fetch.bind(ctx.http));
}

export async function handleListAudiences(ctx: any) {
  const client = await getClient(ctx);
  return client.listAudiences();
}

export async function handleCreateAudience(ctx: any) {
  const { name } = ctx.input as { name: string };
  if (!name) throw new Error("Audience name is required");
  const client = await getClient(ctx);
  return client.createAudience(name);
}

export async function handleListContacts(ctx: any) {
  const audienceId = new URL(ctx.request.url).searchParams.get("audienceId");
  if (!audienceId) throw new Error("audienceId is required");
  const client = await getClient(ctx);
  return client.listContacts(audienceId);
}

export async function handleAddContact(ctx: any) {
  const { audienceId, email, firstName, lastName } = ctx.input as {
    audienceId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  if (!audienceId || !email) throw new Error("audienceId and email are required");
  const client = await getClient(ctx);
  return client.createContact(audienceId, {
    email,
    first_name: firstName,
    last_name: lastName,
  });
}

export async function handleUnsubscribeContact(ctx: any) {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");
  const client = await getClient(ctx);
  await client.updateContact(audienceId, contactId, { unsubscribed: true });
  return { success: true };
}

export async function handleDeleteContact(ctx: any) {
  const { audienceId, contactId } = ctx.input as { audienceId: string; contactId: string };
  if (!audienceId || !contactId) throw new Error("audienceId and contactId are required");
  const client = await getClient(ctx);
  await client.deleteContact(audienceId, contactId);
  return { success: true };
}
