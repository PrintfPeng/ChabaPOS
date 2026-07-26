import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Save, Upload, X, Building2, QrCode, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { uploadImageToSupabase } from '../../lib/supabase-storage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const schema = z.object({
  bankName:      z.string({ error: 'กรุณาระบุชื่อธนาคาร' }).min(1, 'กรุณาระบุชื่อธนาคาร'),
  accountName:   z.string({ error: 'กรุณาระบุชื่อบัญชี' }).min(1, 'กรุณาระบุชื่อบัญชี'),
  accountNumber: z.string({ error: 'กรุณาระบุเลขที่บัญชี' }).min(10, 'เลขที่บัญชีต้องมีอย่างน้อย 10 หลัก'),
  qrCodeUrl:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SystemSettings() {
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get('/settings')
      .then(res => {
        const { bankName, accountName, accountNumber, qrCodeUrl } = res.data;
        reset({ bankName, accountName, accountNumber, qrCodeUrl: qrCodeUrl ?? '' });
        setQrPreview(qrCodeUrl ?? '');
      })
      .catch(() => toast.error('โหลดการตั้งค่าไม่สำเร็จ'))
      .finally(() => setLoadingInit(false));
  }, [reset]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setQrPreview(URL.createObjectURL(file));
  };

  const clearQr = () => {
    setSelectedFile(null);
    setQrPreview('');
    reset({ qrCodeUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      let qrCodeUrl = data.qrCodeUrl ?? '';
      if (selectedFile) {
        qrCodeUrl = await uploadImageToSupabase(selectedFile, 'qr-code');
      }
      await api.put('/super-admin/settings', { ...data, qrCodeUrl });
      reset({ ...data, qrCodeUrl });
      setSelectedFile(null);
      setQrPreview(qrCodeUrl);
      toast.success('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">ตั้งค่าระบบ</h1>
        <p className="text-sm text-slate-500 mt-1">
          จัดการข้อมูลบัญชีธนาคารสำหรับรับชำระค่าบริการ และ QR Code PromptPay
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bank Info Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">ข้อมูลบัญชีธนาคาร</p>
              <p className="text-xs text-slate-400">แสดงให้ลูกค้าเห็นในหน้าชำระเงิน</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">ชื่อธนาคาร</Label>
            <Input
              id="bankName"
              placeholder="เช่น ธนาคารกสิกรไทย, ธนาคารไทยพาณิชย์"
              {...register('bankName')}
              className={errors.bankName ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.bankName && (
              <p className="text-xs text-red-500">{errors.bankName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">ชื่อบัญชี</Label>
            <Input
              id="accountName"
              placeholder="เช่น บริษัท ชาบาพอส จำกัด"
              {...register('accountName')}
              className={errors.accountName ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.accountName && (
              <p className="text-xs text-red-500">{errors.accountName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">เลขที่บัญชี</Label>
            <Input
              id="accountNumber"
              placeholder="เช่น 123-4-56789-0"
              {...register('accountNumber')}
              className={errors.accountNumber ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errors.accountNumber && (
              <p className="text-xs text-red-500">{errors.accountNumber.message}</p>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">QR Code PromptPay</p>
              <p className="text-xs text-slate-400">รูป QR Code สำหรับสแกนโอนเงิน (ไม่บังคับ)</p>
            </div>
          </div>

          {qrPreview ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={qrPreview}
                  alt="QR Code"
                  className="w-48 h-48 object-contain rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={clearQr}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-violet-600 hover:underline"
              >
                เปลี่ยนรูป QR Code
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center gap-3 text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
            >
              <Upload className="w-8 h-8" />
              <p className="text-sm font-medium">คลิกเพื่ออัปโหลดรูป QR Code</p>
              <p className="text-xs">PNG, JPG ขนาดไม่เกิน 2MB</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <Label htmlFor="qrCodeUrl" className="text-xs text-slate-500">
              หรือระบุ URL รูป QR Code โดยตรง
            </Label>
            <Input
              id="qrCodeUrl"
              placeholder="https://..."
              {...register('qrCodeUrl')}
              onChange={e => {
                register('qrCodeUrl').onChange(e);
                if (!selectedFile) setQrPreview(e.target.value);
              }}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
