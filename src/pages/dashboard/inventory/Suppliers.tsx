import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Plus, Edit2, Trash2, Loader2, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { PinVerificationDialog } from '../../../components/PinVerificationDialog';

export default function Suppliers() {
  const { branchId } = useParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', contact: '' });

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [branchId]);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/suppliers?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (error) {
      toast.error('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) return toast.error('กรุณากรอกชื่อร้านค้า');
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.patch(`http://localhost:3000/api/suppliers/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await axios.post('http://localhost:3000/api/suppliers', { ...formData, branchId: Number(branchId) }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('เพิ่มร้านค้าสำเร็จ');
      }
      setIsOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const confirmDelete = (action: () => void) => {
    setPendingDeleteAction(() => action);
    setIsPinDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    confirmDelete(async () => {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/suppliers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ลบข้อมูลสำเร็จ');
        fetchSuppliers();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
      }
    });
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setFormData({ name: s.name, contact: s.contact || '' });
    setIsOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">รายชื่อร้านค้า (Suppliers)</h2>
        <Dialog open={isOpen} onOpenChange={(v) => {
          setIsOpen(v);
          if (!v) { setEditingId(null); setFormData({ name: '', contact: '' }); }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold"><Plus className="w-4 h-4 mr-2" />เพิ่มร้านค้า</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้า'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">ชื่อร้านค้า (จำเป็น)</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl" placeholder="เช่น ร้านเจ๊หมวยผักสด" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">ข้อมูลติดต่อ</label>
                <Input value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="h-11 rounded-xl" placeholder="เช่น เบอร์โทร, Line" />
              </div>
              <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-bold text-md">บันทึกข้อมูล</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(suppliers) && suppliers.map(s => (
          <Card key={s.id} className="rounded-2xl shadow-sm border border-slate-200">
            <CardContent className="p-4 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{s.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.contact || 'ไม่มีข้อมูลติดต่อ'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-500 bg-red-50 hover:bg-red-100 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PinVerificationDialog
        isOpen={isPinDialogOpen}
        onClose={() => {
          setIsPinDialogOpen(false);
          setPendingDeleteAction(null);
        }}
        onSuccess={() => {
          setIsPinDialogOpen(false);
          if (pendingDeleteAction) pendingDeleteAction();
          setPendingDeleteAction(null);
        }}
        title="ยืนยันการลบข้อมูล"
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบร้านค้า"
      />
    </div>
  );
}
