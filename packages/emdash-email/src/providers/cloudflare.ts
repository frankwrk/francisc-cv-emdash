import { CloudflareEmailClient } from "../lib/cloudflare.js";

interface EmailMessage {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: "inline" | "attachment";
    content_id?: string;
  }>;
}

interface DeliverEvent {
  message: EmailMessage;
  source: string;
}

interface CloudflareProviderConfig {
  apiToken: string | null;
  accountId: string | null;
  zoneId: string | null;
  fromAddress: string | null;
  fromName: string | null;
  sendingDomain: string | null;
  routeAddress: string | null;
  destinationAddress: string | null;
  workerName: string | null;
  workerRuleId: string | null;
  sendEmailBindingName: string;
}

export interface CloudflareReadinessCheck {
  id: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail: string;
}

export interface CloudflareReadinessResult {
  provider: "cloudflare";
  ready: boolean;
  checks: CloudflareReadinessCheck[];
  onboarding: {
    sendingSubdomainTag: string | null;
    routingStatus: string | null;
    destinationVerified: boolean | null;
  };
}

function maskSecret(value: string): string {
  if (value.length <= 10) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.max(0, value.length - 8))}${value.slice(-4)}`;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function providerMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cloudflare-${Date.now()}-${Math.round(Math.random() * 100_000)}`;
}

function inferDomainFromAddress(address: string | null): string | null {
  if (!address || !address.includes("@")) return null;
  return address.split("@").at(-1)?.toLowerCase() ?? null;
}

function normalizeRouteAddress(routeAddress: string | null, sendingDomain: string | null): string | null {
  if (!routeAddress) return null;

  const trimmed = routeAddress.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  if (!sendingDomain) return null;

  return `${trimmed}@${sendingDomain.toLowerCase()}`;
}

async function getConfig(ctx: any): Promise<CloudflareProviderConfig> {
  const [
    apiToken,
    accountId,
    zoneId,
    fromAddress,
    fromName,
    sendingDomain,
    routeAddress,
    destinationAddress,
    workerName,
    workerRuleId,
    sendEmailBindingName,
  ] = await Promise.all([
    ctx.kv.get("settings:cloudflare:apiToken") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:accountId") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:zoneId") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:fromAddress") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:fromName") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:sendingDomain") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:routeAddress") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:destinationAddress") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:workerName") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:workerRuleId") as Promise<string | null>,
    ctx.kv.get("settings:cloudflare:sendEmailBindingName") as Promise<string | null>,
  ]);

  return {
    apiToken: trimOrNull(apiToken),
    accountId: trimOrNull(accountId),
    zoneId: trimOrNull(zoneId),
    fromAddress: trimOrNull(fromAddress),
    fromName: trimOrNull(fromName),
    sendingDomain: trimOrNull(sendingDomain),
    routeAddress: trimOrNull(routeAddress),
    destinationAddress: trimOrNull(destinationAddress),
    workerName: trimOrNull(workerName),
    workerRuleId: trimOrNull(workerRuleId),
    sendEmailBindingName: trimOrNull(sendEmailBindingName) ?? "EMAIL_SENDER",
  };
}

async function saveConfig(ctx: any, input: Partial<CloudflareProviderConfig>): Promise<void> {
  const writes: Array<Promise<void>> = [];

  const setOrDelete = (key: string, value: string | null | undefined) => {
    if (value === undefined) return;
    const normalized = trimOrNull(value);
    if (normalized === null) {
      writes.push(ctx.kv.delete(key));
    } else {
      writes.push(ctx.kv.set(key, normalized));
    }
  };

  setOrDelete("settings:cloudflare:apiToken", input.apiToken);
  setOrDelete("settings:cloudflare:accountId", input.accountId);
  setOrDelete("settings:cloudflare:zoneId", input.zoneId);
  setOrDelete("settings:cloudflare:fromAddress", input.fromAddress);
  setOrDelete("settings:cloudflare:fromName", input.fromName);
  setOrDelete("settings:cloudflare:sendingDomain", input.sendingDomain);
  setOrDelete("settings:cloudflare:routeAddress", input.routeAddress);
  setOrDelete("settings:cloudflare:destinationAddress", input.destinationAddress);
  setOrDelete("settings:cloudflare:workerName", input.workerName);
  setOrDelete("settings:cloudflare:workerRuleId", input.workerRuleId);
  setOrDelete("settings:cloudflare:sendEmailBindingName", input.sendEmailBindingName);

  if (writes.length > 0) await Promise.all(writes);
}

