import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreateVolumeInput, UpdateVolumeInput, Volume } from '../api/types';

/** 某部作品下的分卷（书 → 卷 → 章） */
export function useVolumes(bookId?: string) {
  return useQuery<Volume[]>({
    queryKey: ['volumes', bookId ?? 'none'],
    queryFn: () => api.get<Volume[]>(`/books/${bookId}/volumes`),
    enabled: !!bookId,
  });
}

export function useCreateVolume(bookId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVolumeInput) => api.post<Volume>(`/books/${bookId}/volumes`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes', bookId ?? 'none'] });
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useUpdateVolume(bookId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateVolumeInput & { id: string }) =>
      api.put<Volume>(`/volumes/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes', bookId ?? 'none'] });
    },
  });
}

/** 删卷不删章：后端会把卷内章节移出分卷 */
export function useDeleteVolume(bookId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/volumes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volumes', bookId ?? 'none'] });
      qc.invalidateQueries({ queryKey: ['chapters', bookId ?? 'none'] });
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
