import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChefHat, Package, Building2, Laptop,
  ArrowRight, Check, Menu, X, Mail, Phone, Sparkles,
} from 'lucide-react';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'ฟีเจอร์', href: '#features' },
  { label: 'ราคา', href: '/pricing' },
  { label: 'ติดต่อเรา', href: '#contact' },
];

function NavItem({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
  const cls = 'text-sm font-semibold text-slate-600 hover:text-primary transition-colors';
  return href.startsWith('#')
    ? <a href={href} onClick={onClick} className={cls}>{label}</a>
    : <Link to={href} onClick={onClick} className={cls}>{label}</Link>;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-lg font-black text-white shadow-sm">
            C
          </span>
          <span className="text-xl font-black tracking-tight text-slate-900">ChabaPOS</span>
        </Link>

        {/* Center links — desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(l => <NavItem key={l.label} label={l.label} href={l.href} />)}
        </div>

        {/* Actions — desktop */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Link to="/brands" className={cn(buttonVariants({ variant: 'default' }), 'h-10 gap-1.5 px-5 font-bold')}>
              ไปที่แดชบอร์ด
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link to="/auth" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-5 font-semibold')}>
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/register"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'h-10 px-5 font-bold shadow-sm transition-transform hover:-translate-y-0.5',
                )}
              >
                ทดลองใช้ฟรี
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map(l => (
              <NavItem key={l.label} label={l.label} href={l.href} onClick={() => setOpen(false)} />
            ))}
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <Link to="/brands" onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: 'default' }), 'h-11 font-bold')}>
                  ไปที่แดชบอร์ด
                </Link>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: 'outline' }), 'h-11 font-semibold')}>
                    เข้าสู่ระบบ
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: 'default' }), 'h-11 font-bold')}>
                    ทดลองใช้ฟรี
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── POS mockup (pure CSS, no image asset) ────────────────────────────────────

const MOCK_MENU = [
  { name: 'ชาเย็น', price: 45, tone: 'bg-amber-100 text-amber-700' },
  { name: 'กาแฟเย็น', price: 55, tone: 'bg-orange-100 text-orange-700' },
  { name: 'ข้าวผัด', price: 60, tone: 'bg-emerald-100 text-emerald-700' },
  { name: 'ต้มยำ', price: 90, tone: 'bg-rose-100 text-rose-700' },
  { name: 'ส้มตำ', price: 50, tone: 'bg-lime-100 text-lime-700' },
  { name: 'ผัดไทย', price: 70, tone: 'bg-sky-100 text-sky-700' },
];

const MOCK_CART = [
  { name: 'ชาเย็น', qty: 2, price: 90 },
  { name: 'ข้าวผัด', qty: 1, price: 60 },
  { name: 'ผัดไทย', qty: 1, price: 70 },
];

