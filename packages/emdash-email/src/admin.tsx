import { PLUGIN_ADMIN_PAGE_PATH } from "./lib/plugin-config.js";
import { DeliveryStatsWidget } from "./components/DeliveryStatsWidget.js";
import { EmailProvidersPage } from "./components/ResendEmailPage.js";

export const pages = {
  [PLUGIN_ADMIN_PAGE_PATH]: EmailProvidersPage,
  "/email-providers": EmailProvidersPage,
};

export const widgets = {
  "delivery-stats": DeliveryStatsWidget,
};
