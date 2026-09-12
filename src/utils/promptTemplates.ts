/**
 * 三段式 Prompt 模板常量（架构文档 7.3 节）。
 * 生成链路严格按：contextBlock(世界观) + operationBlock(操作推演) + styleBlock(风格) 组装。
 */

/** 系统提示词：定义代笔角色与硬约束（遵循世界观、不静默偏离）。 */
export function buildSystemPrompt(tone: string, chapterIndex: number, targetWords: number): string {
  return (
    `你是${tone || '史诗奇幻'}风格的小说代笔。严格遵循下方【世界观上下文】，` +
    `不得违背已设定规则；若发生冲突必须显式提示，不得静默偏离。` +
    `请输出第${chapterIndex}章的正文（Markdown 格式），约 ${targetWords} 字。`
  );
}

export const CONTEXT_BLOCK_HEADER = '【第一部分 · 世界观上下文 / Lorebook】';
export const OPERATION_BLOCK_HEADER = '【第二部分 · 操作与叙事推演】';
export const STYLE_BLOCK_HEADER = '【第三部分 · 描写风格】';

export const CONSTRAINT_FOOTER =
  '【约束】首尾不要解释、不输出元说明；严格回收 requiredForeshadows 中列出的伏笔；' +
  '保持文风与给定风格一致；输出纯正文（Markdown），不要附带"第X章"标题之外的解释文本。';

export const PROMPT_SECTION_SEPARATOR = '\n\n---\n\n';

/**
 * 后端将三段式块拼装为最终 user prompt 的模板。
 * （前端只负责产出三个 block，后端负责拼装并调用模型，密钥不进前端。）
 */
export function assembleUserPrompt(
  contextBlock: string,
  operationBlock: string,
  styleBlock: string,
): string {
  return [
    CONTEXT_BLOCK_HEADER,
    contextBlock,
    OPERATION_BLOCK_HEADER,
    operationBlock,
    STYLE_BLOCK_HEADER,
    styleBlock,
    CONSTRAINT_FOOTER,
  ].join(PROMPT_SECTION_SEPARATOR);
}
