import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  QrCode,
  Table as TableIcon,
  Banknote,
  Package,
  Gift,
  Bike,
  Settings,
  Clock,
} from 'lucide-react';

// ── Feature Key Registry ──────────────────────────────────────────────────────

export const FEATURES = {
  INVENTORY:       'INVENTORY',
  MARKETING:       'MARKETING',
  DELIVERY:        'DELIVERY',
  REPORTS:         'REPORTS',
  KITCHEN_DISPLAY: 'KITCHEN_DISPLAY',
  STAFF_ORDER:     'STAFF_ORDER',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

// ── Nav Item Config ───────────────────────────────────────────────────────────

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  featureKey?: FeatureKey;
}

// ── Feature Metadata (labels + descriptions for UI) ──────────────────────────

export interface FeatureMeta {
  name: string;
  description: string;
}

export const FEATURE_LABELS: Record<FeatureKey, FeatureMeta> = {
  INVENTORY:       { name: 'จัดการคลังสินค้า',    description: 'ติดตามสต็อก วัตถุดิบ และใบสั่งซื้อ' },
  MARKETING:       { name: 'โปรโมชั่นและสมาชิก',  description: 'โปรโมชั่น สะสมแต้ม และระบบสมาชิก' },
  DELIVERY:        { name: 'ออเดอร์ Delivery',     description: 'เชื่อมต่อแพลตฟอร์ม Delivery ทุกเจ้า' },
  REPORTS:         { name: 'รายงานการขาย',         description: 'วิเคราะห์ยอดขาย กำไร และสินค้าขายดี' },
  KITCHEN_DISPLAY: { name: 'จอครัว (KDS)',         description: 'หน้าจอแสดงออเดอร์ Real-time สำหรับครัว' },
  STAFF_ORDER:     { name: 'ออเดอร์จากพนักงาน',   description: 'พนักงานสั่งอาหารให้ลูกค้าแทน' },
};

/**
 * Single source of truth for the sidebar navigation.
 * Items without `featureKey` are always accessible.
 * Items with `featureKey` are locked unless the branch's plan includes that key.
 */
export const NAV_ITEMS: NavItem[] = [
  { name: 'ภาพรวม',                 path: '',                 icon: LayoutDashboard },
  { name: 'เปิด/ปิดกะ',             path: 'shifts',           icon: Clock },
  { name: 'สั่งอาหารแบบชำระทันที',   path: 'counter-service',  icon: QrCode },
  { name: 'เปิดโต๊ะสั่งอาหาร',       path: 'tables',           icon: TableIcon },
  { name: 'การชำระเงิน',             path: 'payment',          icon: Banknote },
  { name: 'จัดการคลังสินค้า',        path: 'inventory',        icon: Package,  featureKey: FEATURES.INVENTORY },
  { name: 'โปรโมชั่นและสมาชิก',      path: 'marketing',        icon: Gift,     featureKey: FEATURES.MARKETING },
  { name: 'ออเดอร์ Delivery',        path: 'delivery-service', icon: Bike,     featureKey: FEATURES.DELIVERY },
  { name: 'ตั้งค่าสาขา',             path: 'settings',         icon: Settings },
];
