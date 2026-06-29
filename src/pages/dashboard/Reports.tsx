import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import api from '../../lib/api';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
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
  Calendar,
  Loader2,
  Printer
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

const periodOptions: { key: PeriodType; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: 'week', label: 'สัปดาห์นี้' },
  { key: 'month', label: 'เดือนนี้' },
  { key: '6months', label: '6 เดือน' },
  { key: 'year', label: '1 ปี' },
];

// ─── PDF-only template — inline styles only, no CSS variables ───────────────
function PdfReportTemplate({ data, periodLabel, branchName }: {
  data: PeriodData;
  periodLabel: string;
  branchName: string;
}) {
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`;

  // Chart geometry
  const svgW = 714, svgH = 150;
  const pL = 48, pR = 16, pT = 12, pB = 28;
  const cW = svgW - pL - pR, cH = svgH - pT - pB;
  const pts = data.chartData;
  const rawMax = Math.max(...pts.map(p => p.value), 1000);
  const maxVal = Math.ceil(rawMax * 1.2);
  const dx = pts.length > 1 ? cW / (pts.length - 1) : cW;

  const linePts = pts.map((p, i) => ({
    x: pL + i * dx,
    y: pT + cH - (p.value / maxVal) * cH,
  }));

  const linePath = linePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length > 0
    ? `${linePath} L ${linePts[linePts.length - 1].x.toFixed(1)} ${(pT + cH).toFixed(1)} L ${linePts[0].x.toFixed(1)} ${(pT + cH).toFixed(1)} Z`
    : '';

  const kpis = [
    { label: 'ยอดขายรวม', value: `฿${data.summary.totalSales.toLocaleString()}`, change: data.summary.salesChange, color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
    { label: 'จำนวนออเดอร์', value: `${data.summary.totalOrders.toLocaleString()} บิล`, change: data.summary.ordersChange, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { label: 'เฉลี่ย / บิล (AOV)', value: `฿${data.summary.aov.toLocaleString()}`, change: data.summary.aovChange, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    { label: 'เมนูขายดีสุด', value: data.summary.topMenu, change: `${data.summary.topMenuQty} จาน`, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  ];

  const s: Record<string, React.CSSProperties> = {
    root: { width: 794, backgroundColor: '#fff', padding: '28px 40px 24px', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', boxSizing: 'border-box' },
    headerWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 14, marginBottom: 18, borderBottom: '3px solid #dc2626' },
    brandLabel: { fontSize: 8, fontWeight: 700, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 3 },
    title: { fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 },
    subtitle: { fontSize: 11, color: '#64748b', marginTop: 4 },
    metaBlock: { textAlign: 'right' as const },
    metaLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' as const },
    metaValue: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginTop: 2 },
    metaSub: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
    kpiRow: { display: 'flex', gap: 10, marginBottom: 18 },
    kpiCard: { flex: 1, borderRadius: 8, padding: '11px 14px', borderWidth: 1, borderStyle: 'solid' },
    kpiLabel: { fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 5 },
    kpiValue: { fontSize: 16, fontWeight: 900, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
    kpiBadge: { marginTop: 5, display: 'inline-block', fontSize: 8, fontWeight: 700, color: '#065f46', backgroundColor: '#d1fae5', padding: '2px 6px', borderRadius: 4 },
    chartBox: { border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 18, backgroundColor: '#f8fafc' },
    chartTitle: { fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 10 },
    tableBox: { border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' },
    tableHead: { backgroundColor: '#f1f5f9', display: 'flex', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' },
    tableTitle: { fontSize: 10, fontWeight: 700, color: '#475569' },
    th: { padding: '7px 12px', fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' as const, borderBottom: '1px solid #e2e8f0' },
    td: { padding: '7px 12px', fontSize: 10 },
    footer: { marginTop: 18, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' },
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.headerWrap}>
        <div>
          <div style={s.brandLabel}>CHABA POS SYSTEM</div>
          <div style={s.title}>รายงานการขาย</div>
          <div style={s.subtitle}>
            สาขา: <strong style={{ color: '#0f172a' }}>{branchName}</strong>
            &nbsp;·&nbsp;
            ช่วงเวลา: <strong style={{ color: '#dc2626' }}>{periodLabel}</strong>
            &nbsp;·&nbsp;{data.title}
          </div>
        </div>
        <div style={s.metaBlock}>
          <div style={s.metaLabel}>วันที่ออกเอกสาร</div>
          <div style={s.metaValue}>{dateStr}</div>
          <div style={s.metaSub}>{timeStr}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={s.kpiRow}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...s.kpiCard, backgroundColor: k.bg, borderColor: k.border }}>
            <div style={s.kpiLabel}>{k.label}</div>
            <div style={{ ...s.kpiValue, color: k.color, fontSize: i === 3 ? 13 : 16 }}>{k.value}</div>
            <div style={s.kpiBadge}>{k.change}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={s.chartBox}>
        <div style={s.chartTitle}>แนวโน้มยอดขาย</div>
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id="pdfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map(i => {
            const y = pT + (cH / 3) * i;
            const val = Math.round(maxVal - (i * maxVal) / 3);
            const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(val);
            return (
              <g key={i}>
                <line x1={pL} y1={y} x2={svgW - pR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                <text x={pL - 4} y={y + 3.5} textAnchor="end" fontSize="7.5" fill="#94a3b8">{label}</text>
              </g>
            );
          })}
          {pts.length > 0 && (
            <>
              <path d={areaPath} fill="url(#pdfGrad)" />
              <path d={linePath} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {linePts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#dc2626" strokeWidth="2" />
              ))}
              {linePts.map((p, i) => (
                <text key={i} x={p.x} y={pT + cH + 18} textAnchor="middle" fontSize="7.5" fill="#94a3b8">{pts[i].label}</text>
              ))}
            </>
          )}
        </svg>
      </div>

      {/* Table */}
      <div style={s.tableBox}>
        <div style={s.tableHead}><span style={s.tableTitle}>ตารางสรุปยอดขาย</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th style={{ ...s.th, textAlign: 'left' }}>ช่วงเวลา</th>
              <th style={{ ...s.th, textAlign: 'right' }}>จำนวนออเดอร์</th>
              <th style={{ ...s.th, textAlign: 'right' }}>ยอดขายรวม</th>
              <th style={{ ...s.th, textAlign: 'right' }}>รายรับสุทธิ</th>
            </tr>
          </thead>
          <tbody>
            {data.tableData.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ ...s.td, color: '#1e293b', fontWeight: 600 }}>{row.period}</td>
                <td style={{ ...s.td, color: '#475569', textAlign: 'right' }}>{row.orders}</td>
                <td style={{ ...s.td, color: '#475569', textAlign: 'right' }}>฿{row.sales.toLocaleString()}</td>
                <td style={{ ...s.td, color: '#059669', fontWeight: 700, textAlign: 'right' }}>฿{row.net.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>สร้างโดยระบบ CHABA POS • เอกสารนี้สร้างโดยอัตโนมัติ</span>
        <span>หน้า 1 / 1 &nbsp;·&nbsp; {dateStr} {timeStr}</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const { branch, isLoading: isBranchLoading } = useBranch(Number(branchId));

  const [activePeriod, setActivePeriod] = useState<PeriodType>('today');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [reportData, setReportData] = useState<PeriodData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;

    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        const res = await api.get<PeriodData>(`/dashboard/reports/sales?branchId=${branchId}&filter=${activePeriod}`);
        setReportData(res.data);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        toast.error('ไม่สามารถโหลดข้อมูลรายงานการขายได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [branchId, activePeriod]);

  const handleExport = (type: 'PDF' | 'Excel') => {
    if (type === 'Excel') {
      try {
        const headers = ['ช่วงเวลา', 'จำนวนออเดอร์', 'ยอดขายรวม (บาท)', 'รายรับสุทธิ (บาท)'];
        const rows = reportData.tableData.map(row => [
          `"${row.period.replace(/"/g, '""')}"`,
          row.orders,
          row.sales,
          row.net
        ]);
        
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        const branchName = branch?.name || 'branch';
        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `รายงานการขาย_${branchName}_${activePeriod}_${dateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`ส่งออกข้อมูล Excel สำหรับช่วงเวลา "${periodOptions.find(p => p.key === activePeriod)?.label}" สำเร็จ!`);
      } catch (error) {
        console.error('Failed to export Excel:', error);
        toast.error('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
      }
    } else if (type === 'PDF') {
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    const toastId = toast.loading('กำลังสร้างไฟล์ PDF...');

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;z-index:-1;pointer-events:none;';
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      const periodLabel = periodOptions.find(p => p.key === activePeriod)?.label ?? activePeriod;
      const branchName = branch?.name ?? 'สาขา';

      await new Promise<void>(resolve => {
        root.render(
          <PdfReportTemplate data={reportData} periodLabel={periodLabel} branchName={branchName} />
        );
        setTimeout(resolve, 300);
      });

      const templateEl = container.firstElementChild as HTMLElement;
      const dataUrl = await toPng(templateEl, { pixelRatio: 2, backgroundColor: '#ffffff' });

      const img = new Image();
      await new Promise<void>(resolve => { img.onload = () => resolve(); img.src = dataUrl; });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (img.height * imgWidth) / img.width;
      let heightLeft = imgHeight;

      let jsPDFClass: any = jsPDF;
      if (typeof jsPDFClass !== 'function') jsPDFClass = (jsPDF as any).default ?? jsPDFClass;
      if (typeof jsPDFClass !== 'function' && (jsPDF as any).jsPDF) jsPDFClass = (jsPDF as any).jsPDF;
      if (typeof jsPDFClass !== 'function') throw new Error('jsPDF is not available.');

      const pdf = new jsPDFClass('p', 'mm', 'a4');
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`รายงานการขาย_${branchName}_${activePeriod}_${dateStr}.pdf`);
      toast.success('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว!', { id: toastId });
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      toast.error(`ไม่สามารถดาวน์โหลด PDF ได้ในขณะนี้: ${error?.message || String(error)}`, { id: toastId });
    } finally {
      root.unmount();
      document.body.removeChild(container);
    }
  };

  if (isBranchLoading || isLoading || !reportData) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-slate-500">กำลังโหลดข้อมูลรายงาน...</p>
      </div>
    );
  }

  const currentData = reportData;

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
    <div id="sales-report-content" className="space-y-6 max-w-7xl pb-10 bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
      {/* 1. Header with Breadcrumb and Action buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <button 
            onClick={() => navigate(`/brands/${brandId}/branches/${branchId}`)}
            className="flex items-center text-slate-400 hover:text-primary transition-colors mb-2 text-xs font-semibold tracking-wide group print:hidden"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            กลับหน้าภาพรวม
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">รายงานการขายฉบับเต็ม</h1>
          <p className="text-slate-500 text-sm mt-1">
            วิเคราะห์ข้อมูลสถิติ ยอดขาย ออเดอร์ และแนวโน้มรายได้สาขา {branch?.name}
            <span className="hidden print:inline font-bold text-primary ml-1">({periodOptions.find(o => o.key === activePeriod)?.label})</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto print:hidden">
          <Button 
            variant="outline" 
            onClick={() => handleExport('Excel')}
            className="flex-1 sm:flex-initial rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button 
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-initial shadow-md shadow-emerald-500/10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 font-bold transition-all rounded-xl gap-2"
          >
            <Download className="w-4 h-4" />
            บันทึก PDF
          </Button>
          <Button 
            onClick={() => handleExport('PDF')}
            className="flex-1 sm:flex-initial shadow-md shadow-red-500/10 bg-gradient-to-r from-primary to-red-500 text-white hover:opacity-90 font-bold transition-all rounded-xl gap-2"
          >
            <Printer className="w-4 h-4" />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>

      {/* 2. Tabs Selector for Period */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-2xl border border-red-100/60 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setActivePeriod(opt.key);
                setHoveredIndex(null);
              }}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 w-[18%] sm:w-auto min-w-[65px] ${
                activePeriod === opt.key
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-102'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {opt.label}
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
            <div className="relative w-full sm:w-72 print:hidden">
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
                    <TableCell className="text-right text-emerald-600 font-bold py-3.5 pr-4">฿{row.net.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-slate-400 font-medium">
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
