import { getSelectedProvider } from "../providers/registry.js";
import { cloudflareSendEmail } from "../providers/cloudflare.js";
import { resendSendEmail } from "../providers/resend.js";

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
  const provider = await getSelectedProvider(ctx);

  if (provider === "cloudflare") {
    await cloudflareSendEmail(event, ctx);
    return;
  }

  await resendSendEmail(event, ctx);
}
