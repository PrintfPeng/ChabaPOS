import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, QrCode, Save, Plus, Lock } from 'lucide-react';
import { useBranch } from '../../hooks/useBranches';
import api from '../../lib/api';
import { toast } from 'sonner';
import { ImageUpload } from '../../components/ImageUpload';
import { uploadImageToSupabase } from '../../lib/supabase-storage';

export default function BranchSettings() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const { branch, isLoading, updateBranch } = useBranch(Number(branchId));
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (branch) {
      setQrCodeUrl(branch.qrCodeUrl || '');
      setPin(''); // Reset to empty instead of branch.pin so they don't see it
      setConfirmPin('');
    }
  }, [branch]);

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
    </div>
  );
}
