import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, Receipt, CreditCard, Banknote, History, ChevronRight, QrCode, Delete, Settings } from 'lucide-react';
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
    const interval = setInterval(fetchUnpaidBills, 30000); // Poll every 30s
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">การชำระเงิน</h1>
          <p className="text-slate-500">จัดการบิลที่ยังไม่ได้ชำระเงินและปิดบิลประจำโต๊ะ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {Array.isArray(unpaidBills) && unpaidBills.map((bill) => (
            <motion.div
              key={bill.tableId}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                onClick={() => {
                  setSelectedBill(bill);
                  setPaymentMode(null);
                  setReceivedAmount('');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">โต๊ะ: {bill.table?.name || 'ไม่มีชื่อโต๊ะ'}</CardTitle>
                  <Receipt className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-slate-500">{bill.orders.length} ออเดอร์</p>
                    <p className="text-xl font-black text-primary">฿{bill.totalAmount.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" className="w-full mt-4 group">
                    ดูรายละเอียด
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!Array.isArray(unpaidBills) || unpaidBills.length === 0) && (
          <div className="col-span-full py-20 text-center bg-white rounded-xl border-2 border-dashed border-slate-200">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ไม่มีบิลค้างชำระ</h3>
            <p className="text-slate-500">บิลใหม่จะปรากฏที่นี่เมื่อมีลูกค้าสั่งอาหาร</p>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <AnimatePresence>
        {selectedBill && (
          <Dialog open={!!selectedBill} onOpenChange={(open) => {
            if (!open) {
              setSelectedBill(null);
              setPaymentMode(null);
              setReceivedAmount('');
            }
          }}>
          <DialogContent className="w-full h-full sm:h-[90vh] sm:max-w-6xl p-0 gap-0 border-none overflow-hidden sm:rounded-3xl shadow-2xl">
            <div className="flex flex-col sm:flex-row h-full">
              {/* Left Column: Bill Summary (Sticky Header/Footer + Flexible Scroll Area) */}
              <div className="w-full sm:w-[400px] lg:w-[460px] shrink-0 h-[45%] sm:h-full flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
                {/* Header: Shrink-0 */}
                <div className="p-6 bg-white border-b shrink-0 z-10">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-xl flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        โต๊ะ {selectedBill?.table?.name}
                      </DialogTitle>
                      <Badge variant="outline" className="text-slate-400 font-mono">
                         #{selectedBill?.id?.slice(-4)}
                      </Badge>
                    </div>
                  </DialogHeader>
                </div>

                {/* Items List: Flex-1 and Scrollable */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-4 pb-12">
                      {Array.isArray(selectedBill?.orders) && selectedBill.orders.map((order: any) => (
                        <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Order</span>
                              <span className="text-xs font-bold text-slate-600">#{order.orderNumber}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block mb-1">
                                {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <Badge className="text-[9px] h-5" variant={order.status === 'SERVED' ? 'success' : 'warning'}>
                                {order.status === 'SERVED' ? 'เสิร์ฟแล้ว' : 'รออาหาร'}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {Array.isArray(order.items) && order.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-start gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className="shrink-0 w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg text-xs font-black text-slate-600">
                                    {item.quantity}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Array.isArray(item.options) && item.options.map((o: any) => (
                                        <span key={o.id} className="text-[10px] text-slate-400">/ {o.name}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-sm font-black text-slate-900 tabular-nums">
                                  ฿{((item.price + (Array.isArray(item.options) ? item.options.reduce((sum: number, o: any) => sum + o.price, 0) : 0)) * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Footer: Shrink-0 (Always Visible) */}
                <div className="p-6 bg-white border-t border-slate-200 shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-10">
                  <div className="flex justify-between items-center bg-slate-900 p-5 rounded-[24px] shadow-xl text-white">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ยอดรวมสุทธิ</span>
                      <span className="text-xs text-slate-500 italic">Total Amount</span>
                    </div>
                    <span className="text-4xl font-black italic tracking-tighter">฿{selectedBill?.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Logic (Compact Design) */}
              <div className="flex-1 flex flex-col h-fit max-h-[90vh] sm:max-h-full bg-white overflow-hidden relative border-l border-slate-100">
                <div className="p-6 overflow-y-auto bg-white">
                  {/* Payment Mode Selector - Compact */}
                  <div className="grid grid-cols-2 gap-3 shrink-0 mb-6">
                    <button 
                      onClick={() => setPaymentMode('CASH')}
                      className={cn(
                        "flex items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 group",
                        paymentMode === 'CASH' 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <Banknote className={cn("w-6 h-6", paymentMode === 'CASH' ? "text-primary" : "text-slate-400")} />
                      <span className="font-bold">เงินสด</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMode('TRANSFER')}
                      className={cn(
                        "flex items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 group",
                        paymentMode === 'TRANSFER' 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <QrCode className={cn("w-6 h-6", paymentMode === 'TRANSFER' ? "text-primary" : "text-slate-400")} />
                      <span className="font-bold">โอนเงิน</span>
                    </button>
                  </div>

                  {paymentMode === 'CASH' && (
                    <div className="space-y-4">
                      {/* Compact Display Zone */}
                      <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white font-mono shadow-inner border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Received</span>
                          <div className="text-right">
                            <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest mr-2">Change</span>
                            <span className="text-xl font-bold text-green-400">฿{change.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-lg text-slate-600">฿</span>
                          <p className="text-4xl font-black tracking-tight">{parseFloat(receivedAmount || '0').toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Quick Cash Buttons - Compact h-11 */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { l: '1,000', v: 1000, c: 'bg-slate-800' },
                          { l: '500', v: 500, c: 'bg-purple-800' },
                          { l: '100', v: 100, c: 'bg-red-800' },
                          { l: '50', v: 50, c: 'bg-blue-800' },
                          { l: '20', v: 20, c: 'bg-emerald-800' },
                        ].map((b) => (
                          <Button 
                            key={b.v} 
                            className={cn("h-11 text-xs font-black rounded-lg text-white shadow transition-transform active:scale-95", b.c)}
                            onClick={() => handleQuickCash(b.v)}
                          >
                            {b.l}
                          </Button>
                        ))}
                        <Button variant="outline" className="h-11 text-xs font-black rounded-lg border-slate-100 hover:bg-slate-50 text-slate-500" onClick={clearReceived}>CLR</Button>
                      </div>

                      {/* Numpad - Compact h-14 */}
                      <div className="grid grid-cols-3 gap-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00'].map(key => (
                          <Button 
                            key={key} 
                            variant="outline" 
                            className="h-14 w-full text-xl font-bold rounded-xl border-slate-100 hover:bg-slate-50 active:scale-95 shadow-sm"
                            onClick={() => appendDigit(key)}
                          >
                            {key}
                          </Button>
                        ))}
                        <Button 
                          variant="outline" 
                          className="h-14 w-full rounded-xl text-red-500 border-slate-100 hover:bg-red-50 active:scale-95 shadow-sm flex items-center justify-center" 
                          onClick={deleteLastDigit}
                        >
                          <Delete className="w-6 h-6" />
                        </Button>
                      </div>

                      {/* Action Buttons - Compact h-14 */}
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          className="h-14 px-6 rounded-xl font-bold text-slate-400 hover:text-slate-600" 
                          onClick={() => setSelectedBill(null)}
                          disabled={isProcessing}
                        >
                          ยกเลิก
                        </Button>
                        <Button 
                          className={cn(
                            "flex-1 h-14 rounded-xl text-lg font-black shadow-lg transition-all active:scale-[0.98]",
                            parseFloat(receivedAmount || '0') >= (selectedBill?.totalAmount || 0)
                              ? "bg-green-600 hover:bg-green-700 text-white" 
                              : "bg-slate-100 text-slate-300 pointer-events-none"
                          )} 
                          disabled={isProcessing || parseFloat(receivedAmount || '0') < (selectedBill?.totalAmount || 0)} 
                          onClick={handlePayment}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Banknote className="w-5 h-5" />
                              <span>ยืนยันรับเงินสด</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {paymentMode === 'TRANSFER' && (
                    <div className="space-y-6">
                      <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 p-8 flex flex-col items-center justify-center">
                        {branch?.qrCodeUrl ? (
                          <img src={branch.qrCodeUrl} alt="QR" className="w-48 h-48 mb-4 object-contain shadow-lg rounded-xl bg-white p-2" referrerPolicy="no-referrer" />
                        ) : (
                          <QrCode className="w-12 h-12 text-slate-200 mb-2" />
                        )}
                        <div className="bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm text-center">
                          <p className="font-bold">฿{selectedBill?.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Transfer Action Footer - Compact h-14 */}
                      <div className="flex gap-2">
                        <Button variant="ghost" className="h-14 px-6 rounded-xl font-bold text-slate-400" onClick={() => setSelectedBill(null)} disabled={isProcessing}>ยกเลิก</Button>
                        <Button 
                          className="flex-1 h-14 rounded-xl bg-blue-600 hover:bg-blue-700 text-lg font-black text-white shadow-lg transition-all active:scale-[0.98]"
                          disabled={isProcessing} 
                          onClick={handlePayment}
                        >
                          {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ยืนยันการโอนเงิน'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!paymentMode && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-300 space-y-4 rounded-2xl bg-slate-50/50">
                      <CreditCard className="w-12 h-12 opacity-20" />
                      <p className="font-bold text-slate-400 italic">เลือกวิธีการชำระเงิน</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </AnimatePresence>
    </div>
  );
}

function CheckCircleRow({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
