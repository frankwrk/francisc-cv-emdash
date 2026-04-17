import { useState, useEffect } from "react";
import { api } from "./api.js";

interface Broadcast { id: string; name: string; audience_id: string; status: string; created_at: string }
interface Audience { id: string; name: string }

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    audienceId: "",
    from: "",
    subject: "",
    html: "",
  });

  useEffect(() => {
    Promise.all([
      api.get("broadcasts"),
      api.get("audiences"),
    ]).then(([bc, aud]: any[]) => {
      setBroadcasts(bc.data ?? []);
      const audList = aud.data ?? [];
      setAudiences(audList);
      if (audList.length > 0) setForm((f) => ({ ...f, audienceId: audList[0].id }));
    });
  }, []);

  const handleCreate = async () => {
    if (!form.audienceId || !form.from || !form.subject) return;
    await api.post("broadcasts/create", form);
    const updated = await api.get("broadcasts") as any;
    setBroadcasts(updated.data ?? []);
    setComposing(false);
    setForm((f) => ({ ...f, name: "", subject: "", html: "" }));
  };

  const handleSend = async (broadcastId: string) => {
    setSending(broadcastId);
    try {
      await api.post("broadcasts/send", { broadcastId });
      const updated = await api.get("broadcasts") as any;
      setBroadcasts(updated.data ?? []);
    } finally {
      setSending(null);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Broadcasts</h1>
        <button onClick={() => setComposing(true)}>New broadcast</button>
      </div>

      {composing && (
        <div style={{ marginBottom: "2rem", padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Compose broadcast</h2>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Name (optional)
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Audience *
            <select value={form.audienceId} onChange={(e) => setForm({ ...form, audienceId: e.target.value })} style={{ display: "block" }}>
              {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            From *
            <input type="email" placeholder="newsletter@example.com" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "0.75rem" }}>
            Subject *
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={{ display: "block", width: "100%" }} />
          </label>

          <label style={{ display: "block", marginBottom: "1rem" }}>
            HTML content
            <textarea
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
              rows={10}
              style={{ display: "block", width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
            />
          </label>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleCreate}>Save as draft</button>
            <button onClick={() => setComposing(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Name</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Created</th>
            <th style={{ padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {broadcasts.map((b) => (
            <tr key={b.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "0.5rem" }}>{b.name || <span style={{ color: "#888" }}>Untitled</span>}</td>
              <td style={{ padding: "0.5rem" }}>{b.status}</td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>{new Date(b.created_at).toLocaleString()}</td>
              <td style={{ padding: "0.5rem" }}>
                {b.status === "draft" && (
                  <button
                    onClick={() => handleSend(b.id)}
                    disabled={sending === b.id}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {sending === b.id ? "Sending…" : "Send now"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
