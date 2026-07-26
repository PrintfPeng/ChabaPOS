import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Card, CardContent } from '../../../components/ui/card';
import { Plus, Edit2, Trash2, Loader2, PackageOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { PinVerificationDialog } from '../../../components/PinVerificationDialog';

interface Material { id: number; name: string; unit: string; categoryId: number; category?: { id: number; name: string } }
interface Category { id: number; name: string }

export default function Materials() {
  const { branchId } = useParams();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: '', categoryId: '' });

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => void) | null>(null);

  useEffect(() => { fetchData(); }, [branchId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [matRes, catRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/raw-materials?branchId=${branchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3000/api/material-categories?branchId=${branchId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMaterials(matRes.data);
      setCategories(catRes.data);
    } catch {
      toast.error('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  // จัดกลุ่มวัตถุดิบตามหมวดหมู่
  const grouped = categories
    .map(cat => ({
      category: cat,
      items: materials.filter(m => m.categoryId === cat.id),
    }))
    .filter(g => g.items.length > 0);

  const uncategorized = materials.filter(m => !categories.find(c => c.id === m.categoryId));

  const handleSubmit = async () => {
    if (!formData.name || !formData.unit || !formData.categoryId) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formData, categoryId: Number(formData.categoryId) };
      if (editingId) {
        await axios.patch(`http://localhost:3000/api/raw-materials/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await axios.post('http://localhost:3000/api/raw-materials', { ...payload, branchId: Number(branchId) }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('เพิ่มวัตถุดิบสำเร็จ');
      }
      setIsOpen(false);
      fetchData();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = (id: number) => {
    setPendingDeleteAction(() => async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/raw-materials/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('ลบข้อมูลสำเร็จ');
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
      }
    });
    setIsPinDialogOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditingId(m.id);
    setFormData({ name: m.name, unit: m.unit, categoryId: String(m.categoryId) });
    setIsOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const MaterialCard = ({ m }: { m: Material }) => (
    <Card className="rounded-2xl shadow-sm border border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-800 truncate">{m.name}</h3>
            <span className="text-sm text-slate-500">1 {m.unit}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="text-blue-500 hover:bg-blue-50 h-8 w-8 rounded-lg">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">วัตถุดิบ (Raw Materials)</h2>
        <Dialog open={isOpen} onOpenChange={(v) => {
          setIsOpen(v);
          if (!v) { setEditingId(null); setFormData({ name: '', unit: '', categoryId: '' }); }
        }}>
          <DialogTrigger render={<Button className="rounded-xl font-bold" />}>
            <Plus className="w-4 h-4 mr-2" />เพิ่มวัตถุดิบ
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">ชื่อวัตถุดิบ</label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-11 rounded-xl" placeholder="เช่น ผักกาดขาว" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">หน่วยนับ</label>
                  <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="h-11 rounded-xl" placeholder="เช่น กิโลกรัม, แพ็ค" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">หมวดหมู่</label>
                  <Select
                    value={formData.categoryId !== '' ? formData.categoryId : undefined}
                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="เลือกหมวดหมู่">
                        {formData.categoryId !== ''
                          ? (categories.find(c => c.id.toString() === formData.categoryId)?.name ?? null)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-bold text-md mt-4">บันทึกข้อมูล</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grouped by category */}
      {grouped.length === 0 && uncategorized.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-semibold">ยังไม่มีวัตถุดิบ</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items }) => (
            <div key={category.id}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="font-extrabold text-slate-800 text-base">{category.name}</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length} รายการ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(m => <MaterialCard key={m.id} m={m} />)}
              </div>
            </div>
          ))}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-1 rounded-full bg-slate-300" />
                <h3 className="font-extrabold text-slate-500 text-base">ไม่มีหมวดหมู่</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{uncategorized.length} รายการ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uncategorized.map(m => <MaterialCard key={m.id} m={m} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <PinVerificationDialog
        isOpen={isPinDialogOpen}
        onClose={() => { setIsPinDialogOpen(false); setPendingDeleteAction(null); }}
        onSuccess={() => { setIsPinDialogOpen(false); if (pendingDeleteAction) pendingDeleteAction(); setPendingDeleteAction(null); }}
        title="ยืนยันการลบข้อมูล"
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบวัตถุดิบ"
      />
    </div>
  );
}
