import { useState, useEffect } from "react";
import { api } from "./api.js";

interface Settings {
  apiKey: string | null;
  fromAddress: string | null;
  fromName: string | null;
  webhookRegistered: boolean;
  webhookId: string | null;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({ apiKey: "", fromAddress: "", fromName: "" });
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    api.get("settings").then((data) => {
      const s = data as Settings;
      setSettings(s);
      setForm({
        apiKey: "",
        fromAddress: s.fromAddress ?? "",
        fromName: s.fromName ?? "",
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, string> = {
        fromAddress: form.fromAddress,
        fromName: form.fromName,
      };
      if (form.apiKey) payload.apiKey = form.apiKey;
      await api.post("settings/save", payload);
      const updated = await api.get("settings") as Settings;
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      await api.post("settings/test", testTo ? { to: testTo } : {});
      setTestResult({ success: true });
    } catch (e: any) {
      setTestResult({ error: e.message ?? "Test failed" });
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    try {
      await api.post("settings/webhook-register", {});
      const updated = await api.get("settings") as Settings;
      setSettings(updated);
    } finally {
      setRegistering(false);
    }
  };

  if (!settings) return <div>Loading…</div>;

  return (
    <div style={{ maxWidth: 560, padding: "2rem" }}>
      <h1>Resend Settings</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>API Key</h2>
        {settings.apiKey && (
          <p style={{ fontFamily: "monospace", color: "#888" }}>Current: {settings.apiKey}</p>
        )}
        <input
          type="password"
          placeholder="re_live_… (leave blank to keep existing)"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          style={{ display: "block", width: "100%", marginBottom: "0.5rem" }}
        />
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Default Sender</h2>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          From name
          <input
            type="text"
            value={form.fromName}
            onChange={(e) => setForm({ ...form, fromName: e.target.value })}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label style={{ display: "block" }}>
          From address
          <input
            type="email"
            value={form.fromAddress}
            onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      </section>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <section style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: 6 }}>
        <h3 style={{ marginTop: 0 }}>Send test email</h3>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Send to (optional — defaults to your signed-in user email, falling back to the From address)
          <input
            type="email"
            placeholder="test@example.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <button onClick={handleTest} disabled={!settings.apiKey}>
          Send test email
        </button>
        {testResult && (
          <p style={{ color: testResult.success ? "green" : "red", marginBottom: 0 }}>
            {testResult.success ? `Test email sent${testTo ? ` to ${testTo}` : ""}.` : testResult.error}
          </p>
        )}
      </section>

      <section>
        <h2>
          Webhook{" "}
          <span style={{ color: settings.webhookRegistered ? "green" : "red" }}>
            {settings.webhookRegistered ? "✓ registered" : "✗ not registered"}
          </span>
        </h2>
        {settings.webhookId && (
          <p style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "#888" }}>
            ID: {settings.webhookId}
          </p>
        )}
        {!settings.webhookRegistered && (
          <button onClick={handleRegisterWebhook} disabled={registering || !settings.apiKey}>
            {registering ? "Registering…" : "Register webhook"}
          </button>
        )}
      </section>
    </div>
  );
}
