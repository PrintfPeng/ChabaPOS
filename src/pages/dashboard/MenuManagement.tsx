import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMenus } from '../../hooks/useMenus';
import { useKitchens } from '../../hooks/useKitchens';
import { useOptions } from '../../hooks/useOptions';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, LayoutGrid, List, Loader2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

export default function MenuManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  
  const { categories, menuItems, isLoading, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem } = useMenus(bid);
  const { kitchens } = useKitchens(bid);
  const { groups: optionGroups } = useOptions(bid);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState<{
    name: string;
    price: string;
    categoryId: string;
    kitchenId: string;
    imageUrl: string;
    optionGroupIds: number[];
  }>({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
  
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);

  const handleCreateCategory = async () => {
    if (!bid || !newCategoryName) return;
    try {
      await createCategory({
        branchId: bid,
        name: newCategoryName,
      });
      setNewCategoryName('');
      setIsCatDialogOpen(false);
      toast.success('สร้างหมวดหมู่สำเร็จ');
    } catch (error) {
      toast.error('สร้างหมวดหมู่ไม่สำเร็จ');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName) return;
    try {
      await updateCategory({
        id: editingCategory.id,
        name: newCategoryName,
      });
      setEditingCategory(null);
      setNewCategoryName('');
      setIsCatDialogOpen(false);
      toast.success('อัปเดตหมวดหมู่สำเร็จ');
    } catch (error) {
      toast.error('อัปเดตหมวดหมู่ไม่สำเร็จ');
    }
  };

  const handleCreateItem = async () => {
    if (!bid || !newItem.name || !newItem.price || !newItem.categoryId) return;
    try {
      await createMenuItem({
        branchId: bid,
        name: newItem.name,
        price: parseFloat(newItem.price),
        categoryId: Number(newItem.categoryId),
        kitchenId: newItem.kitchenId ? Number(newItem.kitchenId) : undefined,
        imageUrl: newItem.imageUrl,
        optionGroupIds: newItem.optionGroupIds,
      });
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
      setIsItemDialogOpen(false);
      toast.success('สร้างรายการเมนูสำเร็จ');
    } catch (error) {
      toast.error('สร้างรายการเมนูไม่สำเร็จ');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.name || !newItem.price || !newItem.categoryId) return;
    try {
      await updateMenuItem({
        id: editingItem.id,
        name: newItem.name,
        price: parseFloat(newItem.price),
        categoryId: Number(newItem.categoryId),
        kitchenId: newItem.kitchenId ? Number(newItem.kitchenId) : undefined,
        imageUrl: newItem.imageUrl,
        optionGroupIds: newItem.optionGroupIds,
      });
      setEditingItem(null);
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
      setIsItemDialogOpen(false);
      toast.success('อัปเดตรายการเมนูสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตรายการเมนูไม่สำเร็จ');
    }
  };

  const openEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setNewCategoryName(cat.name);
    setIsCatDialogOpen(true);
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      categoryId: item.categoryId.toString(),
      kitchenId: item.kitchenId?.toString() || '',
      imageUrl: item.imageUrl || '',
      optionGroupIds: item.optionGroups?.map((og: any) => og.id) || [],
    });
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteMenuItem(id);
      toast.success('ลบรายการแล้ว');
    } catch (error) {
      toast.error('ลบรายการไม่สำเร็จ');
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
          <h1 className="text-2xl font-bold text-slate-900">จัดการเมนู</h1>
          <p className="text-slate-500">จัดการหมวดหมู่และรายการเมนูของคุณ</p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isCatDialogOpen} onOpenChange={(open) => {
            setIsCatDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setNewCategoryName('');
            }
          }}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Plus className="w-4 h-4 mr-2" />
              หมวดหมู่ใหม่
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>ชื่อหมวดหมู่</Label>
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                  {editingCategory ? 'บันทึก' : 'สร้าง'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
            setIsItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
            }
          }}>
            <DialogTrigger render={<Button />}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มรายการเมนู
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'แก้ไขรายการเมนู' : 'เพิ่มรายการเมนู'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>ชื่อรายการ</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div>
                  <Label>ราคา</Label>
                  <Input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                </div>
                <div>
                  <Label>URL รูปภาพ (ไม่บังคับ)</Label>
                  <Input value={newItem.imageUrl} onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div>
                  <Label>หมวดหมู่</Label>
                  <Select value={newItem.categoryId} onValueChange={(val) => setNewItem({...newItem, categoryId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ห้องครัว (ไม่บังคับ)</Label>
                  <Select value={newItem.kitchenId} onValueChange={(val) => setNewItem({...newItem, kitchenId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกห้องครัว" />
                    </SelectTrigger>
                    <SelectContent>
                      {kitchens.map(k => (
                        <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ตัวเลือกเสริม</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {optionGroups.map(og => (
                      <div key={og.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={`og-${og.id}`}
                          checked={newItem.optionGroupIds.includes(og.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...newItem.optionGroupIds, og.id]
                              : newItem.optionGroupIds.filter(id => id !== og.id);
                            setNewItem({...newItem, optionGroupIds: ids});
                          }}
                        />
                        <label htmlFor={`og-${og.id}`} className="text-sm">{og.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={editingItem ? handleUpdateItem : handleCreateItem}>
                  {editingItem ? 'บันทึกการแก้ไข' : 'สร้างรายการ'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue={categories[0]?.id?.toString()} className="w-full">
        <TabsList className="mb-8 flex-wrap h-auto p-1 bg-slate-100">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center">
              <TabsTrigger value={cat.id.toString()} className="px-6 py-2">
                {cat.name}
              </TabsTrigger>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-1" onClick={() => openEditCategory(cat)}>
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat.id} value={cat.id.toString()}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.filter(item => item.categoryId === cat.id).map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <LayoutGrid className="w-8 h-8" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-900">{item.name}</h3>
                        <p className="text-primary font-semibold mt-1">฿{item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        ห้องครัว: {kitchens.find(k => k.id === item.kitchenId)?.name || 'ไม่มี'}
                      </span>
                      {item.optionGroups?.map(og => (
                        <span key={og.id} className="text-xs bg-primary/10 px-2 py-1 rounded text-primary">
                          {og.name}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {menuItems.filter(item => item.categoryId === cat.id).length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-500">ยังไม่มีรายการในหมวดหมู่นี้</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <List className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีหมวดหมู่</h3>
            <p className="text-slate-500">สร้างหมวดหมู่ก่อนเพื่อเพิ่มรายการเมนู</p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
