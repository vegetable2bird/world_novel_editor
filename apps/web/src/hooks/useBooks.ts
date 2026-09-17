import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Book, CreateBookInput, UpdateBookInput } from '../api/types';

export function useBooks(worldId?: string) {
  return useQuery<Book[]>({
    queryKey: ['books', worldId ?? 'all'],
    queryFn: () => api.get<Book[]>(`/books${worldId ? `?worldId=${worldId}` : ''}`),
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBookInput) => api.post<Book>('/books', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateBookInput & { id: string }) =>
      api.put<Book>(`/books/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/books/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });
}
