import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { handleGenerate } from './aiProxy';
import { getConfigView, saveAIConfigPayload } from './aiConfig';

/**
 * 后端轻代理入口：仅暴露 /api/ai/generate（持有密钥），前端不直接持有任何密钥。
 */
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT) || 8787;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// AI 模型配置（密钥仅在后端保存，前端只读非敏感字段）
app.get('/api/settings/ai', (_req, res) => {
  const view = getConfigView();
  res.json(view ?? { provider: '', baseURL: '', model: '', hasKey: false });
});

app.post('/api/settings/ai', (req, res) => {
  try {
    const { provider, baseURL, model, apiKey } = req.body || {};
    if (!provider || !model) {
      res.status(400).json({ error: 'INVALID', message: 'provider 与 model 必填' });
      return;
    }
    saveAIConfigPayload({ provider, baseURL, model, apiKey });
    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({ error: 'SAVE_FAILED', message: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/ai/generate', handleGenerate);

app.listen(PORT, () => {
  console.log(`[server] AI 代理已启动：http://localhost:${PORT}`);
  console.log('[server] 若未配置密钥，前端将自动降级为离线演示模式。');
});
