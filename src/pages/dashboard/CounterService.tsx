import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  Trash2
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
  const { branchId } = useParams<{ branchId: string }>();
  
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
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
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
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-none">
          {selectedItem && (
            <div className="flex flex-col">
              <div className="relative h-48 sm:h-56 overflow-hidden shrink-0">
                 {selectedItem.imageUrl ? (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name} 
                      className="absolute inset-0 w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                 ) : (
                    <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                       <UtensilsCrossed className="w-16 h-16 text-slate-300" />
                    </div>
                 )}
              </div>
              <div className="p-6 space-y-6">
                <DialogHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle className="text-2xl font-black">{selectedItem.name}</DialogTitle>
                      <DialogDescription className="text-primary font-black text-xl mt-1 italic">฿{selectedItem.price.toLocaleString()}</DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedItem(null)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </DialogHeader>

                <ScrollArea className="max-h-[35vh]">
                  <div className="space-y-6 pr-4">
                    {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.map(group => (
                      <div key={group.id} className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                          <h4 className="font-black text-slate-700 text-sm">{group.name}</h4>
                          <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase bg-white">
                            {group.isMultiple ? 'หลายรายการ' : 'เลือก 1 รายการ'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Array.isArray(group.options) && group.options.map(option => {
                            const isSelected = selectedOptions.find(o => o.id === option.id);
                            return (
                              <div 
                                key={option.id} 
                                className={cn(
                                  "flex justify-between items-center p-3 rounded-xl border-2 transition-all cursor-pointer",
                                  isSelected 
                                  ? 'border-primary bg-primary/5 text-primary' 
                                  : 'border-slate-100 hover:border-slate-200'
                                )}
                                onClick={() => toggleOption(group, option)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "w-4 h-4 border-2 flex items-center justify-center transition-all",
                                    isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300',
                                    !group.isMultiple ? 'rounded-full' : 'rounded-sm'
                                  )}>
                                    {isSelected && <div className={cn("bg-white", group.isMultiple ? "w-1.5 h-1.5 rounded-[1px]" : "w-1 h-1 rounded-full")} />}
                                  </div>
                                  <span className="font-bold text-xs">{option.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400">
                                  {option.price > 0 ? `+${option.price}` : 'ฟรี'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="font-black text-slate-900">จำนวน</span>
                  <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-full border">
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-black text-xl w-8 text-center">{quantity}</span>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20" onClick={handleAddToCart}>
                    เพิ่มลงตะกร้า • ฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[32px] border-none">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-center">ยืนยันการชำระเงิน</DialogTitle>
              <p className="text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Checkout & Payment</p>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMode('CASH')}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 group",
                  paymentMode === 'CASH' 
                    ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("p-3 rounded-full", paymentMode === 'CASH' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                  <Banknote className="w-8 h-8" />
                </div>
                <span className="font-black">เงินสด (Cash)</span>
              </button>
              <button 
                onClick={() => setPaymentMode('TRANSFER')}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 group",
                  paymentMode === 'TRANSFER' 
                    ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5" 
                    : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className={cn("p-3 rounded-full", paymentMode === 'TRANSFER' ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                  <QrCode className="w-8 h-8" />
                </div>
                <span className="font-black">PromptPay / โอนเงิน</span>
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
               <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">ยอดเงินที่ต้องชำระ</span>
                  <span className="text-3xl font-black text-slate-900 italic">฿{totalAmount.toLocaleString()}</span>
               </div>

               {paymentMode === 'CASH' && (
                 <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest">รับมา (Received)</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">฿</span>
                          <Input 
                            type="number" 
                            autoFocus
                            placeholder="0.00" 
                            className="h-16 pl-10 text-2xl font-black rounded-2xl bg-white border-2 border-slate-200 focus:border-primary transition-all"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                          />
                       </div>
                    </div>
                    {receivedAmount && parseFloat(receivedAmount) > 0 && (
                      <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl animate-in fade-in slide-in-from-top-2">
                        <span className="text-green-600 font-bold">เงินทอน (Change)</span>
                        <span className="text-2xl font-black text-green-700">฿{changeAmount.toLocaleString()}</span>
                      </div>
                    )}
                 </div>
               )}

               {paymentMode === 'TRANSFER' && (
                 <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-slate-200 animate-in zoom-in-95">
                    <div className="p-4 bg-slate-50 rounded-2xl mb-4">
                      <QrCode className="w-12 h-12 text-primary opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-slate-500 text-center">สแกน QR บนใบแจ้งหนี้<br/>หรือแสดง QR สาขาให้ลูกค้า</p>
                 </div>
               )}
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">ระบุโต๊ะ (ไม่บังคับ)</label>
               <select 
                 className="w-full h-12 bg-slate-50 rounded-xl border-none font-bold px-4 appearance-none"
                 value={selectedTableId || ''}
                 onChange={(e) => setSelectedTableId(e.target.value ? Number(e.target.value) : null)}
               >
                 <option value="">-- ไม่ระบุโต๊ะ --</option>
                 {tables.map(t => (
                   <option key={t.id} value={t.id}>{t.name} ({t.zone.name})</option>
                 ))}
               </select>
            </div>

            <Button 
              className="w-full h-16 rounded-[24px] text-xl font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3" 
              disabled={isSubmitting || (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < totalAmount))}
              onClick={handleSubmitOrder}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
              <span>ยืนยันการชำระเงิน</span>
            </Button>
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
