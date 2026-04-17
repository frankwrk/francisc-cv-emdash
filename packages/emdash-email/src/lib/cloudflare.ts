export type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface CloudflareEnvelope<T> {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result?: T;
  result_info?: {
    count?: number;
    page?: number;
    per_page?: number;
    total_count?: number;
    total_pages?: number;
  };
}

export interface CloudflareSendEmailPayload {
  to: string | string[];
  from: string | { address: string; name?: string };
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: "attachment" | "inline";
    content_id?: string;
  }>;
}

export interface CloudflareSendEmailResult {
  delivered: string[];
  permanent_bounces: string[];
  queued: string[];
}

export interface CloudflareSendingSubdomain {
  enabled: boolean;
  name: string;
  tag: string;
  created?: string;
  modified?: string;
  dkim_selector?: string;
  return_path_domain?: string;
}

export interface CloudflareEmailRoutingSettings {
  id?: string;
  enabled?: boolean;
  name?: string;
  status?: "ready" | "unconfigured" | "misconfigured" | "misconfigured/locked" | "unlocked";
  skip_wizard?: boolean;
  created?: string;
  modified?: string;
}

export interface CloudflareDestinationAddress {
  id?: string;
  email?: string;
  verified?: string | null;
  created?: string;
  modified?: string;
}

export interface CloudflareRoutingMatcher {
  type: "all" | "literal";
  field?: "to";
  value?: string;
}

export interface CloudflareRoutingAction {
  type: "drop" | "forward" | "worker";
  value?: string[];
}

export interface CloudflareRoutingRule {
  id?: string;
  actions?: CloudflareRoutingAction[];
  enabled?: boolean;
  matchers?: CloudflareRoutingMatcher[];
  name?: string;
  priority?: number;
}

export interface CloudflareWorkerUploadResponse {
  id?: string;
  etag?: string;
  created_on?: string;
  modified_on?: string;
  startup_time_ms?: number;
}

interface WorkerBindingSendEmail {
  name: string;
  type: "send_email";
  destination_address?: string;
  allowed_destination_addresses?: string[];
  allowed_sender_addresses?: string[];
}

interface WorkerBindingPlainText {
  name: string;
  type: "plain_text";
  text: string;
}

interface WorkerMetadata {
  main_module: string;
  compatibility_date: string;
  bindings: Array<WorkerBindingSendEmail | WorkerBindingPlainText>;
}

function normalizeError(prefix: string, payload: unknown, fallback: string): Error {
  if (!payload || typeof payload !== "object") return new Error(`${prefix}: ${fallback}`);

  const candidate = payload as {
    errors?: Array<{ message?: string }>;
    message?: string;
  };

  const explicitMessage = candidate.errors?.find((item) => item?.message)?.message ?? candidate.message;
  return new Error(`${prefix}: ${explicitMessage ?? fallback}`);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class CloudflareEmailClient {
  constructor(
    private apiCredential: string,
    private fetchFn: FetchFn = fetch,
    private options: {
      apiBase?: string;
      apiEmail?: string;
    } = {}
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    if (this.options.apiEmail) {
      headers.set("X-Auth-Email", this.options.apiEmail);
      headers.set("X-Auth-Key", this.apiCredential);
    } else {
      headers.set("Authorization", `Bearer ${this.apiCredential}`);
    }

    const hasBody = init.body !== undefined && init.body !== null;
    if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await this.fetchFn(`${this.options.apiBase ?? "https://api.cloudflare.com/client/v4"}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => null) as CloudflareEnvelope<T> | null;

    if (!response.ok) {
      throw normalizeError("Cloudflare API request failed", payload, `${response.status} ${response.statusText}`);
    }

    if (!payload) {
      throw new Error("Cloudflare API request failed: Empty JSON response.");
    }

    if (payload.success === false) {
      throw normalizeError("Cloudflare API request failed", payload, "Request was not successful.");
    }

    if (!("result" in payload)) {
      return undefined as T;
    }

    return payload.result as T;
  }

  async sendEmail(accountId: string, payload: CloudflareSendEmailPayload): Promise<CloudflareSendEmailResult> {
    return this.request<CloudflareSendEmailResult>(`/accounts/${accountId}/email/sending/send`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listSendingSubdomains(zoneId: string): Promise<CloudflareSendingSubdomain[]> {
    return this.request<CloudflareSendingSubdomain[]>(`/zones/${zoneId}/email/sending/subdomains`, {
      method: "GET",
    });
  }

  async createSendingSubdomain(zoneId: string, name: string): Promise<CloudflareSendingSubdomain> {
    return this.request<CloudflareSendingSubdomain>(`/zones/${zoneId}/email/sending/subdomains`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getEmailRoutingSettings(zoneId: string): Promise<CloudflareEmailRoutingSettings> {
    return this.request<CloudflareEmailRoutingSettings>(`/zones/${zoneId}/email/routing`, {
      method: "GET",
    });
  }

  async enableEmailRoutingDns(zoneId: string): Promise<CloudflareEmailRoutingSettings> {
    return this.request<CloudflareEmailRoutingSettings>(`/zones/${zoneId}/email/routing/dns`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async listDestinationAddresses(accountId: string): Promise<CloudflareDestinationAddress[]> {
    return this.request<CloudflareDestinationAddress[]>(`/accounts/${accountId}/email/routing/addresses`, {
      method: "GET",
    });
  }

  async listRoutingRules(zoneId: string): Promise<CloudflareRoutingRule[]> {
    return this.request<CloudflareRoutingRule[]>(`/zones/${zoneId}/email/routing/rules`, {
      method: "GET",
    });
  }

  async createRoutingRule(
    zoneId: string,
    payload: {
      actions: CloudflareRoutingAction[];
      matchers: CloudflareRoutingMatcher[];
      enabled?: boolean;
      name?: string;
      priority?: number;
    }
  ): Promise<CloudflareRoutingRule> {
    return this.request<CloudflareRoutingRule>(`/zones/${zoneId}/email/routing/rules`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async uploadWorkerWithBindings(
    accountId: string,
    scriptName: string,
    script: string,
    options: {
      forwardTo?: string;
      sendEmailBindingName: string;
      allowlistSenderAddresses?: string[];
      allowlistDestinationAddresses?: string[];
      destinationAddress?: string;
    }
  ): Promise<CloudflareWorkerUploadResponse> {
    const bindings: WorkerMetadata["bindings"] = [];

    if (options.forwardTo) {
      bindings.push({
        type: "plain_text",
        name: "FORWARD_TO",
        text: options.forwardTo,
      });
    }

    bindings.push({
      type: "send_email",
      name: options.sendEmailBindingName,
      destination_address: options.destinationAddress,
      allowed_sender_addresses: options.allowlistSenderAddresses,
      allowed_destination_addresses: options.allowlistDestinationAddresses,
    });

    const metadata: WorkerMetadata = {
      main_module: "index.mjs",
      compatibility_date: todayIsoDate(),
      bindings,
    };

    const form = new FormData();
    form.append("metadata", JSON.stringify(metadata));
    form.append("index.mjs", new Blob([script], { type: "application/javascript+module" }), "index.mjs");

    return this.request<CloudflareWorkerUploadResponse>(`/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: "PUT",
      body: form,
    });
  }

  async getWorker(accountId: string, scriptName: string): Promise<CloudflareWorkerUploadResponse> {
    return this.request<CloudflareWorkerUploadResponse>(`/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: "GET",
    });
  }
}
