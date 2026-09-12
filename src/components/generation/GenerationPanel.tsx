import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  TextField,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorld, useCurrentWorldId } from '../../hooks/useWorldState';
import { useGeneration } from '../../hooks/useGeneration';
import GenerationPreview from './GenerationPreview';

/**
 * 生成面板：基于"世界观上下文 + 操作推演 + 风格参数"三段式，调用后端 AI 生成章节。
 * 未配置密钥时优雅降级为离线演示稿，并明确提示。
 */
export default function GenerationPanel(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const { generating, offlineMode, error, generate, clearError } = useGeneration();
  const [targetWords, setTargetWords] = useState(2000);

  const style = useWorkStore((s) =>
    worldId
      ? Object.values(s.worlds[worldId]?.styleConfigs ?? {}).find(
          (c) => c.scope === 'global',
        )
      : undefined,
  );

  const chapters = world ? Object.values(world.chapters) : [];
  const latest = [...chapters].sort((a, b) => b.index - a.index)[0];
  const version = latest && world ? world.chapterVersions[latest.currentVersionId] : undefined;

  const handleGenerate = async () => {
    if (!worldId) return;
    await generate(worldId, { targetWords });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <AutoAwesomeIcon color="primary" />
        <Typography variant="subtitle1">AI 生成章节</Typography>
      </Stack>

      {style && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          <Chip size="small" label={`文风·${style.tone}`} />
          <Chip size="small" label={`视角·${style.pov}`} />
          <Chip size="small" label={`节奏·${style.pacing}`} />
        </Stack>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          size="small"
          type="number"
          label="目标字数"
          value={targetWords}
          onChange={(e) => setTargetWords(Number(e.target.value))}
          sx={{ width: 130 }}
        />
        <Button
          variant="contained"
          startIcon={
            generating ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AutoAwesomeIcon />
            )
          }
          disabled={generating || !worldId}
          onClick={handleGenerate}
        >
          {generating ? '生成中…' : '生成章节'}
        </Button>
      </Stack>

      {offlineMode && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          当前为<b>离线演示模式</b>（未配置 AI 密钥），展示的是按规则拼装的示意稿。配置后端密钥后即真实 AI 生成。
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary">
        预览：{latest ? latest.title : '尚无章节'}
      </Typography>
      <Box sx={{ mt: 1, maxHeight: 380, overflow: 'auto' }}>
        {version ? (
          <GenerationPreview content={version.content} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            在执行操作并生成后，正文将显示在此处，可一键进入编辑器审阅修订。
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
