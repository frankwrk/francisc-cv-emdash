import type { PluginDescriptor } from "emdash";
import {
  PLUGIN_ADMIN_PAGE_LABEL,
  PLUGIN_ADMIN_PAGE_PATH,
  PLUGIN_RUNTIME_ID,
  PLUGIN_VERSION,
} from "./lib/plugin-config.js";

export function emailPlugin(): PluginDescriptor {
  return {
    id: PLUGIN_RUNTIME_ID,
    version: PLUGIN_VERSION,
    entrypoint: "@frankwrk/emdash-email/plugin",
    adminEntry: "@frankwrk/emdash-email/admin",
    adminPages: [
      { path: PLUGIN_ADMIN_PAGE_PATH, label: PLUGIN_ADMIN_PAGE_LABEL, icon: "mail" },
    ],
    adminWidgets: [
      { id: "delivery-stats", title: "Email Delivery", size: "third" },
    ],
  };
}

// Compatibility alias to avoid breaking existing imports.
export const resendPlugin = emailPlugin;

export default emailPlugin;
