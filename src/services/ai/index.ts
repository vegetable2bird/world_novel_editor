import type { AIProviderConfig, AIProviderName } from '../../types/ai';
import {
  OPENAI_DEFAULT,
  DEEPSEEK_DEFAULT,
  OPENAI_LABEL,
  DEEPSEEK_LABEL,
} from './openaiProvider';
import { CLAUDE_DEFAULT, CLAUDE_LABEL } from './claudeProvider';

export * from './provider';
export * from './openaiProvider';
export * from './claudeProvider';
export * from './contextAssembler';
export * from './promptBuilder';

/** 各提供方的默认配置（用于设置页展示与 providerHint）。 */
export const PROVIDER_PRESETS: Record<AIProviderName, AIProviderConfig> = {
  openai: OPENAI_DEFAULT,
  deepseek: DEEPSEEK_DEFAULT,
  claude: CLAUDE_DEFAULT,
};

/** 各提供方的展示名。 */
export const PROVIDER_LABELS: Record<AIProviderName, string> = {
  openai: OPENAI_LABEL,
  deepseek: DEEPSEEK_LABEL,
  claude: CLAUDE_LABEL,
};
