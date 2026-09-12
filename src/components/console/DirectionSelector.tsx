import { Box, Typography, Paper, Card, CardActionArea, Stack } from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';

/**
 * 走向选择：展示叙事推演推荐的后续走向，作者选定后其摘要将进入生成链路（operationBlock）。
 */
export default function DirectionSelector(): JSX.Element {
  const worldId = useCurrentWorldId();
  const directions = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.directionOptions : undefined,
  );
  const selectedId = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.selectedDirectionId : undefined,
  );
  const selectDirection = useWorkStore((s) => s.selectDirection);

  const list = directions ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        走向选择
      </Typography>
      {list.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          执行操作后，系统会基于叙事推演推荐若干后续走向供你圈定。
        </Typography>
      ) : (
        <Stack spacing={1}>
          {list.map((d) => (
            <Card
              key={d.id}
              variant="outlined"
              sx={{
                borderColor:
                  selectedId === d.id ? 'primary.main' : 'divider',
                borderWidth: selectedId === d.id ? 2 : 1,
              }}
            >
              <CardActionArea onClick={() => worldId && selectDirection(worldId, d.id)}>
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {d.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.estimatedSummary}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
