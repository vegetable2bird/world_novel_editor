import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  WorldTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  ForkTemplateResult,
} from '../api/types';

export function useTemplates(scope?: 'mine' | 'public' | 'all') {
  return useQuery<WorldTemplate[]>({
    queryKey: ['templates', scope ?? 'all'],
    queryFn: () => api.get<WorldTemplate[]>(`/templates?scope=${scope ?? 'all'}`),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTemplateInput) => api.post<WorldTemplate>('/templates', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTemplateInput & { id: string }) =>
      api.put<WorldTemplate>(`/templates/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useForkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      api.post<ForkTemplateResult>(`/templates/${id}/fork`, name ? { name } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worlds'] }),
  });
}
