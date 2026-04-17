import type { PluginDescriptor } from "emdash";

export function resendPlugin(): PluginDescriptor {
  return {
    id: "emdash-resend",
    version: "0.1.0",
    entrypoint: "@frankwrk/emdash-resend/plugin",
    adminEntry: "@frankwrk/emdash-resend/admin",
    adminPages: [
      { path: "/settings", label: "Settings", icon: "settings" },
      { path: "/deliveries", label: "Delivery Log", icon: "mail" },
      { path: "/contacts", label: "Contacts", icon: "users" },
      { path: "/broadcasts", label: "Broadcasts", icon: "send" },
    ],
    adminWidgets: [
      { id: "delivery-stats", title: "Email Delivery", size: "third" },
    ],
  };
}
