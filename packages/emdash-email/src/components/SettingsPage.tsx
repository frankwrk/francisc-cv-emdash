import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Notice, Select } from "./ui.js";

interface ProviderCapabilities {
  audiences: boolean;
  broadcasts: boolean;
  webhookLifecycle: boolean;
  workerProvisioning: boolean;
}

interface ProviderMeta {
  id: "resend" | "cloudflare";
  label: string;
  capabilities: ProviderCapabilities;
}

interface ResendSettings {
  apiKey: string | null;
  fromAddress: string | null;
  fromName: string | null;
  webhookRegistered: boolean;
  webhookId: string | null;
}

interface CloudflareSettings {
  apiToken: string | null;
  authEmail: string | null;
  accountId: string | null;
  zoneId: string | null;
  fromAddress: string | null;
  fromName: string | null;
  sendingDomain: string | null;
  routeAddress: string | null;
  destinationAddress: string | null;
  workerName: string | null;
  workerRuleId: string | null;
  sendEmailBindingName: string | null;
}

interface ReadinessCheck {
  id: string;
  label: string;
  required: boolean;
  ok: boolean;
  detail: string;
}

interface CloudflareReadiness {
  provider: "cloudflare";
  ready: boolean;
  checks: ReadinessCheck[];
  onboarding: {
    sendingSubdomainTag: string | null;
    routingStatus: string | null;
    destinationVerified: boolean | null;
  };
}

interface WorkerStatus {
  configured: boolean;
  reason?: string;
  workerName?: string;
  workerExists?: boolean;
  workerError?: string | null;
  routeRuleId?: string | null;
  routeMatched?: boolean;
  routeError?: string | null;
  routeAddress?: string | null;
  destinationAddress?: string | null;
  scriptUpdatedAt?: string | null;
}

interface SettingsResponse {
  provider: "resend" | "cloudflare";
  providers: ProviderMeta[];
  capabilities: ProviderCapabilities;
  resend: ResendSettings;
  cloudflare: CloudflareSettings;
  cloudflareReadiness: CloudflareReadiness;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [refreshingWorkerStatus, setRefreshingWorkerStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);

  const [provider, setProvider] = useState<"resend" | "cloudflare">("resend");

  const [resendForm, setResendForm] = useState({
    apiKey: "",
    fromAddress: "",
    fromName: "",
  });

  const [cloudflareForm, setCloudflareForm] = useState({
    apiToken: "",
    authEmail: "",
    accountId: "",
    zoneId: "",
    fromAddress: "",
    fromName: "",
    sendingDomain: "",
    routeAddress: "",
    destinationAddress: "",
    workerName: "",
    sendEmailBindingName: "EMAIL_SENDER",
  });

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const current = await api.get<SettingsResponse>("settings");
      setSettings(current);
      setProvider(current.provider);

      setResendForm({
        apiKey: "",
        fromAddress: current.resend.fromAddress ?? "",
        fromName: current.resend.fromName ?? "",
      });