function buildWorkerScript(): string {
  return `export default {
  async email(message, env) {
    if (!env.FORWARD_TO) {
      message.setReject("FORWARD_TO binding is not configured");
      return;
    }

    try {
      await message.forward(env.FORWARD_TO);
    } catch (error) {
      message.setReject("Failed to forward message");
      throw error;
    }
  },
};\n`;
}

function getClient(config: CloudflareProviderConfig, ctx?: any): CloudflareEmailClient {
  if (!config.apiToken) throw new Error("Cloudflare API token is required");

  const scopedFetch =
    typeof ctx?.http?.fetch === "function"
      ? ctx.http.fetch.bind(ctx.http)
      : undefined;

  return new CloudflareEmailClient(config.apiToken, scopedFetch);
}

export async function getCloudflareSettings(ctx: any): Promise<Record<string, unknown>> {
  const config = await getConfig(ctx);

  return {
    apiToken: config.apiToken ? maskSecret(config.apiToken) : null,
    accountId: config.accountId,
    zoneId: config.zoneId,
    fromAddress: config.fromAddress,
    fromName: config.fromName,
    sendingDomain: config.sendingDomain,
    routeAddress: config.routeAddress,
    destinationAddress: config.destinationAddress,
    workerName: config.workerName,
    workerRuleId: config.workerRuleId,
    sendEmailBindingName: config.sendEmailBindingName,
  };
}

export async function saveCloudflareSettings(ctx: any, input: Record<string, unknown>): Promise<void> {
  await saveConfig(ctx, {
    apiToken: trimOrNull(input.apiToken),
    accountId: trimOrNull(input.accountId),
    zoneId: trimOrNull(input.zoneId),
    fromAddress: trimOrNull(input.fromAddress),
    fromName: trimOrNull(input.fromName),
    sendingDomain: trimOrNull(input.sendingDomain),
    routeAddress: trimOrNull(input.routeAddress),
    destinationAddress: trimOrNull(input.destinationAddress),
    workerName: trimOrNull(input.workerName),
    sendEmailBindingName: trimOrNull(input.sendEmailBindingName) ?? undefined,
  });
}

function buildCloudflareFromAddress(config: CloudflareProviderConfig, fromOverride?: string): string {
  const fromAddress = trimOrNull(fromOverride) ?? config.fromAddress;
  if (!fromAddress) {
    throw new Error("Cloudflare from address is not configured");
  }
  if (!isEmail(fromAddress)) {
    throw new Error("Cloudflare from address must be a valid email address");
  }

  if (config.fromName) {
    return `${config.fromName} <${fromAddress}>`;
  }

  return fromAddress;
}

function cloudflareSendPayload(config: CloudflareProviderConfig, message: EmailMessage) {
  return {
    to: message.to,
    from: buildCloudflareFromAddress(config, message.from),
    subject: message.subject,
    html: message.html,
    text: message.text,
    cc: message.cc,
    bcc: message.bcc,
    reply_to: message.replyTo,
    attachments: message.attachments,
  };
}

