import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  UtensilsCrossed, Printer, RefreshCw, Volume2, VolumeX,
  Clock, CheckCircle2, ChefHat, Loader2, Maximize2, Minimize2, Truck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
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
    orderType?: string;
    deliveryPlatform?: string | null;
    createdAt: string;
    table?: { name: string } | null;
  };
}

interface OrderGroup {
  orderId: number;
  orderNumber: string;
  source?: string;
  orderType?: string;
  deliveryPlatform?: string | null;
  tableName?: string;
  createdAt: string;
  items: OrderItem[];
}

// ─── Audio ────────────────────────────────────────────────────────────────────
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
  } catch { /* AudioContext not supported */ }
}

// ─── Print ────────────────────────────────────────────────────────────────────
function buildReceiptHTML(group: OrderGroup): string {
  const lines = group.items
    .map(item => {
      const opts = item.options.length
        ? `\n  (${item.options.map(o => o.name).join(', ')})`
        : '';
      const note = item.notes ? `\n  * ${item.notes}` : '';
      return `${item.quantity}x ${item.name}${opts}${note}`;
    })
    .join('\n');

  return `
    <div style="font-family:monospace;font-size:13px;padding:8px;max-width:280px;">
      <h2 style="text-align:center;font-size:16px;margin:0 0 4px">ออเดอร์ครัว</h2>
      <p style="text-align:center;margin:0;font-size:12px">
        ${new Date(group.createdAt).toLocaleTimeString('th-TH')}
      </p>
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

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useElapsedMinutes(createdAt: string) {
  const [elapsed, setElapsed] = useState(
    () => Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)));
    }, 10_000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

function useFullscreen() {
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggle = () => {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    } catch { /* fullscreen not supported */ }
  };
  return { isFs, toggle };
}

// ─── OrderTicket ──────────────────────────────────────────────────────────────
function OrderTicket({
  group, isNew, onBump, onPrint,
}: {
  group: OrderGroup;
  isNew: boolean;
  onBump: (group: OrderGroup) => Promise<void>;
  onPrint: (group: OrderGroup) => void;
}) {
  const elapsed = useElapsedMinutes(group.createdAt);
  const [markedItems, setMarkedItems] = useState<Set<number>>(new Set());
  const [isBumping, setIsBumping] = useState(false);

  type Urgency = 'default' | 'warning' | 'danger';
  const urgency: Urgency =
    elapsed >= 10 ? 'danger' :
    elapsed >= 5  ? 'warning' :
    'default';

  // Header background — isNew overrides urgency for first 8 s
  const headerBg =
    isNew             ? 'bg-indigo-600' :
    urgency === 'danger'  ? 'bg-red-600' :
    urgency === 'warning' ? 'bg-amber-500' :
    'bg-zinc-700';

  const timerBadge =
    urgency === 'danger'  ? 'bg-black/30 text-red-200 ring-1 ring-red-500/40' :
    urgency === 'warning' ? 'bg-black/30 text-amber-100 ring-1 ring-amber-400/40' :
    'bg-black/25 text-white/70';

  const cardBorder =
    isNew             ? 'border-indigo-500/50 ring-2 ring-indigo-500/20' :
    urgency === 'danger'  ? 'border-red-600/40' :
    urgency === 'warning' ? 'border-amber-500/35' :
    'border-zinc-700/50';

  const toggleMark = (itemId: number) =>
    setMarkedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });

  const handleBump = async () => {
    setIsBumping(true);
    try { await onBump(group); }
    finally { setIsBumping(false); }
  };

  // Order type display labels
  const isDelivery = group.orderType === 'DELIVERY';
  const hasTable   = !!group.tableName;
  const typeLabel  = isDelivery ? 'Delivery' : hasTable ? 'ทานที่ร้าน' : 'Counter';
  const mainLabel  = isDelivery
    ? (group.deliveryPlatform || 'Delivery')
    : hasTable
    ? `โต๊ะ ${group.tableName}`
    : 'Counter';

  return (
    <div className={cn(
      'bg-zinc-900 rounded-2xl overflow-hidden flex flex-col border transition-all duration-300',
      cardBorder,
      isNew && 'animate-pulse-once',
    )}>

      {/* ── Card Header ── */}
      <div className={cn('px-4 pt-4 pb-3 transition-colors duration-500', headerBg)}>
        <div className="flex items-start justify-between gap-3">
          {/* Left: type + table/name */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/55 text-[11px] font-black uppercase tracking-[0.12em]">
                {typeLabel}
              </span>
              {isDelivery && (
                <Truck className="w-3.5 h-3.5 text-white/50" />
              )}
              {isNew && (
                <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-bounce">
                  ใหม่!
                </span>
              )}
            </div>
            <p className="text-white font-black leading-tight truncate text-[1.6rem]">
              {mainLabel}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/45 text-xs font-bold">#{group.orderNumber}</span>
              {group.source === 'QR' && (
                <span className="bg-white/15 text-white/70 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  QR
                </span>
              )}
              <span className="text-white/35 text-[10px] font-bold">
                · {group.items.length} รายการ
              </span>
            </div>
          </div>

          {/* Right: timer + print */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-black tabular-nums',
              timerBadge,
            )}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {elapsed < 1 ? '<1 นาที' : `${elapsed} นาที`}
            </div>
            <button
              onClick={() => onPrint(group)}
              className="w-8 h-8 rounded-xl bg-black/20 text-white/45 hover:bg-black/40 hover:text-white flex items-center justify-center transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="flex-1 divide-y divide-zinc-800/70">
        {group.items.map(item => {
          const done = markedItems.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleMark(item.id)}
              className={cn(
                'w-full text-left px-4 py-3.5 transition-all duration-150 select-none',
                'active:scale-[0.98] active:bg-zinc-800',
                done ? 'bg-zinc-900/80' : 'hover:bg-zinc-800/40',
              )}
            >
              <div className="flex items-start gap-3">
                {/* Qty badge */}
                <span className={cn(
                  'shrink-0 min-w-[3rem] text-center py-1.5 rounded-xl text-lg font-black leading-none tabular-nums transition-all',
                  done
                    ? 'bg-zinc-800 text-zinc-600'
                    : 'bg-primary/20 text-primary',
                )}>
                  {item.quantity}×
                </span>

                {/* Item details */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={cn(
                    'font-bold leading-snug transition-all duration-150',
                    done
                      ? 'line-through text-zinc-600 text-base'
                      : 'text-white text-base',
                  )}>
                    {item.name}
                  </p>

                  {/* Modifiers — indented */}
                  {item.options.length > 0 && (
                    <div className="mt-1.5 pl-3 border-l-2 border-zinc-700 space-y-0.5">
                      {item.options.map(opt => (
                        <p key={opt.id} className={cn(
                          'text-sm transition-all duration-150',
                          done ? 'line-through text-zinc-700' : 'text-zinc-400',
                        )}>
                          {opt.name}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Special note */}
                  {item.notes && (
                    <p className={cn(
                      'text-sm font-bold mt-1.5 px-2 py-0.5 rounded-lg w-fit transition-all',
                      done
                        ? 'line-through text-zinc-700 bg-transparent'
                        : 'text-amber-300 bg-amber-500/10',
                    )}>
                      ⚠ {item.notes}
                    </p>
                  )}
                </div>

                {/* Done check */}
                <div className="shrink-0 mt-0.5 w-5">
                  {done && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Bump Button ── */}
      <button
        type="button"
        onClick={handleBump}
        disabled={isBumping}
        className={cn(
          'w-full min-h-[58px] text-lg font-black text-white transition-all duration-150',
          'flex items-center justify-center gap-2.5',
          'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.99]',
          isBumping && 'opacity-60 cursor-not-allowed',
        )}
      >
        {isBumping
          ? <Loader2 className="w-5 h-5 animate-spin" />
          : <CheckCircle2 className="w-5 h-5" />}
        เสร็จสิ้น
      </button>
    </div>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label, color }: { value: number; label: string; color: 'amber' | 'blue' }) {
  const styles = {
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    blue:  'bg-blue-500/15  text-blue-400  border-blue-500/20',
  };
  return (
    <div className={cn(
      'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold',
      styles[color],
    )}>
      <span className="text-base font-black tabular-nums">{value}</span>
      <span className="leading-none">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KitchenDisplay() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);

  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [isLoading,   setIsLoading]   = useState(true);
  const [soundOn,     setSoundOn]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const seenIds     = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const pollRef     = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const now              = useLiveClock();
  const { isFs, toggle: toggleFullscreen } = useFullscreen();

  // ── Group items by order ─────────────────────────────────────────────────
  const groupItems = useCallback((items: OrderItem[]): OrderGroup[] => {
    const map = new Map<number, OrderGroup>();
    for (const item of items) {
      const oid = item.order.id;
      if (!map.has(oid)) {
        map.set(oid, {
          orderId:          oid,
          orderNumber:      item.order.orderNumber,
          source:           item.order.source,
          orderType:        item.order.orderType,
          deliveryPlatform: item.order.deliveryPlatform,
          tableName:        item.order.table?.name,
          createdAt:        item.order.createdAt,
          items:            [],
        });
      }
      map.get(oid)!.items.push(item);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  // ── Fetch + detect new orders ────────────────────────────────────────────
  const fetchItems = useCallback(async (silent = false) => {
    try {
      const res    = await api.get<OrderItem[]>(`/orders/branch/${bid}/kitchen-items`);
      const groups = groupItems(res.data);
      const toAnnounce: OrderGroup[] = [];

      for (const g of groups) {
        if (!seenIds.current.has(g.orderId)) {
          if (!isFirstLoad.current) toAnnounce.push(g);
          seenIds.current.add(g.orderId);
        }
      }

      if (toAnnounce.length > 0) {
        if (soundOn) playDing();
        toast(`🍳 ออเดอร์ใหม่ ${toAnnounce.length} รายการ!`, {
          description: toAnnounce
            .map(g => `${g.tableName ? `โต๊ะ ${g.tableName}` : 'Counter'} #${g.orderNumber}`)
            .join(', '),
          duration: 5000,
        });
        for (const g of toAnnounce) {
          if (g.source === 'QR') setTimeout(() => triggerPrint(g), 500);
        }
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
    } catch {
      if (!silent) {
        setIsLoading(false);
        toast.error('ไม่สามารถโหลดข้อมูลครัวได้');
      }
    }
  }, [bid, groupItems, soundOn]);

  useEffect(() => {
    fetchItems();
    pollRef.current = setInterval(() => fetchItems(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchItems]);

  // ── Bump: mark all active items READY → removed from KDS ────────────────
  const handleBump = async (group: OrderGroup) => {
    const active = group.items.filter(i => i.status === 'PENDING' || i.status === 'COOKING');
    try {
      await Promise.all(
        active.map(item => api.patch(`/orders/items/${item.id}/status`, { status: 'READY' })),
      );
      toast.success(`บิล #${group.orderNumber} เสร็จสิ้น!`);
      fetchItems(true);
    } catch {
      toast.error('Bump ออเดอร์ไม่สำเร็จ');
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const pendingCount = orderGroups.filter(g => g.items.some(i => i.status === 'PENDING')).length;
  const cookingCount = orderGroups.filter(
    g => g.items.some(i => i.status === 'COOKING') && !g.items.some(i => i.status === 'PENDING'),
  ).length;

  const clockStr = now.toLocaleTimeString('th-TH', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Hidden print zone */}
      <div id="kitchen-print-zone" className="hidden print:block" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 print:hidden">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-16">

          {/* Left: branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden md:block">
              <p className="font-black text-sm text-white leading-none">จอครัว</p>
              <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                อัปเดต {lastRefresh.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Center: live clock */}
          <p className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-white select-none">
            {clockStr}
          </p>

          {/* Right: stats + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <StatPill value={pendingCount} label="รอดำเนินการ" color="amber" />
            <StatPill value={cookingCount} label="กำลังทำ"    color="blue"  />

            <div className="w-px h-6 bg-zinc-700 mx-1 hidden sm:block" />

            <button
              onClick={() => setSoundOn(s => !s)}
              className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition-colors"
              title={soundOn ? 'ปิดเสียง' : 'เปิดเสียง'}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => fetchItems()}
              className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition-colors"
              title="รีเฟรช"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition-colors"
              title={isFs ? 'ออกจากเต็มหน้าจอ' : 'เต็มหน้าจอ'}
            >
              {isFs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3 sm:p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">กำลังโหลดออเดอร์...</p>
          </div>

        ) : orderGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-zinc-600">
            <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center">
              <UtensilsCrossed className="w-12 h-12" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-zinc-400 text-xl">ยังไม่มีออเดอร์ในครัว</p>
              <p className="text-sm text-zinc-600">รอรับออเดอร์ใหม่...</p>
            </div>
          </div>

        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 items-start">
            {orderGroups.map(g => (
              <OrderTicket
                key={g.orderId}
                group={g}
                isNew={newOrderIds.has(g.orderId)}
                onBump={handleBump}
                onPrint={triggerPrint}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Styles ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-once {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
          50%       { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
        }
        .animate-pulse-once { animation: pulse-once 1s ease-out 3; }

        @media print {
          body > *:not(#kitchen-print-zone) { display: none !important; }
          #kitchen-print-zone { display: block !important; }
          @page { margin: 4mm; size: 80mm auto; }
        }
      `}</style>
    </div>
  );
}
