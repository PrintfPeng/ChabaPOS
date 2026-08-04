import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useBranch } from '../../../hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '../../../components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  Loader2, Printer, CheckCircle, Download, AlertCircle, ShoppingCart, RefreshCw, ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { createRoot } from 'react-dom/client';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawMaterial {
  id: number;
  name: string;
  unit: string;
  category?: { id: number; name: string };
}

interface PurchaseOrderItem {
  id: number;
  rawMaterialId: number;
  rawMaterial: RawMaterial;
  quantity: number;
  price: number;
}

interface PurchaseOrder {
  id: number;
  supplierId: number;
  supplier: { id: number; name: string; phone?: string } | null;
  branchId: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  orderDate: string;
  createdAt: string;
  items: PurchaseOrderItem[];
}

interface ReceiptItemState {
  rawMaterialId: number;
  quantityOrdered: number;
  actualQuantity: number;
  pricePerUnit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF / Print Template (Inline styling only for exact canvas render)
// ─────────────────────────────────────────────────────────────────────────────
function PdfReceiptTemplate({
  po,
  receiptItems,
  grandTotal,
  branchName,
}: {
  po: PurchaseOrder;
  receiptItems: Record<number, ReceiptItemState>;
  grandTotal: number;
  branchName: string;
}) {
  const now      = new Date();
  const dateStr  = now.toLocaleDateString('th-TH',  { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr  = now.toLocaleTimeString('th-TH',  { hour: '2-digit', minute: '2-digit' });
  const sup      = po.supplier;

  const s: Record<string, React.CSSProperties> = {
    root:     { width: 794, backgroundColor: '#fff', padding: '32px 40px 28px', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' },
    hdr:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #10b981', paddingBottom: 16, marginBottom: 20 },
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
      <div style={s.hdr}>
        <div>
          <div style={s.brand}>CHABAPOS SYSTEM</div>
          <div style={s.title}>ใบรับเข้าสินค้า & บันทึกรายจ่าย</div>
          <div style={s.sub}>สาขา: <strong style={{ color: '#0f172a' }}>{branchName}</strong></div>
        </div>
        <div style={s.metaWrap}>
          <div style={s.metaLbl}>อ้างอิงใบสั่งซื้อ</div>
          <div style={{ ...s.metaVal, fontFamily: 'monospace' }}>PO-{String(po.id).padStart(5, '0')}</div>
          <div style={s.metaSub}>วันที่ทำรายการสั่งซื้อ: {new Date(po.createdAt).toLocaleDateString('th-TH')}</div>
          <div style={{ marginTop: 6, display: 'inline-block', fontSize: 9, fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4 }}>
            รับเข้าคลังเรียบร้อย
          </div>
        </div>
      </div>

      <div style={s.supBox}>
        <div style={s.supLbl}>ข้อมูลผู้ให้บริการ (Supplier)</div>
        <div style={s.grid2}>
          <span style={{ fontWeight: 700 }}>ชื่อร้านค้า:</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{sup?.name ?? '-'}</span>
          {sup?.phone       && <><span style={{ fontWeight: 700 }}>โทรศัพท์:</span><span>{sup.phone}</span></>}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            {['#', 'รายการวัตถุดิบ', 'จำนวนสั่ง', 'จำนวนรับจริง', 'หน่วย', 'ราคา/หน่วย', 'ราคารวม'].map((h, i) => (
              <th key={i} style={{ ...s.th, textAlign: i < 2 || i === 4 ? 'left' : 'right' as any }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {po.items.map((item, i) => {
            const rItem = receiptItems[item.rawMaterialId];
            const qty = rItem?.actualQuantity ?? 0;
            const price = rItem?.pricePerUnit ?? 0;
            const total = qty * price;
            return (
              <tr key={item.id} style={{ background: i % 2 ? '#f8fafc' : '#fff' }}>
                <td style={{ ...s.td, color: '#94a3b8', width: 28, textAlign: 'center' }}>{i + 1}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{item.rawMaterial?.name}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: '#047857' }}>{qty}</td>
                <td style={{ ...s.td, color: '#64748b' }}>{item.rawMaterial?.unit}</td>
                <td style={{ ...s.td, textAlign: 'right' }}>฿{price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>฿{total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #0f172a', background: '#f8fafc' }}>
            <td colSpan={5} style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>ยอดเงินรวมรายจ่ายทั้งสิ้น</td>
            <td colSpan={2} style={{ ...s.td, textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#10b981' }}>
              ฿{grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={s.sigWrap}>
        {['ผู้รับของ / บันทึกรายจ่าย', 'ผู้จัดการสาขา / ผู้อนุมัติ'].map(r => (
          <div key={r} style={{ textAlign: 'center' }}>
            <div style={s.sigLine} />
            <div style={{ fontWeight: 700, fontSize: 11 }}>{r}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>วันที่ _____/_____/_____</div>
          </div>
        ))}
      </div>

      <div style={s.footer}>
        <span>สร้างโดยระบบ CHABAPOS • เอกสารบันทึกรับเข้าสินค้า</span>
        <span>{dateStr} {timeStr}</span>
      </div>
    </div>
  );
}

// ─── PDF Render helper ────────────────────────────────────────────────────────
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
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Expenses() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch }   = useBranch(Number(branchId));

  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPoId,  setSelectedPoId]  = useState<number | ''>('');
  const [isLoading,     setIsLoading]     = useState(true);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [receiptItems,  setReceiptItems]  = useState<Record<number, ReceiptItemState>>({});

  const branchName  = branch?.name ?? `สาขา #${branchId}`;

  // ── Fetch Pending POs ──────────────────────────────────────────────────────
  const fetchPendingOrders = async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await api.get<PurchaseOrder[]>(`/purchase-orders?branchId=${branchId}`);
      const pending = (Array.isArray(res.data) ? res.data : []).filter(o => o.status === 'PENDING');
      setPendingOrders(pending);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, [branchId]);

  // ── Find Selected PO ───────────────────────────────────────────────────────
  const selectedPo = useMemo(() => {
    if (!selectedPoId) return null;
    return pendingOrders.find(o => o.id === selectedPoId) || null;
  }, [selectedPoId, pendingOrders]);

  // ── Initialize inputs when PO is selected ──────────────────────────────────
  useEffect(() => {
    if (selectedPo) {
      const initial: Record<number, ReceiptItemState> = {};
      selectedPo.items.forEach(item => {
        initial[item.rawMaterialId] = {
          rawMaterialId: item.rawMaterialId,
          quantityOrdered: item.quantity,
          actualQuantity: item.quantity, // Default to ordered quantity
          pricePerUnit: item.price || 0, // Default to price from PO or 0
        };
      });
      setReceiptItems(initial);
    } else {
      setReceiptItems({});
    }
  }, [selectedPo]);

  // ── Grand Total calculation ────────────────────────────────────────────────
  const grandTotal = useMemo(() => {
    return (Object.values(receiptItems) as ReceiptItemState[]).reduce(
      (sum, item) => sum + (item.actualQuantity * item.pricePerUnit),
      0
    );
  }, [receiptItems]);

  // ── Update Input Fields ────────────────────────────────────────────────────
  const handleQtyChange = (rawMaterialId: number, val: number) => {
    setReceiptItems(prev => ({
      ...prev,
      [rawMaterialId]: {
        ...prev[rawMaterialId],
        actualQuantity: val,
      }
    }));
  };

  const handlePriceChange = (rawMaterialId: number, val: number) => {
    setReceiptItems(prev => ({
      ...prev,
      [rawMaterialId]: {
        ...prev[rawMaterialId],
        pricePerUnit: val,
      }
    }));
  };

  // ── Print receipt ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!selectedPo) return;
    setTimeout(() => {
      document.body.classList.add('cpos-print-receipt');
      window.print();
      setTimeout(() => document.body.classList.remove('cpos-print-receipt'), 600);
    }, 150);
  };

  // ── PDF Download ──────────────────────────────────────────────────────────
  const handleSavePdf = async () => {
    if (!selectedPo) return;
    const toastId = toast.loading('กำลังสร้าง PDF...');
    try {
      await renderToPdf(
        <PdfReceiptTemplate
          po={selectedPo}
          receiptItems={receiptItems}
          grandTotal={grandTotal}
          branchName={branchName}
        />,
        `ใบรับเข้า_PO-${String(selectedPo.id).padStart(5, '0')}.pdf`,
        toastId,
      );
    } catch (e: any) {
      toast.error(`สร้าง PDF ล้มเหลว: ${e?.message}`, { id: toastId });
    }
  };

  // ── Save Receipt & Expense ─────────────────────────────────────────────────
  const handleSaveExpense = async () => {
    if (!selectedPo) return;
    
    // Validate inputs
    const itemsArray = Object.values(receiptItems) as ReceiptItemState[];
    const hasZeroOrLessQty = itemsArray.some(i => i.actualQuantity < 0);
    const hasNegativePrice = itemsArray.some(i => i.pricePerUnit < 0);

    if (hasZeroOrLessQty) {
      return toast.error('จำนวนที่รับจริงต้องมีค่ามากกว่าหรือเท่ากับ 0');
    }
    if (hasNegativePrice) {
      return toast.error('ราคาต่อหน่วยต้องไม่ติดลบ');
    }

    setIsSubmitting(true);
    try {
      // POST payload to process Goods Receipt & Expenses
      await api.post(`/purchase-orders/${selectedPo.id}/receive`, {
        totalAmount: grandTotal,
        items: itemsArray.map(i => ({
          rawMaterialId: i.rawMaterialId,
          actualQuantity: i.actualQuantity,
          pricePerUnit: i.pricePerUnit,
        }))
      });

      toast.success('บันทึกรับเข้าคลังและบันทึกรายจ่ายเสร็จสมบูรณ์!');
      setSelectedPoId('');
      fetchPendingOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกรายจ่าย');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* ── Print Media CSS ── */}
      <style>{`
        @media print {
          body.cpos-print-receipt * { visibility: hidden !important; }
          body.cpos-print-receipt #cpos-print-receipt {
            visibility: visible !important;
            display: block !important;
            position: absolute; left: 0; top: 0; width: 100%; z-index: 9999;
          }
          body.cpos-print-receipt #cpos-print-receipt * { visibility: visible !important; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      {/* ═══════════════════════ SCREEN UI ══════════════════════════════════ */}
      <div className="space-y-5 print:hidden">
        
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">บันทึกรับเข้าสินค้า & รายจ่าย</h2>
            <p className="text-sm text-slate-500 mt-0.5">รับเข้าวัตถุดิบจากการสั่งซื้อและบันทึกต้นทุนรายจ่ายจริง</p>
          </div>
          <div className="flex items-center shrink-0">
            <Button variant="outline" size="icon" onClick={fetchPendingOrders}
                    className="rounded-xl h-9 w-9 border-slate-200" title="รีเฟรช">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PO Selector Selector */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <CardHeader className="py-4 px-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-sm font-bold text-slate-800">ขั้นตอนที่ 1: เลือกใบสั่งซื้อวัตถุดิบ (PO)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="max-w-md space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">เลือกบิลสั่งซื้อที่ค้างดำเนินการ</label>
              <Select
                value={selectedPoId !== '' ? String(selectedPoId) : ''}
                onValueChange={(val) => setSelectedPoId(val !== '' ? Number(val) : '')}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 text-sm">
                  <SelectValue placeholder={pendingOrders.length ? 'เลือกใบสั่งซื้อ...' : 'ไม่มีใบสั่งซื้อค้างรับของ'}>
                    {selectedPoId !== '' && selectedPo
                      ? `PO-${String(selectedPo.id).padStart(5, '0')} · ${selectedPo.supplier?.name ?? 'ไม่ระบุผู้จัดหา'}`
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pendingOrders.map(o => {
                    const poLabel = `PO-${String(o.id).padStart(5, '0')}`;
                    const supplierName = o.supplier?.name ?? 'ไม่ระบุผู้จัดหา';
                    const dateLabel = new Date(o.orderDate ?? o.createdAt).toLocaleDateString('th-TH', {
                      day: '2-digit', month: 'short', year: '2-digit',
                    });
                    return (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {poLabel} · {supplierName} · {dateLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Goods Receipt content */}
        {!selectedPo ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-base">กรุณาเลือกใบสั่งซื้อ</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                กรุณาเลือกใบสั่งซื้อวัตถุดิบด้านบนเพื่อเริ่มตรวจรับและบันทึกรายจ่ายจริง
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="py-4 px-5 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-800">
                  ขั้นตอนที่ 2: ตรวจรับสินค้า & กรอกราคารายจ่ายจริง
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  อ้างอิงใบสั่งซื้อ PO-{String(selectedPo.id).padStart(5, '0')} · ผู้จัดหา: {selectedPo.supplier?.name}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold gap-1">
                  <Printer className="w-3.5 h-3.5" /> พิมพ์
                </Button>
                <Button onClick={handleSavePdf} variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold gap-1">
                  <Download className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                      <TableHead className="pl-5 font-bold text-slate-600 h-10 w-[50px] text-center">#</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10">วัตถุดิบ</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-right w-[100px]">จำนวนที่สั่ง</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-center w-[120px]">หน่วยนับ</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-right w-[130px] bg-emerald-50/40 text-emerald-800">จำนวนที่รับจริง</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-right w-[150px] bg-emerald-50/40 text-emerald-800 font-black">ราคา/หน่วย (฿)</TableHead>
                      <TableHead className="font-bold text-slate-600 h-10 text-right w-[140px] pr-5">ราคารวม (฿)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPo.items.map((item, idx) => {
                      const itemState = receiptItems[item.rawMaterialId] || {
                        rawMaterialId: item.rawMaterialId,
                        quantityOrdered: item.quantity,
                        actualQuantity: 0,
                        pricePerUnit: 0,
                      };
                      const itemTotal = itemState.actualQuantity * itemState.pricePerUnit;

                      return (
                        <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell className="py-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</TableCell>
                          <TableCell className="py-3 font-semibold text-slate-800">
                            {item.rawMaterial?.name}
                            {item.rawMaterial?.category && (
                              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                                {item.rawMaterial.category.name}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right text-slate-500 font-semibold">{item.quantity}</TableCell>
                          <TableCell className="py-3 text-center text-slate-500 text-xs">{item.rawMaterial?.unit}</TableCell>
                          {/* Received Qty Input */}
                          <TableCell className="py-2 bg-emerald-50/20">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={itemState.actualQuantity}
                              onChange={e => handleQtyChange(item.rawMaterialId, parseFloat(e.target.value) || 0)}
                              className="h-9 w-full text-right rounded-lg border-emerald-200 bg-white font-bold text-emerald-950 focus:ring-emerald-500"
                            />
                          </TableCell>
                          {/* Price Input */}
                          <TableCell className="py-2 bg-emerald-50/20">
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={itemState.pricePerUnit}
                                onChange={e => handlePriceChange(item.rawMaterialId, parseFloat(e.target.value) || 0)}
                                className="h-9 w-full text-right pr-2 rounded-lg border-emerald-200 bg-white font-bold text-emerald-950 focus:ring-emerald-500"
                              />
                            </div>
                          </TableCell>
                          {/* Item Total */}
                          <TableCell className="py-3 text-right font-bold text-slate-800 pr-5">
                            ฿{itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Bottom Summary Bar */}
              <div className="p-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex gap-4">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    ยอดรวมรายการทั้งหมด
                    <p className="text-slate-800 text-lg font-black mt-0.5">{selectedPo.items.length} รายการ</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">ยอดจ่ายรวมสุทธิ</span>
                    <p className="text-2xl font-black text-emerald-600 leading-none mt-1">
                      ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveExpense}
                    disabled={isSubmitting}
                    className="h-11 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 transition-transform active:scale-95"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        บันทึกรายจ่าย & รับของ
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══════════════════════ PRINT CONTAINER ════════════════════════════ */}
      <div id="cpos-print-receipt" style={{ display: 'none' }}>
        {selectedPo && (
          <div style={{ padding: 0, background: '#fff' }}>
            <PdfReceiptTemplate
              po={selectedPo}
              receiptItems={receiptItems}
              grandTotal={grandTotal}
              branchName={branchName}
            />
          </div>
        )}
      </div>
    </>
  );
}
