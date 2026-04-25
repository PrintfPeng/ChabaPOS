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

  const handleUpdateAllInTable = async (tableItems: any[]) => {
    try {
      setIsLoading(true);
      await Promise.all(
        tableItems
          .filter(item => item.status !== 'SERVED')
          .map(item => api.patch(`/orders/items/${item.id}/status`, { status: 'SERVED' }))
      );
      toast.success('อัปเดตทุกรายการในโต๊ะแล้ว');
      fetchItems();
    } catch (error) {
      toast.error('อัปเดตบางรายการไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  // Group items by table for "All Kitchens" view
  const groupedItems = React.useMemo(() => {
    if (selectedKitchen !== 'all') return [];
    
    return items.reduce((acc: any[], item) => {
      const tableId = item.order.tableId || 0;
      const key = `table-${tableId}`; // Group strictly by tableId
      
      const existingGroup = acc.find(g => g.key === key);
      
      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        acc.push({
          key,
          tableId,
          tableName: item.order.table?.name || (tableId === 0 ? 'สั่งกลับบ้าน/ทั่วไป' : `โต๊ะ ${tableId}`),
          orderNumber: item.order.orderNumber, // Just to show one of them or reference
          createdAt: item.order.createdAt,
          items: [item]
        });
      }
      return acc;
    }, []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [items, selectedKitchen]);

  if (isLoading && items.length === 0) {
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
          {Array.isArray(kitchens) && kitchens.map(k => (
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
          {selectedKitchen === 'all' ? (
            // Grouped View (By Table)
            Array.isArray(groupedItems) && groupedItems.map((group) => (
              <motion.div
                key={group.key}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <Card className="flex flex-col h-full border-2 border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                  <CardHeader className="p-4 bg-slate-50 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <UtensilsCrossed className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-slate-800 leading-none">โต๊ะ: {group.tableName}</CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                          {Array.isArray(group.items) ? group.items.length : 0} รายการที่ต้องทำ
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-9 gap-1.5 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 text-green-700 text-[11px] font-black" 
                      onClick={() => handleUpdateAllInTable(group.items)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      เสร็จทั้งหมด
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
                    <div className="divide-y divide-slate-100">
                      {Array.isArray(group.items) && group.items.map((item: any) => (
                        <div key={item.id} className={`p-4 transition-colors ${item.status === 'SERVED' ? 'bg-slate-50 opacity-50' : 'bg-white hover:bg-slate-50/50'}`}>
                          <div className="flex justify-between items-start gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-bold text-base leading-tight ${item.status === 'SERVED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {item.name}
                                </h4>
                                <span className="text-[9px] font-mono text-slate-300 font-bold">#{item.order.orderNumber}</span>
                              </div>
                              {Array.isArray(item.options) && item.options.length > 0 && (
                                <p className="text-xs text-slate-500 font-medium italic">
                                  + {item.options.map((o: any) => o.name).join(', ')}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter">
                                  {Array.isArray(kitchens) && kitchens.find(k => k.id === item.kitchenId)?.name || 'ทั่วไป'}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <span className="text-2xl font-black text-primary leading-none">x{item.quantity}</span>
                              {item.status !== 'SERVED' ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0 rounded-full hover:bg-green-100 hover:text-green-700 text-slate-400"
                                  onClick={() => handleUpdateStatus(item.id, 'SERVED')}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            // Individual Item View (Current View - Filtered by Kitchen)
            Array.isArray(items) && items.map((item) => (
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

                    {Array.isArray(item.options) && item.options.length > 0 && (
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
                      {item.status !== 'SERVED' && (
                        <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(item.id, 'SERVED')}>
                          <CheckCircle2 className="w-4 h-4" />
                          เสร็จแล้ว
                        </Button>
                      )}
                      {item.status === 'SERVED' && (
                        <div className="flex-1 text-center py-2 text-green-600 font-bold text-sm bg-green-50 rounded border border-green-200">
                          เสิร์ฟแล้ว
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        {(!Array.isArray(items) || items.length === 0) && (
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
