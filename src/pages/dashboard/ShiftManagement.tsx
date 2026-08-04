import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Banknote, TrendingUp, TrendingDown, Minus, CalendarClock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useShift } from '../../contexts/ShiftContext';
import { OpenShiftModal } from '../../components/shifts/OpenShiftModal';
import { CloseShiftModal } from '../../components/shifts/CloseShiftModal';
import { cn } from '../../lib/utils';

export default function ShiftManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const { currentShift } = useShift();
  const [modal, setModal] = useState<'open' | 'close' | null>(null);

  const isOpen = currentShift?.status === 'OPEN';

  const openedAt = currentShift
    ? new Date(currentShift.openedAt).toLocaleString('th-TH', {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-7 h-7 text-primary shrink-0" />
        <h1 className="text-2xl font-black text-slate-900">จัดการกะ (Shift)</h1>
      </div>

      {/* สถานะปัจจุบัน */}
      <div className={cn(
        'rounded-2xl border p-6 flex flex-col gap-4',
        isOpen ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200',
      )}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isOpen ? '🟢' : '🔴'}</span>
          <div>
            <p className={cn('text-lg font-black', isOpen ? 'text-green-700' : 'text-slate-600')}>
              {isOpen ? 'ร้านเปิดอยู่' : 'ร้านปิดอยู่'}
            </p>
            {openedAt && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <CalendarClock className="w-3.5 h-3.5" />
                เปิดกะเมื่อ {openedAt}
              </p>
            )}
          </div>
        </div>

        {currentShift && isOpen && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-200">
            <StatCard
              label="เงินทอนเริ่มต้น"
              value={currentShift.startingCash}
              icon={<Banknote className="w-4 h-4" />}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isOpen ? (
          <Button
            className="flex-1 h-14 text-base font-bold rounded-2xl bg-green-600 hover:bg-green-700 gap-2"
            onClick={() => setModal('open')}
          >
            <span className="text-lg">🟢</span> เปิดกะ / เปิดร้าน
          </Button>
        ) : (
          <Button
            className="flex-1 h-14 text-base font-bold rounded-2xl bg-red-600 hover:bg-red-700 gap-2"
            onClick={() => setModal('close')}
          >
            <span className="text-lg">🔴</span> ปิดกะ / ปิดร้าน
          </Button>
        )}
      </div>

      {/* คำแนะนำ */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500 space-y-1.5">
        <p className="font-semibold text-slate-600">วิธีใช้งาน</p>
        <ul className="list-disc list-inside space-y-1">
          <li>กด <strong>เปิดกะ</strong> พร้อมกรอกเงินทอนเริ่มต้นก่อนเริ่มรับออเดอร์ทุกวัน</li>
          <li>ระบบจะบันทึกออเดอร์ทุกรายการเข้ากะโดยอัตโนมัติ</li>
          <li>กด <strong>ปิดกะ</strong> ตอนสิ้นวัน ระบบจะคำนวณยอดเงินสดที่ควรมีในลิ้นชัก</li>
          <li>บันทึกยอดที่นับได้จริง — ระบบแสดงผลต่าง (ขาด/เกิน) ให้อัตโนมัติ</li>
        </ul>
      </div>

      {/* Modals */}
      {branchId && (
        <>
          <OpenShiftModal
            open={modal === 'open'}
            branchId={branchId}
            onClose={() => setModal(null)}
          />
          {currentShift && isOpen && (
            <CloseShiftModal
              open={modal === 'close'}
              branchId={branchId}
              shift={currentShift}
              onClose={() => setModal(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-green-100 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
        {icon}{label}
      </div>
      <p className="text-xl font-black text-slate-800">
        ฿{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
