import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useCart } from '../contexts/CartContext';
import type { CustomerInfo, PromoInfo } from '../contexts/CartContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '../components/ui/sheet';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, X, Loader2, UtensilsCrossed,
  Tag, CheckCircle2, ChevronLeft, ChevronRight,
  Phone, Star, Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types (menu-specific)
// ─────────────────────────────────────────────
interface OptionItem  { id: number; name: string; price: number }
interface OptionGroup { id: number; name: string; isMultiple: boolean; options: OptionItem[] }
interface MenuItem {
  id: number; name: string; price: number; imageUrl?: string; categoryId: number;
  optionGroups: OptionGroup[];
}
interface Category { id: number; name: string; items: MenuItem[] }

const PROMO_GRADIENTS = [
  'from-orange-500 via-red-500 to-rose-600',
  'from-violet-600 via-purple-500 to-pink-500',
  'from-sky-500 via-blue-500 to-indigo-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-orange-400 to-yellow-500',
];

// ─────────────────────────────────────────────
// Promo Carousel (top banner)
// ─────────────────────────────────────────────
function PromoBanner({ promotions }: { promotions: PromoInfo[] }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (promotions.length <= 1) return;
    timer.current = setInterval(() => setIdx(i => (i + 1) % promotions.length), 3800);
    return () => clearInterval(timer.current);
  }, [promotions.length]);

  if (!promotions.length) return null;

  const label = (p: PromoInfo) => {
    if (p.type === 'PERCENT') return `ลด ${p.value}%`;
    if (p.type === 'FIXED')   return `ลด ฿${p.value.toLocaleString()}`;
    return `แลกแต้ม ${p.value} แต้ม`;
  };

  return (
    <div className="px-4 pt-4 pb-1">
      <div className="relative rounded-2xl overflow-hidden shadow-md">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {promotions.map((promo, i) => (
            <div
              key={promo.id}
              className={cn(
                'w-full shrink-0 bg-gradient-to-r text-white px-5 py-4 flex items-center justify-between gap-3',
                PROMO_GRADIENTS[i % PROMO_GRADIENTS.length],
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1 opacity-80">
                  <Tag className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">โปรโมชั่น</span>
                </div>
                <p className="font-black text-base leading-tight">{promo.name}</p>
                <p className="text-xs mt-0.5 opacity-80">
                  {label(promo)}
                  {promo.minSpend > 0 && ` · ขั้นต่ำ ฿${promo.minSpend.toLocaleString()}`}
                </p>
              </div>
              <div className="shrink-0 text-4xl select-none">🎉</div>
            </div>
          ))}
        </div>

        {promotions.length > 1 && (
          <>
            <button
              onClick={() => setIdx(i => (i - 1 + promotions.length) % promotions.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIdx(i => (i + 1) % promotions.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {promotions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn('rounded-full transition-all', i === idx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50')}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Food Card — same style as CounterService
// ─────────────────────────────────────────────
function FoodCard({ item, cartCount, onClick }: {
  item: MenuItem; cartCount: number; onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:border-primary hover:shadow-md transition-all group border-white shadow-sm active:scale-95 flex flex-col"
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
          {cartCount > 0 && (
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">
              {cartCount}
            </div>
          )}
        </div>
        <div className="p-2 sm:p-3 flex-1 flex flex-col justify-center">
          <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-xs sm:text-sm line-clamp-2 leading-tight">
            {item.name}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// MemberCartSection — inline in Cart Sheet
// Handles: phone lookup → customer card → quick register → promo list → discount summary
// ─────────────────────────────────────────────
function MemberCartSection({ qrCode, subtotal }: { qrCode: string; subtotal: number }) {
  const {
    customer, setCustomer,
    appliedPromotion, applyPromotion, clearPromotion,
    discountAmount,
  } = useCart();

  const [phone,        setPhone]        = useState(customer?.phone ?? '');
  const [isSearching,  setIsSearching]  = useState(false);
  const [notFound,     setNotFound]     = useState(false);
  const [promos,       setPromos]       = useState<PromoInfo[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isExpanded,   setIsExpanded]   = useState(!!customer);

  /* Fetch active promos once — scoped by the table's QR code */
  useEffect(() => {
    api.get(`/promotions/at-table?qrCode=${encodeURIComponent(qrCode)}`)
      .then(r => setPromos(r.data))
      .catch(() => {});
  }, [qrCode]);

  /* Sync phone when customer is restored from context */
  useEffect(() => {
    if (customer) setPhone(customer.phone);
  }, [customer]);

  const visiblePromos = promos.filter(
    p => subtotal >= p.minSpend && (!p.memberOnly || customer),
  );

  /* ── Search — proves presence at the table with the QR code ── */
  const searchCustomer = async () => {
    if (phone.length < 9) return toast.error('กรอกเบอร์โทร 9-10 หลัก');
    setIsSearching(true); setNotFound(false);
    setCustomer(null); clearPromotion();
    try {
      const res = await api.post('/customers/at-table', { qrCode, phone });
      if (res.data) {
        setCustomer(res.data);
        toast.success(`พบสมาชิก "${res.data.name}" — ${res.data.points} แต้ม`);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  /* ── Apply promo ── */
  const handleApplyPromo = async (promo: PromoInfo) => {
    setIsValidating(true);
    try {
      const disc = await applyPromotion(qrCode, promo);
      if (disc !== null && appliedPromotion?.id !== promo.id) {
        toast.success(`ใช้ "${promo.name}" — ลด ฿${disc.toLocaleString()}`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'ไม่สามารถใช้โปรโมชั่นนี้ได้');
    } finally {
      setIsValidating(false);
    }
  };

  /* ── Remove customer ── */
  const handleRemoveCustomer = () => {
    setCustomer(null);
    clearPromotion();
    setPhone('');
    setNotFound(false);
  };

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800">สมาชิก & โปรโมชั่น</p>
            {customer ? (
              <p className="text-xs text-emerald-600 font-semibold leading-tight">
                {customer.name} · {customer.points} แต้ม
                {discountAmount > 0 && ` · ลด ฿${discountAmount.toLocaleString()}`}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">ค้นหาสมาชิกเพื่อใช้โปรโมชั่น</p>
            )}
          </div>
        </div>
        <div className={cn('text-slate-400 transition-transform', isExpanded ? 'rotate-180' : '')}>
          <ChevronLeft className="w-4 h-4 rotate-90" />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-50">

          {/* ── Phone search ── */}
          {!customer && (
            <div className="flex gap-2 pt-3">
              <div className="relative flex-1">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="เบอร์โทรศัพท์"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && searchCustomer()}
                  className="pl-8 h-9 rounded-xl text-sm"
                  maxLength={10}
                />
              </div>
              <Button
                size="sm"
                onClick={searchCustomer}
                disabled={isSearching || phone.length < 9}
                className="h-9 rounded-xl font-bold shrink-0 px-4"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ค้นหา'}
              </Button>
            </div>
          )}

          {/* ── Customer card ── */}
          {customer && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 mt-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                {customer.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-emerald-800 text-sm truncate">{customer.name}</p>
                <p className="text-xs text-emerald-600">{customer.phone}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-black text-amber-500 leading-none">{customer.points}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">แต้ม</p>
              </div>
              <button
                onClick={handleRemoveCustomer}
                className="text-slate-300 hover:text-slate-500 ml-1 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Not found — sign-up is handled by staff at the counter ── */}
          {notFound && !customer && (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-semibold">ไม่พบสมาชิกหมายเลข {phone}</p>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                สมัครสมาชิกได้ที่เคาน์เตอร์ แจ้งพนักงานเพื่อรับสิทธิ์สะสมแต้ม
              </p>
            </div>
          )}

          {/* ── Available promotions ── */}
          {visiblePromos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                <Sparkles className="w-3 h-3" /> โปรโมชั่นที่ใช้ได้
              </p>
              {visiblePromos.map(p => {
                const isSelected  = appliedPromotion?.id === p.id;
                const needsPoints = p.type === 'POINTS_REDEMPTION';
                const hasEnough   = !needsPoints || (customer?.points ?? 0) >= p.pointsNeeded;
                return (
                  <button
                    key={p.id}
                    disabled={isValidating || !hasEnough}
                    onClick={() => handleApplyPromo(p)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98]',
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
                        {p.type === 'PERCENT' && `ลด ${p.value}%`}
                        {p.type === 'FIXED'   && `ลด ฿${p.value.toLocaleString()}`}
                        {p.type === 'POINTS_REDEMPTION' &&
                          `ใช้ ${p.pointsNeeded} แต้ม → ลด ฿${p.value.toLocaleString()}${!hasEnough ? ' (แต้มไม่พอ)' : ''}`}
                        {p.memberOnly && <span className="ml-1 text-primary/60">(เฉพาะสมาชิก)</span>}
                      </p>
                    </div>
                    {isSelected
                      ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-2" />
                      : <Tag className="w-4 h-4 text-slate-300 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Discount summary ── */}
          {discountAmount > 0 && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 rounded-xl border border-primary/15">
              <span className="text-sm font-bold text-primary">ส่วนลดที่ได้รับ</span>
              <span className="text-base font-black text-primary">- ฿{discountAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function CustomerOrder() {
  const { branchId, tableId } = useParams<{ branchId: string; tableId: string }>();
  const navigate = useNavigate();
  const {
    cart, addToCart, updateQuantity, removeFromCart, clearCart,
    subtotal, discountAmount, finalTotal,
    customer, appliedPromotion,
  } = useCart();

  const [categories, setCategories]   = useState<Category[]>([]);
  const [promotions, setPromotions]   = useState<PromoInfo[]>([]);
  const [branchName, setBranchName]   = useState('');
  const [tableName,  setTableName]    = useState('');
  const [isLoading,  setIsLoading]    = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<OptionItem[]>([]);
  const [quantity,   setQuantity]     = useState(1);
  const [itemNotes,  setItemNotes]    = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const observerRef  = useRef<IntersectionObserver | null>(null);

  /* ── Fetch menu + table + promos ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, tableRes, promoRes] = await Promise.all([
          api.get(`/branches/${branchId}/menu`),
          api.get(`/tables/by-qrcode/${tableId}`),
          api.get(`/promotions?branchId=${branchId}&activeOnly=true`).catch(() => ({ data: [] })),
        ]);
        const cats: Category[] = menuRes.data.categories || [];
        setCategories(cats);
        setBranchName(menuRes.data.name || '');
        setTableName(tableRes.data.name || '');
        setPromotions(promoRes.data || []);
        if (cats.length) setActiveCategory(cats[0].id);
      } catch {
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [branchId, tableId]);

  /* ── Active category via IntersectionObserver ── */
  useEffect(() => {
    if (!categories.length) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActiveCategory(Number(visible[0].target.getAttribute('data-cat-id')));
      },
      { rootMargin: '-110px 0px -55% 0px', threshold: 0 },
    );
    Object.values(categoryRefs.current).forEach(el => {
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [categories]);

  /* ── Helpers ── */
  const scrollToCategory = (id: number) => {
    const el = categoryRefs.current[id];
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
  };

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedOptions([]);
    setQuantity(1);
    setItemNotes('');
  };

  const toggleOption = (group: OptionGroup, option: OptionItem) => {
    setSelectedOptions(prev => {
      const exists = prev.find(o => o.id === option.id);
      if (group.isMultiple) {
        return exists ? prev.filter(o => o.id !== option.id) : [...prev, option];
      }
      const groupIds = group.options.map(o => o.id);
      return [...prev.filter(o => !groupIds.includes(o.id)), option];
    });
  };

  const itemExtraPrice = selectedOptions.reduce((s, o) => s + o.price, 0);

  const handleAddToCart = () => {
    if (!selectedItem) return;
    addToCart({
      menuItemId: selectedItem.id,
      name:       selectedItem.name,
      price:      selectedItem.price,
      quantity,
      notes:      itemNotes || undefined,
      options:    selectedOptions.map(o => ({ optionId: o.id, name: o.name, price: o.price })),
    });
    setSelectedItem(null);
    toast.success(`เพิ่ม "${selectedItem.name}" ลงตะกร้าแล้ว 🛒`);
  };

  /* ── Submit order — includes customerId / promotionId / discountAmount ── */
  const handleSubmitOrder = async () => {
    if (!cart.length) return;
    setIsSubmitting(true);
    try {
      // Branch, table, member and discount are all resolved server-side from the
      // QR code — nothing here can redirect the order or the points elsewhere.
      await api.post('/orders/at-table', {
        qrCode: tableId!,
        ...(customer         ? { customerPhone: customer.phone }    : {}),
        ...(appliedPromotion ? { promotionId:   appliedPromotion.id } : {}),
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity:   item.quantity,
          notes:      item.notes,
          options:    item.options.map(o => ({ optionId: o.optionId })),
        })),
      });
      clearCart();
      setIsCartOpen(false);
      navigate('/order-success');
    } catch {
      toast.error('สั่งอาหารไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-white gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <p className="text-sm text-slate-400 font-semibold">กำลังโหลดเมนู...</p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50" style={{ paddingBottom: cartCount > 0 ? '100px' : '32px' }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30">
        <div className="bg-gradient-to-r from-primary to-primary/80 px-4 pt-4 pb-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-black text-lg leading-tight truncate">{branchName}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                <span className="text-[11px] font-semibold text-white/75">เปิดให้บริการอยู่</span>
              </div>
            </div>
            <div className="shrink-0 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 text-center">
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">โต๊ะ</p>
              <p className="text-xl font-black leading-none">{tableName || '—'}</p>
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="bg-white border-b flex overflow-x-auto scrollbar-none px-3 py-2.5 gap-2 shadow-sm">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all',
                activeCategory === cat.id
                  ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Promo Banner ── */}
      <PromoBanner promotions={promotions} />

      {/* ── Menu sections ── */}
      <div className="px-4 pt-4 space-y-8">
        {categories.map(cat => (
          <div
            key={cat.id}
            data-cat-id={cat.id}
            ref={el => { categoryRefs.current[cat.id] = el; }}
            className="scroll-mt-36"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-primary rounded-full shrink-0" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">{cat.name}</h2>
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 ml-auto">
                {cat.items.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {cat.items.map(item => {
                const inCart = cart.filter(c => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);
                return (
                  <FoodCard
                    key={item.id}
                    item={item}
                    cartCount={inCart}
                    onClick={() => handleSelectItem(item)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Sticky Cart Footer ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-5 pt-4 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full pointer-events-auto bg-primary text-white rounded-2xl h-14 flex items-center justify-between px-5 shadow-2xl shadow-primary/40 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-white/20 rounded-xl p-1.5">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-primary">
                  {cartCount}
                </span>
              </div>
              <span className="font-bold text-sm">{cartCount} รายการ</span>
            </div>
            <div className="flex items-center gap-2">
              {discountAmount > 0 ? (
                <span className="font-black text-base">฿{finalTotal.toLocaleString()}</span>
              ) : (
                <span className="font-black text-base">฿{subtotal.toLocaleString()}</span>
              )}
              <ChevronRight className="w-4 h-4 opacity-70" />
            </div>
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────
          Item Detail Dialog
      ──────────────────────────────────────── */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="w-[95vw] max-w-[480px] p-0 rounded-3xl border-none max-h-[92vh] flex flex-col overflow-hidden">
          {selectedItem && (
            <>
              <div className="relative h-48 shrink-0 bg-slate-100">
                {selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <UtensilsCrossed className="w-16 h-16 text-slate-200" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-4 right-12 text-white">
                  <DialogHeader>
                    <DialogTitle render={<h3 className="font-black text-xl leading-tight" />}>
                      {selectedItem.name}
                    </DialogTitle>
                  </DialogHeader>
                  <span className="text-lg font-black text-yellow-300">฿{selectedItem.price.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-5 space-y-5">
                  {selectedItem.optionGroups?.map(group => (
                    <div key={group.id}>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-sm font-black text-slate-800">{group.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase">
                          {group.isMultiple ? 'หลายรายการ' : 'เลือก 1'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.options.map(opt => {
                          const sel = !!selectedOptions.find(o => o.id === opt.id);
                          return (
                            <div
                              key={opt.id}
                              onClick={() => toggleOption(group, opt)}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98]',
                                sel ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white',
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  'w-4 h-4 border-2 flex items-center justify-center shrink-0 transition-all',
                                  group.isMultiple ? 'rounded-[4px]' : 'rounded-full',
                                  sel ? 'border-primary bg-primary' : 'border-slate-300',
                                )}>
                                  {sel && <div className={cn('bg-white', group.isMultiple ? 'w-1.5 h-1.5 rounded-sm' : 'w-1.5 h-1.5 rounded-full')} />}
                                </div>
                                <span className={cn('text-sm font-semibold', sel ? 'text-primary' : 'text-slate-700')}>
                                  {opt.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-400 shrink-0">
                                {opt.price > 0 ? `+฿${opt.price}` : 'ฟรี'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-2">หมายเหตุ</h4>
                    <Input
                      placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
                      value={itemNotes}
                      onChange={e => setItemNotes(e.target.value)}
                      className="rounded-xl border-slate-200 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-white shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-600">จำนวน</span>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-full px-2 py-1 border border-slate-100">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-primary">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-black text-lg tabular-nums">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-primary">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-base flex items-center justify-between px-5 shadow-lg shadow-primary/25 active:scale-[0.98] transition-transform"
                >
                  <span>เพิ่มลงตะกร้า</span>
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                    ฿{((selectedItem.price + itemExtraPrice) * quantity).toLocaleString()}
                  </span>
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────
          Cart Bottom Sheet
      ──────────────────────────────────────── */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl max-h-[92vh] flex flex-col p-0 gap-0 border-0"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          <SheetHeader className="px-5 pb-3 border-b shrink-0 gap-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-black text-lg flex items-center gap-2 text-slate-900">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </div>
                ตะกร้าของคุณ
                <Badge className="text-xs">{cartCount}</Badge>
              </SheetTitle>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </SheetHeader>

          {/* Scrollable area: cart items + member/promo section */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">

            {/* ── Cart items ── */}
            <div className="space-y-3">
              {cart.map(item => {
                const lineTotal = (item.price + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity;
                return (
                  <div key={item.id} className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 leading-snug">{item.name}</p>
                      {item.options.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {item.options.map(o => o.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">* {item.notes}</p>
                      )}
                      <p className="font-black text-primary text-sm mt-1.5">
                        ฿{lineTotal.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-2 mt-auto bg-slate-50 rounded-xl px-2 py-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors">
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-5 text-center font-black text-sm tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Member & Promo Section ── */}
            <MemberCartSection qrCode={tableId!} subtotal={subtotal} />

          </div>

          {/* ── Sheet footer — price summary + confirm ── */}
          <SheetFooter className="border-t bg-white px-5 pb-6 pt-3 gap-2 shrink-0">
            {/* Price breakdown */}
            <div className="w-full space-y-1.5 mb-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm font-medium">ราคารวม</span>
                <span className="text-slate-700 font-bold">฿{subtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-primary text-sm font-bold">ส่วนลด ({appliedPromotion?.name})</span>
                  <span className="text-primary font-bold">- ฿{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                <span className="text-slate-500 font-medium text-sm">ยอดรวมสุทธิ</span>
                <span className="text-2xl font-black text-slate-900">฿{finalTotal.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-14 rounded-2xl text-base font-black shadow-xl shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" />กำลังส่งออเดอร์...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" />ยืนยันสั่งอาหาร · ฿{finalTotal.toLocaleString()}</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
