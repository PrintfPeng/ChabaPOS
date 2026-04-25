import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useKitchens } from '../../hooks/useKitchens';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, UtensilsCrossed, Loader2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function KitchenManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  const { kitchens, isLoading, createKitchen, updateKitchen, deleteKitchen } = useKitchens(bid);
  const [newKitchenName, setNewKitchenName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<any | null>(null);

  const handleCreateKitchen = async () => {
    if (!bid || !newKitchenName) return;

    try {
      await createKitchen({
        branchId: bid,
        name: newKitchenName,
      });
      setNewKitchenName('');
      setIsDialogOpen(false);
      toast.success('สร้างห้องครัวสำเร็จ');
    } catch (error) {
      console.error(error);
      toast.error('สร้างห้องครัวไม่สำเร็จ');
    }
  };

  const handleUpdateKitchen = async () => {
    if (!editingKitchen || !newKitchenName) return;
    try {
      await updateKitchen({
        id: editingKitchen.id,
        name: newKitchenName,
      });
      setEditingKitchen(null);
      setNewKitchenName('');
      setIsDialogOpen(false);
      toast.success('อัปเดตห้องครัวสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตห้องครัวไม่สำเร็จ');
    }
  };

  const openEditDialog = (kitchen: any) => {
    setEditingKitchen(kitchen);
    setNewKitchenName(kitchen.name);
    setIsDialogOpen(true);
  };

  const handleDeleteKitchen = async (id: number) => {
    try {
      await deleteKitchen(id);
      toast.success('ลบห้องครัวแล้ว');
    } catch (error) {
      console.error(error);
      toast.error('ลบห้องครัวไม่สำเร็จ');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการห้องครัว</h1>
          <p className="text-slate-500">จัดการห้องครัวสำหรับสาขานี้</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingKitchen(null);
            setNewKitchenName('');
          }
        }}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มห้องครัว
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingKitchen ? 'แก้ไขห้องครัว' : 'เพิ่มห้องครัวใหม่'}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="name">ชื่อห้องครัว</Label>
              <Input 
                id="name" 
                value={newKitchenName} 
                onChange={(e) => setNewKitchenName(e.target.value)}
                placeholder="เช่น ครัวหลัก, บาร์"
              />
            </div>
            <DialogFooter>
              <Button onClick={editingKitchen ? handleUpdateKitchen : handleCreateKitchen}>
                {editingKitchen ? 'บันทึกการแก้ไข' : 'สร้างห้องครัว'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(kitchens) && kitchens.map((kitchen) => (
          <Card key={kitchen.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">{kitchen.name}</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-end items-center mt-4 gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(kitchen)}>
                  <Edit2 className="h-4 w-4 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteKitchen(kitchen.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!Array.isArray(kitchens) || kitchens.length === 0) && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-500">ไม่พบห้องครัว เพิ่มห้องครัวเพื่อเริ่มต้น</p>
          </div>
        )}
      </div>
    </div>
  );
}
