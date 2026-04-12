import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface Option {
  id: number;
  name: string;
  price: number;
  optionGroupId: number;
}

export interface OptionGroup {
  id: number;
  name: string;
  isMultiple: boolean;
  branchId: number;
  options: Option[];
  menuItems?: { id: number }[];
}

export function useOptions(branchId?: number) {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['optionGroups', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const res = await api.get<OptionGroup[]>(`/options?branchId=${branchId}`);
      return res.data;
    },
    enabled: !!branchId,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (newGroup: { name: string; branchId: number; isMultiple?: boolean }) => {
      const res = await api.post('/options/groups', newGroup);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; isMultiple?: boolean; menuItemIds?: number[] }) => {
      const res = await api.patch(`/options/groups/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/options/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  const createOptionMutation = useMutation({
    mutationFn: async (newOption: { name: string; price: number; optionGroupId: number }) => {
      const res = await api.post('/options', newOption);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/options/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; price?: number }) => {
      const res = await api.patch(`/options/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optionGroups', branchId] });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    createGroup: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    createOption: createOptionMutation.mutateAsync,
    updateOption: updateOptionMutation.mutateAsync,
    deleteOption: deleteOptionMutation.mutateAsync,
  };
}
