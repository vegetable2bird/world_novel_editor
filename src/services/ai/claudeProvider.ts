import type { AIProviderConfig } from '../../types/ai';

/**
 * Anthropic Claude 预设。仅作为可选项配置；密钥由后端持有。
 */
export const CLAUDE_DEFAULT: AIProviderConfig = {
  provider: 'claude',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.8,
  maxTokens: 4096,
};

export const CLAUDE_LABEL = 'Anthropic Claude';
