import { getSelectedProvider } from "../providers/registry.js";
import {
  resendAddContact,
  resendCreateAudience,
  resendDeleteContact,
  resendListAudiences,
  resendListContacts,
  resendUnsubscribeContact,
} from "../providers/resend.js";

function unsupportedProviderMessage(provider: string): string {
  return `${provider} does not support audiences/contacts. Switch to Resend for this feature.`;
}

export async function handleListAudiences(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendListAudiences(ctx);
}

export async function handleCreateAudience(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendCreateAudience(ctx);
}

export async function handleListContacts(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendListContacts(ctx);
}

export async function handleAddContact(ctx: any): Promise<unknown> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendAddContact(ctx);
}

export async function handleUnsubscribeContact(ctx: any): Promise<{ success: boolean }> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendUnsubscribeContact(ctx);
}

export async function handleDeleteContact(ctx: any): Promise<{ success: boolean }> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") throw new Error(unsupportedProviderMessage(provider));
  return resendDeleteContact(ctx);
}
