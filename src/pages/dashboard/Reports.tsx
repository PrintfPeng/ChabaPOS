import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  BarChart3, 
  LineChart, 
  Download, 
  TrendingUp, 
  Receipt, 
  UtensilsCrossed, 
  Search, 
  ArrowUpRight,
  ShoppingBag,
  Percent,
  Calendar
} from 'lucide-react';

type PeriodType = 'today' | 'week' | 'month' | '6months' | 'year';

interface ChartPoint {
  label: string;
  value: number;
  orders: number;
}

interface PeriodData {
  title: string;
  summary: {
    totalSales: number;
    salesChange: string;
    totalOrders: number;
    ordersChange: string;
    aov: number;
    aovChange: string;
    topMenu: string;
    topMenuQty: number;
  };
  chartData: ChartPoint[];
  tableData: {
    period: string;
    orders: number;
    sales: number;
    discount: number;
    net: number;
  }[];
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

const PERIOD_DATA: Record<PeriodType, PeriodData> = {
  today: {
    title: 'วันนี้',
    summary: {
      totalSales: 48100,
      salesChange: '+12.5%',
      totalOrders: 184,
      ordersChange: '+8.3%',
      aov: 261,
      aovChange: '+3.8%',
      topMenu: 'ชานมไต้หวันพ่นไฟ',
      topMenuQty: 45,
    },
    chartData: [
      { label: '08:00', value: 1200, orders: 5 },
      { label: '10:00', value: 3400, orders: 12 },
      { label: '12:00', value: 8900, orders: 34 },
      { label: '14:00', value: 4500, orders: 18 },
      { label: '16:00', value: 5600, orders: 22 },
      { label: '18:00', value: 12000, orders: 45 },
      { label: '20:00', value: 9500, orders: 38 },
      { label: '22:00', value: 3000, orders: 10 },
    ],
    tableData: [
      { period: '22:00 - 23:59', orders: 10, sales: 3000, discount: 150, net: 2850 },
      { period: '20:00 - 21:59', orders: 38, sales: 9500, discount: 475, net: 9025 },
      { period: '18:00 - 19:59', orders: 45, sales: 12000, discount: 600, net: 11400 },
      { period: '16:00 - 17:59', orders: 22, sales: 5600, discount: 280, net: 5320 },
      { period: '14:00 - 15:59', orders: 18, sales: 4500, discount: 225, net: 4275 },
      { period: '12:00 - 13:59', orders: 34, sales: 8900, discount: 445, net: 8455 },
      { period: '10:00 - 11:59', orders: 12, sales: 3400, discount: 170, net: 3230 },
      { period: '08:00 - 09:59', orders: 5, sales: 1200, discount: 60, net: 1140 },
    ],
  },
  week: {
    title: 'สัปดาห์นี้',
    summary: {
      totalSales: 319200,
      salesChange: '+14.2%',
      totalOrders: 1241,
      ordersChange: '+11.5%',
      aov: 257,
      aovChange: '+2.4%',
      topMenu: 'ชาไทยพรีเมียม',
      topMenuQty: 290,
    },
    chartData: [
      { label: 'จันทร์', value: 25400, orders: 98 },
      { label: 'อังคาร', value: 28900, orders: 110 },
      { label: 'พุธ', value: 31200, orders: 124 },
      { label: 'พฤหัสบดี', value: 48100, orders: 184 },
      { label: 'ศุกร์', value: 54200, orders: 210 },
      { label: 'เสาร์', value: 68900, orders: 270 },
      { label: 'อาทิตย์', value: 62500, orders: 245 },
    ],
    tableData: [
      { period: 'วันอาทิตย์', orders: 245, sales: 62500, discount: 3125, net: 59375 },
      { period: 'วันเสาร์', orders: 270, sales: 68900, discount: 3445, net: 65455 },
      { period: 'วันศุกร์', orders: 210, sales: 54200, discount: 2710, net: 51490 },
      { period: 'วันพฤหัสบดี', orders: 184, sales: 48100, discount: 2405, net: 45695 },
      { period: 'วันพุธ', orders: 124, sales: 31200, discount: 1560, net: 29640 },
      { period: 'วันอังคาร', orders: 110, sales: 28900, discount: 1445, net: 27455 },
      { period: 'วันจันทร์', orders: 98, sales: 25400, discount: 1270, net: 24130 },
    ],
  },
  month: {
    title: 'เดือนนี้',
    summary: {
      totalSales: 830000,
      salesChange: '+8.7%',
      totalOrders: 3190,
      ordersChange: '+5.2%',
      aov: 260,
      aovChange: '+3.3%',
      topMenu: 'ครัวซองต์เนยฝรั่งเศส',
      topMenuQty: 740,
    },
    chartData: [
      { label: 'สัปดาห์ที่ 1', value: 180000, orders: 680 },
      { label: 'สัปดาห์ที่ 2', value: 195000, orders: 750 },
      { label: 'สัปดาห์ที่ 3', value: 210000, orders: 810 },
      { label: 'สัปดาห์ที่ 4', value: 245000, orders: 950 },
    ],
    tableData: [
      { period: 'สัปดาห์ที่ 4', orders: 950, sales: 245000, discount: 12250, net: 232750 },
      { period: 'สัปดาห์ที่ 3', orders: 810, sales: 210000, discount: 10500, net: 199500 },
      { period: 'สัปดาห์ที่ 2', orders: 750, sales: 195000, discount: 9750, net: 185250 },
      { period: 'สัปดาห์ที่ 1', orders: 680, sales: 180000, discount: 9000, net: 171000 },
    ],
  },
  '6months': {
    title: '6 เดือนที่ผ่านมา',
    summary: {
      totalSales: 4570000,
      salesChange: '+18.1%',
      totalOrders: 17590,
      ordersChange: '+15.4%',
      aov: 260,
      aovChange: '+2.3%',
      topMenu: 'สปาเก็ตตี้คาโบนาร่า',
      topMenuQty: 3420,
    },
    chartData: [
      { label: 'มกราคม', value: 620000, orders: 2400 },
      { label: 'กุมภาพันธ์', value: 680000, orders: 2650 },
      { label: 'มีนาคม', value: 740000, orders: 2800 },
      { label: 'เมษายน', value: 810000, orders: 3100 },
      { label: 'พฤษภาคม', value: 890000, orders: 3450 },
      { label: 'มิถุนายน', value: 830000, orders: 3190 },
    ],
    tableData: [
      { period: 'มิถุนายน 2026', orders: 3190, sales: 830000, discount: 41500, net: 788500 },
      { period: 'พฤษภาคม 2026', orders: 3450, sales: 890000, discount: 44500, net: 845500 },
      { period: 'เมษายน 2026', orders: 3100, sales: 810000, discount: 40500, net: 769500 },
      { period: 'มีนาคม 2026', orders: 2800, sales: 740000, discount: 37000, net: 703000 },
      { period: 'กุมภาพันธ์ 2026', orders: 2650, sales: 680000, discount: 34000, net: 646000 },
      { period: 'มกราคม 2026', orders: 2400, sales: 620000, discount: 31000, net: 589000 },
    ],
  },
  year: {
    title: '1 ปีที่ผ่านมา',
    summary: {
      totalSales: 8190000,
      salesChange: '+22.4%',
      totalOrders: 31460,
      ordersChange: '+19.8%',
      aov: 260,
      aovChange: '+2.1%',
      topMenu: 'สปาเก็ตตี้คาโบนาร่า',
      topMenuQty: 6250,
    },
    chartData: [
      { label: 'ก.ค. 2025', value: 550000, orders: 2100 },
      { label: 'ส.ค. 2025', value: 580000, orders: 2200 },
      { label: 'ก.ย. 2025', value: 600000, orders: 2300 },
      { label: 'ต.ค. 2025', value: 610000, orders: 2350 },
      { label: 'พ.ย. 2025', value: 630000, orders: 2420 },
      { label: 'ธ.ค. 2025', value: 650000, orders: 2500 },
      { label: 'ม.ค. 2026', value: 620000, orders: 2400 },
      { label: 'ก.พ. 2026', value: 680000, orders: 2650 },
      { label: 'มี.ค. 2026', value: 740000, orders: 2800 },
      { label: 'เม.ย. 2026', value: 810000, orders: 3100 },
      { label: 'พ.ค. 2026', value: 890000, orders: 3450 },
      { label: 'มิ.ย. 2026', value: 830000, orders: 3190 },
    ],
    tableData: [
      { period: 'มิถุนายน 2026', orders: 3190, sales: 830000, discount: 41500, net: 788500 },
      { period: 'พฤษภาคม 2026', orders: 3450, sales: 890000, discount: 44500, net: 845500 },
      { period: 'เมษายน 2026', orders: 3100, sales: 810000, discount: 40500, net: 769500 },
      { period: 'มีนาคม 2026', orders: 2800, sales: 740000, discount: 37000, net: 703000 },
      { period: 'กุมภาพันธ์ 2026', orders: 2650, sales: 680000, discount: 34000, net: 646000 },
      { period: 'มกราคม 2026', orders: 2400, sales: 620000, discount: 31000, net: 589000 },
      { period: 'ธันวาคม 2025', orders: 2500, sales: 650000, discount: 32500, net: 617500 },
      { period: 'พฤศจิกายน 2025', orders: 2420, sales: 630000, discount: 31500, net: 598500 },
      { period: 'ตุลาคม 2025', orders: 2350, sales: 610000, discount: 30500, net: 579500 },
      { period: 'กันยายน 2025', orders: 2300, sales: 600000, discount: 30000, net: 570000 },
      { period: 'สิงหาคม 2025', orders: 2200, sales: 580000, discount: 29000, net: 551000 },
      { period: 'กรกฎาคม 2025', orders: 2100, sales: 550000, discount: 27500, net: 522500 },
    ],
  },
};

export default function Reports() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const { branch, isLoading: isBranchLoading } = useBranch(Number(branchId));

