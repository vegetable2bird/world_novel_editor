import { Box, Typography, Paper, List, ListItem, ListItemText, Chip } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';

const TYPE_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'warning'> = {
  operation: 'primary',
  system: 'default',
  generation: 'secondary',
  manual: 'warning',
};
const TYPE_LABEL: Record<string, string> = {
  operation: '操作',
  system: '系统',
  generation: '生成',
  manual: '手动',
};

/**
 * 时间线视图：按时间顺序展示世界演进的全部事件（可追溯、可读档）。
 * P1 将增强为分支/快照回溯；v1 提供完整时序浏览。
 */
export default function TimelineView(): JSX.Element {
  const worldId = useCurrentWorldId();
  const events = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.timelineEvents : undefined,
  );

  const list = events
    ? Object.values(events).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        世界时间线（共 {list.length} 条）
      </Typography>
      {list.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          暂无事件记录。
        </Typography>
      ) : (
        <List dense>
          {list.map((ev) => (
            <ListItem key={ev.id} divider alignItems="flex-start">
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={TYPE_LABEL[ev.type] ?? ev.type}
                      color={TYPE_COLOR[ev.type] ?? 'default'}
                      variant="outlined"
                    />
                    <Typography variant="body2" fontWeight={600}>
                      {ev.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box component="span">
                    <span>{ev.description}</span>
                    <br />
                    <Typography component="span" variant="caption" color="text.secondary">
                      {ev.era ?? ''}
                      {ev.year ?? ''} · {ev.season ?? ''} ·{' '}
                      {new Date(ev.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
