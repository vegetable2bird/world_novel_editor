/**
 * AI 提供方预设（前端设置面板用）。
 * 除 Claude 外，其余均为 OpenAI 兼容接口（baseURL + /chat/completions），
 * 国产模型只需在后端用对应 baseURL + model 即可调用。
 */
export interface AIProviderPreset {
  key: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  domestic: boolean;
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  { key: 'deepseek', label: 'DeepSeek（深度求索）', baseURL: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', domestic: true },
  { key: 'qwen', label: '通义千问 Qwen（阿里）', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-plus', domestic: true },
  { key: 'glm', label: '智谱 GLM（Zhipu）', baseURL: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4-plus', domestic: true },
  { key: 'doubao', label: '豆包 / 火山方舟（字节）', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-pro-32k', domestic: true },
  { key: 'kimi', label: 'Kimi / Moonshot（月之暗面）', baseURL: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k', domestic: true },
  { key: 'minimax', label: 'MiniMax（稀宇）', baseURL: 'https://api.minimax.chat/v1', defaultModel: 'abab6.5s-chat', domestic: true },
  { key: 'step', label: '阶跃 StepFun', baseURL: 'https://api.stepfun.com/v1', defaultModel: 'step-1v-mini', domestic: true },
  { key: 'baichuan', label: '百川 Baichuan', baseURL: 'https://api.baichuan-ai.com/v1', defaultModel: 'baichuan4', domestic: true },
  { key: 'openai', label: 'OpenAI', baseURL: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', domestic: false },
  { key: 'claude', label: 'Claude（Anthropic）', baseURL: '', defaultModel: 'claude-3-5-sonnet-20241022', domestic: false },
];
