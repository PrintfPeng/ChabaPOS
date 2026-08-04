import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBranch } from '../../hooks/useBranches';
import { Loader2, Sparkles, BadgePercent, ArrowRight, Settings2, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import MembersPage from './members/MembersPage';
import PromotionList from './promotions/PromotionList';

export default function MarketingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'members';

  const { branch, isLoading, updateBranch } = useBranch(Number(branchId));

  // Point Collection Rate State
  const [isRewardRateDialogOpen, setIsRewardRateDialogOpen] = useState(false);
  const [rewardRateInput, setRewardRateInput] = useState('');
  const [isSavingRewardRate, setIsSavingRewardRate] = useState(false);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  const openRewardRateDialog = () => {
    setRewardRateInput(String(branch?.rewardPointRate ?? 100));
    setIsRewardRateDialogOpen(true);
  };

  const handleSaveRewardRate = async () => {
    const parsed = parseFloat(rewardRateInput);
    if (!rewardRateInput || isNaN(parsed) || parsed < 1) {
      return toast.error('กรุณากรอกตัวเลขที่ถูกต้อง (ขั้นต่ำ 1 บาท)');
    }
    setIsSavingRewardRate(true);
    try {
      await updateBranch({ rewardPointRate: parsed });
      toast.success(`บันทึกสำเร็จ — ทุก ฿${parsed.toLocaleString()} = 1 แต้ม`);
      setIsRewardRateDialogOpen(false);
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSavingRewardRate(false);
    }
  };

  const rewardPresets = [25, 50, 100, 200];

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            โปรโมชั่นและสมาชิก
          </h1>
          <p className="text-slate-500 text-sm mt-1">จัดการแคมเปญโปรโมชั่น ส่วนลด และฐานข้อมูลสมาชิกของสาขา {branch?.name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="members" className="font-bold text-sm py-2">จัดการสมาชิก</TabsTrigger>
          <TabsTrigger value="promotions" className="font-bold text-sm py-2">จัดการโปรโมชั่น</TabsTrigger>
          <TabsTrigger value="reward-points" className="font-bold text-sm py-2">ระบบสะสมแต้ม</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          <MembersPage />
        </TabsContent>

        <TabsContent value="promotions" className="mt-0">
          <PromotionList />
        </TabsContent>

        <TabsContent value="reward-points" className="mt-0 animate-fade-in">
          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-violet-500" />
                ระบบสะสมแต้ม
              </CardTitle>
              <CardDescription>
                ตั้งค่าอัตราการแจกแต้มสะสมสำหรับสมาชิกเมื่อมียอดใช้จ่ายตามกำหนด
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-xl border border-violet-100 bg-violet-50/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-500 rounded-xl text-white shrink-0">
                    <BadgePercent className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      อัตราสะสมแต้มปัจจุบัน
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <h3 className="text-lg font-black text-slate-900 leading-none">
                        ฿{(branch?.rewardPointRate ?? 100).toLocaleString()}
                      </h3>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm font-black text-violet-600 leading-none">1 แต้ม</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openRewardRateDialog}
                  className="rounded-xl font-bold gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 shrink-0"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  แก้ไขอัตราแต้ม
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reward Rate Dialog */}
      <Dialog open={isRewardRateDialogOpen} onOpenChange={setIsRewardRateDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-violet-600" />
              ตั้งค่าอัตราการแจกแต้ม
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Current rate display */}
            <div className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-xs text-slate-400 font-semibold mb-1">อัตราปัจจุบัน</p>
              <p className="text-lg font-black text-slate-700">
                ฿{(branch?.rewardPointRate ?? 100).toLocaleString()} = 1 แต้ม
              </p>
            </div>

            {/* Preset quick select */}
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">เลือกอัตราสำเร็จรูป</p>
              <div className="grid grid-cols-4 gap-2">
                {rewardPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setRewardRateInput(String(p))}
                    className={cn(
                      'py-2 rounded-xl border-2 text-sm font-black transition-all cursor-pointer',
                      rewardRateInput === String(p)
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200',
                    )}
                  >
                    ฿{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-500">หรือกำหนดเอง (บาท / 1 แต้ม)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 pointer-events-none">฿</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="100"
                  value={rewardRateInput}
                  onChange={(e) => setRewardRateInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRewardRate()}
                  className="pl-7 h-11 rounded-xl font-bold text-lg"
                />
              </div>
              {rewardRateInput && !isNaN(parseFloat(rewardRateInput)) && parseFloat(rewardRateInput) >= 1 && (
                <p className="text-xs text-violet-600 font-semibold flex items-center gap-1.5 pl-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ลูกค้าจ่ายทุก ฿{parseFloat(rewardRateInput).toLocaleString()} จะได้ 1 แต้ม
                </p>
              )}
            </div>

            <Button
              onClick={handleSaveRewardRate}
              disabled={isSavingRewardRate}
              className="w-full h-11 rounded-xl font-bold bg-violet-600 hover:bg-violet-700"
            >
              {isSavingRewardRate
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <CheckCircle2 className="w-4 h-4 mr-2" />}
              บันทึกอัตราใหม่
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
