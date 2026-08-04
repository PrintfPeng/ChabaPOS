import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { usePrinter } from '../../context/PrinterContext';
import { useShift } from '../../contexts/ShiftContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import {
  Loader2, ShoppingCart, Plus, Minus, X, Search, UtensilsCrossed,
  Banknote, QrCode, Calculator, CheckCircle2, Trash2, ChevronRight,
  Phone, UserPlus, Star, Tag, Sparkles, AlertTriangle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/sheet';
import { cn } from '../../lib/utils';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  optionGroups: {
    id: number;
    name: string;
    isMultiple: boolean;
    options: { id: number; name: string; price: number }[];
  }[];
}
interface Category { id: number; name: string; items: MenuItem[] }
interface Table    { id: number; name: string; zoneId: number; zone: { name: string } }
interface CustomerInfo { id: number; name: string; phone: string; points: number }
interface PromoInfo {
  id: number; name: string;
  type: 'PERCENT' | 'FIXED' | 'POINTS_REDEMPTION';
  value: number; minSpend: number; pointsNeeded: number; memberOnly: boolean;
}

// ─────────────────────────────────────────────
// MemberPromoSection — used inside CartSummaryContent
// ─────────────────────────────────────────────
interface MemberPromoProps {
  branchId: string;
  totalAmount: number;
  member: CustomerInfo | null;
  memberPhone: string;
  setMemberPhone: (v: string) => void;
  isSearchingMember: boolean;
  memberNotFound: boolean;
  showQuickReg: boolean;
  setShowQuickReg: (v: boolean) => void;
  quickRegName: string;
  setQuickRegName: (v: string) => void;
  isRegistering: boolean;
  promos: PromoInfo[];
  selectedPromo: PromoInfo | null;
  discountAmount: number;
  isValidatingPromo: boolean;
  isPromoDialogOpen: boolean;
  setIsPromoDialogOpen: (v: boolean) => void;
  onSearchMember: () => void;
  onRegister: () => void;
  onApplyPromo: (promo: PromoInfo) => void;
  onRemoveMember: () => void;
}

