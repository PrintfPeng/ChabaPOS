import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Branch {
  id: number;
  name: string;
  imageUrl?: string;
  qrCodeUrl?: string;
  brandId: number;
  brand?: {
    id: number;
    name: string;
  };
}

export function useBranches(brandId?: number) {
  const queryClient = useQueryClient();

  const branchesQuery = useQuery({
    queryKey: ['branches', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const res = await api.get<Branch[]>(`/brands/${brandId}/branches`);
      return res.data;
    },
    enabled: !!brandId,
  });

  const createMutation = useMutation({
    mutationFn: async (newBranch: { name: string; imageUrl?: string; brandId: number }) => {
      const res = await api.post('/branches', newBranch);
      return res.data;
    },
    // BUG FIX: Immediately update UI without page refresh
    // Using queryClient.invalidateQueries ensures the list is refetched instantly
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', brandId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Branch> & { id: number }) => {
      const res = await api.patch(`/branches/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', brandId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches', brandId] });
    },
  });

  return {
    branches: branchesQuery.data || [],
    isLoading: branchesQuery.isLoading,
    createBranch: createMutation.mutateAsync,
    updateBranch: updateMutation.mutateAsync,
    deleteBranch: deleteMutation.mutateAsync,
  };
}

export function useBranch(id?: number) {
  const queryClient = useQueryClient();
  const branchQuery = useQuery({
    queryKey: ['branch', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get<Branch>(`/branches/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Branch>) => {
      const res = await api.patch(`/branches/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch', id] });
    },
  });

  return {
    branch: branchQuery.data,
    isLoading: branchQuery.isLoading,
    updateBranch: updateMutation.mutateAsync,
  };
}
