import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type {
  WorldEntity,
  EntityRelation,
  TimelineEvent,
  CreateEntityInput,
  CreateRelationInput,
  CreateTimelineInput,
  UpdateTimelineInput,
} from '../api/types';

// ===== 世界实体（势力 / 技能 / 地图 / 通用实体） =====
export function useEntities(worldId?: string, type?: string) {
  return useQuery<WorldEntity[]>({
    queryKey: ['entities', worldId, type],
    enabled: !!worldId,
    queryFn: () =>
      api.get<WorldEntity[]>(
        `/worlds/${worldId}/entities${type ? `?type=${encodeURIComponent(type)}` : ''}`,
      ),
  });
}

export function useCreateEntity(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEntityInput) => api.post<WorldEntity>(`/worlds/${worldId}/entities`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities', worldId] }),
  });
}

export function useUpdateEntity(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<CreateEntityInput> & { id: string }) =>
      api.put<WorldEntity>(`/worlds/entities/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities', worldId] }),
  });
}

export function useDeleteEntity(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/worlds/entities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities', worldId] }),
  });
}

// ===== 实体关系（势力关系网） =====
export function useRelations(worldId?: string) {
  return useQuery<EntityRelation[]>({
    queryKey: ['relations', worldId],
    enabled: !!worldId,
    queryFn: () => api.get<EntityRelation[]>(`/worlds/${worldId}/relations`),
  });
}

export function useCreateRelation(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRelationInput) => api.post<EntityRelation>(`/worlds/${worldId}/relations`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['relations', worldId] }),
  });
}

export function useDeleteRelation(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/worlds/relations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['relations', worldId] }),
  });
}

// ===== 时间线 =====
export function useTimeline(worldId?: string) {
  return useQuery<TimelineEvent[]>({
    queryKey: ['timeline', worldId],
    enabled: !!worldId,
    queryFn: () => api.get<TimelineEvent[]>(`/worlds/${worldId}/timeline`),
  });
}

export function useCreateTimeline(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTimelineInput) => api.post<TimelineEvent>(`/worlds/${worldId}/timeline`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline', worldId] }),
  });
}

export function useUpdateTimeline(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTimelineInput & { id: string }) =>
      api.put<TimelineEvent>(`/worlds/timeline/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline', worldId] }),
  });
}

export function useDeleteTimeline(worldId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/worlds/timeline/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeline', worldId] }),
  });
}
