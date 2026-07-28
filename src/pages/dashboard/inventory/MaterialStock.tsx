import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Loader2, SlidersHorizontal, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Material { id: number; name: string; unit: string; stock: number; categoryId: number; category?: { id: number; name: string } }
interface Category { id: number; name: string }

export default function MaterialStock() {
  const { branchId } = useParams();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [actualCount, setActualCount] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => { fetchData(); }, [branchId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matRes, catRes] = await Promise.all([
        api.get(`/raw-materials?branchId=${branchId}`),
        api.get(`/material-categories?branchId=${branchId}`),
      ]);
      setMaterials(matRes.data);
      setCategories(catRes.data);
    } catch {
      toast.error('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  // จัดกลุ่มวัตถุดิบตามหมวดหมู่ (logic เดียวกับ Materials.tsx)
  const grouped = categories
    .map(cat => ({
      category: cat,
      items: materials.filter(m => m.categoryId === cat.id),
    }))
    .filter(g => g.items.length > 0);

  const uncategorized = materials.filter(m => !categories.find(c => c.id === m.categoryId));

  const openAdjust = (m: Material) => {
    setAdjustingMaterial(m);
    setActualCount(String(m.stock ?? 0));
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async () => {
    if (actualCount === '' || isNaN(Number(actualCount))) return toast.error('กรุณากรอกยอดที่นับได้จริง');
    setIsAdjusting(true);
    try {
      await api.patch(
        `/raw-materials/${adjustingMaterial!.id}/stock`,
        { stock: Number(actualCount) },
      );
      toast.success(`ปรับสต๊อก "${adjustingMaterial!.name}" เป็น ${actualCount} ${adjustingMaterial!.unit} สำเร็จ`);
      setIsAdjustOpen(false);
      fetchData();
    } catch {
      toast.error('ปรับสต๊อกไม่สำเร็จ');
    } finally {
      setIsAdjusting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const StockBadge = ({ stock }: { stock: number }) => (
    <span className={`font-extrabold text-base ${
      stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-emerald-600'
    }`}>
      {stock.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
    </span>
  );

  const GroupTable = ({ items }: { items: Material[] }) => (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-20 font-bold text-slate-600">รหัส</TableHead>
            <TableHead className="font-bold text-slate-600">ชื่อวัตถุดิบ</TableHead>
            <TableHead className="font-bold text-slate-600 text-right">ยอดคงเหลือ</TableHead>
            <TableHead className="font-bold text-slate-600">หน่วย</TableHead>
            <TableHead className="font-bold text-slate-600 text-center w-32">ปรับสต๊อก</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(m => (
            <TableRow key={m.id} className="hover:bg-slate-50 transition-colors">
              <TableCell className="text-slate-400 text-sm font-mono">#{m.id}</TableCell>
              <TableCell className="font-semibold text-slate-800">{m.name}</TableCell>
              <TableCell className="text-right">
                <StockBadge stock={m.stock ?? 0} />
              </TableCell>
              <TableCell className="text-slate-500 text-sm">{m.unit}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAdjust(m)}
                  className="text-emerald-600 hover:bg-emerald-50 rounded-lg font-semibold"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-1" />
                  ปรับสต๊อก
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">ยอดวัตถุดิบคงเหลือ</h2>

      {/* Grouped by category */}
      {grouped.length === 0 && uncategorized.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <PackageOpen className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-semibold">ยังไม่มีวัตถุดิบ</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ category, items }) => (
            <div key={category.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="font-extrabold text-slate-800 text-base">{category.name}</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length} รายการ</span>
              </div>
              <GroupTable items={items} />
            </div>
          ))}

          {uncategorized.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-1 rounded-full bg-slate-300" />
                <h3 className="font-extrabold text-slate-500 text-base">ไม่มีหมวดหมู่</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{uncategorized.length} รายการ</span>
              </div>
              <GroupTable items={uncategorized} />
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ปรับยอดสต๊อก</DialogTitle>
          </DialogHeader>
          {adjustingMaterial && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="font-bold text-slate-800 text-base">{adjustingMaterial.name}</p>
                <p className="text-sm text-slate-500">
                  ยอดคงเหลือปัจจุบัน:{' '}
                  <span className="font-extrabold text-slate-700">
                    {(adjustingMaterial.stock ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </span>{' '}
                  {adjustingMaterial.unit}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500">
                  ยอดที่นับได้จริง ({adjustingMaterial.unit})
                </label>
                <Input
                  type="number"
                  min="0"
                  value={actualCount}
                  onChange={e => setActualCount(e.target.value)}
                  className="h-11 rounded-xl text-lg font-bold"
                  placeholder="0"
                  autoFocus
                />
              </div>
              <Button onClick={handleAdjustSubmit} disabled={isAdjusting} className="w-full h-11 rounded-xl font-bold">
                {isAdjusting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                ยืนยันการปรับสต๊อก
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
