import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { 
  Loader2, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  Search, 
  UtensilsCrossed, 
  Banknote, 
  QrCode, 
  Calculator,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { cn } from '../../lib/utils';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  optionGroups: {
    id: number;
    name: string;
    isMultiple: boolean;
    options: {
      id: number;
      name: string;
      price: number;
    }[];
  }[];
}

interface Category {
  id: number;
  name: string;
  items: MenuItem[];
}

interface Table {
  id: number;
  name: string;
  zoneId: number;
  zone: {
    name: string;
  };
}

export default function CounterService() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, tablesRes] = await Promise.all([
          api.get(`/branches/${branchId}/menu`),
          api.get(`/branches/${branchId}/tables`)
        ]);
        setCategories(menuRes.data.categories);
        setBranchData(menuRes.data);
        setTables(tablesRes.data);
        
        if (menuRes.data.categories.length > 0) {
          setActiveTab(menuRes.data.categories[0].id.toString());
        }
      } catch (error) {
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOptions([]);
    setQuantity(1);
    setItemNotes('');
  };

  const toggleOption = (group: any, option: any) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      if (group.isMultiple) {
        if (exists) return prev.filter(o => o.id !== option.id);
        return [...prev, option];
      } else {
        const groupOptionIds = group.options.map((o: any) => o.id);
        const filtered = prev.filter(o => !groupOptionIds.includes(o.id));
        return [...filtered, option];
      }
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    const cartItemId = `${selectedItem.id}-${selectedOptions.map(o => o.id).sort().join(',')}`;
    
    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        cartItemId,
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        price: selectedItem.price,
        quantity,
        notes: itemNotes || undefined,
        options: selectedOptions.map(o => ({
          optionId: o.id,
          name: o.name,
          price: o.price
        }))
      }];
    });
    
    setSelectedItem(null);
    toast.success('เพิ่มลงรายการสำเร็จ');
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cartItemId === cartItemId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce((sum, item) => {
    const itemTotal = (item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  const changeAmount = paymentMode === 'CASH' && receivedAmount 
    ? Math.max(0, parseFloat(receivedAmount) - totalAmount) 
    : 0;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('กรุณาเลือกรายการอาหารก่อน');
      return;
    }
    setReceivedAmount('');
    setIsPaymentDialogOpen(true);
  };

  const handleQuickCash = (amount: number) => {
    const current = parseFloat(receivedAmount || '0');
    setReceivedAmount((current + amount).toString());
  };

  const handleSubmitOrder = async () => {
    if (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < totalAmount)) {
      toast.error('จำนวนเงินรับมาไม่เพียงพอ');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/orders', {
        branchId: Number(branchId),
        tableId: selectedTableId,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          options: item.options.map((o: any) => ({ optionId: o.optionId }))
        })),
        isPrepaid: true,
        paymentType: paymentMode === 'CASH' ? 'CASH' : 'TRANSFER',
        source: 'STAFF'
      });

      toast.success('ทำรายการชำระเงินและส่งออเดอร์สำเร็จ', {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
      });
      
      clearCart();
      setIsPaymentDialogOpen(false);
      setSelectedTableId(null);
      setReceivedAmount('');

      // Redirect to main branch dashboard after success
      setTimeout(() => {
        navigate(`/brands/${brandId}/branches/${branchId}`);
      }, 1500);
    } catch (error) {
      toast.error('ทำรายการไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = (activeTabCategoryId: number) => {
    const category = categories.find(c => c.id === activeTabCategoryId);
    if (!category) return [];
    return category.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-full gap-4 sm:gap-6 overflow-hidden">
      {/* Left: Menu Grid (70%) */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-6 overflow-hidden">
        {/* Search & Categories */}
        <div className="flex flex-col gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 truncate">
              <Calculator className="w-5 h-5 sm:w-6 h-6 text-primary shrink-0" />
              <span className="truncate">Counter Service - {branchData?.name}</span>
            </h1>
            <div className="relative w-full sm:w-64 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="ค้นหาเมนู..." 
                className="pl-9 h-10 sm:h-12 rounded-xl bg-white border-slate-200 focus:ring-primary shadow-sm text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100 p-1 w-full justify-start overflow-x-auto no-scrollbar h-10 sm:h-12">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id.toString()} className="px-4 sm:px-6 font-bold text-xs sm:text-sm">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Menu Items Grid */}
        <ScrollArea className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
          <div className="p-2 sm:p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredItems(Number(activeTab)).map(item => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all group border-white shadow-sm active:scale-95 flex flex-col" 
                onClick={() => handleSelectItem(item)}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                        <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                       <Badge className="bg-white/95 text-primary border-none font-black shadow-sm text-[10px] sm:text-xs">฿{item.price.toLocaleString()}</Badge>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-xs sm:text-sm line-clamp-2 leading-tight">
                      {item.name}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Order Cart (Responsive width) */}
      <div className="hidden lg:flex w-[320px] xl:w-[380px] 2xl:w-[420px] bg-white rounded-3xl border border-slate-100 flex-col shadow-xl shadow-slate-200/50 overflow-hidden shrink-0">
        <CartSummaryContent 
          cart={cart} 
          updateCartQuantity={updateCartQuantity} 
          removeFromCart={removeFromCart} 
          totalAmount={totalAmount} 
          handleCheckout={handleCheckout} 
          isSubmitting={isSubmitting}
          clearCart={clearCart}
        />
      </div>

      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
        <Sheet>
          <SheetTrigger render={
            <Button className="w-full h-14 sm:h-16 rounded-2xl shadow-2xl flex justify-between items-center px-4 sm:px-6 bg-primary text-white hover:bg-primary/90" />
          }>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl relative">
                <ShoppingCart className="w-5 h-5 sm:w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
                    {cart.reduce((s: number, i: any) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="font-black text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">รายการ ({cart.length})</span>
            </div>
            <span className="font-black text-base sm:text-xl shrink-0 ml-2">฿{totalAmount.toLocaleString()}</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] rounded-t-[32px] sm:rounded-t-[40px] p-0 overflow-hidden border-none shadow-2xl">
            <CartSummaryContent 
              cart={cart} 
              updateCartQuantity={updateCartQuantity} 
              removeFromCart={removeFromCart} 
              totalAmount={totalAmount} 
              handleCheckout={handleCheckout} 
              isSubmitting={isSubmitting}
              clearCart={clearCart}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-[24px] sm:rounded-3xl border-none max-h-[90vh] flex flex-col">
          {selectedItem && (
            <>
              <div className="relative h-32 sm:h-44 overflow-hidden shrink-0">
                 {selectedItem.imageUrl ? (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name} 
                      className="absolute inset-0 w-full h-full object-contain" 
                      referrerPolicy="no-referrer" 
                    />
                 ) : (
                    <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                       <UtensilsCrossed className="w-12 h-12 text-slate-300" />
                    </div>
                 )}
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white z-20 h-8 w-8" 
                    onClick={() => setSelectedItem(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
              </div>
              
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                  <div className="p-4 sm:p-6 space-y-5">
                    <DialogHeader className="space-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <DialogTitle className="text-xl sm:text-2xl font-black leading-tight">{selectedItem.name}</DialogTitle>
                        <span className="text-lg sm:text-xl font-black text-primary italic shrink-0">฿{selectedItem.price.toLocaleString()}</span>
                      </div>
                    </DialogHeader>

                    {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.length > 0 && (
                      <div className="space-y-5">
                        {selectedItem.optionGroups.map(group => (
                          <div key={group.id} className="space-y-2.5">
                            <div className="flex justify-between items-center px-1">
                              <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest leading-none">{group.name}</h4>
                              <Badge variant="outline" className="text-[9px] font-black tracking-tighter bg-slate-50 border-slate-100 text-slate-400 px-1.5 py-0 h-4">
                                {group.isMultiple ? 'เลือกได้หลายอย่าง' : 'เลือกได้ 1 อย่าง'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Array.isArray(group.options) && group.options.map(option => {
                                const isSelected = selectedOptions.find(o => o.id === option.id);
                                return (
                                  <div 
                                    key={option.id} 
                                    className={cn(
                                      "flex justify-between items-center p-2.5 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98]",
                                      isSelected 
                                      ? 'border-primary bg-primary/5 text-primary' 
                                      : 'border-slate-100 hover:border-slate-200 bg-white'
                                    )}
                                    onClick={() => toggleOption(group, option)}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn(
                                        "w-3.5 h-3.5 border flex items-center justify-center transition-all shrink-0",
                                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300',
                                        !group.isMultiple ? 'rounded-full' : 'rounded-[3px]'
                                      )}>
                                        {isSelected && <div className={cn("bg-white", group.isMultiple ? "w-1.5 h-1.5 rounded-[1px]" : "w-1 h-1 rounded-full")} />}
                                      </div>
                                      <span className="font-bold text-xs truncate">{option.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 shrink-0 ml-1">
                                      {option.price > 0 ? `+฿${option.price}` : 'ฟรี'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2.5 pt-2">
                       <div className="flex justify-between items-center px-1">
                          <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest leading-none">หมายเหตุเพิ่มเติม</h4>
                       </div>
                       <Input 
                         placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย" 
                         className="h-11 rounded-xl text-sm border-slate-200 focus:border-primary shadow-sm"
                         value={itemNotes}
                         onChange={(e) => setItemNotes(e.target.value)}
                       />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-white border-t border-slate-100 space-y-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">จำนวนที่ต้องการ</span>
                    <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-full border border-slate-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:text-primary" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="font-black text-lg w-6 text-center tabular-nums">{quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:text-primary" onClick={() => setQuantity(q => q + 1)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full h-14 sm:h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95 flex justify-between px-6" onClick={handleAddToCart}>
                    <span>เพิ่มลงตะกร้า</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-[24px] sm:rounded-3xl border-none max-h-[95vh] flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <ScrollArea className="flex-1">
              <div className="p-5 sm:p-7 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-center">ยืนยันการชำระเงิน</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPaymentMode('CASH')}
                    className={cn(
                      "flex flex-row items-center justify-center p-2.5 rounded-xl border-2 transition-all gap-2 group active:scale-95",
                      paymentMode === 'CASH' 
                        ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/5" 
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg", paymentMode === 'CASH' ? "bg-primary text-white" : "bg-white text-slate-400")}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <span className="font-black text-[11px] sm:text-xs whitespace-nowrap">เงินสด (Cash)</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMode('TRANSFER')}
                    className={cn(
                      "flex flex-row items-center justify-center p-2.5 rounded-xl border-2 transition-all gap-2 group active:scale-95",
                      paymentMode === 'TRANSFER' 
                        ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/5" 
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg", paymentMode === 'TRANSFER' ? "bg-primary text-white" : "bg-white text-slate-400")}>
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span className="font-black text-[11px] sm:text-xs whitespace-nowrap">PromptPay</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">ยอดชำระจริง</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900 italic tabular-nums">฿{totalAmount.toLocaleString()}</span>
                   </div>

                   {paymentMode === 'CASH' && (
                     <div className="space-y-3 pt-3 border-t border-slate-200 animate-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">รับเงินสดมา</label>
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-base">฿</span>
                              <Input 
                                type="number" 
                                autoFocus
                                placeholder="0.00" 
                                className="h-10 sm:h-12 pl-8 pr-10 text-lg sm:text-xl font-black rounded-xl bg-white border-none focus:ring-1 focus:ring-primary transition-all text-right tabular-nums shadow-sm"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                              />
                              {receivedAmount && (
                                 <button 
                                   onClick={() => setReceivedAmount('')}
                                   className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                 >
                                   <X className="w-3 h-3" />
                                 </button>
                               )}
                           </div>
                           
                           <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 mt-2">
                              {['1000', '500', '100', '50', '20'].map(val => (
                                 <button 
                                  key={`note-${val}`} 
                                  type="button"
                                  onClick={() => handleQuickCash(Number(val))}
                                  className="h-8 sm:h-10 rounded-lg bg-white border border-slate-100 shadow-sm text-[10px] sm:text-xs font-black text-slate-600 hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center"
                                 >
                                   +{val}
                                 </button>
                              ))}
                              {['10', '5', '2', '1'].map(val => (
                                 <button 
                                  key={`coin-${val}`} 
                                  type="button"
                                  onClick={() => handleQuickCash(Number(val))}
                                  className="h-8 sm:h-10 rounded-full bg-slate-50 border border-slate-100 shadow-sm text-[10px] sm:text-xs font-black text-slate-500 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center"
                                 >
                                   +{val}
                                 </button>
                              ))}
                              <button 
                                type="button"
                                onClick={() => setReceivedAmount(totalAmount.toString())}
                                className="h-8 sm:h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-black hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center col-span-2 sm:col-span-1"
                              >
                                จ่ายพอดี
                              </button>
                           </div>
                        </div>
                        {receivedAmount && parseFloat(receivedAmount) > 0 && (
                          <div className="flex justify-between items-center p-2.5 bg-green-50 rounded-xl border border-green-100">
                            <span className="text-green-600 font-bold text-[10px]">เงินทอน</span>
                            <span className="text-lg sm:text-xl font-black text-green-700 italic">฿{changeAmount.toLocaleString()}</span>
                          </div>
                        )}
                     </div>
                   )}

                   {paymentMode === 'TRANSFER' && (
                     <div className="flex flex-row items-center justify-center gap-3 p-3 bg-white rounded-xl border border-dashed border-slate-200 animate-in zoom-in-95">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <QrCode className="w-6 h-6 text-primary opacity-50" />
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">สแกน QR บนใบแจ้งหนี้<br/>หรือแสดง QR ประจำสาขา</p>
                     </div>
                   )}
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">ระบุโต๊ะ (Optional)</label>
                   <div className="relative group">
                     <select 
                       className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 font-bold px-4 appearance-none transition-colors cursor-pointer text-sm"
                       value={selectedTableId || ''}
                       onChange={(e) => setSelectedTableId(e.target.value ? Number(e.target.value) : null)}
                     >
                       <option value="">-- ไม่ระบุเลชโต๊ะ / Take Away --</option>
                       {tables.map(t => (
                         <option key={t.id} value={t.id}>{t.name} ({t.zone.name})</option>
                       ))}
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                     </div>
                   </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
              <Button 
                className="w-full h-12 sm:h-14 rounded-[16px] sm:rounded-[20px] text-base sm:text-lg font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all" 
                disabled={isSubmitting || (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < totalAmount))}
                onClick={handleSubmitOrder}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>ยืนยันการชำระเงิน</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CartSummaryContent({ cart, updateCartQuantity, removeFromCart, totalAmount, handleCheckout, isSubmitting, clearCart }: any) {
  return (
    <>
      <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
        <h2 className="text-xl font-black flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          รายการออเดอร์
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={clearCart}>
               <Trash2 className="w-5 h-5" />
            </Button>
          )}
          <Badge variant="secondary" className="rounded-full font-black px-3 h-8 text-primary bg-primary/10 border-none shrink-0">
            {cart.reduce((s: any, i: any) => s + i.quantity, 0)}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 no-scrollbar">
        {Array.isArray(cart) && cart.map((item: any) => (
          <div key={item.cartItemId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 group animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">{item.name}</h4>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-slate-400 leading-tight mt-0.5">
                    {item.options.map((o: any) => o.name).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5 italic">
                    * {item.notes}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 group-hover:text-red-400 shrink-0 transition-colors" onClick={() => removeFromCart(item.cartItemId)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center pt-1">
              <p className="font-black text-primary tabular-nums">฿{((item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity).toLocaleString()}</p>
              <div className="flex items-center gap-3 bg-slate-100/50 p-1 rounded-full border border-slate-100">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white" onClick={() => updateCartQuantity(item.cartItemId, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white" onClick={() => updateCartQuantity(item.cartItemId, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(!Array.isArray(cart) || cart.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-24 animate-in fade-in zoom-in duration-500">
            <div className="p-8 bg-slate-100 rounded-[40px] shadow-inner">
              <UtensilsCrossed className="w-16 h-16 opacity-30" />
            </div>
            <div className="text-center">
               <p className="font-black text-slate-400 italic">เลือกเมนูอาหารเพื่อเริ่มรับรายการ</p>
               <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Ready to serve customers</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-20px_40px_rgba(0,0,0,0.04)] shrink-0">
        <div className="flex justify-between items-center px-2">
          <div>
             <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">ยอดรวมทั้งสิ้น</span>
             <p className="text-[10px] text-slate-300 italic">Total Checkout Amount</p>
          </div>
          <span className="text-4xl font-black text-slate-900 tracking-tighter italic tabular-nums">฿{totalAmount.toLocaleString()}</span>
        </div>
        <Button 
          className="w-full h-16 sm:h-20 rounded-[28px] text-xl font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-95" 
          disabled={isSubmitting || cart.length === 0} 
          onClick={handleCheckout}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>กำลังบักทึก...</span>
            </>
          ) : (
            <>
              <Calculator className="w-6 h-6" />
              <span>คิดเงิน & ชำระเงิน</span>
            </>
          )}
        </Button>
      </div>
    </>
  );
}
