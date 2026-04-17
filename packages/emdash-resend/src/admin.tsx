import { SettingsPage } from "./components/SettingsPage.js";
import { DeliveryLogPage } from "./components/DeliveryLogPage.js";
import { ContactsPage } from "./components/ContactsPage.js";
import { BroadcastsPage } from "./components/BroadcastsPage.js";
import { DeliveryStatsWidget } from "./components/DeliveryStatsWidget.js";

export const pages = {
  "/settings": SettingsPage,
  "/deliveries": DeliveryLogPage,
  "/contacts": ContactsPage,
  "/broadcasts": BroadcastsPage,
};

export const widgets = {
  "delivery-stats": DeliveryStatsWidget,
};
