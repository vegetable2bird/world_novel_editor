import { Box, Typography, List, ListItemButton, ListItemText, Paper } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';

interface Props {
  chapterId: string;
}

/**
 * 版本历史：列出某章节的全部版本（AI / 人工 / 合并），点击可切换当前版本（回溯/预览）。
 */
export default function VersionHistory({ chapterId }: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const versions = useWorkStore((s) =>
    worldId
      ? Object.values(s.worlds[worldId]?.chapterVersions ?? {}).filter(
          (v) => v.chapterId === chapterId,
        )
      : undefined,
  );
  const currentVersionId = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.chapters[chapterId]?.currentVersionId : undefined,
  );
  const setCurrentVersion = useWorkStore((s) => s.setCurrentVersion);

  const list = (versions ?? []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        版本历史（{list.length}）
      </Typography>
      <List dense>
        {list.map((v) => (
          <ListItemButton
            key={v.id}
            selected={v.id === currentVersionId}
            onClick={() => worldId && setCurrentVersion(worldId, chapterId, v.id)}
          >
            <ListItemText
              primary={`#${v.id.slice(-4)} · ${v.source} · ${v.wordCount} 字`}
              secondary={new Date(v.createdAt).toLocaleString()}
              primaryTypographyProps={{ fontSize: 13 }}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
          </ListItemButton>
        ))}
        {list.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            暂无版本
          </Typography>
        )}
      </List>
    </Paper>
  );
}