  const [activePeriod, setActivePeriod] = useState<PeriodType>('today');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentData = PERIOD_DATA[activePeriod];

  const handleExport = (type: 'PDF' | 'Excel') => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `กำลังสร้างไฟล์รายงาน ${type}...`,
        success: `ส่งออกข้อมูลสำเร็จ! ไฟล์รายงาน ${type} ถูกบันทึกแล้ว`,
        error: 'เกิดข้อผิดพลาดในการส่งออกรายงาน',
      }
    );
  };

  // SVG Chart sizing
  const svgWidth = 800;
  const svgHeight = 320;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const chartPoints = currentData.chartData;
  const numPoints = chartPoints.length;
  
  // Calculate max revenue value for scaling, add 15% headspace
  const rawMax = Math.max(...chartPoints.map(p => p.value), 1000);
  const maxVal = Math.ceil(rawMax * 1.15);

  const dx = numPoints > 1 ? chartWidth / (numPoints - 1) : chartWidth;
  const barDx = chartWidth / numPoints;

  // Generate SVG coordinates for each point
  const points = chartPoints.map((p, index) => {
    const x = paddingLeft + (chartType === 'line' ? index * dx : (index + 0.5) * barDx);
    const y = paddingTop + chartHeight - (p.value / maxVal) * chartHeight;
    return { x, y, label: p.label, value: p.value, orders: p.orders };
  });

  // SVG paths for line and area charts
  let linePath = '';
  let areaPath = '';

  if (chartType === 'line' && points.length > 0) {
    linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Filter table rows
  const filteredTableData = currentData.tableData.filter(row => 
    row.period.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl pb-10">
      {/* 1. Header with Breadcrumb and Action buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <button 
            onClick={() => navigate(`/brands/${brandId}/branches/${branchId}`)}
            className="flex items-center text-slate-400 hover:text-primary transition-colors mb-2 text-xs font-semibold tracking-wide group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            กลับหน้าภาพรวม
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">รายงานการขายฉบับเต็ม</h1>
          <p className="text-slate-500 text-sm mt-1">วิเคราะห์ข้อมูลสถิติ ยอดขาย ออเดอร์ และแนวโน้มรายได้สาขา {branch?.name}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => handleExport('Excel')}
            className="flex-1 sm:flex-initial rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button 
            onClick={() => handleExport('PDF')}
            className="flex-1 sm:flex-initial shadow-md shadow-red-500/10 bg-gradient-to-r from-primary to-red-500 text-white hover:opacity-90 font-bold transition-all rounded-xl gap-2"
          >
            <Download className="w-4 h-4" />
            PDF Report
          </Button>
        </div>
      </div>

      {/* 2. Tabs Selector for Period */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-2xl border border-red-100/60 shadow-sm">
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {(Object.keys(PERIOD_DATA) as PeriodType[]).map((period) => (
            <button
              key={period}
              onClick={() => {
                setActivePeriod(period);
                setHoveredIndex(null);
              }}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 w-[18%] sm:w-auto min-w-[65px] ${
                activePeriod === period
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-102'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {PERIOD_DATA[period].title}
            </button>
          ))}
        </div>

        {/* Chart Type Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'line'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="กราฟพื้นที่"
          >
            <LineChart className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg transition-all ${
              chartType === 'bar'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="กราฟแท่ง"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Period Date Banner (Daily Report) */}
      {activePeriod === 'today' && (
        <div className="flex items-center gap-5 bg-red-50/45 border border-red-100/60 rounded-3xl p-5 px-6 shadow-[0_4px_20px_rgba(239,68,68,0.04)] animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-black shrink-0 shadow-lg shadow-red-500/15 border border-primary/10">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider leading-none">รายงานการขายประจำวัน</h4>
            <h3 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2.5 leading-none tracking-tight">{getThaiDateString()}</h3>
          </div>
        </div>
      )}

      {/* 3. KPI Metrics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Sales */}
        <Card className="bg-gradient-to-br from-white to-red-50/10 border-red-100/60 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-500 tracking-wider">ยอดขายรวม ({currentData.title})</p>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-primary tracking-tight mt-1">
                  ฿{currentData.summary.totalSales.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-100/40 shadow-sm">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {currentData.summary.salesChange}
              </span>
              <span className="text-slate-400">เปรียบเทียบจากช่วงก่อนหน้า</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Orders */}
        <Card className="bg-gradient-to-br from-white to-blue-50/10 border-slate-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-500 tracking-wider">จำนวนออเดอร์ทั้งหมด</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {currentData.summary.totalOrders.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100/20 shadow-sm">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {currentData.summary.ordersChange}
              </span>
              <span className="text-slate-400">เปรียบเทียบจากช่วงก่อนหน้า</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: AOV */}
        <Card className="bg-gradient-to-br from-white to-amber-50/10 border-slate-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-500 tracking-wider">ยอดขายต่อบิลเฉลี่ย (AOV)</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ฿{currentData.summary.aov.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100/20 shadow-sm">
                <Percent className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                {currentData.summary.aovChange}
              </span>
              <span className="text-slate-400">เปรียบเทียบจากช่วงก่อนหน้า</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Top Menu */}
        <Card className="bg-gradient-to-br from-white to-emerald-50/10 border-slate-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5 w-[75%]">
                <p className="text-xs font-bold text-slate-500 tracking-wider">เมนูขายดีอันดับหนึ่ง</p>
                <h3 className="text-lg font-black text-slate-900 truncate mt-1 tracking-tight" title={currentData.summary.topMenu}>
                  {currentData.summary.topMenu}
                </h3>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/20 shadow-sm shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="text-emerald-700 bg-emerald-100/70 font-black px-2 py-0.5 rounded">
                {currentData.summary.topMenuQty}
              </span>
              <span className="text-slate-500">จานที่ถูกขาย</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Chart Visualization Section */}
      <Card className="shadow-sm border-slate-100 overflow-hidden bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            แนวโน้มยอดขาย ({currentData.title})
          </CardTitle>
          <CardDescription>วิเคราะห์เปรียบเทียบข้อมูลยอดขายและยอดจานตามช่วงเวลาที่กำหนด</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative w-full overflow-hidden bg-slate-50/40 border border-slate-100 rounded-2xl p-4 sm:p-6 select-none">
            {/* SVG Chart Container */}
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-auto overflow-visible"
            >
              {/* Gradients definitions */}
              <defs>
                <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary)/0.6)" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 1, 2, 3].map((i) => {
                const yPos = paddingTop + (chartHeight / 3) * i;
                return (
                  <g key={i}>
                    <line 
                      x1={paddingLeft} 
                      y1={yPos} 
                      x2={svgWidth - paddingRight} 
                      y2={yPos} 
                      stroke="#e2e8f0" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    {/* Y-axis values */}
                    <text 
                      x={paddingLeft - 10} 
                      y={yPos + 4} 
                      textAnchor="end" 
                      className="text-[10px] sm:text-xs font-bold fill-slate-400"
                    >
                      ฿{Math.round(maxVal - (i * maxVal) / 3).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Chart Graphics */}
              {chartType === 'line' ? (
                <>
                  {/* Area fill */}
                  {areaPath && (
                    <path 
                      d={areaPath} 
                      fill="url(#areaColor)" 
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                  {/* Line stroke */}
                  {linePath && (
                    <path 
                      d={linePath} 
                      fill="none" 
                      stroke="stroke-primary" 
                      className="stroke-primary transition-all duration-500 ease-in-out" 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      style={{ stroke: 'hsl(var(--primary))' }}
                    />
                  )}
                  {/* Circle Dots */}
                  {points.map((p, i) => (
                    <circle 
                      key={i} 
                      cx={p.x} 
                      cy={p.y} 
                      r={hoveredIndex === i ? '7' : '5'} 
                      fill={hoveredIndex === i ? 'hsl(var(--primary))' : '#ffffff'} 
                      stroke="stroke-primary" 
                      style={{ stroke: 'hsl(var(--primary))' }}
                      strokeWidth="3.5" 
                      className="transition-all duration-150 cursor-pointer"
                    />
                  ))}
                </>
              ) : (
                // Bar Chart Mode
                points.map((p, i) => {
                  const barWidth = Math.min(45, barDx * 0.55);
                  const barHeight = paddingTop + chartHeight - p.y;
                  return (
                    <rect 
                      key={i} 
                      x={p.x - barWidth / 2} 
                      y={p.y} 
                      width={barWidth} 
                      height={barHeight} 
                      fill="url(#barColor)" 
                      rx="6" 
                      className="transition-all duration-300 ease-in-out cursor-pointer hover:opacity-85"
                      opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.4}
                    />
                  );
                })
              )}

              {/* Vertical Guide dashline on Hover */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <line 
                  x1={points[hoveredIndex].x} 
                  y1={paddingTop} 
                  x2={points[hoveredIndex].x} 
                  y2={paddingTop + chartHeight} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  opacity="0.4"
                />
              )}

              {/* X-axis labels */}
              {points.map((p, i) => (
                <text 
                  key={i} 
                  x={p.x} 
                  y={paddingTop + chartHeight + 22} 
                  textAnchor="middle" 
                  className="text-[10px] sm:text-xs font-bold fill-slate-400"
                >
                  {p.label}
                </text>
              ))}

              {/* Invisible interactive hover rects */}
              {points.map((p, i) => {
                const hoverWidth = chartType === 'line' ? dx : barDx;
                const hoverX = chartType === 'line' 
                  ? p.x - (i === 0 ? 0 : dx / 2) 
                  : p.x - barDx / 2;
                return (
                  <rect 
                    key={i} 
                    x={hoverX} 
                    y={paddingTop} 
                    width={hoverWidth} 
                    height={chartHeight} 
                    fill="transparent" 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <div 
                className="absolute bg-slate-900 border border-slate-800 text-white text-xs p-3 rounded-2xl shadow-xl pointer-events-none z-30 transition-all duration-150 ease-out flex flex-col gap-1"
                style={{
                  left: `${((points[hoveredIndex].x) / svgWidth) * 100}%`,
                  top: `${((points[hoveredIndex].y - 20) / svgHeight) * 100}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="font-bold text-slate-400 border-b border-slate-800 pb-1 flex justify-between gap-4">
                  <span>{points[hoveredIndex].label}</span>
                  <Badge className="bg-red-500/20 text-red-300 border-none px-1.5 py-0 h-4 text-[9px]">
                    ยอดขาย
                  </Badge>
                </div>
                <div className="font-black text-sm text-white mt-0.5">
                  ฿{points[hoveredIndex].value.toLocaleString()}
                </div>
                <div className="text-slate-300 text-[10px]">
                  ออเดอร์ทั้งหมด: <strong className="text-white">{points[hoveredIndex].orders}</strong> บิล
                </div>
                {/* Tooltip Arrow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-800" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Sales Summary Table */}
      <Card className="shadow-sm border-slate-100 overflow-hidden bg-white">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-900">ตารางสรุปยอดขาย</CardTitle>
              <CardDescription>แสดงรายละเอียดข้อมูลยอดขายรายรับสุทธิแยกตามช่วงเวลา</CardDescription>
            </div>
            {/* Search filter input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตามช่วงเวลา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-400"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-bold text-slate-700 h-11 pl-4">ช่วงเวลา</TableHead>
                <TableHead className="font-bold text-slate-700 h-11 text-center">จำนวนออเดอร์</TableHead>
                <TableHead className="font-bold text-slate-700 h-11 text-right">ยอดขายรวม</TableHead>
                <TableHead className="font-bold text-slate-700 h-11 text-right">ส่วนลด (5%)</TableHead>
                <TableHead className="font-bold text-slate-700 h-11 text-right pr-4">รายรับสุทธิ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTableData.length > 0 ? (
                filteredTableData.map((row, i) => (
                  <TableRow key={i} className="border-b border-slate-100/60 hover:bg-slate-50/30 transition-colors">
                    <TableCell className="font-semibold text-slate-800 py-3.5 pl-4">{row.period}</TableCell>
                    <TableCell className="text-center text-slate-600 py-3.5 font-medium">{row.orders}</TableCell>
                    <TableCell className="text-right text-slate-600 py-3.5 font-medium">฿{row.sales.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600 py-3.5 font-medium">-฿{row.discount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-bold py-3.5 pr-4">฿{row.net.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                    ไม่พบข้อมูลที่สอดคล้องกับการค้นหา
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
