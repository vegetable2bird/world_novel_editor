import type { AIRequest } from '../../types/ai';
import type { OperationResult } from '../../types/console';
import type { StyleConfig } from '../../types/style';
import type { WorldBundle } from '../../store/types';
import type { Book } from '../../types/book';
import { assembleContext } from './contextAssembler';
import { buildSystemPrompt } from '../../utils/promptTemplates';
import { truncateToWords } from '../../utils/text';

/**
 * 三段式 Prompt 组装器（架构文档 7.3 节）。
 * 严格按：contextBlock(世界观) + operationBlock(操作推演) + styleBlock(风格) 组装为 AIRequest。
 */

/** 段3：风格块。 */
export function buildStyleBlock(
  style?: StyleConfig,
  requiredForeshadows: string[] = [],
): string {
  if (!style) {
    return '文风：史诗奇幻；视角：第三人称限知；节奏：张弛有度；修辞：重白描、少堆砌比喻。';
  }
  const parts: string[] = [];
  parts.push(`- 文风基调：${style.tone || '史诗奇幻'}`);
  parts.push(`- 叙事视角：${style.pov || '第三人称限知'}`);
  parts.push(`- 叙事节奏：${style.pacing || '张弛有度'}`);
  parts.push(`- 修辞偏好：${style.rhetoric || '重白描、少堆砌比喻'}`);
  if (style.forbiddenWritings.length) {
    parts.push(`- 禁用写法：${style.forbiddenWritings.join('；')}`);
  }
  if (requiredForeshadows.length) {
    parts.push(`- 必须回收的伏笔：${requiredForeshadows.join('；')}`);
  }
  return parts.join('\n');
}

/** 段2：操作推演块。 */
export function buildOperationBlock(
  result?: OperationResult,
  selectedDirectionId?: string,
): string {
  if (!result) {
    return '（暂无操作推演结果，请基于世界观自由推进，但须严格遵循世界观上下文与已设定规则。）';
  }
  const lines: string[] = [];
  lines.push(`本次操作推演摘要：${result.narrativeSummary}`);
  if (result.affectedEntityIds.length) {
    lines.push(`受影响实体：${result.affectedEntityIds.length} 个`);
  }
  const deltas = Object.entries(result.variableDeltas);
  if (deltas.length) {
    const dStr = deltas
      .map(([, v]) => `${v >= 0 ? '+' : ''}${v}`)
      .join('，');
    lines.push(`变量变化：${dStr}`);
  }
  const selected = result.proposedDirections.find((d) => d.id === selectedDirectionId);
  if (selected) {
    lines.push(`作者选定走向：「${selected.label}」——${selected.estimatedSummary}`);
  } else if (result.proposedDirections.length) {
    lines.push(
      `候选走向：${result.proposedDirections
        .map((d) => `「${d.label}」`)
        .join('、')}`,
    );
  }
  return lines.join('\n');
}

export interface AssembleRequestInput {
  bundle: WorldBundle;
  style?: StyleConfig;
  index: number;
  targetWords: number;
  chapterId?: string;
  /** 目标作品（卷）id；提供后将并入"作品定位 + 前文回顾"上下文 */
  bookId?: string;
  /** 本章创作意图 / 大纲；提供后将作为"作者意图"并入操作推演段 */
  outline?: string;
}

/**
 * 段1补充：作品定位 + 同作品原文回顾。
 * 让生成的章节"懂"自己属于哪部作品、之前写过什么，从而在同一作品内保持连贯。
 */
