import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Kitchen {
  id: number;
  name: string;
  branchId: number;
}

export function useKitchens(branchId?: number) {
  const queryClient = useQueryClient();

  const kitchensQuery = useQuery({
    queryKey: ['kitchens', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<Kitchen[]>(`/kitchens?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: async (newKitchen: { name: string; branchId: number }) => {
      const res = await api.post('/kitchens', newKitchen);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchens', branchId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/kitchens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchens', branchId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await api.patch(`/kitchens/${id}`, { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchens', branchId] });
    },
  });

  return {
    kitchens: kitchensQuery.data || [],
    isLoading: kitchensQuery.isLoading,
    createKitchen: createMutation.mutateAsync,
    updateKitchen: updateMutation.mutateAsync,
    deleteKitchen: deleteMutation.mutateAsync,
  };
}
