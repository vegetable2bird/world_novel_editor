import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { AI_PROVIDER_PRESETS } from '../../constants/aiProviders';
import { getAISettings, saveAISettings } from '../../services/ai/aiSettings';
import type { AISettingsView } from '../../types/ai';

/**
 * AI 模型配置面板（设置页）。
 * 支持国产/国际模型（OpenAI 兼容）。密钥仅发往后端，前端不持有。
 */
export default function AIModelConfigPanel(): JSX.Element {
  const [cfg, setCfg] = useState<{
    provider: string;
    baseURL: string;
    model: string;
    apiKey: string;
  }>({ provider: 'deepseek', baseURL: '', model: '', apiKey: '' });
  const [status, setStatus] = useState<{
    type: 'info' | 'success' | 'error';
    msg: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAISettings()
      .then((v: AISettingsView) => {
        setCfg((c) => ({
          ...c,
          provider: v.provider || c.provider,
          baseURL: v.baseURL || '',
          model: v.model || '',
          apiKey: '', // 不回显密钥
        }));
      })
      .catch(() =>
        setStatus({ type: 'error', msg: '读取当前配置失败，请确认后端已启动（npm run dev）。' }),
      );
  }, []);

  const onProviderChange = (key: string) => {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.key === key);
    setCfg((c) => ({
      ...c,
      provider: key,
      baseURL: preset ? preset.baseURL : c.baseURL,
      model: preset ? preset.defaultModel : c.model,
    }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveAISettings({
        provider: cfg.provider,
        baseURL: cfg.baseURL || undefined,
        model: cfg.model,
        apiKey: cfg.apiKey || undefined,
      });
      setStatus({ type: 'success', msg: '已保存。密钥仅存于后端，前端不持有。' });
      setCfg((c) => ({ ...c, apiKey: '' }));
    } catch (e) {
      setStatus({ type: 'error', msg: e instanceof Error ? e.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1">AI 模型配置</Typography>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        支持主流国产与国际模型（均走 OpenAI 兼容接口）。密钥仅发送至后端保存，<b>绝不进入前端 bundle</b>。
      </Typography>
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <FormControl fullWidth>
          <InputLabel id="provider-label">模型提供方</InputLabel>
          <Select
            labelId="provider-label"
            label="模型提供方"
            value={cfg.provider}
            onChange={(e) => onProviderChange(e.target.value)}
          >
            {AI_PROVIDER_PRESETS.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
                {p.domestic ? '（国产）' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Base URL"
          value={cfg.baseURL}
          onChange={(e) => setCfg((c) => ({ ...c, baseURL: e.target.value }))}
          placeholder="https://.../v1"
          helperText="OpenAI 兼容接口地址；Claude 可留空"
        />
        <TextField
          label="模型名"
          value={cfg.model}
          onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))}
          placeholder="如 deepseek-chat / qwen-plus"
        />
        <TextField
          label="API Key"
          type="password"
          value={cfg.apiKey}
          onChange={(e) => setCfg((c) => ({ ...c, apiKey: e.target.value }))}
          helperText="留空表示不修改已保存的密钥"
        />
        {status && <Alert severity={status.type}>{status.msg}</Alert>}
        <Box>
          <Button variant="contained" onClick={onSave} disabled={saving || !cfg.model}>
            {saving ? '保存中…' : '保存配置'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
