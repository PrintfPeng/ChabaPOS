import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useBranch } from '../../../hooks/useBranches';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '../../../components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  Package, TrendingUp, Store, ClipboardList,
  Loader2, Printer, Search, RefreshCw, Download,
  CalendarDays, CalendarRange, CalendarClock, List,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePickerWithRange } from '../../../components/DatePickerWithRange';

// ─── Types ────────────────────────────────────────────────────────────────────

interface POItem {
  id: number;
  quantity: number;
  price: number;
  rawMaterial?: { name: string; unit: string; category?: { name: string } };
}

interface PurchaseOrder {
  id: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  createdAt: string;
  supplier?: {
    id: number; name: string;
    phone?: string; lineId?: string;
    bankAccount?: string; bankName?: string;
  };
  items?: POItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d).toLocaleString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const fmtDateShort = (d: string) =>
  new Date(d).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const STATUS_MAP: Record<string, { label: string; cls: string; pdfColor: string }> = {
  COMPLETED: { label: 'เสร็จสิ้น',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', pdfColor: '#065f46' },
  CANCELLED: { label: 'ยกเลิก',        cls: 'bg-red-100 text-red-700 border-red-200',             pdfColor: '#991b1b' },
  PENDING:   { label: 'รอดำเนินการ',   cls: 'bg-amber-100 text-amber-700 border-amber-200',       pdfColor: '#92400e' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Templates (inline-styles only — no CSS variables / oklch)
// ─────────────────────────────────────────────────────────────────────────────

/** Single-order PDF template */
function PdfSingleTemplate({
  order, branchName,
}: {
  order: PurchaseOrder; branchName: string;
}) {
  const now      = new Date();
  const dateStr  = now.toLocaleDateString('th-TH',  { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr  = now.toLocaleTimeString('th-TH',  { hour: '2-digit', minute: '2-digit' });
  const sup      = order.supplier;
  const items    = order.items ?? [];
  const status   = STATUS_MAP[order.status] ?? STATUS_MAP.PENDING;

  const s: Record<string, React.CSSProperties> = {
    root:     { width: 794, backgroundColor: '#fff', padding: '32px 40px 28px', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' },
    hdr:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #dc2626', paddingBottom: 16, marginBottom: 20 },
    brand:    { fontSize: 8,  fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 4 },
    title:    { fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 },
    sub:      { fontSize: 11, color: '#64748b', marginTop: 4 },
    metaWrap: { textAlign: 'right' as const },
    metaLbl:  { fontSize: 8,  color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const },
    metaVal:  { fontSize: 12, fontWeight: 800, color: '#0f172a', marginTop: 2 },
    metaSub:  { fontSize: 9,  color: '#94a3b8', marginTop: 2 },
    supBox:   { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 18 },
    supLbl:   { fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 },
    grid2:    { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 8px', fontSize: 11 },
    th:       { padding: '7px 10px', fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' as const, borderBottom: '2px solid #0f172a', background: '#f1f5f9' },
    td:       { padding: '7px 10px', fontSize: 10, borderBottom: '1px solid #e2e8f0' },
    sigWrap:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 40 },
    sigLine:  { borderBottom: '1px dashed #0f172a', margin: '0 32px 8px', height: 32 },
    footer:   { marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.hdr}>
        <div>
          <div style={s.brand}>NEXOS SYSTEM</div>
          <div style={s.title}>ใบสั่งซื้อวัตถุดิบ</div>
          <div style={s.sub}>สาขา: <strong style={{ color: '#0f172a' }}>{branchName}</strong></div>
        </div>
        <div style={s.metaWrap}>
          <div style={s.metaLbl}>เลขที่เอกสาร</div>
          <div style={{ ...s.metaVal, fontFamily: 'monospace' }}>PO-{String(order.id).padStart(5, '0')}</div>
          <div style={s.metaSub}>{fmtDate(order.createdAt)}</div>
          <div style={{ marginTop: 6, display: 'inline-block', fontSize: 9, fontWeight: 700, color: status.pdfColor, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
            {status.label}
          </div>
        </div>
      </div>

      {/* Supplier */}
      <div style={s.supBox}>
        <div style={s.supLbl}>ข้อมูลคู่ค้า (Supplier)</div>
        <div style={s.grid2}>
          <span style={{ fontWeight: 700 }}>ชื่อร้านค้า:</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{sup?.name ?? '-'}</span>
          {sup?.phone       && <><span style={{ fontWeight: 700 }}>โทรศัพท์:</span><span>{sup.phone}</span></>}
          {sup?.lineId      && <><span style={{ fontWeight: 700 }}>Line ID:</span><span>{sup.lineId}</span></>}
          {sup?.bankAccount && <><span style={{ fontWeight: 700 }}>บัญชีธนาคาร:</span><span>{sup.bankAccount}{sup.bankName ? ` (${sup.bankName})` : ''}</span></>}
        </div>
      </div>

      {/* Items table */}
      {(() => {
        const isCompleted = order.status === 'COMPLETED';
        const grandTotal  = items.reduce((s, i) => s + i.quantity * (i.price ?? 0), 0);
        const headers = isCompleted
          ? ['#', 'รายการวัตถุดิบ', 'หมวดหมู่', 'จำนวน', 'หน่วย', 'ราคา/หน่วย (฿)', 'ราคารวม (฿)']
          : ['#', 'รายการวัตถุดิบ', 'หมวดหมู่', 'จำนวน', 'หน่วย'];
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} style={{ ...s.th, textAlign: i < 3 ? 'left' : 'right' as any }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const lineTotal = item.quantity * (item.price ?? 0);
                return (
                  <tr key={item.id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <td style={{ ...s.td, color: '#94a3b8', width: 28, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{item.rawMaterial?.name}</td>
                    <td style={{ ...s.td, color: '#64748b' }}>{item.rawMaterial?.category?.name ?? '-'}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#64748b' }}>{item.rawMaterial?.unit}</td>
                    {isCompleted && (
                      <>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          ฿{(item.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: '#065f46' }}>
                          ฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
                {isCompleted ? (
                  <>
                    <td colSpan={5} style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>ยอดรวมทั้งสิ้น</td>
                    <td colSpan={2} style={{ ...s.td, textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#065f46' }}>
                      ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </>
                ) : (
                  <>
                    <td colSpan={3} style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>จำนวนรายการทั้งหมด</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, fontSize: 14 }}>{items.length}</td>
                    <td style={{ ...s.td, color: '#64748b' }}>รายการ</td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        );
      })()}

      {/* Signatures */}
      <div style={s.sigWrap}>
        {['ผู้จัดซื้อ', 'ผู้ตรวจสอบ / อนุมัติ'].map(r => (
          <div key={r} style={{ textAlign: 'center' }}>
            <div style={s.sigLine} />
            <div style={{ fontWeight: 700, fontSize: 11 }}>{r}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>วันที่ _____/_____/_____</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>สร้างโดยระบบ NEXOS • เอกสารนี้สร้างโดยอัตโนมัติ</span>
        <span>{dateStr} {timeStr}</span>
      </div>
    </div>
  );
}

/** All-orders PDF template */
function PdfAllTemplate({
  orders, branchName, periodLabel, stats,
}: {
  orders: PurchaseOrder[];
  branchName: string;
  periodLabel: string;
  stats: { count: number; totalAmount: number; uniqueSuppliers: number };
}) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const s: Record<string, React.CSSProperties> = {
    root:   { width: 794, backgroundColor: '#fff', padding: '32px 40px 28px', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' },
    hdr:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #dc2626', paddingBottom: 16, marginBottom: 20 },
    brand:  { fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 4 },
    title:  { fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 },
    sub:    { fontSize: 11, color: '#64748b', marginTop: 4 },
    kpiRow: { display: 'flex', gap: 12, marginBottom: 18 },
    kpi:    { flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', textAlign: 'center' as const },
    th:     { padding: '7px 10px', fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' as const, borderBottom: '2px solid #0f172a', background: '#f1f5f9' },
    td:     { padding: '6px 10px', fontSize: 9, borderBottom: '1px solid #e2e8f0' },
    footer: { marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.hdr}>
        <div>
          <div style={s.brand}>NEXOS SYSTEM</div>
          <div style={s.title}>รายงานการสั่งซื้อวัตถุดิบ</div>
          <div style={s.sub}>
            สาขา: <strong style={{ color: '#0f172a' }}>{branchName}</strong>
            &nbsp;·&nbsp;ช่วงเวลา: <strong style={{ color: '#dc2626' }}>{periodLabel}</strong>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>วันที่ออกรายงาน</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{dateStr}</div>
          <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{timeStr}</div>
        </div>
      </div>

      {/* KPI summary */}
      <div style={s.kpiRow}>
        {[
          { label: 'จำนวนบิลทั้งหมด', value: `${stats.count} บิล` },
          { label: 'ยอดรวมทั้งหมด',   value: stats.totalAmount > 0 ? `฿${stats.totalAmount.toLocaleString()}` : 'ไม่ระบุ' },
          { label: 'จำนวนร้านค้า',     value: `${stats.uniqueSuppliers} แห่ง` },
        ].map(k => (
          <div key={k.label} style={s.kpi}>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4, color: '#0f172a' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'เลขที่', 'วันที่', 'ร้านค้า', 'รายการวัตถุดิบ', 'ยอดรวม', 'สถานะ'].map((h, i) => (
              <th key={i} style={{ ...s.th, textAlign: i >= 5 ? 'right' as any : 'left' as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => {
            const st = STATUS_MAP[o.status] ?? STATUS_MAP.PENDING;
            const itemSummary = o.items
              ?.map(i => `${i.rawMaterial?.name} ${i.quantity}${i.rawMaterial?.unit}`)
              .join(', ') ?? '';
            return (
              <tr key={o.id} style={{ background: idx % 2 ? '#f8fafc' : '#fff' }}>
                <td style={{ ...s.td, color: '#94a3b8', width: 24, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 700 }}>PO-{String(o.id).padStart(5, '0')}</td>
                <td style={{ ...s.td, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateShort(o.createdAt)}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{o.supplier?.name}</td>
                <td style={{ ...s.td, color: '#64748b', maxWidth: 220 }}>{itemSummary}</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: o.totalAmount > 0 ? '#0f172a' : '#94a3b8' }}>
                  {o.totalAmount > 0 ? `฿${Number(o.totalAmount).toLocaleString()}` : '-'}
                </td>
                <td style={{ ...s.td, textAlign: 'right', color: st.pdfColor, fontWeight: 700 }}>{st.label}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
            <td colSpan={5} style={{ ...s.td, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>ยอดรวมทั้งสิ้น</td>
            <td style={{ ...s.td, textAlign: 'right', fontWeight: 900, fontSize: 12, color: '#0f172a' }}>
              {stats.totalAmount > 0 ? `฿${stats.totalAmount.toLocaleString()}` : '-'}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, marginTop: 40 }}>
        {['ผู้จัดทำรายงาน', 'ผู้ตรวจสอบ', 'ผู้อนุมัติ'].map(r => (
          <div key={r} style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px dashed #0f172a', margin: '0 24px 8px', height: 28 }} />
            <div style={{ fontWeight: 700, fontSize: 10 }}>{r}</div>
            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>วันที่ _____/_____/_____</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>สร้างโดยระบบ NEXOS • เอกสารนี้สร้างโดยอัตโนมัติ</span>
        <span>หน้า 1 / 1 &nbsp;·&nbsp; {dateStr} {timeStr}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared PDF download helper
// ─────────────────────────────────────────────────────────────────────────────
async function renderToPdf(
  element: React.ReactElement,
  filename: string,
  toastId: string | number,
) {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;pointer-events:none;';
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    await new Promise<void>(resolve => { root.render(element); setTimeout(resolve, 300); });

    const el  = container.firstElementChild as HTMLElement;
    const png = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });

    const img = new Image();
    await new Promise<void>(r => { img.onload = () => r(); img.src = png; });

    const imgW = 210, pageH = 297;
    const imgH = (img.height * imgW) / img.width;
    let left   = imgH;

    let Cls: any = jsPDF;
    if (typeof Cls !== 'function') Cls = (jsPDF as any).default ?? Cls;
    if (typeof Cls !== 'function' && (jsPDF as any).jsPDF) Cls = (jsPDF as any).jsPDF;
    if (typeof Cls !== 'function') throw new Error('jsPDF not available');

    const pdf = new Cls('p', 'mm', 'a4');
    pdf.addImage(png, 'PNG', 0, 0, imgW, imgH, undefined, 'FAST');
    left -= pageH;

    while (left >= 0) {
      pdf.addPage();
      pdf.addImage(png, 'PNG', 0, left - imgH, imgW, imgH, undefined, 'FAST');
      left -= pageH;
    }

    pdf.save(filename);
    toast.success('ดาวน์โหลด PDF เรียบร้อยแล้ว!', { id: toastId });
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function InventoryDashboard() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch }   = useBranch(Number(branchId));

  const [allOrders,      setAllOrders]      = useState<PurchaseOrder[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [dateRange,      setDateRange]      = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(),
    to: new Date(),
  });
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [printOrder,     setPrintOrder]     = useState<PurchaseOrder | null>(null);

  // Filters for the Ordered Materials section
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all');
  const [materialSupplierFilter, setMaterialSupplierFilter] = useState('all');
  const [materialSearchQuery,    setMaterialSearchQuery]    = useState('');

  // Reset material table filters when date range changes
  useEffect(() => {
    setMaterialCategoryFilter('all');
    setMaterialSupplierFilter('all');
    setMaterialSearchQuery('');
  }, [dateRange]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await api.get<PurchaseOrder[]>(`/purchase-orders?branchId=${branchId}`);
      setAllOrders(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [branchId]);

  // ── Orders filtered ONLY by Date Range ───────────────────────────────────
  const ordersInPeriod = useMemo(() => {
    let list = [...allOrders];

    if (dateRange.from) {
      const start = new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), dateRange.from.getDate());
      
      if (dateRange.to) {
        const end = new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate());
        list = list.filter(o => {
          const d = new Date(o.createdAt);
          const comp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return comp >= start && comp <= end;
        });
      } else {
        list = list.filter(o => {
          const d = new Date(o.createdAt);
          return isSameDay(d, start);
        });
      }
    }
    return list;
  }, [allOrders, dateRange]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let list = [...ordersInPeriod];

    if (supplierFilter !== 'all')
      list = list.filter(o => String(o.supplier?.id) === supplierFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        o.supplier?.name?.toLowerCase().includes(q) ||
        o.items?.some(i => i.rawMaterial?.name?.toLowerCase().includes(q))
      );
    }

    return list;
  }, [ordersInPeriod, supplierFilter, searchQuery]);

  // ── Flattened Ordered Materials ──────────────────────────────────────────
  const flatItems = useMemo(() => {
    const list: any[] = [];
    ordersInPeriod.forEach(o => {
      if (!o.items) return;
      o.items.forEach(i => {
        list.push({
          id: `${o.id}-${i.id}`,
          name: i.rawMaterial?.name ?? '-',
          category: i.rawMaterial?.category?.name ?? 'ไม่มีหมวดหมู่',
          categoryId: i.rawMaterial?.category?.id ?? 0,
          supplier: o.supplier?.name ?? '-',
          supplierId: o.supplier?.id ?? 0,
          quantity: i.quantity,
          unit: i.rawMaterial?.unit ?? '',
          price: i.price ?? 0,
          totalPrice: i.quantity * (i.price ?? 0),
          status: o.status,
        });
      });
    });
    return list;
  }, [ordersInPeriod]);

  // ── Filtered Flattened Ordered Materials ─────────────────────────────────
  const filteredFlatItems = useMemo(() => {
    let list = [...flatItems];

    if (materialCategoryFilter !== 'all') {
      list = list.filter(item => String(item.categoryId) === materialCategoryFilter);
    }

    if (materialSupplierFilter !== 'all') {
      list = list.filter(item => String(item.supplierId) === materialSupplierFilter);
    }

    if (materialSearchQuery.trim()) {
      const q = materialSearchQuery.toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }

    return list;
  }, [flatItems, materialCategoryFilter, materialSupplierFilter, materialSearchQuery]);

  // ── Unique Filter Options from Flat List ─────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const m = new Map<number, string>();
    flatItems.forEach(item => {
      if (item.categoryId) m.set(item.categoryId, item.category);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [flatItems]);

  const uniqueSuppliersInPeriod = useMemo(() => {
    const m = new Map<number, string>();
    flatItems.forEach(item => {
      if (item.supplierId) m.set(item.supplierId, item.supplier);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [flatItems]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    count:           filteredOrders.length,
    totalAmount:     filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    uniqueSuppliers: new Set(filteredOrders.map(o => o.supplier?.id)).size,
    totalItems:      filteredOrders.reduce((s, o) => s + (o.items?.length || 0), 0),
  }), [filteredOrders]);

  const allSuppliers = useMemo(() => {
    const m = new Map<number, string>();
    allOrders.forEach(o => { if (o.supplier) m.set(o.supplier.id, o.supplier.name); });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [allOrders]);

  const periodLabel = useMemo(() => {
    if (!dateRange.from) return 'ทั้งหมด';
    
    const fromStr = format(dateRange.from, 'd MMM yyyy', { locale: th });
    if (!dateRange.to) return fromStr;
    
    if (isSameDay(dateRange.from, dateRange.to)) return fromStr;
    
    const toStr = format(dateRange.to, 'd MMM yyyy', { locale: th });
    return `${fromStr} - ${toStr}`;
  }, [dateRange]);
  const branchName  = branch?.name ?? `สาขา #${branchId}`;
  const dateStr     = new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Print (window.print) handlers — FIXED: visibility approach ───────────
  const handlePrintSingle = (order: PurchaseOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      document.body.classList.add('cpos-print-single');
      window.print();
      setTimeout(() => document.body.classList.remove('cpos-print-single'), 600);
    }, 150);
  };

  const handlePrintAll = () => {
    if (!filteredOrders.length) { toast.error('ไม่มีข้อมูลสำหรับพิมพ์'); return; }
    setTimeout(() => {
      document.body.classList.add('cpos-print-all');
      window.print();
      setTimeout(() => document.body.classList.remove('cpos-print-all'), 600);
    }, 150);
  };

  // ── PDF (html-to-image + jsPDF) handlers ─────────────────────────────────
  const handleSavePdfSingle = async (order: PurchaseOrder) => {
    const toastId = toast.loading('กำลังสร้าง PDF...');
    try {
      await renderToPdf(
        <PdfSingleTemplate order={order} branchName={branchName} />,
        `ใบสั่งซื้อ_PO-${String(order.id).padStart(5, '0')}_${dateStr}.pdf`,
        toastId,
      );
    } catch (e: any) {
      toast.error(`สร้าง PDF ล้มเหลว: ${e?.message}`, { id: toastId });
    }
  };

  const handleSavePdfAll = async () => {
    if (!filteredOrders.length) { toast.error('ไม่มีข้อมูลสำหรับบันทึก PDF'); return; }
    const toastId = toast.loading('กำลังสร้าง PDF รายงาน...');
    try {
      await renderToPdf(
        <PdfAllTemplate
          orders={filteredOrders}
          branchName={branchName}
          periodLabel={periodLabel}
          stats={stats}
        />,
        `รายงานสั่งซื้อวัตถุดิบ_${branchName}_${periodLabel}_${dateStr}.pdf`,
        toastId,
      );
    } catch (e: any) {
      toast.error(`สร้าง PDF ล้มเหลว: ${e?.message}`, { id: toastId });
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center p-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Print CSS: FIXED — visibility approach works regardless of nesting ── */}
      <style>{`
        @media print {
          /* ── Single order ── */
          body.cpos-print-single * { visibility: hidden !important; }
          body.cpos-print-single #cpos-print-single {
            visibility: visible !important;
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%; z-index: 9999;
          }
          body.cpos-print-single #cpos-print-single * { visibility: visible !important; }

          /* ── All orders ── */
          body.cpos-print-all * { visibility: hidden !important; }
          body.cpos-print-all #cpos-print-all {
            visibility: visible !important;
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%; z-index: 9999;
          }
          body.cpos-print-all #cpos-print-all * { visibility: visible !important; }

          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      {/* ═══════════════════════ SCREEN UI ══════════════════════════════════ */}
      <div className="space-y-5 print:hidden">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">ประวัติการสั่งซื้อวัตถุดิบ</h2>
            <p className="text-sm text-slate-500 mt-0.5">รายการสั่งซื้อทั้งหมดจากร้านค้า เรียงตามวันที่ล่าสุด</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center shrink-0">
            <Button variant="outline" size="icon" onClick={fetchOrders}
                    className="rounded-xl h-9 w-9 border-slate-200" title="รีเฟรช">
              <RefreshCw className="w-4 h-4" />
            </Button>
            {/* Print all */}
            <Button onClick={handlePrintAll} disabled={!filteredOrders.length}
                    variant="outline"
                    className="rounded-xl font-bold gap-1.5 h-9 border-slate-300 text-slate-700">
              <Printer className="w-4 h-4" />
              พิมพ์ ({filteredOrders.length})
            </Button>
            {/* Save PDF all */}
            <Button onClick={handleSavePdfAll} disabled={!filteredOrders.length}
                    className="rounded-xl font-bold gap-1.5 h-9 bg-slate-800 hover:bg-slate-900 text-white">
              <Download className="w-4 h-4" />
              บันทึก PDF ({filteredOrders.length} บิล)
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">

          {/* ── New Comprehensive Date Picker ── */}
          <DatePickerWithRange 
            value={dateRange} 
            onChange={setDateRange} 
            placeholder="เลือกวันที่..."
            className="shrink-0"
          />

          <div className="flex gap-2 flex-1 min-w-0">
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="rounded-xl h-9 w-44 bg-white border-slate-200 shrink-0 text-sm">
                <SelectValue placeholder="ร้านค้าทั้งหมด">
                  {supplierFilter === 'all'
                    ? 'ร้านค้าทั้งหมด'
                    : (allSuppliers.find(s => String(s.id) === supplierFilter)?.name || supplierFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ร้านค้าทั้งหมด</SelectItem>
                {allSuppliers.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" placeholder="ค้นหาร้านค้า / วัตถุดิบ..."
                     value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 h-9 border border-slate-200 rounded-xl text-sm
                                bg-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400" />
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-primary',       from: 'from-primary/10',       label: 'บิลสั่งซื้อ',       value: stats.count,                                                       suffix: 'บิล',     textCl: 'text-slate-900' },
            { icon: <TrendingUp    className="w-5 h-5" />, bg: 'bg-emerald-500',   from: 'from-emerald-500/10',   label: 'ยอดรวม',            value: `฿${stats.totalAmount.toLocaleString()}`,                           suffix: '',        textCl: 'text-emerald-700' },
            { icon: <Store         className="w-5 h-5" />, bg: 'bg-blue-500',      from: 'from-blue-500/10',      label: 'ร้านค้า',           value: stats.uniqueSuppliers,                                             suffix: 'แห่ง',    textCl: 'text-blue-700' },
            { icon: <Package       className="w-5 h-5" />, bg: 'bg-violet-500',    from: 'from-violet-500/10',    label: 'รายการวัตถุดิบ',    value: stats.totalItems,                                                  suffix: 'รายการ',  textCl: 'text-violet-700' },
          ].map((c, i) => (
            <Card key={i} className={`border-none shadow-sm bg-gradient-to-br ${c.from} to-transparent`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${c.bg} rounded-xl text-white shrink-0`}>{c.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{c.label}</p>
                    <h3 className={`text-xl font-black ${c.textCl} leading-none mt-0.5`}>
                      {c.value}
                      {c.suffix && <span className="text-sm font-bold ml-1">{c.suffix}</span>}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders table */}
        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                รายการสั่งซื้อ — {periodLabel}
                {searchQuery && <span className="text-sm font-normal text-slate-400 ml-1">· ค้นหา "{searchQuery}"</span>}
              </CardTitle>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {filteredOrders.length} รายการ
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!filteredOrders.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-600 text-base">ไม่มีรายการสั่งซื้อ</p>
                <p className="text-sm text-slate-400 mt-1">
                  {dateRange.from ? `ไม่พบบิลในช่วงเวลา ${periodLabel}` : 'ยังไม่มีรายการสั่งซื้อในระบบ'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                      <TableHead className="pl-5 font-bold text-slate-600 h-10 w-[160px]">วันที่ / เวลา</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 w-[100px]">เลขที่บิล</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 w-[130px]">ร้านค้า</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">วัตถุดิบที่สั่ง</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-right w-[100px]">ยอดรวม</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-center w-[110px]">สถานะ</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-center pr-4 w-[140px]">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => {
                      const st     = STATUS_MAP[order.status] ?? STATUS_MAP.PENDING;
                      const items  = order.items ?? [];
                      const preview = items.slice(0, 2)
                        .map(i => `${i.rawMaterial?.name} ${i.quantity} ${i.rawMaterial?.unit}`)
                        .join(', ');
                      const more = items.length > 2 ? ` +${items.length - 2}` : '';

                      return (
                        <TableRow key={order.id} className="border-b border-slate-100/60 hover:bg-slate-50/40">
                          <TableCell className="pl-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {fmtDate(order.createdAt)}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              PO-{String(order.id).padStart(5, '0')}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 font-semibold text-slate-800">
                            {order.supplier?.name}
                          </TableCell>
                          <TableCell className="py-3 max-w-[240px]">
                            <p className="text-sm text-slate-600 truncate">{preview}{more}</p>
                          </TableCell>
                          <TableCell className="py-3 text-right font-bold">
                            {order.totalAmount > 0
                              ? <span className="text-primary">฿{Number(order.totalAmount).toLocaleString()}</span>
                              : <span className="text-slate-400 text-xs font-normal">ไม่ระบุ</span>}
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print single */}
                              <Button variant="outline" size="sm"
                                      onClick={() => handlePrintSingle(order)}
                                      className="h-7 px-2 rounded-lg text-xs font-bold gap-1 border-slate-200">
                                <Printer className="w-3 h-3" />
                                พิมพ์
                              </Button>
                              {/* Save PDF single */}
                              <Button size="sm"
                                      onClick={() => handleSavePdfSingle(order)}
                                      className="h-7 px-2 rounded-lg text-xs font-bold gap-1
                                                 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Download className="w-3 h-3" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Ordered Materials Card ─── */}
        <Card className="border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                รายการสั่งวัตถุดิบ — {periodLabel}
              </CardTitle>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search inside this section */}
                <div className="relative w-44">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="ค้นหาวัตถุดิบ..."
                    value={materialSearchQuery} 
                    onChange={e => setMaterialSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 h-8 border border-slate-200 rounded-lg text-xs
                               bg-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400" 
                  />
                </div>

                {/* Filter by Category */}
                <Select value={materialCategoryFilter} onValueChange={setMaterialCategoryFilter}>
                  <SelectTrigger className="rounded-lg h-8 w-36 bg-white border-slate-200 text-xs shrink-0">
                    <SelectValue placeholder="หมวดหมู่ทั้งหมด">
                      {materialCategoryFilter === 'all'
                        ? 'หมวดหมู่ทั้งหมด'
                        : (uniqueCategories.find(c => String(c.id) === materialCategoryFilter)?.name || materialCategoryFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
                    {uniqueCategories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filter by Supplier */}
                <Select value={materialSupplierFilter} onValueChange={setMaterialSupplierFilter}>
                  <SelectTrigger className="rounded-lg h-8 w-36 bg-white border-slate-200 text-xs shrink-0">
                    <SelectValue placeholder="ร้านค้าทั้งหมด">
                      {materialSupplierFilter === 'all'
                        ? 'ร้านค้าทั้งหมด'
                        : (uniqueSuppliersInPeriod.find(s => String(s.id) === materialSupplierFilter)?.name || materialSupplierFilter)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ร้านค้าทั้งหมด</SelectItem>
                    {uniqueSuppliersInPeriod.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                  {filteredFlatItems.length} รายการ
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!filteredFlatItems.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-600 text-base">ไม่พบรายการสั่งวัตถุดิบ</p>
                <p className="text-sm text-slate-400 mt-1">ทดลองเปลี่ยนช่วงเวลาหรือเงื่อนไขการกรอง</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                      <TableHead className="pl-5 font-bold text-slate-600 h-9 text-xs">ชื่อวัตถุดิบ</TableHead>
                      <TableHead className="font-bold text-slate-600 h-9 text-xs w-[180px]">หมวดหมู่</TableHead>
                      <TableHead className="font-bold text-slate-600 h-9 text-xs w-[200px]">ร้านค้า</TableHead>
                      <TableHead className="font-bold text-slate-600 h-9 text-xs text-right w-[140px]">จำนวนที่สั่ง</TableHead>
                      <TableHead className="font-bold text-slate-600 h-9 text-xs text-right w-[140px] pr-5">ยอดรวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFlatItems.map(item => (
                      <TableRow key={item.id} className="border-b border-slate-100/60 hover:bg-slate-50/40 text-xs">
                        <TableCell className="pl-5 py-2.5 font-semibold text-slate-800">
                          {item.name}
                        </TableCell>
                        <TableCell className="py-2.5 text-slate-500">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.category}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 text-slate-700 font-medium">
                          {item.supplier}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-bold text-slate-800">
                          {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} <span className="text-[10px] font-normal text-slate-500 ml-0.5">{item.unit}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-bold text-slate-900 pr-5">
                          {item.totalPrice > 0
                            ? `฿${Number(item.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : <span className="text-slate-400 font-normal">ไม่ระบุ</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════ PRINT: SINGLE ORDER ════════════════════════ */}
      {/*
          Visibility is controlled by CSS + body class.
          display:none is overridden by print media query.
      */}
      <div id="cpos-print-single" style={{ display: 'none' }}>
        {printOrder && (
          <div style={{ padding: 0, background: '#fff' }}>
            {/* Re-use layout from PDF template (same look) */}
            <div style={{ width: '100%', backgroundColor: '#fff', padding: '1.5cm 2cm', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #dc2626', paddingBottom: 14, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>NEXOS SYSTEM</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>ใบสั่งซื้อวัตถุดิบ</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                    สาขา: <strong>{branchName}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>เลขที่เอกสาร</div>
                  <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', marginTop: 2 }}>PO-{String(printOrder.id).padStart(5, '0')}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{fmtDate(printOrder.createdAt)}</div>
                  <div style={{ marginTop: 6, display: 'inline-block', fontSize: 9, fontWeight: 700, color: (STATUS_MAP[printOrder.status] ?? STATUS_MAP.PENDING).pdfColor, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                    {(STATUS_MAP[printOrder.status] ?? STATUS_MAP.PENDING).label}
                  </div>
                </div>
              </div>

              {/* Supplier box */}
              {(() => {
                const sup = printOrder.supplier;
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>ข้อมูลคู่ค้า</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 8px', fontSize: 11 }}>
                      <span style={{ fontWeight: 700 }}>ชื่อร้านค้า:</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{sup?.name ?? '-'}</span>
                      {sup?.phone       && <><span style={{ fontWeight: 700 }}>โทรศัพท์:</span><span>{sup.phone}</span></>}
                      {sup?.lineId      && <><span style={{ fontWeight: 700 }}>Line ID:</span><span>{sup.lineId}</span></>}
                      {sup?.bankAccount && <><span style={{ fontWeight: 700 }}>บัญชีธนาคาร:</span><span>{sup.bankAccount}{sup.bankName ? ` (${sup.bankName})` : ''}</span></>}
                    </div>
                  </div>
                );
              })()}

              {/* Items table */}
              {(() => {
                const isCompleted  = printOrder.status === 'COMPLETED';
                const printItems   = printOrder.items ?? [];
                const grandTotal   = printItems.reduce((s, i) => s + i.quantity * (i.price ?? 0), 0);
                const td: React.CSSProperties = { padding: '7px 10px', fontSize: 11, borderBottom: '1px solid #e2e8f0' };
                const headers = isCompleted
                  ? ['#', 'รายการวัตถุดิบ', 'หมวดหมู่', 'จำนวน', 'หน่วย', 'ราคา/หน่วย (฿)', 'ราคารวม (฿)']
                  : ['#', 'รายการวัตถุดิบ', 'หมวดหมู่', 'จำนวน', 'หน่วย'];
                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                        {headers.map((h, i) => (
                          <th key={i} style={{ padding: '7px 10px', fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: i < 3 ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {printItems.map((item, i) => {
                        const lineTotal = item.quantity * (item.price ?? 0);
                        return (
                          <tr key={item.id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                            <td style={{ ...td, color: '#94a3b8', textAlign: 'center', width: 28 }}>{i + 1}</td>
                            <td style={{ ...td, fontWeight: 600 }}>{item.rawMaterial?.name}</td>
                            <td style={{ ...td, color: '#64748b' }}>{item.rawMaterial?.category?.name ?? '-'}</td>
                            <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                            <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>{item.rawMaterial?.unit}</td>
                            {isCompleted && (
                              <>
                                <td style={{ ...td, textAlign: 'right' }}>
                                  ฿{(item.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#065f46' }}>
                                  ฿{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
                        {isCompleted ? (
                          <>
                            <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>ยอดรวมทั้งสิ้น</td>
                            <td colSpan={2} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#065f46' }}>
                              ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </>
                        ) : (
                          <>
                            <td colSpan={3} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>จำนวนรายการทั้งหมด</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 900, fontSize: 14 }}>{printItems.length}</td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }}>รายการ</td>
                          </>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 40 }}>
                {['ผู้จัดซื้อ', 'ผู้ตรวจสอบ / อนุมัติ'].map(r => (
                  <div key={r} style={{ textAlign: 'center' }}>
                    <div style={{ borderBottom: '1px dashed #0f172a', margin: '0 32px 8px', height: 30 }} />
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{r}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>วันที่ _____/_____/_____</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
                <span>สร้างโดยระบบ NEXOS • เอกสารนี้สร้างโดยอัตโนมัติ</span>
                <span>{dateStr}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════ PRINT: ALL ORDERS ══════════════════════════ */}
      <div id="cpos-print-all" style={{ display: 'none' }}>
        <div style={{ width: '100%', backgroundColor: '#fff', padding: '1.5cm 2cm', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', fontSize: 11 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #dc2626', paddingBottom: 14, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>NEXOS SYSTEM</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>รายงานการสั่งซื้อวัตถุดิบ</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                สาขา: <strong>{branchName}</strong> &nbsp;·&nbsp; ช่วงเวลา: <strong style={{ color: '#dc2626' }}>{periodLabel}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>วันที่ออกรายงาน</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{dateStr}</div>
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'จำนวนบิล', value: `${stats.count} บิล` },
              { label: 'ยอดรวม',  value: stats.totalAmount > 0 ? `฿${stats.totalAmount.toLocaleString()}` : 'ไม่ระบุ' },
              { label: 'ร้านค้า', value: `${stats.uniqueSuppliers} แห่ง` },
            ].map(k => (
              <div key={k.label} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{k.label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 3 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                {['#', 'เลขที่', 'วันที่', 'ร้านค้า', 'รายการวัตถุดิบ', 'ยอดรวม', 'สถานะ'].map((h, i) => (
                  <th key={i} style={{ padding: '6px 8px', fontSize: 7, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', textAlign: i >= 5 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o, idx) => {
                const st = STATUS_MAP[o.status] ?? STATUS_MAP.PENDING;
                const summary = o.items?.map(i => `${i.rawMaterial?.name} ${i.quantity}${i.rawMaterial?.unit}`).join(', ') ?? '';
                return (
                  <tr key={o.id} style={{ background: idx % 2 ? '#f8fafc' : '#fff', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '5px 8px', color: '#94a3b8', textAlign: 'center', width: 22 }}>{idx + 1}</td>
                    <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700 }}>PO-{String(o.id).padStart(5, '0')}</td>
                    <td style={{ padding: '5px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{fmtDateShort(o.createdAt)}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 600 }}>{o.supplier?.name}</td>
                    <td style={{ padding: '5px 8px', color: '#64748b' }}>{summary}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: o.totalAmount > 0 ? '#0f172a' : '#94a3b8' }}>
                      {o.totalAmount > 0 ? `฿${Number(o.totalAmount).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: st.pdfColor }}>{st.label}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
                <td colSpan={5} style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>ยอดรวมทั้งสิ้น</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: 13 }}>
                  {stats.totalAmount > 0 ? `฿${stats.totalAmount.toLocaleString()}` : '-'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, marginTop: 40 }}>
            {['ผู้จัดทำรายงาน', 'ผู้ตรวจสอบ', 'ผู้อนุมัติ'].map(r => (
              <div key={r} style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px dashed #0f172a', margin: '0 24px 8px', height: 28 }} />
                <div style={{ fontWeight: 700, fontSize: 10 }}>{r}</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>วันที่ _____/_____/_____</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 7, color: '#94a3b8' }}>
            <span>สร้างโดยระบบ NEXOS • เอกสารนี้สร้างโดยอัตโนมัติ</span>
            <span>หน้า 1 / 1 &nbsp;·&nbsp; {dateStr}</span>
          </div>
        </div>
      </div>
    </>
  );
}
