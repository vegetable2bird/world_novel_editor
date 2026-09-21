import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Chapter, ChapterListItem, CreateChapterInput, UpdateChapterInput } from '../api/types';

export function useChapters(bookId?: string) {
  return useQuery<ChapterListItem[]>({
    queryKey: ['chapters', bookId ?? 'none'],
    queryFn: () => api.get<ChapterListItem[]>(`/books/${bookId}/chapters`),
    enabled: !!bookId,
  });
}

export function useChapter(id?: string) {
  return useQuery<Chapter>({
    queryKey: ['chapter', id ?? 'none'],
    queryFn: () => api.get<Chapter>(`/chapters/${id}`),
    enabled: !!id,
  });
}

export function useCreateChapter(bookId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChapterInput) => api.post<Chapter>(`/books/${bookId}/chapters`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters', bookId ?? 'none'] });
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateChapterInput & { id: string }) =>
      api.put<Chapter>(`/chapters/${id}`, body),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ['chapter', ch.id] });
      qc.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}

export function useDeleteChapter(bookId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/chapters/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters', bookId ?? 'none'] });
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
