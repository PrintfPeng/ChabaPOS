import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Plus, Edit2, Trash2, Loader2, Store, Phone, MessageCircle, Landmark, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { PinVerificationDialog } from '../../../components/PinVerificationDialog';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
  id:          number;
  name:        string;
  contact?:    string;
  phone?:      string;
  lineId?:     string;
  bankAccount?: string;
  bankName?:   string;
}

type FormData = Omit<Supplier, 'id'>;

const EMPTY_FORM: FormData = {
  name: '', contact: '', phone: '', lineId: '', bankAccount: '', bankName: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Field = ({
  label, value, onChange, placeholder, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-10 rounded-xl text-sm"
      placeholder={placeholder}
    />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Suppliers() {
  const { branchId } = useParams<{ branchId: string }>();

  const [suppliers,  setSuppliers]  = useState<Supplier[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isOpen,     setIsOpen]     = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [formData,   setFormData]   = useState<FormData>(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const [isPinOpen,       setIsPinOpen]       = useState(false);
  const [pendingDelete,   setPendingDelete]   = useState<(() => void) | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (branchId) fetchSuppliers(); }, [branchId]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Supplier[]>(`/suppliers?branchId=${branchId}`);
      setSuppliers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key: keyof FormData) => (value: string) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const closeDialog = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormData({
      name:        s.name,
      contact:     s.contact     ?? '',
      phone:       s.phone       ?? '',
      lineId:      s.lineId      ?? '',
      bankAccount: s.bankAccount ?? '',
      bankName:    s.bankName    ?? '',
    });
    setIsOpen(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error('กรุณากรอกชื่อร้านค้า');
    try {
      if (editingId) {
        await api.patch(`/suppliers/${editingId}`, formData);
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await api.post('/suppliers', { ...formData, branchId: Number(branchId) });
        toast.success('เพิ่มร้านค้าสำเร็จ');
      }
      closeDialog();
      fetchSuppliers();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setPendingDelete(() => async () => {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success('ลบข้อมูลสำเร็จ');
        fetchSuppliers();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
      }
    });
    setIsPinOpen(true);
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone?.includes(searchQuery) ||
    s.lineId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">รายชื่อร้านค้า (Suppliers)</h2>
          <p className="text-sm text-slate-500">ข้อมูลซัพพลายเออร์และช่องทางการติดต่อ</p>
        </div>

        <Dialog open={isOpen} onOpenChange={v => { if (!v) closeDialog(); else setIsOpen(true); }}>
          <DialogTrigger render={<Button className="rounded-xl font-bold gap-2 h-10" />}>
            <Plus className="w-4 h-4" />เพิ่มร้านค้า
          </DialogTrigger>

          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">
                {editingId ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้าใหม่'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Required */}
              <Field label="ชื่อร้านค้า" value={formData.name} onChange={setField('name')}
                     placeholder="เช่น ร้านเจ๊หมวยผักสด" required />

              {/* Contact section */}
              <div className="pt-1 pb-0.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ช่องทางการติดต่อ</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="เบอร์โทรศัพท์" value={formData.phone ?? ''}
                       onChange={setField('phone')} placeholder="เช่น 081-234-5678" />
                <Field label="ไลน์ ID" value={formData.lineId ?? ''}
                       onChange={setField('lineId')} placeholder="เช่น @jaimuan" />
              </div>

              {/* Banking section */}
              <div className="pt-1 pb-0.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ข้อมูลธนาคาร</p>
              </div>
              <Field label="เลขบัญชีธนาคาร" value={formData.bankAccount ?? ''}
                     onChange={setField('bankAccount')} placeholder="เช่น 123-4-56789-0" />
              <Field label="ชื่อธนาคาร / ประเภทบัญชี" value={formData.bankName ?? ''}
                     onChange={setField('bankName')} placeholder="เช่น กสิกรไทย ออมทรัพย์" />

              <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-bold text-base mt-1">
                บันทึกข้อมูล
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="ค้นหาร้านค้า, เบอร์โทร, ไลน์..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 h-10 border border-slate-200 rounded-xl text-sm bg-white
                     focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400"
        />
      </div>

      {/* Supplier cards grid */}
      {!filtered.length ? (
        <div className="text-center py-16 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">
            {searchQuery ? `ไม่พบร้านค้าที่ค้นหา "${searchQuery}"` : 'ยังไม่มีร้านค้า กดปุ่ม "เพิ่มร้านค้า" เพื่อเริ่มต้น'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <Card key={s.id} className="rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Top row: name + actions */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-slate-900 truncate">{s.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => openEdit(s)}
                      className="h-8 w-8 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDelete(s.id)}
                      className="h-8 w-8 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 text-sm">
                  {s.phone ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  ) : null}

                  {s.lineId ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span>{s.lineId}</span>
                    </div>
                  ) : null}

                  {s.bankAccount ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Landmark className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-mono text-xs">
                        {s.bankAccount}
                        {s.bankName ? <span className="font-sans text-slate-400"> ({s.bankName})</span> : null}
                      </span>
                    </div>
                  ) : null}

                  {!s.phone && !s.lineId && !s.bankAccount && !s.contact && (
                    <p className="text-slate-400 text-xs italic">ไม่มีข้อมูลติดต่อ</p>
                  )}

                  {/* Legacy contact field (if set & no new fields) */}
                  {s.contact && !s.phone && !s.lineId && (
                    <p className="text-slate-500 text-xs">{s.contact}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PIN dialog */}
      <PinVerificationDialog
        isOpen={isPinOpen}
        onClose={() => { setIsPinOpen(false); setPendingDelete(null); }}
        onSuccess={() => {
          setIsPinOpen(false);
          if (pendingDelete) pendingDelete();
          setPendingDelete(null);
        }}
        title="ยืนยันการลบข้อมูล"
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบร้านค้า"
      />
    </div>
  );
}
