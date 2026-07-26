import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';
import {
  Tag, Plus, Pencil, Trash2, Loader2, Percent, Coins, BadgeDollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import PromotionBuilder from './PromotionBuilder';

interface Promotion {
  id: number;
  name: string;
  code?: string;
  type: 'PERCENT' | 'FIXED' | 'POINTS_REDEMPTION';
  value: number;
  minSpend: number;
  pointsNeeded: number;
  memberOnly: boolean;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const TYPE_MAP = {
  PERCENT:           { label: 'ลด %',       icon: <Percent     className="w-3.5 h-3.5" />, cls: 'bg-blue-100 text-blue-700'   },
  FIXED:             { label: 'ลดเงิน',     icon: <BadgeDollarSign className="w-3.5 h-3.5" />, cls: 'bg-emerald-100 text-emerald-700' },
  POINTS_REDEMPTION: { label: 'แลกแต้ม',    icon: <Coins       className="w-3.5 h-3.5" />, cls: 'bg-amber-100 text-amber-700'  },
};

export default function PromotionList() {
  const { branchId } = useParams<{ branchId: string }>();
  const [promos, setPromos]         = useState<Promotion[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing]       = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [toggling, setToggling]     = useState<number | null>(null);

  const fetchPromos = async () => {
    try {
      const res = await api.get(`/promotions?branchId=${branchId}`);
      setPromos(res.data);
    } catch {
      toast.error('ไม่สามารถโหลดรายการโปรโมชั่นได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, [branchId]);

  const handleToggle = async (promo: Promotion) => {
    setToggling(promo.id);
    try {
      const res = await api.patch(`/promotions/${promo.id}/toggle`);
      setPromos((prev) => prev.map((p) => (p.id === promo.id ? res.data : p)));
    } catch {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/promotions/${deleteTarget.id}`);
      toast.success(`ลบ "${deleteTarget.name}" แล้ว`);
      setDeleteTarget(null);
      fetchPromos();
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const openEdit = (p: Promotion) => { setEditing(p); setBuilderOpen(true); };
  const openCreate = () => { setEditing(null); setBuilderOpen(true); };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end items-center">
        <Button onClick={openCreate} className="rounded-xl font-bold gap-2">
          <Plus className="w-4 h-4" />
          สร้างโปรโมชั่น
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold text-slate-600">ชื่อโปรโมชั่น</TableHead>
                <TableHead className="font-bold text-slate-600">ประเภท</TableHead>
                <TableHead className="font-bold text-slate-600 text-right">ส่วนลด</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">เงื่อนไข</TableHead>
                <TableHead className="font-bold text-slate-600">ช่วงเวลา</TableHead>
                <TableHead className="font-bold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-400">
                    <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-semibold">ยังไม่มีโปรโมชั่น</p>
                    <p className="text-xs mt-1">คลิก "สร้างโปรโมชั่น" เพื่อเริ่มต้น</p>
                  </TableCell>
                </TableRow>
              ) : (
                promos.map((p) => {
                  const typeInfo = TYPE_MAP[p.type];
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50">
                      <TableCell>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        {p.code && (
                          <span className="text-xs font-mono text-slate-400">#{p.code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 font-bold text-xs border-none ${typeInfo.cls}`}>
                          {typeInfo.icon}{typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-800">
                        {p.type === 'PERCENT'
                          ? `${p.value}%`
                          : `฿${p.value.toLocaleString()}`}
                        {p.type === 'POINTS_REDEMPTION' && (
                          <span className="text-xs text-slate-400 ml-1">({p.pointsNeeded} แต้ม)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 space-y-0.5">
                        {p.minSpend > 0 && <div>ขั้นต่ำ ฿{p.minSpend.toLocaleString()}</div>}
                        {p.memberOnly && <div className="text-primary font-bold">สมาชิกเท่านั้น</div>}
                        {!p.minSpend && !p.memberOnly && <div className="text-slate-300">—</div>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {toggling === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-400" />
                        ) : (
                          <button
                            onClick={() => handleToggle(p)}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              p.isActive ? 'bg-primary' : 'bg-slate-200',
                            )}
                          >
                            <span className={cn(
                              'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                              p.isActive ? 'translate-x-6' : 'translate-x-1',
                            )} />
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="h-8 w-8 p-0 rounded-lg">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(p)} className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Builder Dialog */}
      <PromotionBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        editing={editing}
        branchId={Number(branchId)}
        onSaved={fetchPromos}
      />

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบโปรโมชั่น</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 py-1">
            คุณต้องการลบ "<span className="font-bold text-slate-800">{deleteTarget?.name}</span>" ใช่ไหม?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 rounded-xl" onClick={() => setDeleteTarget(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white">
              ลบเลย
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
