import {
  cloudflareSendTestEmail,
  getCloudflareReadiness,
  getCloudflareSettings,
  getCloudflareWorkerStatus,
  provisionCloudflareWorker,
  saveCloudflareSettings,
} from "../providers/cloudflare.js";
import {
  getProviderDefinition,
  getSelectedProvider,
  isEmailProviderId,
  listProviders,
  setSelectedProvider,
} from "../providers/registry.js";
import {
  getResendSettings,
  getResendWebhookStatus,
  registerResendWebhook,
  saveResendSettings,
  sendResendTestEmail,
} from "../providers/resend.js";
import type { EmailProviderId } from "../providers/types.js";

function getProviderFromInput(value: unknown): EmailProviderId | null {
  if (!isEmailProviderId(value)) return null;
  return value;
}

function hasLegacyResendInput(input: Record<string, unknown>): boolean {
  return "apiKey" in input || "fromAddress" in input || "fromName" in input;
}

function pickLegacyResendInput(input: Record<string, unknown>): {
  apiKey?: string;
  fromAddress?: string;
  fromName?: string;
} {
  return {
    apiKey: typeof input.apiKey === "string" ? input.apiKey : undefined,
    fromAddress: typeof input.fromAddress === "string" ? input.fromAddress : undefined,
    fromName: typeof input.fromName === "string" ? input.fromName : undefined,
  };
}

export async function handleGetSettings(ctx: any): Promise<Record<string, unknown>> {
  const provider = await getSelectedProvider(ctx);

  const [resend, cloudflare, cloudflareReadiness] = await Promise.all([
    getResendSettings(ctx),
    getCloudflareSettings(ctx),
    getCloudflareReadiness(ctx),
  ]);

  const selectedProvider = getProviderDefinition(provider);

  return {
    provider,
    providers: listProviders(),
    capabilities: selectedProvider.capabilities,
    resend,
    cloudflare,
    cloudflareReadiness,

    // Legacy top-level fields kept for compatibility with old UI/tests.
    apiKey: resend.apiKey,
    fromAddress: resend.fromAddress,
    fromName: resend.fromName,
    webhookRegistered: resend.webhookRegistered,
    webhookId: resend.webhookId,
  };
}

export async function handleSaveSettings(ctx: any): Promise<{ success: boolean; provider: EmailProviderId }> {
  const input = (ctx.input ?? {}) as Record<string, unknown>;
  const currentProvider = await getSelectedProvider(ctx);
  const nextProvider = getProviderFromInput(input.provider) ?? currentProvider;

  const resendInput = (input.resend && typeof input.resend === "object")
    ? input.resend as Record<string, unknown>
    : null;

  const cloudflareInput = (input.cloudflare && typeof input.cloudflare === "object")
    ? input.cloudflare as Record<string, unknown>
    : null;

  if (resendInput) {
    await saveResendSettings(
      ctx,
      {
        apiKey: typeof resendInput.apiKey === "string" ? resendInput.apiKey : undefined,
        fromAddress: typeof resendInput.fromAddress === "string" ? resendInput.fromAddress : undefined,
        fromName: typeof resendInput.fromName === "string" ? resendInput.fromName : undefined,
      },
      { registerWebhookIfNeeded: nextProvider === "resend" }
    );
  }

  if (hasLegacyResendInput(input)) {
    await saveResendSettings(ctx, pickLegacyResendInput(input), {
      registerWebhookIfNeeded: nextProvider === "resend",
    });
  }

  if (cloudflareInput) {
    await saveCloudflareSettings(ctx, cloudflareInput);
  }

  // Flat cloudflare fields are also accepted for convenience.
  const flatCloudflareFields = [
    "apiToken",
    "accountId",
    "zoneId",
    "sendingDomain",
    "routeAddress",
    "destinationAddress",
    "workerName",
    "sendEmailBindingName",
  ] as const;

  if (flatCloudflareFields.some((key) => key in input)) {
    const flatInput: Record<string, unknown> = {};
    for (const key of flatCloudflareFields) flatInput[key] = input[key];
    if (typeof input.cloudflareFromAddress === "string") flatInput.fromAddress = input.cloudflareFromAddress;
    if (typeof input.cloudflareFromName === "string") flatInput.fromName = input.cloudflareFromName;
    await saveCloudflareSettings(ctx, flatInput);
  }

  if (nextProvider !== currentProvider) {
    await setSelectedProvider(ctx, nextProvider);
  }

  return { success: true, provider: nextProvider };
}

export async function handleTestEmail(ctx: any): Promise<{ success: boolean; provider: EmailProviderId }> {
  const input = (ctx.input ?? {}) as { provider?: unknown; to?: string };
  const currentProvider = await getSelectedProvider(ctx);
  const provider = getProviderFromInput(input.provider) ?? currentProvider;

  if (provider === "cloudflare") {
    await cloudflareSendTestEmail(ctx, { to: input.to });
    return { success: true, provider };
  }

  await sendResendTestEmail(ctx, { to: input.to });
  return { success: true, provider };
}

export async function handleGetWebhookStatus(ctx: any): Promise<{ registered: boolean; webhookId?: string; reason?: string }> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") {
    return {
      registered: false,
      reason: `Webhook registration is only used by Resend. Active provider is ${provider}.`,
    };
  }

  return getResendWebhookStatus(ctx);
}

export async function handleRegisterWebhook(ctx: any): Promise<{ success: boolean; webhookId?: string; reason?: string }> {
  const provider = await getSelectedProvider(ctx);
  if (provider !== "resend") {
    return {
      success: false,
      reason: `Webhook registration is only supported for Resend. Active provider is ${provider}.`,
    };
  }

  return registerResendWebhook(ctx);
}

export async function handleGetCloudflareReadiness(ctx: any): Promise<unknown> {
  return getCloudflareReadiness(ctx);
}

export async function handleProvisionCloudflareWorker(ctx: any): Promise<unknown> {
  const input = (ctx.input ?? {}) as {
    workerName?: string;
    routeAddress?: string;
    destinationAddress?: string;
    sendEmailBindingName?: string;
  };

  return provisionCloudflareWorker(ctx, input);
}

export async function handleGetCloudflareWorkerStatus(ctx: any): Promise<unknown> {
  return getCloudflareWorkerStatus(ctx);
}