function PosMockup() {
  const total = MOCK_CART.reduce((s, i) => s + i.price, 0);

  return (
    <div className="relative">
      {/* Glow behind the frame */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-primary/20 via-rose-200/40 to-amber-100/40 blur-2xl"
      />

      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-[10px] font-medium text-slate-400 border border-slate-100">
            chabapos.com / โต๊ะ 4
          </div>
        </div>

        <div className="grid grid-cols-5">
          {/* Menu grid */}
          <div className="col-span-3 space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-800">เมนูแนะนำ</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                ทั้งหมด 42 รายการ
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOCK_MENU.map(m => (
                <div key={m.name} className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <div className={cn('mb-1.5 flex h-9 items-center justify-center rounded-lg text-[10px] font-bold', m.tone)}>
                    {m.name}
                  </div>
                  <p className="text-[10px] font-black text-slate-700">฿{m.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order panel */}
          <div className="col-span-2 flex flex-col border-l border-slate-100 bg-slate-50/60 p-4 sm:p-5">
            <p className="mb-3 text-xs font-black text-slate-800">ออเดอร์ · โต๊ะ 4</p>
            <div className="flex-1 space-y-2">
              {MOCK_CART.map(i => (
                <div key={i.name} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-slate-700">{i.name}</p>
                    <p className="text-[9px] text-slate-400">x{i.qty}</p>
                  </div>
                  <p className="text-[10px] font-black text-slate-800">฿{i.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500">รวมทั้งสิ้น</span>
                <span className="text-base font-black text-slate-900">฿{total}</span>
              </div>
              <div className="mt-2 rounded-lg bg-primary py-2 text-center text-[10px] font-black text-white">
                ชำระเงิน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating stat chips */}
      <div className="absolute -left-3 bottom-8 hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-[10px] font-semibold text-slate-400">ยอดขายวันนี้</p>
        <p className="text-lg font-black text-slate-900">฿12,480</p>
        <p className="text-[10px] font-bold text-emerald-500">▲ 18% จากเมื่อวาน</p>
      </div>

      <div className="absolute -right-3 top-16 hidden items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-xl sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
          <ChefHat className="h-4 w-4 text-orange-600" />
        </span>
        <div>
          <p className="text-[10px] font-bold text-slate-700">ครัวรับออเดอร์</p>
          <p className="text-[9px] text-slate-400">3 รายการกำลังทำ</p>
        </div>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-accent),transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              ระบบ POS สำหรับร้านอาหารยุคใหม่
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              ยกระดับร้านอาหารของคุณด้วย{' '}
              <span className="text-primary">ChabaPOS</span>{' '}
              ระบบจัดการร้านครบวงจร
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500 lg:mx-0 sm:text-lg">
              บริหารหน้าร้าน, จัดการคลังสินค้า, ระบบจอครัว (KDS) และรองรับหลายสาขาในระบบเดียว
              ใช้งานง่ายบนทุกอุปกรณ์
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/register"
                className={cn(
                  buttonVariants({ variant: 'default' }),
                  'h-13 gap-2 px-7 text-base font-bold shadow-lg shadow-primary/25',
                  'transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30',
                )}
              >
                เริ่มต้นใช้งานฟรี
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-13 px-7 text-base font-bold transition-all hover:-translate-y-0.5',
                )}
              >
                ดูแพ็กเกจราคา
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
              {['ไม่มีค่าติดตั้ง', 'ทดลองใช้ฟรี', 'ยกเลิกได้ทุกเมื่อ'].map(t => (
                <span key={t} className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Check className="h-4 w-4 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup */}
          <div className="lg:pl-4">
            <PosMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Laptop,
    title: 'Cloud-Based & Multi-device',
    desc: 'ใช้งานได้ทุกที่ ผ่านมือถือ แท็บเล็ต หรือคอมพิวเตอร์ ไม่ต้องลงทุนฮาร์ดแวร์แพงๆ',
    tone: 'bg-sky-50 text-sky-600',
  },
  {
    icon: ChefHat,
    title: 'Smart KDS',
    desc: 'ระบบจอครัวอัจฉริยะ ออเดอร์วิ่งตรงถึงเตาทันที ไม่มีตกหล่น ลดข้อผิดพลาดหน้าร้าน',
    tone: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Package,
    title: 'Real-time Inventory',
    desc: 'ตัดสต๊อกแม่นยำทุกออเดอร์ พร้อมแจ้งเตือนเมื่อวัตถุดิบใกล้หมด ไม่ต้องนับเอง',
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Building2,
    title: 'Multi-Branch Management',
    desc: 'ดูแลกี่สาขาก็ง่าย เปรียบเทียบยอดขายและจัดการทุกอย่างได้จาก Dashboard เดียว',
    tone: 'bg-violet-50 text-violet-600',
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-slate-100 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            ทำไมร้านอาหารยุคใหม่ถึงเลือกใช้ ChabaPOS
          </h2>
          <p className="mt-4 text-base text-slate-500 sm:text-lg">
            ครบทุกเครื่องมือที่ร้านต้องใช้จริง ในระบบเดียว ไม่ต้องต่อหลายโปรแกรม
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className={cn(
                'group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm',
                'transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-xl',
              )}
            >
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                f.tone,
              )}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-black text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bottom CTA ───────────────────────────────────────────────────────────────

function BottomCta() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-900 px-6 py-16 text-center shadow-2xl sm:px-12">
        {/* Decorative glows */}
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative">
          <h2 className="text-3xl font-black leading-snug tracking-tight text-white sm:text-4xl">
            พร้อมที่จะจัดการร้านให้เป็นระบบแล้วหรือยัง?
          </h2>
          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            สมัครวันนี้ใช้งานฟรี ไม่มีค่าติดตั้ง เริ่มขายได้ภายในไม่กี่นาที
          </p>

          <Link
            to="/register"
            className={cn(
              buttonVariants({ variant: 'default' }),
              'mt-9 h-13 gap-2 bg-white px-8 text-base font-black text-slate-900',
              'transition-all hover:-translate-y-0.5 hover:bg-slate-100 [a]:hover:bg-slate-100',
            )}
          >
            สร้างบัญชีร้านค้า
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">

          <div className="text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white">
                C
              </span>
              <span className="text-lg font-black tracking-tight text-slate-900">ChabaPOS</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              ระบบจัดการร้านอาหารครบวงจร สำหรับร้านเดียวจนถึงหลายสาขา
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 md:items-start">
            <p className="text-sm font-black text-slate-900">ติดต่อเรา</p>
            <a href="mailto:support@chabapos.com"
              className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-primary">
              <Mail className="h-4 w-4" />
              support@chabapos.com
            </a>
            <a href="tel:0800000000"
              className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-primary">
              <Phone className="h-4 w-4" />
              080-000-0000
            </a>
          </div>

          <div className="flex flex-col items-center gap-3 md:items-start">
            <p className="text-sm font-black text-slate-900">เมนู</p>
            <a href="#features" className="text-sm text-slate-500 transition-colors hover:text-primary">ฟีเจอร์</a>
            <Link to="/pricing" className="text-sm text-slate-500 transition-colors hover:text-primary">แพ็กเกจราคา</Link>
            <Link to="/register" className="text-sm text-slate-500 transition-colors hover:text-primary">สมัครใช้งาน</Link>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6 text-center">
          <p className="text-sm text-slate-400">© 2026 ChabaPOS. สงวนลิขสิทธิ์ทุกประการ</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <BottomCta />
      </main>
      <Footer />
    </div>
  );
}
