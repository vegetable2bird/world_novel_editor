/**
 * AI  Provider / 请求 / 响应 / 生成记录数据模型。
 * 注意：前端只持有 AIRequest 的组装与发送，真实密钥只在后端 server/.env。
 */

/** 支持的 AI 提供方 */
export type AIProviderName = 'openai' | 'deepseek' | 'claude';

/** Provider 配置（仅描述用，含于后端选择；密钥不在前端） */
export interface AIProviderConfig {
  provider: AIProviderName;
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
}

/** 三段式 AI 请求体 */
export interface AIRequest {
  worldId: string;
  chapterId?: string;
  /** 段1：世界观上下文 */
  contextBlock: string;
  /** 段2：操作与叙事推演摘要 */
  operationBlock: string;
  /** 段3：描写风格 */
  styleBlock: string;
  systemPrompt?: string;
}

/** AI 响应 */
export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/** AI 生成记录（用于追溯某版本由哪次请求产生） */
export interface AIGenerationRecord {
  id: string;
  worldId: string;
  chapterId: string;
  request: AIRequest;
  response: AIResponse;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

/** 生成章节的可选参数 */
export interface GenerateChapterOptions {
  chapterId?: string;
  /** 提示后端优先使用的 provider（最终由后端密钥决定） */
  providerHint?: AIProviderName;
  targetWords?: number;
  /** 目标作品（卷）id；缺省取当前激活作品 */
  bookId?: string;
  /** 本章创作意图 / 大纲，将并入生成提示（作者意图优先于操作推演段） */
  outline?: string;
}

/** 前端可读的 AI 配置视图（不含密钥）。 */
export interface AISettingsView {
  provider: string;
  baseURL: string;
  model: string;
  hasKey: boolean;
}

/** 保存 AI 配置时前端发送的内容（密钥仅发往后端）。 */
export interface AISettingsPayload {
  provider: string;
  baseURL?: string;
  model: string;
  apiKey?: string;
}
