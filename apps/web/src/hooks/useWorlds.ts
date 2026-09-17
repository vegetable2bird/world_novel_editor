import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { World, CreateWorldInput, UpdateWorldInput } from '../api/types';

export function useWorlds() {
  return useQuery<World[]>({
    queryKey: ['worlds'],
    queryFn: () => api.get<World[]>('/worlds'),
  });
}

export function useCreateWorld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorldInput) => api.post<World>('/worlds', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worlds'] }),
  });
}

export function useUpdateWorld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateWorldInput & { id: string }) =>
      api.put<World>(`/worlds/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worlds'] }),
  });
}

export function useDeleteWorld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/worlds/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worlds'] }),
  });
}