export async function cloudflareSendEmail(event: DeliverEvent, ctx: any): Promise<void> {
  const config = await getConfig(ctx);
  if (!config.accountId) throw new Error("Cloudflare account ID is not configured");

  const client = getClient(config, ctx);
  const payload = cloudflareSendPayload(config, event.message);
  const result = await client.sendEmail(config.accountId, payload);

  const recordId = providerMessageId();
  const recipient = Array.isArray(event.message.to) ? event.message.to.join(", ") : event.message.to;

  try {
    await ctx.storage.deliveries.put(recordId, {
      provider: "cloudflare",
      providerMessageId: recordId,
      to: recipient,
      subject: event.message.subject,
      status: result.permanent_bounces.length > 0 ? "bounced" : "sent",
      createdAt: new Date().toISOString(),
      cloudflareDelivered: result.delivered,
      cloudflareQueued: result.queued,
      cloudflarePermanentBounces: result.permanent_bounces,
    });
  } catch (error) {
    ctx.log?.warn?.("Email Providers plugin: failed to persist Cloudflare delivery record after send", {
      providerMessageId: recordId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function cloudflareSendTestEmail(
  ctx: any,
  input: { to?: string }
): Promise<{ success: boolean }> {
  const config = await getConfig(ctx);
  if (!config.accountId) throw new Error("Cloudflare account ID is not configured");

  const fromAddress = config.fromAddress;
  if (!fromAddress) throw new Error("Cloudflare from address is not configured");

  const testTo = trimOrNull(input.to) ?? fromAddress;
  if (!isEmail(testTo)) throw new Error("Test recipient must be a valid email address");

  const client = getClient(config, ctx);
  await client.sendEmail(config.accountId, {
    to: testTo,
    from: buildCloudflareFromAddress(config),
    subject: "EmDash Email Providers plugin — Cloudflare test email",
    text: "If you received this, Cloudflare Email Service is configured correctly in the Email Providers plugin.",
    html: "<p>If you received this, Cloudflare Email Service is configured correctly in the Email Providers plugin.</p>",
  });

  return { success: true };
}

export async function getCloudflareReadiness(ctx: any): Promise<CloudflareReadinessResult> {
  const config = await getConfig(ctx);
  const checks: CloudflareReadinessCheck[] = [];

  const addCheck = (check: CloudflareReadinessCheck) => {
    checks.push(check);
  };

  addCheck({
    id: "api-token",
    label: "API token configured",
    required: true,
    ok: Boolean(config.apiToken),
    detail: config.apiToken ? "Configured" : "Missing",
  });

  addCheck({
    id: "account-id",
    label: "Account ID configured",
    required: true,
    ok: Boolean(config.accountId),
    detail: config.accountId ? "Configured" : "Missing",
  });

  addCheck({
    id: "zone-id",
    label: "Zone ID configured",
    required: true,
    ok: Boolean(config.zoneId),
    detail: config.zoneId ? "Configured" : "Missing",
  });

  addCheck({
    id: "from-address",
    label: "Default sender configured",
    required: true,
    ok: Boolean(config.fromAddress && isEmail(config.fromAddress)),
    detail: config.fromAddress ? "Configured" : "Missing",
  });

  const inferredDomain = inferDomainFromAddress(config.fromAddress);
  const effectiveSendingDomain = config.sendingDomain ?? inferredDomain;
  addCheck({
    id: "sending-domain",
    label: "Sending domain configured",
    required: true,
    ok: Boolean(effectiveSendingDomain),
    detail: effectiveSendingDomain ?? "Missing",
  });

  let sendingSubdomainTag: string | null = null;
  let routingStatus: string | null = null;
  let destinationVerified: boolean | null = null;

  if (config.apiToken && config.zoneId) {
    try {
      const client = getClient(config, ctx);
      const subdomains = await client.listSendingSubdomains(config.zoneId);
      const match = effectiveSendingDomain
        ? subdomains.find((item) => item.name.toLowerCase() === effectiveSendingDomain.toLowerCase())
        : null;

      if (match) {
        sendingSubdomainTag = match.tag;
        addCheck({
          id: "domain-onboarded",
          label: "Cloudflare sending domain onboarded",
          required: true,
          ok: true,
          detail: `${match.name} is enabled`,
        });
      } else {
        addCheck({
          id: "domain-onboarded",
          label: "Cloudflare sending domain onboarded",
          required: true,
          ok: false,
          detail: effectiveSendingDomain
            ? `${effectiveSendingDomain} not found in Email Sending subdomains`
            : "Set a sending domain first",
        });
      }
    } catch (error) {
      addCheck({
        id: "domain-onboarded",
        label: "Cloudflare sending domain onboarded",
        required: true,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const client = getClient(config, ctx);
      const routing = await client.getEmailRoutingSettings(config.zoneId);
      routingStatus = routing.status ?? null;
      const ok = Boolean(routing.enabled);
      addCheck({
        id: "routing-enabled",
        label: "Email Routing enabled",
        required: true,
        ok,
        detail: ok ? `Enabled (${routing.status ?? "status unknown"})` : `Disabled (${routing.status ?? "status unknown"})`,
      });
    } catch (error) {
      addCheck({
        id: "routing-enabled",
        label: "Email Routing enabled",
        required: true,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    addCheck({
      id: "domain-onboarded",
      label: "Cloudflare sending domain onboarded",
      required: true,
      ok: false,
      detail: "Set API token + zone ID first",
    });
    addCheck({
      id: "routing-enabled",
      label: "Email Routing enabled",
      required: true,
      ok: false,
      detail: "Set API token + zone ID first",
    });
  }

  if (config.apiToken && config.accountId) {
    try {
      const client = getClient(config, ctx);
      const addresses = await client.listDestinationAddresses(config.accountId);
      const targetAddress = config.destinationAddress;

      if (!targetAddress) {
        addCheck({
          id: "destination-address",
          label: "Destination address verified (for Worker routing)",
          required: false,
          ok: true,
          detail: "Optional: configure destination address for worker forwarding",
        });
      } else {
        const matchingAddress = addresses.find((item) => item.email?.toLowerCase() === targetAddress.toLowerCase());
        destinationVerified = Boolean(matchingAddress?.verified);
        addCheck({
          id: "destination-address",
          label: "Destination address verified (for Worker routing)",
          required: false,
          ok: Boolean(matchingAddress?.verified),
          detail: matchingAddress
            ? (matchingAddress.verified ? "Verified" : "Pending verification")
            : "Not found in account destination addresses",
        });
      }
    } catch (error) {
      addCheck({
        id: "destination-address",
        label: "Destination address verified (for Worker routing)",
        required: false,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  addCheck({
    id: "worker-config",
    label: "Worker provisioning inputs",
    required: false,
    ok: Boolean(config.workerName && normalizeRouteAddress(config.routeAddress, effectiveSendingDomain)),
    detail: config.workerName
      ? "Worker name configured"
      : "Optional: set worker name + route to enable one-click provisioning",
  });

  const ready = checks
    .filter((check) => check.required)
    .every((check) => check.ok);

  return {
    provider: "cloudflare",
    ready,
    checks,
    onboarding: {
      sendingSubdomainTag,
      routingStatus,
      destinationVerified,
    },
  };
}

export async function provisionCloudflareWorker(
  ctx: any,
  input: {
    workerName?: string;
    routeAddress?: string;
    destinationAddress?: string;
    sendEmailBindingName?: string;
  }
): Promise<Record<string, unknown>> {
  const existingConfig = await getConfig(ctx);
  const patchedConfig: CloudflareProviderConfig = {
    ...existingConfig,
    workerName: trimOrNull(input.workerName) ?? existingConfig.workerName,
    routeAddress: trimOrNull(input.routeAddress) ?? existingConfig.routeAddress,
    destinationAddress: trimOrNull(input.destinationAddress) ?? existingConfig.destinationAddress,
    sendEmailBindingName: trimOrNull(input.sendEmailBindingName) ?? existingConfig.sendEmailBindingName,
  };

  if (!patchedConfig.apiToken) throw new Error("Cloudflare API token is required");
  if (!patchedConfig.accountId) throw new Error("Cloudflare account ID is required");
  if (!patchedConfig.zoneId) throw new Error("Cloudflare zone ID is required");
  if (!patchedConfig.workerName) throw new Error("Cloudflare worker name is required");

  const effectiveSendingDomain = patchedConfig.sendingDomain ?? inferDomainFromAddress(patchedConfig.fromAddress);
  const normalizedRouteAddress = normalizeRouteAddress(patchedConfig.routeAddress, effectiveSendingDomain);
  if (!normalizedRouteAddress) {
    throw new Error("Route address is required. Use full email (support@example.com) or local-part plus sending domain.");
  }
  if (!isEmail(normalizedRouteAddress)) {
    throw new Error("Route address must resolve to a valid email address");
  }

  if (!patchedConfig.destinationAddress) {
    throw new Error("Destination address is required for worker provisioning");
  }
  if (!isEmail(patchedConfig.destinationAddress)) {
    throw new Error("Destination address must be a valid email address");
  }

  const client = getClient(patchedConfig, ctx);

  const routingSettings = await client.getEmailRoutingSettings(patchedConfig.zoneId);
  if (!routingSettings.enabled) {
    await client.enableEmailRoutingDns(patchedConfig.zoneId);
  }

  if (effectiveSendingDomain) {
    const subdomains = await client.listSendingSubdomains(patchedConfig.zoneId);
    const existingSubdomain = subdomains.find((item) => item.name.toLowerCase() === effectiveSendingDomain.toLowerCase());
    if (!existingSubdomain) {
      await client.createSendingSubdomain(patchedConfig.zoneId, effectiveSendingDomain);
    }
  }

  const workerUpload = await client.uploadWorkerWithBindings(
    patchedConfig.accountId,
    patchedConfig.workerName,
    buildWorkerScript(),
    {
      forwardTo: patchedConfig.destinationAddress,
      sendEmailBindingName: patchedConfig.sendEmailBindingName,
      destinationAddress: patchedConfig.destinationAddress,
      allowlistDestinationAddresses: unique([patchedConfig.destinationAddress]),
      allowlistSenderAddresses: unique([patchedConfig.fromAddress]),
    }
  );

  const rules = await client.listRoutingRules(patchedConfig.zoneId);
  const existingRule = rules.find((rule) => {
    const matcherTo = rule.matchers?.find((matcher) => matcher.type === "literal" && matcher.field === "to")?.value;
    const workerAction = rule.actions?.find((action) => action.type === "worker");
    return matcherTo?.toLowerCase() === normalizedRouteAddress.toLowerCase()
      && workerAction?.value?.includes(patchedConfig.workerName as string);
  });

  const routingRule = existingRule ?? await client.createRoutingRule(patchedConfig.zoneId, {
    actions: [{ type: "worker", value: [patchedConfig.workerName] }],
    matchers: [{ type: "literal", field: "to", value: normalizedRouteAddress }],
    enabled: true,
    name: `Email Worker route for ${normalizedRouteAddress}`,
  });

  await saveConfig(ctx, {
    workerName: patchedConfig.workerName,
    routeAddress: normalizedRouteAddress,
    destinationAddress: patchedConfig.destinationAddress,
    workerRuleId: routingRule.id ?? null,
    sendEmailBindingName: patchedConfig.sendEmailBindingName,
  });

  if (routingRule.id) {
    await ctx.kv.set("settings:cloudflare:workerRuleId", routingRule.id);
  }

  if (workerUpload.etag) {
    await ctx.kv.set("settings:cloudflare:workerScriptEtag", workerUpload.etag);
  }

  await ctx.kv.set("settings:cloudflare:workerScriptUpdatedAt", new Date().toISOString());

  return {
    success: true,
    workerName: patchedConfig.workerName,
    routeAddress: normalizedRouteAddress,
    destinationAddress: patchedConfig.destinationAddress,
    workerRuleId: routingRule.id ?? null,
    workerScriptEtag: workerUpload.etag ?? null,
  };
}

export async function getCloudflareWorkerStatus(ctx: any): Promise<Record<string, unknown>> {
  const config = await getConfig(ctx);

  if (!config.apiToken || !config.accountId || !config.zoneId) {
    return {
      configured: false,
      reason: "Cloudflare API token, account ID, and zone ID are required",
    };
  }

  if (!config.workerName) {
    return {
      configured: false,
      reason: "Worker name not configured",
    };
  }

  const client = getClient(config, ctx);

  let workerExists = false;
  let workerError: string | null = null;
  try {
    await client.getWorker(config.accountId, config.workerName);
    workerExists = true;
  } catch (error) {
    workerError = error instanceof Error ? error.message : String(error);
  }

  let routeRuleId: string | null = config.workerRuleId;
  let routeMatched = false;
  let routeError: string | null = null;

  try {
    const effectiveSendingDomain = config.sendingDomain ?? inferDomainFromAddress(config.fromAddress);
    const normalizedRouteAddress = normalizeRouteAddress(config.routeAddress, effectiveSendingDomain);

    const rules = await client.listRoutingRules(config.zoneId);
    const matchedRule = rules.find((rule) => {
      const matcherValue = rule.matchers?.find((matcher) => matcher.type === "literal" && matcher.field === "to")?.value;
      const workerAction = rule.actions?.find((action) => action.type === "worker");

      if (!matcherValue || !normalizedRouteAddress) return false;
      return matcherValue.toLowerCase() === normalizedRouteAddress.toLowerCase()
        && workerAction?.value?.includes(config.workerName as string);
    });

    if (matchedRule?.id) {
      routeRuleId = matchedRule.id;
      routeMatched = true;
    }
  } catch (error) {
    routeError = error instanceof Error ? error.message : String(error);
  }

  const scriptUpdatedAt = await ctx.kv.get("settings:cloudflare:workerScriptUpdatedAt") as string | null;

  return {
    configured: workerExists && routeMatched,
    workerName: config.workerName,
    workerExists,
    workerError,
    routeRuleId,
    routeMatched,
    routeError,
    routeAddress: config.routeAddress,
    destinationAddress: config.destinationAddress,
    scriptUpdatedAt: scriptUpdatedAt ?? null,
  };
}
