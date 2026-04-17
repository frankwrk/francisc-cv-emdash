import { definePlugin, type ResolvedPlugin } from "emdash";
import {
  handleActivate,
  handleDeactivate,
  handleInstall,
} from "./handlers/lifecycle.js";
import {
  handleAddContact,
  handleCreateAudience,
  handleDeleteContact,
  handleListAudiences,
  handleListContacts,
  handleUnsubscribeContact,
} from "./handlers/audiences.js";
import {
  handleCreateBroadcast,
  handleListBroadcasts,
  handleSendBroadcast,
} from "./handlers/broadcasts.js";
import { handleEmailDeliver } from "./handlers/deliver.js";
import { handleGetDeliveries, handleGetDeliveryStats } from "./handlers/deliveries.js";
import {
  handleGetCloudflareReadiness,
  handleGetCloudflareWorkerStatus,
  handleGetSettings,
  handleGetWebhookStatus,
  handleProvisionCloudflareWorker,
  handleRegisterWebhook,
  handleSaveSettings,
  handleTestEmail,
} from "./handlers/settings.js";
import { handleWebhook } from "./handlers/webhook.js";
import {
  PLUGIN_ADMIN_PAGE_LABEL,
  PLUGIN_ADMIN_PAGE_PATH,
  PLUGIN_RUNTIME_ID,
  PLUGIN_VERSION,
} from "./lib/plugin-config.js";

export {
  handleEmailDeliver,
  handleInstall,
  handleActivate,
  handleDeactivate,
  handleGetSettings,
  handleSaveSettings,
  handleTestEmail,
  handleGetWebhookStatus,
  handleRegisterWebhook,
  handleGetCloudflareReadiness,
  handleProvisionCloudflareWorker,
  handleGetCloudflareWorkerStatus,
  handleGetDeliveries,
  handleGetDeliveryStats,
  handleListAudiences,
  handleCreateAudience,
  handleListContacts,
  handleAddContact,
  handleUnsubscribeContact,
  handleDeleteContact,
  handleListBroadcasts,
  handleCreateBroadcast,
  handleSendBroadcast,
  handleWebhook,
};

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    id: PLUGIN_RUNTIME_ID,
    version: PLUGIN_VERSION,
    capabilities: ["email:provide", "network:fetch"],
    allowedHosts: ["api.resend.com", "api.cloudflare.com"],

    storage: {
      deliveries: {
        indexes: ["status", "createdAt", "to", "provider", "providerMessageId", "resendId"],
      },
    },

    hooks: {
      "email:deliver": {
        exclusive: true,
        errorPolicy: "abort",
        handler: handleEmailDeliver,
      },
      "plugin:install": { handler: handleInstall },
      "plugin:activate": { handler: handleActivate },
      "plugin:deactivate": { handler: handleDeactivate },
    },

    routes: {
      settings: { handler: handleGetSettings },
      "settings/save": { handler: handleSaveSettings },
      "settings/test": { handler: handleTestEmail },
      "settings/webhook-status": { handler: handleGetWebhookStatus },
      "settings/webhook-register": { handler: handleRegisterWebhook },
      "settings/cloudflare/readiness": { handler: handleGetCloudflareReadiness },
      "settings/cloudflare/provision-worker": { handler: handleProvisionCloudflareWorker },
      "settings/cloudflare/worker-status": { handler: handleGetCloudflareWorkerStatus },
      deliveries: { handler: handleGetDeliveries },
      "deliveries/stats": { handler: handleGetDeliveryStats },
      audiences: { handler: handleListAudiences },
      "audiences/create": { handler: handleCreateAudience },
      "audiences/contacts": { handler: handleListContacts },
      "audiences/contacts/add": { handler: handleAddContact },
      "audiences/contacts/unsubscribe": { handler: handleUnsubscribeContact },
      "audiences/contacts/delete": { handler: handleDeleteContact },
      broadcasts: { handler: handleListBroadcasts },
      "broadcasts/create": { handler: handleCreateBroadcast },
      "broadcasts/send": { handler: handleSendBroadcast },
      webhook: {
        public: true,
        handler: handleWebhook,
      },
    },

    admin: {
      entry: "@frankwrk/emdash-email/admin",
      pages: [
        { path: PLUGIN_ADMIN_PAGE_PATH, label: PLUGIN_ADMIN_PAGE_LABEL, icon: "mail" },
      ],
      widgets: [{ id: "delivery-stats", title: "Email Delivery", size: "third" }],
    },
  });
}

export default createPlugin;
