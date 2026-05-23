import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Loader2, Package, TrendingUp, Printer } from 'lucide-react';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }).replace(',', ' -');
};

export default function InventoryDashboard() {
  const { branchId } = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePrintOrder, setActivePrintOrder] = useState<any | null>(null);

  useEffect(() => {
    fetchTodayOrders();
  }, [branchId]);

  const fetchTodayOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/purchase-orders/today?branchId=${branchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalSpent = safeOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const handlePrint = (order: any) => {
    setActivePrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary rounded-2xl text-white">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">บิลสั่งซื้อวันนี้</p>
                <h3 className="text-3xl font-black">{orders.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500 rounded-2xl text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">ยอดสั่งซื้อรวมวันนี้ (฿)</p>
                <h3 className="text-3xl font-black text-emerald-700">฿{totalSpent.toLocaleString()}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>รายการสั่งซื้อล่าสุดของวันนี้</CardTitle>
        </CardHeader>
        <CardContent>
          {safeOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              ยังไม่มีรายการสั่งซื้อในวันนี้
            </div>
          ) : (
            <div className="space-y-4">
              {safeOrders.map((order: any) => (
                <div key={order.id} className="p-4 border rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h4 className="font-bold">รหัสบิล: #{order.id} - {order.supplier.name}</h4>
                    <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
                    <div className="mt-2 text-sm text-slate-600">
                      {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                        <span key={item.id}>
                          {item.rawMaterial?.name} ({item.quantity} {item.rawMaterial?.unit}){i < order.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="font-black text-lg text-primary">฿{order.totalAmount.toLocaleString()}</span>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(order)} className="rounded-xl font-bold h-8">
                      <Printer className="w-4 h-4 mr-2" />
                      พิมพ์ใบสั่งซื้อ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable PO Section */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-po, #printable-po * {
              visibility: visible;
            }
            #printable-po {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: A4;
              margin: 1.5cm;
            }
          }
        `}
      </style>

      {activePrintOrder && (
        <div id="printable-po" className="hidden print:block bg-white text-black p-8 max-w-[21cm] mx-auto text-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-black">ChabaPOS</h1>
              <p className="text-slate-600 mt-1">สาขา ID: {branchId}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wider">ใบสั่งซื้อวัตถุดิบ</h2>
              <p className="text-slate-600 font-bold mt-1">Purchase Order</p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 text-left">
                <span className="font-bold">เลขที่เอกสาร:</span>
                <span>PO-{String(activePrintOrder.id).padStart(5, '0')}</span>
                <span className="font-bold">วันที่สั่งซื้อ:</span>
                <span>{formatDate(activePrintOrder.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="mb-6 p-4 border rounded-xl bg-slate-50">
            <h3 className="font-bold uppercase text-slate-500 mb-2">ข้อมูลคู่ค้า (Supplier)</h3>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <span className="font-bold">ชื่อร้านค้า:</span>
              <span className="font-bold text-lg">{activePrintOrder.supplier?.name}</span>
              <span className="font-bold">ติดต่อ:</span>
              <span>{activePrintOrder.supplier?.contact || '-'}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-slate-100">
                <th className="p-3 text-left w-16">ลำดับ</th>
                <th className="p-3 text-left">รายการวัตถุดิบ</th>
                <th className="p-3 text-right">จำนวน</th>
                <th className="p-3 text-left">หน่วย</th>
                <th className="p-3 text-right">ราคา/หน่วย</th>
                <th className="p-3 text-right">ราคารวม</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(activePrintOrder.items) && activePrintOrder.items.map((item: any, index: number) => (
                <tr key={item.id} className="border-b break-inside-avoid">
                  <td className="p-3 text-left">{index + 1}</td>
                  <td className="p-3 text-left font-bold">{item.rawMaterial?.name}</td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="p-3 text-left">{item.rawMaterial?.unit}</td>
                  <td className="p-3 text-right">฿{Number(item.price).toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">฿{(Number(item.price) * Number(item.quantity)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black">
                <td colSpan={5} className="p-4 text-right font-bold text-lg">ยอดรวมสุทธิทั้งหมด (Grand Total)</td>
                <td className="p-4 text-right font-black text-xl">฿{activePrintOrder.totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 mt-16 break-inside-avoid">
            <div className="text-center">
              <div className="border-b border-black border-dashed mx-8 mb-2 h-8"></div>
              <p className="font-bold">ผู้จัดซื้อ</p>
              <p className="text-slate-500 mt-1">วันที่ _______/_______/_______</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black border-dashed mx-8 mb-2 h-8"></div>
              <p className="font-bold">ผู้ตรวจสอบ / อนุมัติ</p>
              <p className="text-slate-500 mt-1">วันที่ _______/_______/_______</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
