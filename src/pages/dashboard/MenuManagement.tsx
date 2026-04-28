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
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { ImageUpload } from '../../components/ImageUpload';
import { uploadImageToSupabase } from '../../lib/supabase-storage';

export default function MenuManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  
  const { categories, menuItems, isLoading, createCategory, updateCategory, deleteCategory, createMenuItem, updateMenuItem, deleteMenuItem } = useMenus(bid);
  const { kitchens } = useKitchens(bid);
  const { groups: optionGroups } = useOptions(bid);
  const [activeTab, setActiveTab] = useState<string>('');
  
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Initialize active tab when categories are loaded
  React.useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id.toString());
    }
  }, [categories, activeTab]);

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
    setIsUploading(true);
    try {
      let finalImageUrl = newItem.imageUrl;
      
      // Upload to Supabase if a file was selected
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'items');
      }

      await createMenuItem({
        branchId: bid,
        name: newItem.name,
        price: parseFloat(newItem.price),
        categoryId: Number(newItem.categoryId),
        kitchenId: newItem.kitchenId ? Number(newItem.kitchenId) : undefined,
        imageUrl: finalImageUrl,
        optionGroupIds: newItem.optionGroupIds,
      });
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
      setSelectedFile(null);
      setIsItemDialogOpen(false);
      toast.success('สร้างรายการเมนูสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'สร้างรายการเมนูไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.name || !newItem.price || !newItem.categoryId) return;
    setIsUploading(true);
    try {
      let finalImageUrl = newItem.imageUrl;
      
      // Upload to Supabase if a new file was selected
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'items');
      }

      await updateMenuItem({
        id: editingItem.id,
        name: newItem.name,
        price: parseFloat(newItem.price),
        categoryId: Number(newItem.categoryId),
        kitchenId: newItem.kitchenId ? Number(newItem.kitchenId) : undefined,
        imageUrl: finalImageUrl,
        optionGroupIds: newItem.optionGroupIds,
      });
      setEditingItem(null);
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [] });
      setSelectedFile(null);
      setIsItemDialogOpen(false);
      toast.success('อัปเดตรายการเมนูสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'อัปเดตรายการเมนูไม่สำเร็จ');
    } finally {
      setIsUploading(false);
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
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">จัดการเมนู</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">จัดการหมวดหมู่และรายการเมนูของคุณ</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dialog open={isCatDialogOpen} onOpenChange={(open) => {
            setIsCatDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setNewCategoryName('');
            }
          }}>
            <DialogTrigger render={<Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold" />}>
              <Plus className="w-4 h-4 mr-2" />
              หมวดหมู่
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[32px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ชื่อหมวดหมู่</Label>
                <Input 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)} 
                  className="h-12 rounded-xl focus:ring-primary"
                  placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม..."
                />
              </div>
              <DialogFooter>
                <Button 
                  className="w-full h-12 rounded-xl font-black text-lg"
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                >
                  {editingCategory ? 'บันทึกการแก้ไข' : 'สร้างหมวดหมู่'}
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
            <DialogTrigger render={<Button className="flex-1 sm:flex-none h-11 rounded-xl font-black" />}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มรายการ
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[32px] overflow-hidden p-0 gap-0">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-6 sm:p-8 space-y-6">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">{editingItem ? 'แก้ไขรายการเมนู' : 'เพิ่มรายการเมนู'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">รูปภาพรายการ</Label>
                      <ImageUpload 
                        value={newItem.imageUrl} 
                        onChange={(url) => setNewItem({...newItem, imageUrl: url})} 
                        onFileSelect={(file) => setSelectedFile(file)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ชื่อรายการ</Label>
                        <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="h-11 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ราคา (฿)</Label>
                        <Input type="number" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="h-11 rounded-xl" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">หมวดหมู่</Label>
                        <Select value={newItem.categoryId} onValueChange={(val) => setNewItem({...newItem, categoryId: val})}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="เลือกหมวดหมู่" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(categories) && categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ส่งไปที่ครัว</Label>
                        <Select value={newItem.kitchenId} onValueChange={(val) => setNewItem({...newItem, kitchenId: val})}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="เลือกห้องครัว" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">ไม่ระบุ</SelectItem>
                            {Array.isArray(kitchens) && kitchens.map(k => (
                              <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ตัวเลือกเสริม (Options)</Label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {Array.isArray(optionGroups) && optionGroups.map(og => (
                          <div key={og.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer" onClick={() => {
                            const ids = newItem.optionGroupIds.includes(og.id)
                              ? newItem.optionGroupIds.filter(id => id !== og.id)
                              : [...newItem.optionGroupIds, og.id];
                            setNewItem({...newItem, optionGroupIds: ids});
                          }}>
                            <div className={cn(
                                "w-4 h-4 border-2 rounded flex items-center justify-center transition-all",
                                newItem.optionGroupIds.includes(og.id) ? "bg-primary border-primary text-white" : "border-slate-300"
                            )}>
                                {newItem.optionGroupIds.includes(og.id) && <Plus className="w-3 h-3 stroke-[4]" />}
                            </div>
                            <span className="text-xs font-bold text-slate-600 truncate">{og.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
                      onClick={editingItem ? handleUpdateItem : handleCreateItem}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        editingItem ? 'บันทึกการแก้ไข' : 'สร้างรายการเมนู'
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full whitespace-nowrap bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
          <TabsList className="bg-transparent h-auto p-0 flex gap-1">
            {Array.isArray(categories) && categories.map(cat => (
              <div key={cat.id} className="flex items-center group">
                <TabsTrigger 
                    value={cat.id.toString()} 
                    className="px-4 sm:px-8 py-2.5 sm:py-3 font-black text-xs sm:text-sm rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
                >
                  {cat.name}
                </TabsTrigger>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-primary/10 hover:text-primary" 
                    onClick={() => openEditCategory(cat)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </TabsList>
        </ScrollArea>

        <div className="mt-8">
            {Array.isArray(categories) && categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id.toString()} className="mt-0 focus-visible:ring-0">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
                {Array.isArray(menuItems) && menuItems.filter(item => item.categoryId === cat.id).map(item => (
                    <Card key={item.id} className="overflow-hidden border-none shadow-sm group hover:shadow-xl transition-all rounded-[24px] sm:rounded-[32px] flex flex-col bg-white">
                        <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden shrink-0">
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <LayoutGrid className="w-10 h-10" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg bg-white/90 backdrop-blur-sm" onClick={() => openEditItem(item)}>
                                    <Edit2 className="w-4 h-4 text-slate-600" />
                                </Button>
                                <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg" onClick={() => handleDeleteItem(item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="absolute bottom-2 left-2">
                                <Badge className="bg-white/95 text-slate-900 border-none font-black shadow-sm text-[10px] sm:text-xs">฿{item.price.toLocaleString()}</Badge>
                            </div>
                        </div>
                        <CardContent className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 line-clamp-1 text-sm sm:text-base leading-tight">{item.name}</h3>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 border-slate-100 text-slate-400 bg-slate-50 font-bold truncate max-w-[80px]">
                                        {Array.isArray(kitchens) && kitchens.find(k => k.id === item.kitchenId)?.name || 'ครัวกลาง'}
                                    </Badge>
                                    {Array.isArray(item.optionGroups) && item.optionGroups.slice(0, 1).map(og => (
                                        <Badge key={og.id} variant="secondary" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-none max-w-[60px] truncate">
                                            {og.name}
                                        </Badge>
                                    ))}
                                    {item.optionGroups?.length > 1 && (
                                        <span className="text-[8px] font-bold text-slate-300">+{item.optionGroups.length - 1}</span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {(!Array.isArray(menuItems) || menuItems.filter(item => item.categoryId === cat.id).length === 0) && (
                    <div className="col-span-full text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-4">
                        <div className="p-6 bg-slate-50 rounded-3xl">
                            <Plus className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold italic">ยังไม่มีรายการในหมวดหมู่นี้</p>
                    </div>
                )}
                </div>
            </TabsContent>
            ))}
        </div>
        
        {(!Array.isArray(categories) || categories.length === 0) && (
          <div className="text-center py-24 sm:py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-6">
            <div className="p-10 bg-slate-50 rounded-[48px]">
                <List className="w-16 h-16 text-slate-200" />
            </div>
            <div className="space-y-4 max-w-xs">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900">ยังไม่มีหมวดหมู่</h3>
                    <p className="text-sm text-slate-400 font-medium">สร้างหมวดหมู่แรกเพื่อเริ่มเพิ่มความอร่อยลงในเมนูของคุณ</p>
                </div>
                <Button className="rounded-2xl h-12 w-full font-black" onClick={() => setIsCatDialogOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    สร้างหมวดหมู่แรก
                </Button>
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
