import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CharacterInstance, CreateInstanceInput, UpdateInstanceInput } from '../api/types';

// 本作原生角色（挂在具体书下）
export function useInstances(bookId?: string) {
  return useQuery<CharacterInstance[]>({
    queryKey: ['instances', bookId ?? 'all'],
    queryFn: () => api.get<CharacterInstance[]>(`/instances${bookId ? `?bookId=${bookId}` : ''}`),
  });
}

export function useCreateInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInstanceInput) => api.post<CharacterInstance>('/instances', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instances'] }),
  });
}

export function useUpdateInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateInstanceInput & { id: string }) =>
      api.put<CharacterInstance>(`/instances/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instances'] }),
  });
}

export function useDeleteInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/instances/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instances'] }),
  });
}
