import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Table {
  id: number;
  name: string;
  qrCode: string;
  zoneId: number;
}

export interface Zone {
  id: number;
  name: string;
  branchId: number;
  tables: Table[];
}

export function useTables(branchId?: number) {
  const queryClient = useQueryClient();

  const zonesQuery = useQuery({
    queryKey: ['zones', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<Zone[]>(`/zones?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const createZoneMutation = useMutation({
    mutationFn: async (newZone: { name: string; branchId: number }) => {
      const res = await api.post('/zones', newZone);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (newTable: { name: string; zoneId: number }) => {
      const res = await api.post('/tables', newTable);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  const getQRCode = async (tableId: number) => {
    const res = await api.get<{ qrCode: string }>(`/tables/${tableId}/qrcode`);
    return res.data.qrCode;
  };

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string }) => {
      const res = await api.patch(`/zones/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; zoneId?: number }) => {
      const res = await api.patch(`/tables/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones', branchId] });
    },
  });

  return {
    zones: zonesQuery.data || [],
    isLoading: zonesQuery.isLoading,
    createZone: createZoneMutation.mutateAsync,
    updateZone: updateZoneMutation.mutateAsync,
    deleteZone: deleteZoneMutation.mutateAsync,
    createTable: createTableMutation.mutateAsync,
    updateTable: updateTableMutation.mutateAsync,
    deleteTable: deleteTableMutation.mutateAsync,
    getQRCode,
  };
}
