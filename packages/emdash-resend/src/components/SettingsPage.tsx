import { useEffect, useState } from "react";
import { api } from "./api.js";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Notice } from "./ui.js";

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
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const current = await api.get("settings") as Settings;
        setSettings(current);
        setForm({
          apiKey: "",
          fromAddress: current.fromAddress ?? "",
          fromName: current.fromName ?? "",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const refresh = async () => {
    const updated = await api.get("settings") as Settings;
    setSettings(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    setError(null);
    try {
      const payload: Record<string, string> = {
        fromAddress: form.fromAddress,
        fromName: form.fromName,
      };
      if (form.apiKey) payload.apiKey = form.apiKey;
      await api.post("settings/save", payload);
      await refresh();
      setForm((prev) => ({ ...prev, apiKey: "" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    setError(null);
    try {
      await api.post("settings/test", testTo ? { to: testTo } : {});
      setTestResult({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({ error: message || "Test failed" });
    }
  };

  const handleRegisterWebhook = async () => {
    setRegistering(true);
    setError(null);
    try {
      await api.post("settings/webhook-register", {});
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="re-page">
        <Notice>Loading settings...</Notice>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="re-page">
        <Notice tone="danger">Unable to load settings.</Notice>
      </div>
    );
  }

  return (
    <div className="re-page re-stack">
      <header>
        <h1 className="re-title">Resend Settings</h1>
        <p className="re-subtitle">Configure API credentials, sender defaults, and webhook registration.</p>
      </header>

      <section className="re-metrics" aria-label="Configuration metrics">
        <article className="re-metric">
          <p className="re-metric-label">API key</p>
          <p className="re-metric-value">{settings.apiKey ? "Configured" : "Missing"}</p>
          <p className="re-metric-note">Required for all provider calls</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Sender profile</p>
          <p className="re-metric-value">{settings.fromAddress ? "Ready" : "Incomplete"}</p>
          <p className="re-metric-note">From name + address defaults</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Webhook</p>
          <p className="re-metric-value">{settings.webhookRegistered ? "Active" : "Inactive"}</p>
          <p className="re-metric-note">Event ingestion and delivery log sync</p>
        </article>
      </section>

      <div className="re-subgrid">
        <div className="re-stack">
          <Card>
            <CardHeader>
              <CardTitle>API key</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              {settings.apiKey && (
                <div className="re-field-note">
                  Current: <span className="re-kbd">{settings.apiKey}</span>
                </div>
              )}
              <Label>
                New API key
                <Input
                  type="password"
                  placeholder="re_live_... (leave blank to keep existing)"
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                />
              </Label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default sender</CardTitle>
            </CardHeader>
            <CardContent className="re-grid re-grid--2">
              <Label>
                From name
                <Input
                  value={form.fromName}
                  onChange={(event) => setForm({ ...form, fromName: event.target.value })}
                />
              </Label>
              <Label>
                From address
                <Input
                  type="email"
                  value={form.fromAddress}
                  onChange={(event) => setForm({ ...form, fromAddress: event.target.value })}
                />
              </Label>
            </CardContent>
          </Card>

          <div className="re-inline-actions">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>

        <div className="re-stack">
          <Card>
            <CardHeader>
              <CardTitle>Send test email</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              <Label>
                Send to (optional)
                <Input
                  type="email"
                  placeholder="Defaults to signed-in user, then From address"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                />
              </Label>
              <div className="re-inline-actions">
                <Button onClick={() => void handleTest()} disabled={!settings.apiKey}>
                  Send test email
                </Button>
              </div>
              {testResult?.success && (
                <Notice tone="success">
                  Test email sent{testTo ? ` to ${testTo}` : ""}.
                </Notice>
              )}
              {testResult?.error && (
                <Notice tone="danger">{testResult.error}</Notice>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              <Notice tone={settings.webhookRegistered ? "success" : "danger"}>
                {settings.webhookRegistered ? "Registered" : "Not registered"}
              </Notice>
              {settings.webhookId && (
                <div className="re-field-note">
                  ID: <span className="re-kbd">{settings.webhookId}</span>
                </div>
              )}
              {!settings.webhookRegistered && (
                <div>
                  <Button onClick={() => void handleRegisterWebhook()} disabled={registering || !settings.apiKey}>
                    {registering ? "Registering..." : "Register webhook"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
