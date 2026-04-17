export type FetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  attachments?: Array<{ filename: string; content: string }>;
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendContact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  unsubscribed: boolean;
}

export interface ResendAudience {
  id: string;
  name: string;
  created_at: string;
}

export interface ResendBroadcast {
  id: string;
  name: string;
  audience_id: string;
  status: "draft" | "sent" | "sending";
  created_at: string;
}

const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.complained",
  "email.bounced",
  "email.opened",
  "email.clicked",
] as const;

export class ResendClient {
  constructor(private apiKey: string, private fetchFn: FetchFn = fetch) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetchFn(`https://api.resend.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error((err as { message?: string }).message ?? `Resend API error: ${res.status}`);
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
  }

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    return this.request("POST", "/emails", params);
  }

  async registerWebhook(url: string, events: string[] = [...WEBHOOK_EVENTS]): Promise<{ id: string; signing_secret: string }> {
    return this.request("POST", "/webhooks", { endpoint: url, events });
  }

  async deleteWebhook(id: string): Promise<void> {
    return this.request("DELETE", `/webhooks/${id}`);
  }

  async getWebhook(id: string): Promise<{ id: string; url: string; enabled: boolean }> {
    return this.request("GET", `/webhooks/${id}`);
  }

  async listAudiences(): Promise<{ data: ResendAudience[] }> {
    return this.request("GET", "/audiences");
  }

  async createAudience(name: string): Promise<{ id: string; name: string }> {
    return this.request("POST", "/audiences", { name });
  }

  async listContacts(audienceId: string): Promise<{ data: ResendContact[] }> {
    return this.request("GET", `/audiences/${audienceId}/contacts`);
  }

  async createContact(
    audienceId: string,
    params: { email: string; first_name?: string; last_name?: string; unsubscribed?: boolean }
  ): Promise<{ id: string }> {
    return this.request("POST", `/audiences/${audienceId}/contacts`, params);
  }

  async updateContact(audienceId: string, id: string, params: { unsubscribed: boolean }): Promise<void> {
    return this.request("PATCH", `/audiences/${audienceId}/contacts/${id}`, params);
  }

  async deleteContact(audienceId: string, id: string): Promise<void> {
    return this.request("DELETE", `/audiences/${audienceId}/contacts/${id}`);
  }

  async listBroadcasts(): Promise<{ data: ResendBroadcast[] }> {
    return this.request("GET", "/broadcasts");
  }

  async createBroadcast(params: {
    name?: string;
    audience_id: string;
    from: string;
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ id: string }> {
    return this.request("POST", "/broadcasts", params);
  }

  async sendBroadcast(id: string): Promise<void> {
    return this.request("POST", `/broadcasts/${id}/send`);
  }
}
