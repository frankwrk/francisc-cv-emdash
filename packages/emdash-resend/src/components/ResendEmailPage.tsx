import { useMemo, useState, useEffect } from "react";
import { SettingsPage } from "./SettingsPage.js";
import { DeliveryLogPage } from "./DeliveryLogPage.js";
import { ContactsPage } from "./ContactsPage.js";
import { BroadcastsPage } from "./BroadcastsPage.js";

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
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          padding: "1rem 1.5rem 0.5rem",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          background: "var(--emdash-surface, #fff)",
          zIndex: 1,
        }}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: "1px solid #d1d5db",
                background: active ? "#111827" : "#fff",
                color: active ? "#fff" : "#111827",
                fontWeight: 600,
                fontSize: "0.875rem",
                borderRadius: 8,
                padding: "0.45rem 0.75rem",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "delivery-log" && <DeliveryLogPage />}
      {activeTab === "contacts" && <ContactsPage />}
      {activeTab === "broadcasts" && <BroadcastsPage />}
      {activeTab === "settings" && <SettingsPage />}
    </div>
  );
}
