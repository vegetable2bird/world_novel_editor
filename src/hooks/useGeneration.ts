import { useWorkStore } from '../store/workStore';
import type { GenerateChapterOptions } from '../types/ai';

/**
 * 生成 Hook：封装 generationSlice 的状态与动作，供 GenerationPanel 等组件调用。
 */
export function useGeneration() {
  const generating = useWorkStore((s) => s.generating);
  const offlineMode = useWorkStore((s) => s.offlineMode);
  const error = useWorkStore((s) => s.lastGenerationError);
  const generateChapter = useWorkStore((s) => s.generateChapter);
  const clearError = useWorkStore((s) => s.clearGenerationError);

  const generate = (worldId: string, opts?: GenerateChapterOptions) =>
    generateChapter(worldId, opts);

  return { generating, offlineMode, error, generate, clearError };
}
