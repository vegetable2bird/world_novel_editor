import type { AISettingsView, AISettingsPayload } from '../../types/ai';

/**
 * 前端 AI 配置服务：只与后端 /api/settings/ai 通信。
 * 读取非敏感视图；保存时密钥仅发往后端，前端不持久化密钥。
 */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export async function getAISettings(): Promise<AISettingsView> {
  const res = await fetch(`${BASE}/api/settings/ai`);
  if (!res.ok) throw new Error('读取 AI 配置失败');
  return (await res.json()) as AISettingsView;
}

export async function saveAISettings(payload: AISettingsPayload): Promise<void> {
  const res = await fetch(`${BASE}/api/settings/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('保存 AI 配置失败');
}
