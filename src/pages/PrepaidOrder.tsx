import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, ShoppingCart, Plus, Minus, ChevronRight, X, QrCode, Banknote, Receipt, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

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
  zone: {
    name: string;
  };
}

export default function PrepaidOrder() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [branchData, setBranchData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [step, setStep] = useState<'MENU' | 'TABLE' | 'PAYMENT'>('MENU');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'TRANSFER' | null>(null);

  const categoryRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>({});

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
          setActiveCategory(menuRes.data.categories[0].id);
        }
      } catch (error) {
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  const scrollToCategory = (categoryId: number) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

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
    addToCart({
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      quantity,
      options: selectedOptions.map(o => ({
        optionId: o.id,
        name: o.name,
        price: o.price
      }))
    });
    setSelectedItem(null);
    toast.success('เพิ่มลงตะกร้าแล้ว');
  };

  const handleProcessToTable = () => {
    if (cart.length === 0) return;
    setStep('TABLE');
    setIsCartOpen(false);
  };

  const handleProcessToPayment = () => {
    if (!selectedTable) {
      toast.error('กรุณาเลือกโต๊ะ');
      return;
    }
    setStep('PAYMENT');
  };

  const handleSubmitOrder = async () => {
    if (!paymentMode) {
      toast.error('กรุณาเลือกช่องทางชำระเงิน');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/orders', {
        branchId: Number(branchId),
        tableId: selectedTable?.id,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options.map(o => ({ optionId: o.optionId }))
        })),
        isPrepaid: true,
        paymentType: paymentMode,
        source: 'CUSTOMER'
      });

      clearCart();
      toast.success('สั่งอาหารและชำระเงินสำเร็จ!');
      navigate('/order-success');
    } catch (error) {
      toast.error('ทำรายการไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="p-4 border-b flex items-center gap-4">
          {step !== 'MENU' && (
            <Button variant="ghost" size="icon" onClick={() => setStep(step === 'PAYMENT' ? 'TABLE' : 'MENU')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{branchData?.name}</h1>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mt-0.5">
              {step === 'MENU' ? 'เลือกเมนูอาหาร' : step === 'TABLE' ? 'เลือกโต๊ะที่นั่ง' : 'ชำระเงินทันที'}
            </p>
          </div>
        </div>
        
        {step === 'MENU' && (
          <div className="flex overflow-x-auto no-scrollbar p-2 gap-2 bg-white/80 backdrop-blur-md">
            {Array.isArray(categories) && categories.map(category => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  activeCategory === category.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {step === 'MENU' ? (
          <div className="space-y-10">
            {Array.isArray(categories) && categories.map(category => (
              <div 
                key={category.id} 
                className="scroll-mt-32"
                ref={el => { categoryRefs.current[category.id] = el; }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {category.name}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(category.items) && category.items.map(item => (
                    <Card 
                      key={item.id} 
                      className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer group" 
                      onClick={() => handleSelectItem(item)}
                    >
                      <CardContent className="p-0 flex h-32">
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{item.name}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 italic">อร่อย สดใหม่ ทันใจ</p>
                          </div>
                          <div className="flex justify-between items-end">
                            <p className="text-lg font-black text-primary">฿{item.price.toLocaleString()}</p>
                            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all text-primary">
                              <Plus className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                        {item.imageUrl && (
                          <div className="w-32 h-full relative overflow-hidden shrink-0">
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              referrerPolicy="no-referrer" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-l from-black/20 to-transparent" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : step === 'TABLE' ? (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              กรุณาเลือกโต๊ะที่นั่ง
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.map(table => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 group",
                    selectedTable?.id === table.id
                      ? "border-primary bg-primary/5 text-primary scale-105 shadow-lg shadow-primary/10"
                      : "border-white bg-white hover:border-slate-200 text-slate-600 shadow-sm"
                  )}
                >
                  <span className="text-2xl font-black">{table.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{table.zone.name}</span>
                </button>
              ))}
            </div>
            <div className="pt-8">
              <Button 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-xl"
                disabled={!selectedTable}
                onClick={handleProcessToPayment}
              >
                ดำเนินการชำระเงิน ฿{totalAmount.toLocaleString()}
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center text-sm font-bold text-slate-500 pb-4 border-b border-dashed">
                <div className="flex flex-col">
                  <span className="uppercase tracking-widest text-[10px]">โต๊ะที่สั่ง</span>
                  <span className="text-xl text-slate-900 font-black">{selectedTable?.name}</span>
                </div>
                <div className="text-right">
                  <span className="uppercase tracking-widest text-[10px]">รวมทั้งสิ้น</span>
                  <p className="text-3xl text-primary font-black">฿{totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-sm">
                    <div className="flex gap-2">
                      <span className="font-bold text-slate-400">{item.quantity}x</span>
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.options.map(o => o.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold">฿{((item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-slate-900 text-lg">เลือกช่องทางชำระเงิน</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMode('CASH')}
                  className={cn(
                    "flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all gap-4 group",
                    paymentMode === 'CASH' 
                      ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                      : "border-white bg-white hover:border-slate-200"
                  )}
                >
                  <Banknote className={cn("w-10 h-10", paymentMode === 'CASH' ? "text-primary" : "text-slate-300")} />
                  <span className="font-bold text-lg">เงินสด</span>
                </button>
                <button 
                  onClick={() => setPaymentMode('TRANSFER')}
                  className={cn(
                    "flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all gap-4 group",
                    paymentMode === 'TRANSFER' 
                      ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                      : "border-white bg-white hover:border-slate-200"
                  )}
                >
                  <QrCode className={cn("w-10 h-10", paymentMode === 'TRANSFER' ? "text-primary" : "text-slate-300")} />
                  <span className="font-bold text-lg">พร้อมเพย์ / โอนเงิน</span>
                </button>
              </div>
            </div>

            {paymentMode === 'TRANSFER' && branchData?.qrCodeUrl && (
              <div className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-100 shadow-xl">
                <div className="text-center mb-6">
                  <h4 className="font-black text-slate-900">แสกน QR Code เพื่อชำระเงิน</h4>
                  <p className="text-xs text-slate-400 mt-1">ยอดชำระ: ฿{totalAmount.toLocaleString()}</p>
                </div>
                <img 
                  src={branchData.qrCodeUrl} 
                  alt="QR" 
                  className="w-56 h-56 object-contain rounded-2xl shadow-inner border p-2 mb-6" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}

            <Button 
              className="w-full h-16 rounded-2xl text-xl font-black shadow-2xl"
              disabled={!paymentMode || isSubmitting}
              onClick={handleSubmitOrder}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  กำลังส่งออเดอร์...
                </>
              ) : (
                'ยืนยันการชำระเงินและสั่งอาหาร'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Floating Cart Button for Step MENU */}
      {step === 'MENU' && cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <Button className="w-full h-14 rounded-2xl shadow-xl flex justify-between items-center px-6" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <span className="font-bold">สรุปรายการ ({cart.length})</span>
            </div>
            <span className="font-bold text-lg flex items-center gap-2">
              ฿{totalAmount.toLocaleString()}
              <ChevronRight className="w-5 h-5" />
            </span>
          </Button>
        </div>
      )}

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl">
          {selectedItem && (
            <>
              {selectedItem.imageUrl && (
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="p-6 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">{selectedItem.name}</DialogTitle>
                  <p className="text-lg font-black text-primary">฿{selectedItem.price.toLocaleString()}</p>
                </DialogHeader>

                <div className="max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.map(group => (
                    <div key={group.id} className="space-y-3 mb-6 last:mb-0">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-900">{group.name}</h4>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
                          {group.isMultiple ? 'M-Select' : 'S-Select'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(group.options) && group.options.map(option => {
                          const isSelected = selectedOptions.find(o => o.id === option.id);
                          return (
                            <div 
                              key={option.id} 
                              className={cn(
                                "flex justify-between items-center p-4 rounded-xl border-2 transition-all cursor-pointer",
                                isSelected 
                                ? 'border-primary bg-primary/5 text-primary' 
                                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                              )}
                              onClick={() => toggleOption(group, option)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-5 h-5 border-2 flex items-center justify-center transition-all shrink-0",
                                  isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300',
                                  !group.isMultiple ? 'rounded-full' : 'rounded-md'
                                )}>
                                  {isSelected && <div className={cn("bg-white", group.isMultiple ? "w-2 h-2 rounded-[1px]" : "w-1.5 h-1.5 rounded-full")} />}
                                </div>
                                <span className="font-bold text-sm">{option.name}</span>
                              </div>
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                {option.price > 0 ? `+฿${option.price}` : 'ฟรี'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="font-black text-slate-900">จำนวน</span>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="font-black text-2xl w-8 text-center">{quantity}</span>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2" onClick={() => setQuantity(q => q + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20" onClick={handleAddToCart}>
                    เพิ่มลงตะกร้า • ฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Summary Side Sheet */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[425px] h-[95vh] flex flex-col p-0 rounded-t-3xl border-none shadow-2xl">
          <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-black">ตะกร้าของคุณ</DialogTitle>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <ShoppingCart className="w-16 h-16 opacity-20 mb-4" />
                <p className="font-bold text-slate-400">ยังไม่มีสินค้าในตะกร้า</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 line-clamp-1">{item.name}</h4>
                      {item.options.length > 0 && (
                        <p className="text-[10px] font-medium text-slate-400 leading-tight">
                          {item.options.map(o => o.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => removeFromCart(item.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <p className="font-black text-primary italic">฿{((item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity).toLocaleString()}</p>
                    <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-full border">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">ราคารวม (Net)</span>
                <span className="text-xs text-slate-300 italic">Total Amount Payable</span>
              </div>
              <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">฿{totalAmount.toLocaleString()}</span>
            </div>
            <Button 
              className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3" 
              disabled={cart.length === 0} 
              onClick={handleProcessToTable}
            >
              เลือกโต๊ะและชำระเงิน
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
