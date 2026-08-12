import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../components/ui/sheet';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, ArrowRight, Tag } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier      { id: number; name: string }
interface Category      { id: number; name: string }
interface RawMaterial   { id: number; name: string; unit: string; categoryId: number; category?: { id: number; name: string } }
interface CartItem      { rawMaterialId: number; name: string; unit: string; quantity: number }

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreatePurchaseOrder() {
  const { branchId, brandId } = useParams<{ branchId: string; brandId: string }>();
  const navigate = useNavigate();

  const [suppliers,    setSuppliers]    = useState<Supplier[]>([]);
  const [materials,    setMaterials]    = useState<RawMaterial[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSupplier,  setSelectedSupplier]  = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState<number | null>(null);
  const [cart,               setCart]              = useState<CartItem[]>([]);
  const [isCartOpen,         setIsCartOpen]        = useState(false);   // mobile cart sheet

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (branchId) fetchData(); }, [branchId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [supRes, matRes, catRes] = await Promise.all([
        api.get<Supplier[]>(`/suppliers?branchId=${branchId}`),
        api.get<RawMaterial[]>(`/raw-materials?branchId=${branchId}`),
        api.get<Category[]>(`/material-categories?branchId=${branchId}`),
      ]);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setMaterials(Array.isArray(matRes.data) ? matRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch {
      toast.error('โหลดข้อมูลล้มเหลว');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtered materials (client-side by category tab) ──────────────────────
  const filteredMaterials = useMemo(() =>
    selectedCategory === null
      ? materials
      : materials.filter(m => m.categoryId === selectedCategory),
    [materials, selectedCategory],
  );

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (mat: RawMaterial) => {
    setCart(prev => {
      const hit = prev.find(i => i.rawMaterialId === mat.id);
      if (hit) return prev.map(i => i.rawMaterialId === mat.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { rawMaterialId: mat.id, name: mat.name, unit: mat.unit, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) =>
    setCart(prev =>
      prev.map(i => i.rawMaterialId === id
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
      )
    );

  const removeFromCart = (id: number) =>
    setCart(prev => prev.filter(i => i.rawMaterialId !== id));

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedSupplier) return toast.error('กรุณาเลือกร้านค้า (Supplier)');
    if (!cart.length)       return toast.error('กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการ');

    setIsSubmitting(true);
    try {
      await api.post('/purchase-orders', {
        branchId:   Number(branchId),
        supplierId: Number(selectedSupplier),
        items: cart.map(i => ({ rawMaterialId: i.rawMaterialId, quantity: i.quantity, price: 0 })),
      });
      toast.success('สั่งซื้อสำเร็จ!');
      navigate(`/brands/${brandId}/branches/${branchId}/inventory`);
    } catch {
      toast.error('เกิดข้อผิดพลาดในการสั่งซื้อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center p-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row h-full gap-5 min-h-0">

      {/* ══════════════════════ LEFT: Materials panel ══════════════════════ */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">

        {/* Panel header */}
        <div className="p-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold flex items-center gap-2 text-slate-900">
            <ShoppingCart className="w-5 h-5 text-primary" />
            สั่งวัตถุดิบเข้าร้าน
          </h2>
        </div>

        {/* ── Category filter tabs ────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === null
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
              }`}
            >
              <Tag className="w-3 h-3" />
              ทั้งหมด
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                selectedCategory === null ? 'bg-white/25' : 'bg-slate-200'
              }`}>
                {materials.length}
              </span>
            </button>

            {categories.map(cat => {
              const count = materials.filter(m => m.categoryId === cat.id).length;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(active ? null : cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {cat.name}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    active ? 'bg-white/25' : 'bg-slate-200'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Materials grid ──────────────────────────────────────────────── */}
        <ScrollArea className="flex-1 p-4 pb-24 lg:pb-4 bg-slate-50">
          {!filteredMaterials.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Tag className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-semibold text-sm">ไม่มีวัตถุดิบในหมวดหมู่นี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMaterials.map(m => {
                const inCart = cart.find(c => c.rawMaterialId === m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => addToCart(m)}
                    className={`relative bg-white p-4 rounded-2xl border-2 shadow-sm cursor-pointer
                                hover:shadow-md transition-all active:scale-95 flex flex-col
                                items-center justify-center text-center aspect-square select-none ${
                      inCart
                        ? 'border-primary ring-2 ring-primary/10'
                        : 'border-transparent hover:border-primary/40'
                    }`}
                  >
                    {/* In-cart badge */}
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-primary text-white text-[10px] font-black
                                       w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                        {inCart.quantity}
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                      inCart ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      <Plus className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">{m.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs text-slate-400">{m.unit}</span>
                      {m.category && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold">
                          {m.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ══════════════ RIGHT: Cart panel (desktop sidebar only) ═══════════ */}
      <div className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 bg-white rounded-2xl shadow-sm
                       border border-slate-200 flex-col overflow-hidden min-h-0">
        <CartPanel
          suppliers={suppliers}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          cart={cart}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          totalItems={totalItems}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
        />
      </div>

      {/* ══════════════ Mobile: floating cart button (opens sheet) ═════════ */}
      <div className="lg:hidden fixed bottom-4 inset-x-4 z-40">
        <button
          onClick={() => setIsCartOpen(true)}
          className="w-full h-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/30
                     flex items-center justify-between px-5 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black
                                 w-5 h-5 rounded-full flex items-center justify-center border-2 border-primary">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="font-bold text-sm">รายการที่เลือก ({cart.length})</span>
          </div>
          <span className="font-black text-sm">ดูรายการ</span>
        </button>
      </div>

      {/* ══════════════ Mobile: cart bottom sheet ══════════════════════════ */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-3xl h-[88vh] max-h-[88vh] flex flex-col p-0 gap-0 border-0 lg:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>รายการที่เลือก</SheetTitle>
          </SheetHeader>
          <CartPanel
            suppliers={suppliers}
            selectedSupplier={selectedSupplier}
            setSelectedSupplier={setSelectedSupplier}
            cart={cart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            totalItems={totalItems}
            isSubmitting={isSubmitting}
            handleSubmit={handleSubmit}
            onClose={() => setIsCartOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Cart panel — shared by desktop sidebar & mobile bottom sheet ──────────────
interface CartPanelProps {
  suppliers:           Supplier[];
  selectedSupplier:    string;
  setSelectedSupplier: (v: string) => void;
  cart:                CartItem[];
  updateQuantity:      (id: number, delta: number) => void;
  removeFromCart:      (id: number) => void;
  totalItems:          number;
  isSubmitting:        boolean;
  handleSubmit:        () => void;
  /** Mobile only — renders a close control in the header when provided. */
  onClose?:            () => void;
}

function CartPanel({
  suppliers, selectedSupplier, setSelectedSupplier, cart,
  updateQuantity, removeFromCart, totalItems, isSubmitting, handleSubmit, onClose,
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Cart header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
        <h2 className="font-bold">รายการที่เลือก</h2>
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold">
            {cart.length} รายการ
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="ปิด"
            >
              <ArrowRight className="w-4 h-4 rotate-90" />
            </button>
          )}
        </div>
      </div>

      {/* Supplier selector */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">ร้านค้า (Supplier)</label>
        <Select
          value={selectedSupplier !== '' ? selectedSupplier : undefined}
          onValueChange={setSelectedSupplier}
        >
          <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200">
            <SelectValue placeholder="เลือกร้านค้า...">
              {selectedSupplier !== ''
                ? (suppliers.find(s => s.id.toString() === selectedSupplier)?.name ?? null)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cart items */}
      <ScrollArea className="flex-1 p-4">
        {!cart.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-semibold">ยังไม่มีรายการวัตถุดิบ</p>
            <p className="text-xs mt-1">คลิกที่วัตถุดิบเพื่อเพิ่ม</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map(item => (
              <div
                key={item.rawMaterialId}
                className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm"
              >
                {/* Item name + remove */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 leading-snug">{item.name}</h4>
                    <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.rawMaterialId)}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold">จำนวน</span>
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <button
                      onClick={() => updateQuantity(item.rawMaterialId, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm
                                 text-slate-600 hover:text-primary transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-black text-sm text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.rawMaterialId, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm
                                 text-slate-600 hover:text-primary transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer / submit */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 space-y-3">
        {/* Summary */}
        <div className="flex justify-between items-center text-sm px-1">
          <span className="text-slate-500 font-semibold">รวม</span>
          <div className="text-right">
            <p className="font-black text-2xl text-slate-900 leading-none">{totalItems}</p>
            <p className="text-xs text-slate-400">หน่วยทั้งหมด</p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !cart.length}
          className="w-full h-13 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 gap-2"
        >
          {isSubmitting
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <>ยืนยันการสั่งซื้อ <ArrowRight className="w-5 h-5" /></>
          }
        </Button>
      </div>
    </div>
  );
}
