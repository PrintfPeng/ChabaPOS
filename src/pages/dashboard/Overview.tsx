import React from 'react';
import { useParams } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { 
  TrendingUp, 
  Receipt, 
  UtensilsCrossed, 
  Loader2, 
  BarChart3, 
  Activity, 
  User, 
  Clock 
} from 'lucide-react';

const MOCK_SALES_SUMMARY = {
  todaySales: 24500,
  orderCount: 142,
  topMenu: 'กะเพราหมูกรอบไข่ดาว',
  salesIncrease: '+12.5%',
  orderIncrease: '+5.2%'
};

const MOCK_ACTIVITIES = [
  { id: 1, action: 'เพิ่มรายการเมนูใหม่: "ยำวุ้นเส้นหมูสับ"', user: 'แอดมิน สมชาย', time: '10 นาทีที่แล้ว', role: 'Admin' },
  { id: 2, action: 'ยกเลิกบิล #INV-2023001', user: 'แคชเชียร์ สมหญิง', time: '1 ชั่วโมงที่แล้ว', role: 'Cashier' },
  { id: 3, action: 'อัปเดตราคา "ข้าวผัดปู"', user: 'แอดมิน สมชาย', time: '2 ชั่วโมงที่แล้ว', role: 'Admin' },
  { id: 4, action: 'เปิดกะ (Shift Start)', user: 'แคชเชียร์ สมหญิง', time: '08:00 น.', role: 'Cashier' },
];

const MOCK_REVENUE_CHART_DATA = [
  { label: '08:00', value: 1200 },
  { label: '10:00', value: 2500 },
  { label: '12:00', value: 8900 },
  { label: '14:00', value: 4200 },
  { label: '16:00', value: 3100 },
  { label: '18:00', value: 11500 },
  { label: '20:00', value: 9800 },
];

export default function Overview() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch, isLoading } = useBranch(Number(branchId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Header section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">ภาพรวมสาขา {branch?.name}</h1>
        <p className="text-slate-500 mt-1">สรุปข้อมูลการดำเนินงาน ยอดขาย และความเคลื่อนไหวล่าสุด</p>
      </div>

      {/* 1. Sales Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">ยอดขายรวมวันนี้</p>
                <h3 className="text-3xl font-bold text-primary">฿{MOCK_SALES_SUMMARY.todaySales.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                {MOCK_SALES_SUMMARY.salesIncrease}
              </Badge>
              <span className="text-slate-500">เทียบกับเมื่อวาน</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">จำนวนออเดอร์</p>
                <h3 className="text-3xl font-bold text-slate-900">{MOCK_SALES_SUMMARY.orderCount}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                {MOCK_SALES_SUMMARY.orderIncrease}
              </Badge>
              <span className="text-slate-500">เทียบกับเมื่อวาน</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="sm:col-span-2 lg:col-span-1 shadow-sm transition-all hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2 w-full">
                <p className="text-sm font-medium text-slate-600">เมนูยอดฮิตวันนี้</p>
                <h3 className="text-xl font-bold text-slate-900 mt-2 truncate w-[90%]" title={MOCK_SALES_SUMMARY.topMenu}>
                  {MOCK_SALES_SUMMARY.topMenu}
                </h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
               <span className="text-slate-500">ถูกสั่งไปแล้ว <strong className="text-slate-900">38</strong> จาน</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Revenue Report */}
        <div className="lg:col-span-2">
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                รายงานรายรับ
              </CardTitle>
              <CardDescription>สรุปยอดขายแยกตามช่วงเวลาแบบกราฟ</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80">
                  <TabsTrigger value="daily">รายวัน</TabsTrigger>
                  <TabsTrigger value="weekly">รายสัปดาห์</TabsTrigger>
                  <TabsTrigger value="monthly">รายเดือน</TabsTrigger>
                </TabsList>

                <TabsContent value="daily" className="space-y-4 animate-in fade-in-50 duration-500">
                  {/* Mock Chart UI */}
                  <div className="h-[300px] w-full bg-slate-50/50 border border-slate-100 rounded-xl flex items-end justify-between p-4 px-2 sm:px-6 gap-1 sm:gap-2 relative">
                    {/* Y-Axis Guide lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 pointer-events-none">
                      {[3, 2, 1, 0].map((line) => (
                        <div key={line} className="w-full border-t border-slate-200 border-dashed" />
                      ))}
                    </div>

                    {MOCK_REVENUE_CHART_DATA.map((data, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 w-full group z-10">
                        <div className="relative w-full flex justify-center h-[240px] items-end">
                          <div 
                            className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary transition-all duration-300 rounded-t-md relative" 
                            style={{ height: `${Math.max(5, (data.value / 12000) * 100)}%` }}
                          >
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1.5 px-2.5 rounded shadow-lg whitespace-nowrap z-20">
                              ฿{data.value.toLocaleString()}
                              {/* Small pointer triangle */}
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-slate-500 font-medium">{data.label}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="weekly" className="h-[300px] flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50/50 animate-in fade-in-50 duration-500">
                  <p className="text-slate-400">Mock Data สำหรับรายงานรายสัปดาห์</p>
                </TabsContent>

                <TabsContent value="monthly" className="h-[300px] flex items-center justify-center border border-slate-100 rounded-xl bg-slate-50/50 animate-in fade-in-50 duration-500">
                  <p className="text-slate-400">Mock Data สำหรับรายงานรายเดือน</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* 3. Admin Activity Log */}
        <div className="lg:col-span-1">
          <Card className="h-full shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                บันทึกการทำงาน
              </CardTitle>
              <CardDescription>ความเคลื่อนไหวล่าสุดในระบบ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pt-2">
                {MOCK_ACTIVITIES.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Connecting line */}
                    {index !== MOCK_ACTIVITIES.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-slate-100" />
                    )}
                    
                    {/* Icon circle */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white ${
                      activity.role === 'Admin' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {activity.role === 'Admin' ? <User className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-slate-900 leading-snug">
                        {activity.action}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{activity.user}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
