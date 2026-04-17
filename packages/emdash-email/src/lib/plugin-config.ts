export const PLUGIN_RUNTIME_ID = "emdash-resend";

export const PLUGIN_VERSION = "0.2.0";

export const PLUGIN_ADMIN_PAGE_PATH = "/resend-email";

export const PLUGIN_ADMIN_PAGE_LABEL = "Email Providers";

export function getPluginApiBase(): string {
  return `/_emdash/api/plugins/${PLUGIN_RUNTIME_ID}`;
}

export function getWebhookUrl(origin: string): string {
  return `${origin}/_emdash/api/plugins/${PLUGIN_RUNTIME_ID}/webhook`;
}
