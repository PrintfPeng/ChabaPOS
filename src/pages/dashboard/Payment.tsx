import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, Receipt, CreditCard, Banknote, History, ChevronRight, QrCode, Delete, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { useBranch } from '../../hooks/useBranches';
import { cn } from '../../lib/utils';

export default function Payment() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch } = useBranch(Number(branchId));
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'TRANSFER' | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [change, setChange] = useState(0);

  const fetchUnpaidBills = async () => {
    try {
      const res = await api.get(`/orders/branch/${branchId}/unpaid`);
      setUnpaidBills(res.data);
    } catch (error) {
      toast.error('โหลดข้อมูลบิลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnpaidBills();
    const interval = setInterval(fetchUnpaidBills, 30000);
    return () => clearInterval(interval);
  }, [branchId]);

  useEffect(() => {
    if (selectedBill && receivedAmount) {
      const amount = parseFloat(receivedAmount) || 0;
      setChange(Math.max(0, amount - selectedBill.totalAmount));
    } else {
      setChange(0);
    }
  }, [receivedAmount, selectedBill]);

  const handlePayment = async () => {
    if (!selectedBill || !paymentMode) return;
    
    if (paymentMode === 'CASH') {
      const received = parseFloat(receivedAmount) || 0;
      if (received < selectedBill.totalAmount) {
        toast.error('ยอดเงินที่รับมาไม่เพียงพอ');
        return;
      }
    }

    setIsProcessing(true);
    try {
      const tableId = selectedBill.tableId ?? selectedBill.table?.id;
      await api.post(`/orders/table/${tableId}/pay`, {
        paymentType: paymentMode === 'CASH' ? 'CASH' : 'TRANSFER'
      });
      toast.success('ชำระเงินเสร็จสิ้น');
      setSelectedBill(null);
      setPaymentMode(null);
      setReceivedAmount('');
      fetchUnpaidBills();
    } catch (error) {
      toast.error('ชำระเงินไม่สำเร็จ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickCash = (amount: number) => {
    const current = parseFloat(receivedAmount || '0');
    setReceivedAmount((current + amount).toString());
  };

  const appendDigit = (digit: string) => {
    setReceivedAmount(prev => prev + digit);
  };

  const clearReceived = () => setReceivedAmount('');
  const deleteLastDigit = () => setReceivedAmount(prev => prev.slice(0, -1));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full overflow-hidden min-h-full">
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">การชำระเงิน</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">จัดการบิลที่ยังไม่ได้ชำระเงินและปิดบิลประจำโต๊ะ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {Array.isArray(unpaidBills) && unpaidBills.map((bill) => (
            <motion.div
              key={bill.tableId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-xl transition-all border-l-4 border-l-orange-500 rounded-3xl group active:scale-[0.98] border-none shadow-sm bg-white"
                onClick={() => {
                  setSelectedBill(bill);
                  setPaymentMode(null);
                  setReceivedAmount('');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                  <CardTitle className="text-lg font-black truncate pr-2">โต๊ะ {bill.table?.name || '---'}</CardTitle>
                  <Receipt className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{bill.orders.length} ออเดอร์</p>
                        <p className="text-xl font-black text-slate-900 italic tracking-tighter">฿{bill.totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!Array.isArray(unpaidBills) || unpaidBills.length === 0) && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-4">
            <div className="p-8 bg-slate-50 rounded-[32px]">
                <History className="w-12 h-12 text-slate-200" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">ไม่มีบิลค้างชำระ</h3>
                <p className="text-sm text-slate-400 font-medium italic">All bills are settled. Great job!</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
      {selectedBill && (
        <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
          <DialogContent className="w-[95vw] max-w-5xl h-[85vh] p-0 gap-0 border-none overflow-hidden rounded-[32px] sm:rounded-[40px] shadow-2xl flex flex-col sm:flex-row bg-white">
            {/* Left Column: Bill Summary */}
            <div className="w-full sm:w-[320px] lg:w-[380px] shrink-0 h-[35%] sm:h-full flex flex-col bg-slate-50 border-r border-slate-100 overflow-hidden">
               <div className="p-5 sm:p-6 bg-white border-b shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black">โต๊ะ {selectedBill.table?.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full sm:hidden" onClick={() => setSelectedBill(null)}>
                    <X className="w-5 h-5" />
                  </Button>
               </div>
               
               <ScrollArea className="flex-1">
                  <div className="p-4 sm:p-6 space-y-4 pb-20">
                    {selectedBill.orders.map((order: any) => (
                      <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                         <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.orderNumber}</span>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleTimeString()}</span>
                         </div>
                         <div className="space-y-3">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between gap-3">
                                   <div className="flex gap-2 min-w-0">
                                      <span className="font-black text-primary text-xs shrink-0">{item.quantity}x</span>
                                      <div className="min-w-0">
                                         <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                                         <p className="text-[10px] text-slate-400 truncate">{item.options.map((o:any)=>o.name).join(', ')}</p>
                                      </div>
                                   </div>
                                   <span className="font-bold text-sm shrink-0">฿{((item.price + item.options.reduce((s:any,o:any)=>s+o.price,0))*item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                         </div>
                      </div>
                    ))}
                  </div>
               </ScrollArea>

               <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                  <div className="bg-slate-900 p-5 rounded-[24px] text-white flex justify-between items-center shadow-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ยอดรวมทั้งหมด</span>
                    <span className="text-3xl font-black italic tracking-tighter">฿{selectedBill.totalAmount.toLocaleString()}</span>
                  </div>
               </div>
            </div>

            {/* Right Column: Payment Logic */}
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
               <ScrollArea className="flex-1">
                  <div className="p-6 sm:p-8 space-y-8">
                     <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPaymentMode('CASH')}
                          className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-3 group",
                            paymentMode === 'CASH' 
                              ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5 scale-[1.02]" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className={cn("p-4 rounded-2xl", paymentMode === 'CASH' ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                            <Banknote className="w-8 h-8" />
                          </div>
                          <span className="font-black">เงินสด</span>
                        </button>
                        <button 
                          onClick={() => setPaymentMode('TRANSFER')}
                          className={cn(
                            "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-3 group",
                            paymentMode === 'TRANSFER' 
                              ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5 scale-[1.02]" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div className={cn("p-4 rounded-2xl", paymentMode === 'TRANSFER' ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                            <QrCode className="w-8 h-8" />
                          </div>
                          <span className="font-black">เงินโอน / สแกน</span>
                        </button>
                     </div>

                     {paymentMode === 'CASH' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                           <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ยอดที่ต้องจ่าย</label>
                                 <p className="text-3xl font-black italic">฿{selectedBill.totalAmount.toLocaleString()}</p>
                              </div>
                              <div className="space-y-1 text-right">
                                 <label className="text-[10px] font-black text-green-500 uppercase tracking-widest">เงินทอน</label>
                                 <p className="text-3xl font-black text-green-600 italic">฿{change.toLocaleString()}</p>
                              </div>
                           </div>

                           <div className="space-y-2">
                             <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">฿</span>
                                <input 
                                  type="number" 
                                  autoFocus
                                  className="w-full h-20 pl-12 pr-6 text-4xl font-black rounded-3xl bg-slate-50 border-none focus:ring-2 focus:ring-primary transition-all text-right tabular-nums"
                                  value={receivedAmount}
                                  onChange={(e) => setReceivedAmount(e.target.value)}
                                  placeholder="0.00"
                                />
                             </div>
                           </div>

                           <div className="grid grid-cols-3 gap-3">
                              {['1000', '500', '100'].map(val => (
                                 <Button 
                                  key={val} 
                                  variant="outline" 
                                  className="h-14 rounded-2xl font-black text-lg border-slate-100 hover:bg-slate-50 active:scale-95"
                                  onClick={() => handleQuickCash(Number(val))}
                                 >
                                    +{val}
                                 </Button>
                              ))}
                           </div>

                           <div className="grid grid-cols-3 gap-2">
                              {['1','2','3','4','5','6','7','8','9','0','00'].map(k => (
                                <Button 
                                  key={k} 
                                  variant="ghost" 
                                  className="h-16 text-2xl font-black rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-90"
                                  onClick={() => appendDigit(k)}
                                >
                                  {k}
                                </Button>
                              ))}
                              <Button 
                                variant="ghost" 
                                className="h-16 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-90"
                                onClick={deleteLastDigit}
                              >
                                <Delete className="w-6 h-6" />
                              </Button>
                           </div>
                        </div>
                     )}

                     {paymentMode === 'TRANSFER' && (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 animate-in zoom-in-95">
                           {branch?.qrCodeUrl ? (
                              <div className="relative w-48 h-48 sm:w-64 sm:h-64 shadow-2xl rounded-3xl bg-white p-4 mb-4 overflow-hidden">
                                 <img 
                                   src={branch.qrCodeUrl} 
                                   className="absolute inset-4 w-[calc(100%-32px)] h-[calc(100%-32px)] object-contain" 
                                   referrerPolicy="no-referrer" 
                                 />
                               </div>
                           ) : (
                              <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mb-4">
                                <QrCode className="w-16 h-16 text-slate-100" />
                              </div>
                           )}
                           <p className="text-xl font-bold text-slate-900 tracking-tight">฿{selectedBill.totalAmount.toLocaleString()}</p>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 px-6 py-2 bg-white rounded-full">QR Payment</p>
                        </div>
                     )}

                     {!paymentMode && (
                        <div className="py-24 flex flex-col items-center justify-center space-y-6 bg-slate-50 rounded-[40px]">
                           <div className="p-8 bg-white rounded-[32px] shadow-sm">
                             <CreditCard className="w-16 h-16 text-slate-200" />
                           </div>
                           <p className="font-black text-slate-400 italic">เลือกวิธีการชำระเงินเพื่อดำเนินการต่อ</p>
                        </div>
                     )}
                  </div>
               </ScrollArea>

               <div className="p-8 border-t border-slate-100 bg-white grid grid-cols-2 gap-4">
                  <Button variant="ghost" className="h-16 rounded-2xl font-bold text-slate-400" onClick={() => setSelectedBill(null)}>ยกเลิก</Button>
                  <Button 
                    className="h-16 rounded-2xl text-xl font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                    disabled={isProcessing || !paymentMode || (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < selectedBill.totalAmount))}
                    onClick={handlePayment}
                  >
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-6 h-6" />}
                    <span>ยืนยันการชำระเงิน</span>
                  </Button>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </AnimatePresence>
    </div>
  );
}