function MemberPromoSection({
  branchId, totalAmount,
  member, memberPhone, setMemberPhone, isSearchingMember, memberNotFound,
  showQuickReg, setShowQuickReg, quickRegName, setQuickRegName, isRegistering,
  promos, selectedPromo, discountAmount, isValidatingPromo, isPromoDialogOpen, setIsPromoDialogOpen,
  onSearchMember, onRegister, onApplyPromo, onRemoveMember,
}: MemberPromoProps) {

  const [isExpanded, setIsExpanded] = useState(!!member);

  const visiblePromos = promos.filter(
    p => totalAmount >= p.minSpend && (!p.memberOnly || member),
  );

  const promoLabel = (p: PromoInfo) => {
    if (p.type === 'PERCENT') return `ลด ${p.value}%`;
    if (p.type === 'FIXED')   return `ลด ฿${p.value.toLocaleString()}`;
    return `ใช้ ${p.pointsNeeded} แต้ม → ลด ฿${p.value.toLocaleString()}`;
  };

  return (
    <div className="mx-4 mb-3 border border-slate-100 rounded-2xl overflow-hidden bg-white">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Star className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">สมาชิก & โปรโมชั่น</p>
            {member ? (
              <p className="text-xs text-emerald-600 font-semibold leading-tight">
                {member.name} · {member.points} แต้ม
                {discountAmount > 0 && ` · ลด ฿${discountAmount.toLocaleString()}`}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">ค้นหาสมาชิกเพื่อสะสมแต้ม / ใช้โปร</p>
            )}
          </div>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-slate-300 transition-transform', isExpanded && 'rotate-90')} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-50">

          {/* ── Phone search (only if no member) ── */}
          {!member && (
            <div className="flex gap-2 pt-3">
              <div className="relative flex-1">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="เบอร์โทรสมาชิก"
                  value={memberPhone}
                  onChange={e => setMemberPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && onSearchMember()}
                  className="pl-8 h-9 rounded-xl text-sm"
                  maxLength={10}
                />
              </div>
              <Button
                size="sm"
                onClick={onSearchMember}
                disabled={isSearchingMember || memberPhone.length < 9}
                className="h-9 rounded-xl font-bold shrink-0 px-4"
              >
                {isSearchingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ค้นหา'}
              </Button>
            </div>
          )}

          {/* ── Customer card ── */}
          {member && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 mt-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                {member.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-emerald-800 text-sm truncate">{member.name}</p>
                <p className="text-xs text-emerald-600">{member.phone}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-amber-500 leading-none">{member.points}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">แต้ม</p>
              </div>
              <button
                onClick={onRemoveMember}
                className="text-slate-300 hover:text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Not found + quick register ── */}
          {memberNotFound && !member && (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500 font-semibold text-center">
                ไม่พบสมาชิกหมายเลข {memberPhone}
              </p>
              {!showQuickReg ? (
                <button
                  onClick={() => setShowQuickReg(true)}
                  className="mt-2 text-xs text-primary font-bold flex items-center gap-1.5 mx-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  สมัครสมาชิกด่วน (รับแต้มทันที)
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="ชื่อ-นามสกุลลูกค้า"
                    value={quickRegName}
                    onChange={e => setQuickRegName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onRegister()}
                    className="h-9 rounded-xl text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={onRegister}
                    disabled={isRegistering}
                    className="w-full h-9 rounded-xl font-bold text-sm"
                  >
                    {isRegistering
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                    ยืนยันสมัครสมาชิก
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Promo section ── */}
          {visiblePromos.length > 0 && (
            <div>
              {selectedPromo ? (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/15">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{selectedPromo.name}</p>
                    <p className="text-xs text-slate-400">{promoLabel(selectedPromo)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-primary">-฿{discountAmount.toLocaleString()}</span>
                    <button
                      onClick={() => onApplyPromo(selectedPromo)}
                      className="text-slate-300 hover:text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPromoDialogOpen(true)}
                  disabled={isValidatingPromo}
                  className="w-full h-9 rounded-xl font-bold border-dashed border-slate-200 text-slate-500 hover:border-primary hover:text-primary gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  เลือกโปรโมชั่น ({visiblePromos.length} รายการ)
                </Button>
              )}
            </div>
          )}

          {/* ── Discount summary row ── */}
          {discountAmount > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-primary">ส่วนลดที่ได้รับ</span>
              <span className="text-sm font-black text-primary">- ฿{discountAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Promo Selection Dialog ── */}
      <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm p-0 overflow-hidden border-none">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 font-black">
              <Sparkles className="w-4 h-4 text-primary" />
              เลือกโปรโมชั่น
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              แสดงโปรที่ใช้ได้กับยอดปัจจุบัน ฿{totalAmount.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-2">
              {visiblePromos.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">ไม่มีโปรโมชั่นที่ใช้ได้ตอนนี้</p>
              ) : visiblePromos.map(p => {
                const isSelected = selectedPromo?.id === p.id;
                const needsPoints = p.type === 'POINTS_REDEMPTION';
                const hasEnough = !needsPoints || (member?.points ?? 0) >= p.pointsNeeded;
                return (
                  <button
                    key={p.id}
                    disabled={isValidatingPromo || !hasEnough}
                    onClick={() => { onApplyPromo(p); setIsPromoDialogOpen(false); }}
                    className={cn(
                      'w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : hasEnough
                        ? 'border-slate-100 bg-white hover:border-slate-200'
                        : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-bold truncate', isSelected ? 'text-primary' : 'text-slate-800')}>
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {promoLabel(p)}
                        {p.minSpend > 0 && ` · ขั้นต่ำ ฿${p.minSpend.toLocaleString()}`}
                        {p.memberOnly && <span className="text-primary/70 ml-1">(เฉพาะสมาชิก)</span>}
                        {needsPoints && !hasEnough && <span className="text-red-400 ml-1">(แต้มไม่พอ)</span>}
                      </p>
                    </div>
                    {isSelected
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-2" />
                      : <Tag className="w-4 h-4 text-slate-300 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="px-4 pb-4 pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              className="w-full rounded-xl font-bold text-slate-400"
              onClick={() => setIsPromoDialogOpen(false)}
            >
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function CounterService() {
  const { brandId, branchId } = useParams<{ brandId: string; branchId: string }>();
  const navigate = useNavigate();
  const { status: printerStatus, printReceipt } = usePrinter();
  const { currentShift } = useShift();
  const isShiftOpen = currentShift?.status === 'OPEN';

  // ── Menu & table data ──
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [tables,      setTables]      = useState<Table[]>([]);
  const [branchData,  setBranchData]  = useState<any>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab,   setActiveTab]   = useState<string>('');

  // ── Cart ──
  const [cart,            setCart]            = useState<any[]>([]);
  const [selectedItem,    setSelectedItem]    = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [quantity,        setQuantity]        = useState(1);
  const [itemNotes,       setItemNotes]       = useState('');
  const [isSubmitting,    setIsSubmitting]    = useState(false);

  // ── Payment ──
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMode,         setPaymentMode]         = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receivedAmount,      setReceivedAmount]      = useState<string>('');
  const [selectedTableId,     setSelectedTableId]     = useState<number | null>(null);

  // ── Member & Promo ──
  const [member,           setMember]           = useState<CustomerInfo | null>(null);
  const [memberPhone,      setMemberPhone]      = useState('');
  const [isSearching,      setIsSearching]      = useState(false);
  const [memberNotFound,   setMemberNotFound]   = useState(false);
  const [showQuickReg,     setShowQuickReg]     = useState(false);
  const [quickRegName,     setQuickRegName]     = useState('');
  const [isRegistering,    setIsRegistering]    = useState(false);
  const [promos,           setPromos]           = useState<PromoInfo[]>([]);
  const [selectedPromo,    setSelectedPromo]    = useState<PromoInfo | null>(null);
  const [discountAmount,   setDiscountAmount]   = useState(0);
  const [isValidating,     setIsValidating]     = useState(false);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);

  // ── Derived ──
  const totalAmount = cart.reduce((sum, item) => {
    return sum + (item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity;
  }, 0);
  const finalTotal    = Math.max(0, totalAmount - discountAmount);
  const changeAmount  = paymentMode === 'CASH' && receivedAmount
    ? Math.max(0, parseFloat(receivedAmount) - finalTotal)
    : 0;

  // ── Load menu + tables + promos ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, tablesRes] = await Promise.all([
          api.get(`/branches/${branchId}/menu`),
          api.get(`/branches/${branchId}/tables`),
        ]);
        setCategories(menuRes.data.categories);
        setBranchData(menuRes.data);
        setTables(tablesRes.data);
        if (menuRes.data.categories.length > 0) {
          setActiveTab(menuRes.data.categories[0].id.toString());
        }
      } catch {
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [branchId]);

  useEffect(() => {
    api.get(`/promotions?branchId=${branchId}&activeOnly=true`)
      .then(r => setPromos(r.data))
      .catch(() => {});
  }, [branchId]);

  // ── Auto-clear member-only promo when member is removed ──
  const clearMemberAndPromo = () => {
    setMember(null);
    setMemberPhone('');
    setMemberNotFound(false);
    setShowQuickReg(false);
    setQuickRegName('');
    setSelectedPromo(null);
    setDiscountAmount(0);
  };

  // ── Member search ──
  const searchMember = async () => {
    if (memberPhone.length < 9) return toast.error('กรอกเบอร์โทร 9-10 หลัก');
    setIsSearching(true); setMemberNotFound(false); setMember(null);
    setSelectedPromo(null); setDiscountAmount(0);
    try {
      const res = await api.get(`/customers/lookup?phone=${memberPhone}&branchId=${branchId}`);
      if (res.data) {
        setMember(res.data);
        toast.success(`พบสมาชิก "${res.data.name}" — ${res.data.points} แต้ม`);
      } else {
        setMemberNotFound(true);
      }
    } catch {
      setMemberNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Quick register ──
  const handleRegister = async () => {
    if (!quickRegName.trim()) return toast.error('กรุณากรอกชื่อ');
    setIsRegistering(true);
    try {
      const res = await api.post('/customers', {
        phone: memberPhone, name: quickRegName.trim(), branchId: Number(branchId),
      });
      setMember(res.data); setMemberNotFound(false);
      setShowQuickReg(false); setQuickRegName('');
      toast.success(`สมัครสมาชิก "${res.data.name}" สำเร็จ 🎉`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setIsRegistering(false);
    }
  };

  // ── Apply / toggle promo ──
  const handleApplyPromo = async (promo: PromoInfo) => {
    if (selectedPromo?.id === promo.id) {
      setSelectedPromo(null); setDiscountAmount(0); return;
    }
    setIsValidating(true);
    try {
      const res = await api.post('/promotions/validate', {
        promotionId: promo.id,
        branchId:    Number(branchId),
        totalAmount,
        customerId:  member?.id,
      });
      setSelectedPromo(promo);
      setDiscountAmount(res.data.discountAmount);
      toast.success(`ใช้ "${promo.name}" — ลด ฿${res.data.discountAmount.toLocaleString()}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'ไม่สามารถใช้โปรโมชั่นนี้ได้');
    } finally {
      setIsValidating(false);
    }
  };

  // ── Cart helpers ──
  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item); setSelectedOptions([]); setQuantity(1); setItemNotes('');
  };

  const toggleOption = (group: any, option: any) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      if (group.isMultiple) {
        return exists ? prev.filter(o => o.id !== option.id) : [...prev, option];
      }
      const ids = group.options.map((o: any) => o.id);
      return [...prev.filter(o => !ids.includes(o.id)), option];
    });
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    const cartItemId = `${selectedItem.id}-${selectedOptions.map(o => o.id).sort().join(',')}`;
    setCart(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, {
        cartItemId,
        menuItemId: selectedItem.id,
        name:       selectedItem.name,
        price:      selectedItem.price,
        quantity,
        notes:      itemNotes || undefined,
        options:    selectedOptions.map(o => ({ optionId: o.id, name: o.name, price: o.price })),
      }];
    });
    setSelectedItem(null);
    toast.success('เพิ่มลงรายการสำเร็จ');
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(i =>
      i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i,
    ));
  };

  const removeFromCart = (cartItemId: string) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
  const clearCart = () => { setCart([]); clearMemberAndPromo(); };

  // ── Checkout ──
  const handleCheckout = () => {
    if (!isShiftOpen) return toast.error('กรุณาเปิดกะก่อนรับออเดอร์');
    if (cart.length === 0) return toast.error('กรุณาเลือกรายการอาหารก่อน');
    setReceivedAmount('');
    setIsPaymentDialogOpen(true);
  };

  const handleQuickCash = (amount: number) => {
    setReceivedAmount((parseFloat(receivedAmount || '0') + amount).toString());
  };

  const handleSubmitOrder = async () => {
    if (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < finalTotal)) {
      return toast.error('จำนวนเงินรับมาไม่เพียงพอ');
    }
    setIsSubmitting(true);
    try {
      const orderRes = await api.post('/orders', {
        branchId:    Number(branchId),
        tableId:     selectedTableId,
        isPrepaid:   true,
        paymentType: paymentMode === 'CASH' ? 'CASH' : 'TRANSFER',
        source:      'STAFF',
        ...(member         ? { customerId:     member.id }           : {}),
        ...(selectedPromo  ? { promotionId:    selectedPromo.id }    : {}),
        ...(discountAmount ? { discountAmount: discountAmount }       : {}),
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity:   item.quantity,
          notes:      item.notes,
          options:    item.options.map((o: any) => ({ optionId: o.optionId })),
        })),
      });

      toast.success(
        member
          ? `ชำระเงินสำเร็จ — สะสมแต้มให้ ${member.name} เรียบร้อย`
          : 'ทำรายการชำระเงินและส่งออเดอร์สำเร็จ',
        { icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
      );

      // ── Auto-print receipt if Bluetooth printer is connected ──
      if (printerStatus === 'connected') {
        const table = selectedTableId ? tables.find(t => t.id === selectedTableId) : null;
        const now   = new Date().toLocaleString('th-TH', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        });
        await printReceipt({
          branchName:     branchData?.name ?? 'ChabaPOS',
          orderNumber:    orderRes.data.orderNumber ?? '-',
          tableName:      table?.name,
          dateTime:       now,
          paymentType:    paymentMode,
          items:          cart.map(item => ({
            name:      item.name,
            qty:       item.quantity,
            unitPrice: item.price + item.options.reduce((s: number, o: any) => s + o.price, 0),
            options:   item.options.map((o: any) => ({ name: o.name, price: o.price })),
            notes:     item.notes,
          })),
          subtotal:       totalAmount,
          discountAmount: discountAmount || undefined,
          promoName:      selectedPromo?.name,
          finalTotal,
          receivedAmount: paymentMode === 'CASH' && receivedAmount ? parseFloat(receivedAmount) : undefined,
          changeAmount:   paymentMode === 'CASH' ? changeAmount : undefined,
          memberName:     member?.name,
          source:         'STAFF',
        });
      }

      clearCart();
      setIsPaymentDialogOpen(false);
      setSelectedTableId(null);
      setReceivedAmount('');
      setTimeout(() => navigate(`/brands/${brandId}/branches/${branchId}`), 1500);
    } catch {
      toast.error('ทำรายการไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = (catId: number) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return [];
    return cat.items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // ── shared member-promo props for CartSummaryContent ──
  const memberPromoProps: MemberPromoProps = {
    branchId: branchId!,
    totalAmount,
    member,
    memberPhone, setMemberPhone,
    isSearchingMember: isSearching,
    memberNotFound,
    showQuickReg, setShowQuickReg,
    quickRegName, setQuickRegName,
    isRegistering,
    promos, selectedPromo, discountAmount,
    isValidatingPromo: isValidating,
    isPromoDialogOpen, setIsPromoDialogOpen,
    onSearchMember: searchMember,
    onRegister:    handleRegister,
    onApplyPromo:  handleApplyPromo,
    onRemoveMember: clearMemberAndPromo,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-full gap-4 sm:gap-6 overflow-hidden">

      {/* ── Left: Menu Grid ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-6 overflow-hidden">
        <div className="flex flex-col gap-3 sm:gap-4 shrink-0">

          {/* แบนเนอร์เตือนเมื่อร้านยังไม่เปิด */}
          {!isShiftOpen && (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>ร้านยังไม่เปิด — กรุณา <strong>เปิดกะ</strong> จากแถบด้านซ้ายก่อนรับออเดอร์</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2 truncate">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              <span className="truncate">Counter Service - {branchData?.name}</span>
            </h1>
            <div className="relative w-full sm:w-64 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="ค้นหาเมนู..."
                className="pl-9 h-10 sm:h-12 rounded-xl bg-white border-slate-200 shadow-sm text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100 p-1 w-full justify-start overflow-x-auto no-scrollbar h-10 sm:h-12">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id.toString()} className="px-4 sm:px-6 font-bold text-xs sm:text-sm">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <ScrollArea className="flex-1 rounded-2xl bg-slate-50/50 border border-slate-100">
          <div className="p-2 sm:p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredItems(Number(activeTab)).map(item => (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden transition-all group border-white shadow-sm flex flex-col",
                  isShiftOpen
                    ? "cursor-pointer hover:border-primary hover:shadow-md active:scale-95"
                    : "opacity-50 cursor-not-allowed",
                )}
                onClick={() => isShiftOpen && handleSelectItem(item)}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  <div className="relative aspect-[4/3] sm:aspect-video overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                        <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
                      <Badge className="bg-white/95 text-primary border-none font-black shadow-sm text-[10px] sm:text-xs">
                        ฿{item.price.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-xs sm:text-sm line-clamp-2 leading-tight">
                      {item.name}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: Cart Sidebar (desktop) ── */}
      <div className="hidden lg:flex w-[320px] xl:w-[380px] 2xl:w-[420px] bg-white rounded-3xl border border-slate-100 flex-col shadow-xl shadow-slate-200/50 overflow-hidden shrink-0">
        <CartSummaryContent
          cart={cart}
          updateCartQuantity={updateCartQuantity}
          removeFromCart={removeFromCart}
          totalAmount={totalAmount}
          finalTotal={finalTotal}
          discountAmount={discountAmount}
          selectedPromo={selectedPromo}
          handleCheckout={handleCheckout}
          isSubmitting={isSubmitting}
          clearCart={clearCart}
          memberPromoProps={memberPromoProps}
          isShiftOpen={isShiftOpen}
        />
      </div>

      {/* ── Mobile: Bottom sheet trigger ── */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
        <Sheet>
          <SheetTrigger
            render={
              <Button className="w-full h-14 sm:h-16 rounded-2xl shadow-2xl flex justify-between items-center px-4 sm:px-6 bg-primary text-white hover:bg-primary/90" />
            }
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl relative">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">
                    {cart.reduce((s: number, i: any) => s + i.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="font-black text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">
                รายการ ({cart.length})
              </span>
            </div>
            <span className="font-black text-base sm:text-xl shrink-0 ml-2">
              ฿{finalTotal.toLocaleString()}
            </span>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] sm:h-[90vh] rounded-t-[32px] sm:rounded-t-[40px] p-0 overflow-hidden border-none shadow-2xl">
            <CartSummaryContent
              cart={cart}
              updateCartQuantity={updateCartQuantity}
              removeFromCart={removeFromCart}
              totalAmount={totalAmount}
              finalTotal={finalTotal}
              discountAmount={discountAmount}
              selectedPromo={selectedPromo}
              handleCheckout={handleCheckout}
              isSubmitting={isSubmitting}
              clearCart={clearCart}
              memberPromoProps={memberPromoProps}
              isShiftOpen={isShiftOpen}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ────────────────────────────────────────────────
          Item Selection Dialog
      ──────────────────────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-[24px] sm:rounded-3xl border-none max-h-[90vh] flex flex-col">
          {selectedItem && (
            <>
              <div className="relative h-32 sm:h-44 overflow-hidden shrink-0">
                {selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="absolute inset-0 w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-slate-100 flex items-center justify-center">
                    <UtensilsCrossed className="w-12 h-12 text-slate-300" />
                  </div>
                )}
                <Button
                  variant="ghost" size="icon"
                  className="absolute top-2 right-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white z-20 h-8 w-8"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                  <div className="p-4 sm:p-6 space-y-5">
                    <DialogHeader className="space-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <DialogTitle className="text-xl sm:text-2xl font-black leading-tight">{selectedItem.name}</DialogTitle>
                        <span className="text-lg sm:text-xl font-black text-primary italic shrink-0">฿{selectedItem.price.toLocaleString()}</span>
                      </div>
                    </DialogHeader>

                    {Array.isArray(selectedItem.optionGroups) && selectedItem.optionGroups.length > 0 && (
                      <div className="space-y-5">
                        {selectedItem.optionGroups.map(group => (
                          <div key={group.id} className="space-y-2.5">
                            <div className="flex justify-between items-center px-1">
                              <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest leading-none">{group.name}</h4>
                              <Badge variant="outline" className="text-[9px] font-black tracking-tighter bg-slate-50 border-slate-100 text-slate-400 px-1.5 py-0 h-4">
                                {group.isMultiple ? 'เลือกได้หลายอย่าง' : 'เลือกได้ 1 อย่าง'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Array.isArray(group.options) && group.options.map(option => {
                                const isSelected = selectedOptions.find(o => o.id === option.id);
                                return (
                                  <div
                                    key={option.id}
                                    className={cn(
                                      'flex justify-between items-center p-2.5 rounded-xl border-2 transition-all cursor-pointer active:scale-[0.98]',
                                      isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 hover:border-slate-200 bg-white',
                                    )}
                                    onClick={() => toggleOption(group, option)}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={cn(
                                        'w-3.5 h-3.5 border flex items-center justify-center transition-all shrink-0',
                                        isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300',
                                        !group.isMultiple ? 'rounded-full' : 'rounded-[3px]',
                                      )}>
                                        {isSelected && <div className={cn('bg-white', group.isMultiple ? 'w-1.5 h-1.5 rounded-[1px]' : 'w-1 h-1 rounded-full')} />}
                                      </div>
                                      <span className="font-bold text-xs truncate">{option.name}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 shrink-0 ml-1">
                                      {option.price > 0 ? `+฿${option.price}` : 'ฟรี'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2.5 pt-2">
                      <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest leading-none px-1">หมายเหตุเพิ่มเติม</h4>
                      <Input
                        placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                        className="h-11 rounded-xl text-sm border-slate-200"
                        value={itemNotes}
                        onChange={e => setItemNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-white border-t border-slate-100 space-y-4 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">จำนวนที่ต้องการ</span>
                    <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-full border border-slate-100">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:text-primary" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <span className="font-black text-lg w-6 text-center tabular-nums">{quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white shadow-sm hover:text-primary" onClick={() => setQuantity(q => q + 1)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full h-14 sm:h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 flex justify-between px-6"
                    onClick={handleAddToCart}
                  >
                    <span>เพิ่มลงตะกร้า</span>
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                      ฿{((selectedItem.price + selectedOptions.reduce((s, o) => s + o.price, 0)) * quantity).toLocaleString()}
                    </span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────
          Payment Confirmation Dialog
      ──────────────────────────────────────────────── */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-[24px] sm:rounded-3xl border-none max-h-[95vh] flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-5 sm:p-7 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-black text-center">ยืนยันการชำระเงิน</DialogTitle>
                </DialogHeader>

                {/* Payment mode */}
                <div className="grid grid-cols-2 gap-2">
                  {(['CASH', 'TRANSFER'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={cn(
                        'flex flex-row items-center justify-center p-2.5 rounded-xl border-2 transition-all gap-2 active:scale-95',
                        paymentMode === mode
                          ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/5'
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/50',
                      )}
                    >
                      <div className={cn('p-1.5 rounded-lg', paymentMode === mode ? 'bg-primary text-white' : 'bg-white text-slate-400')}>
                        {mode === 'CASH' ? <Banknote className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                      </div>
                      <span className="font-black text-[11px] sm:text-xs whitespace-nowrap">
                        {mode === 'CASH' ? 'เงินสด (Cash)' : 'PromptPay'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Price summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">ราคาก่อนลด</span>
                        <span className="font-bold text-slate-400 line-through">฿{totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-primary font-bold flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          ส่วนลด ({selectedPromo?.name})
                        </span>
                        <span className="font-bold text-primary">- ฿{discountAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2" />
                    </>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">ยอดชำระจริง</span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 italic tabular-nums">
                      ฿{finalTotal.toLocaleString()}
                    </span>
                  </div>

                  {paymentMode === 'CASH' && (
                    <div className="space-y-3 pt-3 border-t border-slate-200 animate-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">รับเงินสดมา</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-base">฿</span>
                          <Input
                            type="number" autoFocus placeholder="0.00"
                            className="h-10 sm:h-12 pl-8 pr-10 text-lg sm:text-xl font-black rounded-xl bg-white border-none focus:ring-1 focus:ring-primary text-right tabular-nums shadow-sm"
                            value={receivedAmount}
                            onChange={e => setReceivedAmount(e.target.value)}
                          />
                          {receivedAmount && (
                            <button
                              onClick={() => setReceivedAmount('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 mt-2">
                          {['1000', '500', '100', '50', '20'].map(val => (
                            <button key={`note-${val}`} type="button" onClick={() => handleQuickCash(Number(val))}
                              className="h-8 sm:h-10 rounded-lg bg-white border border-slate-100 shadow-sm text-[10px] sm:text-xs font-black text-slate-600 hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center">
                              +{val}
                            </button>
                          ))}
                          {['10', '5', '2', '1'].map(val => (
                            <button key={`coin-${val}`} type="button" onClick={() => handleQuickCash(Number(val))}
                              className="h-8 sm:h-10 rounded-full bg-slate-50 border border-slate-100 shadow-sm text-[10px] sm:text-xs font-black text-slate-500 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center">
                              +{val}
                            </button>
                          ))}
                          <button type="button" onClick={() => setReceivedAmount(finalTotal.toString())}
                            className="h-8 sm:h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-black hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center col-span-2 sm:col-span-1">
                            จ่ายพอดี
                          </button>
                        </div>
                      </div>
                      {receivedAmount && parseFloat(receivedAmount) > 0 && (
                        <div className="flex justify-between items-center p-2.5 bg-green-50 rounded-xl border border-green-100">
                          <span className="text-green-600 font-bold text-[10px]">เงินทอน</span>
                          <span className="text-lg sm:text-xl font-black text-green-700 italic">฿{changeAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMode === 'TRANSFER' && (
                    <div className="flex flex-row items-center justify-center gap-3 p-3 bg-white rounded-xl border border-dashed border-slate-200 animate-in zoom-in-95">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <QrCode className="w-6 h-6 text-primary opacity-50" />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        สแกน QR บนใบแจ้งหนี้<br />หรือแสดง QR ประจำสาขา
                      </p>
                    </div>
                  )}
                </div>

                {/* Table selector */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">ระบุโต๊ะ (Optional)</label>
                  <div className="relative group">
                    <select
                      className="w-full h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 font-bold px-4 appearance-none transition-colors cursor-pointer text-sm"
                      value={selectedTableId || ''}
                      onChange={e => setSelectedTableId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- ไม่ระบุโต๊ะ / Take Away --</option>
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.zone.name})</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
          </div>

          <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
            <Button
              className="w-full h-12 sm:h-14 rounded-[16px] sm:rounded-[20px] text-base sm:text-lg font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              disabled={isSubmitting || (paymentMode === 'CASH' && (!receivedAmount || parseFloat(receivedAmount) < finalTotal))}
              onClick={handleSubmitOrder}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>ยืนยันการชำระเงิน · ฿{finalTotal.toLocaleString()}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// CartSummaryContent — receives member/promo props
// ─────────────────────────────────────────────
interface CartSummaryProps {
  cart: any[];
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  totalAmount: number;
  finalTotal: number;
  discountAmount: number;
  selectedPromo: PromoInfo | null;
  handleCheckout: () => void;
  isSubmitting: boolean;
  clearCart: () => void;
  memberPromoProps: MemberPromoProps;
  isShiftOpen: boolean;
}

function CartSummaryContent({
  cart, updateCartQuantity, removeFromCart,
  totalAmount, finalTotal, discountAmount, selectedPromo,
  handleCheckout, isSubmitting, clearCart,
  memberPromoProps, isShiftOpen,
}: CartSummaryProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
        <h2 className="text-xl font-black flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          รายการออเดอร์
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={clearCart}>
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
          <Badge variant="secondary" className="rounded-full font-black px-3 h-8 text-primary bg-primary/10 border-none shrink-0">
            {cart.reduce((s: any, i: any) => s + i.quantity, 0)}
          </Badge>
        </div>
      </div>

      {/* Cart items + member/promo — all inside one scrollable area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/30 no-scrollbar">
        {Array.isArray(cart) && cart.map((item: any) => (
          <div key={item.cartItemId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 group animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 truncate text-sm sm:text-base">{item.name}</h4>
                {Array.isArray(item.options) && item.options.length > 0 && (
                  <p className="text-[10px] sm:text-xs text-slate-400 leading-tight mt-0.5">
                    {item.options.map((o: any) => o.name).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-0.5 italic">
                    * {item.notes}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-200 group-hover:text-red-400 shrink-0 transition-colors" onClick={() => removeFromCart(item.cartItemId)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-between items-center pt-1">
              <p className="font-black text-primary tabular-nums">
                ฿{((item.price + item.options.reduce((s: number, o: any) => s + o.price, 0)) * item.quantity).toLocaleString()}
              </p>
              <div className="flex items-center gap-3 bg-slate-100/50 p-1 rounded-full border border-slate-100">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white" onClick={() => updateCartQuantity(item.cartItemId, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white" onClick={() => updateCartQuantity(item.cartItemId, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {(!Array.isArray(cart) || cart.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-24 animate-in fade-in zoom-in duration-500">
            <div className="p-8 bg-slate-100 rounded-[40px] shadow-inner">
              <UtensilsCrossed className="w-16 h-16 opacity-30" />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-400 italic">เลือกเมนูอาหารเพื่อเริ่มรับรายการ</p>
              <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Ready to serve customers</p>
            </div>
          </div>
        )}
        {/* ── Member & Promo Section (inside scroll) ── */}
        {cart.length > 0 && (
          <div className="pt-1">
            <MemberPromoSection {...memberPromoProps} />
          </div>
        )}
      </div>

      {/* ── Footer: Price Summary + Checkout ── */}
      <div className="p-6 bg-white border-t border-slate-100 space-y-4 shadow-[0_-20px_40px_rgba(0,0,0,0.04)] shrink-0">
        <div className="space-y-2 px-2">
          {discountAmount > 0 ? (
            <>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">ราคาก่อนลด</span>
                <span className="text-slate-400 font-bold">฿{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary font-bold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {selectedPromo?.name ?? 'ส่วนลด'}
                </span>
                <span className="text-primary font-black">- ฿{discountAmount.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">ยอดสุทธิ</span>
                  <p className="text-[10px] text-slate-300 italic">Total After Discount</p>
                </div>
                <span className="text-4xl font-black text-slate-900 tracking-tighter italic tabular-nums">
                  ฿{finalTotal.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center px-0">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">ยอดรวมทั้งสิ้น</span>
                <p className="text-[10px] text-slate-300 italic">Total Checkout Amount</p>
              </div>
              <span className="text-4xl font-black text-slate-900 tracking-tighter italic tabular-nums">
                ฿{totalAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <Button
          className="w-full h-16 sm:h-20 rounded-[28px] text-xl font-black shadow-2xl shadow-primary/20 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-95"
          disabled={isSubmitting || cart.length === 0 || !isShiftOpen}
          onClick={handleCheckout}
        >
          {isSubmitting ? (
            <><Loader2 className="w-6 h-6 animate-spin" /><span>กำลังบักทึก...</span></>
          ) : (
            <><Calculator className="w-6 h-6" /><span>ชำระเงิน</span></>
          )}
        </Button>
      </div>
    </div>
  );
}
