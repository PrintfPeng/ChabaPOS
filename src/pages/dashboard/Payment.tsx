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
      await api.post(`/orders/table/${selectedBill?.table?.id}/pay`, {
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
          {(unpaidBills || []).map((bill) => (
            <motion.div
              key={bill.table?.id || `unnamed-${Math.random()}`}
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

        {unpaidBills.length === 0 && (
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
          <DialogContent className="w-full h-full sm:h-[90vh] sm:max-w-5xl p-0 gap-0 border-none overflow-hidden sm:rounded-3xl shadow-2xl">
            <div className="flex flex-col sm:flex-row h-full">
              {/* Left side: Bill Details - RESPONSIVE & GROUPED */}
              <div className="w-full sm:w-[420px] h-1/2 sm:h-full flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden">
                <div className="p-6 bg-white border-b shrink-0">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-xl flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        โต๊ะ {selectedBill?.table?.name}
                      </DialogTitle>
                      <Badge variant="outline" className="text-slate-400">
                        {unpaidBills.find(b => b.table?.id === selectedBill?.table?.id)?.orders.length || 0} ออเดอร์
                      </Badge>
                    </div>
                  </DialogHeader>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8 pb-10">
                    {(selectedBill?.orders || []).map((order: any) => (
                      <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Order ID</span>
                            <span className="text-xs font-bold text-slate-600">#{order.orderNumber}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block mb-1">
                              {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {/* Order Status Badge */}
                            <Badge className="text-[9px] h-5" variant={order.status === 'SERVED' ? 'success' : 'warning'}>
                              {order.status === 'SERVED' ? 'เสิร์ฟครบแล้ว' : 'กำลังดำเนินการ'}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {(order.items || []).map((item: any) => (
                            <div key={item.id} className="flex justify-between items-start group">
                              <div className="flex-1">
                                <div className="flex items-start gap-2">
                                  <div className="min-w-[24px] h-6 flex items-center justify-center bg-slate-100 rounded text-[11px] font-black text-slate-500">
                                    {item.quantity}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{item.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.status && (
                                        <span className={cn(
                                          "text-[9px] px-1 rounded-sm font-bold",
                                          item.status === 'SERVED' ? "text-green-500 bg-green-50" : "text-orange-500 bg-orange-50"
                                        )}>
                                          {item.status}
                                        </span>
                                      )}
                                      {(item.options || []).map((o: any) => (
                                        <span key={o.id} className="text-[9px] text-slate-400">
                                          • {o.name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-slate-900 ml-2">
                                ฿{((item.price + (item.options || []).reduce((sum: number, o: any) => sum + o.price, 0)) * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-6 bg-white border-t border-slate-200 shrink-0">
                  <div className="flex justify-between items-center bg-slate-900 p-5 rounded-[22px] shadow-lg">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ยอดรวมบิลนี้</span>
                    <span className="text-3xl font-black text-white italic">฿{selectedBill?.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right side: Payment Logic */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden h-1/2 sm:h-full">
                  <div className="p-8 flex-1 flex flex-col space-y-8">
                    {/* Payment Mode Selector */}
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setPaymentMode('CASH')}
                        className={cn(
                          "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 group relative overflow-hidden",
                          paymentMode === 'CASH' 
                            ? "border-primary bg-primary/5 text-primary ring-4 ring-primary/10" 
                            : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <Banknote className={cn("w-10 h-10 transition-transform group-hover:scale-110", paymentMode === 'CASH' ? "text-primary" : "text-slate-400")} />
                        <span className="font-bold text-lg">เงินสด (Cash)</span>
                        {paymentMode === 'CASH' && <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />}
                      </button>
                      <button 
                        onClick={() => setPaymentMode('TRANSFER')}
                        className={cn(
                          "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 group relative overflow-hidden",
                          paymentMode === 'TRANSFER' 
                            ? "border-primary bg-primary/5 text-primary ring-4 ring-primary/10" 
                            : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <QrCode className={cn("w-10 h-10 transition-transform group-hover:scale-110", paymentMode === 'TRANSFER' ? "text-primary" : "text-slate-400")} />
                        <span className="font-bold text-lg">โอนเงิน (Transfer)</span>
                        {paymentMode === 'TRANSFER' && <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full animate-pulse" />}
                      </button>
                    </div>

                    {paymentMode === 'CASH' && (
                      <div className="flex-1 flex flex-col space-y-6">
                        {/* Display Zone */}
                        <div className="bg-slate-900 p-8 rounded-3xl text-right space-y-4 shadow-xl">
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">จำนวนเงินที่รับมา</p>
                            <div className="flex items-baseline justify-end gap-2">
                              <span className="text-2xl text-slate-500 font-bold">฿</span>
                              <p className="text-6xl font-mono font-black text-white">{parseFloat(receivedAmount || '0').toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="h-px bg-slate-800" />
                          <div className="flex justify-between items-center text-green-400">
                            <span className="text-sm font-bold uppercase tracking-wider">เงินทอน (Change)</span>
                            <span className="text-4xl font-mono font-black">฿{change.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Hybrid Keypad & Quick Cash Zone */}
                        <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden min-h-[400px]">
                          {/* Left: Numeric Keypad (75% width) */}
                          <div className="col-span-3 grid grid-cols-3 gap-3 h-full">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00'].map(key => (
                              <Button 
                                key={key} 
                                variant="outline" 
                                className="h-full text-3xl font-black rounded-[24px] border-2 border-slate-100 hover:border-slate-300 active:scale-95 active:bg-slate-50 transition-all shadow-sm"
                                onClick={() => appendDigit(key)}
                              >
                                {key}
                              </Button>
                            ))}
                            <Button 
                              variant="outline" 
                              className="h-full rounded-[24px] text-red-500 border-2 border-red-50/50 hover:border-red-200 hover:bg-red-50 active:scale-95 transition-all shadow-sm flex items-center justify-center p-0" 
                              onClick={deleteLastDigit}
                            >
                              <Delete className="w-9 h-9" />
                            </Button>
                          </div>

                          {/* Right: Quick Cash Banknotes (25% width) */}
                          <div className="col-span-1 grid grid-cols-1 gap-3 h-full">
                            {[
                              { label: '1,000', value: 1000, color: 'bg-slate-900 hover:bg-black' },
                              { label: '500', value: 500, color: 'bg-purple-600 hover:bg-purple-700' },
                              { label: '100', value: 100, color: 'bg-red-600 hover:bg-red-700' },
                              { label: '50', value: 50, color: 'bg-blue-600 hover:bg-blue-700' },
                              { label: '20', value: 20, color: 'bg-green-600 hover:bg-green-700' },
                            ].map((btn) => (
                              <Button
                                key={btn.value}
                                className={cn(
                                  "h-full text-lg font-black rounded-[22px] shadow-lg text-white border-none transition-transform active:scale-95", 
                                  btn.color
                                )}
                                onClick={() => handleQuickCash(btn.value)}
                              >
                                {btn.label}
                              </Button>
                            ))}
                            <Button 
                              variant="secondary" 
                              className="h-full font-bold rounded-[22px] bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95" 
                              onClick={clearReceived}
                            >
                              ล้าง
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMode === 'TRANSFER' && (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="relative group">
                          {branch?.qrCodeUrl ? (
                            <div className="bg-white p-8 rounded-[40px] border-4 border-slate-100 shadow-2xl transition-transform group-hover:scale-105">
                              <img 
                                src={branch.qrCodeUrl} 
                                alt="QR Code" 
                                className="w-64 h-64 object-contain" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-16 rounded-[40px] border-4 border-dashed border-slate-200 text-center space-y-4">
                              <QrCode className="w-24 h-24 mx-auto text-slate-200" />
                              <p className="text-slate-400 font-medium max-w-[200px]">กรุณาตั้งค่า QR Code ในส่วนจัดการสาขา</p>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-50 px-8 py-4 rounded-full border border-slate-200">
                          <p className="text-lg text-slate-600 font-bold">
                            ยอดชำระ: <span className="text-2xl font-black text-primary">฿{selectedBill?.totalAmount.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {!paymentMode && (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                          <CreditCard className="w-10 h-10" />
                        </div>
                        <p className="text-lg font-medium italic">เลือกช่องทางชำระเงินเพื่อดำเนินการต่อ</p>
                      </div>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-6">
                    <Button 
                      variant="ghost" 
                      className="h-16 px-8 rounded-2xl font-bold text-slate-500 hover:bg-slate-100" 
                      onClick={() => setSelectedBill(null)}
                      disabled={isProcessing}
                    >
                      ยกเลิก
                    </Button>
                    <Button 
                      className={cn(
                        "flex-1 h-16 rounded-2xl text-xl font-black shadow-lg transition-all active:scale-[0.98]",
                        paymentMode ? "bg-green-600 hover:bg-green-700" : "bg-slate-200 text-slate-400 pointer-events-none"
                      )}
                      disabled={!paymentMode || isProcessing}
                      onClick={handlePayment}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-6 h-6 animate-spin mr-3" />
                      ) : (
                        <CheckCircleRow className="w-6 h-6 mr-3" />
                      )}
                      {paymentMode === 'CASH' ? 'ยืนยันรับเงินสด' : 'ยืนยันและปิดโต๊ะ'}
                    </Button>
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
