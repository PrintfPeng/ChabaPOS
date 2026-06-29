/**
 * KitchenDisplay.tsx
 * ──────────────────
 * หน้าจอ Kitchen สำหรับพนักงานในครัว (ไม่ใช่หน้าจัดการ)
 *
 * สถาปัตยกรรม Auto-Print:
 *   1. Polling  — ทุก 5 วินาที ดึง GET /orders/branch/:id/kitchen-items
 *   2. Detect   — เปรียบเทียบ orderId ใหม่กับ seenIds ref
 *   3. Print    — ถ้ามี order ใหม่จาก source='QR' → เติมข้อมูลลง #print-zone
 *                 แล้วเรียก window.print() (ไม่ต้องกดยืนยัน)
 *   4. Notify   — Web Audio API เล่นเสียง "ding" ง่ายๆ
 *
 * ข้อดีของ Polling เทียบ WebSocket:
 *   - ไม่ต้องติดตั้ง socket.io เพิ่ม
 *   - รองรับ reconnect อัตโนมัติ
 *   - ง่ายต่อ debug (ดูใน Network tab ได้เลย)
 *   - สามารถ upgrade เป็น SSE/WebSocket ทีหลังโดยไม่เปลี่ยน UI
 *
 * ถ้าต้องการ upgrade เป็น WebSocket ให้เปลี่ยนแค่ฟังก์ชัน startPolling()
 * เป็น useEffect ที่ connect Socket.io แทน
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import {
  UtensilsCrossed, Printer, RefreshCw, Volume2, VolumeX,
  Clock, CheckCircle2, ChefHat, Loader2,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types (mirrors DB shape from /orders/branch/:id/kitchen-items)
// ─────────────────────────────────────────────
interface OrderItemOption { id: number; name: string; price: number }
interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED';
  kitchenId?: number;
  options: OrderItemOption[];
  order: {
    id: number;
    orderNumber: string;
    source?: string;
    createdAt: string;
    table?: { name: string } | null;
  };
}

// Group items by order for display
interface OrderGroup {
  orderId: number;
  orderNumber: string;
  source?: string;
  tableName?: string;
  createdAt: string;
  items: OrderItem[];
  isNew?: boolean;
}

const STATUS_MAP = {
  PENDING: { label: 'รอทำ', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  COOKING: { label: 'กำลังทำ', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  READY:   { label: 'พร้อมเสิร์ฟ', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  SERVED:  { label: 'เสิร์ฟแล้ว', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'COOKING',
  COOKING: 'READY',
  READY: 'SERVED',
};
const NEXT_LABEL: Record<string, string> = {
  PENDING: 'เริ่มทำ',
  COOKING: 'พร้อมแล้ว',
  READY: 'เสิร์ฟแล้ว',
};

// ─────────────────────────────────────────────
// Web Audio — simple "ding" sound (no file needed)
// ─────────────────────────────────────────────
function playDing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not supported — silently ignore
  }
}

// ─────────────────────────────────────────────
// Print receipt for one order group
// ─────────────────────────────────────────────
function buildReceiptHTML(group: OrderGroup): string {
  const lines = group.items
    .map(item => {
      const opts = item.options.length ? `\n  (${item.options.map(o => o.name).join(', ')})` : '';
      const note = item.notes ? `\n  * ${item.notes}` : '';
      return `${item.quantity}x ${item.name}${opts}${note}`;
    })
    .join('\n');

  return `
    <div style="font-family:monospace;font-size:13px;padding:8px;max-width:280px;">
      <h2 style="text-align:center;font-size:16px;margin:0 0 4px">ออเดอร์ครัว</h2>
      <p style="text-align:center;margin:0;font-size:12px">${new Date(group.createdAt).toLocaleTimeString('th-TH')}</p>
      <hr style="border:1px dashed #000;margin:8px 0"/>
      <p style="margin:0;font-size:14px;font-weight:bold">
        ${group.tableName ? `โต๊ะ ${group.tableName}` : 'Counter'}
        ${group.source === 'QR' ? ' (QR)' : ''}
      </p>
      <p style="margin:0;font-size:11px;color:#666">#${group.orderNumber}</p>
      <hr style="border:1px dashed #000;margin:8px 0"/>
      <pre style="margin:0;font-size:13px;white-space:pre-wrap">${lines}</pre>
      <hr style="border:1px dashed #000;margin:8px 0"/>
    </div>
  `;
}

function triggerPrint(group: OrderGroup) {
  const zone = document.getElementById('kitchen-print-zone');
  if (!zone) return;
  zone.innerHTML = buildReceiptHTML(group);
  window.print();
  setTimeout(() => { zone.innerHTML = ''; }, 2000);
}

// ─────────────────────────────────────────────
// Order Card component
// ─────────────────────────────────────────────
function OrderCard({
  group, isNew, onStatusChange, onManualPrint,
}: {
  group: OrderGroup;
  isNew: boolean;
  onStatusChange: (itemId: number, status: string) => void;
  onManualPrint: (group: OrderGroup) => void;
}) {
  const elapsed = Math.floor((Date.now() - new Date(group.createdAt).getTime()) / 60000);

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-sm border overflow-hidden transition-all',
      isNew ? 'border-primary ring-2 ring-primary/30 animate-pulse-once' : 'border-slate-100',
    )}>
      {/* Card header */}
      <div className={cn(
        'px-4 py-3 flex items-center justify-between',
        isNew ? 'bg-primary text-white' : 'bg-slate-50 border-b',
      )}>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('font-black text-sm', isNew ? 'text-white' : 'text-slate-900')}>
              {group.tableName ? `โต๊ะ ${group.tableName}` : 'Counter'}
            </span>
            {group.source === 'QR' && (
              <span className={cn(
                'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                isNew ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
              )}>
                QR
              </span>
            )}
          </div>
          <p className={cn('text-[11px] mt-0.5', isNew ? 'text-white/70' : 'text-slate-400')}>
            #{group.orderNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1 text-xs font-semibold', isNew ? 'text-white/80' : 'text-slate-400')}>
            <Clock className="w-3 h-3" />
            {elapsed < 1 ? 'เมื่อกี้' : `${elapsed} นาทีที่แล้ว`}
          </div>
          <button
            onClick={() => onManualPrint(group)}
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
              isNew ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
            )}
            title="พิมพ์ใบครัว"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-50">
        {group.items.map(item => {
          const st = STATUS_MAP[item.status] ?? STATUS_MAP.PENDING;
          const nextStatus = NEXT_STATUS[item.status];
          return (
            <div key={item.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <span className="font-black text-slate-900 text-sm shrink-0">{item.quantity}×</span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800 leading-snug">{item.name}</p>
                    {item.options.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.options.map(o => o.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-orange-600 font-semibold mt-0.5">⚠ {item.notes}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', st.color)}>
                  {st.label}
                </span>
                {nextStatus && (
                  <button
                    onClick={() => onStatusChange(item.id, nextStatus)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    {NEXT_LABEL[item.status]} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function KitchenDisplay() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);

  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const seenOrderIds = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // ── Group items by order ─────────────────
  const groupItems = useCallback((items: OrderItem[]): OrderGroup[] => {
    const map = new Map<number, OrderGroup>();
    for (const item of items) {
      const oid = item.order.id;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId: oid,
          orderNumber: item.order.orderNumber,
          source: item.order.source,
          tableName: item.order.table?.name,
          createdAt: item.order.createdAt,
          items: [],
        });
      }
      map.get(oid)!.items.push(item);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  // ── Fetch + Detect new orders ────────────
  const fetchKitchenItems = useCallback(async (silent = false) => {
    try {
      const res = await api.get<OrderItem[]>(`/orders/branch/${bid}/kitchen-items`);
      const groups = groupItems(res.data);

      // Detect new orders
      const freshIds = new Set<number>();
      const toAnnounce: OrderGroup[] = [];

      for (const g of groups) {
        if (!seenOrderIds.current.has(g.orderId)) {
          freshIds.add(g.orderId);
          if (!isFirstLoad.current) {
            toAnnounce.push(g);
          }
          seenOrderIds.current.add(g.orderId);
        }
      }

      if (toAnnounce.length > 0) {
        // Sound notification
        if (isSoundEnabled) playDing();

        // Toast notification
        toast(`🍳 ออเดอร์ใหม่ ${toAnnounce.length} รายการ!`, {
          description: toAnnounce.map(g =>
            `${g.tableName ? `โต๊ะ ${g.tableName}` : 'Counter'} #${g.orderNumber}`
          ).join(', '),
          duration: 5000,
        });

        // Auto-print QR orders
        for (const g of toAnnounce) {
          if (g.source === 'QR') {
            setTimeout(() => triggerPrint(g), 500);
          }
        }

        // Highlight new cards (clear after 8s)
        setNewOrderIds(prev => {
          const next = new Set(prev);
          toAnnounce.forEach(g => next.add(g.orderId));
          return next;
        });
        setTimeout(() => {
          setNewOrderIds(prev => {
            const next = new Set(prev);
            toAnnounce.forEach(g => next.delete(g.orderId));
            return next;
          });
        }, 8000);
      }

      isFirstLoad.current = false;
      setOrderGroups(groups);
      setLastRefresh(new Date());
      if (!silent) setIsLoading(false);
    } catch (err) {
      if (!silent) {
        setIsLoading(false);
        toast.error('ไม่สามารถโหลดข้อมูลครัวได้');
      }
    }
  }, [bid, groupItems, isSoundEnabled]);

  // ── Start / stop polling ─────────────────
  useEffect(() => {
    fetchKitchenItems();
    pollingRef.current = setInterval(() => fetchKitchenItems(true), 5000);
    return () => clearInterval(pollingRef.current);
  }, [fetchKitchenItems]);

  // ── Update item status ───────────────────
  const handleStatusChange = async (itemId: number, newStatus: string) => {
    try {
      await api.patch(`/orders/items/${itemId}/status`, { status: newStatus });
      fetchKitchenItems(true);
    } catch {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    }
  };

  // ── Stats ────────────────────────────────
  const pendingCount = orderGroups.filter(g =>
    g.items.some(i => i.status === 'PENDING')
  ).length;
  const cookingCount = orderGroups.filter(g =>
    g.items.every(i => i.status !== 'PENDING') &&
    g.items.some(i => i.status === 'COOKING')
  ).length;
  const readyCount = orderGroups.filter(g =>
    g.items.every(i => i.status === 'READY')
  ).length;

  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Hidden print zone (styled via @media print in global CSS) ── */}
      <div id="kitchen-print-zone" className="hidden print:block" />

      {/* ── Top bar ─────────────────────────── */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-black text-base text-white">จอครัว</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">
                อัปเดตล่าสุด {lastRefresh.toLocaleTimeString('th-TH')}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2">
            <StatChip color="amber" label="รอทำ" count={pendingCount} />
            <StatChip color="blue" label="ทำอยู่" count={cookingCount} />
            <StatChip color="green" label="พร้อม" count={readyCount} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSoundEnabled(s => !s)}
              className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors"
              title={isSoundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => fetchKitchenItems()}
              className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600 transition-colors"
              title="รีเฟรช"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────── */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">กำลังโหลดออเดอร์...</p>
          </div>
        ) : orderGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <p className="font-bold text-slate-400">ยังไม่มีออเดอร์ในครัว</p>
            <p className="text-sm text-slate-500">รอรับออเดอร์ใหม่...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orderGroups.map(group => (
              <OrderCard
                key={group.orderId}
                group={group}
                isNew={newOrderIds.has(group.orderId)}
                onStatusChange={handleStatusChange}
                onManualPrint={triggerPrint}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Pulse animation ─────────────────── */}
      <style>{`
        @keyframes pulse-once {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-primary), 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(var(--color-primary), 0); }
        }
        .animate-pulse-once { animation: pulse-once 1s ease-out 3; }

        /* Receipt print styles */
        @media print {
          body > *:not(#kitchen-print-zone) { display: none !important; }
          #kitchen-print-zone { display: block !important; }
          @page { margin: 4mm; size: 80mm auto; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper: Stats chip
// ─────────────────────────────────────────────
function StatChip({ color, label, count }: { color: string; label: string; count: number }) {
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    blue:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold', colorMap[color])}>
      <span className="text-sm font-black">{count}</span>
      <span>{label}</span>
    </div>
  );
}
