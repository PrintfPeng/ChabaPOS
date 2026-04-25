import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrands, Brand } from '../hooks/useBrands';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, LogOut, Store, Loader2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ImageUpload } from '../components/ImageUpload';
import { uploadImageToSupabase } from '../lib/supabase-storage';

export default function BrandSelection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { brands, isLoading, createBrand } = useBrands();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateBrand = async () => {
    if (!newBrandName) return;
    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'brands');
      }
      await createBrand({ name: newBrandName, imageUrl: finalImageUrl });
      setNewBrandName('');
      setImageUrl('');
      setSelectedFile(null);
      setIsDialogOpen(false);
      toast.success('สร้างแบรนด์สำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'สร้างแบรนด์ไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const { updateBrand } = useBrands();

  const handleUpdateBrand = async () => {
    if (!editingBrand || !newBrandName) return;
    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'brands');
      }
      await updateBrand({ id: editingBrand.id, name: newBrandName, imageUrl: finalImageUrl });
      setEditingBrand(null);
      setNewBrandName('');
      setImageUrl('');
      setSelectedFile(null);
      setIsDialogOpen(false);
      toast.success('อัปเดตแบรนด์สำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'อัปเดตแบรนด์ไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = (brand: Brand, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBrand(brand);
    setNewBrandName(brand.name);
    setImageUrl(brand.imageUrl || '');
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">เลือกแบรนด์</h1>
            <p className="text-slate-500 text-sm">เลือกแบรนด์ที่ต้องการจัดการหรือสร้างแบรนด์ใหม่</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingBrand(null);
                setNewBrandName('');
                setImageUrl('');
              }
            }}>
              <DialogTrigger render={<Button />}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มแบรนด์ใหม่
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBrand ? 'แก้ไขแบรนด์' : 'สร้างแบรนด์ใหม่'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ชื่อแบรนด์</Label>
                    <Input 
                      id="name" 
                      value={newBrandName} 
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="เช่น Chaba Thai"
                    />
                  </div>
                  <div className="space-y-2">
                    <ImageUpload 
                      value={imageUrl} 
                      onChange={(url) => setImageUrl(url)}
                      onFileSelect={(file) => setSelectedFile(file)}
                      label="โลโก้แบรนด์"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={editingBrand ? handleUpdateBrand : handleCreateBrand}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      editingBrand ? 'บันทึกการแก้ไข' : 'สร้างแบรนด์'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.isArray(brands) && brands.map((brand) => (
            <Card 
              key={brand.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/brands/${brand.id}/branches`)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary overflow-hidden">
                  {brand.imageUrl ? (
                    <img src={brand.imageUrl} alt={brand.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="group-hover:text-primary transition-colors">{brand.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{brand._count?.branches || 0} สาขา</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => openEditDialog(brand, e)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">คลิกเพื่อจัดการสาขา</p>
              </CardContent>
            </Card>
          ))}
          {(!Array.isArray(brands) || brands.length === 0) && (
            <div className="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
              <Store className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">ยังไม่มีแบรนด์</h3>
              <p className="text-slate-500">สร้างแบรนด์แรกของคุณเพื่อเริ่มต้นใช้งาน</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
