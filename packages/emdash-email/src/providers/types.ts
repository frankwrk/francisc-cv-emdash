export type EmailProviderId = "resend" | "cloudflare";

export interface EmailProviderCapabilities {
  audiences: boolean;
  broadcasts: boolean;
  webhookLifecycle: boolean;
  workerProvisioning: boolean;
}

export interface EmailProviderDefinition {
  id: EmailProviderId;
  label: string;
  capabilities: EmailProviderCapabilities;
}

export const DEFAULT_PROVIDER_ID: EmailProviderId = "resend";

export const PROVIDER_KV_KEY = "settings:provider";
