import { ResendClient } from "../lib/resend.js";

interface EmailMessage {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}

interface DeliverEvent {
  message: EmailMessage;
  source: string;
}

export async function handleEmailDeliver(event: DeliverEvent, ctx: any): Promise<void> {
  const apiKey = await ctx.kv.get("settings:apiKey");
  if (!apiKey) throw new Error("Resend plugin: API key not configured. Add it in the Resend plugin settings.");

  const fromAddress = await ctx.kv.get("settings:fromAddress");
  const fromName = await ctx.kv.get("settings:fromName");

  let from = event.message.from;
  if (!from) {
    if (!fromAddress) {
      throw new Error("Resend plugin: No from address configured. Set a default sender in Settings > Resend > Settings.");
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
      resendId: result.id,
      to,
      subject: event.message.subject,
      status: "sent",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // The provider accepted the message. Failing here would cause retries and duplicate sends.
    ctx.log?.warn?.("Resend plugin: failed to persist delivery record after send", {
      resendId: result.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
