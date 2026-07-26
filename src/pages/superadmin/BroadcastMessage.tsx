import React from 'react';
import { Megaphone } from 'lucide-react';

export default function BroadcastMessage() {
  return (
    <div className="p-7 max-w-7xl mx-auto">
      <h1 className="text-xl font-black text-slate-900">ประกาศแจ้งเตือน</h1>
      <p className="text-sm text-slate-400 mt-1">ส่งข้อความแจ้งเตือนไปยังลูกค้าทุกราย</p>
      <div className="mt-16 flex flex-col items-center justify-center gap-4 text-slate-300">
        <Megaphone className="w-16 h-16" />
        <p className="text-lg font-black">Coming Soon</p>
        <p className="text-sm text-slate-400">กำลังพัฒนา...</p>
      </div>
    </div>
  );
}