      setCloudflareForm({
        apiToken: "",
        authEmail: current.cloudflare.authEmail ?? "",
        accountId: current.cloudflare.accountId ?? "",
        zoneId: current.cloudflare.zoneId ?? "",
        fromAddress: current.cloudflare.fromAddress ?? "",
        fromName: current.cloudflare.fromName ?? "",
        sendingDomain: current.cloudflare.sendingDomain ?? "",
        routeAddress: current.cloudflare.routeAddress ?? "",
        destinationAddress: current.cloudflare.destinationAddress ?? "",
        workerName: current.cloudflare.workerName ?? "",
        sendEmailBindingName: current.cloudflare.sendEmailBindingName ?? "EMAIL_SENDER",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkerStatus = async () => {
    setRefreshingWorkerStatus(true);
    try {
      const nextStatus = await api.get<WorkerStatus>("settings/cloudflare/worker-status");
      setWorkerStatus(nextStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setWorkerStatus({ configured: false, reason: message });
    } finally {
      setRefreshingWorkerStatus(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    void refreshWorkerStatus();
  }, []);

  const selectedProviderMeta = useMemo(() => {
    return settings?.providers.find((candidate) => candidate.id === provider) ?? null;
  }, [settings?.providers, provider]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);

    try {
      const resendPayload: Record<string, string> = {
        fromAddress: resendForm.fromAddress,
        fromName: resendForm.fromName,
      };
      if (resendForm.apiKey) resendPayload.apiKey = resendForm.apiKey;

      const cloudflarePayload: Record<string, string> = {
        authEmail: cloudflareForm.authEmail,
        accountId: cloudflareForm.accountId,
        zoneId: cloudflareForm.zoneId,
        fromAddress: cloudflareForm.fromAddress,
        fromName: cloudflareForm.fromName,
        sendingDomain: cloudflareForm.sendingDomain,
        routeAddress: cloudflareForm.routeAddress,
        destinationAddress: cloudflareForm.destinationAddress,
        workerName: cloudflareForm.workerName,
        sendEmailBindingName: cloudflareForm.sendEmailBindingName,
      };
      if (cloudflareForm.apiToken) cloudflarePayload.apiToken = cloudflareForm.apiToken;

      await api.post("settings/save", {
        provider,
        resend: resendPayload,
        cloudflare: cloudflarePayload,
      });

      await loadSettings();
      setResendForm((prev) => ({ ...prev, apiKey: "" }));
      setCloudflareForm((prev) => ({ ...prev, apiToken: "" }));
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
      await api.post("settings/test", {
        provider,
        to: testTo || undefined,
      });
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
      await loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleProvisionWorker = async () => {
    setProvisioning(true);
    setError(null);

    try {
      await api.post("settings/cloudflare/provision-worker", {
        workerName: cloudflareForm.workerName,
        routeAddress: cloudflareForm.routeAddress,
        destinationAddress: cloudflareForm.destinationAddress,
        sendEmailBindingName: cloudflareForm.sendEmailBindingName,
      });

      await Promise.all([loadSettings(), refreshWorkerStatus()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setProvisioning(false);
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
        <h1 className="re-title">Email Provider Settings</h1>
        <p className="re-subtitle">Configure Resend or Cloudflare Email Service, then verify readiness before live sends.</p>
      </header>

      <section className="re-metrics" aria-label="Configuration metrics">
        <article className="re-metric">
          <p className="re-metric-label">Active provider</p>
          <p className="re-metric-value">{selectedProviderMeta?.label ?? provider}</p>
          <p className="re-metric-note">Controls `email:deliver` transport</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Resend webhook</p>
          <p className="re-metric-value">{settings.resend.webhookRegistered ? "Active" : "Inactive"}</p>
          <p className="re-metric-note">Used only when Resend is active</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Cloudflare readiness</p>
          <p className="re-metric-value">{settings.cloudflareReadiness.ready ? "Ready" : "Needs setup"}</p>
          <p className="re-metric-note">Preflight checks for domain + routing</p>
        </article>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Provider selection</CardTitle>
        </CardHeader>
        <CardContent className="re-grid re-grid--2">
          <Label>
            Active provider
            <Select
              value={provider}
              onChange={(event) => setProvider(event.target.value as "resend" | "cloudflare")}
            >
              {settings.providers.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </Select>
          </Label>
          <div className="re-field-note">
            Contacts/Broadcasts are available only for providers that support those capabilities.
          </div>
        </CardContent>
      </Card>

      <div className="re-subgrid">
        <div className="re-stack">
          <Card>
            <CardHeader>
              <CardTitle>Resend configuration</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              {settings.resend.apiKey && (
                <div className="re-field-note">
                  Current API key: <span className="re-kbd">{settings.resend.apiKey}</span>
                </div>
              )}
              <Label>
                New Resend API key
                <Input
                  type="password"
                  placeholder="re_live_... (leave blank to keep current)"
                  value={resendForm.apiKey}
                  onChange={(event) => setResendForm({ ...resendForm, apiKey: event.target.value })}
                />
              </Label>
              <Label>
                Default from address
                <Input
                  type="email"
                  value={resendForm.fromAddress}
                  onChange={(event) => setResendForm({ ...resendForm, fromAddress: event.target.value })}
                />
              </Label>
              <Label>
                Default from name
                <Input
                  value={resendForm.fromName}
                  onChange={(event) => setResendForm({ ...resendForm, fromName: event.target.value })}
                />
              </Label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cloudflare Email Service configuration</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              {settings.cloudflare.apiToken && (
                <div className="re-field-note">
                  Current API credential: <span className="re-kbd">{settings.cloudflare.apiToken}</span>
                </div>
              )}
              <div className="re-grid re-grid--2">
                <Label>
                  New API token or API key
                  <Input
                    type="password"
                    placeholder="Cloudflare API token or Global API key"
                    value={cloudflareForm.apiToken}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, apiToken: event.target.value })}
                  />
                </Label>
                <Label>
                  Auth email (for Global API key)
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={cloudflareForm.authEmail}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, authEmail: event.target.value })}
                  />
                </Label>
              </div>
              <div className="re-grid re-grid--2">
                <Label>
                  Account ID
                  <Input
                    value={cloudflareForm.accountId}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, accountId: event.target.value })}
                  />
                </Label>
                <Label>
                  Zone ID
                  <Input
                    value={cloudflareForm.zoneId}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, zoneId: event.target.value })}
                  />
                </Label>
              </div>
              <div className="re-grid re-grid--2">
                <Label>
                  Sender address
                  <Input
                    type="email"
                    value={cloudflareForm.fromAddress}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, fromAddress: event.target.value })}
                  />
                </Label>
                <Label>
                  Sender name
                  <Input
                    value={cloudflareForm.fromName}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, fromName: event.target.value })}
                  />
                </Label>
              </div>
              <div className="re-grid re-grid--2">
                <Label>
                  Sending domain (must be onboarded)
                  <Input
                    placeholder="example.com"
                    value={cloudflareForm.sendingDomain}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, sendingDomain: event.target.value })}
                  />
                </Label>
                <Label>
                  Email Worker name
                  <Input
                    placeholder="emdash-email-worker"
                    value={cloudflareForm.workerName}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, workerName: event.target.value })}
                  />
                </Label>
              </div>
              <div className="re-grid re-grid--2">
                <Label>
                  Route address (custom address or full email)
                  <Input
                    placeholder="support@example.com"
                    value={cloudflareForm.routeAddress}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, routeAddress: event.target.value })}
                  />
                </Label>
                <Label>
                  Destination address (must be verified)
                  <Input
                    type="email"
                    placeholder="inbox@example.com"
                    value={cloudflareForm.destinationAddress}
                    onChange={(event) => setCloudflareForm({ ...cloudflareForm, destinationAddress: event.target.value })}
                  />
                </Label>
              </div>
              <Label>
                Send-email binding name
                <Input
                  value={cloudflareForm.sendEmailBindingName}
                  onChange={(event) => setCloudflareForm({ ...cloudflareForm, sendEmailBindingName: event.target.value })}
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
                  placeholder="Defaults to provider sender address"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                />
              </Label>
              <div className="re-inline-actions">
                <Button onClick={() => void handleTest()}>
                  Send test email via {provider === "cloudflare" ? "Cloudflare" : "Resend"}
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
              <CardTitle>Resend webhook</CardTitle>
            </CardHeader>
            <CardContent className="re-stack">
              <Notice tone={settings.resend.webhookRegistered ? "success" : "danger"}>
                {settings.resend.webhookRegistered ? "Registered" : "Not registered"}
              </Notice>
              {settings.resend.webhookId && (
                <div className="re-field-note">
                  ID: <span className="re-kbd">{settings.resend.webhookId}</span>
                </div>
              )}
              {!settings.resend.webhookRegistered && (
                <div>
                  <Button onClick={() => void handleRegisterWebhook()} disabled={registering}>
                    {registering ? "Registering..." : "Register webhook"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare requirements checklist</CardTitle>
        </CardHeader>
        <CardContent className="re-stack">
          <Notice tone={settings.cloudflareReadiness.ready ? "success" : "neutral"}>
            {settings.cloudflareReadiness.ready
              ? "Cloudflare provider is ready for live sending."
              : "Cloudflare provider is not ready yet. Complete required checks below."}
          </Notice>

          {settings.cloudflareReadiness.checks.map((check) => (
            <div key={check.id} className="re-field-note">
              <strong>{check.ok ? "PASS" : (check.required ? "FAIL" : "INFO")}</strong>
              {" "}
              {check.label}
              {" — "}
              {check.detail}
            </div>
          ))}

          <div className="re-field-note">
            Routing status: <span className="re-kbd">{settings.cloudflareReadiness.onboarding.routingStatus ?? "unknown"}</span>
          </div>
          <div className="re-field-note">
            Sending subdomain tag: <span className="re-kbd">{settings.cloudflareReadiness.onboarding.sendingSubdomainTag ?? "not found"}</span>
          </div>

          <div className="re-inline-actions">
            <Button onClick={() => void loadSettings()} disabled={loading}>Refresh checklist</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare Email Worker provisioning</CardTitle>
        </CardHeader>
        <CardContent className="re-stack">
          <Notice>
            This action uploads/updates a Worker script and creates an Email Routing rule with `Send to Worker`.
          </Notice>

          <div className="re-inline-actions">
            <Button
              onClick={() => void handleProvisionWorker()}
              disabled={provisioning}
            >
              {provisioning ? "Provisioning..." : "Create or update Email Worker"}
            </Button>
            <Button variant="outline" onClick={() => void refreshWorkerStatus()} disabled={refreshingWorkerStatus}>
              {refreshingWorkerStatus ? "Refreshing..." : "Refresh worker status"}
            </Button>
          </div>

          {workerStatus && (
            <div className="re-stack">
              <Notice tone={workerStatus.configured ? "success" : "neutral"}>
                {workerStatus.configured
                  ? "Worker and routing rule are configured."
                  : (workerStatus.reason ?? "Worker setup is incomplete.")}
              </Notice>
              <div className="re-field-note">Worker exists: <span className="re-kbd">{String(Boolean(workerStatus.workerExists))}</span></div>
              <div className="re-field-note">Route rule matched: <span className="re-kbd">{String(Boolean(workerStatus.routeMatched))}</span></div>
              <div className="re-field-note">Route rule ID: <span className="re-kbd">{workerStatus.routeRuleId ?? "n/a"}</span></div>
              <div className="re-field-note">Last script update: <span className="re-kbd">{workerStatus.scriptUpdatedAt ?? "n/a"}</span></div>
              {workerStatus.workerError && (
                <Notice tone="danger">Worker check error: {workerStatus.workerError}</Notice>
              )}
              {workerStatus.routeError && (
                <Notice tone="danger">Route check error: {workerStatus.routeError}</Notice>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}
    </div>
  );
}
