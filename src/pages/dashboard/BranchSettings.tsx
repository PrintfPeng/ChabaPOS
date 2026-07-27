import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Loader2, QrCode, Save, Plus, Lock, Printer, Bluetooth, BluetoothOff, 
  CheckCircle2, WifiOff, BadgePercent, ArrowRight, Settings2 
} from 'lucide-react';
import { useBranch } from '../../hooks/useBranches';
import { usePrinter } from '../../context/PrinterContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import { ImageUpload } from '../../components/ImageUpload';
import { uploadImageToSupabase } from '../../lib/supabase-storage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { cn } from '../../lib/utils';

import KitchenManagement from './KitchenManagement';
import MenuManagement from './MenuManagement';
import OptionManagement from './OptionManagement';

export default function BranchSettings() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const { branch, isLoading, updateBranch } = useBranch(Number(branchId));
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Point Collection Rate State
  const [isRewardRateDialogOpen, setIsRewardRateDialogOpen] = useState(false);
  const [rewardRateInput, setRewardRateInput] = useState('');
  const [isSavingRewardRate, setIsSavingRewardRate] = useState(false);

  useEffect(() => {
    if (branch) {
      setQrCodeUrl(branch.qrCodeUrl || '');
      setPin(''); // Reset to empty instead of branch.pin so they don't see it
      setConfirmPin('');
    }
  }, [branch]);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalQrCodeUrl = qrCodeUrl;
      
      if (selectedFile) {
        finalQrCodeUrl = await uploadImageToSupabase(selectedFile, 'qrcodes');
      }

      await updateBranch({
        qrCodeUrl: finalQrCodeUrl
      });
      setQrCodeUrl(finalQrCodeUrl);
      setSelectedFile(null);
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (!pin || pin.length !== 6) {
      return toast.error('รหัส PIN ต้องเป็นตัวเลข 6 หลัก');
    }
    
    if (pin !== confirmPin) {
      return toast.error('รหัส PIN ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
    }
    
    setIsSavingPin(true);
    try {
      await updateBranch({
        pin: pin || null
      });
      toast.success('บันทึกรหัส PIN สำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกรหัส PIN ได้');
    } finally {
      setIsSavingPin(false);
    }
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
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าสาขา</h1>
          <p className="text-slate-500">จัดการข้อมูลและค่ากำหนดต่างๆ ของสาขา {branch?.name}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/brands')} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            สร้างแบรนด์
          </Button>
          <Button variant="outline" onClick={() => navigate(`/brands/${brandId}/branches`)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            สร้างสาขาเพิ่ม
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="general" className="font-bold text-sm py-2">ข้อมูลทั่วไป</TabsTrigger>
          <TabsTrigger value="kitchens" className="font-bold text-sm py-2">จัดการห้องครัว</TabsTrigger>
          <TabsTrigger value="menus" className="font-bold text-sm py-2">จัดการเมนู</TabsTrigger>
          <TabsTrigger value="options" className="font-bold text-sm py-2">จัดการตัวเลือกเสริม</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-0 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                การชำระเงินผ่านการโอน
              </CardTitle>
              <CardDescription>
                ตั้งค่า QR Code สำหรับรับชำระเงินที่จะแสดงในหน้าจอชำระเงิน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <ImageUpload
                  value={qrCodeUrl}
                  onChange={(url) => setQrCodeUrl(url)}
                  onFileSelect={(file) => setSelectedFile(file)}
                  label="รูปภาพ QR Code พร้อมเพย์"
                  square
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกการตั้งค่า
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
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
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-violet-100 bg-violet-50/40">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                ตั้งค่ารหัสความปลอดภัย (Security PIN)
              </CardTitle>
              <CardDescription>
                รหัส PIN 6 หลักใช้สำหรับยืนยันตัวตนก่อนทำรายการสำคัญ เช่น การลบข้อมูล
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label>รหัส PIN 6 หลักใหม่</Label>
                  <Input 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    className="text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ยืนยันรหัส PIN 6 หลัก</Label>
                  <Input 
                    type="password" 
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    className="text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <Button onClick={handleSavePin} disabled={isSavingPin} className="gap-2 px-8">
                  {isSavingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกรหัส PIN
                </Button>
              </div>
            </CardContent>
          </Card>

          <PrinterCard />

          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ชื่อสาขา</Label>
                <Input value={branch?.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>แบรนด์</Label>
                <Input value={branch?.brand?.name} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kitchens" className="mt-0 animate-fade-in">
          <KitchenManagement />
        </TabsContent>

        <TabsContent value="menus" className="mt-0 animate-fade-in">
          <MenuManagement />
        </TabsContent>

        <TabsContent value="options" className="mt-0 animate-fade-in">
          <OptionManagement />
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

function PrinterCard() {
  const { status, deviceName, isSupported, connect, disconnect } = usePrinter();

  const isConnected = status === 'connected' || status === 'printing';
  const isBusy      = status === 'connecting' || status === 'printing';

  if (!isSupported) {
    return (
      <Card className="border-amber-100 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Printer className="w-5 h-5" />
            เครื่องพิมพ์ใบเสร็จ (Bluetooth)
          </CardTitle>
          <CardDescription className="text-amber-600">
            เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth — กรุณาใช้ Chrome หรือ Edge บน Windows
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={isConnected ? 'border-blue-100' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-primary" />
          เครื่องพิมพ์ใบเสร็จ (Bluetooth)
        </CardTitle>
        <CardDescription>
          เชื่อมต่อ POS Printer รุ่น Y58BT หรือ Thermal Printer 58mm ที่รองรับ BLE
          เพื่อพิมพ์ใบเสร็จอัตโนมัติเมื่อชำระเงินสำเร็จ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isConnected
            ? 'bg-blue-50 border-blue-100'
            : 'bg-slate-50 border-slate-100'
        }`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            isConnected ? 'bg-blue-500' : 'bg-slate-200'
          }`}>
            {isBusy
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : isConnected
              ? <Bluetooth className="w-4 h-4 text-white" />
              : <BluetoothOff className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${isConnected ? 'text-blue-800' : 'text-slate-500'}`}>
              {isBusy
                ? (status === 'connecting' ? 'กำลังเชื่อมต่อ...' : 'กำลังพิมพ์...')
                : isConnected
                ? deviceName ?? 'Bluetooth Printer'
                : 'ยังไม่ได้เชื่อมต่อ'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isConnected
                ? 'พร้อมพิมพ์ใบเสร็จอัตโนมัติ'
                : 'กดปุ่มด้านล่างเพื่อจับคู่กับ printer'}
            </p>
          </div>
          {isConnected && (
            <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
          )}
        </div>

        {/* Action button */}
        <div className="flex gap-3">
          {isConnected ? (
            <Button
              variant="outline"
              onClick={disconnect}
              disabled={isBusy}
              className="gap-2 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <WifiOff className="w-4 h-4" />
              ตัดการเชื่อมต่อ
            </Button>
          ) : (
            <Button
              onClick={connect}
              disabled={isBusy}
              className="gap-2"
            >
              {isBusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Bluetooth className="w-4 h-4" />}
              เชื่อมต่อ Printer
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          ต้องใช้ <strong>Chrome</strong> หรือ <strong>Edge</strong> · รองรับ Y58BT และ Thermal Printer 58mm ที่ใช้ BLE ·
          การเชื่อมต่อจะรีเซ็ตเมื่อ refresh หน้า
        </p>
      </CardContent>
    </Card>
  );
}
