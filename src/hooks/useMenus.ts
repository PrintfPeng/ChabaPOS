import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Category {
  id: number;
  name: string;
  branchId: number;
  order: number;
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
    mutationFn: async (newItem: Omit<MenuItem, 'id'> & { optionGroupIds?: number[] }) => {
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

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; price?: number; categoryId?: number; kitchenId?: number; imageUrl?: string; optionGroupIds?: number[] }) => {
      const res = await api.patch(`/menus/items/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems', branchId] });
    },
  });

  return {
    categories: categoriesQuery.data || [],
    menuItems: menuItemsQuery.data || [],
    isLoading: categoriesQuery.isLoading || menuItemsQuery.isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createMenuItem: createMenuItemMutation.mutateAsync,
    updateMenuItem: updateMenuItemMutation.mutateAsync,
    deleteMenuItem: deleteMenuItemMutation.mutateAsync,
  };
}