export function buildBookContextBlock(input: {
  bundle: WorldBundle;
  bookId?: string;
  /** 当前章节序号，用于回顾序号更小的前文 */
  currentIndex?: number;
  maxWords?: number;
}): string {
  const { bundle, bookId, currentIndex, maxWords = 1000 } = input;
  const book: Book | undefined = bookId ? bundle.books[bookId] : undefined;
  const sections: string[] = [];

  if (book) {
    const chaptersInBook = Object.values(bundle.chapters)
      .filter((c) => c.bookId === book.id)
      .sort((a, b) => a.index - b.index);
    const lines: string[] = [];
    lines.push(`- 作品名：${book.name}`);
    if (book.description) lines.push(`- 作品概要：${book.description}`);
    lines.push(`- 卷序：第 ${book.order + 1} 部`);
    lines.push(
      `- 已撰写章节：${chaptersInBook.length} 章（本章将落点为第 ${currentIndex ?? chaptersInBook.length + 1} 章）`,
    );
    sections.push('## 当前作品定位\n' + lines.join('\n'));

    // 前文回顾：同作品、序号更小的最近若干章
    if (currentIndex != null) {
      const prev = chaptersInBook
        .filter((c) => c.index < currentIndex)
        .sort((a, b) => a.index - b.index)
        .slice(-5);
      if (prev.length > 0) {
        const recap = prev
          .map((c) => {
            const ver = bundle.chapterVersions[c.currentVersionId];
            const head = ver
              ? truncateToWords(
                  ver.content.replace(/[#>*`\-]/g, '').replace(/\s+/g, ' ').trim(),
                  50,
                )
              : '';
            return `- 第${c.index}章《${c.title}》${
              c.outline ? `｜大纲：${c.outline}` : ''
            }${head ? `｜前文：${head}…` : ''}`;
          })
          .join('\n');
        sections.push(`## 前文回顾（同作品最近 ${prev.length} 章）\n${recap}`);
      }
    }
  }

  return sections.length ? truncateToWords(sections.join('\n\n'), maxWords) : '';
}

/** 组装完整 AIRequest（三段式 + 系统提示，融入作品感知上下文）。 */
export function assembleAIRequest(input: AssembleRequestInput): AIRequest {
  const { bundle, style, index, targetWords, chapterId, bookId, outline } = input;

  // 段1：世界观上下文 + 作品定位/前文回顾。提供 bookId 时压缩世界上下文预算以腾出空间。
  const worldContext = assembleContext(bundle, {
    maxWords: bookId ? 1800 : 2500,
  });
  const bookContext = buildBookContextBlock({ bundle, bookId, currentIndex: index });
  const contextBlock = [worldContext, bookContext].filter(Boolean).join('\n\n');

  // 段2：操作推演 + 作者意图（大纲）
  let operationBlock = buildOperationBlock(
    bundle.lastOperationResult,
    bundle.selectedDirectionId,
  );
  if (outline && outline.trim()) {
    operationBlock += `\n\n【本章创作意图／大纲】\n${outline.trim()}`;
  }

  const styleBlock = buildStyleBlock(style, style?.requiredForeshadows ?? []);
  const systemPrompt = buildSystemPrompt(style?.tone ?? '史诗奇幻', index, targetWords);

  return {
    worldId: bundle.world.id,
    chapterId,
    contextBlock,
    operationBlock,
    styleBlock,
    systemPrompt,
  };
}

/**
 * 离线演示模式（未配置密钥 / 无法连接后端）下的示意章节正文生成。
 * 基于"世界观名 + 操作摘要 + 风格参数"拼装，保证无密钥也能完整体验主循环。
 */
export function composeMockChapter(input: {
  worldName: string;
  tone: string;
  operationSummary: string;
  selectedDirectionLabel?: string;
  requiredForeshadows: string[];
  targetWords: number;
}): string {
  const fsLine = input.requiredForeshadows.length
    ? `\n\n（本章须回收的伏笔：${input.requiredForeshadows.join('、')}）`
    : '';
  const directionLine = input.selectedDirectionLabel
    ? `\n\n作者已选定走向：「${input.selectedDirectionLabel}」，叙事将循此脉络展开。`
    : '';
  return [
    `# 第 X 章（离线演示稿）`,
    '',
    `> ⚠️ 当前为**离线演示模式**（未配置 AI 密钥），以下为系统按规则拼装的示意正文，仅用于体验主循环。`,
    '',
    `苍穹之下，\`${input.worldName}\` 的故事以${input.tone}的笔触缓缓铺展。`,
    '',
    input.operationSummary || '世界在静默中酝酿着新的变局。',
    directionLine,
    '',
    `风穿过旷野，命运的丝线在无形中纠缠。各方人物尚不知晓，远方正孕育着足以改变一切的变数。`,
    fsLine,
    '',
    `（配置 API 密钥后，AI 将依据世界观上下文与风格参数，生成约 ${input.targetWords} 字的真实可编辑正文。）`,
  ].join('\n');
}
