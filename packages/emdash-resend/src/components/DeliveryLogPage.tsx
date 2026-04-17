import { useState, useEffect } from "react";
import { api } from "./api.js";

type DeliveryStatus = "sent" | "delivered" | "bounced" | "complained" | "delayed";

interface Delivery {
  id: string;
  resendId: string;
  to: string;
  subject: string;
  status: DeliveryStatus;
  createdAt: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  sent: "#888",
  delivered: "#16a34a",
  bounced: "#dc2626",
  complained: "#d97706",
  delayed: "#64748b",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
  { value: "delayed", label: "Delayed" },
];

export function DeliveryLogPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (filter: string, cur?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (filter) params.set("status", filter);
    if (cur) params.set("cursor", cur);

    const result = await api.get(`deliveries?${params}`) as {
      items: Delivery[];
      cursor?: string;
      hasMore: boolean;
    };

    setDeliveries((prev) => cur ? [...prev, ...result.items] : result.items);
    setCursor(result.cursor);
    setHasMore(result.hasMore);
    setLoading(false);
  };

  useEffect(() => { load(status); }, [status]);

  const handleFilterChange = (f: string) => {
    setStatus(f);
    setDeliveries([]);
    setCursor(undefined);
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Delivery Log</h1>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            style={{ fontWeight: status === f.value ? "bold" : "normal" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "0.5rem" }}>Recipient</th>
            <th style={{ padding: "0.5rem" }}>Subject</th>
            <th style={{ padding: "0.5rem" }}>Status</th>
            <th style={{ padding: "0.5rem" }}>Sent</th>
            <th style={{ padding: "0.5rem" }}>Opened</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr
              key={d.id}
              onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
              style={{ cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
            >
              <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.85rem" }}>{d.to}</td>
              <td style={{ padding: "0.5rem" }}>{d.subject}</td>
              <td style={{ padding: "0.5rem" }}>
                <span style={{ color: STATUS_COLORS[d.status] ?? "#888", fontWeight: 500 }}>
                  {d.status}
                </span>
              </td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                {new Date(d.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                {d.openedAt ? new Date(d.openedAt).toLocaleString() : "—"}
              </td>
              {selectedId === d.id && (
                <td colSpan={5} style={{ padding: "0.5rem", background: "#f9fafb", fontSize: "0.8rem", fontFamily: "monospace" }}>
                  Resend ID: {d.resendId}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <button onClick={() => load(status, cursor)} style={{ marginTop: "1rem" }}>
          Load more
        </button>
      )}
    </div>
  );
}
