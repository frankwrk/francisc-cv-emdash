import { useMemo, useState, useEffect } from "react";
import { SettingsPage } from "./SettingsPage.js";
import { DeliveryLogPage } from "./DeliveryLogPage.js";
import { ContactsPage } from "./ContactsPage.js";
import { BroadcastsPage } from "./BroadcastsPage.js";
import { Button } from "./ui.js";
import { ResendAdminStyles } from "./resend-admin-styles.js";

type TabKey = "delivery-log" | "contacts" | "broadcasts" | "settings";

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

export function ResendEmailPage() {
  const initialTab = useMemo<TabKey>(() => {
    if (typeof window === "undefined") return "delivery-log";
    const value = new URLSearchParams(window.location.search).get("tab");
    return isTabKey(value) ? value : "delivery-log";
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url);
  }, [activeTab]);

  return (
    <div className="re-shell">
      <ResendAdminStyles />

      <header className="re-app-header">
        <span className="re-app-badge">Resend Plugin</span>
        <div>
          <h1 className="re-app-title">Resend Email</h1>
          <p className="re-app-subtitle">Delivery analytics, contacts, broadcasts, and provider settings in one workflow.</p>
        </div>
      </header>

      <div className="re-topbar" role="tablist" aria-label="Resend sections">
        <div className="re-tabs">
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Button
                key={tab.key}
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
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

      {activeTab === "delivery-log" && (
        <section id="re-panel-delivery-log" role="tabpanel" aria-labelledby="re-tab-delivery-log">
          <DeliveryLogPage />
        </section>
      )}
      {activeTab === "contacts" && (
        <section id="re-panel-contacts" role="tabpanel" aria-labelledby="re-tab-contacts">
          <ContactsPage />
        </section>
      )}
      {activeTab === "broadcasts" && (
        <section id="re-panel-broadcasts" role="tabpanel" aria-labelledby="re-tab-broadcasts">
          <BroadcastsPage />
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
