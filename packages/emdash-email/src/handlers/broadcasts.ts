import { getSelectedProvider } from "../providers/registry.js";
import {
  resendCreateBroadcast,
  resendListBroadcasts,
  resendSendBroadcast,
} from "../providers/resend.js";

function unsupportedProviderMessage(provider: string): string {
  return `${provider} does not support broadcasts. Switch to Resend for this feature.`;
}

export async function handleListBroadcasts(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendListBroadcasts(ctx);
}

export async function handleCreateBroadcast(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendCreateBroadcast(ctx);
}

export async function handleSendBroadcast(ctx: any): Promise<{ success: boolean }> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendSendBroadcast(ctx);
}
