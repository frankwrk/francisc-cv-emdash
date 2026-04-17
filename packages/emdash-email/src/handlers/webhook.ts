import { getSelectedProvider } from "../providers/registry.js";
import { resendHandleWebhook } from "../providers/resend.js";

export async function handleWebhook(ctx: any): Promise<{ ok: boolean; ignored?: boolean; reason?: string }> {
  const provider = await getSelectedProvider(ctx);

  if (provider === "resend") {
    return resendHandleWebhook(ctx);
  }

  // Keep public webhook route non-failing when provider is switched away from Resend.
  return {
    ok: true,
    ignored: true,
    reason: `Webhook ignored because active provider is ${provider}`,
  };
}
