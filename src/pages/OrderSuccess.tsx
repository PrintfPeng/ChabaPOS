import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChefHat, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

const REDIRECT_SECONDS = 15;

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6">

        {/* Animated checkmark */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-green-100 animate-ping opacity-30" />
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" strokeWidth={1.8} />
          </div>
        </div>

        {/* Main message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 leading-tight">
            ส่งออเดอร์เข้าครัว<br />เรียบร้อยแล้ว! 🎉
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            รายการของคุณถูกส่งให้ทีมครัวแล้ว<br />กรุณารอสักครู่ พนักงานจะนำมาเสิร์ฟที่โต๊ะ
          </p>
        </div>

        {/* Kitchen icon badge */}
        <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
          <ChefHat className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-sm font-semibold text-orange-700">
            ครัวกำลังเตรียมอาหารให้คุณ
          </span>
        </div>

        {/* Back button with countdown */}
        <Button
          className="w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าเมนู
          <span className="ml-1 text-xs opacity-70">({countdown})</span>
        </Button>
      </div>
    </div>
  );
}
