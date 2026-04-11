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

export default function BrandSelection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { brands, isLoading, createBrand } = useBrands();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const handleCreateBrand = async () => {
    if (!newBrandName) return;
    try {
      await createBrand({ name: newBrandName, imageUrl });
      setNewBrandName('');
      setImageUrl('');
      setIsDialogOpen(false);
      toast.success('สร้างแบรนด์สำเร็จ');
    } catch (error) {
      toast.error('สร้างแบรนด์ไม่สำเร็จ');
    }
  };

  const { updateBrand } = useBrands();

  const handleUpdateBrand = async () => {
    if (!editingBrand || !newBrandName) return;
    try {
      await updateBrand({ id: editingBrand.id, name: newBrandName, imageUrl });
      setEditingBrand(null);
      setNewBrandName('');
      setImageUrl('');
      setIsDialogOpen(false);
      toast.success('อัปเดตแบรนด์สำเร็จ');
    } catch (error) {
      toast.error('อัปเดตแบรนด์ไม่สำเร็จ');
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">เลือกแบรนด์</h1>
            <p className="text-slate-500">เลือกแบรนด์ที่ต้องการจัดการหรือสร้างแบรนด์ใหม่</p>
          </div>
          <div className="flex gap-4">
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
                    <Label htmlFor="logo">URL รูปภาพ (ไม่บังคับ)</Label>
                    <Input 
                      id="logo" 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={editingBrand ? handleUpdateBrand : handleCreateBrand}>
                    {editingBrand ? 'บันทึกการแก้ไข' : 'สร้างแบรนด์'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
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
          {brands.length === 0 && (
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
