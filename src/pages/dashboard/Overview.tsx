import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
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
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export interface SummaryData {
  todaySales: number;
  orderCount: number;
  topMenu: string;
  salesIncrease: string;
  orderIncrease: string;
  topMenus: { name: string; quantity: number }[];
}

export interface RevenueData {
  label: string;
  value: number;
}

export interface ActivityLogData {
  id: number;
  action: string;
  user: string;
  time: string;
  role: string;
  details?: string;
}

const getThaiDateString = () => {
  const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const now = new Date();
  const dayName = days[now.getDay()];
  const date = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  return `${dayName}ที่ ${date} ${monthName} ${year}`;
};

export default function Overview() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const { branch, isLoading: isBranchLoading } = useBranch(Number(branchId));

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    if (!branchId) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, revenueRes, logsRes] = await Promise.all([
          api.get(`/dashboard/summary?branchId=${branchId}`),
          api.get(`/dashboard/revenue?branchId=${branchId}&period=${period}`),
          api.get(`/dashboard/logs?branchId=${branchId}`)
        ]);

        setSummary(summaryRes.data);
        setRevenueData(revenueRes.data);
        setActivityLogs(logsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('ไม่สามารถโหลดข้อมูล Dashboard ได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [branchId, period]);

  if (isBranchLoading || isLoading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-slate-500">กำลังโหลดข้อมูล Dashboard...</p>
      </div>
    );
  }

  // Get max value for chart scaling
  const maxRevenue = Math.max(...revenueData.map(d => d.value), 100);

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">ภาพรวมสาขา {branch?.name}</h1>
          <p className="text-slate-500 text-sm mt-1">สรุปข้อมูลการดำเนินงาน ยอดขาย และความเคลื่อนไหวล่าสุด</p>
        </div>
        <div className="shrink-0">
          <Button 
            onClick={() => navigate(`/brands/${brandId}/branches/${branchId}/reports`)}
            className="w-full sm:w-auto shadow-md shadow-red-500/10 bg-gradient-to-r from-primary to-red-500 text-white hover:opacity-90 transition-all duration-200 h-11 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            ดูรายงานฉบับเต็ม
          </Button>
        </div>
      </div>

      {/* 1. Sales Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
          {/* Watermark calendar icon */}
          <div className="absolute right-[-15px] bottom-[-15px] text-primary/5 pointer-events-none">
            <Calendar className="w-28 h-28" />
          </div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">ยอดขายประจำวัน</p>
                <div className="text-sm sm:text-lg font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20 inline-block shadow-sm">
                  {getThaiDateString()}
                </div>
                <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-primary mt-3 tracking-tight">฿{summary.todaySales.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                {summary.salesIncrease}
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
                <h3 className="text-3xl font-bold text-slate-900">{summary.orderCount}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                {summary.orderIncrease}
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
                <h3 className="text-xl font-bold text-slate-900 mt-2 truncate w-[90%]" title={summary.topMenu}>
                  {summary.topMenu}
                </h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
               {summary.topMenus.length > 0 ? (
                 <span className="text-slate-500">ถูกสั่งไปแล้ว <strong className="text-slate-900">{summary.topMenus[0].quantity}</strong> จาน</span>
               ) : (
                 <span className="text-slate-500">ยังไม่มีข้อมูลการสั่งซื้อ</span>
               )}
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
              <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80">
                  <TabsTrigger value="daily">รายวัน</TabsTrigger>
                  <TabsTrigger value="weekly">รายสัปดาห์</TabsTrigger>
                  <TabsTrigger value="monthly">รายเดือน</TabsTrigger>
                </TabsList>

                <TabsContent value={period} className="space-y-4 animate-in fade-in-50 duration-500">
                  <div className="h-[300px] w-full bg-slate-50/50 border border-slate-100 rounded-xl flex items-end justify-between p-4 px-2 sm:px-6 gap-1 sm:gap-2 relative">
                    {/* Y-Axis Guide lines */}
                    <div className="absolute inset-0 flex flex-col justify-between py-8 px-4 pointer-events-none">
                      {[3, 2, 1, 0].map((line) => (
                        <div key={line} className="w-full border-t border-slate-200 border-dashed" />
                      ))}
                    </div>

                    {revenueData.length > 0 ? revenueData.map((data, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 w-full group z-10">
                        <div className="relative w-full flex justify-center h-[240px] items-end">
                          <div 
                            className="w-full max-w-[40px] bg-primary/20 group-hover:bg-primary transition-all duration-300 rounded-t-md relative" 
                            style={{ height: `${Math.max(5, (data.value / maxRevenue) * 100)}%` }}
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
                    )) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-slate-400">ไม่พบข้อมูลรายรับในช่วงเวลานี้</p>
                      </div>
                    )}
                  </div>
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
                {activityLogs.length > 0 ? activityLogs.map((activity, index) => (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Connecting line */}
                    {index !== activityLogs.length - 1 && (
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
                )) : (
                  <div className="text-center py-10 text-slate-500">
                    <Activity className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p>ยังไม่มีบันทึกการทำงาน</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
