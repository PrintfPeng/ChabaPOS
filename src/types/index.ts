export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

export interface Brand {
  id: string;
  ownerId: string;
  name: string;
  logo?: string;
  createdAt: string;
}

export interface Branch {
  id: string;
  brandId: string;
  ownerId: string;
  name: string;
  image?: string;
  address?: string;
  createdAt: string;
}

export interface Kitchen {
  id: string;
  branchId: string;
  name: string;
  createdAt: string;
}

export interface Category {
  id: string;
  branchId: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  branchId: string;
  categoryId: string;
  kitchenId?: string;
  name: string;
  price: number;
  image?: string;
  optionGroupIds?: string[];
  createdAt: string;
}

export interface OptionGroup {
  id: string;
  branchId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
}

export interface OptionChoice {
  id: string;
  optionGroupId: string;
  name: string;
  additionalPrice: number;
}

export interface Zone {
  id: string;
  branchId: string;
  name: string;
}

export interface Table {
  id: string;
  zoneId: string;
  branchId: string;
  name: string;
  status: 'available' | 'occupied';
}
