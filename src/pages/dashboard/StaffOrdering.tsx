import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Loader2, ShoppingCart, Plus, Minus, X, ChevronLeft, Search, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
import { cn } from '../../lib/utils';

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

export default function StaffOrdering() {
  const { branchId, tableId } = useParams<{ branchId: string; tableId: string }>();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [branchName, setBranchName] = useState('');
  const [tableName, setTableName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, tableRes] = await Promise.all([
          api.get(`/branches/${branchId}/menu`),
          api.get(`/tables/${tableId}`) // Assuming we have a direct GET /tables/:id
        ]);
        setCategories(menuRes.data.categories);
        setBranchName(menuRes.data.name);
        setTableName(tableRes.data.name);
      } catch (error) {
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [branchId, tableId]);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOptions([]);
    setQuantity(1);
  };

  const toggleOption = (group: any, option: any) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      
      if (group.isMultiple) {
        // Multi-select logic (Checkbox)
        if (exists) return prev.filter(o => o.id !== option.id);
        return [...prev, option];
      } else {
        // Single-select logic (Radio)
        // Remove any other options from the same group
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
    toast.success('เพิ่มลงรายการแล้ว');
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

  const totalAmount = cart.reduce((sum, item) => {
    const itemTotal = (item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const tId = tableId ? Number(tableId) : null;
      await api.post('/orders', {
        branchId: Number(branchId),
        tableId: tId && !isNaN(tId) ? tId : null,
        source: 'STAFF',
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options.map((o: any) => ({ optionId: o.optionId }))
        }))
      });

      toast.success('บันทึกออเดอร์สำเร็จ');
      navigate(-1);
    } catch (error) {
      toast.error('สั่งอาหารไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = (Array.isArray(categories) ? categories : []).map(cat => ({
    ...cat,
    items: Array.isArray(cat.items) ? cat.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) : []
  })).filter(cat => cat.items.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 overflow-hidden">
      {/* Left: Menu Selection */}
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">โต๊ะ: {tableName}</h1>
              <p className="text-slate-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold">{branchName}</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="ค้นหาเมนู..." 
              className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-8 no-scrollbar md:custom-scrollbar">
          {Array.isArray(filteredCategories) && filteredCategories.map(category => (
            <div key={category.id} className="space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-800 border-l-4 border-primary pl-3 tracking-tight italic">
                {category.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {Array.isArray(category.items) && category.items.map(item => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden cursor-pointer hover:border-primary transition-all group border-slate-100 shadow-sm active:scale-95" 
                    onClick={() => handleSelectItem(item)}
                  >
                    <CardContent className="p-0">
                      {item.imageUrl && (
                        <div className="h-24 sm:h-32 overflow-hidden">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-1">{item.name}</h3>
                        <p className="text-primary font-black text-sm mt-1">฿{item.price.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Cart Trigger */}
        <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
          <Sheet>
            <SheetTrigger render={
              <Button className="w-full h-14 rounded-2xl shadow-2xl flex justify-between items-center px-6 btn-primary" />
            }>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </div>
                <span className="font-bold">สรุปรายการ ({cart.length})</span>
              </div>
              <span className="font-bold text-lg">฿{totalAmount.toLocaleString()}</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-[32px] p-0 overflow-hidden border-none shadow-2xl">
              <CartSummaryContent 
                cart={cart} 
                updateCartQuantity={updateCartQuantity} 
                removeFromCart={removeFromCart} 
                totalAmount={totalAmount} 
                handleSubmitOrder={handleSubmitOrder} 
                isSubmitting={isSubmitting} 
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Right: Cart Summary (Desktop Only) */}
      <div className="hidden lg:flex w-[380px] bg-white rounded-[32px] border border-slate-100 flex-col shadow-xl shadow-slate-200/50 overflow-hidden">
        <CartSummaryContent 
          cart={cart} 
          updateCartQuantity={updateCartQuantity} 
          removeFromCart={removeFromCart} 
          totalAmount={totalAmount} 
          handleSubmitOrder={handleSubmitOrder} 
          isSubmitting={isSubmitting} 
        />
      </div>

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedItem.name}</DialogTitle>
                <p className="text-lg font-bold text-primary">฿{selectedItem.price.toLocaleString()}</p>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.map(group => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">{group.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {group.isMultiple ? 'เลือกได้หลายอย่าง' : 'เลือกได้ 1 อย่าง'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.isArray(group.options) && group.options.map(option => {
                        const isSelected = Array.isArray(selectedOptions) && selectedOptions.find(o => o.id === option.id);
                        return (
                          <div 
                            key={option.id} 
                            className={`flex justify-between items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                              isSelected 
                              ? 'border-primary bg-primary/5' 
                              : 'border-slate-100 hover:border-slate-200'
                            }`}
                            onClick={() => toggleOption(group, option)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'border-primary bg-primary' : 'border-slate-300'
                              } ${!group.isMultiple ? 'rounded-full' : 'rounded-sm'}`}>
                                {isSelected && (
                                  <div className={group.isMultiple ? "w-2 h-2 bg-white rounded-[1px]" : "w-1.5 h-1.5 bg-white rounded-full"} />
                                )}
                              </div>
                              <span className="font-medium text-sm">{option.name}</span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {option.price > 0 ? `+฿${option.price}` : 'ฟรี'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="font-bold">จำนวน</span>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-bold text-xl">{quantity}</span>
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => setQuantity(q => q + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button className="w-full h-12 text-lg font-bold rounded-xl" onClick={handleAddToCart}>
                  เพิ่มลงรายการ - ฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CartSummaryContent({ cart, updateCartQuantity, removeFromCart, totalAmount, handleSubmitOrder, isSubmitting }: any) {
  return (
    <>
      <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10 shrink-0 capitalize">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          สรุปออเดอร์
        </h2>
        {cart.length > 0 && <Badge variant="secondary" className="rounded-full font-black px-3">{cart.reduce((s: any, i: any) => s + i.quantity, 0)}</Badge>}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {Array.isArray(cart) && cart.map((item: any) => (
          <div key={item.cartItemId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">{item.name}</h4>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">
                    {item.options.map((o: any) => o.name).join(', ')}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 shrink-0" onClick={() => removeFromCart(item.cartItemId)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <p className="font-black text-primary tabular-nums">฿{((item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity).toLocaleString()}</p>
              <div className="flex items-center gap-3 bg-slate-100/50 p-1 rounded-full border border-slate-100">
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" onClick={() => updateCartQuantity(item.cartItemId, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-black text-xs sm:text-sm w-4 text-center">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" onClick={() => updateCartQuantity(item.cartItemId, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(!Array.isArray(cart) || cart.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20 animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-slate-100 rounded-[32px]">
              <UtensilsCrossed className="w-12 h-12 opacity-20" />
            </div>
            <p className="font-bold text-slate-400 italic">ยังไม่มีรายการอาหาร</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-15px_30px_rgba(0,0,0,0.02)] shrink-0">
        <div className="flex justify-between items-center px-2">
          <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">ราคารวมทั้งสิ้น</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter italic">฿{totalAmount.toLocaleString()}</span>
        </div>
        <Button 
          className="w-full h-14 sm:h-16 rounded-[20px] text-lg font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3" 
          disabled={isSubmitting || cart.length === 0} 
          onClick={handleSubmitOrder}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>กำลังบักทึก...</span>
            </>
          ) : (
            <>
              <span>ยืนยันออเดอร์</span>
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}
