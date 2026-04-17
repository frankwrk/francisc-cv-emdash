import { definePlugin, type ResolvedPlugin } from "emdash";
import { handleEmailDeliver } from "./handlers/deliver.js";
import { handleInstall, handleActivate, handleDeactivate } from "./handlers/lifecycle.js";
import {
  handleGetSettings,
  handleSaveSettings,
  handleTestEmail,
  handleGetWebhookStatus,
  handleRegisterWebhook,
} from "./handlers/settings.js";
import { handleGetDeliveries, handleGetDeliveryStats } from "./handlers/deliveries.js";
import {
  handleListAudiences,
  handleCreateAudience,
  handleListContacts,
  handleAddContact,
  handleUnsubscribeContact,
  handleDeleteContact,
} from "./handlers/audiences.js";
import {
  handleListBroadcasts,
  handleCreateBroadcast,
  handleSendBroadcast,
} from "./handlers/broadcasts.js";
import { handleWebhook } from "./handlers/webhook.js";

export {
  handleEmailDeliver,
  handleInstall, handleActivate, handleDeactivate,
  handleGetSettings, handleSaveSettings, handleTestEmail, handleGetWebhookStatus, handleRegisterWebhook,
  handleGetDeliveries, handleGetDeliveryStats,
  handleListAudiences, handleCreateAudience, handleListContacts, handleAddContact, handleUnsubscribeContact, handleDeleteContact,
  handleListBroadcasts, handleCreateBroadcast, handleSendBroadcast,
  handleWebhook,
};

export function createPlugin(): ResolvedPlugin {
  return definePlugin({
    id: "emdash-resend",
    version: "0.1.0",
    capabilities: ["email:provide", "network:fetch"],
    allowedHosts: ["api.resend.com"],

    storage: {
      deliveries: {
        indexes: ["status", "createdAt", "to", "resendId"],
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
      entry: "@frankwrk/emdash-resend/admin",
      pages: [
        { path: "/settings", label: "Settings", icon: "settings" },
        { path: "/deliveries", label: "Delivery Log", icon: "mail" },
        { path: "/contacts", label: "Contacts", icon: "users" },
        { path: "/broadcasts", label: "Broadcasts", icon: "send" },
      ],
      widgets: [{ id: "delivery-stats", title: "Email Delivery", size: "third" }],
    },
  });
}

export default createPlugin;
