import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, ShoppingCart, Plus, Minus, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';

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

export default function CustomerOrder() {
  const { branchId, tableId } = useParams<{ branchId: string; tableId: string }>();
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart, totalAmount, clearCart } = useCart();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [branchName, setBranchName] = useState('');
  const [tableName, setTableName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryRefs = React.useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, tableRes] = await Promise.all([
          api.get(`/branches/${branchId}/menu`),
          api.get(`/tables/by-qrcode/${tableId}`)
        ]);
        
        setCategories(menuRes.data.categories);
        setBranchName(menuRes.data.name);
        setTableName(tableRes.data.name);
        
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
  }, [branchId, tableId]);

  const scrollToCategory = (categoryId: number) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 120; // Header + Category Nav height
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
        // Multi-select logic (Checkbox)
        if (exists) return prev.filter(o => o.id !== option.id);
        return [...prev, option];
      } else {
        // Single-select logic (Radio)
        // Remove any other options from the same group
        const groupOptionIds = group.options.map((o: any) => o.id);
        const filtered = prev.filter(o => !groupOptionIds.includes(o.id));
        
        // If it was already selected, and we click it again, we might want to deselect?
        // Usually radio buttons don't deselect on click if already selected, 
        // but for POS options, sometimes they do. 
        // Let's follow standard radio behavior: if clicked, it's selected.
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

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      // We already have table info if we want, but we need the numeric ID
      const tableRes = await api.get(`/tables/by-qrcode/${tableId}`);
      const table = tableRes.data;

      await api.post('/orders', {
        branchId: Number(branchId),
        tableId: table.id,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options.map(o => ({ optionId: o.optionId }))
        }))
      });

      clearCart();
      setIsCartOpen(false);
      toast.success('สั่งอาหารสำเร็จ! กรุณารอสักครู่');
      navigate('/order-success');
    } catch (error) {
      toast.error('สั่งอาหารไม่สำเร็จ กรุณาลองใหม่');
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
        <div className="p-4 border-b">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{branchName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              โต๊ะ: {tableName || '...'}
            </p>
          </div>
        </div>
        
        {/* Category Navigation */}
        <div className="flex overflow-x-auto no-scrollbar p-2 gap-2 bg-white/80 backdrop-blur-md">
          {Array.isArray(categories) && categories.map(category => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Categories */}
      <div className="p-4 space-y-10">
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.isArray(category.items) && category.items.map(item => (
                <Card 
                  key={item.id} 
                  className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer group" 
                  onClick={() => handleSelectItem(item)}
                >
                  <CardContent className="p-0 flex h-28 sm:h-32 min-w-0 overflow-hidden">
                    <div className="p-3 sm:p-4 flex-1 min-w-0 flex flex-col justify-between overflow-hidden">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base">{item.name}</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-2">อร่อย สดใหม่ ทันใจ</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <p className="text-base sm:text-lg font-black text-primary shrink-0">฿{item.price.toLocaleString()}</p>
                        <div className="bg-primary/10 p-1.5 sm:p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all text-primary shrink-0">
                          <Plus className="w-4 h-4 sm:w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    {item.imageUrl && (
                      <div className="w-28 sm:w-32 h-full relative overflow-hidden shrink-0 aspect-square">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-l from-black/10 to-transparent" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-20">
          <Button className="w-full h-14 rounded-2xl shadow-xl flex justify-between items-center px-6" onClick={() => setIsCartOpen(true)}>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <span className="font-bold">ดูตะกร้าสินค้า</span>
            </div>
            <span className="font-bold text-lg">฿{totalAmount.toLocaleString()}</span>
          </Button>
        </div>
      )}

      {/* Item Selection Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-t-3xl sm:rounded-3xl">
            {selectedItem && (
              <>
                {selectedItem.imageUrl && (
                  <div className="relative w-full aspect-video sm:aspect-[21/9] overflow-hidden shrink-0">
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name} 
                      className="absolute inset-0 w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                )}
                <div className="p-6 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedItem.name}</DialogTitle>
                  <p className="text-lg font-bold text-primary">฿{selectedItem.price.toLocaleString()}</p>
                </DialogHeader>

                {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.map(group => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">{group.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wider">
                        {group.isMultiple ? 'เลือกได้หลายอย่าง' : 'เลือกได้ 1 อย่าง'}
                      </span>
                    </div>
                    <div className="space-y-2">
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
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'border-primary bg-primary' : 'border-slate-300'
                              } ${!group.isMultiple ? 'rounded-full' : 'rounded-md'}`}>
                                {isSelected && (
                                  <div className={group.isMultiple ? "w-2.5 h-2.5 bg-white rounded-[2px]" : "w-2 h-2 bg-white rounded-full"} />
                                )}
                              </div>
                              <span className="font-medium">{option.name}</span>
                            </div>
                            <span className="text-sm text-slate-500">
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

                <DialogFooter className="pt-4">
                  <Button className="w-full h-12 text-lg font-bold rounded-xl" onClick={handleAddToCart}>
                    เพิ่มลงตะกร้า - ฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Sheet (Dialog for mobile) */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-[425px] h-[90vh] flex flex-col p-0 rounded-t-3xl">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              ตะกร้าสินค้าของคุณ
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {Array.isArray(cart) && cart.map(item => (
              <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
                <div className="flex-1 space-y-1">
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  {Array.isArray(item.options) && item.options.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {item.options.map(o => o.name).join(', ')}
                    </p>
                  )}
                  <p className="font-bold text-primary">฿{((item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="font-bold">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromCart(item.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50 border-t space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">ราคารวมทั้งสิ้น</span>
              <span className="text-2xl font-bold text-slate-900">฿{totalAmount.toLocaleString()}</span>
            </div>
            <Button className="w-full h-14 rounded-2xl text-lg font-bold" disabled={isSubmitting} onClick={handleSubmitOrder}>
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ยืนยันการสั่งซื้อ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
