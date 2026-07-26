import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useBranch } from '../../../hooks/useBranches';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/table';
import { Card, CardContent } from '../../../components/ui/card';
import {
  Users, Star, Search, Plus, Pencil, Loader2, Phone, UserCheck,
  Settings2, BadgePercent, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface Customer {
  id: number;
  phone: string;
  name: string;
  points: number;
  createdAt: string;
  _count?: { orders: number };
}

const EMPTY_FORM = { phone: '', name: '' };

/* ─── Reward Rate Setting Card ─────────────────────── */
function RewardRateCard({ branchId }: { branchId: number }) {
  const { branch, updateBranch } = useBranch(branchId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rateInput,    setRateInput]    = useState('');
  const [isSaving,     setIsSaving]     = useState(false);

  const currentRate = branch?.rewardPointRate ?? 100;

  const openDialog = () => {
    setRateInput(String(currentRate));
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const parsed = parseFloat(rateInput);
    if (!rateInput || isNaN(parsed) || parsed < 1) {
      return toast.error('กรุณากรอกตัวเลขที่ถูกต้อง (ขั้นต่ำ 1 บาท)');
    }
    setIsSaving(true);
    try {
      await updateBranch({ rewardPointRate: parsed });
      toast.success(`บันทึกสำเร็จ — ทุก ฿${parsed.toLocaleString()} = 1 แต้ม`);
      setIsDialogOpen(false);
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSaving(false);
    }
  };

  const presets = [25, 50, 100, 200];

  return (
    <>
      <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500/10 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-500 rounded-xl text-white shrink-0">
                <BadgePercent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  อัตราสะสมแต้ม
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h3 className="text-xl font-black text-slate-900 leading-none">
                    ฿{currentRate.toLocaleString()}
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-base font-black text-violet-600 leading-none">1 แต้ม</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openDialog}
              className="rounded-xl font-bold gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
              แก้ไข
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Reward Rate Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-violet-600" />
              ตั้งค่าอัตราการแจกแต้ม
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Current rate display */}
            <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-xs text-slate-400 font-semibold mb-1">อัตราปัจจุบัน</p>
              <p className="text-lg font-black text-slate-700">
                ฿{currentRate.toLocaleString()} = 1 แต้ม
              </p>
            </div>

            {/* Preset quick select */}
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">เลือกอัตราสำเร็จรูป</p>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setRateInput(String(p))}
                    className={cn(
                      'py-2 rounded-xl border-2 text-sm font-black transition-all',
                      rateInput === String(p)
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200',
                    )}
                  >
                    ฿{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-500">หรือกำหนดเอง (บาท / 1 แต้ม)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 pointer-events-none">฿</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="100"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="pl-7 h-11 rounded-xl font-bold text-lg"
                />
              </div>
              {rateInput && !isNaN(parseFloat(rateInput)) && parseFloat(rateInput) >= 1 && (
                <p className="text-xs text-violet-600 font-semibold flex items-center gap-1.5 pl-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ลูกค้าจ่ายทุก ฿{parseFloat(rateInput).toLocaleString()} จะได้ 1 แต้ม
                </p>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 rounded-xl font-bold bg-violet-600 hover:bg-violet-700"
            >
              {isSaving
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              บันทึกอัตราใหม่
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Main Page ─────────────────────────────────────── */
export default function MembersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useBranch(Number(branchId));

  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [searchQ,      setSearchQ]      = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing,      setEditing]      = useState<Customer | null>(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [isSaving,     setIsSaving]     = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.get(`/customers?branchId=${branchId}`);
      setCustomers(res.data);
    } catch {
      toast.error('ไม่สามารถโหลดรายชื่อสมาชิกได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [branchId]);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      c.phone.includes(searchQ),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ phone: c.phone, name: c.name });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.phone || !form.name) return toast.error('กรุณากรอกข้อมูลให้ครบ');
    setIsSaving(true);
    try {
      if (editing) {
        await api.patch(`/customers/${editing.id}`, { name: form.name });
        toast.success('แก้ไขข้อมูลสมาชิกสำเร็จ');
      } else {
        await api.post('/customers', { ...form, branchId: Number(branchId) });
        toast.success(`สมัครสมาชิก "${form.name}" สำเร็จ`);
      }
      setIsDialogOpen(false);
      fetchCustomers();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);
  const currentRate = branch?.rewardPointRate ?? 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            สะสมแต้ม: ทุก ฿{currentRate.toLocaleString()} = 1 แต้ม
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl font-bold gap-2">
          <Plus className="w-4 h-4" />
          สมัครสมาชิก
        </Button>
      </div>

      {/* KPI + Reward Rate row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: <Users className="w-5 h-5" />,
            label: 'สมาชิกทั้งหมด',
            value: `${customers.length} คน`,
            bg: 'bg-blue-500',
            from: 'from-blue-500/10',
          },
          {
            icon: <Star className="w-5 h-5" />,
            label: 'แต้มสะสมรวม',
            value: `${totalPoints.toLocaleString()} แต้ม`,
            bg: 'bg-amber-500',
            from: 'from-amber-500/10',
          },
          {
            icon: <UserCheck className="w-5 h-5" />,
            label: 'สมาชิกใหม่เดือนนี้',
            value: `${customers.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length} คน`,
            bg: 'bg-emerald-500',
            from: 'from-emerald-500/10',
          },
        ].map((k) => (
          <Card key={k.label} className={`border-none shadow-sm bg-gradient-to-br ${k.from} to-transparent`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 ${k.bg} rounded-xl text-white shrink-0`}>{k.icon}</div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
                <h3 className="text-xl font-black text-slate-900 leading-none mt-0.5">{k.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Reward Rate Card */}
        <RewardRateCard branchId={Number(branchId)} />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          placeholder="ค้นหาชื่อ / เบอร์โทร..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="pl-9 h-9 rounded-xl"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold text-slate-600">ชื่อสมาชิก</TableHead>
                <TableHead className="font-bold text-slate-600">เบอร์โทร</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">แต้มสะสม</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">ออเดอร์ทั้งหมด</TableHead>
                <TableHead className="font-bold text-slate-600">สมัครวันที่</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">ยังไม่มีสมาชิก</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-800">{c.name}</TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">{c.phone}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-extrabold text-sm ${c.points > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                        {c.points.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-500">
                      {c._count?.orders ?? 0}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(c.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขข้อมูลสมาชิก' : 'สมัครสมาชิกด่วน'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-500">เบอร์โทรศัพท์</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="0812345678"
                  value={form.phone}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="pl-9 h-10 rounded-xl"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-500">ชื่อ-นามสกุล</label>
              <Input
                placeholder="เช่น สมชาย ใจดี"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="h-10 rounded-xl"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 rounded-xl font-bold"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? 'บันทึกการแก้ไข' : 'สมัครสมาชิก'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
