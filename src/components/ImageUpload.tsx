import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, onFileSelect, label = 'รูปภาพ', className = '' }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ขนาดไฟล์ใหญ่เกิน 2MB');
        return;
      }

      // Show preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      
      if (onFileSelect) {
        onFileSelect(file);
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange('');
    if (onFileSelect) {
      onFileSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 transition-colors hover:border-primary/50">
        {previewUrl ? (
          <div className="relative w-full aspect-video rounded-md overflow-hidden bg-white shadow-sm">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <ImageIcon className="w-12 h-12 mb-2 stroke-1" />
            <p className="text-sm">ยังไม่มีรูปภาพ</p>
          </div>
        )}

        <div className="flex gap-2 w-full">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {previewUrl ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-slate-400">รองรับไฟล์ภาพขนาดไม่เกิน 2MB</p>
    </div>
  );
}
