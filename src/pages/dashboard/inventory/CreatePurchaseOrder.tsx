import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePurchaseOrder() {
  const { branchId, brandId } = useParams();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [branchId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [supRes, matRes] = await Promise.all([
        axios.get(`http://localhost:3000/api/suppliers?branchId=${branchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:3000/api/raw-materials?branchId=${branchId}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSuppliers(supRes.data);
      setMaterials(matRes.data);
    } catch (error) {
      toast.error('โหลดข้อมูลล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (mat: any) => {
    const existing = cart.find(i => i.rawMaterialId === mat.id);
    if (existing) {
      setCart(cart.map(i => i.rawMaterialId === mat.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart([...cart, { rawMaterialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1, price: 0 }]);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(i => {
      if (i.rawMaterialId === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const updatePrice = (id: number, priceStr: string) => {
    const price = parseFloat(priceStr) || 0;
    setCart(cart.map(i => i.rawMaterialId === id ? { ...i, price } : i));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(i => i.rawMaterialId !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = async () => {
    if (!selectedSupplier) return toast.error('กรุณาเลือกร้านค้า (Supplier)');
    if (cart.length === 0) return toast.error('กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการ');
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/purchase-orders', {
        branchId: Number(branchId),
        supplierId: Number(selectedSupplier),
        items: cart.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity, price: i.price }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('สั่งซื้อสำเร็จ');
      navigate(`/brands/${brandId}/branches/${branchId}/inventory`);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการสั่งซื้อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* Left side: Materials Selection */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            สั่งวัตถุดิบเข้าร้าน
          </h2>
        </div>
        <ScrollArea className="flex-1 p-4 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.isArray(materials) && materials.map(m => (
              <div 
                key={m.id} 
                onClick={() => addToCart(m)}
                className="bg-white p-4 rounded-2xl border shadow-sm cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center text-center aspect-square"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-slate-800 line-clamp-2">{m.name}</h3>
                <span className="text-xs text-slate-500 mt-1">{m.category?.name}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right side: Cart and Supplier Selection */}
      <div className="w-full lg:w-[400px] xl:w-[450px] shrink-0 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <h2 className="font-bold">รายการที่เลือก</h2>
          <span className="bg-white/20 px-2 py-1 rounded-md text-xs">{cart.length} รายการ</span>
        </div>
        
        <div className="p-4 border-b space-y-2 shrink-0 bg-slate-50">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500">ร้านค้า (Supplier)</label>
          <Select 
            value={selectedSupplier ? String(selectedSupplier) : undefined} 
            onValueChange={setSelectedSupplier}
            items={Array.isArray(suppliers) ? suppliers.map(s => ({ value: String(s.id), label: s.name })) : []}
          >
            <SelectTrigger className="h-12 rounded-xl bg-white">
              <SelectValue placeholder="เลือกร้านค้า..." />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(suppliers) && suppliers.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p>ยังไม่มีรายการวัตถุดิบ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.rawMaterialId} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-sm leading-tight">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.rawMaterialId)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border">
                      <button onClick={() => updateQuantity(item.rawMaterialId, -1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 hover:text-primary"><Minus className="w-4 h-4" /></button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.rawMaterialId, 1)} className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 hover:text-primary"><Plus className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">ราคา/หน่วย</span>
                      <Input 
                        type="number" 
                        value={item.price || ''} 
                        onChange={(e) => updatePrice(item.rawMaterialId, e.target.value)}
                        className="w-20 h-9 rounded-lg text-right font-bold focus-visible:ring-1"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-dashed">
                    <span className="text-xs text-slate-500">รวม</span>
                    <span className="font-black text-primary">฿{(item.quantity * item.price).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-white border-t shrink-0">
          <div className="flex justify-between items-end mb-4 px-1">
            <span className="text-sm font-bold text-slate-500">ยอดรวมทั้งสิ้น</span>
            <span className="text-3xl font-black text-slate-900">฿{totalAmount.toLocaleString()}</span>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || cart.length === 0} 
            className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <>ยืนยันการสั่งซื้อ <ArrowRight className="w-5 h-5 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
