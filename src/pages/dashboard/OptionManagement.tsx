import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOptions } from '../../hooks/useOptions';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, Loader2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export default function OptionManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  const { groups, isLoading, createGroup, updateGroup, deleteGroup, createOption, updateOption, deleteOption } = useOptions(bid);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newChoice, setNewChoice] = useState({ name: '', price: '', groupId: 0 });
  
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editingChoice, setEditingChoice] = useState<any | null>(null);

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isChoiceDialogOpen, setIsChoiceDialogOpen] = useState(false);

  const handleCreateGroup = async () => {
    if (!bid || !newGroupName) return;
    try {
      await createGroup({
        branchId: bid,
        name: newGroupName,
      });
      setNewGroupName('');
      setIsGroupDialogOpen(false);
      toast.success('สร้างกลุ่มตัวเลือกสำเร็จ');
    } catch (error) {
      toast.error('สร้างกลุ่มตัวเลือกไม่สำเร็จ');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName) return;
    try {
      await updateGroup({
        id: editingGroup.id,
        name: newGroupName,
      });
      setEditingGroup(null);
      setNewGroupName('');
      setIsGroupDialogOpen(false);
      toast.success('อัปเดตกลุ่มตัวเลือกสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตกลุ่มตัวเลือกไม่สำเร็จ');
    }
  };

  const handleCreateChoice = async () => {
    if (!newChoice.name || !newChoice.price || !newChoice.groupId) return;
    try {
      await createOption({
        optionGroupId: newChoice.groupId,
        name: newChoice.name,
        price: parseFloat(newChoice.price),
      });
      setNewChoice({ name: '', price: '', groupId: 0 });
      setIsChoiceDialogOpen(false);
      toast.success('เพิ่มตัวเลือกสำเร็จ');
    } catch (error) {
      toast.error('เพิ่มตัวเลือกไม่สำเร็จ');
    }
  };

  const handleUpdateChoice = async () => {
    if (!editingChoice || !newChoice.name || !newChoice.price) return;
    try {
      await updateOption({
        id: editingChoice.id,
        name: newChoice.name,
        price: parseFloat(newChoice.price),
      });
      setEditingChoice(null);
      setNewChoice({ name: '', price: '', groupId: 0 });
      setIsChoiceDialogOpen(false);
      toast.success('อัปเดตตัวเลือกสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตตัวเลือกไม่สำเร็จ');
    }
  };

  const openEditGroup = (group: any) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setIsGroupDialogOpen(true);
  };

  const openEditChoice = (choice: any) => {
    setEditingChoice(choice);
    setNewChoice({
      name: choice.name,
      price: choice.price.toString(),
      groupId: choice.optionGroupId,
    });
    setIsChoiceDialogOpen(true);
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await deleteGroup(id);
      toast.success('ลบกลุ่มตัวเลือกแล้ว');
    } catch (error) {
      toast.error('ลบกลุ่มตัวเลือกไม่สำเร็จ');
    }
  };

  const handleDeleteChoice = async (id: number) => {
    try {
      await deleteOption(id);
      toast.success('ลบตัวเลือกแล้ว');
    } catch (error) {
      toast.error('ลบตัวเลือกไม่สำเร็จ');
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
          <h1 className="text-2xl font-bold text-slate-900">จัดการตัวเลือกเสริม</h1>
          <p className="text-slate-500">สร้างตัวเลือกการปรับแต่ง เช่น "ระดับความหวาน" หรือ "ท็อปปิ้ง"</p>
        </div>
        <Dialog open={isGroupDialogOpen} onOpenChange={(open) => {
          setIsGroupDialogOpen(open);
          if (!open) {
            setEditingGroup(null);
            setNewGroupName('');
          }
        }}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            กลุ่มตัวเลือกใหม่
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'แก้ไขกลุ่มตัวเลือก' : 'เพิ่มกลุ่มตัวเลือก'}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>ชื่อกลุ่ม</Label>
              <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="เช่น ระดับความหวาน" />
            </div>
            <DialogFooter>
              <Button onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}>
                {editingGroup ? 'บันทึก' : 'สร้างกลุ่ม'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{group.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setNewChoice({...newChoice, groupId: group.id});
                  setIsChoiceDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" />
                  เพิ่มตัวเลือก
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEditGroup(group)}>
                  <Edit2 className="w-4 h-4 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {group.options?.map(choice => (
                  <div key={choice.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">{choice.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-500">+฿{choice.price.toFixed(2)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditChoice(choice)}>
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteChoice(choice.id)}>
                          <Trash2 className="w-3 h-3 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {group.options?.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4 italic">ยังไม่มีตัวเลือก</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isChoiceDialogOpen} onOpenChange={(open) => {
        setIsChoiceDialogOpen(open);
        if (!open) {
          setEditingChoice(null);
          setNewChoice({ name: '', price: '', groupId: 0 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChoice ? 'แก้ไขตัวเลือก' : 'เพิ่มตัวเลือก'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>ชื่อตัวเลือก</Label>
              <Input value={newChoice.name} onChange={(e) => setNewChoice({...newChoice, name: e.target.value})} placeholder="เช่น หวาน 50%" />
            </div>
            <div>
              <Label>ราคาเพิ่มเติม</Label>
              <Input type="number" value={newChoice.price} onChange={(e) => setNewChoice({...newChoice, price: e.target.value})} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={editingChoice ? handleUpdateChoice : handleCreateChoice}>
              {editingChoice ? 'บันทึก' : 'เพิ่มตัวเลือก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
