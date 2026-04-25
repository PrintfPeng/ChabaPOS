import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Utensils, Menu, Settings, LayoutGrid, Loader2 } from 'lucide-react';

export default function Overview() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { branch, isLoading } = useBranch(Number(branchId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { name: 'ห้องครัว', value: '2', icon: Utensils, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'รายการเมนู', value: '45', icon: Menu, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'กลุ่มตัวเลือก', value: '8', icon: Settings, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'โต๊ะ', value: '12', icon: LayoutGrid, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ยินดีต้อนรับสู่ {branch?.name}</h1>
        <p className="text-slate-500">นี่คือภาพรวมการดำเนินงานของสาขาคุณ</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.name}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">เพิ่มรายการเมนูใหม่: "กะเพราไก่สับ"</p>
                    <p className="text-xs text-slate-500">2 ชั่วโมงที่แล้ว</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ทางลัด</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('menu')}
              className="p-4 text-left border rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <p className="font-medium text-slate-900 group-hover:text-primary">จัดการเมนู</p>
              <p className="text-xs text-slate-500">ขยายรายการอาหารของคุณ</p>
            </button>
            <button 
              onClick={() => navigate('tables')}
              className="p-4 text-left border rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <p className="font-medium text-slate-900 group-hover:text-primary">จัดการโต๊ะ</p>
              <p className="text-xs text-slate-500">อัปเดตสถานะโต๊ะที่นั่ง</p>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
