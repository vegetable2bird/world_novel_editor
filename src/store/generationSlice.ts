import type { StateCreator } from 'zustand';
import type { WorkStore, GenerationSlice } from './types';
import type { AIGenerationRecord, GenerateChapterOptions } from '../types/ai';
import { newId, nowISO } from '../utils/id';
import { withBundle } from './mutate';
import {
  createAIProvider,
  AIKeyMissingError,
  NetworkError,
  assembleAIRequest,
  composeMockChapter,
} from '../services/ai';

/**
 * 生成 Slice：三段式组装 -> 调后端代理 -> 落地章节/版本/生成记录。
 * 关键：若后端未配置密钥或无法连接，优雅降级为离线演示稿（mock），保证主循环可完整体验。
 */
export const createGenerationSlice: StateCreator<WorkStore, [], [], GenerationSlice> = (
  set,
  get,
) => ({
  generating: false,
  offlineMode: false,
  lastGenerationError: undefined,

  generateChapter: async (
    worldId: string,
    opts?: GenerateChapterOptions,
  ): Promise<string | null> => {
    const bundle0 = get().worlds[worldId];
    if (!bundle0) {
      set({ lastGenerationError: '世界不存在，无法生成章节', generating: false });
      return null;
    }
    set({ generating: true, offlineMode: false, lastGenerationError: undefined });

    // 1) 确定/创建目标章节（归属于当前激活作品）
    let chapterId = opts?.chapterId;
    const activeBookId =
      opts?.bookId ?? get().currentBookId ?? Object.keys(bundle0.books)[0] ?? undefined;
    if (!chapterId) {
      const siblings = Object.values(bundle0.chapters).filter(
        (c) => c.bookId === activeBookId,
      );
      const nextIndex = siblings.reduce((m, c) => Math.max(m, c.index), 0) + 1;
      chapterId = get().createChapter(worldId, {
        title: `第 ${nextIndex} 章`,
        index: nextIndex,
        bookId: activeBookId,
      });
    }
    const chapter = get().worlds[worldId]?.chapters[chapterId];
    if (!chapter) {
      set({ generating: false, lastGenerationError: '章节创建失败' });
      return null;
    }
    const index = chapter.index;
    const targetWords = opts?.targetWords ?? 2000;
    // 创作意图：优先用调用方传入的大纲，否则取章节自身已有大纲
    const outline = opts?.outline ?? chapter.outline;

    // 2) 组装三段式请求（contextBlock + operationBlock + styleBlock，融入作品感知上下文）
    const freshBundle = get().worlds[worldId]!;
    const style = get().getGlobalStyle(worldId);
    const request = assembleAIRequest({
      bundle: freshBundle,
      style,
      index,
      targetWords,
      chapterId,
      bookId: activeBookId,
      outline,
    });

    // 3) 调用后端 / 兜底
    let content: string;
    let providerLabel = 'mock';
    let modelLabel = 'offline-demo';
    let failed = false;
    let genError: string | undefined;

    try {
      const provider = createAIProvider();
      const resp = await provider.generate(request);
      content = resp.content;
      providerLabel = resp.provider;
      modelLabel = resp.model;
    } catch (err) {
      failed = true;
      if (err instanceof AIKeyMissingError || err instanceof NetworkError) {
        providerLabel = 'offline';
      } else {
        genError = err instanceof Error ? err.message : String(err);
      }
      content = composeMockChapter({
        worldName: freshBundle.world.name,
        tone: style?.tone ?? '史诗奇幻',
        operationSummary: freshBundle.lastOperationResult?.narrativeSummary ?? '',
        selectedDirectionLabel: freshBundle.directionOptions.find(
          (d) => d.id === freshBundle.selectedDirectionId,
        )?.label,
        requiredForeshadows: style?.requiredForeshadows ?? [],
        targetWords,
      });
    }

    // 4) 持久化：生成记录 + 章节版本 + 时间线事件
    const recordId = newId('gen');
    const record: AIGenerationRecord = {
      id: recordId,
      worldId,
      chapterId,
      request,
      response: { content, provider: providerLabel, model: modelLabel },
      status: failed ? 'failed' : 'success',
      createdAt: nowISO(),
    };
    get().saveChapterVersion(worldId, chapterId, {
      content,
      source: 'ai',
      generationRecordId: recordId,
      note: failed ? '离线演示稿' : 'AI 生成',
    });
    get().logEvent(worldId, {
      title: `AI 生成 · 第${index}章`,
      description: failed
        ? '离线演示模式生成示意稿'
        : `由 ${providerLabel}/${modelLabel} 生成`,
      type: 'generation',
      chapterId,
    });

    set((state) =>
      withBundle(state, worldId, (b) => ({
        ...b,
        generationRecords: { ...b.generationRecords, [recordId]: record },
      })),
    );
    set({ generating: false, offlineMode: failed, lastGenerationError: genError });

    return chapterId;
  },

  clearOfflineMode: () => set({ offlineMode: false }),
  clearGenerationError: () => set({ lastGenerationError: undefined }),
});
