import { useState, useEffect } from "react";
import { api } from "./api.js";

export function DeliveryStatsWidget() {
  const [stats, setStats] = useState<{ totalSent: number; deliveryRate: number; bounceRate: number } | null>(null);

  useEffect(() => {
    api.get("deliveries/stats").then((s) => setStats(s as any));
  }, []);

  if (!stats) return <div style={{ padding: "1rem" }}>Loading…</div>;

  const deliveryPct = stats.totalSent ? Math.round((stats.deliveryRate / stats.totalSent) * 100) : 0;
  const bouncePct = stats.totalSent ? Math.round((stats.bounceRate / stats.totalSent) * 100) : 0;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{stats.totalSent}</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Sent (30d)</div>
        </div>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#16a34a" }}>{deliveryPct}%</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Delivered</div>
        </div>
        <div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#dc2626" }}>{bouncePct}%</div>
          <div style={{ fontSize: "0.75rem", color: "#888" }}>Bounced</div>
        </div>
      </div>
    </div>
  );
}
