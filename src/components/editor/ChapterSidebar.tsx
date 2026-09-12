import { Box, Typography, Paper, Divider, Chip, Stack } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';

interface Props {
  chapterId: string;
}

/**
 * 章节侧栏：大纲 / 世界状态 / 待回收伏笔 / 风格速览。
 * 让作者修订时随时对照设定，确保一致性。
 */
export default function ChapterSidebar({ chapterId }: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const chapter = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.chapters[chapterId] : undefined,
  );
  const variables = useWorkStore((s) =>
    worldId ? Object.values(s.worlds[worldId]?.variables ?? {}) : undefined,
  );
  const foreshadows = useWorkStore((s) =>
    worldId
      ? Object.values(s.worlds[worldId]?.foreshadows ?? {}).filter(
          (f) => f.status !== 'resolved',
        )
      : undefined,
  );
  const style = useWorkStore((s) =>
    worldId
      ? Object.values(s.worlds[worldId]?.styleConfigs ?? {}).find(
          (c) => c.scope === 'global',
        )
      : undefined,
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        大纲
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {chapter?.outline || '（暂无大纲）'}
      </Typography>
      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        世界状态
      </Typography>
      <Stack spacing={0.5} sx={{ mb: 1 }}>
        {(variables ?? []).map((v) => (
          <Typography key={v.id} variant="body2">
            {v.name}：{v.value}
            {v.unit ?? ''}
          </Typography>
        ))}
      </Stack>
      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        待回收伏笔
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        {(foreshadows ?? []).map((f) => (
          <Chip key={f.id} size="small" label={f.title} variant="outlined" />
        ))}
        {(foreshadows ?? []).length === 0 && (
          <Typography variant="caption" color="text.secondary">
            无
          </Typography>
        )}
      </Stack>
      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        风格速览
      </Typography>
      {style && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          <Chip size="small" label={`文风·${style.tone}`} />
          <Chip size="small" label={`视角·${style.pov}`} />
          <Chip size="small" label={`节奏·${style.pacing}`} />
        </Stack>
      )}
    </Paper>
  );
}
