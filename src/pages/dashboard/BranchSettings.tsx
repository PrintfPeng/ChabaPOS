import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Loader2, QrCode, Save, Plus, Lock, Printer, Bluetooth, BluetoothOff, CheckCircle2, WifiOff, Search
} from 'lucide-react';
import { useBranch } from '../../hooks/useBranches';
import { usePrinter } from '../../context/PrinterContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import { ImageUpload } from '../../components/ImageUpload';
import { uploadImageToSupabase } from '../../lib/supabase-storage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../lib/utils';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

import KitchenManagement from './KitchenManagement';
import MenuManagement from './MenuManagement';
import OptionManagement from './OptionManagement';

export default function BranchSettings() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const { branch, isLoading, updateBranch } = useBranch(Number(branchId));
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // New Fields State
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [bankType, setBankType] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [isSavingBasic, setIsSavingBasic] = useState(false);

  // Map search state
  const [mapSearch, setMapSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7563, 100.5018]);


  useEffect(() => {
    if (branch) {
      setQrCodeUrl(branch.qrCodeUrl || '');
      setPin(''); // Reset to empty instead of branch.pin so they don't see it
      setConfirmPin('');
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setLatitude(branch.latitude || null);
      setLongitude(branch.longitude || null);
      setBankType(branch.bankType || '');
      setBankAccountNo(branch.bankAccountNo || '');
      setBankAccountName(branch.bankAccountName || '');
      if (branch.latitude && branch.longitude) {
        setMapCenter([branch.latitude, branch.longitude]);
      }
    }
  }, [branch]);

  const handleSaveBasic = async () => {
    setIsSavingBasic(true);
    try {
      await updateBranch({ address: address || null, phone: phone || null, latitude, longitude });
      toast.success('บันทึกข้อมูลพื้นฐานสำเร็จ');
    } catch (e: any) {
      toast.error(e?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSavingBasic(false);
    }
  };

  const handleMapSearch = async () => {
    if (!mapSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(mapSearch)}`,
        { headers: { 'Accept-Language': 'th,en' } },
      );
      const data = await res.json();
      if (!data.length) return toast.error('ไม่พบสถานที่ที่ค้นหา กรุณาลองคำค้นอื่น');
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setLatitude(lat);
      setLongitude(lng);
      setMapCenter([lat, lng]);
    } catch {
      toast.error('ค้นหาสถานที่ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalQrCodeUrl = qrCodeUrl;
      
      if (selectedFile) {
        finalQrCodeUrl = await uploadImageToSupabase(selectedFile, 'qrcodes');
      }

      await updateBranch({
        qrCodeUrl: finalQrCodeUrl,
        address: address || null,
        phone: phone || null,
        latitude: latitude,
        longitude: longitude,
        bankType: bankType || null,
        bankAccountNo: bankAccountNo || null,
        bankAccountName: bankAccountName || null,
      });
      setQrCodeUrl(finalQrCodeUrl);
      setSelectedFile(null);
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (!pin || pin.length !== 6) {
      return toast.error('รหัส PIN ต้องเป็นตัวเลข 6 หลัก');
    }
    
    if (pin !== confirmPin) {
      return toast.error('รหัส PIN ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
    }
    
    setIsSavingPin(true);
    try {
      await updateBranch({
        pin: pin || null
      });
      toast.success('บันทึกรหัส PIN สำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกรหัส PIN ได้');
    } finally {
      setIsSavingPin(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าสาขา</h1>
          <p className="text-slate-500">จัดการข้อมูลและค่ากำหนดต่างๆ ของสาขา {branch?.name}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/brands')} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            สร้างแบรนด์
          </Button>
          <Button variant="outline" onClick={() => navigate(`/brands/${brandId}/branches`)} className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            สร้างสาขาเพิ่ม
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="general" className="font-bold text-sm py-2">ข้อมูลทั่วไป</TabsTrigger>
          <TabsTrigger value="kitchens" className="font-bold text-sm py-2">จัดการห้องครัว</TabsTrigger>
          <TabsTrigger value="menus" className="font-bold text-sm py-2">จัดการเมนู</TabsTrigger>
          <TabsTrigger value="options" className="font-bold text-sm py-2">จัดการตัวเลือกเสริม</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-0 animate-fade-in">
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
              <div className="space-y-2">
                <Label>ที่อยู่ร้าน (Address)</Label>
                <textarea
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="กรอกที่อยู่สาขา"
                />
              </div>
              <div className="space-y-2">
                <Label>เบอร์โทรศัพท์ร้าน</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="08X-XXX-XXXX" 
                />
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-base font-semibold">พิกัดร้านบนแผนที่ (Latitude / Longitude)</Label>
                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div className="space-y-1">
                     <Label className="text-xs text-slate-500">Latitude</Label>
                     <Input type="number" step="any" value={latitude ?? ''} onChange={e => setLatitude(parseFloat(e.target.value) || null)} placeholder="13.7563" />
                   </div>
                   <div className="space-y-1">
                     <Label className="text-xs text-slate-500">Longitude</Label>
                     <Input type="number" step="any" value={longitude ?? ''} onChange={e => setLongitude(parseFloat(e.target.value) || null)} placeholder="100.5018" />
                   </div>
                </div>

                {/* Map search bar */}
                <div className="flex gap-2 mb-2">
                  <Input
                    value={mapSearch}
                    onChange={e => setMapSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMapSearch()}
                    placeholder="ค้นหาสถานที่, จังหวัด..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMapSearch}
                    disabled={isSearching}
                    className="shrink-0 gap-2"
                  >
                    {isSearching
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Search className="w-4 h-4" />}
                    ค้นหา
                  </Button>
                </div>

                <div className="h-[300px] w-full rounded-xl overflow-hidden border z-0 relative">
                  <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={mapCenter} />
                    <MapClickHandler
                      setLat={l => setLatitude(l)}
                      setLng={l => setLongitude(l)}
                    />
                    {latitude && longitude && <Marker position={[latitude, longitude]} />}
                  </MapContainer>
                </div>
                <p className="text-xs text-slate-500">คลิกบนแผนที่เพื่อปักหมุด หรือพิมพ์ค้นหาสถานที่ด้านบน</p>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveBasic} disabled={isSavingBasic} className="gap-2 px-8">
                  {isSavingBasic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกข้อมูลพื้นฐาน
                </Button>
              </div>
            </CardContent>
          </Card>

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
                <ImageUpload
                  value={qrCodeUrl}
                  onChange={(url) => setQrCodeUrl(url)}
                  onFileSelect={(file) => setSelectedFile(file)}
                  label="รูปภาพ QR Code พร้อมเพย์"
                  square
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ธนาคาร / ประเภท</Label>
                  <Select value={bankType} onValueChange={setBankType}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกธนาคาร" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PromptPay">พร้อมเพย์ (PromptPay)</SelectItem>
                      <SelectItem value="KBANK">กสิกรไทย (KBANK)</SelectItem>
                      <SelectItem value="SCB">ไทยพาณิชย์ (SCB)</SelectItem>
                      <SelectItem value="BBL">กรุงเทพ (BBL)</SelectItem>
                      <SelectItem value="KTB">กรุงไทย (KTB)</SelectItem>
                      <SelectItem value="BAY">กรุงศรีอยุธยา (BAY)</SelectItem>
                      <SelectItem value="TTB">ทีทีบี (TTB)</SelectItem>
                      <SelectItem value="OTHER">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>เลขบัญชี / เบอร์พร้อมเพย์</Label>
                  <Input 
                    value={bankAccountNo} 
                    onChange={e => setBankAccountNo(e.target.value)} 
                    placeholder="เลขบัญชี 10-15 หลัก"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>ชื่อบัญชี</Label>
                  <Input 
                    value={bankAccountName} 
                    onChange={e => setBankAccountName(e.target.value)} 
                    placeholder="นาย ทดสอบ ระบบ"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 px-8">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกการตั้งค่า
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                ตั้งค่ารหัสความปลอดภัย (Security PIN)
              </CardTitle>
              <CardDescription>
                รหัส PIN 6 หลักใช้สำหรับยืนยันตัวตนก่อนทำรายการสำคัญ เช่น การลบข้อมูล
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div className="space-y-2">
                  <Label>รหัส PIN 6 หลักใหม่</Label>
                  <Input 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    className="text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ยืนยันรหัส PIN 6 หลัก</Label>
                  <Input 
                    type="password" 
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    className="text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button onClick={handleSavePin} disabled={isSavingPin} className="gap-2 px-8">
                  {isSavingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  บันทึกรหัส PIN
                </Button>
              </div>
            </CardContent>
          </Card>

          <PrinterCard />
        </TabsContent>

        <TabsContent value="kitchens" className="mt-0 animate-fade-in">
          <KitchenManagement />
        </TabsContent>

        <TabsContent value="menus" className="mt-0 animate-fade-in">
          <MenuManagement />
        </TabsContent>

        <TabsContent value="options" className="mt-0 animate-fade-in">
          <OptionManagement />
        </TabsContent>
      </Tabs>


    </div>
  );
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center[0], center[1]]);
  return null;
}

function MapClickHandler({ setLat, setLng }: { setLat: (l: number) => void, setLng: (l: number) => void }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    },
  });
  return null;
}

function PrinterCard() {
  const { status, deviceName, isSupported, connect, disconnect } = usePrinter();

  const isConnected = status === 'connected' || status === 'printing';
  const isBusy      = status === 'connecting' || status === 'printing';

  if (!isSupported) {
    return (
      <Card className="border-amber-100 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Printer className="w-5 h-5" />
            เครื่องพิมพ์ใบเสร็จ (Bluetooth)
          </CardTitle>
          <CardDescription className="text-amber-600">
            เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth — กรุณาใช้ Chrome หรือ Edge บน Windows
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={isConnected ? 'border-blue-100' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-primary" />
          เครื่องพิมพ์ใบเสร็จ (Bluetooth)
        </CardTitle>
        <CardDescription>
          เชื่อมต่อ POS Printer รุ่น Y58BT หรือ Thermal Printer 58mm ที่รองรับ BLE
          เพื่อพิมพ์ใบเสร็จอัตโนมัติเมื่อชำระเงินสำเร็จ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isConnected
            ? 'bg-blue-50 border-blue-100'
            : 'bg-slate-50 border-slate-100'
        }`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            isConnected ? 'bg-blue-500' : 'bg-slate-200'
          }`}>
            {isBusy
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : isConnected
              ? <Bluetooth className="w-4 h-4 text-white" />
              : <BluetoothOff className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${isConnected ? 'text-blue-800' : 'text-slate-500'}`}>
              {isBusy
                ? (status === 'connecting' ? 'กำลังเชื่อมต่อ...' : 'กำลังพิมพ์...')
                : isConnected
                ? deviceName ?? 'Bluetooth Printer'
                : 'ยังไม่ได้เชื่อมต่อ'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isConnected
                ? 'พร้อมพิมพ์ใบเสร็จอัตโนมัติ'
                : 'กดปุ่มด้านล่างเพื่อจับคู่กับ printer'}
            </p>
          </div>
          {isConnected && (
            <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
          )}
        </div>

        {/* Action button */}
        <div className="flex justify-end gap-3 mt-4">
          {isConnected ? (
            <Button
              variant="outline"
              onClick={disconnect}
              disabled={isBusy}
              className="gap-2 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <WifiOff className="w-4 h-4" />
              ตัดการเชื่อมต่อ
            </Button>
          ) : (
            <Button
              onClick={connect}
              disabled={isBusy}
              className="gap-2"
            >
              {isBusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Bluetooth className="w-4 h-4" />}
              เชื่อมต่อ Printer
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          ต้องใช้ <strong>Chrome</strong> หรือ <strong>Edge</strong> · รองรับ Y58BT และ Thermal Printer 58mm ที่ใช้ BLE ·
          การเชื่อมต่อจะรีเซ็ตเมื่อ refresh หน้า
        </p>
      </CardContent>
    </Card>
  );
}
