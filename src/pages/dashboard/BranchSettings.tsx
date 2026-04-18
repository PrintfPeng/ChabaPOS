import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, QrCode, Save, Upload } from 'lucide-react';
import { useBranch } from '../../hooks/useBranches';
import api from '../../lib/api';
import { toast } from 'sonner';

export default function BranchSettings() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branch, isLoading, updateBranch } = useBranch(Number(branchId));
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (branch) {
      setQrCodeUrl(branch.qrCodeUrl || '');
    }
  }, [branch]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBranch({
        qrCodeUrl: qrCodeUrl
      });
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSaving(false);
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าสาขา</h1>
        <p className="text-slate-500">จัดการข้อมูลและค่ากำหนดต่างๆ ของสาขา {branch?.name}</p>
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
            <Label htmlFor="qrCodeUrl">URL รูปภาพ QR Code</Label>
            <div className="flex gap-4">
              <Input 
                id="qrCodeUrl" 
                value={qrCodeUrl} 
                onChange={(e) => setQrCodeUrl(e.target.value)}
                placeholder="https://example.com/your-qrcode.png"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-slate-400 italic">
              * แนะนำให้ใช้ URL ของรูปภาพ QR Code จากพร้อมเพย์หรือช่องทางอื่นๆ
            </p>
          </div>

          {qrCodeUrl && (
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 inline-block">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Preview" 
                className="w-48 h-48 object-contain"
                referrerPolicy="no-referrer"
                onError={() => toast.error('ไม่สามารถโหลดรูปภาพ QR Code ได้ กรุณาตรวจสอบ URL')}
              />
            </div>
          )}

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
