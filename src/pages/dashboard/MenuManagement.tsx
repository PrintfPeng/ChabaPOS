import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMenus } from '../../hooks/useMenus';
import { useKitchens } from '../../hooks/useKitchens';
import { useOptions } from '../../hooks/useOptions';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, LayoutGrid, List, Loader2, Edit2, Bike, CheckSquare, Square, Search } from 'lucide-react';
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
import { PinVerificationDialog } from '../../components/PinVerificationDialog';

export default function MenuManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  
  const {
    categories,
    menuItems,
    deliveryPlatforms,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    createDeliveryPlatform,
    updateDeliveryPlatform,
    deleteDeliveryPlatform,
    bulkUpdateDeliveryStatus,
  } = useMenus(bid);
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
    deliveryPrices?: { platformId: number; price: number }[];
    isDeliveryAvailable: boolean;
  }>({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [], deliveryPrices: [], isDeliveryAvailable: true });
  
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [editingPlatform, setEditingPlatform] = useState<any | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => void) | null>(null);

  // Delivery filter dialog
  const [isDeliveryFilterOpen, setIsDeliveryFilterOpen] = useState(false);
  const [deliveryEnabledIds, setDeliveryEnabledIds] = useState<Set<number>>(new Set());
  const [deliverySearch, setDeliverySearch] = useState('');
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  // Initialize active tab when categories are loaded
  React.useEffect(() => {
    if (Array.isArray(categories) && categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id.toString());
    }
  }, [categories, activeTab]);

  const handleCreateCategory = async () => {
    if (!bid || !newCategoryName) return;
    
    // Frontend Duplicate Validation
    if (Array.isArray(categories) && categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
      return toast.error('ชื่อหมวดหมู่นี้มีอยู่ในระบบแล้ว');
    }

    try {
      await createCategory({
        branchId: bid,
        name: newCategoryName,
      });
      setNewCategoryName('');
      setIsCatDialogOpen(false);
      toast.success('สร้างหมวดหมู่สำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'สร้างหมวดหมู่ไม่สำเร็จ');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'อัปเดตหมวดหมู่ไม่สำเร็จ');
    }
  };

  const handleCreateItem = async () => {
    if (!newItem.name || !newItem.price) return;
    if (!newItem.categoryId || newItem.categoryId === "") {
      return toast.error("กรุณาเลือกหมวดหมู่สินค้า");
    }
    if (!newItem.kitchenId || newItem.kitchenId === "") {
      return toast.error("กรุณาเลือกห้องครัวสำหรับส่งออเดอร์");
    }
    
    if (Array.isArray(menuItems) && menuItems.some(item => item.name.toLowerCase() === newItem.name.toLowerCase())) {
      return toast.error('ชื่อเมนูนี้มีอยู่ในระบบแล้ว');
    }

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
        kitchenId: Number(newItem.kitchenId),
        imageUrl: finalImageUrl,
        optionGroupIds: newItem.optionGroupIds,
        deliveryPrices: newItem.deliveryPrices,
        isDeliveryAvailable: newItem.isDeliveryAvailable,
      });
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [], deliveryPrices: [], isDeliveryAvailable: true });
      setSelectedFile(null);
      setIsItemDialogOpen(false);
      toast.success('สร้างรายการเมนูสำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'สร้างรายการเมนูไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !newItem.name || !newItem.price) return;
    if (!newItem.categoryId || newItem.categoryId === "") {
      return toast.error("กรุณาเลือกหมวดหมู่สินค้า");
    }
    if (!newItem.kitchenId || newItem.kitchenId === "") {
      return toast.error("กรุณาเลือกห้องครัวสำหรับส่งออเดอร์");
    }
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
        kitchenId: Number(newItem.kitchenId),
        imageUrl: finalImageUrl,
        optionGroupIds: newItem.optionGroupIds,
        deliveryPrices: newItem.deliveryPrices,
        isDeliveryAvailable: newItem.isDeliveryAvailable,
      });
      setEditingItem(null);
      setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [], deliveryPrices: [], isDeliveryAvailable: true });
      setSelectedFile(null);
      setIsItemDialogOpen(false);
      toast.success('อัปเดตรายการเมนูสำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'อัปเดตรายการเมนูไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePlatform = async () => {
    if (!bid || !newPlatformName) return;
    
    if (Array.isArray(deliveryPlatforms) && deliveryPlatforms.some(dp => dp.name.toLowerCase() === newPlatformName.toLowerCase())) {
      return toast.error('มีชื่อแพลตฟอร์มนี้อยู่แล้ว');
    }

    try {
      await createDeliveryPlatform({
        branchId: bid,
        name: newPlatformName,
      });
      setNewPlatformName('');
      toast.success('สร้างแพลตฟอร์ม Delivery สำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'สร้างไม่สำเร็จ');
    }
  };

  const handleUpdatePlatform = async () => {
    if (!editingPlatform || !newPlatformName) return;
    try {
      await updateDeliveryPlatform({
        id: editingPlatform.id,
        name: newPlatformName,
      });
      setEditingPlatform(null);
      setNewPlatformName('');
      toast.success('แก้ไขแพลตฟอร์ม Delivery สำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'แก้ไขไม่สำเร็จ');
    }
  };

  const handleDeletePlatform = async (id: number) => {
    confirmDelete(async () => {
      try {
        await deleteDeliveryPlatform(id);
        toast.success('ลบแพลตฟอร์ม Delivery สำเร็จ');
      } catch (error) {
        toast.error('ลบไม่สำเร็จ');
      }
    });
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
      deliveryPrices: item.deliveryPrices?.map((dp: any) => ({
        platformId: dp.deliveryPlatformId,
        price: dp.price,
      })) || [],
      isDeliveryAvailable: item.isDeliveryAvailable !== false,
    });
    setIsItemDialogOpen(true);
  };

  const openDeliveryFilterDialog = () => {
    const enabledSet = new Set(
      (Array.isArray(menuItems) ? menuItems : [])
        .filter(item => item.isDeliveryAvailable !== false)
        .map(item => item.id),
    );
    setDeliveryEnabledIds(enabledSet);
    setDeliverySearch('');
    setIsDeliveryFilterOpen(true);
  };

  const handleSaveDeliveryFilter = async () => {
    setIsSavingDelivery(true);
    try {
      await bulkUpdateDeliveryStatus({ branchId: bid, enabledIds: Array.from(deliveryEnabledIds) });
      setIsDeliveryFilterOpen(false);
      toast.success('บันทึกการตั้งค่าเมนู Delivery สำเร็จ');
    } catch {
      toast.error('บันทึกไม่สำเร็จ');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const confirmDelete = (action: () => void) => {
    setPendingDeleteAction(() => action);
    setIsPinDialogOpen(true);
  };

  const handleDeleteItem = async (id: number) => {
    confirmDelete(async () => {
      try {
        await deleteMenuItem(id);
        toast.success('ลบรายการแล้ว');
      } catch (error) {
        toast.error('ลบรายการไม่สำเร็จ');
      }
    });
  };

  const handleDeleteCategory = async (id: number) => {
    confirmDelete(async () => {
      try {
        await deleteCategory(id);
        toast.success('ลบหมวดหมู่แล้ว');
      } catch (error) {
        toast.error('ลบหมวดหมู่ไม่สำเร็จ');
      }
    });
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
      <div className="flex justify-end items-center gap-4 px-1">
        <div className="flex gap-2 w-full sm:w-auto justify-end">
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

          {/* จัดการประเภท Delivery Dialog */}
          <Dialog open={isDeliveryDialogOpen} onOpenChange={(open) => {
            setIsDeliveryDialogOpen(open);
            if (!open) {
              setEditingPlatform(null);
              setNewPlatformName('');
            }
          }}>
            <DialogTrigger render={<Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-indigo-100 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50" />}>
              จัดการ Delivery
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-[32px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">จัดการประเภท Delivery</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                {/* Form to Create/Edit */}
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">
                    {editingPlatform ? 'แก้ไขชื่อแพลตฟอร์ม' : 'เพิ่มแพลตฟอร์มใหม่'}
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={newPlatformName} 
                      onChange={(e) => setNewPlatformName(e.target.value)} 
                      className="h-12 rounded-xl focus:ring-primary flex-1 text-sm font-semibold"
                      placeholder="เช่น Grab, LINEMAN, ShopeeFood..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          editingPlatform ? handleUpdatePlatform() : handleCreatePlatform();
                        }
                      }}
                    />
                    <Button 
                      className="h-12 rounded-xl font-black px-6"
                      onClick={editingPlatform ? handleUpdatePlatform : handleCreatePlatform}
                    >
                      {editingPlatform ? 'บันทึก' : 'เพิ่ม'}
                    </Button>
                  </div>
                  {editingPlatform && (
                    <Button 
                      variant="link" 
                      className="text-xs text-slate-500 font-bold p-0 h-auto"
                      onClick={() => {
                        setEditingPlatform(null);
                        setNewPlatformName('');
                      }}
                    >
                      ยกเลิกการแก้ไข
                    </Button>
                  )}
                </div>

                {/* List of Platforms */}
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">แพลตฟอร์มที่มีในระบบ</Label>
                  <ScrollArea className="max-h-[220px] pr-2">
                    <div className="space-y-2">
                      {Array.isArray(deliveryPlatforms) && deliveryPlatforms.map(platform => (
                        <div key={platform.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
                          <span className="font-bold text-sm text-slate-700">{platform.name}</span>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full text-slate-500 hover:bg-primary/10 hover:text-primary"
                              onClick={() => {
                                setEditingPlatform(platform);
                                setNewPlatformName(platform.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-500"
                              onClick={() => handleDeletePlatform(platform.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!Array.isArray(deliveryPlatforms) || deliveryPlatforms.length === 0) && (
                        <p className="text-xs text-slate-400 font-bold italic py-4 text-center">ยังไม่มีแพลตฟอร์มในระบบ</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── ตั้งค่าเมนู Delivery ── */}
          <Dialog open={isDeliveryFilterOpen} onOpenChange={(open) => {
            setIsDeliveryFilterOpen(open);
            if (!open) setDeliverySearch('');
          }}>
            <DialogTrigger render={
              <Button
                variant="outline"
                className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-50"
                onClick={openDeliveryFilterDialog}
              />
            }>
              <Bike className="w-4 h-4 mr-2" />
              ตั้งค่า Delivery
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-[32px] overflow-hidden p-0 gap-0">
              <div className="p-6 pb-0 border-b border-slate-100">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <Bike className="w-5 h-5 text-emerald-600" />
                    ตั้งค่าเมนูสำหรับ Delivery
                  </DialogTitle>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    ติ๊กเลือกเมนูที่ต้องการแสดงในหน้ารับออเดอร์ Delivery
                  </p>
                </DialogHeader>
                <div className="mt-4 flex items-center gap-3 pb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="ค้นหาเมนู..."
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      className="pl-9 h-9 rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-bold px-3"
                      onClick={() => setDeliveryEnabledIds(new Set((menuItems || []).map(i => i.id)))}
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-1" />
                      เลือกทั้งหมด
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-bold px-3"
                      onClick={() => setDeliveryEnabledIds(new Set())}
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      ล้าง
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-[50vh]">
                <div className="p-4 space-y-3">
                  {Array.isArray(categories) && categories.map(cat => {
                    const catItems = (Array.isArray(menuItems) ? menuItems : []).filter(
                      item => item.categoryId === cat.id &&
                        (!deliverySearch || item.name.toLowerCase().includes(deliverySearch.toLowerCase()))
                    );
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                          {cat.name}
                        </p>
                        <div className="space-y-1">
                          {catItems.map(item => {
                            const enabled = deliveryEnabledIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => setDeliveryEnabledIds(prev => {
                                  const next = new Set(prev);
                                  enabled ? next.delete(item.id) : next.add(item.id);
                                  return next;
                                })}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all select-none active:scale-[0.99]',
                                  enabled
                                    ? 'border-emerald-200 bg-emerald-50/60'
                                    : 'border-slate-100 bg-white hover:border-slate-200',
                                )}
                              >
                                <div className={cn(
                                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                                  enabled ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300',
                                )}>
                                  {enabled && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-9 h-9 rounded-xl object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                    <LayoutGrid className="w-4 h-4 text-slate-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    'font-bold text-sm truncate leading-tight',
                                    enabled ? 'text-emerald-800' : 'text-slate-700',
                                  )}>
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-400 font-medium">฿{item.price.toLocaleString()}</p>
                                </div>
                                {enabled && (
                                  <Badge className="bg-emerald-500 text-white text-[10px] font-black border-none shrink-0 rounded-lg px-2">
                                    Delivery
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {Array.isArray(menuItems) && menuItems.length === 0 && (
                    <p className="text-center text-sm text-slate-400 font-bold italic py-8">ยังไม่มีเมนูในระบบ</p>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
                <div className="flex-1 text-xs text-slate-400 font-bold">
                  เลือก {deliveryEnabledIds.size} / {(menuItems || []).length} รายการ
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl font-bold"
                  onClick={() => setIsDeliveryFilterOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="h-11 rounded-xl font-black px-6 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                  disabled={isSavingDelivery}
                  onClick={handleSaveDeliveryFilter}
                >
                  {isSavingDelivery ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Bike className="w-4 h-4 mr-2" />
                  )}
                  บันทึก
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
            setIsItemDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setNewItem({ name: '', price: '', categoryId: '', kitchenId: '', imageUrl: '', optionGroupIds: [], deliveryPrices: [], isDeliveryAvailable: true });
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
                        <Select
                          value={newItem.categoryId !== '' ? newItem.categoryId : undefined}
                          onValueChange={(val) => setNewItem({...newItem, categoryId: val})}
                          items={Array.isArray(categories) ? categories.map(cat => ({ value: String(cat.id), label: cat.name })) : []}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="เลือกหมวดหมู่ (จำเป็น)">
                              {newItem.categoryId !== ''
                                ? (Array.isArray(categories) ? categories.find(c => c.id.toString() === newItem.categoryId)?.name ?? null : null)
                                : null}
                            </SelectValue>
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
                        <Select
                          value={newItem.kitchenId !== '' ? newItem.kitchenId : undefined}
                          onValueChange={(val) => setNewItem({...newItem, kitchenId: val})}
                          items={[
                            ...(Array.isArray(kitchens) ? kitchens.map(k => ({ value: String(k.id), label: k.name })) : [])
                          ]}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="เลือกห้องครัว (จำเป็น)">
                              {newItem.kitchenId !== ''
                                ? (Array.isArray(kitchens) ? kitchens.find(k => k.id.toString() === newItem.kitchenId)?.name ?? null : null)
                                : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(kitchens) && kitchens.map(k => (
                              <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* ราคา Delivery (Optional) */}
                    {Array.isArray(deliveryPlatforms) && deliveryPlatforms.length > 0 && (
                      <div className="space-y-3">
                        <Label className="font-bold text-xs uppercase tracking-widest text-slate-400">ราคา Delivery (Optional)</Label>
                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          {deliveryPlatforms.map((platform) => {
                            const dpValue = newItem.deliveryPrices?.find(
                              (dp: any) => dp.platformId === platform.id
                            )?.price ?? '';
                            
                            return (
                              <div key={platform.id} className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-600 min-w-[100px] truncate">
                                  {platform.name}
                                </span>
                                <div className="relative flex-1">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 pointer-events-none">฿</span>
                                  <Input
                                    type="number"
                                    placeholder="บวกราคาขายบนแอป"
                                    value={dpValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let prices = newItem.deliveryPrices ? [...newItem.deliveryPrices] : [];
                                      const index = prices.findIndex((p: any) => p.platformId === platform.id);
                                      if (val === '') {
                                        if (index > -1) {
                                          prices.splice(index, 1);
                                        }
                                      } else {
                                        if (index > -1) {
                                          prices[index].price = parseFloat(val);
                                        } else {
                                          prices.push({ platformId: platform.id, price: parseFloat(val) });
                                        }
                                      }
                                      setNewItem({ ...newItem, deliveryPrices: prices });
                                    }}
                                    className="pl-7 h-10 rounded-xl bg-white text-xs font-bold"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Delivery Toggle ── */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                          <Bike className="w-4 h-4 text-emerald-600" />
                          แสดงในหน้ารับออเดอร์ Delivery
                        </p>
                        <p className="text-xs text-slate-400">
                          {newItem.isDeliveryAvailable ? 'เมนูนี้จะปรากฏในหน้า Delivery' : 'เมนูนี้ซ่อนจากหน้า Delivery'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewItem({...newItem, isDeliveryAvailable: !newItem.isDeliveryAvailable})}
                        className={cn(
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                          newItem.isDeliveryAvailable ? 'bg-emerald-500' : 'bg-slate-200',
                        )}
                      >
                        <span className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
                          newItem.isDeliveryAvailable ? 'translate-x-5' : 'translate-x-0',
                        )} />
                      </button>
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
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-50 hover:text-red-500" 
                    onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 className="w-3 h-3" />
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
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name} 
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                                  referrerPolicy="no-referrer" 
                                />
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
                                    {item.isDeliveryAvailable === false && (
                                      <Badge className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-slate-100 text-slate-400 border-none font-bold flex items-center gap-0.5">
                                        <Bike className="w-2.5 h-2.5" />
                                        ไม่ส่ง Delivery
                                      </Badge>
                                    )}
                                    {Array.isArray(item.deliveryPrices) && item.deliveryPrices.map(dp => {
                                        const platform = deliveryPlatforms?.find(p => p.id === dp.deliveryPlatformId);
                                        if (!platform) return null;
                                        return (
                                          <Badge key={dp.id} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 border-emerald-100 text-emerald-600 bg-emerald-50 font-bold truncate max-w-[85px]">
                                              {platform.name}: ฿{dp.price}
                                          </Badge>
                                        );
                                    })}
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
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบข้อมูล"
      />
    </div>
  );
}
