import { useEffect, useState } from "react";
import { api } from "./api.js";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Notice,
  Select,
  Table,
  Textarea,
} from "./ui.js";

interface Broadcast {
  id: string;
  name: string;
  audience_id: string;
  status: string;
  created_at: string;
}

interface Audience {
  id: string;
  name: string;
}

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    audienceId: "",
    from: "",
    subject: "",
    html: "",
  });

  const fetchBroadcasts = async () => {
    const response = await api.get("broadcasts") as { data?: Broadcast[] };
    setBroadcasts(response.data ?? []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [broadcastResponse, audienceResponse] = await Promise.all([
          api.get("broadcasts") as Promise<{ data?: Broadcast[] }>,
          api.get("audiences") as Promise<{ data?: Audience[] }>,
        ]);

        const nextAudiences = audienceResponse.data ?? [];
        setBroadcasts(broadcastResponse.data ?? []);
        setAudiences(nextAudiences);

        if (nextAudiences.length > 0) {
          setForm((prev) => ({ ...prev, audienceId: nextAudiences[0].id }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleCreate = async () => {
    if (!form.audienceId || !form.from || !form.subject) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("broadcasts/create", form);
      await fetchBroadcasts();
      setComposing(false);
      setForm((prev) => ({ ...prev, name: "", subject: "", html: "" }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (broadcastId: string) => {
    setSending(broadcastId);
    setError(null);
    try {
      await api.post("broadcasts/send", { broadcastId });
      await fetchBroadcasts();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSending(null);
    }
  };

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" | "muted" => {
    const normalized = status.toLowerCase();
    if (normalized === "sent" || normalized === "completed") return "success";
    if (normalized === "processing" || normalized === "queued") return "warning";
    if (normalized === "canceled" || normalized === "failed") return "destructive";
    if (normalized === "draft") return "muted";
    return "default";
  };

  return (
    <div className="re-page re-stack">
      <div className="re-page-header">
        <header>
          <h1 className="re-title">Broadcasts</h1>
          <p className="re-subtitle">Compose, draft, and send campaigns to selected audiences.</p>
        </header>
        <Button onClick={() => setComposing((prev) => !prev)}>
          {composing ? "Close composer" : "New broadcast"}
        </Button>
      </div>

      {composing && (
        <Card>
          <CardHeader>
            <CardTitle>Compose broadcast</CardTitle>
          </CardHeader>
          <CardContent className="re-stack">
            <div className="re-grid re-grid--2">
              <Label>
                Name (optional)
                <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </Label>
              <Label>
                Audience *
                <Select value={form.audienceId} onChange={(event) => setForm({ ...form, audienceId: event.target.value })}>
                  {audiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                From *
                <Input
                  type="email"
                  placeholder="newsletter@example.com"
                  value={form.from}
                  onChange={(event) => setForm({ ...form, from: event.target.value })}
                />
              </Label>
              <Label>
                Subject *
                <Input
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                />
              </Label>
            </div>

            <Label>
              HTML content
              <Textarea
                value={form.html}
                onChange={(event) => setForm({ ...form, html: event.target.value })}
              />
            </Label>

            <div className="re-inline-actions">
              <Button onClick={() => void handleCreate()} disabled={saving || !form.audienceId || !form.from || !form.subject}>
                {saving ? "Saving..." : "Save as draft"}
              </Button>
              <Button variant="ghost" onClick={() => setComposing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <Notice tone="danger">{error}</Notice>}
      {loading && <Notice>Loading broadcasts...</Notice>}
      {!loading && broadcasts.length === 0 && !error && (
        <Notice>No broadcasts yet. Create your first draft to get started.</Notice>
      )}

      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {broadcasts.map((broadcast) => (
            <tr key={broadcast.id}>
              <td>{broadcast.name || <span className="re-mut">Untitled</span>}</td>
              <td>
                <Badge variant={getStatusVariant(broadcast.status)}>
                  {broadcast.status}
                </Badge>
              </td>
              <td className="re-kbd">{new Date(broadcast.created_at).toLocaleString()}</td>
              <td>
                {broadcast.status === "draft" ? (
                  <Button
                    size="sm"
                    onClick={() => void handleSend(broadcast.id)}
                    disabled={sending === broadcast.id}
                  >
                    {sending === broadcast.id ? "Sending..." : "Send now"}
                  </Button>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
