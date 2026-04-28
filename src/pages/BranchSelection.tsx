import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranches, Branch } from '../hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, MapPin, ChevronLeft, Loader2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { ImageUpload } from '../components/ImageUpload';
import { uploadImageToSupabase } from '../lib/supabase-storage';

export default function BranchSelection() {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const { branches, isLoading, createBranch, updateBranch } = useBranches(Number(brandId));
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateBranch = async () => {
    if (!newBranchName || !brandId) return;
    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'branches');
      }
      await createBranch({ 
        name: newBranchName, 
        imageUrl: finalImageUrl, 
        brandId: Number(brandId) 
      });
      setNewBranchName('');
      setImageUrl('');
      setSelectedFile(null);
      setIsDialogOpen(false);
      toast.success('สร้างสาขาสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'สร้างสาขาไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch || !newBranchName) return;
    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (selectedFile) {
        finalImageUrl = await uploadImageToSupabase(selectedFile, 'branches');
      }
      await updateBranch({
        id: editingBranch.id,
        name: newBranchName,
        imageUrl: finalImageUrl,
      });
      setEditingBranch(null);
      setNewBranchName('');
      setImageUrl('');
      setSelectedFile(null);
      setIsDialogOpen(false);
      toast.success('อัปเดตสาขาสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'อัปเดตสาขาไม่สำเร็จ');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = (branch: Branch, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBranch(branch);
    setNewBranchName(branch.name);
    setImageUrl(branch.imageUrl || '');
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
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/brands')} className="shrink-0">
              <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">สาขา</h1>
              <p className="text-slate-500 text-sm">เลือกสาขาเพื่อเปิด POS</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingBranch(null);
                setNewBranchName('');
                setImageUrl('');
              }
            }}>
            <DialogTrigger render={<Button />}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มสาขาใหม่
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBranch ? 'แก้ไขสาขา' : 'สร้างสาขาใหม่'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อสาขา</Label>
                  <Input 
                    id="name" 
                    value={newBranchName} 
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="เช่น สาขาใจกลางเมือง"
                  />
                </div>
                <div className="space-y-2">
                  <ImageUpload 
                    value={imageUrl} 
                    onChange={(url) => setImageUrl(url)}
                    onFileSelect={(file) => setSelectedFile(file)}
                    label="รูปภาพสาขา (ไม่บังคับ)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={editingBranch ? handleUpdateBranch : handleCreateBranch}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    editingBranch ? 'บันทึกการแก้ไข' : 'สร้างสาขา'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {Array.isArray(branches) && branches.map((branch) => (
            <Card 
              key={branch.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/brands/${brandId}/branches/${branch.id}`)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary overflow-hidden relative shrink-0">
                  {branch.imageUrl ? (
                    <img 
                      src={branch.imageUrl} 
                      alt={branch.name} 
                      className="absolute inset-0 w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <MapPin className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="group-hover:text-primary transition-colors">{branch.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => openEditDialog(branch, e)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">คลิกเพื่อเปิด POS</p>
              </CardContent>
            </Card>
          ))}
          {(!Array.isArray(branches) || branches.length === 0) && (
            <div className="col-span-full text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
              <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">ยังไม่มีสาขา</h3>
              <p className="text-slate-500">สร้างสาขาแรกสำหรับแบรนด์นี้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
