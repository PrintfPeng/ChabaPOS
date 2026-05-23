import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Plus, Edit2, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';
import { PinVerificationDialog } from '../../../components/PinVerificationDialog';

export default function Categories() {
  const { branchId } = useParams();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [branchId]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/material-categories?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (error) {
      toast.error('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name) return toast.error('กรุณากรอกชื่อหมวดหมู่');
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.patch(`http://localhost:3000/api/material-categories/${editingId}`, { name }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('แก้ไขข้อมูลสำเร็จ');
      } else {
        await axios.post('http://localhost:3000/api/material-categories', { name, branchId: Number(branchId) }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('เพิ่มหมวดหมู่สำเร็จ');
      }
      setIsOpen(false);
      fetchCategories();
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
        await axios.delete(`http://localhost:3000/api/material-categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ลบข้อมูลสำเร็จ');
        fetchCategories();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'ลบข้อมูลไม่สำเร็จ');
      }
    });
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIsOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">หมวดหมู่วัตถุดิบ</h2>
        <Dialog open={isOpen} onOpenChange={(v) => {
          setIsOpen(v);
          if (!v) { setEditingId(null); setName(''); }
        }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold"><Plus className="w-4 h-4 mr-2" />เพิ่มหมวดหมู่</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">ชื่อหมวดหมู่ (จำเป็น)</label>
                <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" placeholder="เช่น ผักสด, เนื้อสัตว์" />
              </div>
              <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-bold text-md">บันทึก</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.isArray(categories) && categories.map(cat => (
          <Card key={cat.id} className="rounded-2xl shadow-sm border border-slate-200">
            <CardContent className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-700">{cat.name}</h3>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} className="text-blue-500 hover:bg-blue-50 h-8 w-8 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-red-500 hover:bg-red-50 h-8 w-8 rounded-lg">
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
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบหมวดหมู่ (วัตถุดิบข้างในอาจจะหายไปหรือไม่สามารถใช้งานได้)"
      />
    </div>
  );
}
