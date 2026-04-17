export async function handleGetDeliveries(ctx: any): Promise<{ items: unknown[]; cursor?: string; hasMore: boolean }> {
  const q = new URL(ctx.request.url).searchParams;
  const limit = parseInt(q.get("limit") ?? "50", 10);
  const cursor = q.get("cursor") ?? undefined;
  const status = q.get("status") ?? undefined;

  const result = await ctx.storage.deliveries.query({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    limit: Math.min(Math.max(1, limit), 100),
    cursor,
  });

  return {
    items: result.items.map((item: any) => ({ id: item.id, ...item.data })),
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
}

export async function handleGetDeliveryStats(ctx: any): Promise<{
  totalSent: number;
  deliveryRate: number;
  bounceRate: number;
}> {
  const [totalSent, delivered, bounced] = await Promise.all([
    ctx.storage.deliveries.count(),
    ctx.storage.deliveries.count({ status: "delivered" }),
    ctx.storage.deliveries.count({ status: "bounced" }),
  ]);

  return { totalSent, deliveryRate: delivered, bounceRate: bounced };
}
