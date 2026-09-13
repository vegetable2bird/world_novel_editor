import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorld, useCurrentWorldId } from '../../hooks/useWorldState';
import { useGeneration } from '../../hooks/useGeneration';
import { suggestPlotBranches, type PlotSeed } from '../../services/narrative/plotSuggestion';

const SEED_LABEL: Record<PlotSeed, string> = {
  direction: '操作走向',
  foreshadow: '伏笔回收',
  event: '事件余波',
  variable: '局势变量',
  progress: '作品进度',
};

/**
 * 情节推演面板（Plot Suggestion Engine 的 UI 出口）。
 * 基于"世界状态 + 作品进度"给出若干叙事分支建议，作者可一键采纳生成或仅存大纲。
 */
export default function PlotSuggestionPanel(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const currentBookId = useWorkStore((s) => s.currentBookId);
  const createChapter = useWorkStore((s) => s.createChapter);
  const { generating, generate } = useGeneration();
  const navigate = useNavigate();
  // 重新推演：强制刷新分支（引擎带随机 id，可得到新的可选组合）
  const [nonce, setNonce] = useState(0);

  const branches = useMemo(
    () => (world ? suggestPlotBranches(world, currentBookId ?? undefined, { count: 4 }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [world, currentBookId, nonce],
  );

  if (!worldId || !world) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }
  // worldId 经上方守卫已确定非空；显式绑定为 string 以在事件回调闭包中保持收窄
  const wid: string = worldId;

  const handleGenerate = async (outline: string) => {
    const id = await generate(wid, { bookId: currentBookId ?? undefined, outline });
    if (id) navigate(`/chapters/${id}`);
  };

  const handleSaveOutline = (title: string, outline: string) => {
    const id = createChapter(wid, {
      title,
      outline,
      bookId: currentBookId ?? undefined,
    });
    navigate(`/chapters/${id}`);
  };

  const activeBook = currentBookId ? world.books[currentBookId] : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AutoAwesomeIcon fontSize="small" /> 情节推演
          </Typography>
          <Typography variant="caption" color="text.secondary">
            基于世界状态与{activeBook ? `《${activeBook.name}》` : '作品'}进度给出分支建议
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => setNonce((n) => n + 1)}
          disabled={generating}
        >
          重新推演
        </Button>
      </Stack>

      {generating && <LinearProgress sx={{ mb: 1 }} />}

      {branches.length === 0 ? (
        <Alert severity="info">当前世界状态信息较少，先在操作台推进一些事件或伏笔，再回来推演。</Alert>
      ) : (
        <Stack spacing={1.5}>
          {branches.map((b, i) => (
            <Card variant="outlined" key={`${b.id}-${i}`}>
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip size="small" label={SEED_LABEL[b.seed]} color="primary" variant="outlined" />
                  <Typography variant="subtitle2">第 {b.suggestedIndex} 章 · {b.title}</Typography>
                </Stack>
                <Typography variant="body2">{b.outline}</Typography>
                <Typography variant="caption" color="text.secondary">
                  推荐理由：{b.rationale}
                </Typography>
              </CardContent>
              <Divider />
              <CardActions>
                <Button
                  size="small"
                  startIcon={<AutoAwesomeIcon />}
                  disabled={generating}
                  onClick={() => handleGenerate(b.outline)}
                >
                  采纳并生成
                </Button>
                <Button
                  size="small"
                  startIcon={<NoteAddIcon />}
                  disabled={generating}
                  onClick={() => handleSaveOutline(b.title, b.outline)}
                >
                  仅存大纲
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
