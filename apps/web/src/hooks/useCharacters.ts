import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Character, CreateCharacterInput, UpdateCharacterInput } from '../api/types';

export function useCharacters() {
  return useQuery<Character[]>({
    queryKey: ['characters'],
    queryFn: () => api.get<Character[]>('/characters'),
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCharacterInput) => api.post<Character>('/characters', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCharacterInput & { id: string }) =>
      api.put<Character>(`/characters/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/characters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}
