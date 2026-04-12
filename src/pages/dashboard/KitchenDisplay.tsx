import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, CheckCircle2, Clock, ChefHat, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';

export default function KitchenDisplay() {
  const { branchId } = useParams<{ branchId: string }>();
  const [kitchens, setKitchens] = useState<any[]>([]);
  const [selectedKitchen, setSelectedKitchen] = useState<string>('all');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKitchens = async () => {
      try {
        const res = await api.get(`/kitchens?branchId=${branchId}`);
        setKitchens(res.data);
      } catch (error) {
        toast.error('โหลดข้อมูลครัวไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    };
    fetchKitchens();
  }, [branchId]);

  const fetchItems = async () => {
    if (!selectedKitchen) return;
    try {
      const endpoint = selectedKitchen === 'all' 
        ? `/orders/branch/${branchId}/kitchen-items`
        : `/orders/kitchen/${selectedKitchen}`;
      const res = await api.get(endpoint);
      setItems(res.data);
    } catch (error) {
      console.error('Failed to fetch kitchen items', error);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [selectedKitchen]);

  const handleUpdateStatus = async (itemId: number, status: string) => {
    try {
      await api.patch(`/orders/items/${itemId}/status`, { status });
      toast.success('อัปเดตสถานะแล้ว');
      fetchItems();
    } catch (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">หน้าจอห้องครัว</h1>
          <p className="text-slate-500">จัดการรายการอาหารที่ต้องปรุง</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-md shadow-sm border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">LIVE UPDATING</span>
          </div>
        </div>
      </div>

      {/* Chrome-style Tabs */}
      <div className="border-b border-slate-200 -mx-6 px-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          <button 
            onClick={() => setSelectedKitchen('all')}
            className={`px-8 py-4 text-sm font-bold transition-all relative ${
              selectedKitchen === 'all' 
              ? 'text-primary bg-white rounded-t-xl border-t-2 border-x-2 border-slate-200 -mb-[1px]' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {selectedKitchen === 'all' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
            )}
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              ทั้งหมด
            </div>
          </button>
          {kitchens.map(k => (
            <button 
              key={k.id}
              onClick={() => setSelectedKitchen(k.id.toString())}
              className={`px-8 py-4 text-sm font-bold transition-all relative ${
                selectedKitchen === k.id.toString() 
                ? 'text-primary bg-white rounded-t-xl border-t-2 border-x-2 border-slate-200 -mb-[1px]' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {selectedKitchen === k.id.toString() && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
              )}
              {k.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`${item.status === 'READY' ? 'border-green-500 bg-green-50' : ''}`}>
                <CardHeader className="pb-2 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">โต๊ะ: {item.order.table?.name || 'N/A'}</p>
                        {selectedKitchen === 'all' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">
                            {kitchens.find(k => k.id === item.kitchenId)?.name || 'ทั่วไป'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">
                      {item.order.orderNumber}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black">x{item.quantity}</span>
                    <div className="flex items-center gap-1 text-slate-500 text-sm">
                      <Clock className="w-4 h-4" />
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {item.options.length > 0 && (
                    <div className="bg-white/50 p-2 rounded border border-dashed">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">ตัวเลือกเสริม:</p>
                      <ul className="text-sm space-y-1">
                        {item.options.map((opt: any) => (
                          <li key={opt.id} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-slate-400 rounded-full" />
                            {opt.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {item.status === 'PENDING' && (
                      <Button className="flex-1 gap-2" onClick={() => handleUpdateStatus(item.id, 'COOKING')}>
                        <ChefHat className="w-4 h-4" />
                        เริ่มปรุง
                      </Button>
                    )}
                    {item.status === 'COOKING' && (
                      <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(item.id, 'READY')}>
                        <CheckCircle2 className="w-4 h-4" />
                        เสร็จสิ้น
                      </Button>
                    )}
                    {item.status === 'READY' && (
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => handleUpdateStatus(item.id, 'SERVED')}>
                        เสิร์ฟแล้ว
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <ChefHat className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีรายการอาหาร</h3>
            <p className="text-slate-500">รายการอาหารใหม่จะปรากฏที่นี่โดยอัตโนมัติ</p>
          </div>
        )}
      </div>
    </div>
  );
}
