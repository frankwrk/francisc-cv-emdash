import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { Badge, Button, Notice, Table } from "./ui.js";

type DeliveryStatus = "sent" | "delivered" | "bounced" | "complained" | "delayed";

interface Delivery {
  id: string;
  provider?: string;
  providerMessageId?: string;
  resendId?: string;
  to: string;
  subject: string;
  status: DeliveryStatus;
  createdAt: string;
  openedAt?: string;
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
  { value: "delayed", label: "Delayed" },
];

function getBadgeVariant(value: DeliveryStatus): "default" | "success" | "warning" | "destructive" | "muted" {
  if (value === "delivered") return "success";
  if (value === "bounced") return "destructive";
  if (value === "complained") return "warning";
  if (value === "delayed") return "muted";
  return "default";
}

export function DeliveryLogPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async (filter: string, cur?: string) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "50" });
    if (filter) params.set("status", filter);
    if (cur) params.set("cursor", cur);

    try {
      const result = await api.get(`deliveries?${params}`) as {
        items: Delivery[];
        cursor?: string;
        hasMore: boolean;
      };

      setDeliveries((prev) => (cur ? [...prev, ...result.items] : result.items));
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(status);
  }, [status]);

  const handleFilterChange = (value: string) => {
    setStatus(value);
    setSelectedId(null);
    setDeliveries([]);
    setCursor(undefined);
  };

  const metrics = useMemo(() => {
    const total = deliveries.length;
    const delivered = deliveries.filter((item) => item.status === "delivered").length;
    const opened = deliveries.filter((item) => Boolean(item.openedAt)).length;
    const bounced = deliveries.filter((item) => item.status === "bounced").length;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;

    return { total, delivered, bounced, opened, deliveryRate, openRate };
  }, [deliveries]);

  return (
    <div className="re-page re-stack">
      <header>
        <h1 className="re-title">Delivery Log</h1>
        <p className="re-subtitle">Inspect recipient-level delivery activity, opens, and provider event details.</p>
      </header>

      <section className="re-metrics" aria-label="Delivery metrics">
        <article className="re-metric">
          <p className="re-metric-label">Loaded events</p>
          <p className="re-metric-value">{metrics.total}</p>
          <p className="re-metric-note">Current filtered dataset</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Delivered</p>
          <p className="re-metric-value">{metrics.delivered}</p>
          <p className="re-metric-note">{metrics.deliveryRate}% delivery rate</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Opened</p>
          <p className="re-metric-value">{metrics.opened}</p>
          <p className="re-metric-note">{metrics.openRate}% open rate (of delivered)</p>
        </article>
        <article className="re-metric">
          <p className="re-metric-label">Bounced</p>
          <p className="re-metric-value">{metrics.bounced}</p>
          <p className="re-metric-note">Investigate sender/domain health</p>
        </article>
      </section>

      <div className="re-inline-actions">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            onClick={() => handleFilterChange(filter.value)}
            variant={status === filter.value ? "default" : "ghost"}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}
      {loading && <Notice>Loading deliveries...</Notice>}
      {!loading && deliveries.length === 0 && !error && (
        <Notice>No events yet. Once provider webhooks and sends complete, deliveries will appear here.</Notice>
      )}

      <Table>
        <thead>
          <tr>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Opened</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => {
            const providerMessageId = delivery.providerMessageId ?? delivery.resendId ?? delivery.id;

            return (
              <Fragment key={delivery.id}>
                <tr>
                  <td>
                    <button
                      className="re-table-row-button"
                      onClick={() => setSelectedId(selectedId === delivery.id ? null : delivery.id)}
                      aria-expanded={selectedId === delivery.id}
                      type="button"
                    >
                      <span className="re-kbd">{delivery.to}</span>
                    </button>
                  </td>
                  <td>{delivery.subject}</td>
                  <td>
                    <Badge variant={getBadgeVariant(delivery.status)}>
                      {delivery.status}
                    </Badge>
                  </td>
                  <td className="re-kbd">{new Date(delivery.createdAt).toLocaleString()}</td>
                  <td className="re-kbd">{delivery.openedAt ? new Date(delivery.openedAt).toLocaleString() : "—"}</td>
                </tr>
                {selectedId === delivery.id && (
                  <tr>
                    <td colSpan={5}>
                      <div className="re-notice">
                        <strong>Provider:</strong> <span className="re-kbd">{delivery.provider ?? "resend"}</span>
                        <br />
                        <strong>Provider Message ID:</strong>{" "}
                        <span className="re-kbd">{providerMessageId}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>

      {hasMore && (
        <div>
          <Button variant="outline" onClick={() => void load(status, cursor)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
