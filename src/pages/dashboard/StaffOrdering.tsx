import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Loader2, ShoppingCart, Plus, Minus, X, ChevronLeft, Search, UtensilsCrossed } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
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
    <div className="flex h-[calc(100vh-120px)] gap-6">
      {/* Left: Menu Selection */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">สั่งอาหาร: {tableName}</h1>
              <p className="text-slate-500 text-sm">{branchName}</p>
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="ค้นหาเมนู..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-8">
          {Array.isArray(filteredCategories) && filteredCategories.map(category => (
            <div key={category.id} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-3">
                {category.name}
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.isArray(category.items) && category.items.map(item => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden cursor-pointer hover:border-primary transition-colors group" 
                    onClick={() => handleSelectItem(item)}
                  >
                    <CardContent className="p-0">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
                      )}
                      <div className="p-3">
                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.name}</h3>
                        <p className="text-primary font-bold">฿{item.price.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart Summary */}
      <div className="w-96 bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            สรุปออเดอร์
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {Array.isArray(cart) && cart.map(item => (
            <div key={item.cartItemId} className="flex gap-4 border-b pb-4 last:border-0">
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-slate-900">{item.name}</h4>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {item.options.map((o: any) => o.name).join(', ')}
                  </p>
                )}
                <p className="font-bold text-primary">฿{((item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateCartQuantity(item.cartItemId, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-bold w-4 text-center">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateCartQuantity(item.cartItemId, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.cartItemId)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {(!Array.isArray(cart) || cart.length === 0) && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <UtensilsCrossed className="w-12 h-12 opacity-20" />
              <p>ยังไม่มีรายการอาหาร</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium">ราคารวมทั้งสิ้น</span>
            <span className="text-2xl font-bold text-slate-900">฿{totalAmount.toLocaleString()}</span>
          </div>
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20" 
            disabled={isSubmitting || cart.length === 0} 
            onClick={handleSubmitOrder}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ยืนยันออเดอร์'}
          </Button>
        </div>
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
