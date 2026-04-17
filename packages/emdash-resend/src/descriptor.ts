import type { PluginDescriptor } from "emdash";

export function resendPlugin(): PluginDescriptor {
  return {
    id: "emdash-resend",
    version: "0.1.0",
    entrypoint: "@frankwrk/emdash-resend/plugin",
    adminEntry: "@frankwrk/emdash-resend/admin",
    adminPages: [
      { path: "/resend-email", label: "Resend Email", icon: "mail" },
    ],
    adminWidgets: [
      { id: "delivery-stats", title: "Email Delivery", size: "third" },
    ],
  };
}
