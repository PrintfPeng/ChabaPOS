import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, ZoomIn,
  Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../components/ui/dialog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Transaction {
  id: number;
  slipUrl: string;
  note: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  brand: {
    id: number;
    name: string;
    user: { email: string; firstName: string; lastName: string };
  };
  plan: { id: number; name: string; price: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:  { label: 'รอดำเนินการ', bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock        },
  APPROVED: { label: 'อนุมัติแล้ว',  bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle2 },
  REJECTED: { label: 'ปฏิเสธแล้ว',  bg: 'bg-red-100',    text: 'text-red-700',    icon: XCircle      },
} as const;

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BillingManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [slipDialogOpen, setSlipDialogOpen] = useState(false);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get('/super-admin/billing/transactions')
      .then(res => setTransactions(res.data))
      .catch(() => toast.error('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await api.patch(`/super-admin/billing/${id}/approve`);
      setTransactions(prev =>
        prev.map(t => t.id === id ? { ...t, status: 'APPROVED' } : t)
      );
      toast.success('อนุมัติสำเร็จ บัญชีลูกค้าเปิดใช้งานแล้ว');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'อนุมัติไม่สำเร็จ');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setProcessingId(rejectingId);
    try {
      await api.patch(`/super-admin/billing/${rejectingId}/reject`, { note: rejectNote });
      setTransactions(prev =>
        prev.map(t => t.id === rejectingId ? { ...t, status: 'REJECTED', note: rejectNote || null } : t)
      );
      toast.success('ปฏิเสธรายการแล้ว');
      setRejectingId(null);
      setRejectNote('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'ดำเนินการไม่สำเร็จ');
    } finally {
      setProcessingId(null);
    }
  };

  const displayed = filter === 'PENDING'
    ? transactions.filter(t => t.status === 'PENDING')
    : transactions;

  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">Subscription & Billing</h1>
          <p className="text-sm text-slate-400 mt-1">ตรวจสอบสลิปโอนเงินและอนุมัติการเปิดใช้งานบัญชี</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
            filter === 'PENDING'
              ? 'bg-amber-100 text-amber-700'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          รอดำเนินการ
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            filter === 'ALL'
              ? 'bg-slate-200 text-slate-800'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          ทั้งหมด ({transactions.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>กำลังโหลด...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-300">
          <CheckCircle2 className="w-12 h-12" />
          <p className="font-bold text-slate-400">
            {filter === 'PENDING' ? 'ไม่มีรายการรอดำเนินการ' : 'ยังไม่มีรายการ'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(txn => (
            <div
              key={txn.id}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                txn.status === 'PENDING' ? 'border-amber-200 shadow-sm' : 'border-slate-200'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-slate-900">{txn.brand.name}</h3>
                      <StatusBadge status={txn.status} />
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {txn.brand.user.firstName} {txn.brand.user.lastName} ·{' '}
                      <span className="font-mono">{txn.brand.user.email}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                        <span className="text-slate-400 mr-1">แพ็กเกจ:</span>
                        <span className="font-semibold text-slate-800">{txn.plan.name}</span>
                        {txn.plan.price > 0 && (
                          <span className="text-slate-400 ml-1">฿{txn.plan.price.toLocaleString()}/เดือน</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(txn.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {txn.note && (
                      <p className="mt-2 text-sm text-red-500">
                        <span className="font-semibold">หมายเหตุ:</span> {txn.note}
                      </p>
                    )}
                  </div>

                  {/* Right: slip preview + actions */}
                  <div className="flex items-start gap-3 shrink-0">
                    {/* Slip thumbnail (preview only) */}
                    {txn.slipUrl && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={txn.slipUrl} alt="สลิป" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      {/* View slip — always visible */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-violet-200 text-violet-600 hover:bg-violet-50 h-9 px-4"
                        onClick={() => { setSelectedSlipUrl(txn.slipUrl); setSlipDialogOpen(true); }}
                        disabled={!txn.slipUrl}
                      >
                        <ZoomIn className="w-3.5 h-3.5 mr-1.5" />
                        ดูสลิป
                      </Button>

                      {/* Approve / Reject — only when PENDING */}
                      {txn.status === 'PENDING' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-4"
                            onClick={() => handleApprove(txn.id)}
                            disabled={processingId === txn.id}
                          >
                            {processingId === txn.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />อนุมัติ</>
                            }
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-500 hover:bg-red-50 h-9 px-4"
                            onClick={() => { setRejectingId(txn.id); setRejectNote(''); }}
                            disabled={processingId === txn.id}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            ปฏิเสธ
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reject note input (inline expand) */}
              {rejectingId === txn.id && (
                <div className="border-t border-red-100 bg-red-50 px-5 py-4">
                  <div className="flex items-center gap-2 mb-3 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="text-sm font-semibold">ระบุเหตุผลการปฏิเสธ (ไม่บังคับ)</p>
                  </div>
                  <textarea
                    rows={2}
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="เช่น สลิปไม่ชัดเจน, ยอดเงินไม่ถูกต้อง..."
                    className="w-full text-sm border border-red-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={handleReject}
                      disabled={processingId === txn.id}
                    >
                      {processingId === txn.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : 'ยืนยันการปฏิเสธ'
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRejectingId(null)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Slip image dialog */}
      <Dialog open={slipDialogOpen} onOpenChange={setSlipDialogOpen}>
        <DialogContent className="max-w-lg p-4">
          <DialogHeader>
            <DialogTitle>หลักฐานการโอนเงิน</DialogTitle>
          </DialogHeader>
          {selectedSlipUrl && (
            <img
              src={selectedSlipUrl}
              alt="สลิปโอนเงิน"
              className="w-full object-contain max-h-[70vh] rounded-xl mt-2"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
