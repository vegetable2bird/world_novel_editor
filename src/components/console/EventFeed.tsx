import { Box, Typography, List, ListItem, ListItemText, Chip, Paper } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import type { TimelineEvent } from '../../types/timeline';

const TYPE_COLOR: Record<TimelineEvent['type'], 'default' | 'primary' | 'secondary' | 'warning'> = {
  operation: 'primary',
  system: 'default',
  generation: 'secondary',
  manual: 'warning',
};

const TYPE_LABEL: Record<TimelineEvent['type'], string> = {
  operation: '操作',
  system: '系统',
  generation: '生成',
  manual: '手动',
};

/**
 * 事件流：实时展示世界演进（操作推演 / 系统 / 生成 / 手动）事件。
 */
export default function EventFeed(): JSX.Element {
  const worldId = useCurrentWorldId();
  const events = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.timelineEvents : undefined,
  );

  const list = events
    ? Object.values(events).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        事件流
      </Typography>
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            尚无事件。在上方操作面板执行操作，世界演进将记录于此。
          </Typography>
        ) : (
          <List dense disablePadding>
            {list.map((ev) => (
              <ListItem key={ev.id} divider alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label={TYPE_LABEL[ev.type]}
                        color={TYPE_COLOR[ev.type]}
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
                        {ev.year ?? ''} · {ev.season ?? ''}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
