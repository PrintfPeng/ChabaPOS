import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTables } from '../../hooks/useTables';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, LayoutGrid, Map, Loader2, QrCode, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';

export default function TableManagement() {
  const { branchId } = useParams<{ branchId: string }>();
  const bid = Number(branchId);
  const { zones, isLoading, createZone, updateZone, deleteZone, createTable, updateTable, deleteTable, getQRCode } = useTables(bid);
  
  const [newZoneName, setNewZoneName] = useState('');
  const [newTable, setNewTable] = useState({ name: '', zoneId: '' });
  
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [editingTable, setEditingTable] = useState<any | null>(null);

  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const handleCreateZone = async () => {
    if (!bid || !newZoneName) return;
    try {
      await createZone({
        branchId: bid,
        name: newZoneName,
      });
      setNewZoneName('');
      setIsZoneDialogOpen(false);
      toast.success('สร้างโซนสำเร็จ');
    } catch (error) {
      toast.error('สร้างโซนไม่สำเร็จ');
    }
  };

  const handleUpdateZone = async () => {
    if (!editingZone || !newZoneName) return;
    try {
      await updateZone({
        id: editingZone.id,
        name: newZoneName,
      });
      setEditingZone(null);
      setNewZoneName('');
      setIsZoneDialogOpen(false);
      toast.success('อัปเดตโซนสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตโซนไม่สำเร็จ');
    }
  };

  const handleCreateTable = async () => {
    if (!bid || !newTable.name || !newTable.zoneId) return;
    try {
      await createTable({
        zoneId: Number(newTable.zoneId),
        name: newTable.name,
      });
      setNewTable({ name: '', zoneId: '' });
      setIsTableDialogOpen(false);
      toast.success('สร้างโต๊ะสำเร็จ');
    } catch (error) {
      toast.error('สร้างโต๊ะไม่สำเร็จ');
    }
  };

  const handleUpdateTable = async () => {
    if (!editingTable || !newTable.name || !newTable.zoneId) return;
    try {
      await updateTable({
        id: editingTable.id,
        name: newTable.name,
        zoneId: Number(newTable.zoneId),
      });
      setEditingTable(null);
      setNewTable({ name: '', zoneId: '' });
      setIsTableDialogOpen(false);
      toast.success('อัปเดตโต๊ะสำเร็จ');
    } catch (error) {
      toast.error('อัปเดตโต๊ะไม่สำเร็จ');
    }
  };

  const openEditZone = (zone: any) => {
    setEditingZone(zone);
    setNewZoneName(zone.name);
    setIsZoneDialogOpen(true);
  };

  const openEditTable = (table: any) => {
    setEditingTable(table);
    setNewTable({
      name: table.name,
      zoneId: table.zoneId.toString(),
    });
    setIsTableDialogOpen(true);
  };

  const handleDeleteTable = async (id: number) => {
    try {
      await deleteTable(id);
      toast.success('ลบโต๊ะแล้ว');
    } catch (error) {
      toast.error('ลบโต๊ะไม่สำเร็จ');
    }
  };

  const handleDeleteZone = async (id: number) => {
    try {
      await deleteZone(id);
      toast.success('ลบโซนแล้ว');
    } catch (error) {
      toast.error('ลบโซนไม่สำเร็จ');
    }
  };

  const handleShowQRCode = async (tableId: number) => {
    try {
      const url = await getQRCode(tableId);
      setQrCodeUrl(url);
      setIsQrDialogOpen(true);
    } catch (error) {
      toast.error('ไม่สามารถสร้าง QR Code ได้');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการโต๊ะ</h1>
          <p className="text-slate-500">จัดการโซนที่นั่งและผังโต๊ะของคุณ</p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isZoneDialogOpen} onOpenChange={(open) => {
            setIsZoneDialogOpen(open);
            if (!open) {
              setEditingZone(null);
              setNewZoneName('');
            }
          }}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Plus className="w-4 h-4 mr-2" />
              โซนใหม่
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingZone ? 'แก้ไขโซน' : 'เพิ่มโซน'}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Label>ชื่อโซน</Label>
                <Input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="เช่น ในร้าน, ระเบียง" />
              </div>
              <DialogFooter>
                <Button onClick={editingZone ? handleUpdateZone : handleCreateZone}>
                  {editingZone ? 'บันทึก' : 'สร้างโซน'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTableDialogOpen} onOpenChange={(open) => {
            setIsTableDialogOpen(open);
            if (!open) {
              setEditingTable(null);
              setNewTable({ name: '', zoneId: '' });
            }
          }}>
            <DialogTrigger render={<Button />}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มโต๊ะ
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTable ? 'แก้ไขโต๊ะ' : 'เพิ่มโต๊ะ'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>ชื่อโต๊ะ/หมายเลข</Label>
                  <Input value={newTable.name} onChange={(e) => setNewTable({...newTable, name: e.target.value})} placeholder="เช่น T1, VIP-1" />
                </div>
                <div>
                  <Label>โซน</Label>
                  <Select value={newTable.zoneId} onValueChange={(val) => setNewTable({...newTable, zoneId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกโซน" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map(zone => (
                        <SelectItem key={zone.id} value={zone.id.toString()}>{zone.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={editingTable ? handleUpdateTable : handleCreateTable}>
                  {editingTable ? 'บันทึก' : 'สร้างโต๊ะ'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-8">
        {zones.map((zone) => (
          <div key={zone.id} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <Map className="w-5 h-5" />
              {zone.name}
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditZone(zone)}>
                  <Edit2 className="w-3 h-3 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteZone(zone.id)}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {zone.tables?.map(table => (
                <Card 
                  key={table.id} 
                  className="cursor-pointer transition-all hover:scale-105 bg-white group relative"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-slate-100 text-slate-600">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-900">{table.name}</p>
                    
                    <div className="mt-4 flex justify-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleShowQRCode(table.id)}>
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTable(table)}>
                        <Edit2 className="w-4 h-4 text-slate-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTable(table.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {zone.tables?.length === 0 && (
                <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400">ยังไม่มีโต๊ะในโซนนี้</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {zones.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีโซน</h3>
            <p className="text-slate-500">สร้างโซนเพื่อเริ่มต้นวางโต๊ะ</p>
          </div>
        )}
      </div>

      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code สำหรับสั่งอาหาร</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            {qrCodeUrl && (
              <>
                <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 border-8 border-white shadow-lg rounded-xl" />
                <p className="mt-4 text-slate-500 text-sm">สแกนเพื่อสั่งอาหารจากโต๊ะนี้</p>
                <Button className="mt-6" onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeUrl;
                  link.download = 'qrcode.png';
                  link.click();
                }}>
                  ดาวน์โหลด QR Code
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
