import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: number;
  phone: string;
  name: string;
  points: number;
  createdAt: string;
  _count?: { orders: number };
}

const EMPTY_FORM = { phone: '', name: '' };

export default function MembersPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [searchQ, setSearchQ]       = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<Customer | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [isSaving, setIsSaving]     = useState(false);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">จัดการสมาชิก</h2>
          <p className="text-sm text-slate-500 mt-0.5">ระบบสะสมแต้มลูกค้า (100 บาท = 1 แต้ม)</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl font-bold gap-2">
          <Plus className="w-4 h-4" />
          สมัครสมาชิก
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, label: 'สมาชิกทั้งหมด', value: `${customers.length} คน`, bg: 'bg-blue-500', from: 'from-blue-500/10' },
          { icon: <Star  className="w-5 h-5" />, label: 'แต้มสะสมรวม',   value: `${totalPoints.toLocaleString()} แต้ม`, bg: 'bg-amber-500', from: 'from-amber-500/10' },
          { icon: <UserCheck className="w-5 h-5" />, label: 'สมาชิกใหม่เดือนนี้', value: `${customers.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length} คน`, bg: 'bg-emerald-500', from: 'from-emerald-500/10' },
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
