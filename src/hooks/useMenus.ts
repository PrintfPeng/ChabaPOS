import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Category {
  id: number;
  name: string;
  branchId: number;
  order: number;
}

export interface DeliveryPlatform {
  id: number;
  name: string;
  branchId: number;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId: number;
  branchId: number;
  kitchenId?: number;
  optionGroups?: any[];
  deliveryPrices?: { id: number; menuItemId: number; deliveryPlatformId: number; price: number }[];
  isDeliveryAvailable?: boolean;
}

export function useMenus(branchId?: number) {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<Category[]>(`/menus/categories?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const menuItemsQuery = useQuery({
    queryKey: ['menuItems', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<MenuItem[]>(`/menus/items?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const deliveryPlatformsQuery = useQuery({
    queryKey: ['deliveryPlatforms', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<DeliveryPlatform[]>(`/menus/delivery-platforms?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory: { name: string; branchId: number }) => {
      const res = await api.post('/menus/categories', newCategory);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', branchId] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/menus/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', branchId] });
    },
  });

  const createMenuItemMutation = useMutation({
    // `deliveryPrices` is omitted from MenuItem before intersecting: the stored
    // shape (with row ids) and the payload shape are different, and intersecting
    // them would demand both at once.
    mutationFn: async (newItem: Omit<MenuItem, 'id' | 'deliveryPrices'> & { optionGroupIds?: number[]; deliveryPrices?: { platformId: number; price: number }[] }) => {
      const res = await api.post('/menus/items', newItem);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/menus/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string }) => {
      const res = await api.patch(`/menus/categories/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', branchId] });
    },
  });

  const bulkUpdateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ branchId: bid, enabledIds }: { branchId: number; enabledIds: number[] }) => {
      const res = await api.patch('/menus/bulk-delivery-status', { branchId: bid, enabledIds });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; price?: number; categoryId?: number; kitchenId?: number; imageUrl?: string; optionGroupIds?: number[]; deliveryPrices?: { platformId: number; price: number }[]; isDeliveryAvailable?: boolean }) => {
      const res = await api.patch(`/menus/items/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  const createDeliveryPlatformMutation = useMutation({
    mutationFn: async (newPlatform: { name: string; branchId: number }) => {
      const res = await api.post('/menus/delivery-platforms', newPlatform);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPlatforms', branchId] });
    },
  });

  const deleteDeliveryPlatformMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/menus/delivery-platforms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPlatforms', branchId] });
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  const updateDeliveryPlatformMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string }) => {
      const res = await api.patch(`/menus/delivery-platforms/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryPlatforms', branchId] });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    menuItems: menuItemsQuery.data || [],
    deliveryPlatforms: deliveryPlatformsQuery.data || [],
    isLoading: categoriesQuery.isLoading || menuItemsQuery.isLoading || deliveryPlatformsQuery.isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createMenuItem: createMenuItemMutation.mutateAsync,
    updateMenuItem: updateMenuItemMutation.mutateAsync,
    deleteMenuItem: deleteMenuItemMutation.mutateAsync,
    createDeliveryPlatform: createDeliveryPlatformMutation.mutateAsync,
    updateDeliveryPlatform: updateDeliveryPlatformMutation.mutateAsync,
    deleteDeliveryPlatform: deleteDeliveryPlatformMutation.mutateAsync,
    bulkUpdateDeliveryStatus: bulkUpdateDeliveryStatusMutation.mutateAsync,
  };
}

