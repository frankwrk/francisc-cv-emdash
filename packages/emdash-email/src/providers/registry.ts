import {
  DEFAULT_PROVIDER_ID,
  PROVIDER_KV_KEY,
  type EmailProviderDefinition,
  type EmailProviderId,
} from "./types.js";

export const PROVIDERS: Record<EmailProviderId, EmailProviderDefinition> = {
  resend: {
    id: "resend",
    label: "Resend",
    capabilities: {
      audiences: true,
      broadcasts: true,
      webhookLifecycle: true,
      workerProvisioning: false,
    },
  },
  cloudflare: {
    id: "cloudflare",
    label: "Cloudflare Email Service",
    capabilities: {
      audiences: false,
      broadcasts: false,
      webhookLifecycle: false,
      workerProvisioning: true,
    },
  },
};

export function listProviders(): EmailProviderDefinition[] {
  return Object.values(PROVIDERS);
}

export function getProviderDefinition(provider: EmailProviderId): EmailProviderDefinition {
  return PROVIDERS[provider];
}

export function isEmailProviderId(value: unknown): value is EmailProviderId {
  return value === "resend" || value === "cloudflare";
}

export async function getSelectedProvider(ctx: any): Promise<EmailProviderId> {
  const stored = await ctx.kv.get(PROVIDER_KV_KEY) as EmailProviderId | null;
  if (isEmailProviderId(stored)) return stored;
  return DEFAULT_PROVIDER_ID;
}

export async function setSelectedProvider(ctx: any, provider: EmailProviderId): Promise<void> {
  await ctx.kv.set(PROVIDER_KV_KEY, provider);
}

export async function requireProviderSupport(
  ctx: any,
  capability: keyof EmailProviderDefinition["capabilities"]
): Promise<EmailProviderId> {
  const selected = await getSelectedProvider(ctx);
  const definition = getProviderDefinition(selected);
  if (definition.capabilities[capability]) return selected;

  throw new Error(`${definition.label} does not support ${capability}. Switch provider in Email Provider settings.`);
}
