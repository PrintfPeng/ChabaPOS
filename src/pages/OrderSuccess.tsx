import React from 'react';
import { CheckCircle2, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function OrderSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl space-y-6 max-w-md w-full">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">สั่งอาหารสำเร็จ!</h1>
          <p className="text-slate-500">
            รายการอาหารของคุณถูกส่งไปยังห้องครัวแล้ว กรุณารอสักครู่ พนักงานจะนำอาหารมาเสิร์ฟที่โต๊ะ
          </p>
        </div>
        <div className="pt-6">
          <Button className="w-full h-12 rounded-xl flex items-center justify-center gap-2" onClick={() => navigate(-1)}>
            <Home className="w-4 h-4" />
            กลับไปหน้าเมนู
          </Button>
        </div>
      </div>
    </div>
  );
}
