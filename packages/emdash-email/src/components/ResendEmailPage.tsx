import { useMemo, useState, useEffect } from "react";
import { BroadcastsPage } from "./BroadcastsPage.js";
import { ContactsPage } from "./ContactsPage.js";
import { DeliveryLogPage } from "./DeliveryLogPage.js";
import { SettingsPage } from "./SettingsPage.js";
import { Notice, Button } from "./ui.js";
import { ResendAdminStyles } from "./resend-admin-styles.js";
import { api } from "./api.js";

type TabKey = "delivery-log" | "contacts" | "broadcasts" | "settings";

interface SettingsSnapshot {
  provider: "resend" | "cloudflare";
  capabilities: {
    audiences: boolean;
    broadcasts: boolean;
  };
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "delivery-log", label: "Delivery Log" },
  { key: "contacts", label: "Contacts" },
  { key: "broadcasts", label: "Broadcasts" },
  { key: "settings", label: "Settings" },
];

function isTabKey(value: string | null): value is TabKey {
  return value === "delivery-log"
    || value === "contacts"
    || value === "broadcasts"
    || value === "settings";
}

export function EmailProvidersPage() {
  const initialTab = useMemo<TabKey>(() => {
    if (typeof window === "undefined") return "delivery-log";
    const value = new URLSearchParams(window.location.search).get("tab");
    return isTabKey(value) ? value : "delivery-log";
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [settingsSnapshot, setSettingsSnapshot] = useState<SettingsSnapshot | null>(null);

  useEffect(() => {
    void api.get<SettingsSnapshot>("settings")
      .then((snapshot) => setSettingsSnapshot(snapshot))
      .catch(() => {
        // Settings page itself can handle detailed errors.
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url);
  }, [activeTab]);

  useEffect(() => {
    if (!settingsSnapshot) return;

    const tabSupported = (
      activeTab !== "contacts" || settingsSnapshot.capabilities.audiences
    ) && (
      activeTab !== "broadcasts" || settingsSnapshot.capabilities.broadcasts
    );

    if (!tabSupported) {
      setActiveTab("delivery-log");
    }
  }, [activeTab, settingsSnapshot]);

  const activeProviderLabel = settingsSnapshot?.provider === "cloudflare"
    ? "Cloudflare Email Service"
    : "Resend";

  return (
    <div className="re-shell">
      <ResendAdminStyles />

      <header className="re-app-header">
        <span className="re-app-badge">Email Providers Plugin</span>
        <div>
          <h1 className="re-app-title">Email Providers</h1>
          <p className="re-app-subtitle">Provider-aware delivery operations, contacts, broadcasts, and Cloudflare setup workflows.</p>
        </div>
      </header>

      <div className="re-topbar" role="tablist" aria-label="Email provider sections">
        <div className="re-tabs">
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            const disabled = (tab.key === "contacts" && !settingsSnapshot?.capabilities.audiences)
              || (tab.key === "broadcasts" && !settingsSnapshot?.capabilities.broadcasts);

            return (
              <Button
                key={tab.key}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                disabled={disabled}
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                aria-controls={`re-panel-${tab.key}`}
                id={`re-tab-${tab.key}`}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {settingsSnapshot && (
        <Notice>
          Active provider: <strong>{activeProviderLabel}</strong>
        </Notice>
      )}

      {activeTab === "delivery-log" && (
        <section id="re-panel-delivery-log" role="tabpanel" aria-labelledby="re-tab-delivery-log">
          <DeliveryLogPage />
        </section>
      )}
      {activeTab === "contacts" && (
        <section id="re-panel-contacts" role="tabpanel" aria-labelledby="re-tab-contacts">
          {settingsSnapshot?.capabilities.audiences
            ? <ContactsPage />
            : <Notice>Contacts are only available when Resend is the active provider.</Notice>}
        </section>
      )}
      {activeTab === "broadcasts" && (
        <section id="re-panel-broadcasts" role="tabpanel" aria-labelledby="re-tab-broadcasts">
          {settingsSnapshot?.capabilities.broadcasts
            ? <BroadcastsPage />
            : <Notice>Broadcasts are only available when Resend is the active provider.</Notice>}
        </section>
      )}
      {activeTab === "settings" && (
        <section id="re-panel-settings" role="tabpanel" aria-labelledby="re-tab-settings">
          <SettingsPage />
        </section>
      )}
    </div>
  );
}

// Backwards-compatible component export name.
export const ResendEmailPage = EmailProvidersPage;
