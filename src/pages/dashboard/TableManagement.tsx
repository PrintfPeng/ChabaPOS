import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTables } from '../../hooks/useTables';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, LayoutGrid, Map, Loader2, QrCode, Edit2, Printer, Utensils } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import api from '../../lib/api';
import PrintableQRCode from '../../components/PrintableQRCode';
import { PinVerificationDialog } from '../../components/PinVerificationDialog';
import { useNavigate } from 'react-router-dom';

export default function TableManagement() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const bid = Number(branchId);
  const { zones, isLoading, createZone, updateZone, deleteZone, createTable, updateTable, deleteTable, getQRCode } = useTables(bid);
  
  const [newZoneName, setNewZoneName] = useState('');
  const [newTable, setNewTable] = useState({ name: '', zoneId: '' });
  
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [editingTable, setEditingTable] = useState<any | null>(null);

  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [selectedTableForQr, setSelectedTableForQr] = useState<any>(null);
  const [printAllData, setPrintAllData] = useState<{table: any, qrCodeUrl: string}[] | null>(null);

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await api.get(`/branches/${bid}`);
        setBranchName(res.data.name);
      } catch (error) {
        console.error('Failed to fetch branch', error);
      }
    };
    if (bid) fetchBranch();
  }, [bid]);

  const handleCreateZone = async () => {
    if (!bid || !newZoneName) return;

    if (Array.isArray(zones) && zones.some(z => z.name.toLowerCase() === newZoneName.toLowerCase())) {
      return toast.error('ชื่อโซนนี้มีอยู่ในระบบแล้ว');
    }

    try {
      await createZone({
        branchId: bid,
        name: newZoneName,
      });
      setNewZoneName('');
      setIsZoneDialogOpen(false);
      toast.success('สร้างโซนสำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'สร้างโซนไม่สำเร็จ');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'อัปเดตโซนไม่สำเร็จ');
    }
  };

  const handleCreateTable = async () => {
    if (!bid || !newTable.name || !newTable.zoneId) return;

    const allTables = Array.isArray(zones) ? zones.flatMap(z => z.tables || []) : [];
    if (allTables.some(t => t.name.toLowerCase() === newTable.name.toLowerCase())) {
      return toast.error('ชื่อโต๊ะนี้มีอยู่ในระบบแล้ว');
    }

    try {
      await createTable({
        zoneId: Number(newTable.zoneId),
        name: newTable.name,
      });
      setNewTable({ name: '', zoneId: '' });
      setIsTableDialogOpen(false);
      toast.success('สร้างโต๊ะสำเร็จ');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'สร้างโต๊ะไม่สำเร็จ');
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'อัปเดตโต๊ะไม่สำเร็จ');
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

  const confirmDelete = (action: () => void) => {
    setPendingDeleteAction(() => action);
    setIsPinDialogOpen(true);
  };

  const handleDeleteTable = async (id: number) => {
    confirmDelete(async () => {
      try {
        await deleteTable(id);
        toast.success('ลบโต๊ะแล้ว');
      } catch (error) {
        toast.error('ลบโต๊ะไม่สำเร็จ');
      }
    });
  };

  const handleDeleteZone = async (id: number) => {
    confirmDelete(async () => {
      try {
        await deleteZone(id);
        toast.success('ลบโซนแล้ว');
      } catch (error) {
        toast.error('ลบโซนไม่สำเร็จ');
      }
    });
  };

  const handlePrintQRCode = async (e: React.MouseEvent, table: any) => {
    e.stopPropagation();
    const toastId = toast.loading('กำลังเตรียมพิมพ์ QR Code...');
    try {
      const url = await getQRCode(table.id);
      setQrCodeUrl(url);
      setSelectedTableForQr(table);
      
      // Delay briefly to allow React to render the PrintableQRCode in the hidden div
      setTimeout(() => {
        toast.dismiss(toastId);
        window.print();
      }, 300);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('ไม่สามารถสร้าง QR Code ได้');
    }
  };

  const handlePrintAllQRCodes = async () => {
    if (!Array.isArray(zones) || zones.length === 0) return toast.error('ไม่มีข้อมูลให้พิมพ์');
    const allTables = zones.flatMap(z => z.tables || []);
    if (allTables.length === 0) return toast.error('ไม่มีโต๊ะให้พิมพ์');

    const toastId = toast.loading('กำลังเตรียมพิมพ์ QR Code ทั้งหมด...');
    try {
      // Set the first table for the single print component to be null so it doesn't print
      setSelectedTableForQr(null);
      
      const qrData = await Promise.all(allTables.map(async (table) => {
        const url = await getQRCode(table.id);
        return { table, qrCodeUrl: url };
      }));
      setPrintAllData(qrData);
      
      // Delay to allow React to render the printable area
      setTimeout(() => {
        toast.dismiss(toastId);
        window.print();
      }, 500);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('ไม่สามารถเตรียมข้อมูลสำหรับพิมพ์ได้');
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
                  <Select 
                    value={newTable.zoneId ? String(newTable.zoneId) : undefined} 
                    onValueChange={(val) => setNewTable({...newTable, zoneId: String(val)})}
                    items={Array.isArray(zones) ? zones.map(z => ({ value: String(z.id), label: z.name })) : []}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกโซน" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(zones) && zones.map(zone => (
                        <SelectItem key={zone.id} value={String(zone.id)}>
                          {zone.name}
                        </SelectItem>
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

          <Button variant="secondary" onClick={handlePrintAllQRCodes} className="hidden sm:flex border border-slate-200">
            <Printer className="w-4 h-4 mr-2" />
            พิมพ์ QR Code ทั้งหมด
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Array.isArray(zones) && zones.map((zone) => (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
              {Array.isArray(zone.tables) && zone.tables.map(table => (
                <Card 
                  key={table.id} 
                  className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:border-primary/50 bg-white group relative overflow-hidden flex flex-col h-full border-2 border-slate-100 rounded-[20px] sm:rounded-[24px]"
                  onClick={() => navigate(`/brands/${brandId}/branches/${branchId}/order/${table.id}`)}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-primary transition-colors leading-tight">{table.name}</h3>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider group-hover:text-primary/70">กดเพื่อสั่งอาหาร</p>
                    </div>
                    
                    <div className="flex border-t border-slate-100 bg-slate-50 mt-auto">
                       <button 
                         className="flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                         onClick={(e) => { e.stopPropagation(); openEditTable(table); }}
                       >
                         <Edit2 className="w-3.5 h-3.5 mb-0.5" />
                         <span className="text-[8px] sm:text-[9px] font-bold">แก้ไข</span>
                       </button>
                       <div className="w-[1px] bg-slate-200"></div>
                       <button 
                         className="flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 text-primary/70 hover:bg-primary/10 hover:text-primary transition-colors"
                         onClick={(e) => handlePrintQRCode(e, table)}
                       >
                         <Printer className="w-3.5 h-3.5 mb-0.5" />
                         <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">พิมพ์ QR</span>
                       </button>
                       <div className="w-[1px] bg-slate-200"></div>
                       <button 
                         className="flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                         onClick={(e) => { e.stopPropagation(); handleDeleteTable(table.id); }}
                       >
                         <Trash2 className="w-3.5 h-3.5 mb-0.5" />
                         <span className="text-[8px] sm:text-[9px] font-bold">ลบ</span>
                       </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!Array.isArray(zone.tables) || zone.tables.length === 0) && (
                <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <LayoutGrid className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm sm:text-base font-bold text-slate-500">ยังไม่มีโต๊ะในโซนนี้</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {(!Array.isArray(zones) || zones.length === 0) && (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <Map className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">ยังไม่มีโซน</h3>
            <p className="text-slate-500">สร้างโซนเพื่อเริ่มต้นวางโต๊ะ</p>
          </div>
        )}
      </div>

      {/* Hidden printable area always present, just waits for data */}
      {qrCodeUrl && selectedTableForQr && (
        <div className="hidden print:block">
          <PrintableQRCode 
            qrCodeUrl={qrCodeUrl} 
            tableName={selectedTableForQr.name} 
            branchName={branchName} 
          />
        </div>
      )}

      {printAllData && !selectedTableForQr && (
        <div className="hidden print:block">
          {printAllData.map((data, idx) => (
            <div key={idx} className="break-after-page">
              <PrintableQRCode 
                qrCodeUrl={data.qrCodeUrl} 
                tableName={data.table.name} 
                branchName={branchName} 
              />
            </div>
          ))}
        </div>
      )}

      <PinVerificationDialog
        isOpen={isPinDialogOpen}
        onClose={() => {
          setIsPinDialogOpen(false);
          setPendingDeleteAction(null);
        }}
        onSuccess={() => {
          setIsPinDialogOpen(false);
          if (pendingDeleteAction) pendingDeleteAction();
          setPendingDeleteAction(null);
        }}
        title="ยืนยันการลบข้อมูล"
        description="กรุณากรอกรหัส PIN 6 หลักของสาขานี้ เพื่อยืนยันการลบข้อมูล"
      />
    </div>
  );
}
