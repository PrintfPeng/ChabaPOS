import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Brand {
  id: number;
  name: string;
  imageUrl?: string;
  _count?: {
    branches: number;
  };
}

export function useBrands() {
  const queryClient = useQueryClient();

  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get<Brand[]>('/brands');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newBrand: { name: string; imageUrl?: string }) => {
      const res = await api.post('/brands', newBrand);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Brand> & { id: number }) => {
      const res = await api.patch(`/brands/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });

  return {
    brands: brandsQuery.data || [],
    isLoading: brandsQuery.isLoading,
    createBrand: createMutation.mutateAsync,
    updateBrand: updateMutation.mutateAsync,
    deleteBrand: deleteMutation.mutateAsync,
  };
}
