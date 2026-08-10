import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePrinter } from '../context/PrinterContext';
import api from '../lib/api';
import { toast } from 'sonner';
import type { KitchenSlip } from '../lib/escpos';
import { claimForAutoPrint } from '../lib/printedOrdersTracker';

const POLL_MS = 5_000;

// Shape of an order returned by GET /orders?branchId=X
interface OrderFromApi {
  id:          number;
  orderNumber: string;
  source:      string;
  createdAt:   string;
  table?:      { name: string } | null;
  items:       Array<{
    name:     string;
    quantity: number;
    price:    number;
    notes?:   string | null;
    options:  Array<{ name: string; price: number }>;
  }>;
}

function orderToSlip(order: OrderFromApi): KitchenSlip {
  return {
    orderNumber: order.orderNumber,
    tableName:   order.table?.name,
    dateTime:    new Date(order.createdAt).toLocaleString('th-TH'),
    items: order.items.map(item => ({
      name:      item.name,
      qty:       item.quantity,
      unitPrice: item.price,
      options:   item.options?.map(o => ({ name: o.name, price: o.price })),
      notes:     item.notes ?? undefined,
    })),
  };
}

interface Props {
  branchId: string | undefined;
}

/**
 * Invisible component mounted inside the POS Dashboard.
 *
 * Strategy:
 *   1. Poll GET /orders?branchId=X&status=PENDING every 5 s (always works).
 *   2. If Supabase credentials are present, also subscribe to Realtime INSERT
 *      for instant notification (the two share the same seenIds set so a
 *      single order is never printed twice).
 *
 * Printer: uses PrinterContext (Bluetooth). Falls back silently when not connected.
 */
export function OrderRealtimeListener({ branchId }: Props) {
  const { enqueuePrintJob } = usePrinter();

  // Stable ref — avoids the effect needing enqueuePrintJob in deps
  const enqueueRef  = useRef(enqueuePrintJob);
  const seenIds     = useRef<Set<number>>(new Set());
  const isFirstPoll = useRef(true);

  useEffect(() => { enqueueRef.current = enqueuePrintJob; }, [enqueuePrintJob]);

  useEffect(() => {
    if (!branchId) return;
    const bid = parseInt(branchId, 10);

    // ── Core print handler ────────────────────────────────────────────────
    const printOrder = async (order: OrderFromApi) => {
      if (!['QR', 'CUSTOMER'].includes(order.source)) return;
      // Cross-component dedup — skip if KitchenDisplay (or another tab-local
      // listener) already auto-printed this order.
      if (!claimForAutoPrint(branchId, order.id)) return;

      const tableName = order.table?.name;
      toast.info(`ออเดอร์ใหม่ #${order.orderNumber}`, {
        description: tableName ? `โต๊ะ ${tableName}` : 'Counter',
        duration: 5_000,
      });

      // Enqueue instead of printing directly — when several tables order within
      // the same few milliseconds, the FIFO queue in PrinterContext drains them
      // one at a time so their raster streams never overlap on the printer.
      enqueueRef.current(orderToSlip(order), 'KITCHEN_SLIP');
    };

    // ── Polling (primary — no Supabase needed) ────────────────────────────
    const poll = async () => {
      try {
        const res = await api.get<{ orders: OrderFromApi[] }>(
          `/orders?branchId=${bid}&status=PENDING&limit=20`,
        );
        const orders: OrderFromApi[] = res.data?.orders ?? [];

        const toProcess: OrderFromApi[] = [];
        for (const order of orders) {
          if (!seenIds.current.has(order.id)) {
            seenIds.current.add(order.id);
            if (!isFirstPoll.current) toProcess.push(order);
          }
        }
        isFirstPoll.current = false;

        // Sequential so prints don't overlap
        for (const order of toProcess) {
          await printOrder(order);
        }
      } catch {
        // silent on network errors — next poll will retry
      }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);

    // ── Supabase Realtime (optional — fires faster when configured) ────────
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    if (supabase) {
      channel = supabase
        .channel(`orders-qr-branch-${branchId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'Order' },
          async (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (Number(row.branchId) !== bid) return;

            const id = Number(row.id);
            if (seenIds.current.has(id)) return; // already handled by poll
            seenIds.current.add(id);

            try {
              const res = await api.get<OrderFromApi>(`/orders/${id}`);
              await printOrder(res.data);
            } catch {
              // poll will pick it up in ≤ 5 s
            }
          },
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [branchId]);

  return null;
}
